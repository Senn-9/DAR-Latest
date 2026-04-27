"use client";

import { useState, useEffect } from "react";
import { RiCloseLine, RiFilePdf2Line, RiDeleteBinLine } from "react-icons/ri";
import { useRouter } from "next/navigation";
import DeleteDeliveryModal from "@/components/Delivery/DeleteDeliveryModal";

interface ViewDeliveryModalProps {
  visible: boolean;
  onClose: () => void;
  delivery: any;
  iar: any;
  loa: any;
  dv: any;
  defaultTab?: "iar" | "loa" | "dv";
}

// Read-only input style
const readonlyCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";

// JSX Preview Components - based on PR modal pattern
function IARPreview({ delivery, iar }: { delivery: any; iar: any }) {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineHeight: "1.25", color: "#111" }}>
      <div style={{ textAlign: "right", fontSize: "9pt", marginBottom: "2mm" }}>Appendix 62</div>
      <div style={{ textAlign: "center", fontSize: "14pt", fontWeight: 700, letterSpacing: "0.3px", marginBottom: "2mm" }}>INSPECTION AND ACCEPTANCE REPORT</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Entity Name : {delivery?.entity_name ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Fund Cluster :</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Supplier : {delivery?.supplier ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>IAR No. : {iar?.iar_no ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>PO No./Date : {delivery?.po_no ?? ""} {delivery?.po_date ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Date : {iar?.invoice_date ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Requisitioning Office/Dept. : {iar?.requisitioning_office ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Invoice No. : {iar?.invoice_no ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Responsibility Center Code : {iar?.responsibility_center ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Date : {iar?.invoice_date ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Stock/Property No.</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Unit</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "38%" }}>Description</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Quantity</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Unit Cost</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Amount</th>
          </tr>
          {[...Array(4)].map((_, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", height: "48mm", verticalAlign: "top" }}>
              <div style={{ fontWeight: 700, marginBottom: "2mm" }}>INSPECTION</div>
              <div style={{ fontSize: "9.5pt" }}>Inspected, verified and found in order as to quantity and specifications</div>
              <div style={{ height: "8mm" }}></div>
              <div>Date Inspected : {iar?.inspected_at ?? ""}</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>Inspection Officer/Inspection Committee</div>
            </td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", height: "48mm", verticalAlign: "top" }}>
              <div style={{ fontWeight: 700, marginBottom: "2mm" }}>ACCEPTANCE</div>
              <div style={{ fontSize: "9.5pt" }}>Complete</div>
              <div style={{ fontSize: "9.5pt" }}>Partial (pls. specify quantity)</div>
              <div style={{ height: "8mm" }}></div>
              <div>Date Received : {iar?.received_at ?? ""}</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{iar?.inspector_name ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Inspector</div>
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ fontWeight: 700 }}>A. Supply Officer:</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{iar?.supply_officer_name ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Supply Officer</div>
            </td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ fontWeight: 700 }}>B. Budget Officer:</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}></div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Budget Officer</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LOAPreview({ delivery, loa }: { delivery: any; loa: any }) {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineHeight: "1.25", color: "#111" }}>
      <div style={{ textAlign: "right", fontSize: "9pt", marginBottom: "2mm" }}>Appendix 63</div>
      <div style={{ textAlign: "center", fontSize: "14pt", fontWeight: 700, letterSpacing: "0.3px", marginBottom: "2mm" }}>LETTER OF ACCEPTANCE</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Entity Name : {delivery?.entity_name ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Fund Cluster :</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Supplier : {delivery?.supplier ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>LOA No. : {loa?.loa_no ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>PO No./Date : {delivery?.po_no ?? ""} {delivery?.po_date ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Date : {loa?.accepted_at ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Invoice No. : {loa?.invoice_no ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Invoice Date : {loa?.invoice_date ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: "4mm", marginBottom: "2mm", fontWeight: 700 }}>I hereby accept the following:</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Stock/Property No.</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Unit</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "38%" }}>Description</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Quantity</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Unit Cost</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Amount</th>
          </tr>
          {[...Array(4)].map((_, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{loa?.accepted_by_name ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>{loa?.accepted_by_title ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt", marginTop: "2mm" }}>Accepted By</div>
            </td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}></div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}></div>
              <div style={{ textAlign: "center", fontSize: "9.5pt", marginTop: "2mm" }}>Supply Officer</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DVPreview({ delivery, dv }: { delivery: any; dv: any }) {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineHeight: "1.25", color: "#111" }}>
      <div style={{ textAlign: "right", fontSize: "9pt", marginBottom: "2mm" }}>Appendix 64</div>
      <div style={{ textAlign: "center", fontSize: "14pt", fontWeight: 700, letterSpacing: "0.3px", marginBottom: "2mm" }}>DISBURSEMENT VOUCHER</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Entity Name : {delivery?.entity_name ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Fund Cluster : {dv?.fund_cluster ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Payee : {dv?.payee ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>TIN/Employee No. : {dv?.payee_tin ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Address : {dv?.address ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>ORS/BURS No. : {dv?.ors_no ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Mode of Payment : {dv?.mode_of_payment ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Amount Due : {dv?.amount_due ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "42%" }}>Particulars</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "20%" }}>Responsibility Center</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>MFO/PAP</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>Amount</th>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px" }}>{dv?.particulars ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px" }}>{dv?.responsibility_center ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px" }}>{dv?.mfo_pap ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "right" }}>{dv?.amount_due ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "34%" }}>Account Title</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>UACS Code</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>Debit</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>Credit</th>
          </tr>
          {[...Array(2)].map((_, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #111", padding: "4px 6px" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ fontWeight: 700 }}>C. Certified:</div>
              <div style={{ fontSize: "9.5pt" }}>Expenses/Cash Advance necessary, lawful and incurred under my direct supervision.</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{dv?.certified_by ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Head, Accounting Unit/Authorized Representative</div>
            </td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ fontWeight: 700 }}>D. Approved for Payment</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{dv?.approved_by ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Agency Head/Authorized Representative</div>
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ padding: "4px 6px", width: "50%" }}>Check/ADA No. : </td>
            <td style={{ padding: "4px 6px", width: "50%" }}>Date : Bank Name &amp; Account Number:</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 6px" }}>Signature : Date :</td>
            <td style={{ padding: "4px 6px" }}>Official Receipt No. &amp; Date/Other Documents</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Keep HTML functions for PDF download
function buildIARHtml(d: any) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    body { font-family: "Times New Roman", serif; font-size: 11pt; line-height: 1.25; margin: 0; color: #111; }
    .topnote { text-align: right; font-size: 9pt; margin-bottom: 2mm; }
    .title { text-align: center; font-size: 14pt; font-weight: 700; letter-spacing: 0.3px; margin: 0 0 2mm; }
    table { width: 100%; border-collapse: collapse; }
    .meta td, .meta th, .items td, .items th, .foot td { border: 1px solid #111; padding: 4px 6px; vertical-align: top; }
    .meta { margin-bottom: 2mm; }
    .meta td { height: 8mm; }
    .items th { text-align: center; font-size: 9.5pt; }
    .items td { height: 9mm; font-size: 10pt; }
    .desc-col { width: 38%; }
    .num { text-align: right; }
    .center { text-align: center; }
    .section-head { font-weight: 700; margin-bottom: 2mm; }
    .foot { margin-top: 2mm; table-layout: fixed; }
    .foot .panel { height: 48mm; }
    .spacer { height: 8mm; }
    .sig { margin-top: 10mm; text-align: center; font-weight: 700; }
    .small { font-size: 9.5pt; }
  </style>
</head>
<body>
  <div class="topnote">Appendix 62</div>
  <div class="title">INSPECTION AND ACCEPTANCE REPORT</div>
  <table class="meta">
    <tr>
      <td>Entity Name : ${d?.entity_name ?? ""}</td>
      <td>Fund Cluster :</td>
    </tr>
    <tr>
      <td>Supplier : ${d?.supplier ?? ""}</td>
      <td>IAR No. : ${d?.iar_no ?? ""}</td>
    </tr>
    <tr>
      <td>PO No./Date : ${d?.po_no ?? ""} ${d?.po_date ?? ""}</td>
      <td>Date : ${d?.invoice_date ?? ""}</td>
    </tr>
    <tr>
      <td>Requisitioning Office/Dept. : ${d?.requisitioning_office ?? ""}</td>
      <td>Invoice No. : ${d?.invoice_no ?? ""}</td>
    </tr>
    <tr>
      <td>Responsibility Center Code : ${d?.responsibility_center ?? ""}</td>
      <td>Date : ${d?.invoice_date ?? ""}</td>
    </tr>
  </table>
  <table class="items">
    <tr>
      <th>Stock/Property No.</th>
      <th>Unit</th>
      <th class="desc-col">Description</th>
      <th>Quantity</th>
      <th>Unit Cost</th>
      <th>Amount</th>
    </tr>
    <tr><td>&nbsp;</td><td></td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
    <tr><td>&nbsp;</td><td></td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
    <tr><td>&nbsp;</td><td></td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
    <tr><td>&nbsp;</td><td></td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
  </table>
  <table class="foot">
    <tr>
      <td class="panel">
        <div class="section-head">INSPECTION</div>
        <div class="small">Inspected, verified and found in order as to quantity and specifications</div>
        <div class="spacer"></div>
        <div>Date Inspected : ${d?.inspected_at ?? ""}</div>
        <div class="sig">Inspection Officer/Inspection Committee</div>
      </td>
      <td class="panel">
        <div class="section-head">ACCEPTANCE</div>
        <div class="small">Complete</div>
        <div class="small">Partial (pls. specify quantity)</div>
        <div class="spacer"></div>
        <div>Date Received : ${d?.received_at ?? ""}</div>
        <div class="sig">ARPT/SUPPLY OFFICER</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildLOAHtml(d: any) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 portrait; margin: 22mm 20mm 20mm; }
    body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.4; margin: 0; color: #111; }
    .head { text-align: center; line-height: 1.35; margin-top: 4mm; }
    .head .rp { font-size: 11pt; }
    .head .agency { font-size: 14pt; font-weight: 700; letter-spacing: 0.2px; }
    .head .office { font-size: 11pt; }
    .title { text-align: center; margin: 18mm 0 12mm; font-size: 17pt; font-weight: 700; letter-spacing: 0.6px; }
    .para { text-align: justify; text-indent: 14mm; }
    .line { border-bottom: 1px solid #111; display: inline-block; min-width: 42mm; padding: 0 1mm; font-weight: 700; text-indent: 0; }
    .date-row { margin-top: 16mm; }
    .sig-wrap { margin-top: 24mm; text-align: center; }
    .sig-line { width: 78mm; margin: 0 auto; border-top: 1px solid #111; }
    .sig-name { margin-top: 2mm; font-weight: 700; min-height: 6mm; }
    .muted { font-size: 10pt; }
    .footer-code { margin-top: 28mm; font-size: 9pt; }
  </style>
</head>
<body>
  <div class="head">
    <div class="rp">Republic of the Philippines</div>
    <div class="agency">DEPARTMENT OF AGRARIAN REFORM</div>
    <div class="office">Camarines Sur Provincial Office</div>
    <div class="office">2/FHL BLDG., CARNATION ST., BRGY. TRIANGULO, NAGA CITY</div>
  </div>
  <div class="title">LETTER OF ACCEPTANCE</div>
  <div class="para">
    I/WE hereby certify to have accepted each and every articles/services delivered rendered by
    <span class="line">${d?.supplier ?? ""}</span> listed in the attached Invoice No.
    <span class="line">${d?.invoice_no ?? ""}</span> dated
    <span class="line">${d?.invoice_date ?? ""}</span> was/were found to be in accordance with
    the specifications stipulated under Order No. /Purchase Order No.
    <span class="line">${d?.po_no ?? ""}</span> dated <span class="line">${d?.po_date ?? ""}</span>.
  </div>
  <div class="date-row">Date: <span class="line">${d?.accepted_at ?? ""}</span></div>
  <div class="sig-wrap">
    <div class="sig-line"></div>
    <div class="sig-name">${d?.accepted_by_name ?? ""}</div>
    <div class="muted">(Printed Name &amp; Signature)</div>
    <div class="sig-name">${d?.accepted_by_title ?? ""}</div>
    <div class="muted">(Head of Agency/Authorized Representative)</div>
  </div>
  <div class="footer-code">DAR CS1-QF-STO-016 REV 00</div>
</body>
</html>`;
}

function buildDVHtml(d: any) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: "Times New Roman", serif; font-size: 10.5pt; margin: 0; line-height: 1.2; color: #111; }
    .appendix { text-align: right; font-size: 9pt; margin-bottom: 1mm; }
    .title { text-align: center; font-size: 14pt; font-weight: 700; margin: 0 0 2mm; letter-spacing: 0.3px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { border: 1px solid #111; padding: 3px 5px; vertical-align: top; }
    .top td { height: 8mm; }
    .label { font-size: 9pt; color: #222; display: block; }
    .value { font-weight: 700; }
    .mt { margin-top: 1.6mm; }
    .particulars th { text-align: center; font-size: 9pt; }
    .particulars .row td { height: 20mm; }
    .acct th { text-align: center; font-size: 9pt; }
    .acct td { height: 6mm; }
    .cert td { height: 42mm; }
    .sig { margin-top: 8mm; border-top: 1px solid #111; text-align: center; padding-top: 1.5mm; font-weight: 700; }
    .small { font-size: 9pt; }
    .pay td { height: 8mm; }
  </style>
</head>
<body>
  <div class="appendix">Appendix 32</div>
  <div class="title">DISBURSEMENT VOUCHER</div>
  <table class="top">
    <tr>
      <td><span class="label">Entity Name</span><span class="value">${d?.entity_name ?? ""}</span></td>
      <td><span class="label">Fund Cluster</span><span class="value">${d?.fund_cluster ?? ""}</span></td>
    </tr>
    <tr>
      <td><span class="label">Date</span><span class="value">${d?.date ?? ""}</span></td>
      <td><span class="label">DV No.</span><span class="value">${d?.dv_no ?? ""}</span></td>
    </tr>
    <tr>
      <td><span class="label">Payee</span><span class="value">${d?.payee ?? ""}</span></td>
      <td><span class="label">TIN/Employee No.</span><span class="value">${d?.tin ?? ""}</span></td>
    </tr>
    <tr>
      <td><span class="label">Address</span><span class="value">${d?.address ?? ""}</span></td>
      <td><span class="label">ORS/BURS No.</span><span class="value">${d?.ors_no ?? ""}</span></td>
    </tr>
    <tr>
      <td><span class="label">Mode of Payment</span><span class="value">${d?.mode_of_payment ?? ""}</span></td>
      <td><span class="label">Amount Due</span><span class="value">${d?.amount_due ?? ""}</span></td>
    </tr>
  </table>
  <table class="particulars mt">
    <tr>
      <th style="width:42%">Particulars</th>
      <th style="width:20%">Responsibility Center</th>
      <th style="width:18%">MFO/PAP</th>
      <th style="width:20%">Amount</th>
    </tr>
    <tr class="row">
      <td>${d?.particulars ?? ""}</td>
      <td>${d?.responsibility_center ?? ""}</td>
      <td>${d?.mfo_pap ?? ""}</td>
      <td style="text-align:right">${d?.amount_due ?? ""}</td>
    </tr>
  </table>
  <table class="acct mt">
    <tr>
      <th style="width:34%">Account Title</th>
      <th style="width:22%">UACS Code</th>
      <th style="width:22%">Debit</th>
      <th style="width:22%">Credit</th>
    </tr>
    <tr><td></td><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td><td></td></tr>
  </table>
  <table class="cert mt">
    <tr>
      <td style="width:50%">
        <b>C. Certified:</b> Expenses/Cash Advance necessary, lawful and incurred under my direct supervision.
        <div class="sig">${d?.certified_by ?? ""}</div>
        <div class="small" style="text-align:center">Head, Accounting Unit/Authorized Representative</div>
      </td>
      <td style="width:50%">
        <b>D. Approved for Payment</b>
        <div class="sig">${d?.approved_by ?? ""}</div>
        <div class="small" style="text-align:center">Agency Head/Authorized Representative</div>
      </td>
    </tr>
  </table>
  <table class="pay mt">
    <tr>
      <td style="width:50%">Check/ADA No. : </td>
      <td style="width:50%">Date : Bank Name &amp; Account Number:</td>
    </tr>
    <tr>
      <td>Signature : Date :</td>
      <td>Official Receipt No. &amp; Date/Other Documents</td>
    </tr>
  </table>
</body>
</html>`;
}

function downloadPDF(html: string) {
  const printWindow = window.open("", "", "height=800,width=1200");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }
}

export default function ViewDeliveryModal({
  visible,
  onClose,
  delivery,
  iar,
  loa,
  dv,
  defaultTab = "iar",
}: ViewDeliveryModalProps) {
  const [tab, setTab] = useState<"iar" | "loa" | "dv">(defaultTab);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  // Update tab when defaultTab changes
  useEffect(() => {
    if (visible) {
      setTab(defaultTab);
    }
  }, [visible, defaultTab]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!visible) return null;

  // Get the current document data and HTML
  const getCurrentDoc = () => {
    switch (tab) {
      case "iar":
        return { data: iar, html: iar ? buildIARHtml({ ...delivery, ...iar }) : null, label: "Inspection & Acceptance Report", component: <IARPreview delivery={delivery} iar={iar || {}} /> };
      case "loa":
        return { data: loa, html: loa ? buildLOAHtml({ ...delivery, ...loa }) : null, label: "Letter of Acceptance", component: <LOAPreview delivery={delivery} loa={loa || {}} /> };
      case "dv":
        return { data: dv, html: dv ? buildDVHtml({ ...delivery, ...dv }) : null, label: "Disbursement Voucher", component: <DVPreview delivery={delivery} dv={dv || {}} /> };
    }
  };

  const currentDoc = getCurrentDoc();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">Delivery Documents</h2>
            <p className="text-emerald-100 text-sm mt-1">{delivery?.delivery_no ?? "—"} · PO {delivery?.po_no ?? "—"}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Document Tabs */}
            <div className="flex bg-white/20 rounded-lg overflow-hidden border border-white/30 backdrop-blur">
              <button
                onClick={() => setTab("iar")}
                className={`px-5 py-2 text-sm font-semibold transition-all ${
                  tab === "iar"
                    ? "bg-white text-emerald-700"
                    : "text-white hover:bg-white/10"
                }`}
              >
                IAR
              </button>
              <button
                onClick={() => setTab("loa")}
                className={`px-5 py-2 text-sm font-semibold transition-all ${
                  tab === "loa"
                    ? "bg-white text-emerald-700"
                    : "text-white hover:bg-white/10"
                }`}
              >
                LOA
              </button>
              <button
                onClick={() => setTab("dv")}
                className={`px-5 py-2 text-sm font-semibold transition-all ${
                  tab === "dv"
                    ? "bg-white text-emerald-700"
                    : "text-white hover:bg-white/10"
                }`}
              >
                DV
              </button>
            </div>
            {currentUser?.role_id === 1 && (
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors"
                title="Delete Delivery"
              >
                <RiDeleteBinLine size={20} />
              </button>
            )}
            <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Form Side — read-only */}
          <div className="flex-[2] flex-col overflow-hidden border-r border-gray-200">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

              {/* View-only notice */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
                <span>👁</span> This is a read-only view. No changes can be made.
              </div>

              {/* Delivery Info */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
                  Delivery Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Delivery No.</label>
                    <input className={readonlyCls} value={delivery?.delivery_no ?? ""} readOnly tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PO Number</label>
                    <input className={readonlyCls} value={delivery?.po_no ?? ""} readOnly tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Supplier</label>
                    <input className={readonlyCls} value={delivery?.supplier ?? ""} readOnly tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Office/Section</label>
                    <input className={readonlyCls} value={delivery?.office_section ?? ""} readOnly tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">DR No.</label>
                    <input className={readonlyCls} value={delivery?.dr_no ?? ""} readOnly tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">SOA No.</label>
                    <input className={readonlyCls} value={delivery?.soa_no ?? ""} readOnly tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Expected Delivery Date</label>
                    <input className={readonlyCls} value={delivery?.expected_delivery_date ?? ""} readOnly tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Created At</label>
                    <input
                      className={readonlyCls}
                      value={delivery?.created_at ? new Date(delivery.created_at).toLocaleDateString("en-PH") : ""}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                </div>
                {delivery?.notes && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Notes</label>
                    <textarea
                      className={`${readonlyCls} resize-none`}
                      rows={2}
                      value={delivery.notes}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                )}
              </div>

              {/* Document-specific fields */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
                  {currentDoc.label} Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {tab === "iar" && (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">IAR No.</label>
                          <input className={readonlyCls} value={iar?.iar_no ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Invoice No.</label>
                          <input className={readonlyCls} value={iar?.invoice_no ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Invoice Date</label>
                          <input className={readonlyCls} value={iar?.invoice_date ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Date Inspected</label>
                          <input className={readonlyCls} value={iar?.inspected_at ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Date Received</label>
                          <input className={readonlyCls} value={iar?.received_at ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Requisitioning Office</label>
                          <input className={readonlyCls} value={iar?.requisitioning_office ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Responsibility Center</label>
                          <input className={readonlyCls} value={iar?.responsibility_center ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Inspector Name</label>
                          <input className={readonlyCls} value={iar?.inspector_name ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Supply Officer Name</label>
                          <input className={readonlyCls} value={iar?.supply_officer_name ?? ""} readOnly tabIndex={-1} />
                        </div>
                      </>
                    )}
                    {tab === "loa" && (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">LOA No.</label>
                          <input className={readonlyCls} value={loa?.loa_no ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Invoice No.</label>
                          <input className={readonlyCls} value={loa?.invoice_no ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Invoice Date</label>
                          <input className={readonlyCls} value={loa?.invoice_date ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Acceptance Date</label>
                          <input className={readonlyCls} value={loa?.accepted_at ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Accepted By (Name)</label>
                          <input className={readonlyCls} value={loa?.accepted_by_name ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Accepted By (Title)</label>
                          <input className={readonlyCls} value={loa?.accepted_by_title ?? ""} readOnly tabIndex={-1} />
                        </div>
                      </>
                    )}
                    {tab === "dv" && (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">DV No.</label>
                          <input className={readonlyCls} value={dv?.dv_no ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Amount Due</label>
                          <input className={readonlyCls} value={dv?.amount_due ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Fund Cluster</label>
                          <input className={readonlyCls} value={dv?.fund_cluster ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">ORS No.</label>
                          <input className={readonlyCls} value={dv?.ors_no ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Payee</label>
                          <input className={readonlyCls} value={dv?.payee ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Payee TIN</label>
                          <input className={readonlyCls} value={dv?.payee_tin ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Address</label>
                          <input className={readonlyCls} value={dv?.address ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Mode of Payment</label>
                          <input className={readonlyCls} value={dv?.mode_of_payment ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Responsibility Center</label>
                          <input className={readonlyCls} value={dv?.responsibility_center ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">MFO/PAP</label>
                          <input className={readonlyCls} value={dv?.mfo_pap ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Particulars</label>
                          <textarea
                            className={`${readonlyCls} resize-none`}
                            rows={2}
                            value={dv?.particulars ?? ""}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Certified By</label>
                          <input className={readonlyCls} value={dv?.certified_by ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Approved By</label>
                          <input className={readonlyCls} value={dv?.approved_by ?? ""} readOnly tabIndex={-1} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              {currentDoc.html && (
                <button
                  onClick={() => downloadPDF(currentDoc.html!)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  <RiFilePdf2Line size={18} /> Download PDF
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition-colors"
              >
                <RiCloseLine size={18} /> Close
              </button>
            </div>
          </div>

          {/* Preview Side */}
          <div className="flex-[3] overflow-y-auto bg-gray-100 flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                  {currentDoc.label} · LIVE PREVIEW
                </h3>
                {currentDoc.html && (
                  <button
                    onClick={() => downloadPDF(currentDoc.html!)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    <RiFilePdf2Line size={16} /> PDF
                  </button>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-black overflow-x-auto">
                {currentDoc.component}
              </div>
            </div>
          </div>

        </div>
      </div>
        <DeleteDeliveryModal
          visible={deleteModalOpen}
          deliveryId={delivery?.id ?? null}
          deliveryNo={delivery?.delivery_no ?? null}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={(id) => {
            setDeleteModalOpen(false);
            onClose();
            try { router.refresh(); } catch (e) { window.location.reload(); }
          }}
          roleId={currentUser?.role_id}
        />
    </div>
  );
}
