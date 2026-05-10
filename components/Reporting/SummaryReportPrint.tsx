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

function getStatusInfo(status: string, status_id: number | null, source: string): { name: string; color: string } {
	if (source === 'delivery') return { name: "Delivery", color: "delivery" };
	if (source === 'payment') return { name: "Payment", color: "payment" };

	// New status ID categorization
	if (status_id === 1) return { name: "Pending", color: "pending" };
	if ([2, 3, 4, 5].includes(status_id || 0)) return { name: "Processing", color: "processing" };
	if ([6, 8, 9].includes(status_id || 0)) return { name: "Canvassing", color: "canvassing" };
	if (status_id === 7) return { name: "BAC Resolution", color: "bac-resolution" };
	if (status_id === 10) return { name: "Abstract of Awards", color: "aaa" };
	if ([11, 12, 15, 16, 17].includes(status_id || 0)) return { name: "PO", color: "po" };
	if ([13, 14].includes(status_id || 0)) return { name: "ORS", color: "ors" };
	if ([18, 19, 20, 21, 22, 23, 24].includes(status_id || 0)) return { name: "Delivery", color: "delivery" };
	if ([25, 26, 27, 28, 29, 30, 31, 32].includes(status_id || 0)) return { name: "Payment Phase", color: "payment" };
	if (status_id === 33) return { name: "Completed PR Phase", color: "completed-pr" };
	if (status_id === 34) return { name: "Completed PO Phase", color: "completed-po" };
	if (status_id === 35) return { name: "Completed Delivery Phase", color: "completed-delivery" };
	if (status_id === 36) return { name: "Completed Payment Phase", color: "completed" };

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
			<div class="committee">
				<p class="committee-name">PROVINCIAL BIDS AND AWARDS COMMITTEE OF</p>
				<p class="office">DARPO-CAMARINES SUR I</p>
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
