"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiAddLine, RiCloseLine, RiUser2Line, RiMoneyDollarCircleLine, RiEyeLine } from "react-icons/ri";
import LivePreview from "../test/livePreview";

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
	is_winning: boolean;
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
		{ key: "supplier-1", supplier_name: "", prices: {}, is_winning: false },
	]);
	const [sessionId, setSessionId] = useState<number | null>(null);
	const [refNo, setRefNo] = useState("");
	const [abstractDate, setAbstractDate] = useState("");
	const [loading, setLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<SubmitResult | null>(null);
	const [showPreview, setShowPreview] = useState(false);

	useEffect(() => {
		if (!open) {
			setItems([]);
				setSupplierQuotes([{ key: "supplier-1", supplier_name: "", prices: {}, is_winning: false }]);
			setSessionId(null);
			setRefNo("");
			setAbstractDate("");
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
				setSessionId(sessionRow?.id ?? null);

				let supplierRows: SupplierBlock[] = [{ key: "supplier-1", supplier_name: "", prices: {}, is_winning: false }];

				if (sessionRow?.id) {
					const { data: entriesData, error: entriesError } = await supabase
						.from("canvass_entries")
						.select("id, supplier_name, unit_price, pr_items, ref_no, date, is_winning")
						.eq("session_id", sessionRow.id)
						.order("created_at", { ascending: true });

					if (entriesError) throw entriesError;

					if (entriesData && entriesData.length > 0) {
						const existingRefNo = entriesData.find((entry: any) => (entry.ref_no || "").trim() !== "")?.ref_no ?? "";
						const existingDate = entriesData.find((entry: any) => (entry.date || "").trim() !== "")?.date ?? "";
						setRefNo(existingRefNo);
						setAbstractDate(existingDate ? String(existingDate).slice(0, 10) : "");
					}

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
							let isWinning = false;
							for (const r of rows) {
								const itemId = r.pr_items ?? null;
								if (itemId != null) prices[itemId] = r.unit_price != null ? String(r.unit_price) : "";
								if (r.is_winning) isWinning = true;
							}
							blocks.push({ key: `supplier-${idx++}`, supplier_name: supplierName, prices, is_winning: isWinning });
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
				is_winning: false,
			},
		]);
	};

	const removeSupplierQuote = (index: number) => {
		setSupplierQuotes((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
	};

	const updateSupplierQuote = (
		index: number,
		field: keyof Omit<SupplierBlock, "key" | "prices"> | { priceForItem: number },
		value: any,
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
			// Build itemsWithDealers: for each item, collect dealers from supplier blocks
			const itemsWithDealers = items.map((item) => {
				const dealers = supplierQuotes.map((s) => ({
					supplier_name: s.supplier_name,
					unit_price: s.prices[item.id] && s.prices[item.id] !== "" ? s.prices[item.id] : null,
					is_winning: s.is_winning,
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
			if (result.ok && sessionId) {
				const normalizedDate = abstractDate.trim() ? new Date(`${abstractDate.trim()}T00:00:00`).toISOString() : null;
				const { error: metaError } = await supabase
					.from("canvass_entries")
					.update({
						ref_no: refNo.trim() || null,
						date: normalizedDate,
					})
					.eq("session_id", sessionId);

				if (metaError) throw metaError;
			}
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
					<div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Document Details</p>
								<p className="text-xs text-gray-500 mt-0.5">Reference number and date for the abstract document.</p>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="mb-2 block text-sm font-semibold text-gray-700">Ref. No.</label>
								<input
									type="text"
									placeholder="Enter reference number"
									value={refNo}
									onChange={(e) => setRefNo(e.target.value)}
									className={textInputCls}
								/>
							</div>
							<div>
								<label className="mb-2 block text-sm font-semibold text-gray-700">Date</label>
								<input
									type="date"
									value={abstractDate}
									onChange={(e) => setAbstractDate(e.target.value)}
									className={textInputCls}
								/>
							</div>
						</div>
					</div>

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
											<div className="grid grid-cols-[minmax(220px,1.3fr)_minmax(0,1fr)_44px] gap-3 items-end rounded-xl bg-emerald-100/70 border border-emerald-100 p-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
												<div>Supplier Name</div>
												<div className="text-center">Quotation per Item</div>
												<div />
											</div>

											{supplierQuotes.map((quote, quoteIndex) => (
												<div
													key={quote.key}
													className="grid grid-cols-[minmax(220px,1.3fr)_minmax(0,1fr)_44px] gap-3 items-start rounded-xl bg-white border border-emerald-100 p-4"
												>
													<div>
														<div className="mb-1.5 ml-1 flex items-center justify-between gap-2">
															<label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
																Supplier Name
															</label>
															<label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 select-none cursor-pointer hover:text-emerald-700">
																<input
																	type="checkbox"
																	checked={quote.is_winning}
																	onChange={(e) => updateSupplierQuote(quoteIndex, "is_winning", e.target.checked)}
																	className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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

													<div className="min-w-0 overflow-x-auto pb-1">
														<div
															className="grid gap-3"
															style={{
																gridTemplateColumns: `repeat(${items.length}, minmax(180px, 1fr))`,
																minWidth: `${Math.max(items.length, 1) * 180}px`,
															}}
														>
															{items.map((item) => (
																<div key={item.id} className="space-y-1">
																	<div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
																		{item.description}
																	</div>
																	<div className="relative">
																		<RiMoneyDollarCircleLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
																		<input
																			type="text"
																			value={(quote.prices && quote.prices[item.id]) ?? ""}
																			onChange={(e) => updateSupplierQuote(quoteIndex, { priceForItem: item.id } as any, e.target.value)}
																			placeholder="Enter price or quote"
																			className={`${textInputCls} pl-9`}
																		/>
																	</div>
																</div>
															))}
														</div>
													</div>

													<div className="flex justify-end pt-5">
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
						onClick={() => setShowPreview(true)}
						disabled={!prNo}
						className="px-6 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center gap-2"
					>
						<RiEyeLine size={18} />
						Preview
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
				</div>
			</div>

			<LivePreview
				open={showPreview}
				onClose={() => setShowPreview(false)}
				prNo={prNo ?? ""}
			/>
		</div>
	);
}
