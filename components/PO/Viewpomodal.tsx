"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RiCloseLine, RiFilePdf2Line } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { fetchPOWithItemsById, type PurchaseOrderItemRow, type PurchaseOrderRow } from "@/utils/supabase/po";
import type { OrsEntry as OrsEntryType, ContractDocument } from "@/types/tables";
import { buildORSPrintHtml as sharedBuildORS, type ORSPrintData } from "@/utils/print/ORSPrintBuilder";
import { buildPurchaseOrderPrintHtml as sharedBuildPO, type POPrintData } from "@/utils/print/POPrintBuilder";
import { buildContractPrintHtml } from "@/utils/print/ContractPrintBuilder";
import { printWithIframe } from "@/utils/print/printUtils";

type ViewpomodalProps = {
  visible: boolean;
  poId: number | null;
  onClose: () => void;
  currentUser?: { id?: number; fullname?: string; [key: string]: any } | null;
};

// Read-only input style
const readonlyCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getItemTotal(item: PurchaseOrderItemRow) {
  const quantity = Number(item.quantity ?? 0);
  const unitPrice = Number(item.unit_price ?? 0);
  return Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0;
}

function getGrandTotal(items: PurchaseOrderItemRow[]) {
  return items.reduce((sum, item) => sum + getItemTotal(item), 0);
}

function escapeHtml(value: string) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toWords(amount: number): string {
  if (!amount || isNaN(amount)) return "ZERO PESOS";

  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function threeDigits(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
    return `${ones[Math.floor(n / 100)]} HUNDRED${n % 100 ? ` ${threeDigits(n % 100)}` : ""}`;
  }

  const pesos = Math.floor(amount);
  const centavos = Math.round((amount - pesos) * 100);
  const parts: string[] = [];

  if (pesos >= 1_000_000_000) parts.push(`${threeDigits(Math.floor(pesos / 1_000_000_000))} BILLION`);
  if (pesos % 1_000_000_000 >= 1_000_000) parts.push(`${threeDigits(Math.floor((pesos % 1_000_000_000) / 1_000_000))} MILLION`);
  if (pesos % 1_000_000 >= 1_000) parts.push(`${threeDigits(Math.floor((pesos % 1_000_000) / 1_000))} THOUSAND`);
  if (pesos % 1_000 > 0) parts.push(threeDigits(pesos % 1_000));

  const pesoWords = pesos === 0 ? "ZERO" : parts.join(" ");
  const centWords = centavos > 0 ? ` AND ${threeDigits(centavos)}/100` : "";
  return `${pesoWords} PESOS${centWords}`;
}

// Contract Preview - read-only display for Contract document
function ContractPreview({
  contractTitle, firstPartyAgency, firstPartyRep, firstPartyOffice,
  secondPartyName, secondPartyRep, secondPartyCity, commencementLocation,
  considerationAmount, considerationAmountWords, serviceDescription,
  paymentCondition, jobOrderDescription, scheduledDays,
  liquidatedDamagesRate, contractDate, commencementDate,
  witnessOne, witnessTwo,
}: {
  contractTitle: string | null;
  firstPartyAgency: string | null;
  firstPartyRep: string | null;
  firstPartyOffice: string | null;
  secondPartyName: string | null;
  secondPartyRep: string | null;
  secondPartyCity: string | null;
  commencementLocation: string | null;
  considerationAmount: number | null;
  considerationAmountWords: string | null;
  serviceDescription: string | null;
  paymentCondition: string | null;
  jobOrderDescription: string | null;
  scheduledDays: string | null;
  liquidatedDamagesRate: string | null;
  contractDate: string | null;
  commencementDate: string | null;
  witnessOne: string | null;
  witnessTwo: string | null;
}) {
  const fmtDate = (isoDate: string | null) => {
    if (!isoDate) return { ordDay: "___", month: "___________", year: "____", full: "" };
    const d = new Date(isoDate + "T00:00:00");
    const day = d.getDate();
    const s = ["th","st","nd","rd"], v = day % 100;
    const ordDay = day + (s[(v-20)%10] || s[v] || s[0]);
    const month = d.toLocaleDateString("en-PH", { month: "long" });
    const year = d.getFullYear().toString();
    const full = d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    return { ordDay, month, year, full };
  };

  const cd = fmtDate(contractDate);
  const comd = fmtDate(commencementDate);
  const fmtMoney = (n: number | null) => n ? "\u20B1" + n.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "";

  const S = {
    root: { fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", color: "#000", lineHeight: 1.55 } as React.CSSProperties,
    bold: { fontWeight: "bold" } as React.CSSProperties,
    center: { textAlign: "center" as const } as React.CSSProperties,
    fill: { display: "inline-block", borderBottom: "1px solid #000", fontWeight: "bold", textAlign: "center" as const, minWidth: "140px", padding: "0 4px" } as React.CSSProperties,
  };

  const Fill = (content: string, minW = "140px") => (
    <span style={{ display: "inline-block", borderBottom: "1px solid #000", fontWeight: "bold", textAlign: "center", minWidth: minW, padding: "0 4px", verticalAlign: "bottom" }}>
      {content || "\u00a0"}
    </span>
  );

  return (
    <div style={S.root}>
      <div style={{ ...S.center, ...S.bold, fontSize: "12pt", marginBottom: "20px" }}>
        {contractTitle || "CONTRACT FOR SERVICES"}
      </div>
      <div style={{ ...S.bold, marginBottom: "16px" }}>KNOW ALL MEN BY THESE PRESENTS:</div>
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          This contract, executed by and between {Fill(firstPartyAgency || "", "200px")} Provincial Office, 
          represented by {Fill(firstPartyRep || "", "140px")} with office address at 
          {Fill(firstPartyOffice || "", "200px")}, hereinafter referred to as the party of the FIRST PART; 
          and {Fill(secondPartyName || "", "140px")}, represented by {Fill(secondPartyRep || "", "140px")}, 
          Filipino, of legal age and a resident of {Fill(secondPartyCity || commencementLocation || "", "110px")} 
          hereinafter referred to as the party of the SECOND PART.
        </p>
      </div>
      <div style={{ ...S.center, ...S.bold, letterSpacing: "6px", margin: "20px 0" }}>W I T N E S S E T H</div>
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          That for and in consideration of the sum of {Fill((considerationAmountWords || "").toUpperCase(), "300px")} 
          ({fmtMoney(considerationAmount || 0)}), which the FIRST PARTY agreed to pay unto the SECOND PARTY, the SECOND PARTY 
          agrees to deliver/provide the {Fill((serviceDescription || "").toUpperCase(), "250px")}.
        </p>
      </div>
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          That the FIRST PARTY shall pay the full amount to the SECOND PARTY when the 
          {Fill((paymentCondition || serviceDescription || "").toUpperCase(), "300px")}.
        </p>
      </div>
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          That the SECOND PARTY agrees to finish the {Fill((jobOrderDescription || "JOB ORDER").toUpperCase(), "180px")} 
          within {Fill(scheduledDays || "", "40px")} scheduled days counted from the day the contract for the 
          {Fill((serviceDescription || "").toUpperCase(), "200px")} {Fill(comd.full || "", "180px")} 
          has been issued by the FIRST PARTY; and should the SECOND PARTY fail to finish the job within the said period, 
          the SECOND PARTY shall indemnify the sum of {liquidatedDamagesRate || ""} for every day of delay of liquidated damages.
        </p>
      </div>
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          That this Contract shall commence on {Fill(comd.full || "", "180px")} at {Fill(commencementLocation || "", "180px")}.
        </p>
      </div>
      <div style={{ paddingLeft: "2em", marginBottom: "20px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          IN WITNESS WHEREOF, the parties signed this contract on the {Fill(cd.ordDay, "55px")} day of 
          {Fill(cd.month || "", "130px")}, {cd.year || ""}.
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px" }}>
        <div style={{ width: "44%", textAlign: "center" }}>
          <div style={S.bold}>{firstPartyAgency || "[Agency]"}:</div>
          <div style={{ ...S.bold, marginTop: "4px" }}>{firstPartyRep || "[Official Name]"}</div>
          <div style={{ borderBottom: "1px solid #000", marginTop: "4px", marginBottom: "4px" }} />
          <div style={{ fontSize: "9pt" }}>(Signature of the FIRST PARTY)</div>
        </div>
        <div style={{ width: "44%", textAlign: "center" }}>
          <div style={S.bold}>{secondPartyName || "[Supplier]"}:</div>
          <div style={{ ...S.bold, marginTop: "4px" }}>{secondPartyRep || "[Representative]"}</div>
          <div style={{ borderBottom: "1px solid #000", marginTop: "4px", marginBottom: "4px" }} />
          <div style={{ fontSize: "9pt" }}>(Signature of the SECOND PARTY)</div>
        </div>
      </div>
      <div style={{ ...S.center, ...S.bold, margin: "28px 0 16px" }}>WITNESSES:</div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "44%", textAlign: "center" }}>
          <div style={S.bold}>{(witnessOne || "").toUpperCase() || "[WITNESS NAME]"}</div>
          <div style={{ borderBottom: "1px solid #000", marginTop: "4px" }} />
        </div>
        <div style={{ width: "44%", textAlign: "center" }}>
          <div style={S.bold}>{(witnessTwo || "").toUpperCase() || "[WITNESS NAME]"}</div>
          <div style={{ borderBottom: "1px solid #000", marginTop: "4px" }} />
        </div>
      </div>
    </div>
  );
}

// ORS Preview - read-only display for ORS document
function ORSPreview({
  orsNo, orsDate, entityName, payee, payeeAddress, office,
  fundCluster, responsibilityCenter, particulars, mfoPap, uacsCode,
  amount, referenceNo, obligationAmount, payableAmount, paymentAmount,
  notYetDueBalance, dueDemandableBalance, preparedByName, preparedByDesig,
  blankStatusSection,
}: {
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
}) {
  const fmt = (n: number) => n ? "₱" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const displayDate = orsDate ? new Date(orsDate + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "";
  const amountWords = useMemo(() => (amount && amount > 0 ? toWords(amount) : ""), [amount]);
  const amt = amount || 0;

  const S = {
    root: { fontFamily: "'Times New Roman', Times, serif", fontSize: "9pt", color: "#000", lineHeight: "1.25" } as React.CSSProperties,
    tbl: { width: "100%", borderCollapse: "collapse" as const, tableLayout: "fixed" as const } as React.CSSProperties,
    td: { border: "1px solid #000", padding: "2px 5px", fontSize: "8.5pt", verticalAlign: "top" as const } as React.CSSProperties,
    tdC: { border: "1px solid #000", padding: "2px 5px", fontSize: "8.5pt", verticalAlign: "top" as const, textAlign: "center" as const } as React.CSSProperties,
    tdR: { border: "1px solid #000", padding: "2px 5px", fontSize: "8.5pt", verticalAlign: "top" as const, textAlign: "right" as const } as React.CSSProperties,
    b: { fontWeight: "bold" } as React.CSSProperties,
    uline: { display: "inline-block", borderBottom: "1px solid #000", minWidth: "100px", marginLeft: "4px" } as React.CSSProperties,
    sigLine: { borderBottom: "1px solid #000", minHeight: "18px", marginBottom: "1px", fontSize: "8.5pt" } as React.CSSProperties,
    sigLabel: { fontSize: "7.5pt" } as React.CSSProperties,
  };

  return (
    <div style={S.root}>
      <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "9pt", marginBottom: "4px" }}>Appendix 11</div>
      <table style={{ ...S.tbl, borderCollapse: "collapse", border: "1px solid #000" }}>
        <colgroup><col style={{ width: "62%" }} /><col style={{ width: "38%" }} /></colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.td, verticalAlign: "middle", padding: "6px 8px" }} rowSpan={3}>
              <div style={{ fontWeight: "bold", fontSize: "11pt", textAlign: "center", marginBottom: "6px" }}>OBLIGATION REQUEST AND STATUS</div>
              <div style={{ textAlign: "center" }}><span style={S.uline}>{entityName || ""}</span></div>
              <div style={{ textAlign: "center", fontSize: "8.5pt", fontWeight: "bold", marginTop: "2px" }}>Entity Name</div>
            </td>
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Serial No. : </span><span style={{ ...S.uline, minWidth: "100px" }}>{orsNo || ""}</span>
            </td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Date : </span><span style={{ ...S.uline, minWidth: "100px" }}>{displayDate}</span>
            </td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Fund Cluster : </span><span style={{ ...S.uline, minWidth: "80px" }}>{fundCluster || ""}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ ...S.tbl, marginTop: "-1px", border: "1px solid #000" }}>
        <colgroup><col style={{ width: "14%" }} /><col style={{ width: "86%" }} /></colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Payee</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>{payee || ""}</td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Office</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>{office || ""}</td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Address</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>{payeeAddress || ""}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ ...S.tbl, marginTop: "-1px", border: "1px solid #000" }}>
        <colgroup><col style={{ width: "14%" }} /><col style={{ width: "36%" }} /><col style={{ width: "12%" }} /><col style={{ width: "15%" }} /><col style={{ width: "23%" }} /></colgroup>
        <thead>
          <tr>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>Responsibility Center</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>Particulars</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>MFO/PAP</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>UACS Object Code</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>Amount</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...S.tdC, borderTop: "none", borderBottom: "none", height: "90px", verticalAlign: "top", paddingTop: "4px" }}>{responsibilityCenter || ""}</td>
            <td style={{ ...S.td, borderTop: "none", borderBottom: "none", verticalAlign: "top", wordBreak: "break-word" }}>{particulars || ""}</td>
            <td style={{ ...S.tdC, borderTop: "none", borderBottom: "none", verticalAlign: "top" }}>{mfoPap || ""}</td>
            <td style={{ ...S.tdC, borderTop: "none", borderBottom: "none", verticalAlign: "top" }}>{uacsCode || ""}</td>
            <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none", verticalAlign: "top" }}>{amt > 0 ? fmt(amt) : ""}</td>
          </tr>
          <tr>
            <td colSpan={4} style={{ ...S.tdR, ...S.b, fontSize: "8pt" }}>Total</td>
            <td style={{ ...S.tdR, ...S.b }}>{amt > 0 ? fmt(amt) : ""}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ ...S.tbl, marginTop: "-1px", border: "1px solid #000" }}>
        <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.td, padding: "5px 7px", verticalAlign: "top" }}>
              <div style={{ fontSize: "8pt", marginBottom: "6px" }}>
                <span style={S.b}>A.&nbsp;&nbsp;&nbsp;Certified:</span> Charges to appropriation/allotment are necessary, lawful and under my direct supervision;and supporting documents valid, proper and legal
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Signature&nbsp;&nbsp;&nbsp;:</span>
                <div style={S.sigLine}></div>
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Printed Name:</span>
                <div style={{ ...S.sigLine, fontWeight: "normal" }}>{preparedByName || ""}</div>
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Position&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                <div style={{ ...S.sigLine }}>{preparedByDesig || ""}</div>
              </div>
              <div style={{ fontSize: "7.5pt", textAlign: "center", marginTop: "2px" }}>Head, Requesting Office/Authorized Representative</div>
              <div style={{ marginBottom: "3px", marginTop: "4px" }}>
                <span style={S.sigLabel}>Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                <div style={S.sigLine}></div>
              </div>
            </td>
            <td style={{ ...S.td, padding: "5px 7px", verticalAlign: "top" }}>
              <div style={{ fontSize: "8pt", marginBottom: "6px" }}>
                <span style={S.b}>B.&nbsp;&nbsp;&nbsp;Certified:</span> Allotment available and obligated for the purpose/adjustment necessary as indicated above
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Signature&nbsp;&nbsp;&nbsp;:</span>
                <div style={S.sigLine}></div>
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Printed Name:</span>
                <div style={S.sigLine}></div>
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Position&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                <div style={S.sigLine}></div>
              </div>
              <div style={{ fontSize: "7.5pt", textAlign: "center", marginTop: "2px" }}>Head, Budget Division/Unit/Authorized Representative</div>
              <div style={{ marginBottom: "3px", marginTop: "4px" }}>
                <span style={S.sigLabel}>Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                <div style={S.sigLine}></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* C. STATUS OF OBLIGATION */}
      <table style={{ ...S.tbl, marginTop: "-1px", border: "1px solid #000" }}>
        <colgroup>
          <col style={{ width: "7%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "9%" }} />
        </colgroup>
        <thead>
          <tr>
            <td style={{ ...S.td, ...S.b, fontSize: "8pt", padding: "3px 6px" }}>C.</td>
            <td colSpan={7} style={{ ...S.tdC, ...S.b, fontSize: "9pt", letterSpacing: "1px" }}>STATUS OF OBLIGATION</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>Reference</td>
            <td colSpan={5} style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>Amount</td>
          </tr>
          <tr>
            <td rowSpan={3} style={{ ...S.tdC, ...S.b, fontSize: "7pt", verticalAlign: "middle" }}>Date</td>
            <td rowSpan={3} style={{ ...S.tdC, ...S.b, fontSize: "7pt", verticalAlign: "middle" }}>Particulars</td>
            <td rowSpan={3} style={{ ...S.tdC, ...S.b, fontSize: "7pt", verticalAlign: "middle" }}>ORS/JEV/Check/<br />ADA/TRA No.</td>
            <td rowSpan={2} style={{ ...S.tdC, ...S.b, fontSize: "7pt", verticalAlign: "middle" }}>Obligation</td>
            <td rowSpan={2} style={{ ...S.tdC, ...S.b, fontSize: "7pt", verticalAlign: "middle" }}>Payable</td>
            <td rowSpan={2} style={{ ...S.tdC, ...S.b, fontSize: "7pt", verticalAlign: "middle" }}>Payment</td>
            <td colSpan={2} style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Balance</td>
          </tr>
          <tr>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Not Yet Due</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Due and<br />Demandable</td>
          </tr>
          <tr>
            <td style={{ ...S.tdC, fontSize: "7pt" }}>(a)</td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}>(b)</td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}>(c)</td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}>(a-b)</td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}>(b-c)</td>
          </tr>
        </thead>
        {blankStatusSection ? (
          <tbody>
            <tr>
              <td style={{ ...S.td, borderTop: "none", borderBottom: "none", height: "112px" }}></td>
              <td style={{ ...S.td, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.td, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            <tr>
              <td style={{ ...S.td, borderTop: "none", borderBottom: "none", height: "28px", fontSize: "7.5pt" }}>{displayDate}</td>
              <td style={{ ...S.td, borderTop: "none", borderBottom: "none", fontSize: "7.5pt", wordBreak: "break-word" }}>{particulars || ""}</td>
              <td style={{ ...S.tdC, borderTop: "none", borderBottom: "none", fontSize: "7.5pt" }}>{referenceNo || orsNo || ""}</td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none", fontSize: "7.5pt" }}>{obligationAmount && obligationAmount > 0 ? fmt(obligationAmount) : ""}</td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none", fontSize: "7.5pt" }}>{payableAmount && payableAmount > 0 ? fmt(payableAmount) : ""}</td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none", fontSize: "7.5pt" }}>{paymentAmount && paymentAmount > 0 ? fmt(paymentAmount) : ""}</td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none", fontSize: "7.5pt" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none", fontSize: "7.5pt" }}></td>
            </tr>
            <tr>
              <td style={{ ...S.td, borderTop: "none", borderBottom: "none", height: "18px" }}></td>
              <td style={{ ...S.td, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.td, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
              <td style={{ ...S.tdR, borderTop: "none", borderBottom: "none" }}></td>
            </tr>
          </tbody>
        )}
      </table>
    </div>
  );
}

// Static PO Preview - read-only display for print
function POPreview({
  poNo,
  supplier,
  address,
  tin,
  procurementMode,
  deliveryPlace,
  deliveryTerm,
  deliveryDate,
  paymentTerm,
  fundCluster,
  items,
  officialName,
  officialDesig,
  accountantName,
  accountantDesig,
  orsNo,
  orsDate,
  fundsAvailable,
  orsAmount,
  hideTotalRow,
  poDate,
}: {
  poNo: string;
  supplier: string;
  address: string;
  tin: string;
  procurementMode: string;
  deliveryPlace: string;
  deliveryTerm: string;
  deliveryDate: string;
  paymentTerm: string;
  fundCluster: string;
  items: PurchaseOrderItemRow[];
  officialName?: string | null;
  officialDesig?: string | null;
  accountantName?: string | null;
  accountantDesig?: string | null;
  orsNo?: string | null;
  orsDate?: string | null;
  fundsAvailable?: string | null;
  orsAmount?: number | null;
  hideTotalRow?: boolean | null;
  poDate?: string | null;
}) {
  const grandTotal = getGrandTotal(items);
  const amountWords = toWords(grandTotal);
  const today = new Date().toISOString().slice(0, 10);
  const displayDate = poDate || today;

  const normalizedItems = useMemo(
    () =>
      items.filter(
        (item) =>
          String(item.description ?? "").trim() ||
          String(item.stock_no ?? "").trim() ||
          String(item.unit ?? "").trim() ||
          Number(item.quantity ?? 0) > 0 ||
          Number(item.unit_price ?? 0) > 0,
      ),
    [items],
  );

  const sideBorder: React.CSSProperties = { borderLeft: "1px solid #111", borderRight: "1px solid #111", borderTop: "none", borderBottom: "none" };

  const itemRows = normalizedItems.map((item, index) => {
    const total = getItemTotal(item);
    return (
      <tr key={index} style={{ height: "auto" }}>
        <td style={{ ...sideBorder, verticalAlign: "top", padding: "3px 4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3, whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: item.stock_no ?? "" }} />
        <td style={{ ...sideBorder, verticalAlign: "top", padding: "3px 4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3, whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: item.unit ?? "" }} />
        <td style={{ ...sideBorder, verticalAlign: "top", padding: "3px 4px", textAlign: "left", fontSize: "9pt", lineHeight: 1.3, whiteSpace: "pre-wrap", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: item.description ?? "" }} />
        <td style={{ ...sideBorder, verticalAlign: "top", padding: "3px 4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{Number(item.quantity ?? 0) ? String(Number(item.quantity ?? 0)) : ""}</td>
        <td style={{ ...sideBorder, verticalAlign: "top", padding: "3px 4px", textAlign: "right", fontSize: "9pt", lineHeight: 1.3 }}>{Number(item.unit_price ?? 0) ? formatMoney(Number(item.unit_price ?? 0)).replace("₱", "") : ""}</td>
        <td style={{ ...sideBorder, verticalAlign: "top", padding: "3px 4px", textAlign: "right", fontSize: "9pt", lineHeight: 1.3 }}>{total ? formatMoney(total).replace("₱", "") : ""}</td>
      </tr>
    );
  });

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "10pt", color: "#000", padding: 0, margin: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "right", fontSize: "10pt", fontStyle: "italic", padding: 0 }}>Appendix 61</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #111", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "14%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "34%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "10.5%" }} />
          <col style={{ width: "14.5%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Supplier : <span style={{ fontWeight: "normal" }}>{supplier}</span>
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              P.O. No. : <span style={{ fontWeight: "normal" }}>{poNo}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Address : <span style={{ fontWeight: "normal" }}>{address}</span>
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Date : <span style={{ fontWeight: "normal" }}>{displayDate}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              TIN : <span style={{ fontWeight: "normal" }}>{tin}</span>
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Mode of Procurement : <span style={{ fontWeight: "normal" }}>{procurementMode}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold", verticalAlign: "top" }}>
              Gentlemen:
              <div style={{ fontWeight: "normal", marginLeft: "52px", fontSize: "9pt" }}>
                Please furnish this Office the following articles subject to the terms and conditions contained herein:
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Place of Delivery : <span style={{ fontWeight: "normal" }}>{deliveryPlace}</span>
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Delivery Term : <span style={{ fontWeight: "normal" }}>{deliveryTerm}</span>
              <div style={{ fontWeight: "bold", marginTop: "2px" }}>
                Payment Term : <span style={{ fontWeight: "normal" }}>{paymentTerm}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Date of Delivery : <span style={{ fontWeight: "normal" }}>{deliveryDate}</span>
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt" }} />
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 2px", fontSize: "9pt", fontWeight: "bold", textAlign: "center" }}>Stock/ Property No.</td>
            <td style={{ border: "1px solid #111", padding: "4px 2px", fontSize: "9pt", fontWeight: "bold", textAlign: "center" }}>Unit</td>
            <td style={{ border: "1px solid #111", padding: "4px 2px", fontSize: "9pt", fontWeight: "bold", textAlign: "center" }}>Description</td>
            <td style={{ border: "1px solid #111", padding: "4px 2px", fontSize: "9pt", fontWeight: "bold", textAlign: "center" }}>Quantity</td>
            <td style={{ border: "1px solid #111", padding: "4px 2px", fontSize: "9pt", fontWeight: "bold", textAlign: "center" }}>Unit Cost</td>
            <td style={{ border: "1px solid #111", padding: "4px 2px", fontSize: "9pt", fontWeight: "bold", textAlign: "center" }}>Amount</td>
          </tr>
          {itemRows.length > 0 ? itemRows : (
            <tr>
              <td colSpan={6} style={{ ...sideBorder, padding: "16px", textAlign: "center", color: "#666", fontStyle: "italic" }}>
                No items found
              </td>
            </tr>
          )}
          {!hideTotalRow && (
            <tr>
              <td colSpan={5} style={{ border: "1px solid #111", padding: "3px 6px", fontSize: "9pt", fontWeight: "bold", textAlign: "right" }}>
                TOTAL :
              </td>
              <td style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold", textAlign: "right" }}>
                {grandTotal ? formatMoney(grandTotal).replace("₱", "") : ""}
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "2px 6px", fontSize: "9pt" }}>
              <span style={{ fontWeight: "bold" }}>(Total Amount in Words) </span>
              {amountWords}
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "0" }}>
              <div style={{ padding: "8px 10px 8px 20px", fontSize: "9pt", lineHeight: 1.28 }}>
                In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td style={{ border: "none", padding: "10px 8px 6px", fontSize: "9pt" }}>Conforme:</td>
                    <td style={{ border: "none", padding: "10px 8px 6px", fontSize: "9pt", textAlign: "left" }}>Very truly yours,</td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "24px 8px 0", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #111", width: "85%", margin: "0 auto", fontWeight: "bold", fontSize: "9pt", textAlign: "center", paddingBottom: "2px" }}>
                        {supplier}
                      </div>
                    </td>
                    <td style={{ border: "none", padding: "24px 8px 0", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #111", width: "85%", margin: "0 auto", fontWeight: "bold", fontSize: "9pt", textAlign: "center", paddingBottom: "2px" }}>
                        {officialName || ""}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "2px 8px", textAlign: "center", fontSize: "9pt" }}>Signature over Printed Name of Supplier</td>
                    <td style={{ border: "none", padding: "2px 8px", textAlign: "center", fontSize: "9pt" }}>Signature over Printed Name of Authorized Official</td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "8px 8px 2px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #111", width: "45%", margin: "0 auto" }} />
                    </td>
                    <td style={{ border: "none", padding: "4px 8px 2px", textAlign: "center", fontSize: "9pt" }}>
                      {officialDesig || ""}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "2px 8px 10px", textAlign: "center", fontSize: "9pt" }}>Date</td>
                    <td style={{ border: "none", padding: "2px 8px 10px", textAlign: "center", fontSize: "9pt" }}>Designation</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", verticalAlign: "top", padding: "10px 8px", height: "135px" }}>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>Fund Cluster :</b> {fundCluster}</div>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>Funds Available :</b> {fundsAvailable || ""}</div>
              <div style={{ borderBottom: "1px solid #111", width: "80%", margin: "28px auto 2px" }} />
              <div style={{ textAlign: "center", fontSize: "9pt" }}>
                Signature over Printed Name of Chief Accountant/Head of Accounting Division/Unit
              </div>
              {accountantName && (
                <div style={{ textAlign: "center", fontSize: "9pt", marginTop: "4px" }}>{accountantName}</div>
              )}
              {accountantDesig && (
                <div style={{ textAlign: "center", fontSize: "9pt" }}>{accountantDesig}</div>
              )}
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", verticalAlign: "top", padding: "10px 8px", height: "135px" }}>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>ORS No. :</b> {orsNo || ""}</div>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>Date of the ORS:</b> {orsDate || ""}</div>
              <div style={{ fontSize: "10pt" }}><b>Amount :</b> {orsAmount ? formatMoney(orsAmount) : ""}</div>
              <div style={{ borderBottom: "1px solid #111", width: "45%", margin: "28px auto 2px" }} />
              <div style={{ textAlign: "center", fontSize: "9pt" }}>
                Signature over Printed Name of Authorized Official
              </div>
              {officialName && (
                <div style={{ textAlign: "center", fontSize: "9pt", marginTop: "4px" }}>{officialName}</div>
              )}
              {officialDesig && (
                <div style={{ textAlign: "center", fontSize: "9pt" }}>{officialDesig}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function buildPurchaseOrderPrintHtml(data: {
  poNo: string;
  supplier: string;
  address: string;
  tin: string;
  procurementMode: string;
  deliveryPlace: string;
  deliveryTerm: string;
  deliveryDate: string;
  paymentTerm: string;
  fundCluster: string;
  items: PurchaseOrderItemRow[];
  officialName?: string | null;
  officialDesig?: string | null;
  accountantName?: string | null;
  accountantDesig?: string | null;
  orsNo?: string | null;
  orsDate?: string | null;
  fundsAvailable?: string | null;
  orsAmount?: number | null;
  poDate?: string | null;
}) {
  const grandTotal = getGrandTotal(data.items);
  const amountWords = toWords(grandTotal);
  const today = new Date().toISOString().slice(0, 10);
  const displayDate = data.poDate || today;
  const normalizedItems = data.items.filter(
    (item) =>
      String(item.description ?? "").trim() ||
      String(item.stock_no ?? "").trim() ||
      String(item.unit ?? "").trim() ||
      Number(item.quantity ?? 0) > 0 ||
      Number(item.unit_price ?? 0) > 0,
  );

  let itemRows = "";
  
  for (let i = 0; i < normalizedItems.length; i++) {
    const item = normalizedItems[i];
    const qty = Number(item?.quantity ?? 0);
    const unitCost = Number(item?.unit_price ?? 0);
    const amount = item ? getItemTotal(item) : 0;
    
    itemRows += `
        <tr>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(item?.stock_no ?? "")}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(item?.unit ?? "")}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;word-wrap:break-word;overflow-wrap:break-word">${item?.description ?? ""}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:center">${qty ? String(qty) : ""}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${unitCost ? formatMoney(unitCost).replace("₱", "") : ""}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${amount ? formatMoney(amount).replace("₱", "") : ""}</td>
        </tr>`;
  }
  
  if (normalizedItems.length === 0) {
    itemRows = `
        <tr>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
        </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Purchase Order - ${escapeHtml(data.poNo)}</title>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; color: #000; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { border: 1px solid #111; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 9pt; }
    .po-footer { page-break-inside: avoid; }
  </style>
</head>
<body>
  <table style="margin-bottom:4px;border:none">
    <tr><td style="border:none;text-align:right;font-size:11pt;font-weight:bold;padding:0">Appendix 61</td></tr>
  </table>

  <table style="border:2px solid #111;">
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
        <td colSpan="3" style="padding:2px 4px;font-size:9pt;font-weight:bold">Supplier : <span style="font-weight:normal">${escapeHtml(data.supplier)}</span></td>
        <td colSpan="3" style="padding:2px 4px;font-size:9pt;font-weight:bold">P.O. No. : <span style="font-weight:normal">${escapeHtml(data.poNo)}</span></td>
      </tr>
      <tr>
        <td colSpan="3" style="padding:2px 4px;font-size:9pt;font-weight:bold">Address : <span style="font-weight:normal">${escapeHtml(data.address)}</span></td>
        <td colSpan="3" style="padding:2px 4px;font-size:9pt;font-weight:bold">Date : <span style="font-weight:normal">${displayDate}</span></td>
      </tr>
      <tr>
        <td colSpan="3" style="padding:2px 4px;font-size:9pt;font-weight:bold">TIN : <span style="font-weight:normal">${escapeHtml(data.tin)}</span></td>
        <td colSpan="3" style="padding:2px 4px;font-size:9pt;font-weight:bold">Mode of Procurement : <span style="font-weight:normal">${escapeHtml(data.procurementMode)}</span></td>
      </tr>
      <tr>
        <td colSpan="6" style="padding:3px 4px;font-size:9pt;font-weight:bold;vertical-align:top">Gentlemen:<div style="font-weight:normal;margin-left:52px">Please furnish this Office the following articles subject to the terms and conditions contained herein:</div></td>
      </tr>
      <tr>
        <td colSpan="3" style="padding:3px 4px;font-size:9pt;font-weight:bold">Place of Delivery : <span style="font-weight:normal">${escapeHtml(data.deliveryPlace)}</span></td>
        <td colSpan="3" style="padding:3px 4px;font-size:9pt;font-weight:bold">Delivery Term : <span style="font-weight:normal">${escapeHtml(data.deliveryTerm)}</span><div style="font-weight:bold;margin-top:2px">Payment Term : <span style="font-weight:normal">${escapeHtml(data.paymentTerm)}</span></div></td>
      </tr>
      <tr>
        <td colSpan="3" style="padding:3px 4px;font-size:9pt;font-weight:bold">Date of Delivery : <span style="font-weight:normal">${escapeHtml(data.deliveryDate)}</span></td>
        <td colSpan="3" style="padding:3px 4px;font-size:9pt"></td>
      </tr>
      <tr>
        <td class="center bold small" style="padding:4px 2px">Stock/ Property No.</td>
        <td class="center bold small" style="padding:4px 2px">Unit</td>
        <td class="center bold small" style="padding:4px 2px">Description</td>
        <td class="center bold small" style="padding:4px 2px">Quantity</td>
        <td class="center bold small" style="padding:4px 2px">Unit Cost</td>
        <td class="center bold small" style="padding:4px 2px">Amount</td>
      </tr>
      ${itemRows}
      <tr>
        <td colSpan="5" style="padding:3px 6px;font-size:9pt;font-weight:bold;text-align:right">TOTAL :</td>
        <td style="padding:3px 4px;font-size:9pt;font-weight:bold;text-align:right">${grandTotal ? formatMoney(grandTotal).replace("₱", "") : ""}</td>
      </tr>
      <tr>
        <td colSpan="6" style="padding:3px 6px;font-size:9pt"><span style="font-weight:bold">(Total Amount in Words) </span>${amountWords}</td>
      </tr>
    </tbody>
  </table>

  <div class="po-footer">
    <table>
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
          <td colSpan="6" style="padding:0">
            <div style="padding:8px 10px 8px 20px;font-size:9pt;line-height:1.28">In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.</div>
            <table style="border:none">
              <tr>
                <td style="border:none;padding:10px 8px 6px;font-size:9pt">Conforme:</td>
                <td style="border:none;padding:10px 8px 6px;font-size:9pt;text-align:left">Very truly yours,</td>
              </tr>
              <tr>
                <td style="border:none;padding:24px 8px 0;text-align:center">
                  <div style="border-bottom:1px solid #111;width:85%;margin:0 auto;font-size:9pt;font-weight:bold;text-align:center;padding-bottom:2px">${escapeHtml(data.supplier)}</div>
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
                <td style="border:none;padding:8px 8px 2px;text-align:center"><div style="border-bottom:1px solid #111;width:45%;margin:0 auto"></div></td>
                <td style="border:none;padding:4px 8px 2px;text-align:center;font-size:9pt">${escapeHtml(data.officialDesig || "")}</td>
              </tr>
              <tr>
                <td style="border:none;padding:2px 8px 10px;text-align:center;font-size:9pt">Date</td>
                <td style="border:none;padding:2px 8px 10px;text-align:center;font-size:9pt">Designation</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td colSpan="3" style="vertical-align:top;padding:10px 8px;height:135px">
            <div style="font-size:10pt;margin-bottom:8px"><b>Fund Cluster :</b> ${escapeHtml(data.fundCluster)}</div>
            <div style="font-size:10pt;margin-bottom:8px"><b>Funds Available :</b> ${escapeHtml(data.fundsAvailable || "")}</div>
            <div style="border-bottom:1px solid #111;width:80%;margin:28px auto 2px"></div>
            <div style="text-align:center;font-size:9pt">Signature over Printed Name of Chief Accountant/Head of Accounting Division/Unit</div>
            ${data.accountantName ? `<div style="text-align:center;font-size:9pt;margin-top:4px">${escapeHtml(data.accountantName)}</div>` : ""}
            ${data.accountantDesig ? `<div style="text-align:center;font-size:9pt">${escapeHtml(data.accountantDesig)}</div>` : ""}
          </td>
          <td colSpan="3" style="vertical-align:top;padding:10px 8px;height:135px">
            <div style="font-size:10pt;margin-bottom:8px"><b>ORS No. :</b> ${escapeHtml(data.orsNo || "")}</div>
            <div style="font-size:10pt;margin-bottom:8px"><b>Date of the ORS:</b> ${escapeHtml(data.orsDate || "")}</div>
            <div style="font-size:10pt"><b>Amount :</b> ${data.orsAmount ? formatMoney(data.orsAmount) : ""}</div>
            <div style="border-bottom:1px solid #111;width:45%;margin:28px auto 2px"></div>
            <div style="text-align:center;font-size:9pt">Signature over Printed Name of Authorized Official</div>
            ${data.officialName ? `<div style="text-align:center;font-size:9pt;margin-top:4px">${escapeHtml(data.officialName)}</div>` : ""}
            ${data.officialDesig ? `<div style="text-align:center;font-size:9pt">${escapeHtml(data.officialDesig)}</div>` : ""}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

// Helper function to post print remark
async function postPrintRemark(fullname: string, documentType: 'PR' | 'PO' | 'ORS', userId?: number | null, poId?: number | null) {
  try {
    const supabase = createClient();
    const remarkText = `[PRINT] ${fullname} downloaded/printed a ${documentType} document`;
    
    await supabase.from('remarks').insert({
      remark: remarkText,
      user_id: userId || null,
      po_id: poId || null,
      phase: 'po',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to post print remark:', error);
  }
}

// ORS Print HTML builder - matches ORSPreview exactly
function buildORSPrintHtml(data: {
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
}) {
  const fmt = (n: number) => n ? "₱" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const displayDate = data.orsDate
    ? new Date(data.orsDate + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const amt = data.amount || 0;
  const amountWords = amt > 0 ? toWords(amt) : "";

  const escapeHtml = (value: string | null) => {
    if (!value) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>OBLIGATION REQUEST AND STATUS</title>
  <style>
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 9pt; color: #000; line-height: 1.25; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; }
    td, th { border: 1px solid #000; padding: 2px 5px; font-size: 8.5pt; vertical-align: top; }
    .side { border-top: none !important; border-bottom: none !important; }
    .b { font-weight: bold; }
    .c { text-align: center; }
    .r { text-align: right; }
    .uline { display: inline-block; border-bottom: 1px solid #000; min-width: 100px; margin-left: 4px; }
    .sig-line { border-bottom: 1px solid #000; min-height: 18px; margin-bottom: 1px; font-size: 8.5pt; }
    .sig-label { font-size: 7.5pt; }
  </style>
</head>
<body>
  <div style="text-align:right;font-style:italic;font-size:9pt;margin-bottom:4px">Appendix 11</div>
  
  <table>
    <colgroup><col style="width:62%"/><col style="width:38%"/></colgroup>
    <tbody>
      <tr>
        <td style="vertical-align:middle;padding:6px 8px" rowspan="3">
          <div style="font-weight:bold;font-size:11pt;text-align:center;margin-bottom:6px">OBLIGATION REQUEST AND STATUS</div>
          <div style="text-align:center"><span class="uline">${escapeHtml(data.entityName)}</span></div>
          <div style="text-align:center;font-size:8.5pt;font-weight:bold;margin-top:2px">Entity Name</div>
        </td>
        <td style="font-size:8.5pt;padding:4px 6px"><span class="b">Serial No. : </span><span class="uline" style="min-width:100px">${escapeHtml(data.orsNo)}</span></td>
      </tr>
      <tr><td style="font-size:8.5pt;padding:4px 6px"><span class="b">Date : </span><span class="uline" style="min-width:100px">${escapeHtml(displayDate)}</span></td></tr>
      <tr><td style="font-size:8.5pt;padding:4px 6px"><span class="b">Fund Cluster : </span><span class="uline" style="min-width:80px">${escapeHtml(data.fundCluster)}</span></td></tr>
    </tbody>
  </table>

  <table style="margin-top:-1px">
    <colgroup><col style="width:14%"/><col style="width:86%"/></colgroup>
    <tbody>
      <tr><td style="font-weight:bold;vertical-align:middle;padding:3px 6px">Payee</td><td style="padding:3px 6px">${escapeHtml(data.payee)}</td></tr>
      <tr><td style="font-weight:bold;vertical-align:middle;padding:3px 6px">Office</td><td style="padding:3px 6px">${escapeHtml(data.office)}</td></tr>
      <tr><td style="font-weight:bold;vertical-align:middle;padding:3px 6px">Address</td><td style="padding:3px 6px">${escapeHtml(data.payeeAddress)}</td></tr>
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
        <td class="c side" style="height:90px;vertical-align:top;padding-top:4px">${escapeHtml(data.responsibilityCenter)}</td>
        <td class="side" style="vertical-align:top;word-break:break-word">${escapeHtml(data.particulars)}</td>
        <td class="c side" style="vertical-align:top">${escapeHtml(data.mfoPap)}</td>
        <td class="c side" style="vertical-align:top">${escapeHtml(data.uacsCode)}</td>
        <td class="r side" style="vertical-align:top">${amt > 0 ? fmt(amt) : ""}</td>
      </tr>
      <tr>
        <td colspan="4" class="r b" style="font-size:8pt">Total</td>
        <td class="r b">${amt > 0 ? fmt(amt) : ""}</td>
      </tr>
    </tbody>
  </table>

  <table style="margin-top:-1px">
    <colgroup><col style="width:50%"/><col style="width:50%"/></colgroup>
    <tbody>
      <tr>
        <td style="padding:5px 7px;vertical-align:top">
          <div style="font-size:8pt;margin-bottom:6px"><span class="b">A.&nbsp;&nbsp;&nbsp;Certified:</span> Charges to appropriation/allotment are necessary, lawful and under my direct supervision;and supporting documents valid, proper and legal</div>
          <div style="margin-bottom:3px"><span class="sig-label">Signature&nbsp;&nbsp;&nbsp;:</span><div class="sig-line"></div></div>
          <div style="margin-bottom:3px"><span class="sig-label">Printed Name:</span><div class="sig-line" style="font-weight:normal">${escapeHtml(data.preparedByName)}</div></div>
          <div style="margin-bottom:3px"><span class="sig-label">Position&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span><div class="sig-line">${escapeHtml(data.preparedByDesig)}</div></div>
          <div style="font-size:7.5pt;text-align:center;margin-top:2px">Head, Requesting Office/Authorized Representative</div>
          <div style="margin-bottom:3px;margin-top:4px"><span class="sig-label">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span><div class="sig-line"></div></div>
        </td>
        <td style="padding:5px 7px;vertical-align:top">
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
      ${data.blankStatusSection ? `
      <tbody><tr>
        <td class="side" style="height:112px"></td>
        <td class="side"></td>
        <td class="side"></td>
        <td class="r side"></td>
        <td class="r side"></td>
        <td class="r side"></td>
        <td class="r side"></td>
        <td class="r side"></td>
      </tr></tbody>` : `
      <tbody>
        <tr>
          <td class="side" style="height:28px;font-size:7.5pt">${escapeHtml(displayDate)}</td>
          <td class="side" style="font-size:7.5pt;word-break:break-word">${escapeHtml(data.particulars)}</td>
          <td class="c side" style="font-size:7.5pt">${escapeHtml(data.referenceNo || data.orsNo)}</td>
          <td class="r side" style="font-size:7.5pt">${data.obligationAmount && data.obligationAmount > 0 ? fmt(data.obligationAmount) : ""}</td>
          <td class="r side" style="font-size:7.5pt">${data.payableAmount && data.payableAmount > 0 ? fmt(data.payableAmount) : ""}</td>
          <td class="r side" style="font-size:7.5pt">${data.paymentAmount && data.paymentAmount > 0 ? fmt(data.paymentAmount) : ""}</td>
          <td class="r side" style="font-size:7.5pt"></td>
          <td class="r side" style="font-size:7.5pt"></td>
        </tr>
        <tr><td class="side" style="height:18px"></td><td class="side"></td><td class="side"></td><td class="r side"></td><td class="r side"></td><td class="r side"></td><td class="r side"></td><td class="r side"></td></tr>
      </tbody>`}
  </table>
</body>
</html>`;
}

function downloadORS(data: {
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
  currentUserFullname?: string;
  currentUserId?: number | null;
  poId?: number | null;
  blankStatusSection?: boolean | null;
}) {
  if (data.currentUserFullname) {
    postPrintRemark(data.currentUserFullname, 'ORS', data.currentUserId, data.poId);
  }
  
  printWithIframe(sharedBuildORS(data));
}

function downloadContractPDF(data: {
  contractTitle: string;
  firstPartyAgency: string;
  firstPartyRep: string;
  firstPartyOffice: string;
  firstPartyCity: string;
  secondPartyName: string;
  secondPartyRep: string;
  secondPartyCity: string;
  commencementLocation: string;
  considerationAmount: number;
  considerationAmountWords: string;
  serviceDescription: string;
  deliveryLocation: string;
  paymentCondition: string;
  jobOrderDescription: string;
  scheduledDays: string;
  liquidatedDamagesRate: string;
  contractDate: string;
  commencementDate: string;
  witnessOne: string;
  witnessTwo: string;
  currentUserFullname?: string;
  currentUserId?: number | null;
  poId?: number | null;
}) {
  if (data.currentUserFullname) {
    postPrintRemark(data.currentUserFullname, 'PO', data.currentUserId, data.poId);
  }
  
  printWithIframe(buildContractPrintHtml(data));
}

function downloadPDF(data: {
  poNo: string;
  poId: number | null;
  supplier: string;
  address: string;
  tin: string;
  procurementMode: string;
  deliveryPlace: string;
  deliveryTerm: string;
  deliveryDate: string;
  paymentTerm: string;
  fundCluster: string;
  items: PurchaseOrderItemRow[];
  officialName?: string | null;
  officialDesig?: string | null;
  accountantName?: string | null;
  accountantDesig?: string | null;
  orsNo?: string | null;
  orsDate?: string | null;
  fundsAvailable?: string | null;
  orsAmount?: number | null;
  hideTotalRow?: boolean;
  poDate?: string | null;
  currentUserFullname?: string;
  currentUserId?: number | null;
}) {
  if (data.currentUserFullname) {
    postPrintRemark(data.currentUserFullname, 'PO', data.currentUserId, data.poId);
  }
  
  printWithIframe(sharedBuildPO(data));
}

export default function Viewpomodal({ visible, poId, onClose, currentUser }: ViewpomodalProps) {
  const [loading, setLoading] = useState(true);
  const [poHeader, setPoHeader] = useState<PurchaseOrderRow | null>(null);
  const [poItems, setPoItems] = useState<PurchaseOrderItemRow[]>([]);
  const [tab, setTab] = useState<"po" | "ors" | "contract">("po");
  const hasORS = (poHeader?.status_id ?? 0) >= 13; // ORS Creation or beyond
  const [currentUserFullname, setCurrentUserFullname] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [orsEntry, setOrsEntry] = useState<OrsEntryType | null>(null);
  const [contractDoc, setContractDoc] = useState<ContractDocument | null>(null);
  const hasContract = !!contractDoc; // Contract tab visible if contract document exists

  // Load current user from localStorage
  useEffect(() => {
    if (currentUser?.fullname) {
      setCurrentUserFullname(currentUser.fullname);
    }
    if (currentUser?.id) {
      setCurrentUserId(currentUser.id);
    }
  }, [currentUser]);

  // Fetch ORS entry from ors_entries table by ORS number
  useEffect(() => {
    if (!visible || !poHeader?.ors_no) { setOrsEntry(null); return; }
    const supabase = createClient();
    supabase
      .from("ors_entries")
      .select("*")
      .eq("ors_no", poHeader.ors_no)
      .maybeSingle()
      .then(({ data }) => { if (data) setOrsEntry(data as OrsEntryType); });
  }, [visible, poHeader?.ors_no]);

  // Fetch Contract document from contract_documents table by po_id
  useEffect(() => {
    if (!visible || !poId) { setContractDoc(null); return; }
    const supabase = createClient();
    supabase
      .from("contract_documents")
      .select("*")
      .eq("po_id", poId)
      .maybeSingle()
      .then(({ data }) => { if (data) setContractDoc(data as ContractDocument); });
  }, [visible, poId]);

  useEffect(() => {
    if (!visible || !poId) return;

    let isMounted = true;
    setLoading(true);

    fetchPOWithItemsById(poId)
      .then(({ header, items }) => {
        if (isMounted) {
          setPoHeader(header);
          setPoItems(items);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch PO details:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, poId]);

  const grandTotal = getGrandTotal(poItems);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">View Purchase Order</h2>
            <p className="text-emerald-100 text-sm mt-1">Appendix 61 · Official Government Form</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Tab Toggle — PO / ORS */}
            <div className="flex bg-white/20 rounded-lg overflow-hidden border border-white/30 backdrop-blur">
              <button
                onClick={() => setTab("po")}
                className={`px-5 py-2 text-sm font-semibold transition-all ${
                  tab === "po" ? "bg-white text-emerald-700" : "text-white hover:bg-white/10"
                }`}
              >
                PO
              </button>
              {hasORS && (
                <button
                  onClick={() => setTab("ors")}
                  className={`px-5 py-2 text-sm font-semibold transition-all ${
                    tab === "ors" ? "bg-white text-emerald-700" : "text-white hover:bg-white/10"
                  }`}
                >
                  ORS
                </button>
              )}
              {hasContract && (
                <button
                  onClick={() => setTab("contract")}
                  className={`px-5 py-2 text-sm font-semibold transition-all ${
                    tab === "contract" ? "bg-white text-emerald-700" : "text-white hover:bg-white/10"
                  }`}
                >
                  Contract
                </button>
              )}
            </div>
            <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* PO Tab — Two columns: Form fields (left) + Preview (right) */}
          {tab === "po" && (
            <>
              {/* PO Form Fields — Left */}
              <div className="flex flex-[2] flex-col overflow-hidden border-r border-gray-200">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="space-y-3 w-full px-8">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : !poHeader ? (
                  <div className="flex-1 flex items-center justify-center text-red-500 font-semibold">
                    Failed to load Purchase Order.
                  </div>
                ) : (
                  <>
                    <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

                      {/* View-only notice */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
                        <span>👁</span> Viewing PO details. {hasORS ? "Switch to ORS tab for ORS information." : "ORS not yet created."}
                      </div>

                  {/* Header Information */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Header Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PO Number</label>
                        <input className={readonlyCls} value={poHeader.po_no || ""} readOnly tabIndex={-1} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Supplier</label>
                          <input className={readonlyCls} value={poHeader.supplier || ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">TIN</label>
                          <input className={readonlyCls} value={poHeader.tin || ""} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Address</label>
                          <input className={readonlyCls} value={poHeader.address || ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Procurement Mode</label>
                          <input className={readonlyCls} value={poHeader.procurement_mode || ""} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Office / Section</label>
                          <input className={readonlyCls} value={poHeader.office_section || ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Fund Cluster</label>
                          <input className={readonlyCls} value={poHeader.fund_cluster || ""} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Place of Delivery</label>
                          <input className={readonlyCls} value={poHeader.delivery_place || ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Delivery Term</label>
                          <input className={readonlyCls} value={poHeader.delivery_term || ""} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Delivery Date</label>
                          <input className={readonlyCls} value={poHeader.delivery_date || ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Payment Term</label>
                          <input className={readonlyCls} value={poHeader.payment_term || ""} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">ORS No.</label>
                          <input className={readonlyCls} value={poHeader.ors_no || ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">ORS Date</label>
                          <input className={readonlyCls} value={poHeader.ors_date || ""} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Funds Available</label>
                          <input className={readonlyCls} value={poHeader.funds_available || ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">ORS Amount</label>
                          <input className={readonlyCls} value={poHeader.ors_amount != null ? formatMoney(poHeader.ors_amount) : ""} readOnly tabIndex={-1} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                        Items <span className="text-gray-400 font-normal normal-case ml-1">({poItems.length})</span>
                      </h3>
                    </div>
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {poItems.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No items on this PO.</p>
                      ) : (
                        poItems.map((item, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Item {index + 1}</div>
                            <div className="mb-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Item Description</label>
                              <div className={readonlyCls} style={{ minHeight: "38px", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: item.description || "" }} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Stock/Prop No.</label>
                                <input className={readonlyCls} value={item.stock_no || ""} readOnly tabIndex={-1} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit</label>
                                <input className={readonlyCls} value={item.unit || ""} readOnly tabIndex={-1} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Qty</label>
                                <input className={readonlyCls} value={String(item.quantity ?? "")} readOnly tabIndex={-1} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit Cost</label>
                                <input className={readonlyCls} value={item.unit_price != null ? formatMoney(item.unit_price) : ""} readOnly tabIndex={-1} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Total Cost</label>
                                <input className={`${readonlyCls} bg-emerald-50 font-bold text-emerald-700`} value={getItemTotal(item).toFixed(2)} readOnly tabIndex={-1} />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="bg-emerald-700 text-white px-4 py-3 rounded-lg flex justify-between items-center font-bold">
                    <span>GRAND TOTAL</span>
                    <span className="text-lg">{formatMoney(grandTotal)}</span>
                  </div>

                  {/* Signatures */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Signatures</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Authorized Official</label>
                        <input className={readonlyCls} value={poHeader.official_name || ""} readOnly tabIndex={-1} />
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2 mt-3">Designation</label>
                        <input className={readonlyCls} value={poHeader.official_desig || ""} readOnly tabIndex={-1} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Accountant</label>
                        <input className={readonlyCls} value={poHeader.accountant_name || ""} readOnly tabIndex={-1} />
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2 mt-3">Designation</label>
                        <input className={readonlyCls} value={poHeader.accountant_desig || ""} readOnly tabIndex={-1} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* PO Preview — Right */}
          <div className="flex flex-[3] overflow-y-auto bg-gray-100 flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">PO PREVIEW</h3>
                {poHeader && (
                  <button
                    onClick={() =>
                      downloadPDF({
                        poNo: poHeader.po_no || "",
                        poId: poHeader.id,
                        supplier: poHeader.supplier || "",
                        address: poHeader.address || "",
                        tin: poHeader.tin || "",
                        procurementMode: poHeader.procurement_mode || "",
                        deliveryPlace: poHeader.delivery_place || "",
                        deliveryTerm: poHeader.delivery_term || "",
                        deliveryDate: poHeader.delivery_date || "",
                        paymentTerm: poHeader.payment_term || "",
                        fundCluster: poHeader.fund_cluster || "",
                        items: poItems,
                        officialName: poHeader.official_name,
                        officialDesig: poHeader.official_desig,
                        accountantName: poHeader.accountant_name,
                        accountantDesig: poHeader.accountant_desig,
                        orsNo: poHeader.ors_no,
                        orsDate: poHeader.ors_date,
                        fundsAvailable: poHeader.funds_available,
                        orsAmount: poHeader.ors_amount,
                        hideTotalRow: poHeader.hide_total_row ?? false,
                        poDate: poHeader.date,
                        currentUserFullname,
                        currentUserId,
                      })
                    }
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    <RiFilePdf2Line size={16} /> PDF
                  </button>
                )}
              </div>
              {poHeader && (
                <div className="bg-white rounded-lg shadow-lg p-8 text-black">
                  <POPreview
                    poNo={poHeader.po_no || ""}
                    supplier={poHeader.supplier || ""}
                    address={poHeader.address || ""}
                    tin={poHeader.tin || ""}
                    procurementMode={poHeader.procurement_mode || ""}
                    deliveryPlace={poHeader.delivery_place || ""}
                    deliveryTerm={poHeader.delivery_term || ""}
                    deliveryDate={poHeader.delivery_date || ""}
                    paymentTerm={poHeader.payment_term || ""}
                    fundCluster={poHeader.fund_cluster || ""}
                    items={poItems}
                    officialName={poHeader.official_name}
                    officialDesig={poHeader.official_desig}
                    accountantName={poHeader.accountant_name}
                    accountantDesig={poHeader.accountant_desig}
                    orsNo={poHeader.ors_no}
                    orsDate={poHeader.ors_date}
                    fundsAvailable={poHeader.funds_available}
                    orsAmount={poHeader.ors_amount}
                    hideTotalRow={poHeader.hide_total_row ?? false}
                    poDate={poHeader.date}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ORS Tab — Two column: ORS info (left) + ORS Preview (right) */}
          {tab === "ors" && (
            <>
              {/* ORS Info Fields */}
              <div className="flex flex-[2] flex-col overflow-hidden border-r border-gray-200">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="space-y-3 w-full px-8">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : !poHeader ? (
                  <div className="flex-1 flex items-center justify-center text-red-500 font-semibold">
                    Failed to load ORS data.
                  </div>
                ) : (
                  <>
                    <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
                      {/* ORS Notice */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-medium">
                        <span>📄</span> Viewing ORS details for PO #{poHeader.po_no}
                      </div>

                      {/* ORS Header Info */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">ORS Information</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">ORS Number</label>
                              <input className={readonlyCls} value={orsEntry?.ors_no || poHeader.ors_no || ""} readOnly tabIndex={-1} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">ORS Date</label>
                              <input className={readonlyCls} value={orsEntry?.date_created || poHeader.ors_date || ""} readOnly tabIndex={-1} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Entity Name</label>
                            <input className={readonlyCls} value={orsEntry?.entity_name || poHeader.office_section || ""} readOnly tabIndex={-1} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Fund Cluster</label>
                              <input className={readonlyCls} value={orsEntry?.fund_cluster || poHeader.fund_cluster || ""} readOnly tabIndex={-1} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Responsibility Center</label>
                              <input className={readonlyCls} value={orsEntry?.responsibility_center || ""} readOnly tabIndex={-1} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payee Info */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Payee Information</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Payee Name</label>
                            <input className={readonlyCls} value={poHeader.supplier || ""} readOnly tabIndex={-1} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Office</label>
                            <input className={readonlyCls} value={orsEntry?.office || poHeader.office_section || ""} readOnly tabIndex={-1} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Address</label>
                            <input className={readonlyCls} value={orsEntry?.payee_address || poHeader.address || ""} readOnly tabIndex={-1} />
                          </div>
                        </div>
                      </div>

                      {/* ORS Details */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Obligation Details</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Particulars</label>
                            <textarea className={`${readonlyCls} min-h-[80px]`} value={orsEntry?.particulars || ""} readOnly tabIndex={-1} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">MFO/PAP</label>
                              <input className={readonlyCls} value={orsEntry?.mfo_pap || ""} readOnly tabIndex={-1} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">UACS Code</label>
                              <input className={readonlyCls} value={orsEntry?.uacs_code || ""} readOnly tabIndex={-1} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">ORS Amount</label>
                            <input className={`${readonlyCls} bg-emerald-50 font-bold text-emerald-700`} value={orsEntry?.obligation_amount != null ? formatMoney(orsEntry.obligation_amount) : (poHeader.ors_amount != null ? formatMoney(poHeader.ors_amount) : "")} readOnly tabIndex={-1} />
                          </div>
                        </div>
                      </div>

                      {/* Signatories */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Signatories</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Prepared By (Name)</label>
                              <input className={readonlyCls} value={orsEntry?.prepared_by_name || poHeader.official_name || ""} readOnly tabIndex={-1} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Designation</label>
                              <input className={readonlyCls} value={orsEntry?.prepared_by_desig || poHeader.official_desig || ""} readOnly tabIndex={-1} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ORS Preview */}
              <div className="flex flex-[3] overflow-y-auto bg-gray-100 flex-col">
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">ORS PREVIEW</h3>
                    {poHeader && (
                      <button
                        onClick={() =>
                          downloadORS({
                            orsNo: orsEntry?.ors_no || poHeader.ors_no,
                            orsDate: orsEntry?.date_created || poHeader.ors_date,
                            entityName: orsEntry?.entity_name || poHeader.office_section,
                            payee: poHeader.supplier,
                            payeeAddress: orsEntry?.payee_address || poHeader.address,
                            office: orsEntry?.office || poHeader.office_section,
                            fundCluster: orsEntry?.fund_cluster || poHeader.fund_cluster,
                            responsibilityCenter: orsEntry?.responsibility_center || null,
                            particulars: orsEntry?.particulars || null,
                            mfoPap: orsEntry?.mfo_pap || null,
                            uacsCode: orsEntry?.uacs_code || null,
                            amount: orsEntry?.obligation_amount || poHeader.ors_amount,
                            referenceNo: orsEntry?.reference_no || null,
                            obligationAmount: orsEntry?.obligation_amount || null,
                            payableAmount: orsEntry?.payable_amount || null,
                            paymentAmount: orsEntry?.payment_amount || null,
                            notYetDueBalance: orsEntry?.not_yet_due_balance || null,
                            dueDemandableBalance: orsEntry?.due_demandable_balance || null,
                            preparedByName: orsEntry?.prepared_by_name || poHeader.official_name,
                            preparedByDesig: orsEntry?.prepared_by_desig || poHeader.official_desig,
                            blankStatusSection: orsEntry?.blank_status_section ?? false,
                            currentUserFullname,
                            currentUserId,
                            poId: poHeader.id,
                          })
                        }
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                      >
                        <RiFilePdf2Line size={16} /> PDF
                      </button>
                    )}
                  </div>
                  {poHeader && (
                    <div className="bg-white rounded-lg shadow-lg p-8 text-black">
                      <ORSPreview
                        orsNo={orsEntry?.ors_no || poHeader.ors_no}
                        orsDate={orsEntry?.date_created || poHeader.ors_date}
                        entityName={orsEntry?.entity_name || poHeader.office_section}
                        payee={poHeader.supplier}
                        payeeAddress={orsEntry?.payee_address || poHeader.address}
                        office={orsEntry?.office || poHeader.office_section}
                        fundCluster={orsEntry?.fund_cluster || poHeader.fund_cluster}
                        responsibilityCenter={orsEntry?.responsibility_center || null}
                        particulars={orsEntry?.particulars || null}
                        mfoPap={orsEntry?.mfo_pap || null}
                        uacsCode={orsEntry?.uacs_code || null}
                        amount={orsEntry?.obligation_amount || poHeader.ors_amount}
                        referenceNo={orsEntry?.reference_no || null}
                        obligationAmount={orsEntry?.obligation_amount || null}
                        payableAmount={orsEntry?.payable_amount || null}
                        paymentAmount={orsEntry?.payment_amount || null}
                        notYetDueBalance={orsEntry?.not_yet_due_balance || null}
                        dueDemandableBalance={orsEntry?.due_demandable_balance || null}
                        preparedByName={orsEntry?.prepared_by_name || poHeader.official_name}
                        preparedByDesig={orsEntry?.prepared_by_desig || poHeader.official_desig}
                        blankStatusSection={orsEntry?.blank_status_section ?? false}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

      {/* Contract Tab — Two column: Contract info (left) + Contract Preview (right) */}
          {tab === "contract" && (
            <>
              {/* Contract Info Fields */}
              <div className="flex flex-[2] flex-col overflow-hidden border-r border-gray-200">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="space-y-3 w-full px-8">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : !poHeader || !contractDoc ? (
                  <div className="flex-1 flex items-center justify-center text-amber-600 font-semibold">
                    {!contractDoc ? "Contract document not found." : "Failed to load Contract data."}
                  </div>
                ) : (
                  <>
                    <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
                      {/* Contract Notice */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                        <span>📜</span> Viewing Contract details for PO #{poHeader.po_no}
                      </div>

                      {/* Contract Header Info */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Contract Information</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Contract Title</label>
                            <input className={readonlyCls} value={contractDoc.contract_title || "CONTRACT FOR SERVICES"} readOnly tabIndex={-1} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Contract Date</label>
                              <input className={readonlyCls} value={contractDoc.contract_date || ""} readOnly tabIndex={-1} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Commencement Date</label>
                              <input className={readonlyCls} value={contractDoc.commencement_date || ""} readOnly tabIndex={-1} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Parties Info */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Parties</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">First Party (Agency)</label>
                            <input className={readonlyCls} value={contractDoc.first_party_agency || ""} readOnly tabIndex={-1} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">First Party Representative</label>
                            <input className={readonlyCls} value={contractDoc.first_party_rep || ""} readOnly tabIndex={-1} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Second Party (Supplier)</label>
                            <input className={readonlyCls} value={contractDoc.second_party_name || ""} readOnly tabIndex={-1} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Second Party Representative</label>
                            <input className={readonlyCls} value={contractDoc.second_party_rep || ""} readOnly tabIndex={-1} />
                          </div>
                        </div>
                      </div>

                      {/* Contract Details */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Contract Details</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Service Description</label>
                            <textarea className={`${readonlyCls} min-h-[60px]`} value={contractDoc.service_description || ""} readOnly tabIndex={-1} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Consideration Amount</label>
                            <input className={`${readonlyCls} bg-emerald-50 font-bold text-emerald-700`} value={contractDoc.consideration_amount != null ? formatMoney(contractDoc.consideration_amount) : ""} readOnly tabIndex={-1} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Amount in Words</label>
                            <input className={readonlyCls} value={contractDoc.consideration_amount_words || ""} readOnly tabIndex={-1} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Scheduled Days</label>
                              <input className={readonlyCls} value={contractDoc.scheduled_days || ""} readOnly tabIndex={-1} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Liquidated Damages Rate</label>
                              <input className={readonlyCls} value={contractDoc.liquidated_damages_rate || ""} readOnly tabIndex={-1} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Witnesses */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Witnesses</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Witness 1</label>
                            <input className={readonlyCls} value={contractDoc.witness_one || ""} readOnly tabIndex={-1} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Witness 2</label>
                            <input className={readonlyCls} value={contractDoc.witness_two || ""} readOnly tabIndex={-1} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Contract Preview — Right */}
              <div className="flex flex-[3] overflow-y-auto bg-gray-100 flex-col">
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">CONTRACT PREVIEW</h3>
                    {poHeader && contractDoc && (
                      <button
                        onClick={() =>
                          downloadContractPDF({
                            contractTitle: contractDoc.contract_title || "CONTRACT FOR SERVICES",
                            firstPartyAgency: contractDoc.first_party_agency || "",
                            firstPartyRep: contractDoc.first_party_rep || "",
                            firstPartyOffice: contractDoc.first_party_office || "",
                            firstPartyCity: contractDoc.first_party_city || "",
                            secondPartyName: contractDoc.second_party_name || "",
                            secondPartyRep: contractDoc.second_party_rep || "",
                            secondPartyCity: contractDoc.second_party_city || "",
                            commencementLocation: contractDoc.commencement_location || "",
                            considerationAmount: contractDoc.consideration_amount || 0,
                            considerationAmountWords: contractDoc.consideration_amount_words || "",
                            serviceDescription: contractDoc.service_description || "",
                            deliveryLocation: contractDoc.delivery_location || "",
                            paymentCondition: contractDoc.payment_condition || "",
                            jobOrderDescription: contractDoc.job_order_description || "",
                            scheduledDays: contractDoc.scheduled_days || "",
                            liquidatedDamagesRate: contractDoc.liquidated_damages_rate || "",
                            contractDate: contractDoc.contract_date || "",
                            commencementDate: contractDoc.commencement_date || "",
                            witnessOne: contractDoc.witness_one || "",
                            witnessTwo: contractDoc.witness_two || "",
                            currentUserFullname,
                            currentUserId,
                            poId: poHeader.id,
                          })
                        }
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                      >
                        <RiFilePdf2Line size={16} /> PDF
                      </button>
                    )}
                  </div>
                  {poHeader && contractDoc && (
                    <div className="bg-white rounded-lg shadow-lg p-8 text-black">
                      <ContractPreview
                        contractTitle={contractDoc.contract_title}
                        firstPartyAgency={contractDoc.first_party_agency}
                        firstPartyRep={contractDoc.first_party_rep}
                        firstPartyOffice={contractDoc.first_party_office}
                        secondPartyName={contractDoc.second_party_name}
                        secondPartyRep={contractDoc.second_party_rep}
                        secondPartyCity={contractDoc.second_party_city}
                        commencementLocation={contractDoc.commencement_location}
                        considerationAmount={contractDoc.consideration_amount}
                        considerationAmountWords={contractDoc.consideration_amount_words}
                        serviceDescription={contractDoc.service_description}
                        paymentCondition={contractDoc.payment_condition}
                        jobOrderDescription={contractDoc.job_order_description}
                        scheduledDays={contractDoc.scheduled_days}
                        liquidatedDamagesRate={contractDoc.liquidated_damages_rate}
                        contractDate={contractDoc.contract_date}
                        commencementDate={contractDoc.commencement_date}
                        witnessOne={contractDoc.witness_one}
                        witnessTwo={contractDoc.witness_two}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
