"use client";

import { useEffect, useState } from "react";
import { RiCloseLine, RiPrinterLine } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { printSummaryReport, type SummaryReportMeta, type StatusStat, type SectionStat, type SummaryReportRow } from "./SummaryReportPrint";

type SummaryReportModalProps = {
	open: boolean;
	onClose: () => void;
};

type PRData = {
	id: number;
	pr_no: string;
	entity_name: string;
	office_section: string;
	status: string;
	status_id: number | null;
	created_at: string;
	updated_at?: string;
	total_cost: number;
	req_name?: string;
	po_no?: string;
	delivery_no?: string;
	supplier?: string;
	purchase_request_items?: Array<{
		description: string;
		quantity: number;
		unit_cost: number;
		subtotal: number;
	}>;
	source?: "pr" | "po" | "delivery" | "payment";
};

function getStatusInfo(status: string | null, statusId?: number | null, source?: string, statusNameById?: Record<number, string>) {
	const exactStatusName = statusId != null ? statusNameById?.[statusId] : undefined;

	if (source === "pr") {
		const prById: Record<number, { name: string; color: string }> = {
			1: { name: "Pending", color: "pending" },
			2: { name: "Processing (Division Head)", color: "processing" },
			3: { name: "Processing (BAC)", color: "processing" },
			4: { name: "Processing (Budget)", color: "processing" },
			5: { name: "Processing (PARPO)", color: "processing" },
			6: { name: "Canvassing (Reception)", color: "canvassing" },
			7: { name: "BAC Resolution", color: "bac" },
			8: { name: "Canvassing (Releasing)", color: "canvassing" },
			9: { name: "Canvassing (Collection)", color: "canvassing" },
			10: { name: "Abstract of Awards", color: "aaa" },
			11: { name: "PO (Creation)", color: "po" },
			12: { name: "PO (Allocation)", color: "po" },
			13: { name: "ORS (Creation)", color: "approved" },
			14: { name: "ORS (Processing)", color: "approved" },
			15: { name: "PO (Accounting)", color: "po" },
			16: { name: "PO (PARPO)", color: "po" },
			17: { name: "PO (Serving)", color: "po" },
			18: { name: "Delivery (Waiting)", color: "delivery" },
			19: { name: "Delivery (Received)", color: "delivery" },
			20: { name: "Delivery (IAR)", color: "delivery" },
			21: { name: "Delivery (IAR Processing)", color: "delivery" },
			22: { name: "Delivery (LOA)", color: "delivery" },
			25: { name: "Delivery (Division Chief)", color: "delivery" },
			26: { name: "Payment (cancelled)", color: "payment" },
			27: { name: "Cancelled", color: "rejected" },
			28: { name: "Payment Pending", color: "payment" },
			29: { name: "Voucher Verification", color: "payment" },
			30: { name: "Accounting Review", color: "payment" },
			32: { name: "PARPO Approval", color: "payment" },
			33: { name: "Completed (PR Phase)", color: "completed" },
			34: { name: "PARPO office signature", color: "payment" },
			35: { name: "Accounting — Tax", color: "payment" },
			36: { name: "Payment completed", color: "completed" },
			37: { name: "Payment Completed", color: "completed" },
		};
		if (statusId != null && prById[statusId]) return prById[statusId];
		return { name: status || "Unknown", color: "default" };
	}

	if (source === "po") {
		const poById: Record<number, { name: string; color: string }> = {
			11: { name: "PO (Creation)", color: "po" },
			12: { name: "PO (Allocation)", color: "po" },
			13: { name: "ORS (Creation)", color: "po" },
			14: { name: "ORS (Processing)", color: "po" },
			15: { name: "PO (Accounting)", color: "po" },
			16: { name: "PO (PARPO)", color: "po" },
			17: { name: "PO (Serving)", color: "po" },
			34: { name: "Completed (PO Phase)", color: "completed" },
		};

		if (statusId != null && poById[statusId]) return poById[statusId];
		return { name: status || "PO", color: "po" };
	}

	const statusById: Record<number, { name: string; color: string }> = {
		1: { name: "Pending", color: "pending" },
		2: { name: "Processing (Division Head)", color: "processing" },
		3: { name: "Processing (BAC)", color: "processing" },
		4: { name: "Processing (Budget)", color: "processing" },
		5: { name: "Processing (PARPO)", color: "processing" },
		6: { name: "Canvassing (Reception)", color: "canvassing" },
		7: { name: "Canvassing (Releasing)", color: "canvassing" },
		8: { name: "Canvassing (Releasing)", color: "canvassing" },
		9: { name: "Canvassing (Collection)", color: "canvassing" },
		10: { name: "Abstract of Awards", color: "aaa" },
		18: { name: "Delivery (Waiting)", color: "delivery" },
		19: { name: "Delivery (Received)", color: "delivery" },
		20: { name: "Delivery (IAR)", color: "delivery" },
		21: { name: "Delivery (IAR Processing)", color: "delivery" },
		22: { name: "Delivery (LOA)", color: "delivery" },
		25: { name: "Delivery (Division Chief)", color: "delivery" },
		26: { name: "Payment", color: "payment" },
		27: { name: "Cancelled", color: "rejected" },
		28: { name: "Payment Pending", color: "payment" },
		29: { name: "Voucher Verification", color: "payment" },
		30: { name: "Accounting Review", color: "payment" },
		32: { name: "PARPO Approval", color: "payment" },
		33: { name: "Forward to Cash", color: "payment" },
		34: { name: "PARPO signature", color: "payment" },
		35: { name: "Tax processing", color: "payment" },
		36: { name: "Completed", color: "completed" },
		37: { name: "Payment Completed", color: "completed" },
	};

	if (statusId != null && statusById[statusId]) {
		return { ...statusById[statusId], name: exactStatusName || statusById[statusId].name };
	}

	if (source === "delivery") return { name: exactStatusName || "Delivery", color: "delivery" };
	if (source === "payment") return { name: exactStatusName || "Payment", color: "payment" };

	return { name: status || "Unknown", color: "default" };
}

const getStatusFilterKey = (statusId: number | null) => {
	switch (statusId) {
		case 1:
			return "pending";
		case 2:
		case 3:
		case 4:
		case 5:
			return "processing";
		case 6:
		case 8:
		case 9:
			return "canvassing";
		case 7:
			return "bac-resolution";
		case 10:
			return "aaa";
		case 11:
		case 12:
		case 15:
		case 16:
		case 17:
			return "po";
		case 13:
		case 14:
			return "ors";
		case 18:
		case 19:
		case 20:
		case 21:
		case 22:
		case 23:
		case 24:
			return "delivery";
		case 25:
		case 26:
		case 27:
			return "cancelled";
		case 28:
		case 29:
		case 30:
		case 31:
		case 32:
			return "payment";
		case 33:
			return "completed-pr";
		case 34:
			return "completed-po";
		case 35:
			return "completed-delivery";
		case 36:
		case 37:
			return "completed";
		default:
			return "all";
	}
};

export default function SummaryReportModal({ open, onClose }: SummaryReportModalProps) {
	const supabase = createClient();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<PRData[]>([]);
	const [statusNameById, setStatusNameById] = useState<Record<number, string>>({});
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [selectedStatus, setSelectedStatus] = useState("all");

	useEffect(() => {
		if (!open) return;

		const fetchData = async () => {
			setLoading(true);
			try {
				const { data: statusData, error: statusError } = await supabase
					.from("status")
					.select("id, status_name")
					.order("id", { ascending: true });

				if (statusError) throw statusError;

				const statusMap = (statusData || []).reduce((acc, status) => {
					acc[status.id] = status.status_name;
					return acc;
				}, {} as Record<number, string>);
				setStatusNameById(statusMap);

				const { data: prData, error: prError } = await supabase
					.from("purchase_requests")
					.select("id, entity_name, pr_no, office_section, status, status_id, created_at, updated_at, total_cost, req_name, purchase_request_items (*)")
					.order("created_at", { ascending: false });

				if (prError) throw prError;

				const { data: poData, error: poError } = await supabase
					.from("purchase_orders")
					.select("id, po_no, pr_no, supplier, office_section, status_id, created_at, updated_at, total_amount")
					.order("created_at", { ascending: false });

				if (poError) throw poError;

				const { data: deliveryData, error: deliveryError } = await supabase
					.from("deliveries")
					.select("id, delivery_no, po_no, supplier, office_section, status_id, created_at, updated_at")
					.order("created_at", { ascending: false });

				if (deliveryError) throw deliveryError;

				const processedPRs = (prData || []).map(pr => ({
					...pr,
					source: "pr" as const,
				}));

				const processedPOs = (poData || []).map((po) => ({
					id: po.id,
					entity_name: po.supplier || "Unknown Supplier",
					pr_no: po.po_no || po.pr_no || "Unknown",
					office_section: po.office_section || "Unassigned",
					status: "PO",
					status_id: po.status_id,
					created_at: po.created_at,
					updated_at: po.updated_at,
					total_cost: Number(po.total_amount ?? 0),
					purchase_request_items: [],
					source: "po" as const,
					supplier: po.supplier,
				}));

				const processedDeliveries = (deliveryData || []).map(delivery => {
					const isPaymentPhase = [26, 27, 29, 30, 32, 33, 34, 35, 36, 37].includes(delivery.status_id);
					const isDeliveryPhase = [18, 19, 20, 21, 22, 23, 25].includes(delivery.status_id);
					const isCompletedDelivery = delivery.status_id === 28; // Payment Pending = completed delivery phase

					let statusText = "Unknown";
					let source: "delivery" | "payment" = "delivery";

					if (isPaymentPhase) {
						statusText = "Payment";
						source = "payment";
					} else if (isCompletedDelivery) {
						statusText = "Completed";
						source = "delivery";
					} else if (isDeliveryPhase) {
						statusText = "Delivery";
						source = "delivery";
					}

					return {
						id: delivery.id,
						entity_name: delivery.supplier || "Unknown Supplier",
						pr_no: delivery.po_no || delivery.delivery_no || "Unknown",
						office_section: delivery.office_section || "Unassigned",
						status: statusText,
						status_id: delivery.status_id,
						created_at: delivery.created_at,
						updated_at: delivery.updated_at,
						total_cost: 0,
						purchase_request_items: [],
						source,
						delivery_no: delivery.delivery_no,
						supplier: delivery.supplier,
					};
				});

				const allData = [...processedPRs, ...processedPOs, ...processedDeliveries];
				const filteredByYear = allData.filter(item => new Date(item.created_at).getFullYear() === selectedYear);

				const filteredData = selectedStatus === "all"
					? filteredByYear
					: filteredByYear.filter(item => getStatusFilterKey(item.status_id) === selectedStatus);

				filteredData.sort((a, b) => {
					const sectionA = a.office_section || "Unassigned";
					const sectionB = b.office_section || "Unassigned";
					return sectionA.localeCompare(sectionB);
				});

				setData(filteredData as PRData[]);
			} catch (error) {
				console.error("Error fetching summary data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [open, selectedYear, selectedStatus, supabase]);

	const handlePrint = () => {
		const meta: SummaryReportMeta = {
			reportYear: selectedYear.toString(),
			generatedDate: new Date().toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
			totalRecords: data.length,
			totalBudget: data.reduce((sum, item) => sum + (item.total_cost || 0), 0),
		};

		const statusStats: StatusStat[] = Object.entries(
			data.reduce((acc, item) => {
				const statusInfo = getStatusInfo(item.status || "", item.status_id, item.source, statusNameById);
				const displayStatusName = (item.source === "pr" || item.source === "po")
					? statusInfo.name
					: (item.status_id != null ? statusNameById[item.status_id] : null) ?? statusInfo.name;
				
				const source = item.source || "unknown";
				const statusKey = `${displayStatusName} (${source.toUpperCase()})`;
				acc[statusKey] = (acc[statusKey] || 0) + 1;
				return acc;
			}, {} as Record<string, number>)
		).map(([status, count]) => ({
			status,
			count,
			color: "default",
		}));

		const sectionStats: SectionStat[] = Object.entries(
			data.reduce((acc, item) => {
				const section = item.office_section || "Unassigned";
				acc[section] = (acc[section] || 0) + 1;
				return acc;
			}, {} as Record<string, number>)
		).map(([section, count]) => ({
			section,
			count,
		}));

		const reportRows: SummaryReportRow[] = data.map(item => {
			const { name: statusName } = getStatusInfo(item.status || "", item.status_id, item.source, statusNameById);
			const displayStatusName = (item.source === "pr" || item.source === "po")
				? statusName
				: (item.status_id != null ? statusNameById[item.status_id] : null) ?? statusName;

			return {
				prNo: item.pr_no || "Unknown",
				section: item.office_section || "Unassigned",
				entityName: item.entity_name || "Unknown",
				date: item.created_at ? new Date(item.created_at).toLocaleDateString() : "Unknown",
				status: displayStatusName,
				cost: `₱${(item.total_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
			};
		});

		printSummaryReport(meta, statusStats, sectionStats, reportRows);
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-6">
			<div className="flex min-h-full items-center justify-center">
				<div className="relative w-full max-w-6xl bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10">
					<div className="absolute right-4 top-4 z-20 flex gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-100"
							aria-label="Print report"
							title="Print"
						>
							<RiPrinterLine size={20} />
						</button>
						<button
							type="button"
							onClick={onClose}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-100"
							aria-label="Close report"
							title="Close"
						>
							<RiCloseLine size={20} />
						</button>
					</div>

					<div className="max-h-[85vh] overflow-y-auto p-8">
						{loading ? (
							<div className="flex h-96 items-center justify-center">
								<div className="text-gray-500">Loading report data...</div>
							</div>
						) : (
							<div className="text-black" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
								<div className="mb-2 flex items-start justify-between">
									<div />
									<div className="flex flex-1 items-start justify-center gap-3">
										<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" className="h-14 w-14 object-contain" />
										<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" className="h-14 w-14 object-contain" />
										<div className="pt-1 text-center">
											<div style={{ fontSize: "11px", fontWeight: 700 }}>REPUBLIC OF THE PHILIPPINES</div>
											<div style={{ fontSize: "11px", fontWeight: 700 }}>DEPARTMENT OF AGRARIAN REFORM</div>
											<div style={{ fontSize: "10px", fontWeight: 400, fontStyle: "italic" }}>Tunay na Pagbabago sa Repormang Agraryo</div>
										</div>
										<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO Certified" className="h-14 w-14 rounded object-contain" />
										<div className="invisible h-14 w-14 shrink-0" aria-hidden="true" />
									</div>
									<div />
								</div>

								

								<div className="mb-6 text-center">
									<div style={{ fontSize: "14px", fontWeight: 700 }}>PROCUREMENT SUMMARY REPORT</div>
									<div style={{ fontSize: "12px" }}>Fiscal Year {selectedYear}</div>
									<div style={{ fontSize: "10px", color: "#666" }}>
										Generated on {new Date().toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</div>
								</div>

								<div className="mb-6 flex gap-4">
									<select
										value={selectedYear}
										onChange={(e) => setSelectedYear(Number(e.target.value))}
										className="rounded border border-gray-300 px-3 py-2"
									>
										{Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
											<option key={year} value={year}>{year}</option>
										))}
									</select>
									<select
										value={selectedStatus}
										onChange={(e) => setSelectedStatus(e.target.value)}
										className="rounded border border-gray-300 px-3 py-2"
									>
										<option value="all">All Statuses</option>
										<option value="pending">Pending</option>
										<option value="processing">Processing</option>
										<option value="canvassing">Canvassing</option>
										<option value="bac-resolution">BAC Resolution</option>
										<option value="aaa">Abstract of Awards</option>
										<option value="po">PO</option>
										<option value="ors">ORS</option>
										<option value="delivery">Delivery</option>
										<option value="cancelled">Cancelled</option>
										<option value="payment">Payment Phase</option>
										<option value="completed-pr">Completed PR Phase</option>
										<option value="completed-po">Completed PO Phase</option>
										<option value="completed-delivery">Completed Delivery Phase</option>
										<option value="completed">Completed Payment Phase</option>
									</select>
								</div>

								<div className="mb-8 grid grid-cols-3 gap-4">
									<div className="border border-gray-300 p-4 text-center">
										<div className="text-2xl font-bold text-blue-600">{data.length}</div>
										<div className="text-sm text-gray-600">Total Records</div>
									</div>
									<div className="border border-gray-300 p-4 text-center">
										<div className="text-2xl font-bold text-green-600">
											₱{data.reduce((sum, item) => sum + (item.total_cost || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
										</div>
										<div className="text-sm text-gray-600">Total Budget</div>
									</div>
									<div className="border border-gray-300 p-4 text-center">
										<div className="text-2xl font-bold text-purple-600">{new Set(data.map(item => item.office_section || "Unassigned")).size}</div>
										<div className="text-sm text-gray-600">Sections</div>
									</div>
								</div>

								<div className="mb-8">
									<h2 className="mb-4 text-lg font-bold">Status Breakdown</h2>
									<div className="grid grid-cols-2 gap-4">
										{Object.entries(
											data.reduce((acc, item) => {
												const { name: statusName } = getStatusInfo(item.status || "", item.status_id, item.source, statusNameById);
												const displayStatusName = (item.source === "pr" || item.source === "po")
													? statusName
													: (item.status_id != null ? statusNameById[item.status_id] : null) ?? statusName;
												acc[displayStatusName] = (acc[displayStatusName] || 0) + 1;
												return acc;
											}, {} as Record<string, number>)
										).map(([status, count]) => (
											<div key={status} className="flex justify-between border-b border-gray-200 pb-2">
												<span>{status}</span>
												<span className="font-semibold">{count}</span>
											</div>
										))}
									</div>
								</div>

								<div className="mb-8">
									<h2 className="mb-4 text-lg font-bold">Section Breakdown</h2>
									<div className="grid grid-cols-2 gap-4">
										{Object.entries(
											data.reduce((acc, item) => {
												const section = item.office_section || "Unassigned";
												acc[section] = (acc[section] || 0) + 1;
												return acc;
											}, {} as Record<string, number>)
										).map(([section, count]) => (
											<div key={section} className="flex justify-between border-b border-gray-200 pb-2">
												<span>{section}</span>
												<span className="font-semibold">{count}</span>
											</div>
										))}
									</div>
								</div>

								<div>
									<h2 className="mb-4 text-lg font-bold">Detailed Records</h2>
									<table className="w-full border-collapse border border-gray-300 text-sm">
										<thead>
											<tr className="bg-gray-100">
												<th className="border border-gray-300 p-2 text-left">PR/PO #</th>
												<th className="border border-gray-300 p-2 text-left">Section</th>
												<th className="border border-gray-300 p-2 text-left">Date</th>
												<th className="border border-gray-300 p-2 text-left">Status</th>
												<th className="border border-gray-300 p-2 text-right">Cost</th>
											</tr>
										</thead>
										<tbody>
											{data.map((item) => {
												const { name: statusName } = getStatusInfo(item.status || "", item.status_id, item.source, statusNameById);
												const displayStatusName = (item.source === "pr" || item.source === "po")
													? statusName
													: (item.status_id != null ? statusNameById[item.status_id] : null) ?? statusName;
												return (
													<tr key={`${item.source}-${item.id}`}>
														<td className="border border-gray-300 p-2">{item.pr_no}</td>
														<td className="border border-gray-300 p-2">{item.office_section}</td>
														<td className="border border-gray-300 p-2">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "Unknown"}</td>
														<td className="border border-gray-300 p-2">{displayStatusName}</td>
														<td className="border border-gray-300 p-2 text-right">₱{(item.total_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
