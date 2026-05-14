import { printWithIframe, escapeHtml } from "@/utils/print/printUtils";

/**
 * Generates the HTML for the Abstract of Price Quotations (Resolution).
 */
export function buildResolutionHtml(
	meta: {
		refNo: string;
		canvassNo: string;
		prNo: string;
		date: string;
		bacChair: string;
		bacViceChair: string;
		bacMember1: string;
		bacMember2: string;
		bacMember3: string;
		hope: string;
	},
	cells: { value: string; isCenter?: boolean }[][],
	supplierNames: string[],
	supplierTotals: Record<string, number>,
	winningItems: string[],
) {
	const dealerCount = Math.max(3, supplierNames.length);

	function formatMoneyLocal(value: number) {
		return new Intl.NumberFormat("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	}

	function formatDateLegal(value: string | null | undefined) {
		if (!value) return "";
		const normalized = String(value).trim();
		if (!normalized) return "";

		let parsed: Date;
		if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
			const [month, day, year] = normalized.split("/").map(Number);
			parsed = new Date(year, month - 1, day);
		} else {
			// Try parsing directly first, then with T00:00:00 if it fails or if it looks like an ISO date
			parsed = new Date(normalized);
			if (Number.isNaN(parsed.getTime())) {
				parsed = new Date(normalized.includes("T") ? normalized : `${normalized}T00:00:00`);
			}
		}
		if (Number.isNaN(parsed.getTime())) {
			return normalized;
		}

		const day = parsed.getDate();
		const month = parsed.toLocaleString("en-US", { month: "long" });
		const year = parsed.getFullYear();
		const suffix =
			day % 10 === 1 && day % 100 !== 11
				? "st"
				: day % 10 === 2 && day % 100 !== 12
					? "nd"
					: day % 10 === 3 && day % 100 !== 13
						? "rd"
						: "th";

		return `${day}${suffix} day of ${month}, ${year}`;
	}

	/* ---------- column widths (mirrors livePreview.tsx <colgroup>) ---------- */
	const fixedWidths = [4.5, 4.5, 9, 46]; // ITEM NO, QTY, UNIT, PARTICULARS
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
				.map((cell) => {
					const align = cell.isCenter ? "text-align:center;" : "text-align:left;";
					const content = cell.value.trim() ? cell.value : "&nbsp;";
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
		const display = typeof total === "number" && total > 0 ? formatMoneyLocal(total) : "&nbsp;";
		return `<td class="cell" style="text-align:center;font-weight:bold;font-size:10px;">${display}</td>`;
	}).join("");

	/* ---------- winning item lines ---------- */
	const forItemLines = Array.from({ length: 3 })
		.map((_, index) => {
			const itemLabel = winningItems[index] || "";
			return `<div style="display:flex;align-items:center;gap:8px;width:100%;">
				<span style="width:48px;flex:0 0 auto;text-align:right;">For item</span>
				<span style="flex:1 1 auto;min-width:0;border-bottom:1px solid #000;text-align:center;line-height:1.1;">${itemLabel ? escapeHtml(itemLabel) : "&nbsp;"}</span>
				<span style="flex:0 0 auto;white-space:nowrap;">offered the lowest price quotation.</span>
			</div>`;
		})
		.join("");

	/* ---------- full HTML ---------- */
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Abstract of Price Quotations – ${escapeHtml(meta.prNo)}</title>
<style>
	* { box-sizing: border-box; margin: 0; padding: 0; }
	body {
		font-family: Arial, Helvetica, sans-serif;
		font-size: 10px;
		line-height: 1.05;
		color: #000;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	table {
		border-collapse: collapse;
		table-layout: fixed;
		width: 100%;
		font-size: 10px;
		empty-cells: show;
	}
	.cell {
		border: 1px solid #000;
		padding: 2px 4px;
		text-align: center;
		font-size: 10px;
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

	<!-- Header: match BACRESO layout -->
	<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
		<div></div>
		<div style="display:flex;align-items:flex-start;justify-content:center;gap:12px;flex:1 1 auto;">
			<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" style="height:56px;width:56px;object-fit:contain;"/>
			<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" style="height:56px;width:56px;object-fit:contain;"/>
			<div style="text-align:center;padding-top:4px;">
				<div style="font-size:11px;font-weight:700;">REPUBLIC OF THE PHILIPPINES</div>
				<div style="font-size:11px;font-weight:700;">DEPARTMENT OF AGRARIAN REFORM</div>
				<div style="font-size:10px;font-weight:400;">Tunay na Pagbabago sa Repormang Agraryo</div>
			</div>
			<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO certified" style="height:56px;width:56px;object-fit:contain;border-radius:6px;"/>
			<div style="height:56px;width:56px;visibility:hidden;" aria-hidden="true"></div>
		</div>
		<div></div>
	</div>

	<!-- Meta fields + title: mt-2(8px) px-3(12px) pb-2(8px) pt-1(4px) -->
	<div style="margin-top:8px;border:1px solid #000;border-bottom:none;padding:4px 12px 8px;">
		<!-- flex justify-end, min-height 34px -->
		<div style="display:flex;justify-content:flex-end;min-height:34px;">
			<!-- space-y-1(4px) text-right fontSize 10px -->
			<div style="font-size:10px;text-align:right;">
				<!-- Each row: flex items-center justify-end gap-2(8px), input w-20(80px) text-[10px] -->
				<div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:4px;">
					<span style="width:80px;text-align:right;margin-right:8px;white-space:nowrap;">Ref. No.:</span>
					<span style="display:inline-block;width:110px;border-bottom:1px solid #000;text-align:left;padding-left:4px;font-size:10px;line-height:1.4;">${meta.refNo.trim() ? escapeHtml(meta.refNo) : "&nbsp;"}</span>
				</div>
				<div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:4px;">
					<span style="width:80px;text-align:right;margin-right:8px;white-space:nowrap;">Canvass No.:</span>
					<span style="display:inline-block;width:110px;border-bottom:1px solid #000;text-align:left;padding-left:4px;font-size:10px;line-height:1.4;">${meta.canvassNo.trim() ? escapeHtml(meta.canvassNo) : "&nbsp;"}</span>
				</div>
				<div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:4px;">
					<span style="width:80px;text-align:right;margin-right:8px;white-space:nowrap;">PR No.:</span>
					<span style="display:inline-block;width:110px;border-bottom:1px solid #000;text-align:left;padding-left:4px;font-size:10px;line-height:1.4;">${meta.prNo.trim() ? escapeHtml(meta.prNo) : "&nbsp;"}</span>
				</div>
				<div style="display:flex;align-items:center;justify-content:flex-end;">
					<span style="width:80px;text-align:right;margin-right:8px;white-space:nowrap;">Date:</span>
					<span style="display:inline-block;width:110px;border-bottom:1px solid #000;text-align:left;padding-left:4px;font-size:10px;line-height:1.4;">${meta.date.trim() ? escapeHtml(meta.date) : "________________"}</span>
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

	<!-- Data table: fontSize 10px text-center -->
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

	<!-- BAC header: fontSize 10px marginTop 4px -->
	<div style="text-align:center;font-weight:bold;text-transform:uppercase;font-size:10px;margin-top:4px;">BY THE BIDS AND AWARDS COMMITTEE</div>

	<!-- Resolution body: mt-3(12px) fontSize 10px lineHeight 1.15 -->
	<div style="margin-top:12px;font-size:10px;line-height:1.15;">
		<!-- wider paragraph block for fewer wraps -->
		<div style="max-width:680px;margin:0 auto;text-align:justify;width:100%;">
			<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Based on the above abstract of quotation of prices offered by different leading dealers on various materials called for as above,</p>
			<p style="margin-top:4px;">the Committee found that:</p>
		</div>
		<!-- winning item line -->
		<div style="margin-top:4px;display:flex;flex-direction:column;gap:4px;text-align:left;max-width:560px;margin-left:auto;margin-right:auto;">
			${forItemLines}
		</div>
		<!-- WHEREOF paragraph -->
		<div style="max-width:720px;margin:8px auto 0;text-align:justify;width:100%;">
			<p style="margin-top:8px;margin-left:12px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;">WHEREOF</span>, considering the above premises, the members of the Bids and Awards Committee hereby recommend to the<br/>Head of the Procuring Entity the award of the aforementioned document to the lowest price quoted by the respective dealer/s.</p>
			<p style="margin-top:8px;margin-left:12px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;">RESOLVED</span> at the DAR Camarines Sur 1 Provincial Office, HL Building, Carnation St., Triangulo, Naga City this ${meta.date.trim() ? escapeHtml(formatDateLegal(meta.date)) : "____ day of ______, 20___"}</p>
		</div>
	</div>

	<!-- Chairperson: mt-10(40px) fontSize 10px lineHeight 1.1 -->
	<div style="margin-top:40px;text-align:center;font-size:10px;line-height:1.1;">
		<div style="font-weight:bold;text-transform:uppercase;">${escapeHtml(meta.bacChair)}</div>
		<div>BAC Chairperson</div>
	</div>

	<!-- Members: mt-5(20px) grid-cols-2 gap-x-10(40px) -->
	<div style="margin-top:20px;font-size:10px;line-height:1.1;">
		<table style="width:100%;border-collapse:collapse;border:none;">
			<tr>
				<td style="text-align:center;vertical-align:top;padding:0;border:none;width:50%;">
					<div style="font-weight:bold;text-transform:uppercase;">${escapeHtml(meta.bacViceChair)}</div>
					<div>BAC Vice-Chairperson</div>
				</td>
				<td style="text-align:center;vertical-align:top;padding:0;border:none;width:50%;">
					<div style="font-weight:bold;text-transform:uppercase;">${escapeHtml(meta.bacMember1)}</div>
					<div>BAC Member</div>
				</td>
			</tr>
			<!-- mt-8(32px) spacer -->
			<tr><td style="border:none;padding:0;height:32px;" colspan="2"></td></tr>
			<tr>
				<td style="text-align:center;vertical-align:top;padding:0;border:none;width:50%;">
					<div style="font-weight:bold;text-transform:uppercase;">${escapeHtml(meta.bacMember2)}</div>
					<div>BAC Member</div>
				</td>
				<td style="text-align:center;vertical-align:top;padding:0;border:none;width:50%;">
					<div style="font-weight:bold;text-transform:uppercase;">${escapeHtml(meta.bacMember3)}</div>
					<div>BAC Member</div>
				</td>
			</tr>
		</table>
	</div>

	<!-- Approved by: mt-7(28px) -->
	<div style="margin-top:28px;text-align:center;font-size:10px;">
		<div>APPROVED BY:</div>
		<!-- mt-6(24px) -->
		<div style="margin-top:24px;font-weight:bold;text-transform:uppercase;">${escapeHtml(meta.hope)}</div>
		<div>HOPE</div>
	</div>

	<!-- Footer: mt-6(24px) -->
	<div style="margin-top:24px;display:flex;align-items:flex-end;justify-content:space-between;font-size:10px;">
		<div>
			<div>ASA/LCO</div>
			<div>PhilGEPS Ref.</div>
		</div>
		<div style="font-weight:bold;">DARCS1-QF-STO-010 Rev 00</div>
	</div>

</div>
</body>
</html>`;
}

/**
 * Opens a new browser window and prints the live‑preview document.
 * The printed output reproduces the exact layout rendered by livePreview.tsx.
 *
 * Every spacing value below is derived 1:1 from the Tailwind classes used in
 * livePreview.tsx (e.g. mt-2 = 8px, gap-3 = 12px, px-6 = 24px, etc.).
 */
export function printLivePreview(
	meta: {
		refNo: string;
		canvassNo: string;
		prNo: string;
		date: string;
		bacChair: string;
		bacViceChair: string;
		bacMember1: string;
		bacMember2: string;
		bacMember3: string;
		hope: string;
	},
	cells: { value: string; isCenter?: boolean }[][],
	supplierNames: string[],
	supplierTotals: Record<string, number>,
	winningItems: string[],
) {
	const html = buildResolutionHtml(meta, cells, supplierNames, supplierTotals, winningItems);
	printWithIframe(html);
}
