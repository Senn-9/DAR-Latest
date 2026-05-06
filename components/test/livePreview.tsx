"use client";

import { useEffect, useState } from "react";
import { RiCloseLine, RiPrinterLine } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { printLivePreview } from "./printResolution";

type LivePreviewProps = {
	open: boolean;
	onClose: () => void;
	prNo?: string;
};

const ROW_COUNT = 12;

type Cells = string[][];

function makeEmptyCells(rows = ROW_COUNT, cols = 7): Cells {
	return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
}

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

export default function LivePreview({ open, onClose, prNo = "" }: LivePreviewProps) {
	const supabase = createClient();
	const [meta, setMeta] = useState({ refNo: "", canvassNo: "", prNo, date: "" });
	const [supplierNames, setSupplierNames] = useState<string[]>([]);
	const [supplierTotals, setSupplierTotals] = useState<Record<string, number>>({});

	const [cells, setCells] = useState<Cells>(() => makeEmptyCells());
	const dealerCount = Math.max(3, supplierNames.length);

	// Ensure cells matrix matches dealer count (4 fixed cols + dealer columns)
	useEffect(() => {
		const cols = 4 + dealerCount;
		if (!cells[0] || cells[0].length !== cols) {
			setCells(() => makeEmptyCells(ROW_COUNT, cols));
		}
	}, [dealerCount, cells]);

	const handleCellChange = (r: number, c: number, v: string) => {
		setCells((prev) => {
			const next = prev.map((row) => row.slice());
			next[r][c] = v;
			return next;
		});
	};

	const handlePrint = () => {
		printLivePreview(meta, cells, supplierNames, supplierTotals);
	};

	const setMetaField = (k: keyof typeof meta, v: string) => setMeta((m) => ({ ...m, [k]: v }));
	useEffect(() => {
		if (!open) return;

		setMeta((m) => ({ ...m, prNo }));
	}, [open, prNo]);

	useEffect(() => {
		if (!open || !prNo) return;

		let isActive = true;

		const fetchPreviewData = async () => {
			try {
				const { data: prRow, error: prError } = await supabase
					.from("purchase_requests")
					.select("id")
					.eq("pr_no", prNo)
					.maybeSingle();
				if (prError) throw prError;
				const prId = prRow?.id ?? null;
				if (!prId) return;

				const [itemsResult, canvassResult] = await Promise.all([
					supabase
						.from("purchase_request_items")
						.select("id, stock_no, unit, quantity, description")
						.eq("pr_id", prId)
						.order("id", { ascending: true }),
					supabase
						.from("canvass_entries")
						.select("supplier_name, pr_items, unit_price")
						.eq("pr_no", prNo)
						.order("created_at", { ascending: true }),
				]);

				if (itemsResult.error) throw itemsResult.error;
				if (canvassResult.error) throw canvassResult.error;

				const itemsData = itemsResult.data || [];
				const canvassData = canvassResult.data || [];
				const uniqueSupplierNames = Array.from(
					new Set(canvassData.map((entry) => (entry.supplier_name || "").trim()).filter(Boolean))
				);
				const supplierPricesByItem = new Map<string, Map<number, string | number>>();
				for (const name of uniqueSupplierNames) supplierPricesByItem.set(name, new Map<number, string | number>());

				if (!isActive) return;

				setCells(() => {
					const rows = Math.max(ROW_COUNT, itemsData.length);
					const next = makeEmptyCells(rows, 4 + Math.max(3, uniqueSupplierNames.length));
					const itemRowById = new Map<number, number>();
					const itemQuantityById = new Map<number, number>();

					for (let rowIndex = 0; rowIndex < itemsData.length && rowIndex < rows; rowIndex++) {
						const item = itemsData[rowIndex];
						itemRowById.set(item.id, rowIndex);
						itemQuantityById.set(item.id, Number(item.quantity ?? 0));
						next[rowIndex][0] = item.stock_no ?? "";
						next[rowIndex][1] = item.quantity != null ? String(item.quantity) : "";
						next[rowIndex][2] = item.unit ?? "";
						next[rowIndex][3] = item.description ?? "";
					}

					for (const entry of canvassData) {
						const supplierName = (entry.supplier_name || "").trim();
						const itemId = entry.pr_items ?? null;
						const itemRow = itemId != null ? itemRowById.get(itemId) : undefined;
						if (itemRow == null) continue;
						
						const rawUnitPrice = entry.unit_price ?? "";
						const supplierPrices = supplierPricesByItem.get(supplierName);
						if (!supplierPrices) continue;
						supplierPrices.set(itemId, rawUnitPrice);
					}

					const totalsBySupplier: Record<string, number> = {};
					for (const supplierName of uniqueSupplierNames) {
						let total = 0;
						for (const [itemId, rawValue] of supplierPricesByItem.get(supplierName) ?? []) {
							const quantity = itemQuantityById.get(itemId) ?? 0;
							const numericPrice = Number(rawValue);
							const unitPrice = !Number.isNaN(numericPrice) ? numericPrice : 0;
							total += unitPrice * quantity;
						}
						totalsBySupplier[supplierName] = total;
					}

					const sortedSupplierNames = [...uniqueSupplierNames].sort((left, right) => {
						const leftTotal = totalsBySupplier[left] ?? 0;
						const rightTotal = totalsBySupplier[right] ?? 0;
						if (leftTotal !== rightTotal) return leftTotal - rightTotal;
						return left.localeCompare(right);
					});

					const supplierIndexByName = new Map(sortedSupplierNames.map((name, index) => [name, index] as const));
					for (const entry of canvassData) {
						const supplierName = (entry.supplier_name || "").trim();
						const supplierIndex = supplierIndexByName.get(supplierName);
						const itemId = entry.pr_items ?? null;
						const itemRow = itemId != null ? itemRowById.get(itemId) : undefined;
						if (supplierIndex == null || itemRow == null) continue;

						const rawValue = entry.unit_price ?? "";
						const numericPrice = Number(rawValue);
						
						if (!Number.isNaN(numericPrice) && rawValue !== "") {
							next[itemRow][4 + supplierIndex] = numericPrice > 0 ? formatMoney(numericPrice) : "0.00";
						} else {
							next[itemRow][4 + supplierIndex] = String(rawValue);
						}
					}

					setSupplierNames(sortedSupplierNames);
					setSupplierTotals(totalsBySupplier);
					return next;
				});
			} catch (err) {
				console.error("Error fetching PR items:", err);
			}
		};

		void fetchPreviewData();

		return () => {
			isActive = false;
		};
	}, [open, prNo, supabase]);

	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 sm:p-6">
			<div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

			<div className="absolute right-4 top-4 z-20 flex gap-2">
				<button
					type="button"
					onClick={handlePrint}
					className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-100"
					aria-label="Print preview"
					title="Print"
				>
					<RiPrinterLine size={20} />
				</button>
				<button
					type="button"
					onClick={onClose}
					className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-100"
					aria-label="Close preview"
					title="Close"
				>
					<RiCloseLine size={20} />
				</button>
			</div>

			<div className="relative mx-auto w-full bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10" style={{ maxWidth: "768px" }}>
				<div
					className="mx-auto w-full px-6 pb-6 pt-3 text-black"
					style={{
						fontFamily: "Arial, Helvetica, sans-serif",
						fontSize: "9px",
						lineHeight: 1.05,
					}}
				>
					<div className="relative" style={{ minHeight: "1024px" }}>
						<div className="flex items-start justify-center gap-3 pt-1">
							<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" className="h-12 w-12 object-contain" />
							<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" className="h-12 w-12 object-contain" />
							<div className="pt-1 text-center" style={{ marginLeft: "2px", marginRight: "2px" }}>
								<div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.01em" }}>REPUBLIC OF THE PHILIPPINES</div>
								<div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.01em" }}>DEPARTMENT OF AGRARIAN REFORM</div>
								<div style={{ fontSize: "8px", fontWeight: 400 }}>Tunay na Pagbabago sa Repormang Agraryo</div>
							</div>
							<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO certified" className="ml-1 h-12 w-12 rounded-md object-contain" />
							{/* Invisible spacer to balance the two logos on the left */}
							<div className="w-12 h-12 ml-1" aria-hidden="true" />
						</div>

						<div className="mt-2 border border-black border-b-0 px-3 pb-2 pt-1">
							<div className="flex justify-end" style={{ minHeight: "34px" }}>
								<div className="space-y-1 text-right" style={{ fontSize: "8px" }}>
									<div className="flex items-center justify-end gap-2"><span style={{ fontStyle: "italic" }}>Ref. No.:</span>
										<input value={meta.refNo} onChange={(e) => setMetaField("refNo", e.target.value)} className="inline-block w-20 border-b border-black text-right text-[10px] bg-transparent outline-none" />
									</div>
									<div className="flex items-center justify-end gap-2"><span style={{ fontStyle: "italic" }}>Canvass No.:</span>
										<input value={meta.canvassNo} onChange={(e) => setMetaField("canvassNo", e.target.value)} className="inline-block w-20 border-b border-black text-right text-[10px] bg-transparent outline-none" />
									</div>
									<div className="flex items-center justify-end gap-2"><span style={{ fontStyle: "italic" }}>PR No.:</span>
										<input value={meta.prNo} onChange={(e) => setMetaField("prNo", e.target.value)} className="inline-block w-20 border-b border-black text-right text-[10px] bg-transparent outline-none" />
									</div>
									<div className="flex items-center justify-end gap-2"><span style={{ fontStyle: "italic" }}>Date:</span>
										<input value={meta.date} onChange={(e) => setMetaField("date", e.target.value)} className="inline-block w-20 border-b border-black text-right text-[10px] bg-transparent outline-none" />
									</div>
								</div>
							</div>

							<div className="mt-4 text-center font-bold uppercase" style={{ fontSize: "10px", lineHeight: 1.2 }}>
								<div>ABSTRACT OF PRICE QUOTATIONS OFFERED FOR VARIOUS OFFICE SUPPLIES</div>
								<div>AND MATERIALS CALLED FOR ON REQUEST FROM DAR-CAMARINES SUR</div>
								<div>PROVINCIAL OFFICE OFFERED BY DIFFERENT LEADING DEALERS</div>
							</div>
						</div>

						<table className="w-full border-collapse table-fixed text-center" style={{ fontSize: "8px" }}>
							<colgroup>
								<col style={{ width: "4.5%" }} />
								<col style={{ width: "4.5%" }} />
								<col style={{ width: "5.5%" }} />
								<col style={{ width: "46%" }} />
								{(() => {
									const remaining = 100 - (4.5 + 4.5 + 5.5 + 46);
									const w = (remaining / dealerCount).toFixed(4) + "%";
									return Array.from({ length: dealerCount }).map((_, i) => <col key={i} style={{ width: w }} />);
								})()}
							</colgroup>
							<tbody>
								<tr style={{ height: "20px" }}>
									<td className="border border-black font-bold uppercase" rowSpan={2}>ITEM NO.</td>
									<td className="border border-black font-bold uppercase" rowSpan={2}>QTY</td>
									<td className="border border-black font-bold uppercase" rowSpan={2}>UNIT</td>
									<td className="border border-black font-bold uppercase" rowSpan={2}>PARTICULARS</td>
									<td className="border border-black font-bold uppercase" colSpan={dealerCount}>NAME OF DEALERS</td>
								</tr>
								<tr style={{ height: "48px" }}>
									{Array.from({ length: dealerCount }).map((_, i) => (
										<td key={i} className="border border-black text-center align-middle px-2 py-3 uppercase">{supplierNames[i] || ""}</td>
									))}
								</tr>
								{cells.map((row, r) => (
									<tr key={r}>
										{row.map((val, c) => {
											const tdClass = c === 3 ? "border border-black align-top p-0" : "border border-black align-top p-0 text-center";
											const inputClass = c === 3 ? "w-full px-2 py-1 text-[10px] outline-none text-left" : "w-full px-2 py-1 text-[10px] outline-none text-center";
											return (
												<td key={c} className={tdClass}>
													<input
														value={val}
														onChange={(e) => handleCellChange(r, c, e.target.value)}
														className={inputClass}
													/>
												</td>
											);
										})}
									</tr>
								))}
								<tr style={{ height: "18px" }}>
									<td className="border border-black" />
									<td className="border border-black" />
									<td className="border border-black" />
									<td className="border border-black text-right font-bold uppercase pr-2">TOTAL</td>
									{Array.from({ length: dealerCount }).map((_, i) => {
										const supplierName = supplierNames[i] || "";
										const total = supplierTotals[supplierName];
										return (
											<td key={i} className="border border-black text-center font-bold">
												{typeof total === "number" && total > 0 ? formatMoney(total) : ""}
											</td>
										);
									})}
								</tr>
							</tbody>
						</table>

						<div className="text-center font-bold uppercase" style={{ fontSize: "8px", marginTop: "4px" }}>BY THE BIDS AND AWARDS COMMITTEE</div>

						<div className="mt-3" style={{ fontSize: "8px", lineHeight: 1.15 }}>
							<div className="mx-auto max-w-140 text-justify">
								<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Based on the above abstract of quotation of prices offered by different leading dealers on various materials called for as above,</p>
								<p className="mt-1">the Committee found that:</p>
							</div>
							<div className="mt-2 flex flex-col items-center space-y-2 text-center">
								<div className="flex items-center gap-2 justify-center w-full">
									<span>For item</span>
									<span className="inline-block border-b border-black align-middle" style={{ width: "300px" }} />
									<span>offered the lowest price quotation.</span>
								</div>
								<div className="flex items-center gap-2 justify-center w-full">
									<span>For item</span>
									<span className="inline-block border-b border-black align-middle" style={{ width: "300px" }} />
									<span>offered the lowest price quotation.</span>
								</div>
								<div className="flex items-center gap-2 justify-center w-full">
									<span>For item</span>
									<span className="inline-block border-b border-black align-middle" style={{ width: "300px" }} />
									<span>offered the lowest price quotation.</span>
								</div>
							</div>
							<div className="mx-auto max-w-140 text-justify mt-2">
								<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="font-bold">WHEREOF</span>, considering the above premises, the members of the Bids and Awards Committee hereby recommend to the<br />Head of the Procuring Entity the award of the aforementioned document to the lowest price quoted by the respective dealer/s.</p>
								<p className="mt-2">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="font-bold">RESOLVED</span> at the DAR Camarines Sur 1 Provincial Office, HL Building, Carnation St., Triangulo, Naga City this ____ day of ______, 20___</p>
							</div>
						</div>

						<div className="mt-10 text-center" style={{ fontSize: "8px", lineHeight: 1.1 }}>
							<div className="font-bold uppercase">ATTY. JAIME G. RESOCO, JR.</div>
							<div>BAC Chairperson</div>
						</div>

						<div className="mt-5 grid grid-cols-2 gap-x-10" style={{ fontSize: "8px", lineHeight: 1.1 }}>
							<div>
								<div className="text-center">
									<div className="font-bold uppercase">GERRY L. MATAMOROSA</div>
									<div>BAC Vice-Chairperson</div>
								</div>
								<div className="mt-8 text-center">
									<div className="font-bold uppercase">ENGR. JOSE JESUS B. REY, JR.</div>
									<div>BAC Member</div>
								</div>
							</div>
							<div>
								<div className="text-center">
									<div className="font-bold uppercase">ENGR. MA. ELIZABETH N. ARCILLA</div>
									<div>BAC Member</div>
								</div>
								<div className="mt-8 text-center">
									<div className="font-bold uppercase">MARIA REBECCA R. TAROG</div>
									<div>BAC Member</div>
								</div>
							</div>
						</div>

						<div className="mt-7 text-center" style={{ fontSize: "8px" }}>
							<div>APPROVED BY:</div>
							<div className="mt-6 font-bold uppercase">RICARDO C. GARCIA</div>
							<div>HOPE</div>
						</div>

						<div className="mt-6 flex items-end justify-between" style={{ fontSize: "8px" }}>
							<div>
								<div>ASA/LCO</div>
								<div>PhilGEPS Ref.</div>
							</div>
							<div className="font-bold">DARCS1-QF-STO-010 Rev 00</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
