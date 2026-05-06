export type RFQMeta = {
	date: string;
	canvassNo: string;
	companyName: string;
	address: string;
	deadline: string;
	prNo: string;
};

export type RFQItem = {
	stock_no: string;
	description: string;
	quantity: string;
	unit: string;
	unit_price: string;
};

export function buildRFQHtml(meta: RFQMeta, items: RFQItem[]) {
	const MIN_PRINT_ROWS = 10;

	function escapeHtml(str: string): string {
		if (!str) return "";
		return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}

	// Show all items, pad with empty rows to reach minimum
	const printableItems = [...items];
	while (printableItems.length < MIN_PRINT_ROWS) {
		printableItems.push({ stock_no: "", description: "", quantity: "", unit: "", unit_price: "" });
	}

	const bodyRows = printableItems
		.map(
			(item) => `
			<tr class="h-7">
				<td class="cell text-center">${escapeHtml(item.stock_no || "")}</td>
				<td class="cell text-left px-1">${escapeHtml(item.description || "")}</td>
				<td class="cell text-center">${escapeHtml(String(item.quantity || ""))}</td>
				<td class="cell text-center">${escapeHtml(item.unit || "")}</td>
				<td class="cell text-center">${escapeHtml(item.unit_price || "")}</td>
			</tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Request for Quotation - ${escapeHtml(meta.canvassNo || "Draft")}</title>
<style>
	@page { size: A4 portrait; margin: 0; }
	* { box-sizing: border-box; margin: 0; padding: 0; }
	body {
		color: #000;
		background: #fff;
		font-family: "Arial Narrow", Arial, Helvetica, sans-serif;
		font-size: 10px;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.page {
		width: 100%;
		max-width: 850px;
		min-height: 1100px;
		margin: 0 auto;
		padding: 48px 28px;
	}
	.top-grid {
		display: grid;
		grid-template-columns: 1fr 3fr 1fr;
		align-items: start;
		margin-bottom: 8px;
	}
	.header-center {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 12px;
	}
	.h12 { width: 56px; height: 56px; object-fit: contain; }
	.h12.rounded { border-radius: 6px; margin-left: 4px; }
	.invisible-spacer { width: 56px; height: 56px; margin-left: 12px; }
	.gov-text { padding-top: 4px; text-align: center; margin: 0 2px; }
	.gov-text .a { font-size: 11px; font-weight: 700; letter-spacing: 0.01em; white-space: nowrap; }
	.gov-text .b { font-size: 10px; font-weight: 400; white-space: nowrap; }
	.meta-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 24px;
	}
	.meta-right { text-align: right; }
	.meta-line {
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		gap: 8px;
		margin-bottom: 4px;
	}
	.meta-label { font-size: 10px; }
	.line-field {
		border-bottom: 1px solid #000;
		width: 100px;
		text-align: left;
		padding: 0 4px 1px;
		font-size: 10px;
		min-height: 14px;
	}
	.agency {
		text-align: center;
		margin-bottom: 8px;
	}
	.agency .title { font-weight: 700; font-size: 12px; text-transform: uppercase; }
	.agency .sub { font-size: 12px; }
	.company {
		width: 25%;
		margin-bottom: 8px;
	}
	.company .input-line {
		border-bottom: 1px solid #000;
		width: 100%;
		text-align: center;
		padding: 2px 0;
		min-height: 16px;
	}
	.company .label {
		font-size: 12px;
		text-align: center;
		margin-top: 2px;
	}
	.instructions {
		margin-bottom: 24px;
		font-size: 12px;
	}
	.instructions p {
		position: relative;
		line-height: 1.625;
		text-align: justify;
		text-indent: 24px;
	}
	.deadline {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 108px;
		border-bottom: 1px solid #000;
		text-align: center;
	}
	.sign-block {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 16px;
	}
	.sign-wrap { text-align: center; margin-right: 8px; }
	.sign-name {
		font-weight: 700;
		border-bottom: 1px solid #000;
		padding: 0 16px;
		font-size: 12px;
	}
	.sign-role { font-size: 12px; }
	.notes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		font-size: 8px;
		line-height: 1.1;
		margin-bottom: 8px;
	}
	.note-line { display: flex; gap: 8px; margin-bottom: 4px; }
	.notes-right { margin-left: -52px; }
	ulike { text-decoration: underline; font-weight: 700; }
	table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
	.cell { border: 1px solid #000; padding: 2px; }
	th.cell { text-align: center; padding: 4px; font-weight: 700; }
	.col1 { width: 8%; } .col2 { width: 58%; } .col3 { width: 8%; } .col4 { width: 10%; } .col5 { width: 16%; }
	.h-7 { height: 20px; }
	.text-center { text-align: center; } .text-left { text-align: left; } .px-1 { padding-left: 4px; padding-right: 4px; }
	.quote {
		text-align: center;
		font-weight: 700;
		font-style: italic;
		font-size: 10px;
		margin-bottom: 16px;
	}
	.footer {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.footer-left { width: 60%; }
	.names { font-weight: 700; text-decoration: underline; font-size: 11px; line-height: 1.25; white-space: nowrap; }
	.names + .names { margin-top: 16px; white-space: normal; }
	.canvasser { margin-top: 32px; font-size: 11px; }
	.footer-right { width: 30%; }
	.sig { text-align: center; margin-bottom: 16px; }
	.sig .line { border-bottom: 1px solid #000; height: 16px; margin-bottom: 2px; }
	.sig .label { font-size: 9px; }
	.vat-box { border: 1px solid #000; padding: 8px; margin-top: 8px; }
	.vat-options { display: flex; justify-content: space-around; margin-bottom: 4px; font-size: 10px; }
	.chk { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; margin-right: 4px; vertical-align: middle; }
	.vat-label { text-align: center; font-weight: 700; font-size: 9px; }
	.doc-code { text-align: right; font-weight: 700; margin-top: 16px; font-size: 9px; }
</style>
</head>
<body>
<div class="page">
	<div class="top-grid">
		<div></div>
		<div class="header-center">
			<img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" class="h12" />
			<img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" class="h12" />
			<div class="gov-text">
				<div class="a">REPUBLIC OF THE PHILIPPINES</div>
				<div class="a">DEPARTMENT OF AGRARIAN REFORM</div>
				<div class="b">Tunay na Pagbabago sa Repormang Agraryo</div>
			</div>
			<img src="/temp_pic/image_1195822096_2.jpg" alt="ISO certified" class="h12 rounded" />
			<div class="invisible-spacer" aria-hidden="true"></div>
		</div>
		<div></div>
	</div>

	<div class="meta-row">
		<div style="font-size:10px; white-space:nowrap;">Revised on May 24, 2004</div>
		<div class="meta-right">
			<div class="meta-line">
				<span class="meta-label">Date:</span>
				<div class="line-field">${escapeHtml(meta.date)}</div>
			</div>
			<div class="meta-line" style="margin-bottom:0;">
				<span class="meta-label">Canvass No.:</span>
				<div class="line-field">${escapeHtml(meta.canvassNo)}</div>
			</div>
		</div>
	</div>

	<div class="agency">
		<div class="title">Department of Agrarian Reform</div>
		<div class="sub">Agency/Procuring Entity</div>
	</div>

	<div class="company">
		<div style="margin-bottom:8px;">
			<div class="input-line">${escapeHtml(meta.companyName)}</div>
			<div class="label">(Company Name)</div>
		</div>
		<div>
			<div class="input-line">${escapeHtml(meta.address)}</div>
			<div class="label">(Address)</div>
		</div>
	</div>

	<div class="instructions">
		<p>
			Please quote your lowest price on the item/s listed below, subject to the General Conditions indicated below, stating the shortest time of delivery
			<br />and submit your quotation duly signed by you or your duly authorized representative not later than
			<span class="deadline">${escapeHtml(meta.deadline)}</span>
		</p>
	</div>

	<div class="sign-block">
		<div class="sign-wrap">
			<div class="sign-name">ATTY. JAIME G. RESOCO, JR.</div>
			<div class="sign-role">BAC Chairperson</div>
		</div>
	</div>

	<div class="notes">
		<div>
			<div class="note-line">
				<span style="font-weight:700;">NOTE:</span>
				<div>
					<div class="note-line"><span>1.</span><span>ALL ENTRIES MUST BE WRITTEN LEGIBLY.</span></div>
					<div class="note-line"><span>2.</span><span>QUOTATION MUST BE RETURNED IN A SEALED ENVELOPE <br /> NO LONGER THAN THREE (3) DAYS UPON RECEIPT.</span></div>
					<div class="note-line"><span>3.</span><span>PRICE QUOTATIONS MUST INDICATE PRICE/S, SERVICE/<br />DELIVERY CHARGES INCLUSIVE OF VAT/OTHER CHARGES. IF<br />NON-INCLUSIVE, PLEASE INDICATE FIGURES FOR VAT.</span></div>
					<div class="note-line"><span>4.</span><span>PRICE VALIDITY SHALL BE FOR A PERIOD OF <ulike>180 CALENDAR<br />DAYS.</ulike></span></div>
				</div>
			</div>
		</div>
		<div class="notes-right">
			<div class="note-line"><span>5.</span><span>DELIVERY PERIOD WITHIN <ulike>SEVEN (7) DAYS</ulike> UPON RECEIPT<br />OF PURCHASE ORDER.</span></div>
			<div class="note-line"><span>6.</span><span>WARRANTY SHALL BE FOR A PERIOD OF SIX (6) MONTHS FOR<br />SUPPLIES & MATERIALS, ONE (1) YEAR FOR EQUIPMENT FROM<br />DATE OF ACCEPTANCE BY THE PROCURING ENTITY.</span></div>
			<div class="note-line"><span>7.</span><span>I / WE ARE BOUND TO DELIVER THE ITEM/S PER OUR QUOTATION<br />PURSUANT TO THE PROVISIONS OR SANCTIONS UNDER RA 9184.<br />PURSUANT TO THE PROVISIONS OR SANCTIONS UNDER RA 9184.</span></div>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th class="cell col1">ITEM NO.</th>
				<th class="cell col2">ITEM(S) & DESCRIPTION(S)</th>
				<th class="cell col3">QTY</th>
				<th class="cell col4">UNIT</th>
				<th class="cell col5" style="padding:0;">
					<div style="display:flex; min-height:30px; height:100%; flex-direction:column;">
						<span style="flex:1; align-content:center; padding:0 4px;">UNIT</span>
						<span style="border-top:1px solid #000; padding:0 4px;">PRICE</span>
					</div>
				</th>
			</tr>
		</thead>
		<tbody>
			${bodyRows}
			<tr class="h-7" style="font-weight:700;">
				<td class="cell"></td>
				<td class="cell text-center">TOTAL</td>
				<td class="cell"></td>
				<td class="cell"></td>
				<td class="cell"></td>
			</tr>
		</tbody>
	</table>

	<div class="quote">
		AFTER HAVING CAREFULLY READ AND ACCEPTED YOUR GENERAL CONDITIONS, I / WE QUOTE YOU ON THE ITEM AT PRICES NOTED ABOVE.
	</div>

	<div class="footer">
		<div class="footer-left">
			<div style="margin-bottom:16px; font-size:11px;">Served by:</div>
			<div class="names">IMELDA R. BALAAG / JACOB K. GUEVARRA / ANTHONY KEVIN D. TEJADA / RUBEN R. VELASCO III</div>
			<div class="names">SANTOS CLOYD PAPA / ELDA D. EMILA / JOAN MIRZI CALLO / FRANCES JOY DE SILVA</div>
			<div class="canvasser">
				<div class="b">CANVASSER</div>
				<div>ECT/asa</div>
				<div>${escapeHtml(meta.prNo)}</div>
			</div>
		</div>
		<div class="footer-right">
			<div class="sig"><div class="line"></div><div class="label">PRINTED NAME/SIGNATURE</div></div>
			<div class="sig"><div class="line"></div><div class="label">Tel No./Cellphone No./Email Address</div></div>
			<div class="sig"><div class="line"></div><div class="label">PhilGeps Registration Number</div></div>
			<div class="sig"><div class="line"></div><div class="label">BIR-TIN</div></div>
			<div class="vat-box">
				<div class="vat-options">
					<div><span class="chk"></span> VAT</div>
					<div><span class="chk"></span> NON-VAT</div>
				</div>
				<div class="vat-label">(Please check - VAT or NON-VAT)</div>
			</div>
			<div class="doc-code">DARCS1-QF-STO-009 Rev 01</div>
		</div>
	</div>
</div>
</body>
</html>`;
}

/**
 * Opens a new browser window and prints the RFQ document.
 */
export function printRFQ(meta: RFQMeta, items: RFQItem[]) {
	const html = buildRFQHtml(meta, items);
	const printWindow = window.open("", "_blank");
	if (!printWindow) return;
	printWindow.document.write(html);
	printWindow.document.close();
	printWindow.onload = () => {
		printWindow.focus();
		printWindow.print();
	};
}
