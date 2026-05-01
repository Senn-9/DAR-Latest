"use client";

import { FormEvent, useEffect, useState } from "react";

type SubmitResult = {
	ok: boolean;
	message: string;
};

type PrepareAbstractModalProps = {
	open: boolean;
	onClose: () => void;
	prId?: number | null;
	prNo?: string | null;
	onSubmit?: (payload: CanvassEntryFormValues[]) => Promise<SubmitResult> | SubmitResult;
};

export type CanvassEntryFormValues = {
	id: number;
	session_id: number | null;
	item_no: number | null;
	description: string;
	unit: string;
	quantity: number | null;
	supplier_name: string;
	unit_price: number | null;
	total_price: number | null;
	is_winning: boolean;
	created_at: string;
	tin_no: string;
	delivery_days: string;
	assignment_id: number | null;
	supplier_address: string;
	quotation_no: number | null;
};

const initialValues: CanvassEntryFormValues = {
	id: 0,
	session_id: null,
	item_no: null,
	description: "",
	unit: "",
	quantity: null,
	supplier_name: "",
	unit_price: null,
	total_price: null,
	is_winning: false,
	created_at: new Date().toISOString().slice(0, 10),
	tin_no: "",
	delivery_days: "",
	assignment_id: null,
	supplier_address: "",
	quotation_no: null,
};

export default function PrepareAbstractModal({
	open,
	onClose,
	prId,
	prNo,
	onSubmit,
}: PrepareAbstractModalProps) {
	const [entries, setEntries] = useState<CanvassEntryFormValues[]>([initialValues]);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<SubmitResult | null>(null);

	useEffect(() => {
		if (!open) {
			setEntries([initialValues]);
			setIsSaving(false);
			setFeedback(null);
		}
	}, [open]);

	if (!open) return null;

	const updateEntry = (
		index: number,
		field: keyof CanvassEntryFormValues,
		value: string | number | boolean | null,
	) => {
		setEntries((prev) =>
			prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
		);
	};

	const setText = (index: number, field: keyof CanvassEntryFormValues, value: string) => {
		updateEntry(index, field, value);
	};

	const setNumber = (index: number, field: keyof CanvassEntryFormValues, value: string) => {
		updateEntry(index, field, value.trim() === "" ? null : Number(value));
	};

	const addEntry = () => {
		setEntries((prev) => [
			...prev,
			{
				...initialValues,
				item_no: prev.length + 1,
			},
		]);
	};

	const removeEntry = (index: number) => {
		setEntries((prev) => {
			if (prev.length === 1) return prev;
			return prev.filter((_, i) => i !== index);
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
		const payload = entries.map((entry) => ({
			...entry,
			total_price:
				entry.quantity !== null && entry.unit_price !== null
					? Number(entry.quantity) * Number(entry.unit_price)
					: entry.total_price,
		}));

		try {
			const result = await onSubmit(payload);
			setFeedback(result);
			if (result.ok) {
				setEntries([initialValues]);
			}
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
		<div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 p-4">
			<div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
				<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
					<div>
						<h2 className="text-lg font-semibold text-gray-900">Prepare Awarding</h2>
						<p className="text-xs text-gray-500">
							{prNo ? `PR No: ${prNo}` : "PR reference"}
							{prId ? ` | PR ID: ${prId}` : ""}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
					>
						X
					</button>
				</div>

				<form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-5">
					{feedback && (
						<div
							className={`mb-4 rounded-lg border px-3 py-2 text-sm font-medium ${
								feedback.ok
									? "border-emerald-200 bg-emerald-50 text-emerald-800"
									: "border-red-200 bg-red-50 text-red-700"
							}`}
						>
							{feedback.message}
						</div>
					)}

							<div className="mb-4 flex items-center justify-end">
								<button
									type="button"
									onClick={addEntry}
									disabled={isSaving}
									className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
								>
									+ Add Entry
								</button>
							</div>

							<div className="space-y-6">
								{entries.map((entry, index) => (
									<div key={index} className="rounded-xl border border-gray-200 p-4">
										<div className="mb-4 flex items-center justify-between">
											<h3 className="text-sm font-semibold text-gray-800">Entry {index + 1}</h3>
											<button
												type="button"
												onClick={() => removeEntry(index)}
												disabled={entries.length === 1 || isSaving}
												className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
											>
												Remove
											</button>
										</div>

										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Item No</span>
							<input
								type="number"
								value={entry.item_no ?? ""}
								onChange={(e) => setNumber(index, "item_no", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700 md:col-span-2">
							<span className="mb-1 block font-medium">Description</span>
							<input
								type="text"
								value={entry.description}
								onChange={(e) => setText(index, "description", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Unit</span>
							<input
								type="text"
								value={entry.unit}
								onChange={(e) => setText(index, "unit", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Quantity</span>
							<input
								type="number"
								step="any"
								value={entry.quantity ?? ""}
								onChange={(e) => setNumber(index, "quantity", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Supplier Name</span>
							<input
								type="text"
								value={entry.supplier_name}
								onChange={(e) => setText(index, "supplier_name", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Unit Price</span>
							<input
								type="number"
								step="any"
								value={entry.unit_price ?? ""}
								onChange={(e) => setNumber(index, "unit_price", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Total Price</span>
							<input
								type="number"
								step="any"
								value={entry.total_price ?? ""}
								onChange={(e) => setNumber(index, "total_price", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Quotation No</span>
							<input
								type="number"
								value={entry.quotation_no ?? ""}
								onChange={(e) => setNumber(index, "quotation_no", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">TIN No</span>
							<input
								type="text"
								value={entry.tin_no}
								onChange={(e) => setText(index, "tin_no", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Delivery Days</span>
							<input
								type="text"
								value={entry.delivery_days}
								onChange={(e) => setText(index, "delivery_days", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700 md:col-span-2">
							<span className="mb-1 block font-medium">Supplier Address</span>
							<textarea
								rows={2}
								value={entry.supplier_address}
								onChange={(e) => setText(index, "supplier_address", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="text-sm text-gray-700">
							<span className="mb-1 block font-medium">Created At</span>
							<input
								type="date"
								value={entry.created_at}
								onChange={(e) => setText(index, "created_at", e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
							/>
						</label>

						<label className="flex items-center gap-2 pt-7 text-sm text-gray-700">
							<input
								type="checkbox"
								checked={entry.is_winning}
								onChange={(e) =>
									updateEntry(index, "is_winning", e.target.checked)
								}
								className="h-4 w-4 rounded border-gray-300"
							/>
							<span className="font-medium">Is Winning Supplier</span>
						</label>
								</div>
							</div>
						))}
					</div>

					<div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
						>
							{isSaving ? "Saving..." : "Save Awarding Details"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
