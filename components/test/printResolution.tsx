/**
 * Opens a new browser window and prints the live‑preview document.
 * The printed output reproduces the exact layout rendered by livePreview.tsx.
 *
 * Every spacing value below is derived 1:1 from the Tailwind classes used in
 * livePreview.tsx (e.g. mt-2 = 8px, gap-3 = 12px, px-6 = 24px, etc.).
 */
export function printLivePreview(
	meta: { refNo: string; canvassNo: string; prNo: string; date: string },
	cells: string[][],
	supplierNames: string[],
	supplierTotals: Record<string, number>,
) {
	const dealerCount = Math.max(3, supplierNames.length);

	function formatMoney(value: number) {
		return new Intl.NumberFormat("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	}

	/* ---------- column widths (mirrors livePreview.tsx <colgroup>) ---------- */
	const fixedWidths = [4.5, 4.5, 5.5, 46]; // ITEM NO, QTY, UNIT, PARTICULARS
	const remaining = 100 - fixedWidths.reduce((a, b) => a + b, 0);
	const dealerColWidth = (remaining / dealerCount).toFixed(4) + "%";

	const colGroupHtml = fixedWidths
		.map((w) => `<col style="width:${w}%"/>`)
		.concat(Array.from({ length: dealerCount }, () => `<col style="width:${dealerColWidth}"/>`))
		.join("");

	/* ---------- dealer name header cells (px-2 py-3 = 8px 12px) ---------- */
	const dealerNameCells = Array.from(
		{ length: dealerCount },
		(_, i) =>
			`<td class="cell" style="vertical-align:middle;padding:12px 8px;text-transform:uppercase;">${escapeHtml(supplierNames[i] || "")}</td>`,
	).join("");

	/* ---------- body rows ---------- */
	const bodyRows = cells
		.map((row) => {
			const tds = row
				.map((val, c) => {
					const align = c === 3 ? "text-align:left;" : "text-align:center;";
					const content = val.trim() ? escapeHtml(val) : "&nbsp;";
					return `<td class="cell dcell" style="${align}">${content}</td>`;
				})
				.join("");
			return `<tr>${tds}</tr>`;
		})
		.join("");

	/* ---------- totals row ---------- */
	const totalsCells = Array.from({ length: dealerCount }, (_, i) => {
		const name = supplierNames[i] || "";
		const total = supplierTotals[name];
		const display = typeof total === "number" && total > 0 ? formatMoney(total) : "&nbsp;";
		return `<td class="cell" style="text-align:center;font-weight:bold;font-size:10px;">${display}</td>`;
	}).join("");

	/* ---------- "For item …" blank lines (gap-2 = 8px, w = 300px) ---------- */
	const forItemLines = Array.from(
		{ length: 3 },
		() =>
			`<div style="display:flex;align-items:center;gap:8px;justify-content:center;width:100%;">
				<span>For item</span>
				<span style="display:inline-block;border-bottom:1px solid #000;vertical-align:middle;width:300px;min-height:1px;"></span>
				<span>offered the lowest price quotation.</span>
			</div>`,
	).join("");

	/* ---------- full HTML ---------- */
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Abstract of Price Quotations – ${escapeHtml(meta.prNo)}</title>
<style>
	@page {
		size: A4 portrait;
		margin: 10mm 8mm 8mm 8mm;
	}
	* { box-sizing: border-box; margin: 0; padding: 0; }
	body {
		font-family: Arial, Helvetica, sans-serif;
		font-size: 9px;
		line-height: 1.05;
		color: #000;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	table {
		border-collapse: collapse;
		table-layout: fixed;
		width: 100%;
		font-size: 8px;
		empty-cells: show;
	}
	.cell {
		border: 1px solid #000;
		padding: 2px 4px;
		text-align: center;
		font-size: 8px;
		line-height: 1.15;
		vertical-align: middle;
	}
	/* data cells match livePreview input style: px-2 py-1 text-[10px] */
	.dcell {
		padding: 4px 8px;
		font-size: 10px;
		vertical-align: top;
	}
	.wrapper {
		width: 100%;
		max-width: 768px;
		margin: 0 auto;
		padding: 12px 24px 24px;
	}
</style>
</head>
<body>
<div class="wrapper">

	<!-- Header: gap-3(12px) pt-1(4px) h-12 w-12(48px) -->
	<div style="display:flex;align-items:flex-start;justify-content:center;gap:12px;padding-top:4px;">
		<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" style="height:48px;width:48px;object-fit:contain;"/>
		<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" style="height:48px;width:48px;object-fit:contain;"/>
		<div style="padding-top:4px;text-align:center;margin-left:2px;margin-right:2px;">
			<div style="font-size:9px;font-weight:700;letter-spacing:0.01em;">REPUBLIC OF THE PHILIPPINES</div>
			<div style="font-size:9px;font-weight:700;letter-spacing:0.01em;">DEPARTMENT OF AGRARIAN REFORM</div>
			<div style="font-size:8px;font-weight:400;">Tunay na Pagbabago sa Repormang Agraryo</div>
		</div>
		<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO certified" style="height:48px;width:48px;object-fit:contain;border-radius:6px;margin-left:4px;"/>
	</div>

	<!-- Meta fields + title: mt-2(8px) px-3(12px) pb-2(8px) pt-1(4px) -->
	<div style="margin-top:8px;border:1px solid #000;border-bottom:none;padding:4px 12px 8px;">
		<!-- flex justify-end, min-height 34px -->
		<div style="display:flex;justify-content:flex-end;min-height:34px;">
			<!-- space-y-1(4px) text-right fontSize 8px -->
			<div style="font-size:8px;text-align:right;">
				<!-- Each row: flex items-center justify-end gap-2(8px), label fixed-width, input w-20(80px) text-[10px] -->
				<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px;">
					<span style="font-style:italic;display:inline-block;width:58px;text-align:right;">Ref. No.:</span>
					<span style="display:inline-block;width:80px;border-bottom:1px solid #000;text-align:right;font-size:10px;line-height:1.4;">${meta.refNo.trim() ? escapeHtml(meta.refNo) : "&nbsp;"}</span>
				</div>
				<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px;">
					<span style="font-style:italic;display:inline-block;width:58px;text-align:right;">Canvass No.:</span>
					<span style="display:inline-block;width:80px;border-bottom:1px solid #000;text-align:right;font-size:10px;line-height:1.4;">${meta.canvassNo.trim() ? escapeHtml(meta.canvassNo) : "&nbsp;"}</span>
				</div>
				<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px;">
					<span style="font-style:italic;display:inline-block;width:58px;text-align:right;">PR No.:</span>
					<span style="display:inline-block;width:80px;border-bottom:1px solid #000;text-align:right;font-size:10px;line-height:1.4;">${meta.prNo.trim() ? escapeHtml(meta.prNo) : "&nbsp;"}</span>
				</div>
				<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
					<span style="font-style:italic;display:inline-block;width:58px;text-align:right;">Date:</span>
					<span style="display:inline-block;width:80px;border-bottom:1px solid #000;text-align:right;font-size:10px;line-height:1.4;">${meta.date.trim() ? escapeHtml(meta.date) : "&nbsp;"}</span>
				</div>
			</div>
		</div>
		<!-- Title: mt-4(16px) fontSize 10px lineHeight 1.2 -->
		<div style="margin-top:16px;text-align:center;font-weight:bold;text-transform:uppercase;font-size:10px;line-height:1.2;">
			<div>ABSTRACT OF PRICE QUOTATIONS OFFERED FOR VARIOUS OFFICE SUPPLIES</div>
			<div>AND MATERIALS CALLED FOR ON REQUEST FROM DAR-CAMARINES SUR</div>
			<div>PROVINCIAL OFFICE OFFERED BY DIFFERENT LEADING DEALERS</div>
		</div>
	</div>

	<!-- Data table: fontSize 8px text-center -->
	<table style="text-align:center;">
		<colgroup>${colGroupHtml}</colgroup>
		<tbody>
			<tr style="height:20px;">
				<td class="cell" style="font-weight:bold;text-transform:uppercase;" rowspan="2">ITEM NO.</td>
				<td class="cell" style="font-weight:bold;text-transform:uppercase;" rowspan="2">QTY</td>
				<td class="cell" style="font-weight:bold;text-transform:uppercase;" rowspan="2">UNIT</td>
				<td class="cell" style="font-weight:bold;text-transform:uppercase;" rowspan="2">PARTICULARS</td>
				<td class="cell" style="font-weight:bold;text-transform:uppercase;" colspan="${dealerCount}">NAME OF DEALERS</td>
			</tr>
			<tr style="height:48px;">
				${dealerNameCells}
			</tr>
			${bodyRows}
			<tr style="height:18px;">
				<td class="cell">&nbsp;</td>
				<td class="cell">&nbsp;</td>
				<td class="cell">&nbsp;</td>
				<td class="cell" style="text-align:right;font-weight:bold;text-transform:uppercase;padding-right:8px;">TOTAL</td>
				${totalsCells}
			</tr>
		</tbody>
	</table>

	<!-- BAC header: fontSize 8px marginTop 4px -->
	<div style="text-align:center;font-weight:bold;text-transform:uppercase;font-size:8px;margin-top:4px;">BY THE BIDS AND AWARDS COMMITTEE</div>

	<!-- Resolution body: mt-3(12px) fontSize 8px lineHeight 1.15 -->
	<div style="margin-top:12px;font-size:8px;line-height:1.15;">
		<!-- max-w-140(560px) text-justify -->
		<div style="max-width:560px;margin:0 auto;text-align:justify;">
			<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Based on the above abstract of quotation of prices offered by different leading dealers on various materials called for as above,</p>
			<p style="margin-top:4px;">the Committee found that:</p>
		</div>
		<!-- mt-2(8px) space-y-2(8px) -->
		<div style="margin-top:8px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;">
			${forItemLines}
		</div>
		<!-- mt-2(8px) -->
		<div style="max-width:560px;margin:8px auto 0;text-align:justify;">
			<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;">WHEREOF</span>, considering the above premises, the members of the Bids and Awards Committee hereby recommend to the<br/>Head of the Procuring Entity the award of the aforementioned document to the lowest price quoted by the respective dealer/s.</p>
			<p style="margin-top:8px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;">RESOLVED</span> at the DAR Camarines Sur 1 Provincial Office, HL Building, Carnation St., Triangulo, Naga City this ____ day of ______, 20___</p>
		</div>
	</div>

	<!-- Chairperson: mt-10(40px) fontSize 8px lineHeight 1.1 -->
	<div style="margin-top:40px;text-align:center;font-size:8px;line-height:1.1;">
		<div style="font-weight:bold;text-transform:uppercase;">ATTY. JAIME G. RESOCO, JR.</div>
		<div>BAC Chairperson</div>
	</div>

	<!-- Members: mt-5(20px) grid-cols-2 gap-x-10(40px) -->
	<div style="margin-top:20px;font-size:8px;line-height:1.1;">
		<table style="width:100%;border-collapse:collapse;border:none;">
			<tr>
				<td style="text-align:center;vertical-align:top;padding:0;border:none;width:50%;">
					<div style="font-weight:bold;text-transform:uppercase;">GERRY L. MATAMOROSA</div>
					<div>BAC Vice-Chairperson</div>
				</td>
				<td style="text-align:center;vertical-align:top;padding:0;border:none;width:50%;">
					<div style="font-weight:bold;text-transform:uppercase;">ENGR. MA. ELIZABETH N. ARCILLA</div>
					<div>BAC Member</div>
				</td>
			</tr>
			<!-- mt-8(32px) spacer -->
			<tr><td style="border:none;padding:0;height:32px;" colspan="2"></td></tr>
			<tr>
				<td style="text-align:center;vertical-align:top;padding:0;border:none;width:50%;">
					<div style="font-weight:bold;text-transform:uppercase;">ENGR. JOSE JESUS B. REY, JR.</div>
					<div>BAC Member</div>
				</td>
				<td style="text-align:center;vertical-align:top;padding:0;border:none;width:50%;">
					<div style="font-weight:bold;text-transform:uppercase;">MARIA REBECCA R. TAROG</div>
					<div>BAC Member</div>
				</td>
			</tr>
		</table>
	</div>

	<!-- Approved by: mt-7(28px) -->
	<div style="margin-top:28px;text-align:center;font-size:8px;">
		<div>APPROVED BY:</div>
		<!-- mt-6(24px) -->
		<div style="margin-top:24px;font-weight:bold;text-transform:uppercase;">RICARDO C. GARCIA</div>
		<div>HOPE</div>
	</div>

	<!-- Footer: mt-6(24px) -->
	<div style="margin-top:24px;display:flex;align-items:flex-end;justify-content:space-between;font-size:8px;">
		<div>
			<div>ASA/LCO</div>
			<div>PhilGEPS Ref.</div>
		</div>
		<div style="font-weight:bold;">DARCS1-QF-STO-010 Rev 00</div>
	</div>

</div>
</body>
</html>`;

	const printWindow = window.open("", "_blank");
	if (!printWindow) return;
	printWindow.document.write(html);
	printWindow.document.close();

	// Wait for images to load before triggering print
	printWindow.onload = () => {
		printWindow.focus();
		printWindow.print();
	};
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
