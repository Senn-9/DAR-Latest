import { escapeHtml, formatMoney, toWords } from "./printUtils";

export interface POPrintItem {
  stock_no?: string | null;
  unit?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  subtotal?: number | null;
}

export interface POPrintData {
  poNo: string;
  prNo?: string | null;
  supplier: string;
  address: string;
  tin: string;
  procurementMode: string;
  deliveryPlace: string;
  deliveryTerm: string;
  deliveryDate: string;
  paymentTerm: string;
  fundCluster: string;
  items: POPrintItem[];
  poDate?: string | null;
  createdAt?: string | null;
  officialName?: string | null;
  officialDesig?: string | null;
  conformeDate?: string | null;
  accountantName?: string | null;
  accountantDesig?: string | null;
  orsNo?: string | null;
  orsDate?: string | null;
  fundsAvailable?: string | null;
  orsAmount?: number | null;
  hideTotalRow?: boolean | null;
}

function getItemTotal(item: POPrintItem): number {
  const qty = Number(item.quantity ?? 0);
  const price = Number(item.unit_price ?? 0);
  return Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
}

function getGrandTotal(items: POPrintItem[]): number {
  return items.reduce((sum, item) => sum + getItemTotal(item), 0);
}

function formatDocumentDate(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(String(value));
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildPurchaseOrderPrintHtml(data: POPrintData): string {
  const grandTotal = getGrandTotal(data.items);
  const amountWords = toWords(grandTotal);
  const today = new Date().toISOString().slice(0, 10);
  const displayDate = data.poDate || today;
  const footerMeta = [data.prNo, formatDocumentDate(data.createdAt)]
    .filter((value) => String(value ?? "").trim() !== "")
    .map((value) => escapeHtml(String(value)))
    .join("  | ");

  const normalizedItems = data.items.filter(
    (item) =>
      String(item.description ?? "").trim() ||
      String(item.stock_no ?? "").trim() ||
      String(item.unit ?? "").trim() ||
      Number(item.quantity ?? 0) > 0 ||
      Number(item.unit_price ?? 0) > 0,
  );

  const cellBorder = "border:1px solid #111";

  let itemRows = "";
  for (const item of normalizedItems) {
    const qty = Number(item?.quantity ?? 0);
    const unitCost = Number(item?.unit_price ?? 0);
    const amount = item ? getItemTotal(item) : 0;
    itemRows += `
        <tr style="height:auto">
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(item?.stock_no ?? "")}</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(item?.unit ?? "")}</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt;word-wrap:break-word;overflow-wrap:break-word">${item?.description ?? ""}</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${qty ? String(qty) : ""}</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${unitCost ? formatMoney(unitCost).replace("\u20b1", "") : ""}</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${amount ? formatMoney(amount).replace("\u20b1", "") : ""}</td>
        </tr>`;
  }

  if (normalizedItems.length === 0) {
    itemRows = `
        <tr style="height:auto">
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="${cellBorder};vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
        </tr>`;
  }

  const accountantSig = `<div style="border-bottom:1px solid #111;width:80%;margin:20px auto 0;font-size:9pt;font-weight:bold;text-align:center;padding-bottom:2px">${escapeHtml(data.accountantName || "")}</div>
       <div style="text-align:center;font-size:9pt">Signature over Printed Name of Chief Accountant/Head of Accounting Division/Unit</div>`;

  const officialSig = "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Purchase Order - ${escapeHtml(data.poNo)}</title>
  <style>
    @page { size: A4; margin: 5mm 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; color: #000; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .po-table td, .po-table th { border: 1px solid #111; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 9pt; }
    .po-footer { page-break-inside: avoid; }
  </style>
</head>
<body>
  <table style="margin-bottom:8px;border:none">
    <tr><td style="border:none;text-align:right;font-size:10pt;font-weight:normal;font-style:italic;padding:0">Appendix 61</td></tr>
  </table>

  <div style="border-radius:30px;padding:10px 12px 8px;margin:0 18px 10px">
    <div style="text-align:center;font-size:16pt;font-weight:bold;letter-spacing:0.5px">PURCHASE ORDER</div>
    <div style="text-align:center;font-size:10.5pt;font-weight:bold">DEPARTMENT OF AGRARIAN REFORM - CAMARINES SUR 1</div>
  </div>

  <table class="po-table" style="border:2px solid #111;">
    <colgroup>
      <col style="width:14%" />
      <col style="width:11%" />
      <col style="width:34%" />
      <col style="width:16%" />
      <col style="width:10.5%" />
      <col style="width:14.5%" />
    </colgroup>
    <tbody>
      <tr>
        <td colspan="3" style="${cellBorder};padding:2px 4px;font-size:9pt;font-weight:bold">Supplier : <span style="font-weight:normal">${data.supplier}</span></td>
        <td colspan="3" style="${cellBorder};padding:2px 4px;font-size:9pt;font-weight:bold">P.O. No. : <span style="font-weight:normal">${escapeHtml(data.poNo)}</span></td>
      </tr>
      <tr>
        <td colspan="3" style="${cellBorder};padding:2px 4px;font-size:9pt;font-weight:bold">Address : <span style="font-weight:normal">${data.address}</span></td>
        <td colspan="3" style="${cellBorder};padding:2px 4px;font-size:9pt;font-weight:bold">Date : <span style="font-weight:normal">${displayDate}</span></td>
      </tr>
      <tr>
        <td colspan="3" style="${cellBorder};padding:2px 4px;font-size:9pt;font-weight:bold">TIN : <span style="font-weight:normal">${escapeHtml(data.tin)}</span></td>
        <td colspan="3" style="${cellBorder};padding:2px 4px;font-size:9pt;font-weight:bold">Mode of Procurement : <span style="font-weight:normal">${escapeHtml(data.procurementMode)}</span></td>
      </tr>
      <tr>
        <td colspan="6" style="${cellBorder};padding:3px 4px;font-size:9pt;font-weight:bold;vertical-align:top">Gentlemen:<div style="font-weight:normal;margin-left:52px">Please furnish this Office the following articles subject to the terms and conditions contained herein:</div></td>
      </tr>
      <tr>
        <td colspan="3" style="${cellBorder};padding:3px 4px;font-size:9pt;font-weight:bold">Place of Delivery : <span style="font-weight:normal">${data.deliveryPlace}</span></td>
        <td colspan="3" style="${cellBorder};padding:3px 4px;font-size:9pt;font-weight:bold">Delivery Term : <span style="font-weight:normal">${data.deliveryTerm}</span><div style="font-weight:bold;margin-top:2px">Payment Term : <span style="font-weight:normal">${data.paymentTerm}</span></div></td>
      </tr>
      <tr>
        <td colspan="3" style="${cellBorder};padding:3px 4px;font-size:9pt;font-weight:bold">Date of Delivery : <span style="font-weight:normal">${data.deliveryDate}</span></td>
        <td colspan="3" style="${cellBorder};padding:3px 4px;font-size:9pt"></td>
      </tr>
      <tr>
        <th style="${cellBorder};padding:4px 2px" class="center bold small">Stock/ Property No.</th>
        <th style="${cellBorder};padding:4px 2px" class="center bold small">Unit</th>
        <th style="${cellBorder};padding:4px 2px" class="center bold small">Description</th>
        <th style="${cellBorder};padding:4px 2px" class="center bold small">Quantity</th>
        <th style="${cellBorder};padding:4px 2px" class="center bold small">Unit Cost</th>
        <th style="${cellBorder};padding:4px 2px" class="center bold small">Amount</th>
      </tr>
      ${itemRows}
      ${!data.hideTotalRow ? `<tr>
        <td colspan="5" style="${cellBorder};padding:3px 6px;font-size:9pt;font-weight:bold;text-align:right">TOTAL :</td>
        <td style="${cellBorder};padding:3px 4px;font-size:9pt;font-weight:bold;text-align:right">${grandTotal ? formatMoney(grandTotal).replace("\u20b1", "") : ""}</td>
      </tr>` : ""}
      <tr>
        <td colspan="6" style="${cellBorder};padding:3px 6px;font-size:9pt"><span style="font-weight:bold">(Total Amount in Words) </span>${amountWords}</td>
      </tr>
      <tr>
        <td colspan="6" style="${cellBorder};padding:0">
          <div style="padding:8px 10px 8px 20px;font-size:9pt;line-height:1.28">In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.</div>
          <table style="border:none;width:100%">
            <tr>
              <td style="border:none;padding:10px 8px 6px;font-size:9pt;width:50%">Conforme:</td>
              <td style="border:none;padding:10px 8px 6px;font-size:9pt;text-align:left;width:50%">Very truly yours,</td>
            </tr>
            <tr>
              <td style="border:none;padding:24px 8px 0;text-align:center">
                <div style="border-bottom:1px solid #111;width:85%;margin:0 auto;font-size:9pt;font-weight:bold;text-align:center;padding-bottom:2px">${data.supplier}</div>
              </td>
              <td style="border:none;padding:24px 8px 0;text-align:center">
                <div style="border-bottom:1px solid #111;width:85%;margin:0 auto;font-size:9pt;font-weight:bold;text-align:center;padding-bottom:2px">${escapeHtml(data.officialName || "")}</div>
              </td>
            </tr>
            <tr>
              <td style="border:none;padding:2px 8px;text-align:center;font-size:9pt">Signature over Printed Name of Supplier</td>
              <td style="border:none;padding:2px 8px;text-align:center;font-size:9pt">Signature over Printed Name of Authorized Official</td>
            </tr>
            <tr>
              <td style="border:none;padding:8px 8px 2px;text-align:center"><div style="border-bottom:1px solid #111;width:85%;margin:0 auto;font-size:9pt;text-align:center;padding-bottom:2px">${escapeHtml(data.conformeDate || "")}</div></td>
              <td style="border:none;padding:4px 8px 2px;text-align:center"><div style="border-bottom:1px solid #111;width:85%;margin:0 auto;font-size:9pt;text-align:center;padding-bottom:2px">${escapeHtml(data.officialDesig || "")}</div></td>
            </tr>
            <tr>
              <td style="border:none;padding:2px 8px 10px;text-align:center;font-size:9pt">Date</td>
              <td style="border:none;padding:2px 8px 10px;text-align:center;font-size:9pt">Designation</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="3" style="${cellBorder};vertical-align:top;padding:10px 8px;height:135px">
          <div style="font-size:10pt;margin-bottom:8px"><b>Fund Cluster :</b> ${escapeHtml(data.fundCluster)}</div>
          <div style="font-size:10pt;margin-bottom:8px"><b>Funds Available :</b> ${escapeHtml(data.fundsAvailable || "")}</div>
          ${accountantSig}
        </td>
        <td colspan="3" style="${cellBorder};vertical-align:top;padding:10px 8px;height:135px">
          <div style="font-size:10pt;margin-bottom:8px"><b>ORS No. :</b> ${escapeHtml(data.orsNo)}</div>
          <div style="font-size:10pt;margin-bottom:8px"><b>Date of the ORS:</b> ${escapeHtml(data.orsDate)}</div>
          <div style="font-size:10pt"><b>Amount :</b> ${data.orsAmount ? formatMoney(data.orsAmount) : (grandTotal ? formatMoney(grandTotal) : "")}</div>
          ${officialSig}
        </td>
      </tr>
    </tbody>
  </table>
  ${footerMeta ? `<div style="margin-top:6px;font-size:8pt;font-style:italic;color:#444">${footerMeta}</div>` : ""}
</body>
</html>`;
}
