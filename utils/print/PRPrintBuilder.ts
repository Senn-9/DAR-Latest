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
        <td style="border:1px solid black;text-align:center;font-size:8pt">${escapeHtml(item.stock_no)}</td>
        <td style="border:1px solid black;text-align:center;font-size:8pt">${escapeHtml(item.unit)}</td>
        <td style="border:1px solid black;text-align:left;font-size:8pt;padding:1px 4px">${escapeHtml(item.description)}</td>
        <td style="border:1px solid black;text-align:center;font-size:8pt">${escapeHtml(item.quantity)}</td>
        <td style="border:1px solid black;text-align:right;font-size:8pt">${item.unit_price ? "\u20b1" + parseFloat(item.unit_price).toFixed(2) : ""}</td>
        <td style="border:1px solid black;text-align:right;font-size:8pt">${total > 0 ? "\u20b1" + total.toFixed(2) : ""}</td>
      </tr>`;
  });

  while (itemRows.length < 30) {
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Purchase Request - ${escapeHtml(data.prNo || "Draft")}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 9pt; color: #000; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .pr-table td, .pr-table th { border: 1px solid black; font-size: 8pt; padding: 1px 3px; font-family: 'Times New Roman', Times, serif; }
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
        <td colspan="6" style="border:none;text-align:right;font-size:10pt;font-style:italic;font-weight:normal;padding-right:4px">Appendix 60</td>
      </tr>
      <tr style="height:34px">
        <td colspan="6" style="border:none;text-align:center;font-weight:bold;font-size:12pt">PURCHASE REQUEST</td>
      </tr>
      <tr style="height:21px">
        <td colspan="3" style="border-bottom:1px solid black;border-top:none;border-left:none;border-right:none;font-size:8pt;padding:2px 4px;font-weight:bold;white-space:nowrap;overflow:hidden">
          Entity Name: <span style="font-weight:normal">${escapeHtml(data.entityName)}</span>
        </td>
        <td colspan="3" style="border-bottom:1px solid black;border-top:none;border-left:none;border-right:none;font-size:8pt;padding:2px 4px;font-weight:bold">
          Fund Cluster: <span style="font-weight:normal">${escapeHtml(data.fundCluster)}</span>
        </td>
      </tr>
      <tr style="height:14px">
        <td rowspan="2" colspan="2" style="border:1px solid black;font-size:8pt;vertical-align:top;padding:2px 4px">
          Office/Section:<br/>${escapeHtml(data.officeSection)}
        </td>
        <td colspan="2" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;border-bottom:none;font-size:8pt;font-weight:bold;padding:2px 4px">
          PR No.: <span style="font-weight:normal">${escapeHtml(data.prNo)}</span>
        </td>
        <td rowspan="2" colspan="2" style="border:1px solid black;font-size:8pt;font-weight:bold;vertical-align:top;padding:2px 4px">
          Date:<br/><span style="font-weight:normal">${escapeHtml(data.date)}</span>
        </td>
      </tr>
      <tr style="height:15px">
        <td colspan="2" style="border-bottom:1px solid black;border-left:1px solid black;border-top:none;border-right:none;font-size:8pt;font-weight:bold;padding:2px 4px">
          Responsibility Center Code: <span style="font-weight:normal">${escapeHtml(data.respCode)}</span>
        </td>
      </tr>
      <tr style="height:22.5px">
        <th style="border:1px solid black;text-align:center;font-size:8pt;padding:1px 3px">Stock/<br/>Property No.</th>
        <th style="border:1px solid black;text-align:center;font-size:8pt;padding:1px 3px">Unit</th>
        <th style="border:1px solid black;text-align:center;font-size:8pt;padding:1px 3px">Item Description</th>
        <th style="border:1px solid black;text-align:center;font-size:8pt;padding:1px 3px">Quantity</th>
        <th style="border:1px solid black;text-align:center;font-size:8pt;padding:1px 3px">Unit Cost</th>
        <th style="border:1px solid black;text-align:center;font-size:8pt;padding:1px 3px">Total Cost</th>
      </tr>
      ${itemRows.join("")}
      <tr style="height:17px">
        <td colspan="6" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;border-bottom:none;font-size:8.5pt;padding:2px 4px;vertical-align:top">
          <b>Purpose:</b> ${escapeHtml(data.purpose)}
        </td>
      </tr>
      <tr style="height:30px">
        <td colspan="6" style="border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black;border-top:none"></td>
      </tr>
      <tr style="height:12px">
        <td style="border-top:1px solid black;border-left:1px solid black;border-bottom:none;border-right:none"></td>
        <td colspan="2" style="border-top:1px solid black;border-bottom:none;border-left:none;border-right:none;font-size:8.5pt;padding:2px 4px"><i>Requested by:</i></td>
        <td colspan="2" style="border-top:1px solid black;border-bottom:none;border-left:none;border-right:none;font-size:8.5pt;padding:2px 4px"><i>Approved by:</i></td>
        <td style="border-top:1px solid black;border-right:1px solid black;border-bottom:none;border-left:none"></td>
      </tr>
      <tr style="height:20px">
        <td colspan="2" style="border-left:1px solid black;border-top:none;border-bottom:none;border-right:none;font-size:8.5pt;padding:2px 4px;vertical-align:bottom">Signature :</td>
        <td colspan="2" style="border:none;font-size:8.5pt;text-align:center;vertical-align:bottom"></td>
        <td colspan="2" style="border-right:1px solid black;border-top:none;border-bottom:none;border-left:none;font-size:8.5pt;text-align:center;vertical-align:bottom"></td>
      </tr>
      <tr style="height:20px">
        <td colspan="2" style="border-left:1px solid black;border-top:none;border-bottom:none;border-right:none;font-size:8.5pt;padding:2px 4px;vertical-align:bottom">Printed Name :</td>
        <td colspan="2" style="border:none;font-size:8.5pt;text-align:center;vertical-align:bottom">${escapeHtml(data.reqName)}</td>
        <td colspan="2" style="border-right:1px solid black;border-top:none;border-bottom:none;border-left:none;font-size:8.5pt;text-align:center;vertical-align:bottom">${escapeHtml(data.appName)}</td>
      </tr>
      <tr style="height:20px">
        <td colspan="2" style="border-bottom:1px solid black;border-left:1px solid black;border-top:none;border-right:none;font-size:8.5pt;padding:2px 4px;vertical-align:bottom">Designation :</td>
        <td colspan="2" style="border-bottom:1px solid black;border-top:none;border-left:none;border-right:none;font-size:8.5pt;text-align:center;vertical-align:bottom">${escapeHtml(data.reqDesig)}</td>
        <td colspan="2" style="border-bottom:1px solid black;border-right:1px solid black;border-top:none;border-left:none;font-size:8.5pt;text-align:center;vertical-align:bottom">${escapeHtml(data.appDesig)}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}
