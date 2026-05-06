"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiAddLine, RiCloseLine, RiUser2Line, RiMoneyDollarCircleLine } from "react-icons/ri";

type SubmitResult = {
	ok: boolean;
	message: string;
};

type PrepareAbstractModalProps = {
	open: boolean;
	onClose: () => void;
	prId?: number | null;
	prNo?: string | null;
	onSubmit?: (payload: any) => Promise<SubmitResult> | SubmitResult;
};

export type Dealer = {
	supplier_name: string;
	unit_price: string | number | null;
	is_winning: boolean;
};

type SupplierBlock = {
	key: string;
	supplier_name: string;
	prices: Record<number, string>; // itemId -> price string
};

export type SupplierQuotePayload = {
	supplier_name: string;
	unit_price: string | number | null;
	is_winning: boolean;
};

export type ItemWithDealers = {
	id: number;
	item_no: number | null;
	description: string;
	unit: string;
	quantity: number | null;
};

const textInputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all";
const numberInputCls = `${textInputCls} no-spinner`;

export default function PrepareAbstractModal({
	open,
	onClose,
	prId,
	prNo,
	onSubmit,
}: PrepareAbstractModalProps) {
	const supabase = createClient();
	const [items, setItems] = useState<ItemWithDealers[]>([]);
	const [supplierQuotes, setSupplierQuotes] = useState<SupplierBlock[]>([
		{ key: "supplier-1", supplier_name: "", prices: {} },
	]);
	const [loading, setLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<SubmitResult | null>(null);
	const [showUploadAOAModal, setShowUploadAOAModal] = useState(false);
	const [aoaLink, setAoaLink] = useState("");

	useEffect(() => {
		if (!open) {
			setItems([]);
				setSupplierQuotes([{ key: "supplier-1", supplier_name: "", prices: {} }]);
			setFeedback(null);
			setLoading(false);
			return;
		}
	}, [open, prId]);

	useEffect(() => {
		if (!open || !prId) return;

		let isActive = true;

		const fetchItems = async () => {
			setLoading(true);
			setFeedback(null);
			try {
				// 1. Fetch items for the PR
				const { data: itemsData, error: itemsError } = await supabase
					.from("purchase_request_items")
					.select("*")
					.eq("pr_id", prId)
					.order("id", { ascending: true });

				if (itemsError) throw itemsError;

				// 2. Find the latest canvass session and load existing supplier quotations
				const { data: sessionRow, error: sessionError } = await supabase
					.from("canvass_sessions")
					.select("id")
					.eq("pr_id", prId)
					.order("created_at", { ascending: false })
					.limit(1)
					.maybeSingle();

				if (sessionError) throw sessionError;

				let supplierRows: SupplierBlock[] = [{ key: "supplier-1", supplier_name: "", prices: {} }];

				if (sessionRow?.id) {
					const { data: entriesData, error: entriesError } = await supabase
						.from("canvass_entries")
						.select("id, supplier_name, unit_price, pr_items")
						.eq("session_id", sessionRow.id)
						.order("created_at", { ascending: true });

					if (entriesError) throw entriesError;

					if (entriesData && entriesData.length > 0) {
						// group by supplier_name
						const bySupplier = new Map<string, any[]>();
						for (const e of entriesData) {
							const s = (e.supplier_name || "").trim();
							if (!bySupplier.has(s)) bySupplier.set(s, []);
							const arr = bySupplier.get(s)!;
							arr.push(e);
						}

						const blocks: SupplierBlock[] = [];
						let idx = 0;
						for (const [supplierName, rows] of bySupplier.entries()) {
							const prices: Record<number, string> = {};
							for (const r of rows) {
								const itemId = r.pr_items ?? null;
								if (itemId != null) prices[itemId] = r.unit_price != null ? String(r.unit_price) : "";
							}
							blocks.push({ key: `supplier-${idx++}`, supplier_name: supplierName, prices });
						}

						if (blocks.length > 0) supplierRows = blocks;
					}
				}

				if (!isActive) return;

				if (itemsData) {
					const formattedItems: ItemWithDealers[] = itemsData.map((item: any) => {
						return {
							id: item.id,
							item_no: item.stock_no || null,
							description: item.description || "",
							unit: item.unit || "",
							quantity: item.quantity || null,
						};
					});
					setItems(formattedItems);
				}

				setSupplierQuotes(supplierRows);
			} catch (error) {
				if (!isActive) return;
				console.error("Error fetching items:", error);
				setFeedback({ ok: false, message: "Failed to fetch items." });
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		};

		void fetchItems();

		return () => {
			isActive = false;
		};
	}, [open, prId, supabase]);

	if (!open) return null;

	const addSupplierQuote = () => {
		setSupplierQuotes((prev) => [
			...prev,
			{
				key: `supplier-${Date.now()}-${prev.length + 1}`,
				supplier_name: "",
				prices: {},
			},
		]);
	};

	const removeSupplierQuote = (index: number) => {
		setSupplierQuotes((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
	};

	const updateSupplierQuote = (
		index: number,
		field: keyof Omit<SupplierBlock, "key" | "prices"> | { priceForItem: number },
		value: string,
	) => {
		setSupplierQuotes((prev) =>
			prev.map((quote, i) => {
				if (i !== index) return quote;
				if (typeof field === "object" && "priceForItem" in field) {
					const prices = { ...quote.prices };
					if (value === "") delete prices[field.priceForItem];
					else prices[field.priceForItem] = value;
					return { ...quote, prices };
				}
				return { ...quote, [field]: value } as SupplierBlock;
			})
		);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFeedback(null);

		// Validate supplier blocks: require supplier name and at least one price
		const validSuppliers = supplierQuotes.filter(
			(s) => s.supplier_name.trim() !== "" && Object.values(s.prices).some((v) => v !== "")
		);

		if (validSuppliers.length === 0) {
			setFeedback({ ok: false, message: "Please add at least one supplier with a quotation per item." });
			return;
		}



		if (!onSubmit) {
			setFeedback({ ok: false, message: "No save handler configured yet." });
			return;
		}

		setIsSaving(true);
		try {
			const winningSupplierIndex = getWinningSupplierIndex();

			// Build itemsWithDealers: for each item, collect dealers from supplier blocks
			const itemsWithDealers = items.map((item) => {
				const dealers = supplierQuotes.map((s, supplierIndex) => ({
					supplier_name: s.supplier_name,
					unit_price: s.prices[item.id] && s.prices[item.id] !== "" ? s.prices[item.id] : null,
					is_winning: winningSupplierIndex === supplierIndex,
				}));
				return {
					id: item.id,
					item_no: item.item_no,
					description: item.description,
					unit: item.unit,
					quantity: item.quantity,
					dealers,
				};
			});

			const result = await onSubmit(itemsWithDealers);
			setFeedback(result);
		} catch (error) {
			setFeedback({
				ok: false,
				message: error instanceof Error ? error.message : "Saving failed.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const getWinningSupplierIndex = (): number | null => {
		let lowestTotal = Number.POSITIVE_INFINITY;
		let winningIndex: number | null = null;

		supplierQuotes.forEach((supplier, supplierIndex) => {
			if (supplier.supplier_name.trim() === "") return;

			let supplierTotal = 0;
			let hasQuote = false;

			Object.values(supplier.prices).forEach((rawValue) => {
				if (rawValue == null || rawValue === "") return;
				const parsedValue = Number(rawValue);
				
				// Only sum up valid numbers. If it's a letter (NaN), we don't add it to total.
				if (!Number.isNaN(parsedValue)) {
					hasQuote = true;
					supplierTotal += parsedValue;
				}
			});

			if (!hasQuote) return;

			if (supplierTotal < lowestTotal) {
				lowestTotal = supplierTotal;
				winningIndex = supplierIndex;
			}
		});

		return winningIndex;
	};

	const handleUploadAOALink = async () => {
		if (!aoaLink.trim()) {
			setFeedback({ ok: false, message: "Please enter an AOA link." });
			return;
		}

		if (!prId) {
			setFeedback({ ok: false, message: "PR ID is missing." });
			return;
		}

		setIsSaving(true);
		setFeedback(null);

		try {
			// Check for existing document
			const { data: existingDoc, error: checkErr } = await supabase
				.from("documents")
				.select("id, pr_id")
				.eq("pr_id", prId)
				.maybeSingle();

			if (checkErr) throw checkErr;

			if (existingDoc) {
				// Update existing document
				const { error: updateErr } = await supabase
					.from("documents")
					.update({ abstract_link: aoaLink.trim() })
					.eq("pr_id", prId);

				if (updateErr) throw updateErr;
			} else {
				// Insert new document
				const { error: insertErr } = await supabase.from("documents").insert({
					pr_id: prId,
					pr_no: prNo,
					abstract_link: aoaLink.trim(),
					bac_reso_link: null,
				});

				if (insertErr) throw insertErr;
			}

			setFeedback({ ok: true, message: "AOA link uploaded successfully." });
			setAoaLink("");
			setShowUploadAOAModal(false);
		} catch (error) {
			console.error("Upload error:", error);
			setFeedback({
				ok: false,
				message: error instanceof Error ? error.message : "Could not upload AOA link.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
			<div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
<style>{`
	.no-spinner::-webkit-outer-spin-button,
	.no-spinner::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.no-spinner {
		-moz-appearance: textfield;
		appearance: textfield;
	}
`}</style>
				<div className="px-8 pt-8 pb-6 border-b border-gray-100">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">Stage · Abstract</p>
							<h2 className="text-2xl font-extrabold text-gray-900 mt-1">Prepare PR Awarding Details</h2>
							<div className="flex items-center gap-3 mt-2">
								<span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">PR NO: {prNo}</span>
								<p className="text-sm text-gray-500 font-mono">{new Date().toLocaleDateString("en-PH")}</p>
							</div>
						</div>
						<div className="flex items-start gap-3 shrink-0">
							<div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex flex-col items-center justify-center leading-none shadow-lg shadow-emerald-100">
								<span className="text-lg font-extrabold">09</span>
								<span className="text-[10px] font-bold opacity-90 mt-0.5">STEP</span>
							</div>
							<button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
								<RiCloseLine size={24} />
							</button>
						</div>
					</div>
				</div>

				<form id="award-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6">
					{feedback && (
						<div
							className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
								feedback.ok
									? "border-emerald-200 bg-emerald-50 text-emerald-800"
									: "border-red-200 bg-red-50 text-red-700"
							}`}
						>
							{feedback.message}
						</div>
					)}

					{loading ? (
						<div className="flex flex-col items-center justify-center py-20 gap-3">
							<div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
							<p className="text-sm text-gray-500 font-medium">Fetching items...</p>
						</div>
					) : items.length === 0 ? (
						<div className="text-center py-20 text-gray-400">
							<p>No items found for this PR.</p>
						</div>
					) : (
						<div className="space-y-8">
							<div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
								<div className="flex items-start gap-3">
									<div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
										<RiUser2Line size={18} />
									</div>
									<div className="flex-1 space-y-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Supplier Quotations for this PR</p>
												<p className="text-sm text-emerald-900/70">Add one or more supplier and quotation rows.</p>
											</div>
											<button
												type="button"
												onClick={addSupplierQuote}
												className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all"
											>
												<RiAddLine size={14} />
												Add Supplier
											</button>
										</div>

										<div className="space-y-3">
											{supplierQuotes.map((quote, quoteIndex) => (
												<div key={quote.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-xl bg-white border border-emerald-100 p-4">
													<div className="md:col-span-5">
														<div className="mb-1.5 ml-1 flex items-center justify-between gap-2">
															<label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
																Supplier Name
															</label>
															<label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 select-none">
																<input
																	type="checkbox"
																	checked={getWinningSupplierIndex() === quoteIndex}
																	readOnly
																	disabled
																	className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-100 disabled:cursor-default"
																/>
																<span>Winning</span>
															</label>
														</div>
														<input
															type="text"
															value={quote.supplier_name}
															onChange={(e) => updateSupplierQuote(quoteIndex, "supplier_name", e.target.value)}
															placeholder="Enter supplier name"
															className={textInputCls}
														/>
													</div>
													<div className="md:col-span-6">
														<label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
															Quotation per Item
														</label>
														<div className="space-y-2">
															{items.map((it) => (
																<div key={it.id} className="flex items-center gap-2">
																	<div className="flex-1 text-xs text-gray-600 truncate">{it.description}</div>
																	<div className="w-40">
																		<div className="relative">
																			<RiMoneyDollarCircleLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
																			<input
																				type="text"
																				value={(quote.prices && quote.prices[it.id]) ?? ""}
																				onChange={(e) => updateSupplierQuote(quoteIndex, { priceForItem: it.id } as any, e.target.value)}
																				placeholder="Enter price or quote"
																				className={`${textInputCls} pl-9`}
																			/>
																		</div>
																	</div>
																</div>
															))}
														</div>
													</div>
													<div className="md:col-span-1 flex justify-end pb-1">
														<button
															type="button"
															onClick={() => removeSupplierQuote(quoteIndex)}
															disabled={supplierQuotes.length === 1}
															className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 transition-all"
															title="Remove supplier"
														>
															<RiCloseLine size={20} />
														</button>
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50/30">
								<div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
									<div>
										<h3 className="text-sm font-bold text-gray-900">Items in this PR</h3>
										<p className="text-xs text-gray-500 mt-0.5">These items are shown for reference only.</p>
									</div>
									<span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">{items.length} item{items.length === 1 ? "" : "s"}</span>
								</div>
								<div className="p-6 space-y-4">
									{items.map((item, itemIndex) => (
										<div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-xl bg-white border border-gray-100 px-4 py-4">
											<div className="md:col-span-1">
												<span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
													{itemIndex + 1}
												</span>
											</div>
											<div className="md:col-span-6 min-w-0">
												<h4 className="text-sm font-bold text-gray-900 truncate">{item.description}</h4>
												<p className="text-xs text-gray-500 mt-0.5">
													{item.quantity} {item.unit} · {item.item_no ? `Stock No: ${item.item_no}` : "No Stock No"}
												</p>
											</div>
											<div className="md:col-span-5 text-sm text-gray-500 md:text-right">
												Assigned to the PR-level supplier and quotation above.
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</form>

				<div className="px-8 py-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => window.open("https://docs.google.com/spreadsheets/d/12Q9bRZNMaBlMF7gxNlM62sI1R-Zr9CFZbe_XUiKLxkw/copy", "_blank")}
						className="px-6 py-2.5 rounded-xl text-sm font-bold text-emerald-50 bg-emerald-700 hover:bg-emerald-100 transition-all"
					>
						Make Abstract of Awards
					</button>
					<button
						type="submit"
						form="award-form"
						disabled={isSaving || items.length === 0}
						className="px-8 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
					>
						{isSaving ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Saving...
							</>
						) : "Save AOA Details"}
					</button>
					<button
						type="button"
						onClick={() => setShowUploadAOAModal(true)}
						disabled={isSaving}
						className="px-8 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all"
					>
						Upload AOA Link
					</button>
				</div>
			</div>

			{showUploadAOAModal && (
				<div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUploadAOAModal(false)} />
					<div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
						<div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between">
							<div>
								<p className="text-xs font-bold uppercase tracking-widest text-emerald-100">Document Upload</p>
								<h3 className="text-lg font-extrabold mt-1">Upload AOA Link</h3>
							</div>
							<button
								type="button"
								onClick={() => setShowUploadAOAModal(false)}
								className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
							>
								<RiCloseLine size={20} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							{feedback && (
								<div
									className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
										feedback.ok
											? "border-emerald-200 bg-emerald-50 text-emerald-800"
											: "border-red-200 bg-red-50 text-red-700"
									}`}
								>
									{feedback.message}
								</div>
							)}

							<div>
								<label className="mb-2 block text-sm font-semibold text-gray-700">
									AOA Link <span className="text-red-500">*</span>
								</label>
								<input
									type="url"
									placeholder="https://example.com/abstract-of-awards"
									value={aoaLink}
									onChange={(e) => setAoaLink(e.target.value)}
									className={textInputCls}
								/>
								<p className="mt-2 text-xs text-gray-500">
									Enter the complete URL to the Abstract of Awards document
								</p>
							</div>

							<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
								<p className="text-xs text-emerald-700">
									<span className="font-semibold">PR:</span> {prNo}
								</p>
							</div>
						</div>

						<div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setShowUploadAOAModal(false)}
								className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleUploadAOALink}
								disabled={isSaving || !aoaLink.trim()}
								className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
							>
								{isSaving ? "Uploading..." : "Upload Link"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
