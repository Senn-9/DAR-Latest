"use client";

import { useEffect, useState } from "react";
import { RiCloseLine, RiPrinterLine } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { printRFQ } from "./printRFQ";

type CanvassLivePreviewProps = {
	open: boolean;
	onClose: () => void;
	prNo?: string;
};

const ROW_COUNT = 12;

type ItemRow = {
	stock_no: string;
	description: string;
	quantity: string;
	unit: string;
	unit_price: string;
};

const formatDateWithOffset = (dateText: string, dayOffset: number) => {
	if (!dateText) return "";

	const parsedDate = new Date(dateText);
	if (Number.isNaN(parsedDate.getTime())) return "";

	parsedDate.setDate(parsedDate.getDate() + dayOffset);
	return parsedDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
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

	const handleMetaChange = (k: keyof typeof meta, v: string) => {
		setMeta((prev) => ({ ...prev, [k]: v }));
	};

	const handleItemChange = (index: number, field: keyof ItemRow, value: string) => {
		setItems((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], [field]: value };
			return next;
		});
	};

	const handlePrint = () => {
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
					}));

					// Ensure at least ROW_COUNT rows
					const finalItems = [...formattedItems];
					while (finalItems.length < ROW_COUNT) {
						finalItems.push({ stock_no: "", description: "", quantity: "", unit: "", unit_price: "" });
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

			<div className="relative mx-auto w-full bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 p-12" style={{ maxWidth: "850px", minHeight: "1100px" }}>
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
								<input 
									value={meta.date} 
									onChange={(e) => handleMetaChange("date", e.target.value)}
									className="border-b border-black outline-none w-27 text-left px-1 text-[10px] bg-transparent"
								/>
							</div>
							<div className="flex items-end justify-end gap-2">
								<span className="text-[10px] italic">Canvass No.:</span>
								<input 
									value={meta.canvassNo} 
									onChange={(e) => handleMetaChange("canvassNo", e.target.value)}
									className="border-b border-black outline-none w-27 text-left px-1 text-[10px] bg-transparent"
								/>
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
							<input 
								value={meta.companyName} 
								onChange={(e) => handleMetaChange("companyName", e.target.value)}
								className="border-b border-black outline-none w-full text-center py-0.5"
							/>
							<div className="text-[9px] text-center mt-0.5">(Company Name)</div>
						</div>
						<div>
							<input 
								value={meta.address} 
								onChange={(e) => handleMetaChange("address", e.target.value)}
								className="border-b border-black outline-none w-full text-center py-0.5"
							/>
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
							<input 
								value={meta.deadline} 
								onChange={(e) => handleMetaChange("deadline", e.target.value)}
								className="absolute bottom-0 right-0 w-35 border-b border-black outline-none text-center bg-transparent text-[10px]"
								placeholder=""
							/>
						</div>
						{/* <div className="flex items-start justify-end">
							<input 
								value={meta.deadline} 
								onChange={(e) => handleMetaChange("deadline", e.target.value)}
								className="border-b border-black outline-none w-40 text-center"
								placeholder=""
							/>
						</div> */}
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
					<table className="w-full border-collapse border border-black mb-4 text-[9.5px]">
						<thead>
							<tr>
								<th className="border border-black p-1 text-center w-[8%] font-bold">ITEM NO.</th>
								<th className="border border-black p-1 text-center w-[58%] font-bold">ITEM(S) & DESCRIPTION(S)</th>
								<th className="border border-black p-1 text-center w-[8%] font-bold">QTY</th>
								<th className="border border-black p-1 text-center w-[10%] font-bold">UNIT</th>
								<th className="border border-black p-1 text-center w-[16%] font-bold">UNIT PRICE</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item, i) => (
								<tr key={i} className="h-7">
									<td className="border border-black p-0.5 text-center">
										<input 
											value={item.stock_no} 
											onChange={(e) => handleItemChange(i, "stock_no", e.target.value)}
											className="w-full outline-none text-center bg-transparent"
										/>
									</td>
									<td className="border border-black p-0.5">
										<input 
											value={item.description} 
											onChange={(e) => handleItemChange(i, "description", e.target.value)}
											className="w-full outline-none bg-transparent px-1"
										/>
									</td>
									<td className="border border-black p-0.5 text-center">
										<input 
											value={item.quantity} 
											onChange={(e) => handleItemChange(i, "quantity", e.target.value)}
											className="w-full outline-none text-center bg-transparent"
										/>
									</td>
									<td className="border border-black p-0.5 text-center">
										<input 
											value={item.unit} 
											onChange={(e) => handleItemChange(i, "unit", e.target.value)}
											className="w-full outline-none text-center bg-transparent"
										/>
									</td>
									<td className="border border-black p-0.5 text-center">
										<input 
											value={item.unit_price} 
											onChange={(e) => handleItemChange(i, "unit_price", e.target.value)}
											className="w-full outline-none text-center bg-transparent"
										/>
									</td>
								</tr>
							))}
							<tr className="font-bold h-7">
								<td className="border border-black p-1"></td>
								<td className="border border-black p-1 text-center">TOTAL</td>
								<td className="border border-black p-1"></td>
								<td className="border border-black p-1"></td>
							</tr>
						</tbody>
					</table>

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
