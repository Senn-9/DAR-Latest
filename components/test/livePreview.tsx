"use client";

import React, { useEffect, useState, useRef } from "react";
import { RiCloseLine, RiPrinterLine, RiBold, RiAlignCenter, RiAddLine, RiDeleteBinLine, RiArrowUpLine, RiArrowDownLine } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { printLivePreview } from "./printResolution";

type LivePreviewProps = {
	open: boolean;
	onClose: () => void;
	prNo?: string;
};

const ROW_COUNT = 12;

type Cell = {
	value: string;
	isCenter?: boolean;
};

type Cells = Cell[][];

function makeEmptyCells(rows = ROW_COUNT, cols = 7): Cells {
	return Array.from({ length: rows }, () =>
		Array.from({ length: cols }, (_, c) => ({
			value: "",
			isCenter: c !== 3, // Default center except for Particulars (index 3)
		}))
	);
}

type CellEditorProps = {
	initialValue: string;
	isCenter: boolean;
	onChange: (value: string) => void;
	onFocus?: () => void;
	className?: string;
};

const CellEditor = ({ initialValue, isCenter, onChange, onFocus, className = "" }: CellEditorProps) => {
	const editorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (editorRef.current && document.activeElement !== editorRef.current) {
			if (editorRef.current.innerHTML !== initialValue) {
				editorRef.current.innerHTML = initialValue;
			}
		}
	}, [initialValue]);

	return (
		<div className="relative h-full w-full min-h-[20px]">
			<div
				ref={editorRef}
				contentEditable
				onBlur={(e) => onChange(e.currentTarget.innerHTML)}
				onFocus={onFocus}
				className={`w-full outline-none bg-transparent px-1 min-h-[20px] block break-words whitespace-pre-wrap ${
					isCenter ? "text-center" : "text-left"
				} ${className}`}
				style={{ fontStyle: "normal" }}
			/>
		</div>
	);
};

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

function formatDateMMDDYYYY(value: string | null | undefined) {
	if (!value) return "";
	const normalized = String(value).trim();
	if (!normalized) return "";

	const parsed = new Date(normalized.includes("T") ? normalized : `${normalized}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return normalized;
	}

	return `${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getDate()).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function formatDateLong(value: string | null | undefined) {
	if (!value) return "";
	const normalized = String(value).trim();
	if (!normalized) return "";

	const parsed = new Date(normalized.includes("T") ? normalized : `${normalized}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return normalized;
	}

	return parsed.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

function formatDateLegal(value: string | null | undefined) {
	if (!value) return "";
	const normalized = String(value).trim();
	if (!normalized) return "";

	let parsed: Date;
	if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
		const [month, day, year] = normalized.split("/").map(Number);
		parsed = new Date(year, month - 1, day);
	} else {
		// Try parsing directly first, then with T00:00:00 if it fails or if it looks like an ISO date
		parsed = new Date(normalized);
		if (Number.isNaN(parsed.getTime())) {
			parsed = new Date(normalized.includes("T") ? normalized : `${normalized}T00:00:00`);
		}
	}
	if (Number.isNaN(parsed.getTime())) {
		return normalized;
	}

	const day = parsed.getDate();
	const month = parsed.toLocaleString("en-US", { month: "long" });
	const year = parsed.getFullYear();
	const suffix = day % 10 === 1 && day % 100 !== 11 ? "st" : day % 10 === 2 && day % 100 !== 12 ? "nd" : day % 10 === 3 && day % 100 !== 13 ? "rd" : "th";

	return `${day}${suffix} day of ${month}, ${year}`;
}

export default function LivePreview({ open, onClose, prNo = "" }: LivePreviewProps) {
	const supabase = createClient();
	const [meta, setMeta] = useState({
		refNo: "",
		canvassNo: "",
		prNo,
		date: "",
		bacChair: "ATTY. JAIME G. RESOCO, JR.",
		bacViceChair: "GERRY L. MATAMOROSA",
		bacMember1: "ENGR. MA. ELIZABETH N. ARCILLA",
		bacMember2: "ENGR. JOSE JESUS B. REY, JR.",
		bacMember3: "MARIA REBECCA R. TAROG",
		hope: "RICARDO C. GARCIA",
		asaLco: "ASA/LCO",
		philgepsRef: "PhilGEPS Ref.",
		formNo: "DARCS1-QF-STO-010 Rev 00",
	});
	const [supplierNames, setSupplierNames] = useState<string[]>([]);
	const [supplierTotals, setSupplierTotals] = useState<Record<string, number>>({});
	const [winningItems, setWinningItems] = useState<string[]>([]);
	const [focusedCell, setFocusedCell] = useState<{ r: number; c: number } | null>(null);
	const [isBoldActive, setIsBoldActive] = useState(false);

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
			next[r][c] = { ...next[r][c], value: v };
			return next;
		});
	};

	const toggleCellCenter = (r: number, c: number) => {
		setCells((prev) => {
			const next = prev.map((row) => row.slice());
			next[r][c] = { ...next[r][c], isCenter: !next[r][c].isCenter };
			return next;
		});
	};

	const toggleBold = (e: React.MouseEvent) => {
		e.preventDefault();
		document.execCommand("bold", false);
		setIsBoldActive(document.queryCommandState("bold"));
	};

	const addRow = () => {
		setCells((prev) => {
			const cols = prev[0]?.length || 7;
			const newRow = Array.from({ length: cols }, (_, c) => ({
				value: "",
				isCenter: c !== 3,
			}));
			return [...prev, newRow];
		});
	};

	const removeRow = (index: number) => {
		setCells((prev) => prev.filter((_, i) => i !== index));
	};

	const moveRow = (fromIndex: number, toIndex: number) => {
		if (toIndex < 0 || toIndex >= cells.length) return;
		setCells((prev) => {
			const next = [...prev];
			const [moved] = next.splice(fromIndex, 1);
			next.splice(toIndex, 0, moved);
			return next;
		});
	};

	useEffect(() => {
		const handleSelectionChange = () => {
			if (focusedCell) {
				setIsBoldActive(document.queryCommandState("bold"));
			}
		};
		document.addEventListener("selectionchange", handleSelectionChange);
		return () => document.removeEventListener("selectionchange", handleSelectionChange);
	}, [focusedCell]);

	const handleWinningItemChange = (index: number, value: string) => {
		setWinningItems((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	const handlePrint = () => {
		printLivePreview(meta, cells, supplierNames, supplierTotals, winningItems);
	};

	const setMetaField = (k: keyof typeof meta, v: string) => setMeta((m) => ({ ...m, [k]: v }));
	useEffect(() => {
		if (!open) return;

		setMeta((m) => ({ ...m, prNo }));
		setWinningItems([]);
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

				const [itemsResult, canvassResult, assignmentsResult] = await Promise.all([
					supabase
						.from("purchase_request_items")
						.select("id, stock_no, unit, quantity, description")
						.eq("pr_id", prId)
						.order("id", { ascending: true }),
					supabase
						.from("canvass_entries")
						.select("supplier_name, pr_items, unit_price, ref_no, date, is_winning")
						.eq("pr_no", prNo)
						.order("created_at", { ascending: true }),
					supabase
						.from("canvasser_assignments")
						.select("quotation_no, pr_no")
						.eq("pr_no", prNo),
				]);

				if (itemsResult.error) throw itemsResult.error;
				if (canvassResult.error) throw canvassResult.error;
				if (assignmentsResult.error) throw assignmentsResult.error;

				const itemsData = itemsResult.data || [];
				const canvassData = canvassResult.data || [];
				const assignmentsData = assignmentsResult.data || [];
				const itemById = new Map(itemsData.map((item) => [item.id, item] as const));
				
				// Get the first quotation_no to display as Canvass No
				const firstQuotationNo = assignmentsData[0]?.quotation_no;
				if (firstQuotationNo && !isActive) return;
				
				if (isActive && firstQuotationNo) {
					setMeta((m) => ({ ...m, canvassNo: String(firstQuotationNo) }));
				}
				const uniqueSupplierNames = Array.from(
					new Set(canvassData.map((entry) => (entry.supplier_name || "").trim()).filter(Boolean))
				);
				const winningSupplierNames: string[] = [];
				for (const entry of canvassData) {
					if (!entry.is_winning) continue;
					const supplierName = (entry.supplier_name || "").trim();
					if (supplierName && !winningSupplierNames.includes(supplierName)) {
						winningSupplierNames.push(supplierName);
					}
				}
				const firstRefNo = canvassData.find((entry) => (entry.ref_no || "").trim() !== "")?.ref_no ?? "";
				const firstDate = canvassData.find((entry) => (entry.date || "").trim() !== "")?.date ?? "";
				if (isActive) {
					setMeta((m) => ({
						...m,
						refNo: firstRefNo,
						date: formatDateLong(firstDate),
					}));
					setWinningItems(winningSupplierNames.slice(0, 1));
				}
				const supplierPricesByItem = new Map<string, Map<number, string | number>>();
				for (const name of uniqueSupplierNames) {
					supplierPricesByItem.set(name, new Map<number, string | number>());
				}

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
						next[rowIndex][0] = { value: item.stock_no ?? "", isCenter: true };
						next[rowIndex][1] = { value: item.quantity != null ? String(item.quantity) : "", isCenter: true };
						next[rowIndex][2] = { value: item.unit ?? "", isCenter: true };
						next[rowIndex][3] = { value: item.description ?? "", isCenter: false };
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
							next[itemRow][4 + supplierIndex] = { 
								value: numericPrice > 0 ? formatMoney(numericPrice) : "", 
								isCenter: true 
							};
						} else {
							next[itemRow][4 + supplierIndex] = { value: String(rawValue), isCenter: true };
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
				{focusedCell && (
					<div className="flex items-center gap-2 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 rounded-full px-3 h-12 mr-6 animate-in fade-in slide-in-from-top-2">
						<button
							onMouseDown={toggleBold}
							className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
								isBoldActive 
									? "bg-emerald-600 text-white shadow-inner scale-95" 
									: "bg-neutral-50 text-emerald-600 hover:bg-neutral-100"
							}`}
							title="Bold (Ctrl+B)"
						>
							<RiBold size={20} />
						</button>
						<div className="w-[1px] h-6 bg-gray-200 mx-1" />
						<button
							onMouseDown={(e) => {
								e.preventDefault();
								toggleCellCenter(focusedCell.r, focusedCell.c);
							}}
							className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
								cells[focusedCell.r][focusedCell.c].isCenter 
									? "bg-emerald-600 text-white shadow-inner scale-95" 
									: "bg-neutral-50 text-emerald-600 hover:bg-neutral-100"
							}`}
							title="Toggle Center Alignment"
						>
							<RiAlignCenter size={20} />
						</button>
					</div>
				)}
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
						fontSize: "10px",
						lineHeight: 1.05,
					}}
				>
					<div className="relative" style={{ minHeight: "1024px" }}>
						<div className="flex items-start justify-between mb-2">
							<div />
							<div className="flex items-start justify-center gap-3 flex-1">
								<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" className="h-14 w-14 object-contain" />
								<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" className="h-14 w-14 object-contain" />

								<div className="text-center pt-1">
									<div style={{ fontSize: "11px", fontWeight: 700 }}>REPUBLIC OF THE PHILIPPINES</div>
									<div style={{ fontSize: "11px", fontWeight: 700 }}>DEPARTMENT OF AGRARIAN REFORM</div>
									<div style={{ fontSize: "10px", fontWeight: 400 }}>Tunay na Pagbabago sa Repormang Agraryo</div>
								</div>

								<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO certified" className="h-14 w-14 object-contain rounded" />
								<div className="invisible h-14 w-14 shrink-0" aria-hidden="true" />
							</div>
							<div />
						</div>

						<div className="mt-2 border border-black border-b-0 px-3 pb-2 pt-1">
							<div className="flex justify-end" style={{ minHeight: "34px" }}>
								<div className="space-y-1 text-right" style={{ fontSize: "10px" }}>
									<div className="flex items-center justify-end"><span className="w-20 text-right mr-2 whitespace-nowrap">Ref. No.:</span>
										<input dir="ltr" value={meta.refNo} onChange={(e) => setMetaField("refNo", e.target.value)} className="inline-block w-28 border-b border-black text-left px-1 text-[10px] bg-transparent outline-none" />
									</div>
									<div className="flex items-center justify-end"><span className="w-20 text-right mr-2 whitespace-nowrap">Canvass No.:</span>
										<input dir="ltr" value={meta.canvassNo} onChange={(e) => setMetaField("canvassNo", e.target.value)} className="inline-block w-28 border-b border-black text-left px-1 text-[10px] bg-transparent outline-none" />
									</div>
									<div className="flex items-center justify-end"><span className="w-20 text-right mr-2 whitespace-nowrap">PR No.:</span>
										<input dir="ltr" value={meta.prNo} onChange={(e) => setMetaField("prNo", e.target.value)} className="inline-block w-28 border-b border-black text-left px-1 text-[10px] bg-transparent outline-none" />
									</div>
									<div className="flex items-center justify-end"><span className="w-20 text-right mr-2 whitespace-nowrap">Date:</span>
										<input dir="ltr" type="text" placeholder="February 12, 2026" value={meta.date} onChange={(e) => setMetaField("date", e.target.value)} className="inline-block w-28 border-b border-black text-left px-1 text-[10px] bg-transparent outline-none" />
									</div>
								</div>
							</div>

								<div className="mt-4 text-center font-bold uppercase" style={{ fontSize: "10px", lineHeight: 1.2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
								<div>ABSTRACT OF PRICE QUOTATIONS OFFERED FOR VARIOUS OFFICE SUPPLIES</div>
								<div>AND MATERIALS CALLED FOR ON REQUEST FROM DAR-CAMARINES SUR</div>
								<div>PROVINCIAL OFFICE OFFERED BY DIFFERENT LEADING DEALERS</div>
							</div>
						</div>

						<div className="flex justify-end gap-2 mb-2 px-3">
							<button
								type="button"
								onClick={addRow}
								className="inline-flex items-center gap-1 px-2 py-1 text-[9px] bg-blue-600 text-white rounded hover:bg-blue-700 transition"
							>
								<RiAddLine size={12} /> Add Row
							</button>
						</div>

						<table className="w-full border-collapse table-fixed text-center" style={{ fontSize: "10px" }}>
							<colgroup>
								<col style={{ width: "4.5%" }} />
								<col style={{ width: "4.5%" }} />
								<col style={{ width: "7.5%" }} />
								<col style={{ width: "46%" }} />
								{(() => {
									const remaining = 100 - (4.5 + 4.5 + 7.5 + 46 + 3); // 3% for action col
									const w = (remaining / dealerCount).toFixed(4) + "%";
									return Array.from({ length: dealerCount }).map((_, i) => <col key={i} style={{ width: w }} />);
								})()}
								<col style={{ width: "3%" }} />
							</colgroup>
							<tbody>
								<tr style={{ height: "20px" }}>
									<td className="border border-black font-bold uppercase" rowSpan={2}>ITEM NO.</td>
									<td className="border border-black font-bold uppercase" rowSpan={2}>QTY</td>
									<td className="border border-black font-bold uppercase" rowSpan={2}>UNIT</td>
									<td className="border border-black font-bold uppercase" rowSpan={2}>PARTICULARS</td>
									<td className="border border-black font-bold uppercase" colSpan={dealerCount}>NAME OF DEALERS</td>
									<td className="border border-black font-bold uppercase" rowSpan={2}></td>
								</tr>
								<tr style={{ height: "48px" }}>
									{Array.from({ length: dealerCount }).map((_, i) => (
										<td key={i} className="border border-black text-center align-middle px-2 py-3 uppercase">{supplierNames[i] || ""}</td>
									))}
								</tr>
								{cells.map((row, r) => (
									<tr key={r} className="group/row">
										{row.map((cell, c) => {
											const tdClass = "border border-black align-top p-0 relative";
											const inputClass = "text-[10px]";
											return (
												<td key={c} className={tdClass}>
													{c === 0 && (
														<div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity bg-white/80 py-0.5 z-10">
															<button
																type="button"
																onClick={() => moveRow(r, r - 1)}
																disabled={r === 0}
																className="text-gray-500 hover:text-gray-700 disabled:text-gray-200 transition"
																title="Move up"
															>
																<RiArrowUpLine size={10} />
															</button>
															<button
																type="button"
																onClick={() => moveRow(r, r + 1)}
																disabled={r === cells.length - 1}
																className="text-gray-500 hover:text-gray-700 disabled:text-gray-200 transition"
																title="Move down"
															>
																<RiArrowDownLine size={10} />
															</button>
														</div>
													)}
													<CellEditor
														initialValue={cell.value}
														isCenter={!!cell.isCenter}
														onChange={(val) => handleCellChange(r, c, val)}
														onFocus={() => setFocusedCell({ r, c })}
														className={inputClass}
													/>
												</td>
											);
										})}
										<td className="border border-black align-middle text-center p-0 relative">
											<button
												type="button"
												onClick={() => removeRow(r)}
												className="text-red-500 hover:text-red-700 transition opacity-0 group-hover/row:opacity-100"
												title="Remove row"
											>
												<RiDeleteBinLine size={12} />
											</button>
										</td>
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
									<td className="border border-black" />
								</tr>
							</tbody>
						</table>

						<div className="text-center font-bold uppercase" style={{ fontSize: "10px", marginTop: "4px" }}>BY THE BIDS AND AWARDS COMMITTEE</div>

						<div className="mt-3" style={{ fontSize: "10px", lineHeight: 1.15 }}>
							<div className="mx-auto w-full text-justify" style={{ maxWidth: "680px" }}>
								<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Based on the above abstract of quotation of prices offered by different leading dealers on various materials called for as above,</p>
								<p className="mt-1">the Committee found that:</p>
							</div>
							<div className="mx-auto w-full text-justify mt-2" style={{ maxWidth: "560px" }}>
								<div className="mt-1 flex flex-col space-y-1 text-left">
									{Array.from({ length: 3 }).map((_, index) => {
										const itemLabel = winningItems[index] || "";
										return (
											<div key={index} className="flex w-full items-center gap-2">
												<span className="shrink-0 w-12 text-right">For item</span>
												<input
													value={itemLabel}
													onChange={(e) => handleWinningItemChange(index, e.target.value)}
													className="min-w-0 flex-1 border-b border-black bg-transparent text-center outline-none"
													style={{ lineHeight: 1.1 }}
												/>
												<span className="shrink-0 whitespace-nowrap">offered the lowest price quotation.</span>
											</div>
										);
									})}
								</div>
							</div>
							<div className="mx-auto w-full text-justify mt-2" style={{ maxWidth: "720px" }}>
								<p style={{ marginLeft: "12px" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="font-bold">WHEREOF</span>, considering the above premises, the members of the Bids and Awards Committee hereby recommend to the<br />Head of the Procuring Entity the award of the aforementioned document to the lowest price quoted by the respective dealer/s.</p>
								<p className="mt-2" style={{ marginLeft: "12px" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="font-bold">RESOLVED</span> at the DAR Camarines Sur 1 Provincial Office, HL Building, Carnation St., Triangulo, Naga City this {meta.date ? formatDateLegal(meta.date) : "____ day of ______, 20___"}</p>
							</div>
						</div>

						<div className="mt-10 text-center" style={{ fontSize: "10px", lineHeight: 1.1 }}>
							<input
								value={meta.bacChair}
								onChange={(e) => setMetaField("bacChair", e.target.value)}
								className="w-full text-center font-bold uppercase bg-transparent outline-none"
							/>
							<div>BAC Chairperson</div>
						</div>

						<div className="mt-5 grid grid-cols-2 gap-x-10" style={{ fontSize: "10px", lineHeight: 1.1 }}>
							<div>
								<div className="text-center">
									<input
										value={meta.bacViceChair}
										onChange={(e) => setMetaField("bacViceChair", e.target.value)}
										className="w-full text-center font-bold uppercase bg-transparent outline-none"
									/>
									<div>BAC Vice-Chairperson</div>
								</div>
								<div className="mt-8 text-center">
									<input
										value={meta.bacMember2}
										onChange={(e) => setMetaField("bacMember2", e.target.value)}
										className="w-full text-center font-bold uppercase bg-transparent outline-none"
									/>
									<div>BAC Member</div>
								</div>
							</div>
							<div>
								<div className="text-center">
									<input
										value={meta.bacMember1}
										onChange={(e) => setMetaField("bacMember1", e.target.value)}
										className="w-full text-center font-bold uppercase bg-transparent outline-none"
									/>
									<div>BAC Member</div>
								</div>
								<div className="mt-8 text-center">
									<input
										value={meta.bacMember3}
										onChange={(e) => setMetaField("bacMember3", e.target.value)}
										className="w-full text-center font-bold uppercase bg-transparent outline-none"
									/>
									<div>BAC Member</div>
								</div>
							</div>
						</div>

						<div className="mt-7 text-center" style={{ fontSize: "10px" }}>
							<div>APPROVED BY:</div>
							<div className="mt-6">
								<input
									value={meta.hope}
									onChange={(e) => setMetaField("hope", e.target.value)}
									className="w-full text-center font-bold uppercase bg-transparent outline-none"
								/>
							</div>
							<div>HOPE</div>
						</div>

						<div className="mt-6 flex items-end justify-between" style={{ fontSize: "10px" }}>
							<div>
								<input
									value={meta.asaLco}
									onChange={(e) => setMetaField("asaLco", e.target.value)}
									className="bg-transparent outline-none block"
								/>
								<input
									value={meta.philgepsRef}
									onChange={(e) => setMetaField("philgepsRef", e.target.value)}
									className="bg-transparent outline-none block mt-0"
								/>
							</div>
							<input
								value={meta.formNo}
								onChange={(e) => setMetaField("formNo", e.target.value)}
								className="font-bold bg-transparent outline-none text-right"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
