"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import ViewPRModal from "@/components/Viewprmodal";
import CanvassLivePreview from "@/components/Canvassing/CanvassLivePreview";
import BACRESO from "@/components/BACResolution/BACRESO";
import LivePreview from "@/components/test/livePreview";
import { RiArchiveLine, RiSearchLine, RiCalendarLine, RiCloseLine, RiCheckLine } from "react-icons/ri";
import { buildPurchaseOrderPrintHtml, type POPrintData } from "@/utils/print/POPrintBuilder";
import { buildORSPrintHtml, type ORSPrintData } from "@/utils/print/ORSPrintBuilder";
import { buildContractPrintHtml, type ContractPrintData } from "@/utils/print/ContractPrintBuilder";
import { printWithIframe } from "@/utils/print/printUtils";

type PRRow = {
	id: number;
	pr_no: string;
	office_section: string;
	created_at: string;
	status_id?: number | null;
};

type PreviewType = "canvass" | "bacreso" | "live" | null;

type POInfo = {
	poId: number;
	poNo: string;
	hasOrs: boolean;
	hasContract: boolean;
};

type CurrentUser = {
	fullname: string;
	role_id: number;
};

export default function FilesPage() {
	const router = useRouter();
	const supabase = useMemo(() => createClient(), []);

	const [rows, setRows] = useState<PRRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [dateSortDir, setDateSortDir] = useState<"asc" | "desc">("desc");
	const PAGE_SIZE = 10;
	const CURRENT_YEAR = new Date().getFullYear();
	const [fiscalYear, setFiscalYear] = useState(CURRENT_YEAR);
	const [showYearPicker, setShowYearPicker] = useState(false);
	const yearOptions = useMemo(() => {
		const years: number[] = [];
		for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 5; y--) years.push(y);
		return years;
	}, [CURRENT_YEAR]);

	const [viewPrId, setViewPrId] = useState<number | null>(null);
	const [selectedPrNo, setSelectedPrNo] = useState("");
	const [openPreview, setOpenPreview] = useState<PreviewType>(null);
	const [roleChecked, setRoleChecked] = useState(false);
	const [authorized, setAuthorized] = useState(false);
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
	const [poMap, setPoMap] = useState<Record<string, POInfo[]>>({});

	useEffect(() => {
		const storedUser = localStorage.getItem("currentUser");
		if (!storedUser) {
			router.replace("/");
			setRoleChecked(true);
			return;
		}

		try {
			const user = JSON.parse(storedUser) as { role_id?: number };
			setCurrentUser(user as CurrentUser);
			if (user?.role_id === 1 || user?.role_id === 2 || user?.role_id === 3 || user?.role_id === 5) {
				setAuthorized(true);
			} else {
				router.replace("/Dashboard");
			}
		} catch {
			router.replace("/");
		} finally {
			setRoleChecked(true);
		}
	}, [router]);

	useEffect(() => {
		if (!authorized) return;

		const fetchPurchaseRequests = async () => {
			setLoading(true);
			try {
				const { data, error } = await supabase
					.from("purchase_requests")
					.select("id, pr_no, office_section, created_at, status_id")
					.eq("status_id", 37)
					.order("created_at", { ascending: false });

				if (error) throw error;

				const mappedRows = (data || [])
					.filter((row) => !!row.pr_no)
					.map((row) => ({
						id: row.id as number,
						pr_no: row.pr_no as string,
						office_section: (row.office_section as string) || "N/A",
						created_at: (row.created_at as string) || "",
						status_id: (row.status_id as number) ?? null,
					}));

				setRows(mappedRows);
			} catch (error) {
				console.error("Error loading purchase requests:", error);
				setRows([]);
			} finally {
				setLoading(false);
			}
		};

		void fetchPurchaseRequests();
	}, [authorized, supabase]);

	// Fetch PO/ORS/Contract associations for each PR
	useEffect(() => {
		if (!authorized || rows.length === 0) return;

		const fetchAssociations = async () => {
			try {
				const prNos = rows.map((r) => r.pr_no);

				const [poResult, orsResult] = await Promise.all([
					supabase.from("purchase_orders").select("id, po_no, pr_no").in("pr_no", prNos),
					supabase.from("ors_entries").select("id, pr_no").in("pr_no", prNos),
				]);

				if (poResult.error) throw poResult.error;
				if (orsResult.error) throw orsResult.error;

				const posByPrNo: Record<string, { id: number; poNo: string }[]> = {};
				for (const po of poResult.data || []) {
					const prNo = po.pr_no as string;
					if (!posByPrNo[prNo]) posByPrNo[prNo] = [];
					posByPrNo[prNo].push({ id: po.id as number, poNo: (po.po_no as string) || "" });
				}

				const orsExistsByPrNo = new Set<string>();
				for (const ors of orsResult.data || []) {
					if (ors.pr_no) orsExistsByPrNo.add(ors.pr_no as string);
				}

				const allPoIds = (poResult.data || []).map((p) => p.id as number);
				const contractPoIds = new Set<number>();
				if (allPoIds.length > 0) {
					const { data: contractData } = await supabase
						.from("contract_documents")
						.select("po_id")
						.in("po_id", allPoIds);
					for (const c of contractData || []) contractPoIds.add(c.po_id as number);
				}

				const map: Record<string, POInfo[]> = {};
				for (const [prNo, pos] of Object.entries(posByPrNo)) {
					map[prNo] = pos.map((po) => ({
						poId: po.id,
						poNo: po.poNo,
						hasOrs: orsExistsByPrNo.has(prNo),
						hasContract: contractPoIds.has(po.id),
					}));
				}
				setPoMap(map);
			} catch (error) {
				console.error("Error loading PO associations:", error);
			}
		};

		void fetchAssociations();
	}, [authorized, rows, supabase]);

	const openByType = (prNo: string, type: Exclude<PreviewType, null>) => {
		setSelectedPrNo(prNo);
		setOpenPreview(type);
	};

	const closePreviews = () => {
		setOpenPreview(null);
		setSelectedPrNo("");
	};

	const handlePrintPO = useCallback(async (prNo: string) => {
		try {
			const poInfos = poMap[prNo];
			if (!poInfos?.length) return;
			const poInfo = poInfos[0];

			const [headerRes, itemsRes] = await Promise.all([
				supabase.from("purchase_orders").select("*").eq("id", poInfo.poId).single(),
				supabase.from("purchase_order_items").select("*").eq("po_id", poInfo.poId),
			]);
			if (headerRes.error || !headerRes.data) throw headerRes.error;
			if (itemsRes.error) throw itemsRes.error;

			const h = headerRes.data;
			const printData: POPrintData = {
				poNo: h.po_no || "", prNo: h.pr_no, supplier: h.supplier || "",
				address: h.address || "", tin: h.tin || "",
				procurementMode: h.procurement_mode || "",
				deliveryPlace: h.delivery_place || "", deliveryTerm: h.delivery_term || "",
				deliveryDate: h.delivery_date || "", paymentTerm: h.payment_term || "",
				fundCluster: h.fund_cluster || "",
				items: (itemsRes.data || []).map((i: any) => ({
					stock_no: i.stock_no, unit: i.unit, description: i.description,
					quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal,
				})),
				poDate: h.date, createdAt: h.created_at,
				officialName: h.official_name, officialDesig: h.official_desig,
				conformeDate: h.conforme_date,
				accountantName: h.accountant_name, accountantDesig: h.accountant_desig,
				orsNo: h.ors_no, orsDate: h.ors_date,
				fundsAvailable: h.funds_available, orsAmount: h.ors_amount,
				hideTotalRow: h.hide_total_row,
			};
			printWithIframe(buildPurchaseOrderPrintHtml(printData));
		} catch (err) { console.error("Error printing PO:", err); }
	}, [poMap, supabase]);

	const handlePrintORS = useCallback(async (prNo: string) => {
		try {
			const { data: ors, error } = await supabase
				.from("ors_entries").select("*").eq("pr_no", prNo)
				.order("created_at", { ascending: false }).limit(1).maybeSingle();
			if (error) throw error;
			if (!ors) return;

			const printData: ORSPrintData = {
				orsNo: ors.ors_no, orsDate: ors.date_created,
				entityName: ors.entity_name, payee: ors.payee,
				payeeAddress: ors.payee_address, office: ors.office,
				fundCluster: ors.fund_cluster,
				responsibilityCenter: ors.responsibility_center,
				particulars: ors.particulars, mfoPap: ors.mfo_pap,
				uacsCode: ors.uacs_code, amount: ors.amount,
				referenceNo: ors.reference_no,
				obligationAmount: ors.obligation_amount,
				payableAmount: ors.payable_amount,
				paymentAmount: ors.payment_amount,
				notYetDueBalance: ors.not_yet_due_balance,
				dueDemandableBalance: ors.due_demandable_balance,
				preparedByName: ors.prepared_by_name,
				preparedByDesig: ors.prepared_by_desig,
				certifiedByName: ors.certified_by_name,
				certifiedByDesig: ors.certified_by_desig,
				preparedByDate: ors.prepared_by_date,
				certifiedByDate: ors.certified_by_date,
				sectionCParticulars: ors.section_c_particulars,
				blankStatusSection: ors.blank_status_section,
			};
			printWithIframe(buildORSPrintHtml(printData));
		} catch (err) { console.error("Error printing ORS:", err); }
	}, [supabase]);

	const handlePrintContract = useCallback(async (prNo: string) => {
		try {
			const poInfos = poMap[prNo];
			const poInfo = poInfos?.find((p) => p.hasContract);
			if (!poInfo) return;

			const { data: doc, error } = await supabase
				.from("contract_documents").select("*").eq("po_id", poInfo.poId)
				.order("created_at", { ascending: false }).limit(1).maybeSingle();
			if (error) throw error;
			if (!doc) return;

			const printData: ContractPrintData = {
				contractTitle: doc.contract_title || "CONTRACT FOR SERVICES",
				firstPartyAgency: doc.first_party_agency || "",
				firstPartyRep: doc.first_party_rep || "",
				firstPartyOffice: doc.first_party_office || "",
				firstPartyCity: doc.first_party_city || "",
				secondPartyName: doc.second_party_name || "",
				secondPartyRep: doc.second_party_rep || "",
				secondPartyCity: doc.second_party_city || "",
				commencementLocation: doc.commencement_location || "",
				considerationAmount: doc.consideration_amount || 0,
				considerationAmountWords: doc.consideration_amount_words || "",
				serviceDescription: doc.service_description || "",
				deliveryLocation: doc.delivery_location || "",
				paymentCondition: doc.payment_condition || "",
				jobOrderDescription: doc.job_order_description || "",
				scheduledDays: doc.scheduled_days || "",
				liquidatedDamagesRate: doc.liquidated_damages_rate || "",
				contractDate: doc.contract_date || "",
				commencementDate: doc.commencement_date || "",
				witnessOne: doc.witness_one || "",
				witnessTwo: doc.witness_two || "",
			};
			printWithIframe(buildContractPrintHtml(printData));
		} catch (err) { console.error("Error printing Contract:", err); }
	}, [poMap, supabase]);

	const filteredRows = useMemo(() => {
		const term = search.trim().toLowerCase();
		return rows.filter(
			(row) =>
				(!row.created_at || new Date(row.created_at).getFullYear() === fiscalYear) &&
				(
					!term ||
					row.pr_no.toLowerCase().includes(term) ||
					(row.office_section || "").toLowerCase().includes(term)
				)
		);
	}, [rows, search, fiscalYear]);

	const sortedRows = useMemo(() => {
		return [...filteredRows].sort((a, b) => {
			const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
			const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
			return dateSortDir === "asc" ? aTime - bTime : bTime - aTime;
		});
	}, [filteredRows, dateSortDir]);

	useEffect(() => {
		setCurrentPage(1);
	}, [search]);

	const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
	const safePage = Math.min(currentPage, totalPages);
	const startIndex = (safePage - 1) * PAGE_SIZE;
	const paginatedRows = sortedRows.slice(startIndex, startIndex + PAGE_SIZE);
	const shownCount = paginatedRows.length;
	const firstItem = sortedRows.length === 0 ? 0 : startIndex + 1;
	const lastItem = sortedRows.length === 0 ? 0 : startIndex + shownCount;

	const formatDate = (value: string) => {
		if (!value) return "N/A";
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return parsed.toLocaleDateString("en-PH", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	if (!roleChecked || !authorized) {
		return null;
	}

	return (
		<AuthGuard>
			<main className="min-h-screen bg-gray-100 text-gray-900 font-[family-name:var(--font-sora)]">
				<div className="w-full px-4 py-4 sm:p-6 space-y-4 md:space-y-6">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-1">Procurement Archive</p>
							<h1 className="text-3xl font-bold text-gray-900">Files Preview Table</h1>
							<p className="mt-1 text-sm text-gray-400">
								Select a PR number and open any preview document.
							</p>
							{currentUser && (
								<p className="text-sm text-gray-400 mt-1">
									Signed in as <span className="text-gray-700 font-semibold">{currentUser.fullname}</span>
								</p>
							)}
						</div>
						<div className="flex items-center gap-3">
							<Link
								href="/Procurement/Archive"
								className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-amber-400 hover:text-amber-700"
							>
								<RiArchiveLine size={16} className="text-amber-600" />
								<span>Archive</span>
							</Link>
							<button
								onClick={() => setShowYearPicker(true)}
								className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-emerald-400 hover:text-emerald-700"
							>
								<RiCalendarLine size={16} className="text-emerald-600" />
								<span>FY {fiscalYear}</span>
							</button>
						</div>
					</div>

					<div className="mx-auto w-full max-w-6xl rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
						<div className="border-b border-gray-200 px-6 py-4">
							<div className="relative max-w-sm">
								<input
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search PR number or section..."
									className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
								/>
								<RiSearchLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
							</div>
							<p className="mt-3 text-sm text-gray-600">
								Showing {firstItem}-{lastItem} of {filteredRows.length} PRs ({shownCount} on this page)
							</p>
						</div>

						<div className="overflow-x-auto">
						<table className="min-w-full">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
										PR Number
									</th>
									<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
										Section
									</th>
									<th
										onClick={() => {
											setDateSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
											setCurrentPage(1);
										}}
										className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 cursor-pointer select-none"
									>
										Creation Date {dateSortDir === "asc" ? "↑" : "↓"}
									</th>
									<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
										Preview Buttons
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{loading ? (
									<tr>
										<td colSpan={4} className="px-6 py-8 text-sm text-gray-500">
											Loading purchase requests...
										</td>
									</tr>
								) : filteredRows.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-6 py-8 text-sm text-gray-500">
											No matching PR number found.
										</td>
									</tr>
								) : (
									paginatedRows.map((row) => {
										// Determine if PR is still a draft (not processed by BAC yet)
										const isDraftPR = row.pr_no?.startsWith("PR-DRAFT-") || (row.status_id != null && row.status_id < 4);
										const displayPrNo = isDraftPR ? "" : row.pr_no;
										
										return (
										<tr key={row.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 text-sm font-medium text-gray-900">{displayPrNo}</td>
											<td className="px-6 py-4 text-sm text-gray-700">{row.office_section}</td>
											<td className="px-6 py-4 text-sm text-gray-700">{formatDate(row.created_at)}</td>
											<td className="px-6 py-4">
												<div className="flex flex-wrap gap-2">
													<button
														onClick={() => setViewPrId(row.id)}
														className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
													>
														PR
													</button>
													<button
														onClick={() => openByType(row.pr_no, "canvass")}
														className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
													>
														Canvass
													</button>
													<button
														onClick={() => openByType(row.pr_no, "bacreso")}
														className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
													>
														Resolution
													</button>
													<button
														onClick={() => openByType(row.pr_no, "live")}
														className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
													>
														AOA
													</button>
													{poMap[row.pr_no]?.length > 0 && (
														<button
															onClick={() => handlePrintPO(row.pr_no)}
															className="rounded-md border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
														>
															PO
														</button>
													)}
													{poMap[row.pr_no]?.some((p) => p.hasOrs) && (
														<button
															onClick={() => handlePrintORS(row.pr_no)}
															className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
														>
															ORS
														</button>
													)}
													{poMap[row.pr_no]?.some((p) => p.hasContract) && (
														<button
															onClick={() => handlePrintContract(row.pr_no)}
															className="rounded-md border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
														>
															Contract
														</button>
													)}
												</div>
											</td>
										</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

						{!loading && filteredRows.length > 0 && (
							<div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
							<p className="text-sm text-gray-600">
								Page {safePage} of {totalPages}
							</p>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={safePage === 1}
									className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Previous
								</button>
								<button
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={safePage === totalPages}
									className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</div>
						)}
					</div>

					{viewPrId !== null && (
						<ViewPRModal prId={viewPrId} onClose={() => setViewPrId(null)} onEdit={() => {}} />
					)}

					{showYearPicker && (
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
							<div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 transform scale-100 transition-transform">
								<div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
									<div className="flex items-center gap-2.5">
										<RiCalendarLine size={20} className="text-emerald-600" />
										<h3 className="text-lg font-bold text-gray-900 mt-0.5">Fiscal Year</h3>
									</div>
									<button onClick={() => setShowYearPicker(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
										<RiCloseLine size={22} className="text-gray-500" />
									</button>
								</div>
								<div className="max-h-72 overflow-y-auto py-2">
									{yearOptions.map((year) => (
										<button
											key={year}
											onClick={() => { setFiscalYear(year); setShowYearPicker(false); setCurrentPage(1); }}
											className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${fiscalYear === year ? "bg-emerald-50" : "hover:bg-gray-50"}`}
										>
											<span className={`font-semibold ${fiscalYear === year ? "text-emerald-700" : "text-gray-700"}`}>FY {year}</span>
											{fiscalYear === year && <RiCheckLine size={18} className="text-emerald-600" />}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

					<CanvassLivePreview
						open={openPreview === "canvass"}
						onClose={closePreviews}
						prNo={selectedPrNo}
					/>

					<BACRESO open={openPreview === "bacreso"} onClose={closePreviews} prNo={selectedPrNo} />

					<LivePreview open={openPreview === "live"} onClose={closePreviews} prNo={selectedPrNo} />
				</div>
			</main>
		</AuthGuard>
	);
}
