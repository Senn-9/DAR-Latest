import { escapeHtml, toWords, formatMoney } from "./printUtils";

export interface ORSPrintData {
  orsNo: string | null;
  orsDate: string | null;
  entityName: string | null;
  payee: string | null;
  payeeAddress: string | null;
  office: string | null;
  fundCluster: string | null;
  responsibilityCenter: string | null;
  particulars: string | null;
  mfoPap: string | null;
  uacsCode: string | null;
  amount: number | null;
  referenceNo?: string | null;
  obligationAmount?: number | null;
  payableAmount?: number | null;
  paymentAmount?: number | null;
  notYetDueBalance?: number | null;
  dueDemandableBalance?: number | null;
  preparedByName: string | null;
  preparedByDesig: string | null;
  blankStatusSection?: boolean | null;
}

export function buildORSPrintHtml(data: ORSPrintData): string {
  const fmt = (n: number | null | undefined) =>
    n ? "\u20b1" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  const displayDate = data.orsDate
    ? new Date(data.orsDate + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const amt = data.amount || 0;

  const sectionCTbody = data.blankStatusSection
    ? `<tbody><tr>
        <td class="side" style="height:112px"></td>
        <td class="side"></td>
        <td class="side"></td>
        <td class="r side"></td>
        <td class="r side"></td>
        <td class="r side"></td>
        <td class="r side"></td>
        <td class="r side"></td>
      </tr></tbody>`
    : `<tbody>
        <tr>
          <td class="side" style="height:28px;font-size:7.5pt">${escapeHtml(displayDate)}</td>
          <td class="side" style="font-size:7.5pt;word-break:break-word;white-space:pre-wrap;">${escapeHtml(data.particulars)}</td>
          <td class="c side" style="font-size:7.5pt">${escapeHtml(data.referenceNo || data.orsNo)}</td>
          <td class="r side" style="font-size:7.5pt">${data.obligationAmount && data.obligationAmount > 0 ? fmt(data.obligationAmount) : ""}</td>
          <td class="r side" style="font-size:7.5pt">${data.payableAmount && data.payableAmount > 0 ? fmt(data.payableAmount) : ""}</td>
          <td class="r side" style="font-size:7.5pt">${data.paymentAmount && data.paymentAmount > 0 ? fmt(data.paymentAmount) : ""}</td>
          <td class="r side" style="font-size:7.5pt"></td>
          <td class="r side" style="font-size:7.5pt"></td>
        </tr>
        <tr>
          <td class="side" style="height:18px"></td><td class="side"></td><td class="side"></td>
          <td class="r side"></td><td class="r side"></td><td class="r side"></td>
          <td class="r side"></td><td class="r side"></td>
        </tr>
      </tbody>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Obligation Request and Status</title>
  <style>
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 9pt; color: #000; line-height: 1.25; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; }
    td, th { border: 1px solid #000; padding: 2px 5px; font-size: 8.5pt; vertical-align: top; }
    .side { border-top: none !important; border-bottom: none !important; }
    .cert-block { page-break-inside: avoid; }
    .b { font-weight: bold; }
    .c { text-align: center; }
    .r { text-align: right; }
    .sig-line { border-bottom: 1px solid #000; min-height: 18px; margin-bottom: 1px; font-size: 8.5pt; }
    .sig-label { font-size: 7.5pt; }
    .uline { display: inline-block; border-bottom: 1px solid #000; min-width: 160px; margin-left: 4px; }
  </style>
</head>
<body>
  <div style="text-align:right;font-style:italic;font-size:9pt;margin-bottom:4px">Appendix 11</div>

  <table>
    <colgroup><col style="width:62%"/><col style="width:38%"/></colgroup>
    <tbody>
      <tr>
        <td style="vertical-align:middle;padding:6px 8px" rowspan="3">
          <div class="b" style="font-size:11pt;text-align:center;margin-bottom:6px">OBLIGATION REQUEST AND STATUS</div>
          <div style="text-align:center"><span class="uline">${escapeHtml(data.entityName)}</span></div>
          <div class="b" style="text-align:center;font-size:8.5pt;margin-top:2px">Entity Name</div>
        </td>
        <td style="font-size:8.5pt;padding:4px 6px"><span class="b">Serial No. : </span><span class="uline" style="min-width:100px">${escapeHtml(data.orsNo)}</span></td>
      </tr>
      <tr><td style="font-size:8.5pt;padding:4px 6px"><span class="b">Date : </span><span class="uline" style="min-width:120px">${displayDate}</span></td></tr>
      <tr><td style="font-size:8.5pt;padding:4px 6px"><span class="b">Fund Cluster : </span><span class="uline" style="min-width:80px">${escapeHtml(data.fundCluster)}</span></td></tr>
    </tbody>
  </table>

  <table style="margin-top:-1px">
    <colgroup><col style="width:14%"/><col style="width:86%"/></colgroup>
    <tbody>
      <tr><td class="b" style="padding:3px 6px">Payee</td><td style="padding:3px 6px">${escapeHtml(data.payee)}</td></tr>
      <tr><td class="b" style="padding:3px 6px">Office</td><td style="padding:3px 6px">${escapeHtml(data.office)}</td></tr>
      <tr><td class="b" style="padding:3px 6px">Address</td><td style="padding:3px 6px">${escapeHtml(data.payeeAddress)}</td></tr>
    </tbody>
  </table>

  <table style="margin-top:-1px">
    <colgroup><col style="width:14%"/><col style="width:36%"/><col style="width:12%"/><col style="width:15%"/><col style="width:23%"/></colgroup>
    <thead>
      <tr>
        <td class="c b" style="font-size:7.5pt">Responsibility Center</td>
        <td class="c b" style="font-size:7.5pt">Particulars</td>
        <td class="c b" style="font-size:7.5pt">MFO/PAP</td>
        <td class="c b" style="font-size:7.5pt">UACS Object Code</td>
        <td class="c b" style="font-size:7.5pt">Amount</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="c side" style="height:90px;padding-top:4px">${escapeHtml(data.responsibilityCenter)}</td>
        <td class="side" style="word-break:break-word;white-space:pre-wrap;">${escapeHtml(data.particulars)}</td>
        <td class="c side">${escapeHtml(data.mfoPap)}</td>
        <td class="c side">${escapeHtml(data.uacsCode)}</td>
        <td class="r side">${amt > 0 ? fmt(amt) : ""}</td>
      </tr>
      <tr>
        <td colspan="4" class="r b" style="font-size:8pt">Total</td>
        <td class="r b">${amt > 0 ? fmt(amt) : ""}</td>
      </tr>
    </tbody>
  </table>

  <div class="cert-block">
    <table style="margin-top:-1px">
      <colgroup><col style="width:50%"/><col style="width:50%"/></colgroup>
      <tbody>
        <tr>
          <td style="padding:5px 7px">
            <div style="font-size:8pt;margin-bottom:6px"><span class="b">A.&nbsp;&nbsp;&nbsp;Certified:</span> Charges to appropriation/allotment are necessary, lawful and under my direct supervision;and supporting documents valid, proper and legal</div>
            <div style="margin-bottom:3px"><span class="sig-label">Signature&nbsp;&nbsp;&nbsp;:</span><div class="sig-line"></div></div>
            <div style="margin-bottom:3px"><span class="sig-label">Printed Name:</span><div class="sig-line">${escapeHtml(data.preparedByName)}</div></div>
            <div style="margin-bottom:3px"><span class="sig-label">Position&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span><div class="sig-line">${escapeHtml(data.preparedByDesig)}</div></div>
            <div style="font-size:7.5pt;text-align:center;margin-top:2px">Head, Requesting Office/Authorized Representative</div>
            <div style="margin-bottom:3px;margin-top:4px"><span class="sig-label">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span><div class="sig-line"></div></div>
          </td>
          <td style="padding:5px 7px">
            <div style="font-size:8pt;margin-bottom:6px"><span class="b">B.&nbsp;&nbsp;&nbsp;Certified:</span> Allotment available and obligated for the purpose/adjustment necessary as indicated above</div>
            <div style="margin-bottom:3px"><span class="sig-label">Signature&nbsp;&nbsp;&nbsp;:</span><div class="sig-line"></div></div>
            <div style="margin-bottom:3px"><span class="sig-label">Printed Name:</span><div class="sig-line"></div></div>
            <div style="margin-bottom:3px"><span class="sig-label">Position&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span><div class="sig-line"></div></div>
            <div style="font-size:7.5pt;text-align:center;margin-top:2px">Head, Budget Division/Unit/Authorized Representative</div>
            <div style="margin-bottom:3px;margin-top:4px"><span class="sig-label">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span><div class="sig-line"></div></div>
          </td>
        </tr>
      </tbody>
    </table>

    <table style="margin-top:-1px">
      <colgroup>
        <col style="width:7%"/><col style="width:16%"/><col style="width:17%"/>
        <col style="width:14%"/><col style="width:14%"/><col style="width:14%"/>
        <col style="width:9%"/><col style="width:9%"/>
      </colgroup>
      <thead>
        <tr>
          <td class="b" style="font-size:8pt;padding:3px 6px">C.</td>
          <td colspan="7" class="c b" style="font-size:9pt;letter-spacing:1px">STATUS OF OBLIGATION</td>
        </tr>
        <tr>
          <td colspan="3" class="c b" style="font-size:7.5pt">Reference</td>
          <td colspan="5" class="c b" style="font-size:7.5pt">Amount</td>
        </tr>
        <tr>
          <td rowspan="3" class="c b" style="font-size:7pt;vertical-align:middle">Date</td>
          <td rowspan="3" class="c b" style="font-size:7pt;vertical-align:middle">Particulars</td>
          <td rowspan="3" class="c b" style="font-size:7pt;vertical-align:middle">ORS/JEV/Check/<br/>ADA/TRA No.</td>
          <td rowspan="2" class="c b" style="font-size:7pt;vertical-align:middle">Obligation</td>
          <td rowspan="2" class="c b" style="font-size:7pt;vertical-align:middle">Payable</td>
          <td rowspan="2" class="c b" style="font-size:7pt;vertical-align:middle">Payment</td>
          <td colspan="2" class="c b" style="font-size:7pt">Balance</td>
        </tr>
        <tr>
          <td class="c b" style="font-size:7pt">Not Yet Due</td>
          <td class="c b" style="font-size:7pt">Due and<br/>Demandable</td>
        </tr>
        <tr>
          <td class="c" style="font-size:7pt">(a)</td>
          <td class="c" style="font-size:7pt">(b)</td>
          <td class="c" style="font-size:7pt">(c)</td>
          <td class="c" style="font-size:7pt">(a-b)</td>
          <td class="c" style="font-size:7pt">(b-c)</td>
        </tr>
      </thead>
      ${sectionCTbody}
    </table>
  </div>
</body>
</html>`;
}
