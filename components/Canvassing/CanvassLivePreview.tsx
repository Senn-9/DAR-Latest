"use client";

import React, { useEffect, useState, useRef } from "react";
import { RiCloseLine, RiPrinterLine, RiAddLine, RiDeleteBinLine, RiArrowUpLine, RiArrowDownLine, RiDraggable } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { printRFQ } from "./printRFQ";

type CanvassLivePreviewProps = {
	open: boolean;
	onClose: () => void;
	prNo?: string;
};

const MIN_ROW_COUNT = 10;

type ItemRow = {
	stock_no: string;
	description: string;
	quantity: string;
	unit: string;
	unit_price: string;
	isCenter?: boolean;
};

const formatDateWithOffset = (dateText: string, dayOffset: number) => {
	if (!dateText) return "";

	const parsedDate = new Date(dateText);
	if (Number.isNaN(parsedDate.getTime())) return "";

	parsedDate.setDate(parsedDate.getDate() + dayOffset);
	return parsedDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
};

type DescriptionEditorProps = {
	index: number;
	initialValue: string;
	isCenter: boolean;
	onChange: (value: string) => void;
	onToggleCenter: () => void;
};

const DescriptionEditor = ({ index, initialValue, isCenter, onChange, onToggleCenter }: DescriptionEditorProps) => {
	const editorRef = useRef<HTMLDivElement>(null);
	const [isBold, setIsBold] = useState(false);

	useEffect(() => {
		// Only update innerHTML if the editor is not focused
		// and the content actually differs from initialValue.
		if (editorRef.current && document.activeElement !== editorRef.current) {
			if (editorRef.current.innerHTML !== initialValue) {
				editorRef.current.innerHTML = initialValue;
			}
		}
	}, [initialValue]);

	const updateBoldState = () => {
		setIsBold(document.queryCommandState("bold"));
	};

	const toggleBold = (e: React.MouseEvent) => {
		e.preventDefault();
		const editor = editorRef.current;
		if (editor) {
			if (document.activeElement !== editor) {
				editor.focus();
				const range = document.createRange();
				const sel = window.getSelection();
				range.selectNodeContents(editor);
				range.collapse(false);
				sel?.removeAllRanges();
				sel?.addRange(range);
			}
			document.execCommand("bold", false);
			updateBoldState();
		}
	};

	return (
		<div className="relative group/editor h-full w-full">
			<div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 group-hover/editor:opacity-100 transition-opacity z-10">
				<button
					type="button"
					onMouseDown={toggleBold}
					title="Bold"
					className={`w-4 h-3.5 flex items-center justify-center text-[7px] font-bold rounded border transition-colors ${
						isBold ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400"
					}`}
				>
					B
				</button>
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						e.stopPropagation();
						// Sync current content before toggling center
						if (editorRef.current) {
							onChange(editorRef.current.innerHTML);
						}
						onToggleCenter();
					}}
					title="Center"
					className={`w-4 h-3.5 flex items-center justify-center text-[7px] rounded border transition-colors ${
						isCenter ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400"
					}`}
				>
					≡
				</button>
			</div>
			<div
				ref={editorRef}
				id={`editor-${index}`}
				contentEditable
				onBlur={(e) => onChange(e.currentTarget.innerHTML)}
				onFocus={updateBoldState}
				onKeyUp={updateBoldState}
				onMouseUp={updateBoldState}
				className={`w-full outline-none bg-transparent px-1 min-h-[16px] block break-words whitespace-pre-wrap ${
					isCenter ? "text-center" : "text-left"
				}`}
				style={{ fontStyle: "normal" }}
			/>
		</div>
	);
};

export default function CanvassLivePreview({ open, onClose, prNo = "" }: CanvassLivePreviewProps) {
	const supabase = createClient();
	const [meta, setMeta] = useState({
		date: "",
		canvassNo: "",
		companyName: "",
		address: "",
		deadline: "",
	});

	const [items, setItems] = useState<ItemRow[]>([]);
	const [columnWidths, setColumnWidths] = useState({
		itemNo: 60,
		description: 380,
		qty: 60,
		unit: 70,
		unitPrice: 100,
		action: 60,
	});
	const [rowHeights, setRowHeights] = useState<{ [key: number]: number }>({});
	const [resizingColumn, setResizingColumn] = useState<string | null>(null);
	const [resizingRow, setResizingRow] = useState<number | null>(null);
	const [startX, setStartX] = useState(0);
	const [startY, setStartY] = useState(0);
	const tableRef = useRef<HTMLTableElement>(null);

	const handleItemChange = (index: number, field: keyof ItemRow, value: string) => {
		setItems((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], [field]: value };
			return next;
		});
	};

	const addRow = () => {
		setItems((prev) => [
			...prev,
			{ stock_no: "", description: "", quantity: "", unit: "", unit_price: "", isCenter: false },
		]);
	};

	const removeRow = (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	};

	const moveRow = (fromIndex: number, toIndex: number) => {
		if (toIndex < 0 || toIndex >= items.length) return;
		setItems((prev) => {
			const next = [...prev];
			const [moved] = next.splice(fromIndex, 1);
			next.splice(toIndex, 0, moved);
			return next;
		});
	};

	const toggleItemCenter = (index: number) => {
		setItems((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], isCenter: !next[index].isCenter };
			return next;
		});
	};

	const handleMouseDownColumn = (e: React.MouseEvent, column: string) => {
		setResizingColumn(column);
		setStartX(e.clientX);
	};

	const handleMouseDownRow = (e: React.MouseEvent, index: number) => {
		setResizingRow(index);
		setStartY(e.clientY);
	};

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (resizingColumn) {
				const diff = e.clientX - startX;
				setColumnWidths((prev) => ({
					...prev,
					[resizingColumn]: Math.max(50, prev[resizingColumn as keyof typeof prev] + diff),
				}));
				setStartX(e.clientX);
			}
			if (resizingRow !== null) {
				const diff = e.clientY - startY;
				setRowHeights((prev) => ({
					...prev,
					[resizingRow]: Math.max(28, (prev[resizingRow] || 28) + diff),
				}));
				setStartY(e.clientY);
			}
		};

		const handleMouseUp = () => {
			setResizingColumn(null);
			setResizingRow(null);
		};

		if (resizingColumn || resizingRow !== null) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [resizingColumn, resizingRow, startX, startY]);

	const handlePrint = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		// Blur the button to prevent focus issues after returning from print tab
		(e.currentTarget as HTMLButtonElement).blur();
		printRFQ({ ...meta, prNo }, items);
	};

	useEffect(() => {
		if (!open || !prNo) return;

		let isActive = true;

		const fetchPRData = async () => {
			try {
				// 1. Fetch the Purchase Request basic info
				const { data: prRow, error: prError } = await supabase
					.from("purchase_requests")
					.select("id")
					.eq("pr_no", prNo)
					.maybeSingle();

				if (prError) {
					console.error("Error fetching purchase_request:", prError);
					throw prError;
				}
				if (!prRow) return;

				// 2. Fetch the latest canvasser assignment to get released_at and quotation_no
				const { data: assignment, error: assignmentError } = await supabase
					.from("canvasser_assignments")
					.select("released_at, quotation_no")
					.eq("pr_no", prNo)
					.order("released_at", { ascending: false })
					.limit(1)
					.maybeSingle();

				if (assignmentError) {
					console.error("Error fetching canvasser_assignment:", assignmentError);
					// Don't throw, we can still show the PR items even if assignment meta is missing
				}

				if (isActive) {
					setMeta((prev) => ({
						...prev,
						date: assignment?.released_at 
							? new Date(assignment.released_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) 
							: prev.date,
						canvassNo: assignment?.quotation_no || prev.canvassNo,
					}));
				}

				// 3. Fetch the PR items
				const { data: itemsData, error: itemsError } = await supabase
					.from("purchase_request_items")
					.select("stock_no, description, quantity, unit")
					.eq("pr_id", prRow.id)
					.order("id", { ascending: true });

				if (itemsError) {
					console.error("Error fetching purchase_request_items:", itemsError);
					throw itemsError;
				}

				if (isActive && itemsData) {
					const formattedItems = itemsData.map((item) => ({
						stock_no: item.stock_no || "",
						description: item.description || "",
						quantity: item.quantity != null ? String(item.quantity) : "",
						unit: item.unit || "",
						unit_price: "",
						isCenter: false,
					}));

					// Ensure at least MIN_ROW_COUNT rows, or keep all items if more
					const finalItems = [...formattedItems];
					while (finalItems.length < MIN_ROW_COUNT) {
						finalItems.push({ stock_no: "", description: "", quantity: "", unit: "", unit_price: "", isCenter: false });
					}
					setItems(finalItems);
				}
			} catch (err) {
				console.error("Error fetching PR items:", err);
			}
		};

		void fetchPRData();

		return () => {
			isActive = false;
		};
	}, [open, prNo, supabase]);

	useEffect(() => {
		if (!open) return;

		setMeta((prev) => ({
			...prev,
			deadline: formatDateWithOffset(prev.date, 7),
		}));
	}, [open, meta.date]);

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

	const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
		const target = e.currentTarget;
		target.style.height = "auto";
		target.style.height = target.scrollHeight + "px";
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 sm:p-6">
			<div className="fixed inset-0 z-0" onClick={onClose} aria-hidden="true" />

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

			<div className="relative z-10 mx-auto w-full bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 p-12" style={{ maxWidth: "850px", minHeight: "1100px" }}>
				<div className="text-black" style={{ fontFamily: "Arial Narrow", fontSize: "10px" }}>
					
					{/* Top Section */}
					<div className="grid grid-cols-[1fr_3fr_1fr] items-start mb-2">
						<div />
						
						{/* Center Logos and Text */}
						<div className="flex items-start justify-center gap-3">
							<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" className="h-12 w-12 object-contain" />
							<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" className="h-12 w-12 object-contain" />
							<div className="pt-1 text-center" style={{ marginLeft: "2px", marginRight: "2px" }}>
								<div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.01em" }}>REPUBLIC OF THE PHILIPPINES</div>
								<div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.01em" }}>DEPARTMENT OF AGRARIAN REFORM</div>
								<div style={{ fontSize: "8px", fontWeight: 400 }}>Tunay na Pagbabago sa Repormang Agraryo</div>
							</div>
							<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO certified" className="ml-1 h-12 w-12 rounded-md object-contain" />
							{/* Invisible spacer to balance the two logos on the left */}
							<div className="w-12 h-12 ml-3" aria-hidden="true" />
						</div>

						<div />
					</div>

					{/* Meta Row (Below Header) */}
					<div className="flex justify-between items-end mb-6">
						<div className="text-[10px] whitespace-nowrap">Revised on May 24, 2004</div>
						<div className="text-right">
							<div className="flex items-end justify-end gap-2 mb-1">
								<span className="text-[10px] italic">Date:</span>
								<span className="border-b border-black w-27 text-left px-1 text-[10px] min-h-[14px] inline-block">{meta.date}</span>
							</div>
							<div className="flex items-end justify-end gap-2">
								<span className="text-[10px] italic">Canvass No.:</span>
								<span className="border-b border-black w-27 text-left px-1 text-[10px] min-h-[14px] inline-block">{meta.canvassNo}</span>
							</div>
						</div>
					</div>

					{/* Agency Header */}
					<div className="text-center mb-8">
						<div className="font-bold text-[10px] uppercase">Department of Agrarian Reform</div>
						<div className="text-[10px]">Agency/Procuring Entity</div>
					</div>

					{/* Company Info */}
					<div className="w-[25%] mb-6">
						<div className="mb-4">
							<div className="border-b border-black w-full text-center py-0.5 min-h-[16px]">{meta.companyName}</div>
							<div className="text-[9px] text-center mt-0.5">(Company Name)</div>
						</div>
						<div>
							<div className="border-b border-black w-full text-center py-0.5 min-h-[16px]">{meta.address}</div>
							<div className="text-[9px] text-center mt-0.5">(Address)</div>
						</div>
					</div>

					{/* Instructions */}
					<div className="mb-6 text-[10px]">
						<div className="relative leading-relaxed text-justify text-[10px]" style={{ textIndent: "24px" }}>
							<span>
								Please quote your lowest price on the item/s listed below, subject to the General Conditions indicated below, stating the shortest time of
								<br />
								delivery and submit your quotation duly signed by you or your duly authorized representative not later than
							</span>
							<span className="absolute bottom-0 right-0 w-35 border-b border-black text-center text-[10px] min-h-[14px]">{meta.deadline}</span>
						</div>
					</div>

				{/* Signature Block */}
					<div className="flex justify-end mb-4">
						<div className="text-center mr-2">
							<div className="font-bold border-b border-black px-4 text-[10px]">ATTY. JAIME G. RESOCO, JR.</div>
							<div className="text-[10px]">BAC Chairperson</div>
						</div>
					</div>

					{/* Notes */}
					<div className="grid grid-cols-2 gap-x-1 text-[8px] mb-6 leading-tight">
						<div className="space-y-1">
							<div className="flex gap-2">
								<span className="font-bold">NOTE:</span> 
								<div className="flex flex-col gap-1">
									<div className="flex gap-2"><span>1.</span> <span>ALL ENTRIES MUST BE WRITTEN LEGIBLY.</span></div>
									<div className="flex gap-2"><span>2.</span> <span>QUOTATION MUST BE RETURNED IN A SEALED ENVELOPE <br /> NO LONGER THAN THREE (3) DAYS UPON RECEIPT.</span></div>
									<div className="flex gap-2"><span>3.</span> <span>PRICE QUOTATIONS MUST INDICATE PRICE/S, SERVICE/<br />DELIVERY CHARGES INCLUSIVE OF VAT/OTHER CHARGES. IF<br />NON-INCLUSIVE, PLEASE INDICATE FIGURES FOR VAT.</span></div>
									<div className="flex gap-2"><span>4.</span> <span>PRICE VALIDITY SHALL BE FOR A PERIOD OF <span className="underline font-bold">180 CALENDAR<br />DAYS.</span></span></div>
								</div>
							</div>
						</div>
						<div className="space-y-1 -ml-13">
							<div className="flex gap-2"><span>5.</span> <span>DELIVERY PERIOD WITHIN <span className="underline font-bold">SEVEN (7) DAYS</span> UPON RECEIPT<br />OF PURCHASE ORDER.</span></div>
							<div className="flex gap-2"><span>6.</span> <span>WARRANTY SHALL BE FOR A PERIOD OF SIX (6) MONTHS FOR<br />SUPPLIES & MATERIALS, ONE (1) YEAR FOR EQUIPMENT FROM<br />DATE OF ACCEPTANCE BY THE PROCURING ENTITY.</span></div>
							<div className="flex gap-2"><span>7.</span> <span>I / WE ARE BOUND TO DELIVER THE ITEM/S PER OUR QUOTATION<br />PURSUANT TO THE PROVISIONS OR SANCTIONS UNDER RA 9184.<br />PURSUANT TO THE PROVISIONS OR SANCTIONS UNDER RA 9184.</span></div>
						</div>
					</div>

					{/* Items Table */}
					<div className="mb-4">
						<div className="flex justify-end gap-2 mb-2">
							<button
								type="button"
								onClick={addRow}
								className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 transition"
							>
								<RiAddLine size={14} /> Add Row
							</button>
						</div>
						<table ref={tableRef} className="w-full border-collapse border border-black text-[9.5px]">
							<thead>
								<tr>
									<th
										style={{ width: columnWidths.itemNo }}
										className="border border-black p-1 text-center font-bold relative"
									>
										ITEM NO.
										<div
											onMouseDown={(e) => handleMouseDownColumn(e, "itemNo")}
											className="absolute right-0 top-0 h-full w-1 bg-gray-400 hover:bg-blue-600 cursor-col-resize transition-colors"
											title="Drag to resize"
										/>
									</th>
									<th
										style={{ width: columnWidths.description }}
										className="border border-black p-1 text-center font-bold relative"
									>
										ITEM(S) & DESCRIPTION(S)
										<div
											onMouseDown={(e) => handleMouseDownColumn(e, "description")}
											className="absolute right-0 top-0 h-full w-1 bg-gray-400 hover:bg-blue-600 cursor-col-resize transition-colors"
											title="Drag to resize"
										/>
									</th>
									<th
										style={{ width: columnWidths.qty }}
										className="border border-black p-1 text-center font-bold relative"
									>
										QTY
										<div
											onMouseDown={(e) => handleMouseDownColumn(e, "qty")}
											className="absolute right-0 top-0 h-full w-1 bg-gray-400 hover:bg-blue-600 cursor-col-resize transition-colors"
											title="Drag to resize"
										/>
									</th>
									<th
										style={{ width: columnWidths.unit }}
										className="border border-black p-1 text-center font-bold relative"
									>
										UNIT
										<div
											onMouseDown={(e) => handleMouseDownColumn(e, "unit")}
											className="absolute right-0 top-0 h-full w-1 bg-gray-400 hover:bg-blue-600 cursor-col-resize transition-colors"
											title="Drag to resize"
										/>
									</th>
									<th
										style={{ width: columnWidths.unitPrice }}
										className="border border-black p-1 text-center font-bold relative"
									>
										UNIT PRICE
										<div
											onMouseDown={(e) => handleMouseDownColumn(e, "unitPrice")}
											className="absolute right-0 top-0 h-full w-1 bg-gray-400 hover:bg-blue-600 cursor-col-resize transition-colors"
											title="Drag to resize"
										/>
									</th>
									<th
										style={{ width: columnWidths.action }}
										className="border border-black p-1 text-center font-bold"
									>
										ACTION
									</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item, i) => (
								<tr key={i} style={{ height: rowHeights[i] || "auto" }} className="relative group">
									<td style={{ width: columnWidths.itemNo }} className="border border-black p-0.5 text-center align-middle relative">
										<div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 py-0.5 z-10">
											<button
												type="button"
												onClick={() => moveRow(i, i - 1)}
												disabled={i === 0}
												className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 transition"
												title="Move up"
											>
												<RiArrowUpLine size={10} />
											</button>
											<span className="text-[8px] text-gray-500">{i + 1}</span>
											<button
												type="button"
												onClick={() => moveRow(i, i + 1)}
												disabled={i === items.length - 1}
												className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 transition"
												title="Move down"
											>
												<RiArrowDownLine size={10} />
											</button>
										</div>
										<input
											value={item.stock_no}
											onChange={(e) => handleItemChange(i, "stock_no", e.target.value)}
											className="w-full outline-none text-center bg-transparent"
										/>
									</td>
									<td style={{ width: columnWidths.description }} className="border border-black p-0.5 align-middle relative">
										<DescriptionEditor
											index={i}
											initialValue={item.description}
											isCenter={!!item.isCenter}
											onChange={(val) => handleItemChange(i, "description", val)}
											onToggleCenter={() => toggleItemCenter(i)}
										/>
									</td>
									<td style={{ width: columnWidths.qty }} className="border border-black p-0.5 text-center align-middle">
										<input
											value={item.quantity}
											onChange={(e) => handleItemChange(i, "quantity", e.target.value)}
											className="w-full outline-none text-center bg-transparent"
										/>
									</td>
									<td style={{ width: columnWidths.unit }} className="border border-black p-0.5 text-center align-middle">
										<input
											value={item.unit}
											onChange={(e) => handleItemChange(i, "unit", e.target.value)}
											className="w-full outline-none text-center bg-transparent"
										/>
									</td>
									<td style={{ width: columnWidths.unitPrice }} className="border border-black p-0.5 text-center align-middle">
										<input
											value={item.unit_price}
											onChange={(e) => handleItemChange(i, "unit_price", e.target.value)}
											className="w-full outline-none text-center bg-transparent"
										/>
									</td>
									<td style={{ width: columnWidths.action }} className="border border-black p-0.5 text-center align-middle relative">
										<button
											type="button"
											onClick={() => removeRow(i)}
											className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 hover:text-red-800 transition p-0.5 opacity-0 group-hover:opacity-100 z-10"
											title="Remove row"
										>
											<RiDeleteBinLine size={14} />
										</button>
										<div
											onMouseDown={(e) => handleMouseDownRow(e, i)}
											className="absolute bottom-0 left-0 right-0 h-1 bg-gray-400 hover:bg-blue-500 cursor-row-resize transition-colors"
											title="Drag to resize row height"
										/>
									</td>
								</tr>
							))}
								<tr className="font-bold h-7">
									<td className="border border-black p-1"></td>
									<td className="border border-black p-1 text-center">TOTAL</td>
									<td className="border border-black p-1"></td>
									<td className="border border-black p-1"></td>
									<td className="border border-black p-1"></td>
									<td className="border border-black p-1"></td>
								</tr>
							</tbody>
						</table>
					</div>

					<div className="text-center font-bold italic mb-8 text-[10px]">
						AFTER HAVING CAREFULLY READ AND ACCEPTED YOUR GENERAL CONDITIONS, I / WE QUOTE YOU ON THE ITEM AT PRICES NOTED ABOVE.
					</div>

					{/* Footer Section */}
					<div className="flex justify-between items-start">
						{/* Left Footer */}
						<div className="w-[60%]">
							<div className="mb-4">Served by:</div>
							<div className="space-y-4">
								<div className="font-bold underline text-[9px] leading-tight whitespace-nowrap">
									IMELDA R. BALAAG / JACOB K. GUEVARRA / ANTHONY KEVIN D. TEJADA / RUBEN R. VELASCO III
								</div>
								<div className="font-bold underline text-[9px] leading-tight">
									SANTOS CLOYD PAPA / ELDA D. EMILA / JOAN MIRZI CALLO / FRANCES JOY DE SILVA
								</div>
							</div>
							<div className="mt-8 space-y-1 text-[10px]">
								<div className="font-bold">CANVASSER</div>
								<div>ECT/asa</div>
								<div>{prNo}</div>
							</div>
						</div>

						{/* Right Footer */}
						<div className="w-[30%] space-y-4">
							<div className="text-center">
								<div className="border-b border-black h-4 w-full mb-0.5"></div>
								<div className="text-[9px]">PRINTED NAME/SIGNATURE</div>
							</div>
							<div className="text-center">
								<div className="border-b border-black h-4 w-full mb-0.5"></div>
								<div className="text-[9px]">Tel No./Cellphone No./Email Address</div>
							</div>
							<div className="text-center">
								<div className="border-b border-black h-4 w-full mb-0.5"></div>
								<div className="text-[9px]">PhilGeps Registration Number</div>
							</div>
							<div className="text-center">
								<div className="border-b border-black h-4 w-full mb-0.5"></div>
								<div className="text-[9px]">BIR-TIN</div>
							</div>
							<div className="border border-black p-2 mt-2">
								<div className="flex justify-around mb-1 text-[10px]">
									<div className="flex items-center gap-1"><div className="w-3 h-3 border border-black"></div> VAT</div>
									<div className="flex items-center gap-1"><div className="w-3 h-3 border border-black"></div> NON-VAT</div>
								</div>
								<div className="text-center font-bold text-[9px]">(Please check - VAT or NON-VAT)</div>
							</div>
							<div className="text-right font-bold mt-4 text-[9px]">DARCS1-QF-STO-009 Rev 01</div>
						</div>
					</div>

				</div>
			</div>
		</div>
	);
}
