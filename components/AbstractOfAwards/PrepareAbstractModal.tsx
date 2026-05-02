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
	unit_price: number | null;
};

export type ItemWithDealers = {
	id: number;
	item_no: number | null;
	description: string;
	unit: string;
	quantity: number | null;
	dealers: Dealer[];
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
	const [loading, setLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<SubmitResult | null>(null);

	useEffect(() => {
		if (open && prId) {
			fetchItems();
		} else if (!open) {
			setItems([]);
			setFeedback(null);
		}
	}, [open, prId]);

	const fetchItems = async () => {
		if (!prId) return;
		setLoading(true);
		try {
			// 1. Fetch items for the PR
			const { data: itemsData, error: itemsError } = await supabase
				.from("purchase_request_items")
				.select("*")
				.eq("pr_id", prId)
				.order("id", { ascending: true });

			if (itemsError) throw itemsError;

			// 2. Fetch existing canvass entries for the session if any
			const { data: sessionData } = await supabase
				.from("canvass_sessions")
				.select("id")
				.eq("pr_id", prId)
				.order("created_at", { ascending: false })
				.limit(1)
				.maybeSingle();

			let existingEntries: any[] = [];
			if (sessionData) {
				const { data: entriesData } = await supabase
					.from("canvass_entries")
					.select("*")
					.eq("session_id", sessionData.id);
				existingEntries = entriesData || [];
			}

			if (itemsData) {
				const formattedItems: ItemWithDealers[] = itemsData.map((item: any) => {
					// Find existing dealers for this item using pr_items column (which stores item id)
					const itemDealers = existingEntries
						.filter((e) => e.pr_items === item.id)
						.map((e) => ({
							supplier_name: e.supplier_name || "",
							unit_price: e.unit_price,
						}));

					return {
						id: item.id,
						item_no: item.stock_no || null,
						description: item.description || "",
						unit: item.unit || "",
						quantity: item.quantity || null,
						dealers: itemDealers.length > 0 ? itemDealers : [
							{ supplier_name: "", unit_price: null }
						],
					};
				});
				setItems(formattedItems);
			}
		} catch (error) {
			console.error("Error fetching items:", error);
			setFeedback({ ok: false, message: "Failed to fetch items." });
		} finally {
			setLoading(false);
		}
	};

	if (!open) return null;

	const addDealer = (itemIndex: number) => {
		setItems((prev) => {
			const newItems = [...prev];
			if (newItems[itemIndex].dealers.length < 5) {
				newItems[itemIndex].dealers.push({ supplier_name: "", unit_price: null });
			}
			return newItems;
		});
	};

	const removeDealer = (itemIndex: number, dealerIndex: number) => {
		setItems((prev) => {
			const newItems = [...prev];
			if (newItems[itemIndex].dealers.length > 1) {
				newItems[itemIndex].dealers.splice(dealerIndex, 1);
			}
			return newItems;
		});
	};

	const updateDealer = (
		itemIndex: number,
		dealerIndex: number,
		field: keyof Dealer,
		value: string | number | null,
	) => {
		setItems((prev) => {
			const newItems = [...prev];
			const dealer = newItems[itemIndex].dealers[dealerIndex];
			
			newItems[itemIndex].dealers[dealerIndex] = {
				...dealer,
				[field]: value
			};
			return newItems;
		});
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFeedback(null);

		if (!onSubmit) {
			setFeedback({ ok: false, message: "No save handler configured yet." });
			return;
		}

		setIsSaving(true);
		
		// For now, we just pass the items with dealers to the onSubmit handler
		// The user mentioned not to connect to DB yet, so we'll just simulate success or pass it up
		try {
			const result = await onSubmit(items);
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
							<h2 className="text-2xl font-extrabold text-gray-900 mt-1">Prepare Awarding Details</h2>
							<div className="flex items-center gap-3 mt-2">
								<span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">PR NO: {prNo}</span>
								<p className="text-sm text-gray-500 font-mono">{new Date().toLocaleDateString("en-PH")}</p>
							</div>
						</div>
						<div className="flex items-start gap-3 flex-shrink-0">
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
							{items.map((item, itemIndex) => (
								<div key={item.id} className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50/30">
									<div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
										<div className="flex items-center gap-4">
											<span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
												{itemIndex + 1}
											</span>
											<div>
												<h3 className="text-sm font-bold text-gray-900">{item.description}</h3>
												<p className="text-xs text-gray-500 mt-0.5">
													{item.quantity} {item.unit} · {item.item_no ? `Stock No: ${item.item_no}` : 'No Stock No'}
												</p>
											</div>
										</div>
										<button
											type="button"
											onClick={() => addDealer(itemIndex)}
											disabled={item.dealers.length >= 5 || isSaving}
											className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
										>
											<RiAddLine size={14} />
											Add Dealer ({item.dealers.length}/5)
										</button>
									</div>

									<div className="p-6 space-y-4">
										{item.dealers.map((dealer, dealerIndex) => (
											<div key={dealerIndex} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end animate-in fade-in slide-in-from-left-2 duration-300">
												<div className="md:col-span-6">
													<label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
														Name of Dealer
													</label>
													<div className="relative">
														<RiUser2Line className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
														<input
															type="text"
															value={dealer.supplier_name}
															placeholder="Enter dealer name"
															onChange={(e) => updateDealer(itemIndex, dealerIndex, "supplier_name", e.target.value)}
															className={`${textInputCls} pl-10`}
														/>
													</div>
												</div>
												<div className="md:col-span-5">
													<label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
														Quoted Price
													</label>
													<div className="relative">
														<RiMoneyDollarCircleLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
														<input
															type="number"
															step="any"
															value={dealer.unit_price ?? ""}
															placeholder="0.00"
															onChange={(e) => updateDealer(itemIndex, dealerIndex, "unit_price", e.target.value === "" ? null : Number(e.target.value))}
															className={`${numberInputCls} pl-10`}
														/>
													</div>
												</div>
												<div className="md:col-span-1 flex justify-end pb-2">
													<button
														type="button"
														onClick={() => removeDealer(itemIndex, dealerIndex)}
														disabled={item.dealers.length === 1 || isSaving}
														className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 transition-all"
														title="Remove dealer"
													>
														<RiCloseLine size={20} />
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
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
						type="submit"
						form="award-form"
						disabled={isSaving || items.length === 0}
						onClick={(e) => {
							// Trigger form submission manually since the button is outside the form
							const form = document.querySelector('form');
							if (form) form.requestSubmit();
						}}
						className="px-8 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
					>
						{isSaving ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Saving...
							</>
						) : "Save Awarding Details"}
					</button>
				</div>
			</div>
		</div>
	);
}
