"use client";

import { useEffect, useRef } from "react";

type PrintResolutionProps = {
	prNo?: string;
	meta?: {
		refNo: string;
		canvassNo: string;
		prNo: string;
		date: string;
	};
	cells?: string[][];
	supplierNames?: string[];
	supplierTotals?: Record<string, number>;
};

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

/**
 * Initiates printing of the live preview document
 * Can be called directly from the LivePreview component
 */
export async function printLivePreview(
	meta: { refNo: string; canvassNo: string; prNo: string; date: string },
	cells: string[][],
	supplierNames: string[],
	supplierTotals: Record<string, number>
) {
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		alert("Unable to open print window. Please check your browser settings.");
		return;
	}

	const dealerCount = Math.max(3, supplierNames.length);
	const colWidths = [3.5, 3.5, 4.5, 40];
	const remaining = 100 - colWidths.reduce((a, b) => a + b, 0);
	const dealerWidth = (remaining / dealerCount).toFixed(4);

	const html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<title>Purchase Order Canvass - ${meta.prNo}</title>
			<style>
				* {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}
				
				body {
					font-family: Arial, Helvetica, sans-serif;
					font-size: 8px;
					line-height: 1;
					color: #000;
				}
				
				@media print {
					body {
						margin: 0;
						padding: 0;
					}
					.print-container {
						page-break-after: always;
					}
					.no-break {
						page-break-inside: avoid;
					}
				}
				
				.print-container {
					width: 100%;
					max-width: 210mm;
					min-height: 297mm;
					margin: 0 auto;
					padding: 15px 20px;
					background: white;
				}
				
				.header {
					display: flex;
					align-items: flex-start;
					justify-content: center;
					gap: 8px;
					padding-top: 2px;
				}
				
				.header img {
					height: 40px;
					width: 40px;
					object-fit: contain;
				}
				
				.header-text {
					padding-top: 2px;
					text-align: center;
				}
				
				.header-text > div {
					font-weight: bold;
					letter-spacing: 0.01em;
					font-size: 8px;
					line-height: 1;
				}
				
				.header-text .motto {
					font-weight: normal;
					font-size: 7px;
				}
				
				.metadata {
					display: flex;
					justify-content: flex-end;
					margin-top: 0;
					min-height: 42px;
				}
				
				.metadata-content {
					text-align: right;
					font-size: 8px;
				}
				
				.metadata-row {
					display: flex;
					align-items: center;
					justify-content: flex-end;
					gap: 8px;
					margin-bottom: 2px;
				}
				
				.metadata-label {
					font-style: italic;
				}
				
				.metadata-value {
					border-bottom: 1px solid #000;
					width: 80px;
					text-align: right;
					padding-right: 4px;
				}
				
				.title {
					text-align: center;
					font-weight: bold;
					text-transform: uppercase;
					font-size: 10px;
					line-height: 1.2;
					margin-top: 24px;
				}

				.intro-box {
					border: 1px solid #000;
					border-bottom: none;
					padding: 10px 12px 14px;
					margin-top: 10px;
				}
				
				table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 0;
					font-size: 8px;
					text-align: center;
					table-layout: fixed;
				}
				
				td {
					border: 1px solid #000;
					padding: 2px;
					vertical-align: middle;
				}
				
				.item-col {
					width: ${colWidths[0]}%;
				}
				
				.qty-col {
					width: ${colWidths[1]}%;
				}
				
				.unit-col {
					width: ${colWidths[2]}%;
				}
				
				.particulars-col {
					width: ${colWidths[3]}%;
				}

				thead th.particulars-col {
					text-align: center;
				}

				tbody td.particulars-col {
					text-align: left;
					padding-left: 8px;
				}
				
				.dealer-col {
					width: ${dealerWidth}%;
				}
				
				th {
					font-weight: bold;
					text-transform: uppercase;
					background: #fff;
					border: 1px solid #000;
					padding: 4px 2px;
					vertical-align: middle;
				}
				
				tr.dealer-header {
					height: 48px;
				}
				
				tr.dealer-header td {
					vertical-align: middle;
					padding: 8px 4px;
				}
				
				tr.item-row td {
					height: 16px;
					padding: 2px;
				}
				
				tr.total-row {
					height: 18px;
					font-weight: bold;
				}
				
				tr.total-row td {
					text-align: center;
				}
				
				.total-label {
					text-align: right;
					padding-right: 8px;
				}
				
				.content-text {
					font-size: 8px;
					line-height: 1.15;
					margin-top: 12px;
				}
				
				.content-text p {
					margin-bottom: 6px;
					text-align: center;
				}
				
				.content-text .justify {
					text-align: justify;
				}
				
				.findings {
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 8px;
					margin-top: 8px;
					text-align: center;
				}
				
				.finding-item {
					display: flex;
					gap: 8px;
					justify-content: center;
					width: 100%;
				}
				
				.finding-line {
					border-bottom: 1px solid #000;
					flex: 1;
					max-width: 300px;
				}
				
				.signature-section {
					margin-top: 40px;
					text-align: center;
					font-size: 8px;
					line-height: 1.1;
				}
				
				.signature-title {
					font-weight: bold;
					text-transform: uppercase;
					margin-bottom: 2px;
				}
				
				.signature-position {
					font-size: 8px;
				}
				
				.dual-signatures {
					margin-top: 20px;
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 40px;
			}
				
				.signature-item {
					font-size: 8px;
					line-height: 1.1;
				}
				
				.signature-item:last-child {
					text-align: right;
				}
				
				.signature-item-title {
					font-weight: bold;
					text-transform: uppercase;
					margin-top: 32px;
				}
				
				.approval-section {
					margin-top: 28px;
					text-align: center;
					font-size: 8px;
					line-height: 1.1;
				}
				
				.approval-title {
					font-weight: bold;
					text-transform: uppercase;
					margin-bottom: 2px;
				}
				
				.approval-name {
					font-weight: bold;
					text-transform: uppercase;
					margin-top: 24px;
				}
				
				.footer {
					margin-top: 24px;
					display: flex;
					align-items: flex-end;
					justify-content: space-between;
					font-size: 8px;
				}
				
				.footer-left {
					text-align: left;
					line-height: 1.1;
				}
				
				.footer-right {
					font-weight: bold;
				}
			</style>
		</head>
		<body>
			<div class="print-container">
				<div class="header">
					<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" />
					<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" />
					<div class="header-text">
						<div>REPUBLIC OF THE PHILIPPINES</div>
						<div>DEPARTMENT OF AGRARIAN REFORM</div>
						<div class="motto">Tunay na Pagbabago sa Repormang Agraryo</div>
					</div>
					<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO certified" />
				</div>

				<div class="intro-box">
					<div class="metadata">
						<div class="metadata-content">
							<div class="metadata-row">
								<span class="metadata-label">Ref. No.:</span>
								<span class="metadata-value">${meta.refNo ? meta.refNo : '&nbsp;'}</span>
							</div>
							<div class="metadata-row">
								<span class="metadata-label">Canvass No.:</span>
								<span class="metadata-value">${meta.canvassNo ? meta.canvassNo : '&nbsp;'}</span>
							</div>
							<div class="metadata-row">
								<span class="metadata-label">PR No.:</span>
								<span class="metadata-value">${meta.prNo ? meta.prNo : '&nbsp;'}</span>
							</div>
							<div class="metadata-row">
								<span class="metadata-label">Date:</span>
								<span class="metadata-value">${meta.date ? meta.date : '&nbsp;'}</span>
							</div>
						</div>
					</div>

					<div class="title">
						<div>ABSTRACT OF PRICE QUOTATIONS OFFERED FOR VARIOUS OFFICE SUPPLIES</div>
						<div>AND MATERIALS CALLED FOR ON REQUEST FROM DAR-CAMARINES SUR</div>
						<div>PROVINCIAL OFFICE OFFERED BY DIFFERENT LEADING DEALERS</div>
					</div>
				</div>

					<table>
						<colgroup>
							<col class="item-col" />
							<col class="qty-col" />
							<col class="unit-col" />
							<col class="particulars-col" />
							${Array.from({ length: dealerCount }).map((_, i) => `<col class="dealer-col" />`).join("")}
						</colgroup>
						<thead>
							<tr>
								<th class="item-col" rowspan="2">ITEM NO.</th>
								<th class="qty-col" rowspan="2">QTY</th>
								<th class="unit-col" rowspan="2">UNIT</th>
								<th class="particulars-col" rowspan="2">PARTICULARS</th>
								<th colspan="${dealerCount}">NAME OF DEALERS</th>
							</tr>
							<tr class="dealer-header">
								${supplierNames.map(name => `<th class="dealer-col">${name}</th>`).join("")}
							</tr>
						</thead>
					<tbody>
						${cells
							.map(
								(row, r) => `
							<tr class="item-row">
								<td class="item-col">${row[0] || ""}</td>
								<td class="qty-col">${row[1] || ""}</td>
								<td class="unit-col">${row[2] || ""}</td>
								<td class="particulars-col">${row[3] || ""}</td>
								${row
									.slice(4)
									.map(val => `<td class="dealer-col">${val || ""}</td>`)
									.join("")}
							</tr>
						`
							)
							.join("")}
						<tr class="total-row">
							<td></td>
							<td></td>
							<td></td>
							<td class="particulars-col total-label">TOTAL</td>
							${supplierNames
								.map(name => {
									const total = supplierTotals[name];
									return `<td class="dealer-col">${typeof total === "number" && total > 0 ? formatMoney(total) : ""}</td>`;
								})
								.join("")}
						</tr>
					</tbody>
				</table>

				<div style="text-align: center; font-weight: bold; text-transform: uppercase; font-size: 8px; margin-top: 8px;">
					BY THE BIDS AND AWARDS COMMITTEE
				</div>

				<div class="content-text">
					<p>Based on the above abstract of quotation of prices offered by different leading dealers on various materials called for as above,</p>
					<p>the Committee found that:</p>
					<div class="findings">
						<div class="finding-item">
							<span>For item</span>
							<div class="finding-line"></div>
							<span>offered the lowest price quotation.</span>
						</div>
						<div class="finding-item">
							<span>For item</span>
							<div class="finding-line"></div>
							<span>offered the lowest price quotation.</span>
						</div>
						<div class="finding-item">
							<span>For item</span>
							<div class="finding-line"></div>
							<span>offered the lowest price quotation.</span>
						</div>
					</div>
					<p class="justify" style="margin-top: 8px;">WHEREOF, considering the above premises, the members of the Bids and Awards Committee hereby recommend to the Head of the Procuring Entity the award of the aforementioned document to the lowest price quoted by the respective dealer/s.</p>
					<p class="justify">RESOLVED at the DAR Camarines Sur 1 Provincial Office, HL Building, Carnation St., Triangulo, Naga City this ____ day of ______, 20___</p>
				</div>

				<div class="signature-section">
					<div class="signature-title">ATTY. JAIME G. RESOCO, JR.</div>
					<div class="signature-position">BAC Chairperson</div>
				</div>

				<div class="dual-signatures">
					<div class="signature-item">
						<div class="signature-item-title">GERRY L. MATAMOROSA</div>
						<div class="signature-position">BAC Vice-Chairperson</div>
						<div class="signature-item-title">ENGR. JOSE JESUS B. REY, JR.</div>
						<div class="signature-position">BAC Member</div>
					</div>
					<div class="signature-item">
						<div class="signature-item-title">ENGR. MA. ELIZABETH N. ARCILLA</div>
						<div class="signature-position">BAC Member</div>
						<div class="signature-item-title">MARIA REBECCA R. TAROG</div>
						<div class="signature-position">BAC Member</div>
					</div>
				</div>

				<div class="approval-section">
					<div class="approval-title">APPROVED BY:</div>
					<div class="approval-name">RICARDO C. GARCIA</div>
					<div class="signature-position">HOPE</div>
				</div>

				<div class="footer">
					<div class="footer-left">
						<div>ASA/LCO</div>
						<div>PhilGEPS Ref.</div>
					</div>
					<div class="footer-right">DARCS1-QF-STO-010 Rev 00</div>
				</div>
			</div>

			<script>
				window.onload = function() {
					window.print();
				};
			</script>
		</body>
		</html>
	`;

	printWindow.document.write(html);
	printWindow.document.close();
}

/**
 * PrintResolution Component
 * Provides a wrapper for printing the live preview
 * Can be imported and used with the printLivePreview function
 */
export default function PrintResolution({ meta, cells, supplierNames, supplierTotals }: PrintResolutionProps) {
	const printWindowRef = useRef<Window | null>(null);

	useEffect(() => {
		if (!meta || !cells || !supplierNames || !supplierTotals) return;

		printLivePreview(meta, cells, supplierNames, supplierTotals).then(() => {
			// Print window is opened automatically
		});
	}, [meta, cells, supplierNames, supplierTotals]);

	return null; // This component handles printing and doesn't render anything
}
