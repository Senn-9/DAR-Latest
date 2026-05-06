/**
 * Opens a new browser window and prints the RFQ (Request for Quotation) document.
 * The printed output reproduces the layout from the provided photo.
 */
export function printRFQ(
	meta: { date: string; canvassNo: string; companyName: string; address: string; deadline: string; prNo: string },
	items: { stock_no: string; description: string; quantity: string; unit: string; unit_price: string }[],
) {
	function escapeHtml(str: string): string {
		if (!str) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	const bodyRows = items
		.map((item, index) => {
			return `
			<tr style="height: 22px;">
				<td class="cell" style="text-align:center;">${escapeHtml(item.stock_no || "")}</td>
				<td class="cell" style="text-align:left;padding-left:4px;">${escapeHtml(item.description || "")}</td>
				<td class="cell" style="text-align:center;">${escapeHtml(String(item.quantity || ""))}</td>
				<td class="cell" style="text-align:center;">${escapeHtml(item.unit || "")}</td>
				<td class="cell" style="text-align:center;">${escapeHtml(item.unit_price || "")}</td>
			</tr>`;
		})
		.join("");

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Request for Quotation - ${escapeHtml(meta.canvassNo || "Draft")}</title>
<style>
	@page {
		size: A4 portrait;
		margin: 8mm 10mm 8mm 10mm;
	}
	* { box-sizing: border-box; margin: 0; padding: 0; }
	body {
		font-family: Arial, Helvetica, sans-serif;
		font-size: 10px;
		line-height: 1.1;
		color: #000;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	table {
		border-collapse: collapse;
		table-layout: fixed;
		width: 100%;
		font-size: 9.5px;
	}
	.cell {
		border: 1px solid #000;
		padding: 2px;
	}
	.wrapper {
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
		padding: 0;
	}
	.top-section {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr;
		align-items: center;
		margin-bottom: 10px;
	}
	.revised {
		font-size: 9px;
	}
	.logos-container {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}
	.header-text {
		text-align: center;
	}
	.header-text .title {
		font-weight: bold;
		font-size: 11px;
	}
	.header-text .sub {
		font-size: 9px;
	}
	.meta-right {
		text-align: right;
		font-size: 10px;
	}
	.meta-line {
		display: flex;
		justify-content: flex-end;
		gap: 5px;
		margin-bottom: 2px;
		align-items: flex-end;
	}
	.underline-field {
		display: inline-block;
		border-bottom: 1px solid #000;
		min-width: 120px;
		text-align: left;
		padding-left: 5px;
	}
	.agency-header {
		text-align: center;
		margin: 15px 0 20px;
	}
	.agency-header .name {
		font-weight: bold;
		font-size: 12px;
	}
	.agency-header .sub {
		font-size: 10px;
	}
	.company-info {
		width: 45%;
		margin-bottom: 15px;
	}
	.company-field {
		text-align: center;
		border-bottom: 1px solid #000;
		margin-bottom: 2px;
		min-height: 16px;
	}
	.company-label {
		text-align: center;
		font-size: 9px;
		margin-bottom: 8px;
	}
	.instructions {
		text-align: justify;
		font-size: 10.5px;
		margin-bottom: 10px;
		line-height: 1.3;
	}
	.deadline-underline {
		display: inline-block;
		border-bottom: 1px solid #000;
		min-width: 150px;
		text-align: center;
	}
	.chairperson-block {
		float: right;
		text-align: center;
		margin-bottom: 15px;
		margin-right: 10px;
	}
	.chair-name {
		font-weight: bold;
		border-bottom: 1px solid #000;
		padding: 0 20px;
		font-size: 11px;
	}
	.chair-label {
		font-size: 10px;
		margin-top: 2px;
	}
	.notes-section {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 30px;
		font-size: 8.5px;
		margin-bottom: 15px;
		line-height: 1.1;
	}
	.note-item {
		display: flex;
		gap: 5px;
		margin-bottom: 2px;
	}
	.footer-section {
		display: flex;
		justify-content: space-between;
		margin-top: 10px;
	}
	.footer-left {
		width: 60%;
	}
	.served-by-names {
		font-weight: bold;
		text-decoration: underline;
		font-size: 10px;
		margin-bottom: 8px;
	}
	.canvasser-info {
		margin-top: 20px;
		font-size: 10px;
	}
	.footer-right {
		width: 35%;
	}
	.sig-line {
		border-bottom: 1px solid #000;
		height: 14px;
		margin-top: 10px;
	}
	.sig-label {
		text-align: center;
		font-size: 9px;
		margin-top: 2px;
	}
	.vat-box {
		border: 1px solid #000;
		padding: 5px;
		margin-top: 10px;
	}
	.vat-options {
		display: flex;
		justify-content: space-around;
		font-size: 10px;
		margin-bottom: 3px;
	}
	.check-box {
		width: 10px;
		height: 10px;
		border: 1px solid #000;
		display: inline-block;
		margin-right: 5px;
	}
	.doc-code {
		text-align: right;
		font-weight: bold;
		font-size: 9px;
		margin-top: 15px;
	}
</style>
</head>
<body>
<div class="wrapper">
	<div class="top-section">
		<div class="revised">Revised on May 24, 2004</div>
		<div class="logos-container">
			<img src="/temp_pic/image_1195822096_0.jpg" alt="Logo" style="height:55px;"/>
			<img src="/temp_pic/image_1195822096_1.jpg" alt="Logo" style="height:55px;"/>
			<div class="header-text">
				<div class="title" style="font-size: 10px;">REPUBLIC OF THE PHILIPPINES</div>
				<div class="title" style="font-size: 12px;">DEPARTMENT OF AGRARIAN REFORM</div>
				<div class="sub" style="font-style: italic; margin-top: 2px;">Tunay na Pagbabago sa Repormang Agraryo</div>
			</div>
			<img src="/temp_pic/image_1195822096_2.jpg" alt="Logo" style="height:55px;"/>
			<!-- Invisible spacer to balance the two logos on the left -->
			<div style="width: 55px; height: 55px; margin-left: 10px;"></div>
		</div>
		<div class="meta-right">
			<div class="meta-line">
				<span>Date:</span>
				<span class="underline-field">${escapeHtml(meta.date)}</span>
			</div>
			<div class="meta-line">
				<span style="font-style: italic;">Canvass No.:</span>
				<span class="underline-field">${escapeHtml(meta.canvassNo)}</span>
			</div>
		</div>
	</div>

	<div class="agency-header">
		<div class="name">DEPARTMENT OF AGRARIAN REFORM</div>
		<div class="sub">Agency/Procuring Entity</div>
	</div>

	<div class="company-info">
		<div class="company-field">${escapeHtml(meta.companyName)}</div>
		<div class="company-label">(Company Name)</div>
		<div class="company-field" style="margin-top: 8px;">${escapeHtml(meta.address)}</div>
		<div class="company-label">(Address)</div>
	</div>

	<div class="instructions">
		Please quote your lowest price on the item/s listed below, subject to the General Conditions indicated below, stating the shortest time of delivery and submit your quotation duly signed by you or your duly authorized representative not later than 
		<span class="deadline-underline">${escapeHtml(meta.deadline || "________________")}</span>
	</div>

	<div class="chairperson-block">
		<div class="chair-name">ATTY. JAIME G. RESOCO, JR.</div>
		<div class="chair-label">BAC Chairperson</div>
	</div>

	<div style="clear: both;"></div>

	<div class="notes-section">
		<div>
			<div class="note-item">
				<span style="font-weight: bold;">NOTE:</span>
				<div>
					<div class="note-item"><span>1.</span> <span>ALL ENTRIES MUST BE WRITTEN LEGIBLY.</span></div>
					<div class="note-item"><span>2.</span> <span>QUOTATION MUST BE RETURNED IN A SEALED ENVELOPE NO LONGER THAN THREE (3) DAYS UPON RECEIPT.</span></div>
					<div class="note-item"><span>3.</span> <span>PRICE QUOTATIONS MUST INDICATE PRICE/S, SERVICE/DELIVERY CHARGES INCLUSIVE OF VAT/OTHER CHARGES. IF NON-INCLUSIVE, PLEASE INDICATE FIGURES FOR VAT.</span></div>
					<div class="note-item"><span>4.</span> <span>PRICE VALIDITY SHALL BE FOR A PERIOD OF <u>180 CALENDAR DAYS.</u></span></div>
				</div>
			</div>
		</div>
		<div>
			<div class="note-item"><span>5.</span> <span>DELIVERY PERIOD WITHIN <u>SEVEN (7) DAYS</u> UPON RECEIPT OF PURCHASE ORDER.</span></div>
			<div class="note-item"><span>6.</span> <span>WARRANTY SHALL BE FOR A PERIOD OF SIX (6) MONTHS FOR SUPPLIES & MATERIALS, ONE (1) YEAR FOR EQUIPMENT FROM DATE OF ACCEPTANCE BY THE PROCURING ENTITY.</span></div>
			<div class="note-item"><span>7.</span> <span>I / WE ARE BOUND TO DELIVER THE ITEM/S PER OUR QUOTATION PURSUANT TO THE PROVISIONS OR SANCTIONS UNDER RA 9184. PURSUANT TO THE PROVISIONS OR SANCTIONS UNDER RA 9184.</span></div>
		</div>
	</div>

	<table>
		<colgroup>
			<col style="width: 8%;"/>
			<col style="width: 58%;"/>
			<col style="width: 8%;"/>
			<col style="width: 10%;"/>
			<col style="width: 16%;"/>
		</colgroup>
		<thead>
			<tr style="height: 25px;">
				<th class="cell">ITEM NO.</th>
				<th class="cell">ITEM(S) & DESCRIPTION(S)</th>
				<th class="cell">QTY</th>
				<th class="cell">UNIT</th>
				<th class="cell">UNIT PRICE</th>
			</tr>
		</thead>
		<tbody>
			${bodyRows}
			<tr style="height: 22px; font-weight: bold; text-align: center;">
				<td class="cell"></td>
				<td class="cell">TOTAL</td>
				<td class="cell"></td>
				<td class="cell"></td>
			</tr>
		</tbody>
	</table>

	<div style="text-align: center; font-weight: bold; font-style: italic; font-size: 10px; margin: 15px 0;">
		AFTER HAVING CAREFULLY READ AND ACCEPTED YOUR GENERAL CONDITIONS, I / WE QUOTE YOU ON THE ITEM AT PRICES NOTED ABOVE.
	</div>

	<div class="footer-section">
		<div class="footer-left">
			<div style="margin-bottom: 10px;">Served by:</div>
			<div class="served-by-names">IMELDA R. BALAAG / JACOB K. GUEVARRA / ANTHONY KEVIN D. TEJADA / RUBEN R. VELASCO III</div>
			<div class="served-by-names">SANTOS CLOYD PAPA / ELDA D. EMILA / JOAN MIRZI CALLO / FRANCES JOY DE SILVA</div>
			<div class="canvasser-info">
				<div style="font-weight: bold;">CANVASSER</div>
				<div>ECT/asa</div>
				<div>${escapeHtml(meta.prNo)}</div>
			</div>
		</div>
		<div class="footer-right">
			<div class="sig-line"></div>
			<div class="sig-label">PRINTED NAME/SIGNATURE</div>
			
			<div class="sig-line"></div>
			<div class="sig-label">Tel No./Cellphone No./Email Address</div>

			<div class="sig-line"></div>
			<div class="sig-label">PhilGeps Registration Number</div>

			<div class="sig-line"></div>
			<div class="sig-label">BIR-TIN</div>

			<div class="vat-box">
				<div class="vat-options">
					<div class="flex items-center"><span class="check-box"></span> VAT</div>
					<div class="flex items-center"><span class="check-box"></span> NON-VAT</div>
				</div>
				<div style="text-align: center; font-weight: bold; font-size: 9px;">(Please check - VAT or NON-VAT)</div>
			</div>
			<div class="doc-code">DARCS1-QF-STO-009 Rev 01</div>
		</div>
	</div>
</div>
</body>
</html>`;

	const printWindow = window.open("", "_blank");
	if (!printWindow) return;
	printWindow.document.write(html);
	printWindow.document.close();

	printWindow.onload = () => {
		printWindow.focus();
		printWindow.print();
	};
}
