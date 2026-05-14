"use client";

import { useEffect, useState } from "react";
import { RiCloseLine, RiPrinterLine, RiAddLine } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { printBACReso } from "./BACRESOPRINT";

type BACRESOProps = {
	open: boolean;
	onClose: () => void;
	prNo?: string;
};

type PRItem = {
	stock_no?: string;
	description?: string;
	quantity?: number;
	unit?: string;
	subtotal?: number;
};

type BACData = {
	id: number;
	pr_no: string;
	entity_name: string;
	office_section: string;
	resp_code: string;
	purpose: string;
	total_cost: number;
	status: string;
	fund_cluster: string;
	req_name: string;
	app_name: string;
	app_no: string;
	created_at: string;
	purchase_request_items?: PRItem[];
};

type TableRow = {
	id: number;
	prNo: string;
	date: string;
	cost: string;
	endUser: string;
	mode: string;
};

export default function BACRESO({ open, onClose, prNo = "" }: BACRESOProps) {
	const supabase = createClient();
	const [prData, setPrData] = useState<BACData | null>(null);
	const [loading, setLoading] = useState(true);

	// Resolution form fields
	const currentYear = new Date().getFullYear();
	const [resoYear, setResoYear] = useState(currentYear.toString());
	const [resoSequence, setResoSequence] = useState("");
	const [alternativeMode, setAlternativeMode] = useState("");
	const [whereasClauses, setWhereasClauses] = useState<{ id: number; lines: string[] }[]>([
		{ 
			id: 1, 
			lines: ["the ------------- of the Department of Agrarian Reform, Camarines Sur Provincial Office has requested for ---------------------------------- which is urgently needed by the office;"] 
		},
		{
			id: 2,
			lines: ["the requested ---------------------------------- which have fund earmarked for the estimated cost as certified by the Budget Officer, Ms. Agnes S. Argamusa and approved by the Head of Procuring Entity (HOPE)/ PARPO II, Ricardo C. Garcia;"]
		},
		{
			id: 3,
			lines: ["the requested ---------------------------------- which as stated in the Purchase Request have been evaluated by the members of the Bid and Awards Committee (BAC) and is hereby recommended for procurement by SVP method, to wit:"]
		},
	]);
	const [endUser, setEndUser] = useState("");
	const [bacChairperson, setBacChairperson] = useState("ATTY. JAIME G. RESOCO, JR.");
	const [bacViceChairperson, setBacViceChairperson] = useState("GERRY L. MATAMOROSA");
	const [bacMember1, setBacMember1] = useState("ENGR. MA. ELIZABETH N. ARCILLA");
	const [bacMember2, setBacMember2] = useState("ENGR. JOSE JESUS B. REY, JR.");
	const [bacMember3, setBacMember3] = useState("MARIA REBECCA R. TAROG");
	const [hope, setHope] = useState("RICARDO C. GARCIA");

	const addWhereasClause = () => {
		setWhereasClauses((prev) => [...prev, { id: Date.now(), lines: [""] }]);
	};

	const addBlankLine = (clauseId: number) => {
		setWhereasClauses((prev) =>
			prev.map((clause) =>
				clause.id === clauseId ? { ...clause, lines: [...clause.lines, ""] } : clause
			)
		);
	};

	const updateWhereasLine = (clauseId: number, lineIndex: number, value: string) => {
		setWhereasClauses((prev) =>
			prev.map((clause) =>
				clause.id === clauseId
					? {
							...clause,
							lines: clause.lines.map((line, i) => (i === lineIndex ? value : line)),
					  }
					: clause
			)
		);
	};

	const removeWhereasLine = (clauseId: number, lineIndex: number) => {
		setWhereasClauses((prev) =>
			prev.map((clause) => {
				if (clause.id === clauseId) {
					const newLines = clause.lines.filter((_, i) => i !== lineIndex);
					return { ...clause, lines: newLines.length > 0 ? newLines : [""] };
				}
				return clause;
			})
		);
	};

	const removeWhereasClause = (clauseId: number) => {
		setWhereasClauses((prev) => prev.filter((clause) => clause.id !== clauseId));
	};
	const [tableRows, setTableRows] = useState<TableRow[]>([]);
	const [dateResolved, setDateResolved] = useState("");

	const getOrdinal = (n: number) => {
		const s = ["th", "st", "nd", "rd"];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	};

	const formatDateToOrdinal = (dateStr: string) => {
		try {
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return dateStr;
			const day = getOrdinal(d.getDate());
			const month = d.toLocaleDateString("en-US", { month: "long" });
			const year = d.getFullYear();
			return `${day} day of ${month}, ${year}`;
		} catch {
			return dateStr;
		}
	};

	const numberToWords = (n: number): string => {
		const words = [
			"ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
			"ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"
		];
		const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
		
		if (n < 20) return words[n];
		if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + words[n % 10] : "");
		return n.toString(); // Fallback for very large numbers
	};

	const addRow = () => {
		setTableRows((prev) => [
			...prev,
			{ id: Date.now(), prNo: "", date: "", cost: "", endUser: "", mode: "SVP" },
		]);
	};

	const updateRow = (id: number, field: keyof TableRow, value: string) => {
		setTableRows((prev) => {
			const updatedRows = prev.map((row) => (row.id === id ? { ...row, [field]: value } : row));
			// If the first row's date is updated, sync it with dateResolved
			if (updatedRows.length > 0 && updatedRows[0].id === id && field === "date") {
				setDateResolved(formatDateToOrdinal(value));
			}
			return updatedRows;
		});
	};

	useEffect(() => {
		if (!open || !prNo) return;

		let isActive = true;
		setLoading(true);

		const fetchPRData = async () => {
			try {
				const { data: prData, error: prError } = await supabase
					.from("purchase_requests")
					.select(`
						id, pr_no, entity_name, office_section, resp_code,
						purpose, total_cost, status, fund_cluster,
						req_name, app_name, app_no, created_at,
						purchase_request_items (*)
					`)
					.eq("pr_no", prNo)
					.maybeSingle();

				if (prError) throw prError;

				if (isActive && prData) {
					setPrData(prData as BACData);
					
					let allRelatedPRs: any[] = [prData];
					
					// Fetch resolution_no from bac_resolution table
					const { data: resoData, error: resoError } = await supabase
						.from("bac_resolution")
						.select("resolution_no")
						.eq("pr_request_id", prData.id)
						.maybeSingle();

					if (!resoError && resoData?.resolution_no) {
						const parts = resoData.resolution_no.split("-");
						if (parts.length === 2) {
							setResoYear(parts[0]);
							setResoSequence(parts[1]);
						} else {
							setResoSequence(resoData.resolution_no);
						}

						// NEW: Fetch all other PRs that share this same resolution number
						const { data: allResoLinks } = await supabase
							.from("bac_resolution")
							.select("pr_request_id")
							.eq("resolution_no", resoData.resolution_no);

						if (allResoLinks && allResoLinks.length > 1) {
							const otherPrIds = allResoLinks
								.map(link => link.pr_request_id)
								.filter(id => id !== prData.id);

							if (otherPrIds.length > 0) {
								const { data: otherPRs } = await supabase
									.from("purchase_requests")
									.select(`
										id, pr_no, entity_name, office_section, resp_code,
										purpose, total_cost, status, fund_cluster,
										req_name, app_name, app_no, created_at,
										purchase_request_items (*)
									`)
									.in("id", otherPrIds);
								
								if (otherPRs) {
									allRelatedPRs = [...allRelatedPRs, ...otherPRs];
								}
							}
						}
					}

					setEndUser(prData.office_section || "");
					// WHEREAS fields start with pre-data for the clauses
					setWhereasClauses([
						{ 
							id: 1, 
							lines: ["the ------------- of the Department of Agrarian Reform, Camarines Sur Provincial Office has requested for ---------------------------------- which is urgently needed by the office;"] 
						},
						{
							id: 2,
							lines: ["the requested ---------------------------------- which have fund earmarked for the estimated cost as certified by the Budget Officer, Ms. Agnes S. Argamusa and approved by the Head of Procuring Entity (HOPE)/ PARPO II, Ricardo C. Garcia;"]
						},
						{
							id: 3,
							lines: ["the requested ---------------------------------- which as stated in the Purchase Request have been evaluated by the members of the Bid and Awards Committee (BAC) and is hereby recommended for procurement by SVP method, to wit:"]
						},
					]);
					// Set date to today in ordinal format
					const today = new Date();
					const formattedToday = formatDateToOrdinal(today.toISOString());
					
					// Update table with ALL found PRs
					const rows = allRelatedPRs.map((pr, index) => ({
						id: index,
						prNo: pr.pr_no || "",
						date: pr.created_at 
							? new Date(pr.created_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
							: "",
						cost: pr.total_cost ? `₱${pr.total_cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "",
						endUser: pr.office_section || "",
						mode: "SVP",
					}));
					
					setTableRows(rows);

					// If the first row has a date from DB, use it for dateResolved, otherwise use today
					if (prData.created_at) {
						setDateResolved(formatDateToOrdinal(prData.created_at));
					} else {
						setDateResolved(formattedToday);
					}
				}
			} catch (err) {
				console.error("Error fetching PR data:", err);
			} finally {
				if (isActive) setLoading(false);
			}
		};

		void fetchPRData();

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

	const handlePrint = () => {
		printBACReso(
			{
				resoYear,
				resoSequence,
				alternativeMode,
				dateResolved,
				bacChairperson,
				bacViceChairperson,
				bacMember1,
				bacMember2,
				bacMember3,
				hope,
			},
			whereasClauses,
			tableRows
		);
	};

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
				{loading ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-gray-500">Loading...</div>
					</div>
				) : (
					<div className="text-black" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
						
						{/* Header with Logos */}
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

								<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO Certified" className="h-14 w-14 object-contain rounded" />
								<div className="invisible h-14 w-14 shrink-0" aria-hidden="true" />
							</div>
							<div />
						</div>

						{/* Committee Info */}
						<div className="text-center mb-4">
							<div style={{ fontSize: "10px" }}>PROVINCIAL BIDS AND AWARDS COMMITTEE OF</div>
							<div style={{ fontSize: "10px", fontWeight: 700 }}>DARPO-CAMARINES SUR I</div>
						</div>

						{/* Resolution Number */}
						<div className="flex justify-center mb-4">
							<div className="flex items-center">
								<span style={{ fontSize: "11px", fontWeight: 700 }}>Resolution No. {resoYear}-</span>
								<input 
									value={resoSequence} 
									onChange={(e) => setResoSequence(e.target.value)}
									className="outline-none w-16 bg-transparent font-bold ml-1"
									style={{ fontSize: "11px" }}
									placeholder="###"
								/>
							</div>
						</div>

						{/* Title */}
						<div className="text-center mb-6">
							<div style={{ fontSize: "11px", fontWeight: 700 }}>"RESOLUTION RECOMMENDING THE PROCUREMENT BY ALTERNATIVE MODE OF PROCUREMENT</div>
							<div className="flex justify-center items-center gap-1 my-1">
								<span>(</span>
								<input 
									value={alternativeMode} 
									onChange={(e) => setAlternativeMode(e.target.value)}
									className="border-b border-black outline-none w-48 text-center bg-transparent"
									style={{ fontSize: "11px" }}
									placeholder="e.g., Shopping"
								/>
								<span>) OF</span>
								<div className="flex items-center mx-1 font-bold" style={{ fontSize: "11px" }}>
									<span>{numberToWords(tableRows.length)} ({tableRows.length})</span>
								</div>
								<span>APPROVED PURCHASE REQUEST/S"</span>
							</div>
						</div>

						{/* WHEREAS Clauses */}
						<div className="space-y-4 mb-6">
							<div className="flex justify-end items-center print:hidden">
								<button
									type="button"
									onClick={addWhereasClause}
									className="text-blue-600 hover:text-blue-800 text-[10px] flex items-center gap-1 font-bold"
								>
									<RiAddLine size={14} /> Add Whereas
								</button>
							</div>
							
							{whereasClauses.map((clause, cIdx) => (
								<div key={clause.id} className="space-y-1 group/clause relative">
									{clause.lines.map((line, lIdx) => (
										<div key={lIdx} className="group/line relative">
											<div className="flex items-baseline">
												{lIdx === 0 && (
													<span 
														className="absolute left-0 top-0 font-bold pointer-events-none z-10"
														style={{ fontSize: "11px", width: "65px" }}
													>
														WHEREAS,
													</span>
												)}
												<textarea 
													value={line} 
													onChange={(e) => updateWhereasLine(clause.id, lIdx, e.target.value)}
													className="border-b border-black outline-none bg-transparent flex-1 resize-none overflow-hidden min-h-4.5"
													style={{ 
														fontSize: "11px",
														textIndent: lIdx === 0 ? "65px" : "0px",
														width: "100%"
													}}
													placeholder={lIdx === 0 ? "Enter whereas clause content..." : "Enter additional details..."}
													rows={1}
													onInput={(e) => {
														const target = e.target as HTMLTextAreaElement;
														target.style.height = "auto";
														target.style.height = `${target.scrollHeight}px`;
													}}
												/>
												<div className="absolute -right-12 top-0 flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity print:hidden">
													{lIdx === 0 && (
														<button
															type="button"
															onClick={() => addBlankLine(clause.id)}
															className="text-blue-600 hover:text-blue-800"
															title="Add blank line"
														>
															<RiAddLine size={16} />
														</button>
													)}
													{(clause.lines.length > 1 || whereasClauses.length > 1) && (
														<button
															type="button"
															onClick={() => {
																if (lIdx === 0 && clause.lines.length === 1) {
																	removeWhereasClause(clause.id);
																} else {
																	removeWhereasLine(clause.id, lIdx);
																}
															}}
															className="text-red-500 hover:text-red-700"
															title={lIdx === 0 && clause.lines.length === 1 ? "Remove whereas" : "Remove line"}
														>
															<RiCloseLine size={16} />
														</button>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							))}
						</div>

						{/* Items Table */}
						<div className="mb-4">
							<div className="flex justify-end mb-2">
								<button
									type="button"
									onClick={addRow}
									className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 transition"
								>
									<RiAddLine size={14} /> Add Row
								</button>
							</div>
							<table className="w-full border-collapse border border-black text-[10px]">
								<thead>
									<tr>
										<th className="border border-black p-1 text-center w-[15%] font-bold" style={{ fontSize: "10px" }}>PR NUMBER</th>
										<th className="border border-black p-1 text-center w-[15%] font-bold" style={{ fontSize: "10px" }}>DATE</th>
										<th className="border border-black p-1 text-center w-[20%] font-bold" style={{ fontSize: "10px" }}>ESTIMATED COST (Php)</th>
										<th className="border border-black p-1 text-center w-[25%] font-bold" style={{ fontSize: "10px" }}>END USER</th>
										<th className="border border-black p-1 text-center w-[25%] font-bold" style={{ fontSize: "10px" }}>RECOMMENDED PROCUREMENT MODE</th>
									</tr>
								</thead>
								<tbody>
									{tableRows.map((row) => (
										<tr key={row.id} className="h-8">
											<td className="border border-black p-1 text-center">
												<input
													value={row.prNo}
													onChange={(e) => updateRow(row.id, "prNo", e.target.value)}
													className="w-full outline-none text-center bg-transparent"
													style={{ fontSize: "10px" }}
												/>
											</td>
											<td className="border border-black p-1 text-center">
												<input
													value={row.date}
													onChange={(e) => updateRow(row.id, "date", e.target.value)}
													className="w-full outline-none text-center bg-transparent"
													style={{ fontSize: "10px" }}
												/>
											</td>
											<td className="border border-black p-1 text-right">
												<input
													value={row.cost}
													onChange={(e) => updateRow(row.id, "cost", e.target.value)}
													className="w-full outline-none text-right bg-transparent"
													style={{ fontSize: "10px" }}
												/>
											</td>
											<td className="border border-black p-1 text-center">
												<input
													value={row.endUser}
													onChange={(e) => updateRow(row.id, "endUser", e.target.value)}
													className="w-full outline-none text-center bg-transparent"
													style={{ fontSize: "10px" }}
												/>
											</td>
											<td className="border border-black p-1 text-center">
												<input
													value={row.mode}
													onChange={(e) => updateRow(row.id, "mode", e.target.value)}
													className="w-full outline-none text-center bg-transparent"
													style={{ fontSize: "10px" }}
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Attachment note */}
						<div className="mb-6" style={{ fontSize: "10px" }}>
							Please see attached purchase request/s.
						</div>

						{/* RESOLVE section */}
						<div className="mb-6">
							<div className="flex flex-wrap">
								<span style={{ fontSize: "11px", fontWeight: 700 }}>NOW, THEREFORE,</span>
								<span className="ml-1" style={{ fontSize: "11px" }}>we, the members of the Bids and Awards Committee, hereby</span>
								<span style={{ fontSize: "11px", fontWeight: 700, marginLeft: "4px" }}>RESOLVE,</span>
								<span className="ml-1" style={{ fontSize: "11px" }}>as it is hereby</span>
								<span style={{ fontSize: "11px", fontWeight: 700, marginLeft: "4px" }}>RESOLVED,</span>
								<span className="ml-1" style={{ fontSize: "11px" }}>to recommend to the Head of Procuring Entity the procurement of items through SVP method.</span>
							</div>
						</div>

						{/* Resolution location and date */}
						<div className="mb-8">
							<div className="flex flex-wrap items-center">
								<span style={{ fontSize: "11px", fontWeight: 700 }}>RESOLVED</span>
								<span className="ml-1" style={{ fontSize: "11px" }}>at the HL Bldg. Carnation St, Triangulo Naga City, this</span>
								<input 
									value={dateResolved} 
									onChange={(e) => setDateResolved(e.target.value)}
									className="outline-none flex-1 ml-1 bg-transparent"
									style={{ fontSize: "11px" }}
								/>
							</div>
						</div>

						{/* Signatures */}
						<div className="mb-8">
							<div className="text-center mb-6">
								<input 
									value={bacChairperson} 
									onChange={(e) => setBacChairperson(e.target.value)}
									className="w-full outline-none text-center border-b border-black bg-transparent"
									style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}
								/>
								<div style={{ fontSize: "10px" }}>BAC Chairperson</div>
							</div>

							<div className="grid grid-cols-2 gap-8 mb-6">
								<div className="text-center">
									<input 
										value={bacViceChairperson} 
										onChange={(e) => setBacViceChairperson(e.target.value)}
										className="w-full outline-none text-center border-b border-black bg-transparent"
										style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}
									/>
									<div style={{ fontSize: "10px" }}>BAC Vice-Chairperson</div>
								</div>
								<div className="text-center">
									<input 
										value={bacMember1} 
										onChange={(e) => setBacMember1(e.target.value)}
										className="w-full outline-none text-center border-b border-black bg-transparent"
										style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}
									/>
									<div style={{ fontSize: "10px" }}>BAC Member</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-8">
								<div className="text-center">
									<input 
										value={bacMember2} 
										onChange={(e) => setBacMember2(e.target.value)}
										className="w-full outline-none text-center border-b border-black bg-transparent"
										style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}
									/>
									<div style={{ fontSize: "10px" }}>BAC Member</div>
								</div>
								<div className="text-center">
									<input 
										value={bacMember3} 
										onChange={(e) => setBacMember3(e.target.value)}
										className="w-full outline-none text-center border-b border-black bg-transparent"
										style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}
									/>
									<div style={{ fontSize: "10px" }}>BAC Member</div>
								</div>
							</div>
						</div>

						{/* Approved by */}
						<div className="text-center">
							<div style={{ fontSize: "10px" }} className="mb-2">Approved by:</div>
							<input 
								value={hope} 
								onChange={(e) => setHope(e.target.value)}
								className="w-full outline-none text-center border-b border-black bg-transparent"
								style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}
							/>
							<div style={{ fontSize: "10px" }}>HOPE</div>
						</div>

					</div>
				)}
			</div>
		</div>
	);
}
