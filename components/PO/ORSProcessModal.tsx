"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiSaveLine,
  RiFlagLine,
  RiFilePdf2Line,
} from "react-icons/ri";
import type { PurchaseOrderRow, PurchaseOrderItemRow } from "@/utils/supabase/po";
import { StatusFlagPicker, FlagButton, type StatusFlag, getFlagId } from "@/components/StatusFlagPicker";

interface ORSProcessModalProps {
  visible: boolean;
  po: PurchaseOrderRow | null;
  currentUser: {
    id?: number;
    fullname: string;
    username: string;
    role_id: number;
    division_id?: number | null;
  } | null;
  onClose: () => void;
  onSubmit: (statusId: number, remarks: string, statusFlagId?: number | null) => Promise<void>;
}

// Number to words converter
function toWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion"];

  function convertChunk(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertChunk(n % 100) : "");
  }

  let result = "";
  let scaleIndex = 0;
  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);

  let n = wholePart;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const chunkWords = convertChunk(chunk);
      result = chunkWords + (scales[scaleIndex] ? " " + scales[scaleIndex] : "") + (result ? " " + result : "");
    }
    n = Math.floor(n / 1000);
    scaleIndex++;
  }

  if (decimalPart > 0) {
    result += " and " + convertChunk(decimalPart) + "/100";
  }

  return result.trim() + " Pesos Only";
}

// Editable input styles for live preview
const editableInputCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-orange-500 focus:bg-orange-50/30 transition-colors min-w-[60px] text-[8.5pt]";
const editableInputNumberCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-orange-500 focus:bg-orange-50/30 transition-colors min-w-[60px] text-[8.5pt] text-right";

// Type for text-only lines in the ORS (for printing only)
type TextOnlyLine = {
  id: string;
  text: string;
};

// ─── Editable ORS Preview — allows manual input directly in the preview panel ────────
function ORSEditablePreview({
  orsNo, setOrsNo,
  orsDate, setOrsDate,
  entityName, setEntityName,
  payee, setPayee,
  payeeAddress, setPayeeAddress,
  office, setOffice,
  fundCluster, setFundCluster,
  responsibilityCenter, setResponsibilityCenter,
  particulars, setParticulars,
  mfoPap, setMfoPap,
  uacsCode, setUacsCode,
  referenceNo, setReferenceNo,
  obligationAmount, setObligationAmount,
  payableAmount, setPayableAmount,
  paymentAmount, setPaymentAmount,
  notYetDueBalance, setNotYetDueBalance,
  dueDemandableBalance, setDueDemandableBalance,
  preparedByName, setPreparedByName,
  preparedByDesig, setPreparedByDesig,
  textOnlyLines,
  addTextOnlyLine,
  updateTextOnlyLine,
  removeTextOnlyLine,
}: {
  orsNo: string; setOrsNo: (v: string) => void;
  orsDate: string; setOrsDate: (v: string) => void;
  entityName: string; setEntityName: (v: string) => void;
  payee: string; setPayee: (v: string) => void;
  payeeAddress: string; setPayeeAddress: (v: string) => void;
  office: string; setOffice: (v: string) => void;
  fundCluster: string; setFundCluster: (v: string) => void;
  responsibilityCenter: string; setResponsibilityCenter: (v: string) => void;
  particulars: string; setParticulars: (v: string) => void;
  mfoPap: string; setMfoPap: (v: string) => void;
  uacsCode: string; setUacsCode: (v: string) => void;
  referenceNo: string; setReferenceNo: (v: string) => void;
  obligationAmount: number; setObligationAmount: (v: number) => void;
  payableAmount: number; setPayableAmount: (v: number) => void;
  paymentAmount: number; setPaymentAmount: (v: number) => void;
  notYetDueBalance: number; setNotYetDueBalance: (v: number) => void;
  dueDemandableBalance: number; setDueDemandableBalance: (v: number) => void;
  preparedByName: string; setPreparedByName: (v: string) => void;
  preparedByDesig: string; setPreparedByDesig: (v: string) => void;
  textOnlyLines: TextOnlyLine[];
  addTextOnlyLine: () => void;
  updateTextOnlyLine: (id: string, text: string) => void;
  removeTextOnlyLine: (id: string) => void;
}) {
  const fmt = (n: number) =>
    n ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  const displayDate = orsDate
    ? new Date(orsDate + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const amount = obligationAmount || 0;
  const amountWords = useMemo(() => (amount > 0 ? toWords(amount) : ""), [amount]);

  // Shared style tokens
  const S = {
    root: { fontFamily: "'Times New Roman', Times, serif", fontSize: "9pt", color: "#000", lineHeight: "1.25" } as React.CSSProperties,
    tbl: { width: "100%", borderCollapse: "collapse" as const, tableLayout: "fixed" as const } as React.CSSProperties,
    td: { border: "1px solid #000", padding: "2px 5px", fontSize: "8.5pt", verticalAlign: "top" as const } as React.CSSProperties,
    tdC: { border: "1px solid #000", padding: "2px 5px", fontSize: "8.5pt", verticalAlign: "top" as const, textAlign: "center" as const } as React.CSSProperties,
    tdR: { border: "1px solid #000", padding: "2px 5px", fontSize: "8.5pt", verticalAlign: "top" as const, textAlign: "right" as const } as React.CSSProperties,
    b: { fontWeight: "bold" } as React.CSSProperties,
    uline: { display: "inline-block", borderBottom: "1px solid #000", minWidth: "160px", marginLeft: "4px" } as React.CSSProperties,
    sigLine: { borderBottom: "1px solid #000", minHeight: "18px", marginBottom: "1px", fontSize: "8.5pt" } as React.CSSProperties,
    sigLabel: { fontSize: "7.5pt" } as React.CSSProperties,
  };

  return (
    <div style={S.root}>
      <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "9pt", marginBottom: "4px" }}>Appendix 11</div>

      <table style={{ ...S.tbl, borderCollapse: "collapse" }}>
        <colgroup><col style={{ width: "62%" }} /><col style={{ width: "38%" }} /></colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.td, verticalAlign: "middle", padding: "6px 8px" }} rowSpan={3}>
              <div style={{ fontWeight: "bold", fontSize: "11pt", textAlign: "center", marginBottom: "6px" }}>OBLIGATION REQUEST AND STATUS</div>
              <div style={{ textAlign: "center" }}>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="Entity Name"
                  className={editableInputCls}
                  style={{ ...S.uline, minWidth: "200px", textAlign: "center" }}
                />
              </div>
              <div style={{ textAlign: "center", fontSize: "8.5pt", fontWeight: "bold", marginTop: "2px" }}>Entity Name</div>
            </td>
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Serial No. : </span>
              <input
                type="text"
                value={orsNo}
                onChange={(e) => setOrsNo(e.target.value)}
                placeholder="ORS-XXXX"
                className={editableInputCls}
                style={{ ...S.uline, minWidth: "100px" }}
              />
            </td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Date : </span>
              <input
                type="date"
                value={orsDate}
                onChange={(e) => setOrsDate(e.target.value)}
                className={editableInputCls}
                style={{ ...S.uline, minWidth: "100px" }}
              />
            </td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Fund Cluster : </span>
              <input
                type="text"
                value={fundCluster}
                onChange={(e) => setFundCluster(e.target.value)}
                placeholder="01"
                className={editableInputCls}
                style={{ ...S.uline, minWidth: "80px" }}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...S.tbl, marginTop: "-1px" }}>
        <colgroup><col style={{ width: "14%" }} /><col style={{ width: "86%" }} /></colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Payee</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>
              <input
                type="text"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="Enter payee name"
                className={editableInputCls}
                style={{ width: "95%" }}
              />
            </td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Office</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>
              <input
                type="text"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                placeholder="Enter office"
                className={editableInputCls}
                style={{ width: "95%" }}
              />
            </td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Address</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>
              <input
                type="text"
                value={payeeAddress}
                onChange={(e) => setPayeeAddress(e.target.value)}
                placeholder="Enter address"
                className={editableInputCls}
                style={{ width: "95%" }}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...S.tbl, marginTop: "-1px" }}>
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
            <td style={{ ...S.tdC, height: "90px", verticalAlign: "top", paddingTop: "4px" }}>
              <input
                type="text"
                value={responsibilityCenter}
                onChange={(e) => setResponsibilityCenter(e.target.value)}
                placeholder="Center"
                className={editableInputCls}
                style={{ width: "90%", textAlign: "center" }}
              />
            </td>
            <td style={{ ...S.td, verticalAlign: "top", wordBreak: "break-word" }}>
              <textarea
                value={particulars}
                onChange={(e) => setParticulars(e.target.value)}
                placeholder="Enter particulars"
                className={editableInputCls}
                style={{ width: "95%", minHeight: "70px", resize: "none" }}
              />
            </td>
            <td style={{ ...S.tdC, verticalAlign: "top" }}>
              <input
                type="text"
                value={mfoPap}
                onChange={(e) => setMfoPap(e.target.value)}
                placeholder="MFO"
                className={editableInputCls}
                style={{ width: "90%", textAlign: "center" }}
              />
            </td>
            <td style={{ ...S.tdC, verticalAlign: "top" }}>
              <input
                type="text"
                value={uacsCode}
                onChange={(e) => setUacsCode(e.target.value)}
                placeholder="UACS"
                className={editableInputCls}
                style={{ width: "90%", textAlign: "center" }}
              />
            </td>
            <td style={{ ...S.tdR, verticalAlign: "top" }}>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setObligationAmount(Number(e.target.value))}
                className={editableInputNumberCls}
                style={{ width: "90%" }}
              />
            </td>
          </tr>
          {/* Text-only lines for printing - descriptive lines without amounts */}
          {textOnlyLines.map((line) => (
            <tr key={line.id} style={{ backgroundColor: "#fefce8" }}>
              <td style={{ ...S.tdC, verticalAlign: "top" }}></td>
              <td colSpan={3} style={{ ...S.td, verticalAlign: "top", wordBreak: "break-word" }}>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs italic">Text:</span>
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => updateTextOnlyLine(line.id, e.target.value)}
                    placeholder="Enter descriptive text (for printing only)..."
                    className={`${editableInputCls} flex-1 bg-yellow-50/50`}
                    style={{ fontStyle: "italic", color: "#666" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTextOnlyLine(line.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                    title="Remove text line"
                  >
                    ×
                  </button>
                </div>
              </td>
              <td style={{ ...S.tdR, verticalAlign: "top" }}></td>
            </tr>
          ))}
          {/* Add text-only line button */}
          <tr>
            <td colSpan={5} style={{ border: "none", padding: "2px", textAlign: "center" }}>
              <button
                type="button"
                onClick={addTextOnlyLine}
                className="text-gray-400 hover:text-orange-600 text-[10px] italic transition-colors"
                title="Insert text-only descriptive line"
              >
                + insert text-only line
              </button>
            </td>
          </tr>
          <tr>
            <td colSpan={4} style={{ ...S.tdR, ...S.b, fontSize: "8pt" }}>Total</td>
            <td style={{ ...S.tdR, ...S.b }}>{amount > 0 ? fmt(amount) : ""}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...S.tbl, marginTop: "-1px" }}>
        <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.td, padding: "5px 7px", verticalAlign: "top" }}>
              <div style={{ fontSize: "8pt", marginBottom: "6px" }}>
                <span style={S.b}>A. Certified:</span> Charges to appropriation/allotment are necessary, lawful and under my direct supervision;and supporting documents valid, proper and legal
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Printed Name:</span>
                <input
                  type="text"
                  value={preparedByName}
                  onChange={(e) => setPreparedByName(e.target.value)}
                  className={editableInputCls}
                  style={{ ...S.sigLine, fontWeight: "normal", width: "70%" }}
                />
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Position :</span>
                <input
                  type="text"
                  value={preparedByDesig}
                  onChange={(e) => setPreparedByDesig(e.target.value)}
                  className={editableInputCls}
                  style={{ ...S.sigLine, width: "70%" }}
                />
              </div>
            </td>
            <td style={{ ...S.td, padding: "5px 7px", verticalAlign: "top" }}>
              <div style={{ fontSize: "8pt", marginBottom: "6px" }}>
                <span style={S.b}>B. Certified:</span> Allotment available and obligated for the purpose/adjustment necessary as indicated above
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {amount > 0 && (
        <div style={{ marginTop: "4px", fontSize: "7.5pt", fontStyle: "italic" }}>
          Amount in Words: <strong>{amountWords}</strong>
        </div>
      )}
    </div>
  );
}

// ─── ORS Preview — pixel-faithful replica of Appendix 11 PDF template ────────
function ORSPreview({
  orsNo, orsDate, entityName, payee, payeeAddress, office,
  fundCluster, responsibilityCenter, particulars, mfoPap, uacsCode,
  amount, referenceNo, obligationAmount, payableAmount, paymentAmount,
  notYetDueBalance, dueDemandableBalance, preparedByName, preparedByDesig,
}: {
  orsNo: string; orsDate: string; entityName: string; payee: string;
  payeeAddress: string; office: string; fundCluster: string;
  responsibilityCenter: string; particulars: string; mfoPap: string;
  uacsCode: string; amount: number; referenceNo: string;
  obligationAmount: number; payableAmount: number; paymentAmount: number;
  notYetDueBalance: number; dueDemandableBalance: number;
  preparedByName: string; preparedByDesig: string;
}) {
  const fmt = (n: number) =>
    n ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  const displayDate = orsDate
    ? new Date(orsDate + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const amountWords = useMemo(() => (amount > 0 ? toWords(amount) : ""), [amount]);

  // Shared style tokens — matching PDF exactly
  const S = {
    root: {
      fontFamily: "'Times New Roman', Times, serif",
      fontSize: "9pt",
      color: "#000",
      lineHeight: "1.25",
    } as React.CSSProperties,
    tbl: {
      width: "100%",
      borderCollapse: "collapse" as const,
      tableLayout: "fixed" as const,
    } as React.CSSProperties,
    // standard bordered cell
    td: {
      border: "1px solid #000",
      padding: "2px 5px",
      fontSize: "8.5pt",
      verticalAlign: "top" as const,
    } as React.CSSProperties,
    tdC: {
      border: "1px solid #000",
      padding: "2px 5px",
      fontSize: "8.5pt",
      verticalAlign: "top" as const,
      textAlign: "center" as const,
    } as React.CSSProperties,
    tdR: {
      border: "1px solid #000",
      padding: "2px 5px",
      fontSize: "8.5pt",
      verticalAlign: "top" as const,
      textAlign: "right" as const,
    } as React.CSSProperties,
    b: { fontWeight: "bold" } as React.CSSProperties,
    // underline placeholder
    uline: {
      display: "inline-block",
      borderBottom: "1px solid #000",
      minWidth: "160px",
      marginLeft: "4px",
    } as React.CSSProperties,
    sigLine: {
      borderBottom: "1px solid #000",
      minHeight: "18px",
      marginBottom: "1px",
      fontSize: "8.5pt",
    } as React.CSSProperties,
    sigLabel: {
      fontSize: "7.5pt",
    } as React.CSSProperties,
  };

  return (
    <div style={S.root}>

      {/* ══════════════════════════════════════════════════════
          "Appendix 11" — upper-right, italic, outside the box
      ══════════════════════════════════════════════════════ */}
      <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "9pt", marginBottom: "4px" }}>
        Appendix 11
      </div>

      {/* ══════════════════════════════════════════════════════
          TOP BOX: Title left | Serial No. / Date / Fund Cluster right
          (matches PDF: left ~62% title+entity, right ~38% meta)
      ══════════════════════════════════════════════════════ */}
      <table style={{ ...S.tbl, borderCollapse: "collapse" }}>
        <colgroup>
          <col style={{ width: "62%" }} />
          <col style={{ width: "38%" }} />
        </colgroup>
        <tbody>
          <tr>
            {/* LEFT: bold title + underline + "Entity Name" label */}
            <td style={{ ...S.td, verticalAlign: "middle", padding: "6px 8px" }} rowSpan={3}>
              <div style={{ fontWeight: "bold", fontSize: "11pt", textAlign: "center", marginBottom: "6px" }}>
                OBLIGATION REQUEST AND STATUS
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={S.uline}>{entityName}</span>
              </div>
              <div style={{ textAlign: "center", fontSize: "8.5pt", fontWeight: "bold", marginTop: "2px" }}>
                Entity Name
              </div>
            </td>
            {/* RIGHT top: Serial No. */}
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Serial No. : </span>
              <span style={{ ...S.uline, minWidth: "100px" }}>{orsNo}</span>
            </td>
          </tr>
          <tr>
            {/* RIGHT mid: Date */}
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Date : </span>
              <span style={{ ...S.uline, minWidth: "100px" }}>{displayDate}</span>
            </td>
          </tr>
          <tr>
            {/* RIGHT bottom: Fund Cluster */}
            <td style={{ ...S.td, fontSize: "8.5pt", padding: "4px 6px" }}>
              <span style={S.b}>Fund Cluster : </span>
              <span style={{ ...S.uline, minWidth: "80px" }}>{fundCluster}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════════════════════════════════════
          Payee / Office / Address rows
      ══════════════════════════════════════════════════════ */}
      <table style={{ ...S.tbl, marginTop: "-1px" }}>
        <colgroup>
          <col style={{ width: "14%" }} />
          <col style={{ width: "86%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Payee</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>{payee}</td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Office</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>{office}</td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold", verticalAlign: "middle", padding: "3px 6px" }}>Address</td>
            <td style={{ ...S.td, padding: "3px 6px" }}>{payeeAddress}</td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════════════════════════════════════
          Particulars table — 5 columns matching PDF exactly:
          Responsibility Center | Particulars | MFO/PAP | UACS Object Code | Amount
      ══════════════════════════════════════════════════════ */}
      <table style={{ ...S.tbl, marginTop: "-1px" }}>
        <colgroup>
          <col style={{ width: "14%" }} />
          <col style={{ width: "36%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "23%" }} />
        </colgroup>
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
          {/* Data row — tall enough to hold particulars text */}
          <tr>
            <td style={{ ...S.tdC, height: "90px", verticalAlign: "top", paddingTop: "4px" }}>
              {responsibilityCenter}
            </td>
            <td style={{ ...S.td, verticalAlign: "top", wordBreak: "break-word" }}>
              {particulars}
            </td>
            <td style={{ ...S.tdC, verticalAlign: "top" }}>{mfoPap}</td>
            <td style={{ ...S.tdC, verticalAlign: "top" }}>{uacsCode}</td>
            <td style={{ ...S.tdR, verticalAlign: "top" }}>
              {amount > 0 ? fmt(amount) : ""}
            </td>
          </tr>
          {/* Total row */}
          <tr>
            <td colSpan={4} style={{ ...S.tdR, ...S.b, fontSize: "8pt" }}>Total</td>
            <td style={{ ...S.tdR, ...S.b }}>
              {amount > 0 ? fmt(amount) : ""}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════════════════════════════════════
          Section A & B — two-column certification boxes
      ══════════════════════════════════════════════════════ */}
      <table style={{ ...S.tbl, marginTop: "-1px" }}>
        <colgroup>
          <col style={{ width: "50%" }} />
          <col style={{ width: "50%" }} />
        </colgroup>
        <tbody>
          <tr>
            {/* A. Certified — Charges */}
            <td style={{ ...S.td, padding: "5px 7px", verticalAlign: "top" }}>
              <div style={{ fontSize: "8pt", marginBottom: "6px" }}>
                <span style={S.b}>A.&nbsp;&nbsp;&nbsp;Certified:</span> Charges to appropriation/allotment are
                necessary, lawful and under my direct supervision;and
                supporting documents valid, proper and legal
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Signature&nbsp;&nbsp;&nbsp;:</span>
                <div style={S.sigLine}></div>
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Printed Name:</span>
                <div style={{ ...S.sigLine, fontWeight: "normal" }}>{preparedByName}</div>
              </div>
              <div style={{ marginBottom: "3px" }}>
                <span style={S.sigLabel}>Position&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                <div style={{ ...S.sigLine }}>{preparedByDesig}</div>
              </div>
              <div style={{ fontSize: "7.5pt", textAlign: "center", marginTop: "2px" }}>
                Head, Requesting Office/Authorized Representative
              </div>
              <div style={{ marginBottom: "3px", marginTop: "4px" }}>
                <span style={S.sigLabel}>Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                <div style={S.sigLine}></div>
              </div>
            </td>
            {/* B. Certified — Allotment */}
            <td style={{ ...S.td, padding: "5px 7px", verticalAlign: "top" }}>
              <div style={{ fontSize: "8pt", marginBottom: "6px" }}>
                <span style={S.b}>B.&nbsp;&nbsp;&nbsp;Certified:</span> Allotment available and obligated
                for the purpose/adjustment necessary as
                indicated above
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
              <div style={{ fontSize: "7.5pt", textAlign: "center", marginTop: "2px" }}>
                Head, Budget Division/Unit/Authorized Representative
              </div>
              <div style={{ marginBottom: "3px", marginTop: "4px" }}>
                <span style={S.sigLabel}>Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                <div style={S.sigLine}></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════════════════════════════════════
          C. STATUS OF OBLIGATION — header row
      ══════════════════════════════════════════════════════ */}
      <table style={{ ...S.tbl, marginTop: "-1px" }}>
        <tbody>
          <tr>
            <td style={{ ...S.td, ...S.b, fontSize: "8pt", padding: "3px 6px" }}>
              C.
            </td>
            <td colSpan={6} style={{ ...S.tdC, ...S.b, fontSize: "9pt", letterSpacing: "1px" }}>
              STATUS OF OBLIGATION
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════════════════════════════════════
          Status of Obligation detail table — 7 columns:
          Date | Particulars | ORS/JEV/Check/ADA/TRA No. |
          Obligation(a) | Payable(b) | Payment(c) | Balance [Not Yet Due(a-b) | Due&Demandable(b-c)]
      ══════════════════════════════════════════════════════ */}
      <table style={{ ...S.tbl, marginTop: "-1px" }}>
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
        </colgroup>
        <thead>
          {/* Top sub-header: Reference | Amount */}
          <tr>
            <td colSpan={3} style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>Reference</td>
            <td colSpan={4} style={{ ...S.tdC, ...S.b, fontSize: "7.5pt" }}>Amount</td>
          </tr>
          {/* Column labels */}
          <tr>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Date</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Particulars</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>ORS/JEV/Check/<br />ADA/TRA No.</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Obligation</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Payable</td>
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Payment</td>
            {/* Balance splits into two sub-cols */}
            <td style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Balance</td>
          </tr>
          {/* (a) (b) (c) row + Balance sub-labels */}
          <tr>
            <td style={{ ...S.tdC, fontSize: "7pt" }}></td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}></td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}></td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}>(a)</td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}>(b)</td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}>(c)</td>
            <td style={{ ...S.tdC, fontSize: "7pt" }}></td>
          </tr>
        </thead>
        <tbody>
          {/* Data row */}
          <tr>
            <td style={{ ...S.td, height: "28px", fontSize: "7.5pt" }}>{displayDate}</td>
            <td style={{ ...S.td, fontSize: "7.5pt", wordBreak: "break-word" }}>{particulars}</td>
            <td style={{ ...S.tdC, fontSize: "7.5pt" }}>{referenceNo || orsNo}</td>
            <td style={{ ...S.tdR, fontSize: "7.5pt" }}>{obligationAmount > 0 ? fmt(obligationAmount) : ""}</td>
            <td style={{ ...S.tdR, fontSize: "7.5pt" }}>{payableAmount > 0 ? fmt(payableAmount) : ""}</td>
            <td style={{ ...S.tdR, fontSize: "7.5pt" }}>{paymentAmount > 0 ? fmt(paymentAmount) : ""}</td>
            <td style={{ ...S.tdR, fontSize: "7.5pt" }}></td>
          </tr>
          {/* Empty filler row */}
          <tr>
            <td style={{ ...S.td, height: "18px" }}></td>
            <td style={S.td}></td>
            <td style={S.td}></td>
            <td style={S.tdR}></td>
            <td style={S.tdR}></td>
            <td style={S.tdR}></td>
            <td style={S.tdR}></td>
          </tr>
          {/* Not Yet Due / Due and Demandable sub-header */}
          <tr>
            <td colSpan={3} style={{ ...S.td }}></td>
            <td colSpan={2} style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Not Yet Due<br />(a-b)</td>
            <td colSpan={2} style={{ ...S.tdC, ...S.b, fontSize: "7pt" }}>Due and Demandable<br />(b-c)</td>
          </tr>
          {/* Balance values */}
          <tr>
            <td colSpan={3} style={{ ...S.tdR, ...S.b, fontSize: "7.5pt" }}>Balance</td>
            <td colSpan={2} style={{ ...S.tdR, fontSize: "7.5pt" }}>
              {notYetDueBalance > 0 ? fmt(notYetDueBalance) : ""}
            </td>
            <td colSpan={2} style={{ ...S.tdR, fontSize: "7.5pt" }}>
              {dueDemandableBalance > 0 ? fmt(dueDemandableBalance) : ""}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount in words note */}
      {amount > 0 && (
        <div style={{ marginTop: "4px", fontSize: "7.5pt", fontStyle: "italic" }}>
          Amount in Words: <strong>{amountWords}</strong>
        </div>
      )}
    </div>
  );
}

// ─── ORS Print HTML builder ───────────────────────────────────────────────────
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildORSPrintHtml(data: {
  orsNo: string; orsDate: string; entityName: string; payee: string;
  payeeAddress: string; office: string; fundCluster: string;
  responsibilityCenter: string; particulars: string; mfoPap: string;
  uacsCode: string; amount: number; referenceNo: string;
  obligationAmount: number; payableAmount: number; paymentAmount: number;
  notYetDueBalance: number; dueDemandableBalance: number;
  preparedByName: string; preparedByDesig: string;
  textOnlyLines?: TextOnlyLine[];
}) {
  const fmt = (n: number) =>
    n ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const displayDate = data.orsDate
    ? new Date(data.orsDate + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const amountWords = data.amount > 0 ? toWords(data.amount) : "";

  // Build text-only lines HTML for the particulars table
  const textLinesHtml = (data.textOnlyLines || [])
    .filter(line => line.text.trim())
    .map(line => `
      <tr style="background-color:#fefce8">
        <td style="text-align:center;border:1px solid #000;padding:2px 5px;font-size:8.5pt;vertical-align:top"></td>
        <td colspan="3" style="border:1px solid #000;padding:2px 5px;font-size:8.5pt;vertical-align:top;font-style:italic;color:#666">${escapeHtml(line.text)}</td>
        <td style="text-align:right;border:1px solid #000;padding:2px 5px;font-size:8.5pt;vertical-align:top"></td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Obligation Request and Status</title>
  <style>
    @page { size: A4; margin: 12mm 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 9pt; color: #000; line-height: 1.25; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { border: 1px solid #000; padding: 2px 5px; font-size: 8.5pt; vertical-align: top; }
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
      <tr><td style="font-size:8.5pt;padding:4px 6px"><span class="b">Date : </span><span class="uline" style="min-width:100px">${displayDate}</span></td></tr>
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
        <td class="c" style="height:90px;padding-top:4px">${escapeHtml(data.responsibilityCenter)}</td>
        <td style="word-break:break-word">${escapeHtml(data.particulars)}</td>
        <td class="c">${escapeHtml(data.mfoPap)}</td>
        <td class="c">${escapeHtml(data.uacsCode)}</td>
        <td class="r">${data.amount > 0 ? fmt(data.amount) : ""}</td>
      </tr>
      ${textLinesHtml}
      <tr>
        <td colspan="4" class="r b" style="font-size:8pt">Total</td>
        <td class="r b">${data.amount > 0 ? fmt(data.amount) : ""}</td>
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
      <tbody>
        <tr><td class="b" style="font-size:8pt;padding:3px 6px">C.</td><td colspan="6" class="c b" style="font-size:9pt;letter-spacing:1px">STATUS OF OBLIGATION</td></tr>
      </tbody>
    </table>

    <table style="margin-top:-1px">
      <colgroup><col style="width:10%"/><col style="width:22%"/><col style="width:16%"/><col style="width:13%"/><col style="width:13%"/><col style="width:13%"/><col style="width:13%"/></colgroup>
      <thead>
        <tr><td colspan="3" class="c b" style="font-size:7.5pt">Reference</td><td colspan="4" class="c b" style="font-size:7.5pt">Amount</td></tr>
        <tr>
          <td class="c b" style="font-size:7pt">Date</td>
          <td class="c b" style="font-size:7pt">Particulars</td>
          <td class="c b" style="font-size:7pt">ORS/JEV/Check/<br/>ADA/TRA No.</td>
          <td class="c b" style="font-size:7pt">Obligation</td>
          <td class="c b" style="font-size:7pt">Payable</td>
          <td class="c b" style="font-size:7pt">Payment</td>
          <td class="c b" style="font-size:7pt">Balance</td>
        </tr>
        <tr><td class="c" style="font-size:7pt"></td><td class="c" style="font-size:7pt"></td><td class="c" style="font-size:7pt"></td><td class="c" style="font-size:7pt">(a)</td><td class="c" style="font-size:7pt">(b)</td><td class="c" style="font-size:7pt">(c)</td><td class="c" style="font-size:7pt"></td></tr>
      </thead>
      <tbody>
        <tr>
          <td style="height:28px;font-size:7.5pt">${displayDate}</td>
          <td style="font-size:7.5pt;word-break:break-word">${escapeHtml(data.particulars)}</td>
          <td class="c" style="font-size:7.5pt">${escapeHtml(data.referenceNo || data.orsNo)}</td>
          <td class="r" style="font-size:7.5pt">${data.obligationAmount > 0 ? fmt(data.obligationAmount) : ""}</td>
          <td class="r" style="font-size:7.5pt">${data.payableAmount > 0 ? fmt(data.payableAmount) : ""}</td>
          <td class="r" style="font-size:7.5pt">${data.paymentAmount > 0 ? fmt(data.paymentAmount) : ""}</td>
          <td class="r" style="font-size:7.5pt"></td>
        </tr>
        <tr><td style="height:18px"></td><td></td><td></td><td class="r"></td><td class="r"></td><td class="r"></td><td class="r"></td></tr>
        <tr>
          <td colspan="3"></td>
          <td colspan="2" class="c b" style="font-size:7pt">Not Yet Due<br/>(a-b)</td>
          <td colspan="2" class="c b" style="font-size:7pt">Due and Demandable<br/>(b-c)</td>
        </tr>
        <tr>
          <td colspan="3" class="r b" style="font-size:7.5pt">Balance</td>
          <td colspan="2" class="r" style="font-size:7.5pt">${data.notYetDueBalance > 0 ? fmt(data.notYetDueBalance) : ""}</td>
          <td colspan="2" class="r" style="font-size:7.5pt">${data.dueDemandableBalance > 0 ? fmt(data.dueDemandableBalance) : ""}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${data.amount > 0 ? `<div style="margin-top:4px;font-size:7.5pt;font-style:italic">Amount in Words: <strong>${amountWords}</strong></div>` : ""}
</body>
</html>`;
}

function downloadORSPdf(data: Parameters<typeof buildORSPrintHtml>[0]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(buildORSPrintHtml(data));
  printWindow.document.close();
  // Wait for content to load before printing
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (printWindow.document.readyState === "complete") {
      printWindow.focus();
      printWindow.print();
    }
  }, 300);
}

// ─── Input styling ────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-300";

const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-700 whitespace-nowrap">{title}</span>
        <div className="flex-1 h-px bg-orange-100" />
      </div>
      {children}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function ORSProcessModal({
  visible, po, currentUser, onClose, onSubmit,
}: ORSProcessModalProps) {
  const supabase = createClient();

  const [orsNo, setOrsNo] = useState("");
  const [orsDate, setOrsDate] = useState(new Date().toISOString().slice(0, 10));
  const [entityName, setEntityName] = useState("");
  const [payee, setPayee] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [office, setOffice] = useState("");
  const [fundCluster, setFundCluster] = useState("");
  const [responsibilityCenter, setResponsibilityCenter] = useState("");
  const [particulars, setParticulars] = useState("");
  const [mfoPap, setMfoPap] = useState("");
  const [uacsCode, setUacsCode] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [obligationAmount, setObligationAmount] = useState<number>(0);
  const [payableAmount, setPayableAmount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [notYetDueBalance, setNotYetDueBalance] = useState<number>(0);
  const [dueDemandableBalance, setDueDemandableBalance] = useState<number>(0);
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedByDesig, setPreparedByDesig] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<StatusFlag | null>(null);

  // Text-only lines state (for printing only - descriptive lines in particulars)
  const [textOnlyLines, setTextOnlyLines] = useState<TextOnlyLine[]>([]);

  // Helper functions for text-only lines
  function addTextOnlyLine() {
    const newLine: TextOnlyLine = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: "",
    };
    setTextOnlyLines((prev) => [...prev, newLine]);
  }

  function updateTextOnlyLine(id: string, text: string) {
    setTextOnlyLines((prev) => prev.map((line) => (line.id === id ? { ...line, text } : line)));
  }

  function removeTextOnlyLine(id: string) {
    setTextOnlyLines((prev) => prev.filter((line) => line.id !== id));
  }
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  
  // Division state for dropdown
  const [divisions, setDivisions] = useState<{ division_id: number; division_name: string }[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);

  // Fetch divisions on mount
  useEffect(() => {
    const fetchDivisions = async () => {
      const { data } = await supabase
        .from("divisions")
        .select("division_id, division_name")
        .order("division_name");
      if (data) {
        setDivisions(data);
      }
    };
    fetchDivisions();
  }, [supabase]);

  useEffect(() => {
    if (po && visible) {
      setEntityName(po.office_section || "");
      setPayee(po.supplier || "");
      setPayeeAddress("");
      // Set office from PO and try to match division
      setOffice(po.office_section || "");

      let divId = po.division_id ?? null;
      if (!divId && po.office_section && divisions.length > 0) {
        const match = divisions.find(d => d.division_name.trim().toLowerCase() === po.office_section?.trim().toLowerCase());
        if (match) divId = match.division_id;
      }
      setSelectedDivisionId(divId);

      setFundCluster(po.fund_cluster || "");
      setResponsibilityCenter("");
      setParticulars(`Payment for ${po.supplier || "supplier"} - ${po.pr_no || ""}`);
      setMfoPap("");
      setPreparedByName(currentUser?.fullname || "");
      setObligationAmount(Number(po.total_amount || 0));
      setPayableAmount(Number(po.total_amount || 0));
      setReferenceNo("ORS");
      fetchBudgetInfo(po.pr_no);
    }
  }, [po, visible, currentUser, divisions]);

  async function fetchBudgetInfo(prNo: string | null) {
    if (!prNo) return;
    const { data } = await supabase
      .from("pr_form")
      .select("responsibility_code, fund_cluster")
      .eq("pr_num", prNo)
      .maybeSingle();
    if (data) {
      if (data.responsibility_code) setResponsibilityCenter(data.responsibility_code);
      if (data.fund_cluster) setFundCluster(data.fund_cluster);
    }
  }

  const amount = useMemo(() => Number(po?.total_amount || 0), [po]);

  const handleSave = async () => {
    if (!po) return;
    if (!orsNo.trim()) { alert("ORS Number is required"); return; }
    if (!selectedDivisionId) { alert("Office / Division is required"); return; }
    setSaving(true);
    try {
      const { error: orsError } = await supabase.from("ors_entries").insert({
        ors_no: orsNo,
        pr_id: po.pr_id,
        pr_no: po.pr_no,
        division_id: selectedDivisionId,
        fiscal_year: new Date().getFullYear(),
        amount: obligationAmount,
        status: "Pending",
        prepared_by: currentUser?.id || null,
        notes: remarks,
        fund_cluster: fundCluster || null,
        responsibility_center: responsibilityCenter || null,
        particulars: particulars || null,
        mfo_pap: mfoPap || null,
        uacs_code: uacsCode || null,
        prepared_by_name: preparedByName || null,
        prepared_by_desig: preparedByDesig || null,
        date_created: orsDate || null,
        entity_name: entityName || null,
        payee_address: payeeAddress || null,
        office: office || null,
        reference_no: referenceNo || null,
        obligation_amount: obligationAmount,
        payable_amount: payableAmount,
        payment_amount: paymentAmount,
        not_yet_due_balance: notYetDueBalance,
        due_demandable_balance: dueDemandableBalance,
      });

      if (orsError) { alert(`Failed to create ORS entry: ${orsError.message}`); return; }

      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({
          ors_no: orsNo,
          ors_date: orsDate || null,
          ors_amount: obligationAmount,
          funds_available: fundCluster || null,
          status_id: 14,
        })
        .eq("id", po.id);

      if (updateError) { alert(`Failed to update PO: ${updateError.message}`); return; }

      await supabase.from("remarks").insert({
        po_id: Number(po.id),
        pr_id: po.pr_id,
        user_id: currentUser?.id || null,
        remark: `[ORS Created] ORS No: ${orsNo}. ${remarks.trim()}`,
        phase: "po",
        status_flag_id: selectedFlag ? getFlagId(selectedFlag) : null,
      });

      await onSubmit(14, `ORS ${orsNo} created`, selectedFlag ? getFlagId(selectedFlag) : null);
      onClose();
    } catch (err) {
      console.error("Error saving ORS:", err);
      alert("Failed to save ORS. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !po) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Floating action buttons - like livePreview.tsx */}
      <div className="absolute right-4 top-4 z-20 flex gap-2">
        <button
          type="button"
          onClick={() => downloadORSPdf({
            orsNo, orsDate, entityName, payee, payeeAddress, office,
            fundCluster, responsibilityCenter, particulars, mfoPap,
            uacsCode, amount: obligationAmount || 0, referenceNo,
            obligationAmount, payableAmount, paymentAmount,
            notYetDueBalance, dueDemandableBalance,
            preparedByName, preparedByDesig,
            textOnlyLines,
          })}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-100"
          aria-label="Print preview"
          title="Print"
        >
          <RiFilePdf2Line size={20} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-100"
          aria-label="Close preview"
          title="Close"
        >
          <RiCloseLine size={20} />
        </button>
      </div>

      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Modal Header ── */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold leading-tight">Obligation Request and Status (ORS)</h2>
            <p className="text-orange-100 text-xs mt-0.5">PO: {po.po_no} · Supplier: {po.supplier}</p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ════════════════════════════════════════════════
              LEFT: Input Form — ordered top-to-bottom per Appendix 11
          ════════════════════════════════════════════════ */}
          <div className="flex flex-[2] flex-col overflow-hidden border-r border-gray-100">
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ① Serial No. + Date */}
              <FormSection title="ORS Details">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Serial No. (ORS Number) *</label>
                    <input
                      className={inputCls}
                      placeholder="e.g., ORS-2024-001"
                      value={orsNo}
                      onChange={(e) => setOrsNo(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Date</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={orsDate}
                      onChange={(e) => setOrsDate(e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>

              {/* ② Entity Name + Payee + Office + Address */}
              <FormSection title="Entity & Payee">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Entity Name</label>
                      <input
                        className={inputCls}
                        placeholder="e.g., DA-RFO02"
                        value={entityName}
                        onChange={(e) => setEntityName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Office / Division *</label>
                      <select
                        className={inputCls}
                        value={selectedDivisionId ?? ""}
                        onChange={(e) => {
                          const divId = e.target.value ? Number(e.target.value) : null;
                          setSelectedDivisionId(divId);
                          // Also update office text to division name
                          const div = divisions.find(d => d.division_id === divId);
                          if (div) setOffice(div.division_name);
                        }}
                        required
                      >
                        <option value="">Select Division...</option>
                        {divisions.map((div) => (
                          <option key={div.division_id} value={div.division_id}>
                            {div.division_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Payee</label>
                    <input
                      className={inputCls}
                      placeholder="Supplier or payee name"
                      value={payee}
                      onChange={(e) => setPayee(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Address</label>
                    <input
                      className={inputCls}
                      placeholder="Complete address of payee"
                      value={payeeAddress}
                      onChange={(e) => setPayeeAddress(e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>

              {/* ③ Particulars table fields (Responsibility Center, Particulars, MFO/PAP, UACS, Amount) */}
              <FormSection title="Particulars (Section B)">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Responsibility Center</label>
                      <input
                        className={inputCls}
                        placeholder="e.g., 1011"
                        value={responsibilityCenter}
                        onChange={(e) => setResponsibilityCenter(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>MFO/PAP</label>
                      <input
                        className={inputCls}
                        placeholder="e.g., 3AHO1"
                        value={mfoPap}
                        onChange={(e) => setMfoPap(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>UACS Object Code</label>
                      <input
                        className={inputCls}
                        placeholder="e.g., 5-01-02-010"
                        value={uacsCode}
                        onChange={(e) => setUacsCode(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Particulars</label>
                    <textarea
                      className={`${inputCls} min-h-[60px] resize-y`}
                      placeholder="Description of the transaction/payment..."
                      value={particulars}
                      onChange={(e) => setParticulars(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Amount (₱)</label>
                    <input
                      type="number"
                      className={inputCls}
                      placeholder="0.00"
                      value={obligationAmount || ""}
                      onChange={(e) => setObligationAmount(Number(e.target.value))}
                      step="0.01"
                    />
                  </div>
                </div>
              </FormSection>

              {/* ④ Prepared-by — feeds Section A certification */}
              <FormSection title="Prepared By (Section A Certification)">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Printed Name</label>
                    <input
                      className={inputCls}
                      placeholder="Full name"
                      value={preparedByName}
                      onChange={(e) => setPreparedByName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Position / Designation</label>
                    <input
                      className={inputCls}
                      placeholder="e.g., Budget Officer II"
                      value={preparedByDesig}
                      onChange={(e) => setPreparedByDesig(e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>

              {/* ⑤ Status of Obligation */}
              <FormSection title="Status of Obligation">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>ORS/JEV/Check/ADA/TRA Reference No.</label>
                      <input
                        className={inputCls}
                        placeholder="e.g., ORS-2024-001"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Obligation Amount — (a)</label>
                      <input
                        type="number"
                        className={inputCls}
                        placeholder="0.00"
                        value={obligationAmount || ""}
                        onChange={(e) => setObligationAmount(Number(e.target.value))}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Payable Amount — (b)</label>
                      <input
                        type="number"
                        className={inputCls}
                        placeholder="0.00"
                        value={payableAmount || ""}
                        onChange={(e) => setPayableAmount(Number(e.target.value))}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Payment Amount</label>
                      <input
                        type="number"
                        className={inputCls}
                        placeholder="0.00"
                        value={paymentAmount || ""}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Section C */}
                  <div className="bg-orange-50/60 border border-orange-100 rounded p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 mb-2">C. Balance</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Not Yet Due — (a)</label>
                        <input
                          type="number"
                          className={inputCls}
                          placeholder="0.00"
                          value={notYetDueBalance || ""}
                          onChange={(e) => setNotYetDueBalance(Number(e.target.value))}
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Due and Demandable — (c)</label>
                        <input
                          type="number"
                          className={inputCls}
                          placeholder="0.00"
                          value={dueDemandableBalance || ""}
                          onChange={(e) => setDueDemandableBalance(Number(e.target.value))}
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* ⑥ Fund Cluster */}
              <FormSection title="Fund Information">
                <div>
                  <label className={labelCls}>Fund Cluster</label>
                  <input
                    className={inputCls}
                    placeholder="e.g., 01"
                    value={fundCluster}
                    onChange={(e) => setFundCluster(e.target.value)}
                  />
                </div>
              </FormSection>

              {/* ⑦ Status Flag */}
              <FormSection title="Status Flag">
                <FlagButton
                  selected={selectedFlag}
                  onPress={() => setShowFlagPicker(true)}
                />
              </FormSection>

              {/* ⑧ Remarks */}
              <FormSection title="Remarks">
                <textarea
                  className={`${inputCls} min-h-[52px] resize-y`}
                  placeholder="Add processing remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </FormSection>

            </div>

            {/* Action buttons */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !orsNo.trim() || !selectedDivisionId}
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-1.5 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition"
              >
                <RiSaveLine size={16} />
                {saving ? "Saving..." : "Create ORS"}
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════
              RIGHT: Live Preview — Appendix 11 faithful layout
          ════════════════════════════════════════════════ */}
          <div className="flex flex-[3] flex-col overflow-y-auto bg-gray-100">
            <div className="p-4 pb-2 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Live Preview — Appendix 11</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {/* Paper sheet */}
              <div
                className="bg-white mx-auto shadow-md"
                style={{
                  maxWidth: "720px",
                  padding: "24px 28px",
                  minHeight: "900px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                }}
              >
                <ORSEditablePreview
                  orsNo={orsNo} setOrsNo={setOrsNo}
                  orsDate={orsDate} setOrsDate={setOrsDate}
                  entityName={entityName} setEntityName={setEntityName}
                  payee={payee} setPayee={setPayee}
                  payeeAddress={payeeAddress} setPayeeAddress={setPayeeAddress}
                  office={office} setOffice={setOffice}
                  fundCluster={fundCluster} setFundCluster={setFundCluster}
                  responsibilityCenter={responsibilityCenter} setResponsibilityCenter={setResponsibilityCenter}
                  particulars={particulars} setParticulars={setParticulars}
                  mfoPap={mfoPap} setMfoPap={setMfoPap}
                  uacsCode={uacsCode} setUacsCode={setUacsCode}
                  referenceNo={referenceNo} setReferenceNo={setReferenceNo}
                  obligationAmount={obligationAmount} setObligationAmount={setObligationAmount}
                  payableAmount={payableAmount} setPayableAmount={setPayableAmount}
                  paymentAmount={paymentAmount} setPaymentAmount={setPaymentAmount}
                  notYetDueBalance={notYetDueBalance} setNotYetDueBalance={setNotYetDueBalance}
                  dueDemandableBalance={dueDemandableBalance} setDueDemandableBalance={setDueDemandableBalance}
                  preparedByName={preparedByName} setPreparedByName={setPreparedByName}
                  preparedByDesig={preparedByDesig} setPreparedByDesig={setPreparedByDesig}
                  textOnlyLines={textOnlyLines}
                  addTextOnlyLine={addTextOnlyLine}
                  updateTextOnlyLine={updateTextOnlyLine}
                  removeTextOnlyLine={removeTextOnlyLine}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Status Flag Picker Modal */}
      <StatusFlagPicker
        visible={showFlagPicker}
        selected={selectedFlag}
        onSelect={(flag) => setSelectedFlag(flag)}
        onClose={() => setShowFlagPicker(false)}
      />
    </div>
  );
}