import { escapeHtml } from "./printUtils";

export interface PRPrintItem {
  stock_no?: string | null;
  unit?: string | null;
  description?: string | null;
  quantity?: string | null;
  unit_price?: string | null;
}

export interface PRPrintData {
  prNo: string;
  entityName: string;
  fundCluster: string;
  officeSection: string;
  respCode: string;
  date: string;
  purpose: string;
  reqName: string;
  reqDesig: string;
  appName: string;
  appDesig: string;
  items: PRPrintItem[];
}

function getItemTotal(item: PRPrintItem): number {
  return (parseFloat(item.quantity ?? "0") || 0) * (parseFloat(item.unit_price ?? "0") || 0);
}

export function buildPRPrintHtml(data: PRPrintData): string {
  const itemRows: string[] = data.items.map((item) => {
    const total = getItemTotal(item);
    return `
      <tr style="height:16px">
        <td style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px)">${escapeHtml(item.stock_no)}</td>
        <td style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px)">${escapeHtml(item.unit)}</td>
        <td style="border:1px solid black;font-size:calc(8pt + 2px);padding:1px 4px;word-wrap:break-word;overflow-wrap:break-word">${item.description ?? ""}</td>
        <td style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px)">${escapeHtml(item.quantity)}</td>
        <td style="border:1px solid black;text-align:right;font-size:calc(8pt + 2px)">${item.unit_price ? "₱" + parseFloat(item.unit_price).toFixed(2) : ""}</td>
        <td style="border:1px solid black;text-align:right;font-size:calc(8pt + 2px)">${total > 0 ? "₱" + total.toFixed(2) : ""}</td>
      </tr>`;
  });

  while (itemRows.length < 20) {
    itemRows.push(`
      <tr style="height:16px">
        <td style="border:1px solid black"></td>
        <td style="border:1px solid black"></td>
        <td style="border:1px solid black"></td>
        <td style="border:1px solid black"></td>
        <td style="border:1px solid black"></td>
        <td style="border:1px solid black"></td>
      </tr>`);
  }
  const grandTotal = data.items.reduce((sum, item) => sum + getItemTotal(item), 0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Purchase Request - ${escapeHtml(data.prNo || "Draft")}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
     * { box-sizing: border-box; }
     html { margin: 0; padding: 0; }
     /* Add body margins to ensure printable content doesn't touch page edges
       (some browsers ignore @page margins or users set 'No margins' in print dialog) */
     body { margin: 15mm 20mm; padding: 0; font-family: 'Times New Roman', Times, serif; font-size: calc(9pt + 2px); color: #000; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .pr-table td, .pr-table th { border: 1px solid black; font-size: calc(8pt + 2px); padding: 1px 3px; font-family: 'Times New Roman', Times, serif; }
  </style>
</head>
<body>
  <table class="pr-table" style="color:#000">
    <colgroup>
      <col style="width:12%" />
      <col style="width:8%" />
      <col style="width:40%" />
      <col style="width:10%" />
      <col style="width:15%" />
      <col style="width:15%" />
    </colgroup>
    <tbody>
      <tr style="height:27px">
        <td colspan="6" style="border:none;text-align:right;font-size:calc(10pt + 2px);font-style:italic;font-weight:normal;padding-right:4px">Appendix 60</td>
      </tr>
      <tr style="height:52px">
        <td colspan="6" style="border:none;text-align:center;font-weight:bold;font-size:calc(12pt + 2px);vertical-align:top;padding-top:6px">PURCHASE REQUEST</td>
      </tr>
      <tr style="height:21px">
        <td colspan="3" style="border-bottom:1px solid black;border-top:none;border-left:none;border-right:none;font-size:calc(8pt + 2px);padding:2px 4px;font-weight:bold;white-space:nowrap;overflow:hidden">
          Entity Name: <span style="font-weight:normal">${data.entityName}</span>
        </td>
        <td colspan="3" style="border-bottom:1px solid black;border-top:none;border-left:none;border-right:none;font-size:calc(8pt + 2px);padding:2px 4px;font-weight:bold">
          Fund Cluster: <span style="font-weight:normal">${escapeHtml(data.fundCluster)}</span>
        </td>
      </tr>
      <tr style="height:14px">
        <td rowspan="2" colspan="2" style="border:1px solid black;font-size:calc(8pt + 2px);vertical-align:top;padding:2px 4px">
          Office/Section:<br/>${escapeHtml(data.officeSection)}
        </td>
        <td colspan="2" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;border-bottom:none;font-size:calc(8pt + 2px);font-weight:bold;padding:2px 4px">
          PR No.: <span style="font-weight:normal">${escapeHtml(data.prNo)}</span>
        </td>
        <td rowspan="2" colspan="2" style="border:1px solid black;font-size:calc(8pt + 2px);font-weight:bold;vertical-align:top;padding:2px 4px">
          Date:<br/><span style="font-weight:normal">${escapeHtml(data.date)}</span>
        </td>
      </tr>
      <tr style="height:15px">
        <td colspan="2" style="border-bottom:1px solid black;border-left:1px solid black;border-top:none;border-right:none;font-size:calc(8pt + 2px);font-weight:bold;padding:2px 4px">
          Responsibility Center Code: <span style="font-weight:normal">${escapeHtml(data.respCode)}</span>
        </td>
      </tr>
      <tr style="height:22.5px">
        <th style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px);padding:1px 3px">Stock/<br/>Property No.</th>
        <th style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px);padding:1px 3px">Unit</th>
        <th style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px);padding:1px 3px">Item Description</th>
        <th style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px);padding:1px 3px">Quantity</th>
        <th style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px);padding:1px 3px">Unit Cost</th>
        <th style="border:1px solid black;text-align:center;font-size:calc(8pt + 2px);padding:1px 3px">Total Cost</th>
      </tr>
      ${itemRows.join("")}
      <tr style="height:17px">
        <td colspan="5" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;border-bottom:none;font-size:calc(8.5pt + 2px);padding:2px 4px;text-align:right;font-weight:bold">TOTAL</td>
        <td style="border-top:1px solid black;border-right:1px solid black;text-align:right;font-size:calc(8.5pt + 2px);padding:2px 4px;font-weight:bold">${grandTotal > 0 ? "₱" + grandTotal.toFixed(2) : ""}</td>
      </tr>
      <tr style="height:17px">
        <td colspan="6" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;border-bottom:none;font-size:calc(8.5pt + 2px);padding:2px 4px;vertical-align:top">
          <b>Purpose:</b> ${data.purpose}
        </td>
      </tr>
      <tr style="height:30px">
        <td colspan="6" style="border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black;border-top:none"></td>
      </tr>
      <tr style="height:12px">
        <td style="border-top:1px solid black;border-left:1px solid black;border-bottom:none;border-right:none"></td>
        <td style="border-top:1px solid black;border-bottom:none;border-left:none;border-right:none"></td>
        <td colspan="2" style="border-top:1px solid black;border-bottom:none;border-left:none;border-right:none;font-size:calc(8.5pt + 2px);padding:2px 4px;text-align:center;transform:translateX(-40px)"><i>Requested by:</i></td>
        <td colspan="2" style="border-top:1px solid black;border-bottom:none;border-left:none;border-right:1px solid black;font-size:calc(8.5pt + 2px);padding:2px 4px;text-align:center;transform:translateX(-35px)"><i>Approved by:</i></td>
      </tr>
      <tr style="height:20px">
        <td colspan="2" style="border-left:1px solid black;border-top:none;border-bottom:none;border-right:none;font-size:calc(8.5pt + 2px);padding:2px 4px;vertical-align:bottom;text-align:center">Signature :</td>
        <td colspan="2" style="border:none;font-size:calc(8.5pt + 2px);text-align:center;vertical-align:bottom"></td>
        <td colspan="2" style="border-right:1px solid black;border-top:none;border-bottom:none;border-left:none;font-size:calc(8.5pt + 2px);text-align:center;vertical-align:bottom"></td>
      </tr>
      <tr style="height:20px">
        <td colspan="2" style="border-left:1px solid black;border-top:none;border-bottom:none;border-right:none;font-size:calc(8.5pt + 2px);padding:2px 4px;vertical-align:bottom;text-align:center">Printed Name :</td>
        <td colspan="2" style="border:none;font-size:calc(8.5pt + 2px);text-align:center;vertical-align:bottom;transform:translateX(-40px)"><b>${escapeHtml(data.reqName)}</b></td>
        <td colspan="2" style="border-right:1px solid black;border-top:none;border-bottom:none;border-left:none;font-size:calc(8.5pt + 2px);text-align:center;vertical-align:bottom;transform:translateX(-35px)"><b>${escapeHtml(data.appName)}</b></td>
      </tr>
      <tr style="height:20px">
        <td colspan="2" style="border-bottom:1px solid black;border-left:1px solid black;border-top:none;border-right:none;font-size:calc(8.5pt + 2px);padding:2px 4px;vertical-align:bottom;text-align:center">Designation :</td>
        <td colspan="2" style="border-bottom:1px solid black;border-top:none;border-left:none;border-right:none;font-size:calc(8.5pt + 2px);text-align:center;vertical-align:bottom;transform:translateX(-40px)">${escapeHtml(data.reqDesig)}</td>
        <td colspan="2" style="border-bottom:1px solid black;border-right:1px solid black;border-top:none;border-left:none;font-size:calc(8.5pt + 2px);text-align:center;vertical-align:bottom;transform:translateX(-35px)">${escapeHtml(data.appDesig)}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}
