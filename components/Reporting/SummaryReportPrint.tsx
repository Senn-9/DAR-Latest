export type SummaryReportMeta = {
	reportYear: string;
	generatedDate: string;
	totalRecords: number;
	totalBudget: number;
};

export type StatusStat = {
	status: string;
	count: number;
	color: string;
};

export type SectionStat = {
	section: string;
	count: number;
};

export type SummaryReportRow = {
	prNo: string;
	section: string;
	date: string;
	status: string;
	cost: string;
};

function escapeHtml(str: string): string {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function getStatusInfo(status: string | null, statusId?: number | null, source?: string): { name: string; color: string } {
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

	if (statusId != null && statusById[statusId]) return statusById[statusId];

	if (source === "delivery") return { name: "Delivery", color: "delivery" };
	if (source === "payment") return { name: "Payment", color: "payment" };

	return { name: status || "Unknown", color: "default" };
}

export function buildSummaryReportHtml(
	meta: SummaryReportMeta,
	statusStats: StatusStat[],
	sectionStats: SectionStat[],
	reportRows: SummaryReportRow[]
) {
	const normalizedStatus = (status: string) => status.replace(/\s*\((PR|PO|PAYMENT|DELIVERY)\)$/i, "");

	const derivedStatusStats = Object.entries(
		reportRows.reduce((acc, row) => {
			const key = normalizedStatus(row.status) || "Unknown";
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {} as Record<string, number>)
	).map(([status, count]) => ({
		status,
		count,
		color: "default",
	}));

	const derivedSectionStats = Object.entries(
		reportRows.reduce((acc, row) => {
			const key = row.section || "Unassigned";
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {} as Record<string, number>)
	).map(([section, count]) => ({
		section,
		count,
	}));

	const summaryCardsHtml = `
		<div class="summary-cards">
			<div class="summary-card">
				<div class="value">${escapeHtml(meta.totalRecords.toString())}</div>
				<div class="label">Total Records</div>
			</div>
			<div class="summary-card">
				<div class="value">₱${escapeHtml(meta.totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</div>
				<div class="label">Total Budget</div>
			</div>
			<div class="summary-card">
				<div class="value">${escapeHtml(sectionStats.length.toString())}</div>
				<div class="label">Sections</div>
			</div>
		</div>`;

	const statusBreakdownHtml = `
		<div class="section-block">
			<h2>Status Breakdown</h2>
			<div class="stats-grid">
				${derivedStatusStats.map(stat => `
					<div class="stat-item">
						<span class="stat-label">${escapeHtml(stat.status)}</span>
						<span class="stat-value">${escapeHtml(stat.count.toString())}</span>
					</div>
				`).join("")}
			</div>
		</div>`;

	const sectionBreakdownHtml = `
		<div class="section-block">
			<h2>Section Breakdown</h2>
			<div class="stats-grid">
				${derivedSectionStats.map(stat => `
					<div class="stat-item">
						<span class="stat-label">${escapeHtml(stat.section)}</span>
						<span class="stat-value">${escapeHtml(stat.count.toString())}</span>
					</div>
				`).join("")}
			</div>
		</div>`;

	const detailedRowsHtml = reportRows.map(row => `
		<tr>
			<td>${escapeHtml(row.prNo)}</td>
			<td>${escapeHtml(row.section)}</td>
			<td>${escapeHtml(row.date)}</td>
			<td>${escapeHtml(row.status)}</td>
			<td class="text-right">${escapeHtml(row.cost)}</td>
		</tr>
	`).join("");

	const allPagesHtml = `
		<div class="page">
			${generateHeader(meta, true)}
			<div class="page-content">
				${summaryCardsHtml}
				${statusBreakdownHtml}
				${sectionBreakdownHtml}
				<div class="section-block">
					<h2>Detailed Records</h2>
					<table>
						<thead>
							<tr>
								<th>PR/PO #</th>
								<th>Section</th>
								<th>Date</th>
								<th>Status</th>
								<th class="text-right">Cost</th>
							</tr>
						</thead>
						<tbody>
							${detailedRowsHtml}
						</tbody>
					</table>
				</div>
			</div>
		</div>`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Procurement Summary Report</title>
	<style>
		@page {
			size: A4;
			margin: 0.5in;
		}
		body {
			font-family: Arial, sans-serif;
			font-size: 11px;
			line-height: 1.4;
			margin: 0;
			padding: 0;
			color: #000;
			background: #fff;
		}
		.page {
			max-width: 1120px;
			margin: 0 auto;
			padding: 24px;
		}
		.page-header {
			text-align: center;
			margin-bottom: 18px;
			page-break-inside: avoid;
		}
		.logos {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 12px;
			margin-bottom: 8px;
		}
		.logos img {
			height: 56px;
			width: 56px;
			object-fit: contain;
		}
		.logos .spacer {
			width: 56px;
			height: 56px;
		}
		.gov-header {
			text-align: center;
			margin: 0 68px;
		}
		.gov-header .republic {
			font-size: 11px;
			font-weight: 700;
			margin: 0;
		}
		.gov-header .department {
			font-size: 11px;
			font-weight: 700;
			margin: 0;
		}
		.gov-header .tagline {
			font-size: 10px;
			font-weight: 400;
			font-style: italic;
			margin: 0;
		}
		.committee {
			text-align: center;
			margin-bottom: 16px;
		}
		.committee .committee-name {
			font-size: 10px;
			margin: 0;
		}
		.committee .office {
			font-size: 10px;
			font-weight: 700;
			margin: 0;
		}
		.report-title {
			text-align: center;
			margin-bottom: 18px;
		}
		.report-title h1 {
			font-size: 14px;
			font-weight: 700;
			margin: 0 0 4px 0;
		}
		.report-title .fiscal-year {
			font-size: 12px;
			margin: 0 0 2px 0;
		}
		.report-title .generated-date {
			font-size: 10px;
			color: #666;
			margin: 0;
		}
		.page-content {
			display: flex;
			flex-direction: column;
			gap: 18px;
		}
		.summary-cards {
			display: flex;
			justify-content: space-between;
			gap: 10px;
		}
		.summary-card {
			border: 1px solid #d1d5db;
			padding: 14px 10px;
			text-align: center;
			flex: 1;
			background: #fff;
		}
		.summary-card .value {
			font-size: 18px;
			font-weight: bold;
			margin-bottom: 2px;
		}
		.summary-card .label {
			font-size: 10px;
			color: #666;
		}
		.section-block h2 {
			font-size: 18px;
			font-weight: 700;
			margin: 0 0 12px 0;
		}
		.section-title {
			font-size: 14px;
			font-weight: bold;
			margin-bottom: 10px;
			border-bottom: 1px solid #000;
			padding-bottom: 5px;
		}
		.stats-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 14px 18px;
		}
		.stat-item {
			display: flex;
			justify-content: space-between;
			padding: 3px 0;
			border-bottom: 1px solid #e5e7eb;
		}
		.stat-label {
			font-weight: normal;
		}
		.stat-value {
			font-weight: bold;
		}
		.section-block {
			page-break-inside: avoid;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 4px;
		}
		th, td {
			border: 1px solid #d1d5db;
			padding: 5px;
			text-align: left;
			font-size: 10px;
		}
		th {
			background-color: #f3f4f6;
			font-weight: bold;
		}
		.text-right {
			text-align: right;
		}
		.text-center {
			text-align: center;
		}
		@media print {
			.page-header {
				page-break-inside: avoid;
			}
			.summary-cards, .stats-grid, table, .section-block {
				page-break-inside: avoid;
			}
			tr {
				page-break-inside: avoid;
			}
		}
	</style>
</head>
<body>
	${allPagesHtml}
</body>
</html>`;

	return html;
}

function generateHeader(meta: SummaryReportMeta, showTitle: boolean = true): string {
	return `
		<div class="page-header">
			<div class="logos">
				<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" />
				<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" />
				<div class="gov-header">
					<p class="republic">REPUBLIC OF THE PHILIPPINES</p>
					<p class="department">DEPARTMENT OF AGRARIAN REFORM</p>
					<p class="tagline">Tunay na Pagbabago sa Repormang Agraryo</p>
				</div>
				<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO Certified" />
				<div class="spacer"></div>
			</div>
			
			${showTitle ? `
			<div class="report-title">
				<h1>PROCUREMENT SUMMARY REPORT</h1>
				<p class="fiscal-year">Fiscal Year ${escapeHtml(meta.reportYear)}</p>
				<p class="generated-date">Generated on ${escapeHtml(meta.generatedDate)}</p>
			</div>
			` : ''}
		</div>`;
}

export function printSummaryReport(
	meta: SummaryReportMeta,
	statusStats: StatusStat[],
	sectionStats: SectionStat[],
	reportRows: SummaryReportRow[]
) {
	const html = buildSummaryReportHtml(meta, statusStats, sectionStats, reportRows);
	
	const printWindow = window.open('', '_blank');
	if (!printWindow) {
		alert('Please allow popups to print the report');
		return;
	}

	printWindow.document.write(html);
	printWindow.document.close();
	
	printWindow.onload = () => {
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 500);
	};
}
