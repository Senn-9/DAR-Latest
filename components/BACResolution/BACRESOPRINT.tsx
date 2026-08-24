export type BACResoMeta = {
	resoYear: string;
	resoSequence: string;
	alternativeMode: string;
	procurementMethod?: string;
	dateResolved: string;
	bacChairperson?: string;
	bacViceChairperson?: string;
	bacMember1?: string;
	bacMember2?: string;
	bacMember3?: string;
	hope?: string;
};

export type WhereasClause = {
	id: number;
	lines: string[];
};

export type ResoTableRow = {
	id: number;
	prNo: string;
	date: string;
	cost: string;
	endUser: string;
	mode: string;
};

export function buildBACResoHtml(
	meta: BACResoMeta,
	whereasClauses: WhereasClause[],
	tableRows: ResoTableRow[]
) {
	function escapeHtml(str: string): string {
		if (!str) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	const getOrdinal = (n: number) => {
		const s = ["th", "st", "nd", "rd"];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	};

	const numberToWords = (n: number): string => {
		const words = [
			"ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
			"ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"
		];
		const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

		if (n < 20) return words[n];
		if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + words[n % 10] : "");
		return n.toString();
	};

	const whereasSections = whereasClauses
		.map((clause) => {
			const clauseText = clause.lines.join(" ");
			return `<div style="margin-bottom: 12px;">
				<div style="font-size: 11px; line-height: 1.5;">
					<span style="font-weight: 700; display: inline;">WHEREAS,</span>
					<span style="display: inline;">
						${" " + clauseText}
					</span>
				</div>
			</div>`;
		})
		.join("");

	const tableRows_ = tableRows
		.map(
			(row) => `
		<tr class="h-8">
			<td class="border border-black p-1 text-center" style="font-size: 10px;">
				${escapeHtml(row.prNo)}
			</td>
			<td class="border border-black p-1 text-center" style="font-size: 10px;">
				${escapeHtml(row.date)}
			</td>
			<td class="border border-black p-1 text-center" style="font-size: 10px;">
				${escapeHtml(row.cost)}
			</td>
			<td class="border border-black p-1 text-center" style="font-size: 10px;">
				${escapeHtml(row.endUser)}
			</td>
			<td class="border border-black p-1 text-center" style="font-size: 10px;">
				${escapeHtml(row.mode)}
			</td>
		</tr>`
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>BAC Resolution - ${escapeHtml(meta.resoYear)}-${escapeHtml(meta.resoSequence)}</title>
	<style>
		@page { size: A4 portrait; margin: 0; }
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			color: #000;
			background: #fff;
			font-family: Calibri, sans-serif;
			font-size: 13px;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.page {
			width: 100%;
			max-width: 850px;
			min-height: 1100px;
			margin: 0 auto;
			padding: 36px 28px;
		}
		.top-grid {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			margin-bottom: 8px;
		}
		.header-center {
			display: flex;
			align-items: flex-start;
			justify-content: center;
			gap: 12px;
			flex: 1;
		}
		.invisible-spacer {
			width: 56px;
			height: 56px;
			visibility: hidden;
			flex-shrink: 0;
		}
		img.logo {
			width: 56px;
			height: 56px;
			object-fit: contain;
		}
		img.logo.rounded {
			border-radius: 6px;
		}
		.gov-text {
			padding-top: 4px;
			text-align: center;
		}
		.gov-text .title {
			font-size: 13px;
			font-weight: 700;
		}
		.gov-text .subtitle {
			font-size: 12px;
			font-weight: 400;

		}
		.committee-info {
			text-align: center;
			margin-bottom: 18px;
			font-size: 12px;
			line-height: 1.2;
		}
		.committee-info .label {
			font-weight: 700;
		}
		.resolution-number {
			display: flex;
			justify-content: center;
			margin-bottom: 12px;
			font-size: 13px;
			font-weight: 700;
		}
		.resolution-number input {
			outline: none;
			width: 60px;
			background: transparent;
			font-weight: 700;
			margin: 0 4px;
			border: none;
			text-align: center;
		}
		.resolution-title {
			text-align: center;
			margin-bottom: 24px;
			font-size: 13px;
			font-weight: 700;
			line-height: 1.5;
		}
		.resolution-title input {
			outline: none;
			background: transparent;
			border-bottom: 1px solid #000;
			font-size: 13px;
			margin: 0 4px;
			text-align: center;
			max-width: 200px;
		}
		.narrow-content {
			width: 100%;
			max-width: 600px;
			margin: 0 auto;
		}
		.whereas-section {
			margin: 8px 0;
			font-size: 13px;
			line-height: 1.6;
		}
		.whereas-clause {
			margin-bottom: 8px;
		}
		.whereas-label {
			font-weight: 700;
			margin-right: 8px;
			display: inline-block;
		}
		.items-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 24px;
			font-size: 12px;
			table-layout: fixed;
		}
		.items-table th,
		.items-table td {
			border: 1px solid #000;
			padding: 6px;
			text-align: center;
		}
		.items-table th {
			font-weight: 700;
			background-color: #fff;
		}
		.items-table td.text-right {
			text-align: right;
		}
		.attachment-note {
			font-size: 12px;
			margin-bottom: 16px;
		}
		.resolve-section {
			font-size: 13px;
			line-height: 1.6;
			margin-bottom: 16px;
		}
		.resolve-label {
			font-weight: 700;
		}
		.date-section {
			font-size: 13px;
			margin-bottom: 32px;
			line-height: 1.6;
		}
		.date-section input {
			outline: none;
			background: transparent;
			border: none;
			flex: 1;
			font-size: 13px;
		}
		.signature-section {
			margin-top: 28px;
		}
		.signature-row-top {
			display: flex;
			justify-content: center;
			margin-bottom: 32px;
		}
		.signature-row-two {
			display: grid;
			grid-template-columns: 1fr 1fr;
			column-gap: 64px;
			row-gap: 28px;
			margin: 0 auto 32px;
			max-width: 660px;
		}
		.signature-block {
			text-align: center;
		}
		.signature-block.left {
			justify-self: center;
			text-align: center;
		}
		.signature-block.right {
			justify-self: center;
			text-align: center;
		}
		.signature-name {
			font-size: 13px;
			font-weight: 700;
			text-transform: uppercase;
			margin-bottom: 4px;
		}
		.signature-role {
			font-size: 12px;
		}
		.approved-by {
			text-align: center;
			margin-top: 18px;
		}
		.approved-by-name {
			font-size: 13px;
			font-weight: 700;
			text-transform: uppercase;
			margin: 4px 0;
		}
		.approved-by-role {
			font-size: 12px;
		}
		.flex {
			display: flex;
		}
		.items-baseline {
			align-items: baseline;
		}
	</style>
</head>
<body>
	<div class="page">
		<!-- Header with Logos -->
		<div class="top-grid">
			<div></div>
			<div class="header-center">
				<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" class="logo" />
				<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" class="logo" />

				<div class="gov-text">
					<div class="title">REPUBLIC OF THE PHILIPPINES</div>
					<div class="title">DEPARTMENT OF AGRARIAN REFORM</div>
					<div class="subtitle">Tunay na Pagbabago sa Repormang Agraryo</div>
				</div>

				<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO Certified" class="logo rounded" />
				<div class="invisible-spacer" aria-hidden="true"></div>
			</div>
			<div></div>
		</div>

		<!-- Committee Info -->
		<div class="committee-info">
			<div>PROVINCIAL BIDS AND AWARDS COMMITTEE OF</div>
			<div class="label">DARPO-CAMARINES SUR I</div>
		</div>

		<!-- Resolution Number -->
		<div class="resolution-number">
			<span>Resolution No. ${escapeHtml(meta.resoYear)}-${escapeHtml(meta.resoSequence)}</span>
		</div>

		<!-- Title -->
		<div class="resolution-title">
			<div>"RESOLUTION RECOMMENDING THE PROCUREMENT BY ALTERNATIVE MODE OF PROCUREMENT</div>
			<div>(${escapeHtml(meta.alternativeMode)}) OF ${numberToWords(tableRows.length)} (${escapeHtml(String(tableRows.length))}) APPROVED PURCHASE REQUEST/S"</div>
		</div>

		<!-- WHEREAS Clauses -->
		<div class="whereas-section">
			<div class="narrow-content">
				${whereasSections}

				<!-- Items Table -->
				<div class="mb-4">
					<table class="items-table">
						<thead>
							<tr>
								<th style="width: 15%;">PR NUMBER</th>
								<th style="width: 15%;">DATE</th>
								<th style="width: 20%;">ESTIMATED COST (Php)</th>
								<th style="width: 25%;">END USER</th>
								<th style="width: 25%;">RECOMMENDED PROCUREMENT MODE</th>
							</tr>
						</thead>
						<tbody>
							${tableRows_}
						</tbody>
					</table>
				</div>

				<!-- Attachment note -->
				<div class="attachment-note mb-4">
					Please see attached purchase request/s.
				</div>

				<!-- RESOLVE section -->
				<div class="resolve-section mb-4">
					<span class="resolve-label">NOW, THEREFORE,</span>
					<span>we, the members of the Bids and Awards Committee, hereby</span>
					<span class="resolve-label">RESOLVE,</span>
					<span>as it is hereby</span>
					<span class="resolve-label">RESOLVED,</span>
					<span>to recommend to the Head of Procuring Entity the procurement of items through ${escapeHtml(meta.procurementMethod || "SVP method") }.</span>
				</div>

				<!-- Resolution location and date -->
				<div class="date-section mb-6">
					<span class="resolve-label">RESOLVED</span>
					<span>at the HL Bldg. Carnation St, Triangulo Naga City, this</span>
					<span>${escapeHtml(meta.dateResolved)}</span>
				</div>
			</div>

		<!-- Signatures -->
		<div class="signature-section">
			<div class="signature-row-top">
				<div class="signature-block" style="min-width: 260px;">
					<div class="signature-name">${escapeHtml(meta.bacChairperson || "ATTY. JAIME G. RESOCO, JR.")}</div>
					<div class="signature-role">BAC Chairperson</div>
				</div>
			</div>

			<div class="signature-row-two">
				<div class="signature-block left">
					<div class="signature-name">${escapeHtml(meta.bacViceChairperson || "GERRY L. MATAMOROSA")}</div>
					<div class="signature-role">BAC Vice-Chairperson</div>
				</div>
				<div class="signature-block right">
					<div class="signature-name">${escapeHtml(meta.bacMember1 || "ENGR. MA. ELIZABETH N. ARCILLA")}</div>
					<div class="signature-role">BAC Member</div>
				</div>
			</div>

			<div class="signature-row-two" style="margin-bottom: 36px;">
				<div class="signature-block left">
					<div class="signature-name">${escapeHtml(meta.bacMember2 || "ENGR. JOSE JESUS B. REY, JR.")}</div>
					<div class="signature-role">BAC Member</div>
				</div>
				<div class="signature-block right">
					<div class="signature-name">${escapeHtml(meta.bacMember3 || "MARIA REBECCA R. TAROG")}</div>
					<div class="signature-role">BAC Member</div>
				</div>
			</div>

			<!-- Approved by -->
			<div class="approved-by">
				<div style="font-size: 10px; margin-bottom: 8px;">Approved by:</div>
				<div class="approved-by-name">${escapeHtml(meta.hope || "RICARDO C. GARCIA")}</div>
				<div class="approved-by-role">HOPE</div>
			</div>
		</div>
	</div>
</body>
</html>`;
}

/**
 * Opens a new browser window and prints the BAC Resolution document.
 */
export function printBACReso(
	meta: BACResoMeta,
	whereasClauses: WhereasClause[],
	tableRows: ResoTableRow[]
) {
	const html = buildBACResoHtml(meta, whereasClauses, tableRows);
	const printWindow = window.open("", "_blank");
	if (!printWindow) return;
	printWindow.document.write(html);
	printWindow.document.close();
	printWindow.onload = () => {
		printWindow.focus();
		printWindow.print();
	};
}
