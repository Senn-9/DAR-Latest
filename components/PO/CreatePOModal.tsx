"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RiAddLine, RiFilePdf2Line, RiSaveLine, RiSearchLine, RiCloseLine, RiFilter3Line } from "react-icons/ri";
import type { PurchaseOrderItemRow, PurchaseOrderRow } from "@/utils/supabase/po";
import { createClient } from "@/utils/supabase/client";
import { buildPurchaseOrderPrintHtml as sharedBuildPO } from "@/utils/print/POPrintBuilder";
import { buildContractPrintHtml } from "@/utils/print/ContractPrintBuilder";
import { printWithIframe, stripHtml } from "@/utils/print/printUtils";
import { RichEditor } from "@/components/RichEditor";
import { SuccessModal, ErrorModal } from "@/components/StatusModal";

// Types for PR and Canvass data
type PurchaseRequest = {
  id: number;
  pr_no: string;
  purpose: string;
  office_section: string;
  fund_cluster: string | null;
  entity_name: string | null;
  total_cost: number;
  division_id?: number | null;
  created_at?: string;
  has_po?: boolean;
  po_count?: number;
};

type CanvassEntry = {
  id: number;
  pr_no: string | null;
  supplier_name: string | null;
  supplier_address: string | null;
  tin_no: string | null;
  unit_price: number | null;
  total_price: number | null;
  is_winning: boolean | null;
  delivery_days: string | null;
  unit: string | null;
  quantity: number | null;
  description: string | null;
};

type CreatePOModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (header: Partial<PurchaseOrderRow>, items: PurchaseOrderItemRow[]) => Promise<number>;
};

const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300";

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
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMetaDate(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

// Editable input styles for live preview
const editableInputCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] whitespace-pre-wrap break-words resize-none overflow-hidden";
const editableInputCenterCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-center whitespace-pre-wrap break-words resize-none overflow-hidden";
const editableInputRightCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-right whitespace-pre-wrap break-words resize-none overflow-hidden";

// Auto-resize handler for textareas
const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
  const target = e.currentTarget;
  target.style.height = 'auto';
  target.style.height = target.scrollHeight + 'px';
};

// Type for text-only lines in the PO (for printing only)
// Each field corresponds to a column like regular PO items
type TextOnlyLine = {
  id: string; // unique identifier for React key
  position: number; // position after which this line appears (1-based index after item)
  stock_no: string;
  unit: string;
  description: string;
  quantity: string;
  unit_price: string;
};

type POItemWithBold = PurchaseOrderItemRow;

// Editable PO Preview - allows manual input directly in the preview panel
function POEditablePreview({
  poNo,
  prNo,
  createdAt,
  setPoNo,
  supplier,
  setSupplier,
  address,
  setAddress,
  tin,
  setTin,
  procurementMode,
  setProcurementMode,
  deliveryPlace,
  setDeliveryPlace,
  deliveryTerm,
  setDeliveryTerm,
  deliveryDate,
  setDeliveryDate,
  paymentTerm,
  setPaymentTerm,
  fundCluster,
  setFundCluster,
  items,
  updateItem,
  addItem,
  removeItem,
  textOnlyLines,
  addTextOnlyLine,
  updateTextOnlyLine,
  removeTextOnlyLine,
  hideTotalRow,
  poDate,
  setPoDate,
  officialName,
  setOfficialName,
  officialDesig,
  setOfficialDesig,
  accountantName,
  setAccountantName,
  accountantDesig,
  setAccountantDesig,
  conformeDate,
  setConformeDate,
}: {
  poNo: string;
  prNo: string;
  createdAt: string;
  setPoNo: (v: string) => void;
  supplier: string;
  setSupplier: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  tin: string;
  setTin: (v: string) => void;
  procurementMode: string;
  setProcurementMode: (v: string) => void;
  deliveryPlace: string;
  setDeliveryPlace: (v: string) => void;
  deliveryTerm: string;
  setDeliveryTerm: (v: string) => void;
  deliveryDate: string;
  setDeliveryDate: (v: string) => void;
  paymentTerm: string;
  setPaymentTerm: (v: string) => void;
  fundCluster: string;
  setFundCluster: (v: string) => void;
  items: POItemWithBold[];
  updateItem: (idx: number, patch: Partial<POItemWithBold>) => void;
  addItem: () => void;
  removeItem: (idx: number) => void;
  textOnlyLines: TextOnlyLine[];
  addTextOnlyLine: (afterIndex: number) => void;
  updateTextOnlyLine: (id: string, field: keyof Omit<TextOnlyLine, 'id' | 'position'>, value: string) => void;
  removeTextOnlyLine: (id: string) => void;
  hideTotalRow: boolean;
  poDate: string;
  setPoDate: (v: string) => void;
  officialName: string;
  setOfficialName: (v: string) => void;
  officialDesig: string;
  setOfficialDesig: (v: string) => void;
  accountantName: string;
  setAccountantName: (v: string) => void;
  accountantDesig: string;
  setAccountantDesig: (v: string) => void;
  conformeDate: string;
  setConformeDate: (v: string) => void;
}) {
  const grandTotal = getGrandTotal(items);
  const amountWords = toWords(grandTotal);
  const footerMeta = [prNo, formatMetaDate(createdAt)].filter(Boolean).join("   ");

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "10pt", color: "#000", padding: 0, margin: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "right", fontSize: "11pt", fontWeight: "bold", padding: 0 }}>Appendix 61</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderRadius: "30px", padding: "10px 12px 8px", margin: "0 18px 10px" }}>
        <div style={{ textAlign: "center", fontSize: "16pt", fontWeight: "bold", letterSpacing: "0.5px" }}>PURCHASE ORDER</div>
        <div style={{ textAlign: "center", fontSize: "10.5pt", fontWeight: "bold" }}>DEPARTMENT OF AGRARIAN REFORM - CAMARINES SUR 1</div>
      </div>

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
              Supplier :{" "}
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Enter supplier name"
                style={{ fontWeight: "normal", width: "80%" }}
                className={editableInputCls}
              />
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              P.O. No. :{" "}
              <input
                type="text"
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
                placeholder="Enter P.O. No."
                style={{ fontWeight: "normal", width: "60%" }}
                className={editableInputCls}
              />
            </td>
          </tr>

          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Address :{" "}
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
                style={{ fontWeight: "normal", width: "80%" }}
                className={editableInputCls}
              />
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Date :{" "}
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                style={{ fontWeight: "normal" }}
                className={editableInputCls}
              />
            </td>
          </tr>

          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              TIN :{" "}
              <input
                type="text"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                placeholder="Enter TIN"
                style={{ fontWeight: "normal", width: "60%" }}
                className={editableInputCls}
              />
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "2px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Mode of Procurement :{" "}
              <input
                type="text"
                value={procurementMode}
                onChange={(e) => setProcurementMode(e.target.value)}
                placeholder="e.g. Public Bidding"
                style={{ fontWeight: "normal", width: "50%" }}
                className={editableInputCls}
              />
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
              Place of Delivery:{" "}
              <input
                type="text"
                value={deliveryPlace}
                onChange={(e) => setDeliveryPlace(e.target.value)}
                placeholder="Enter place"
                style={{ fontWeight: "normal", width: "70%" }}
                className={editableInputCls}
              />
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Delivery Term:{" "}
              <input
                type="text"
                value={deliveryTerm}
                onChange={(e) => setDeliveryTerm(e.target.value)}
                placeholder="e.g. FOB"
                style={{ fontWeight: "normal", width: "40%" }}
                className={editableInputCls}
              />
              <div style={{ fontWeight: "bold", marginTop: "2px" }}>
                Payment Term:{" "}
                <input
                  type="text"
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value)}
                  placeholder="e.g. Net 30"
                  style={{ fontWeight: "normal", width: "40%" }}
                  className={editableInputCls}
                />
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold" }}>
              Date of Delivery:{" "}
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                style={{ fontWeight: "normal" }}
                className={editableInputCls}
              />
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

          {items.map((item, index) => {
            const total = getItemTotal(item);
            const itemKey = `item-${index}`;
            // No top border on rows after the first (header row already has bottom border)
            const rowBorderStyle = index === 0
              ? { borderLeft: "1px solid #111", borderRight: "1px solid #111", borderBottom: "none", borderTop: "none" }
              : { borderLeft: "1px solid #111", borderRight: "1px solid #111", borderBottom: "none", borderTop: "none" };
            return (
              <React.Fragment key={itemKey}>
                <tr>
                  <td style={{ ...rowBorderStyle, verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                    <textarea value={item.stock_no ?? ""} onChange={(e) => updateItem(index, { stock_no: e.target.value })} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px", fontFamily: "'Times New Roman', Times, serif" }} rows={1} />
                  </td>
                  <td style={{ ...rowBorderStyle, verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                    <textarea value={item.unit ?? ""} onChange={(e) => updateItem(index, { unit: e.target.value })} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px", fontFamily: "'Times New Roman', Times, serif" }} rows={1} />
                  </td>
                  <td style={{ ...rowBorderStyle, verticalAlign: "top", padding: "2px", fontSize: "9pt" }}>
                    <RichEditor
                      value={item.description ?? ""}
                      onChange={(html) => updateItem(index, { description: html })}
                      compact
                      className={editableInputCls}
                      style={{ width: "95%", fontFamily: "'Times New Roman', Times, serif" }}
                    />
                  </td>
                  <td style={{ ...rowBorderStyle, verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                    <textarea value={item.quantity ?? ""} onChange={(e) => updateItem(index, { quantity: e.target.value ? Number(e.target.value) : null })} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px", fontFamily: "'Times New Roman', Times, serif" }} rows={1} />
                  </td>
                  <td style={{ ...rowBorderStyle, verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                    <textarea value={item.unit_price ?? ""} onChange={(e) => updateItem(index, { unit_price: e.target.value ? Number(e.target.value) : null })} onInput={autoResize} className={editableInputRightCls} style={{ width: "95%", minHeight: "16px", fontFamily: "'Times New Roman', Times, serif" }} rows={1} />
                  </td>
                  <td style={{ ...rowBorderStyle, verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt" }}>
                    {total ? formatMoney(total).replace("₱", "") : ""}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="ml-1 text-red-500 hover:text-red-700 text-xs"
                      title="Remove item"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
          <tr>
            <td colSpan={6} style={{ borderLeft: "1px solid #111", borderRight: "1px solid #111", borderTop: "1px solid #111", borderBottom: "none", padding: "4px", textAlign: "center" }}>
              <button
                type="button"
                onClick={addItem}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
              >
                + Add Item
              </button>
            </td>
          </tr>

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
              <span style={{ fontWeight: "bold" }}>(Total Amount in Words) </span>{amountWords}
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
                        {supplier || <span style={{ color: "#bbb", fontWeight: "normal" }}>Supplier Name</span>}
                      </div>
                    </td>
                    <td style={{ border: "none", padding: "24px 8px 0", textAlign: "center" }}>
                      <input
                        type="text"
                        value={officialName}
                        onChange={(e) => setOfficialName(e.target.value)}
                        placeholder="Authorized Official"
                        style={{ fontWeight: "bold", textAlign: "center", width: "85%", borderBottom: "1px solid #111" }}
                        className={editableInputCls}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "2px 8px", textAlign: "center", fontSize: "9pt" }}>Signature over Printed Name of Supplier</td>
                    <td style={{ border: "none", padding: "2px 8px", textAlign: "center", fontSize: "9pt" }}>Signature over Printed Name of Authorized Official</td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "8px 8px 2px", textAlign: "center" }}>
                      <input
                        type="date"
                        value={conformeDate}
                        onChange={(e) => setConformeDate(e.target.value)}
                        className={editableInputCenterCls}
                        style={{ width: "85%", borderBottom: "1px solid #111" }}
                      />
                    </td>
                    <td style={{ border: "none", padding: "4px 8px 2px", textAlign: "center" }}>
                      <input
                        type="text"
                        value={officialDesig}
                        onChange={(e) => setOfficialDesig(e.target.value)}
                        placeholder="Designation"
                        style={{ textAlign: "center", width: "85%", borderBottom: "1px solid #111" }}
                        className={editableInputCls}
                      />
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
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}>
                <b>Fund Cluster :</b>{" "}
                <input
                  type="text"
                  value={fundCluster}
                  onChange={(e) => setFundCluster(e.target.value)}
                  placeholder="e.g. 01"
                  className={editableInputCls}
                  style={{ width: "60%" }}
                />
              </div>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>Funds Available :</b> </div>
              <div style={{ borderBottom: "1px solid #111", width: "80%", margin: "20px auto 0", fontWeight: "bold", fontSize: "9pt", textAlign: "center", paddingBottom: "2px" }}>
                <input
                  type="text"
                  value={accountantName}
                  onChange={(e) => setAccountantName(e.target.value)}
                  placeholder="Chief Accountant Name"
                  style={{ fontWeight: "bold", textAlign: "center", width: "95%" }}
                  className={editableInputCls}
                />
              </div>
              <div style={{ textAlign: "center", fontSize: "9pt" }}>Signature over Printed Name of Chief Accountant/Head of Accounting Division/Unit</div>
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", verticalAlign: "top", padding: "10px 8px", height: "135px" }}>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>ORS No. :</b> </div>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>Date of the ORS:</b> </div>
              <div style={{ fontSize: "10pt" }}><b>Amount :</b> </div>
            </td>
          </tr>
        </tbody>
      </table>
      {footerMeta ? (
        <div style={{ marginTop: "6px", fontSize: "8pt", fontStyle: "italic", color: "#444" }}>{footerMeta}</div>
      ) : null}
    </div>
  );
}

// Static PO Preview - read-only display for print
function POPreview({
  poNo,
  prNo,
  createdAt,
  supplier,
  address,
  tin,
  procurementMode,
  deliveryPlace,
  deliveryTerm,
  deliveryDate,
  paymentTerm,
  officeSection,
  fundCluster,
  items,
  textOnlyLines,
  currentUserFullname,
}: {
  poNo: string;
  prNo: string;
  createdAt: string;
  supplier: string;
  address: string;
  tin: string;
  procurementMode: string;
  deliveryPlace: string;
  deliveryTerm: string;
  deliveryDate: string;
  paymentTerm: string;
  officeSection: string;
  fundCluster: string;
  items: POItemWithBold[];
  textOnlyLines?: TextOnlyLine[];
  currentUserFullname?: string;
}) {
  const grandTotal = getGrandTotal(items);
  const amountWords = toWords(grandTotal);
  const today = new Date().toISOString().slice(0, 10);
  const footerMeta = [prNo, formatMetaDate(createdAt)].filter(Boolean).join("  | ");

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

  const itemRows = normalizedItems.map((item, index) => {
    const total = getItemTotal(item);
    const sideBorders = { borderLeft: "1px solid #111", borderRight: "1px solid #111", borderTop: "none", borderBottom: "none" };
    return (
      <tr key={index} style={{ height: "auto" }}>
        <td style={{ ...sideBorders, verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{String(item.stock_no ?? "")}</td>
        <td style={{ ...sideBorders, verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{String(item.unit ?? "")}</td>
        <td style={{ ...sideBorders, verticalAlign: "top", padding: "4px", fontSize: "9pt", lineHeight: 1.3, wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: item.description ?? "" }} />
        <td style={{ ...sideBorders, verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{Number(item.quantity ?? 0) ? String(Number(item.quantity ?? 0)) : ""}</td>
        <td style={{ ...sideBorders, verticalAlign: "top", padding: "4px", textAlign: "right", fontSize: "9pt", lineHeight: 1.3 }}>{Number(item.unit_price ?? 0) ? formatMoney(Number(item.unit_price ?? 0)).replace("₱", "") : ""}</td>
        <td style={{ ...sideBorders, verticalAlign: "top", padding: "4px", textAlign: "right", fontSize: "9pt", lineHeight: 1.3 }}>{total ? formatMoney(total).replace("₱", "") : ""}</td>
      </tr>
    );
  });

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "10pt", color: "#000", padding: 0, margin: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "right", fontSize: "11pt", fontWeight: "bold", padding: 0 }}>Appendix 61</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderRadius: "30px", padding: "10px 12px 8px", margin: "0 18px 10px" }}>
        <div style={{ textAlign: "center", fontSize: "16pt", fontWeight: "bold", letterSpacing: "0.5px" }}>PURCHASE ORDER</div>
        <div style={{ textAlign: "center", fontSize: "10.5pt", fontWeight: "bold" }}>DEPARTMENT OF AGRARIAN REFORM - CAMARINES SUR 1</div>
      </div>

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
              Date : <span style={{ fontWeight: "normal" }}>{today}</span>
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
          {itemRows}
          <tr>
            <td colSpan={5} style={{ border: "1px solid #111", padding: "3px 6px", fontSize: "9pt", fontWeight: "bold", textAlign: "right" }}>
              TOTAL :
            </td>
            <td style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold", textAlign: "right" }}>
              {getGrandTotal(items) ? formatMoney(getGrandTotal(items)).replace("₱", "") : ""}
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "2px 6px", fontSize: "9pt" }}>
              <span style={{ fontWeight: "bold" }}>(Total Amount in Words) </span>{amountWords}
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "0" }}>
              <div style={{ padding: "8px 10px 8px 20px", fontSize: "9pt", lineHeight: 1.28 }}>
                In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #111", verticalAlign: "top", padding: "10px 8px", height: "135px" }}>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>Fund Cluster :</b> {fundCluster}</div>
            </td>
            <td colSpan={3} style={{ border: "1px solid #111", verticalAlign: "top", padding: "10px 8px", height: "135px" }}>
              <div style={{ fontSize: "10pt", marginBottom: "8px" }}><b>ORS No. :</b> </div>
            </td>
          </tr>
        </tbody>
      </table>
      {footerMeta ? (
        <div style={{ marginTop: "6px", fontSize: "8pt", fontStyle: "italic", color: "#444" }}>{footerMeta}</div>
      ) : null}
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
  items: POItemWithBold[];
  textOnlyLines?: TextOnlyLine[];
  poDate?: string | null;
  officialName?: string | null;
  officialDesig?: string | null;
  accountantName?: string | null;
  accountantDesig?: string | null;
  conformeDate?: string | null;
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

  // Build item rows (text-only lines feature commented out)
  // const textLines = data.textOnlyLines || [];
  let itemRows = "";
  
  for (let i = 0; i < normalizedItems.length; i++) {
    const item = normalizedItems[i] as POItemWithBold;
    const qty = Number(item?.quantity ?? 0);
    const unitCost = Number(item?.unit_price ?? 0);
    const amount = item ? getItemTotal(item) : 0;
    const sideBorder = "border-left:1px solid #111;border-right:1px solid #111;border-top:none;border-bottom:none";
    
    // Add the item row (no horizontal borders between rows)
    itemRows += `
        <tr>
          <td style="${sideBorder};vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(item?.stock_no ?? "")}</td>
          <td style="${sideBorder};vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(item?.unit ?? "")}</td>
          <td style="${sideBorder};vertical-align:top;padding:3px 4px;font-size:9pt;word-wrap:break-word;overflow-wrap:break-word">${item?.description ?? ""}</td>
          <td style="${sideBorder};vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${qty ? String(qty) : ""}</td>
          <td style="${sideBorder};vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${unitCost ? formatMoney(unitCost).replace("₱", "") : ""}</td>
          <td style="${sideBorder};vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${amount ? formatMoney(amount).replace("₱", "") : ""}</td>
        </tr>`;
    
    // Text-only lines feature commented out
    // const linesAfterThisItem = textLines.filter(line => line.position === i + 1);
    // for (const line of linesAfterThisItem) {
    //   const hasContent = line.stock_no.trim() || line.unit.trim() || line.description.trim() || line.quantity.trim() || line.unit_price.trim();
    //   if (hasContent) {
    //     itemRows += `
    //     <tr style="background-color:#fefce8">
    //       <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(line.stock_no)}</td>
    //       <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(line.unit)}</td>
    //       <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap">${escapeHtml(line.description)}</td>
    //       <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${escapeHtml(line.quantity)}</td>
    //       <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${escapeHtml(line.unit_price)}</td>
    //       <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right"></td>
    //     </tr>`;
    //   }
    // }
  }
  
  // If no items, ensure at least one empty row
  if (normalizedItems.length === 0) {
    itemRows = `
        <tr>
          <td style="border-left:1px solid #111;border-right:1px solid #111;border-top:none;border-bottom:none;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border-left:1px solid #111;border-right:1px solid #111;border-top:none;border-bottom:none;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border-left:1px solid #111;border-right:1px solid #111;border-top:none;border-bottom:none;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border-left:1px solid #111;border-right:1px solid #111;border-top:none;border-bottom:none;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border-left:1px solid #111;border-right:1px solid #111;border-top:none;border-bottom:none;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
          <td style="border-left:1px solid #111;border-right:1px solid #111;border-top:none;border-bottom:none;vertical-align:top;padding:3px 4px;font-size:9pt">&nbsp;</td>
        </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Purchase Order</title>
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
          <td colSpan="3" style="vertical-align:top;padding:10px 8px;height:135px">
            <div style="font-size:10pt;margin-bottom:8px"><b>Fund Cluster :</b> ${escapeHtml(data.fundCluster)}</div>
            <div style="font-size:10pt;margin-bottom:8px"><b>Funds Available :</b> </div>
            <div style="border-bottom:1px solid #111;width:80%;margin:20px auto 0;font-size:9pt;font-weight:bold;text-align:center;padding-bottom:2px">${escapeHtml(data.accountantName || "")}</div>
            <div style="text-align:center;font-size:9pt">Signature over Printed Name of Chief Accountant/Head of Accounting Division/Unit</div>
          </td>
          <td colSpan="3" style="vertical-align:top;padding:10px 8px;height:135px">
            <div style="font-size:10pt;margin-bottom:8px"><b>ORS No. :</b> </div>
            <div style="font-size:10pt;margin-bottom:8px"><b>Date of the ORS:</b> </div>
            <div style="font-size:10pt"><b>Amount :</b> ${grandTotal ? formatMoney(grandTotal) : ""}</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function downloadPDF(data: {
  poNo: string;
  prNo?: string | null;
  createdAt?: string | null;
  supplier: string;
  address: string;
  tin: string;
  procurementMode: string;
  deliveryPlace: string;
  deliveryTerm: string;
  deliveryDate: string;
  paymentTerm: string;
  officeSection: string;
  fundCluster: string;
  items: POItemWithBold[];
  textOnlyLines?: TextOnlyLine[];
  hideTotalRow?: boolean;
  poDate?: string;
  officialName?: string;
  officialDesig?: string;
  accountantName?: string;
  accountantDesig?: string;
  conformeDate?: string | null;
  currentUserFullname?: string;
  currentUserId?: number | null;
  prId?: number | null;
}) {
  // Post remark if currentUser is available
  if (data.currentUserFullname) {
    postPrintRemark(data.currentUserFullname, 'PO', data.currentUserId, data.prId);
  }
  printWithIframe(sharedBuildPO(data));
}

// Helper function to post print remark
async function postPrintRemark(fullname: string, documentType: 'PR' | 'PO' | 'ORS', userId?: number | null, prId?: number | null) {
  try {
    const supabase = createClient();
    const remarkText = `[PRINT] ${fullname} downloaded/printed a ${documentType} document`;
    
    // Insert into remarks table
    await supabase.from('remarks').insert({
      remark: remarkText,
      user_id: userId || null,
      pr_id: prId || null,
      phase: 'po',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to post print remark:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract document types & helpers
// ─────────────────────────────────────────────────────────────────────────────
type ContractFormState = {
  contractTitle: string;
  firstPartyOffice: string;
  secondPartyRep: string;
  secondPartyCity: string;
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
  considerationAmountWords: string;
};

function fmtContractDate(iso: string) {
  if (!iso) return { day: "", ordDay: "___", month: "___________", year: "____", full: "" };
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate().toString();
  const s = ["th","st","nd","rd"], v = d.getDate() % 100;
  const ordDay = day + (s[(v-20)%10] || s[v] || s[0]);
  const month = d.toLocaleDateString("en-PH", { month: "long" });
  const year = d.getFullYear().toString();
  const full = d.toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
  return { day, ordDay, month, year, full };
}

// ─────────────────────────────────────────────────────────────────────────────
// ContractEditablePreview — editable live preview matching the contract image
// ─────────────────────────────────────────────────────────────────────────────
function ContractEditablePreview({
  firstPartyAgency, firstPartyRep,
  secondPartyName, considerationAmount, commencementLocation,
  fields, setFields, onAmountWordsManualEdit,
}: {
  firstPartyAgency: string; firstPartyRep: string;
  secondPartyName: string; considerationAmount: number; commencementLocation: string;
  fields: ContractFormState;
  setFields: React.Dispatch<React.SetStateAction<ContractFormState>>;
  onAmountWordsManualEdit: () => void;
}) {
  const set = (k: keyof ContractFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields(prev => ({ ...prev, [k]: e.target.value }));
    if (k === "considerationAmountWords") onAmountWordsManualEdit();
  };
  const cd   = fmtContractDate(fields.contractDate);
  const comd = fmtContractDate(fields.commencementDate);
  const fmtMoney = (n: number) => "\u20B1" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  /* Base document style */
  const doc: React.CSSProperties = {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: "11pt",
    lineHeight: 1.55,
    color: "#000",
    maxWidth: "720px",
    margin: "0 auto",
    padding: "20px 24px",
  };

  /* PO-wired display span — bold + bottom underline */
  const fill = (content: string, minW = "140px"): React.CSSProperties => ({
    display: "inline-block",
    borderBottom: "1px solid #000",
    fontWeight: "bold",
    textAlign: "center",
    minWidth: minW,
    padding: "0 4px",
    verticalAlign: "bottom",
  });

  /* Editable input — bold + subtle yellow bg + bottom border */
  const inp: React.CSSProperties = {
    border: "none",
    borderBottom: "1px solid #444",
    background: "#fffde7",
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: "11pt",
    fontWeight: "bold",
    outline: "none",
    padding: "0 4px",
    verticalAlign: "bottom",
    minWidth: "80px",
  };

  /* Flex row */
  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-end",
    gap: "4px",
    marginBottom: "2px",
  };

  /* Stretch — flex:1 fill inside a row */
  const stretchFill: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    borderBottom: "1px solid #000",
    fontWeight: "bold",
    textAlign: "center",
    padding: "0 4px",
  };

  return (
    <div style={doc}>

      {/* ── Title ── */}
      <div style={{ textAlign: "center", marginBottom: "18px" }}>
        <input
          type="text"
          value={fields.contractTitle}
          onChange={set("contractTitle")}
          style={{ ...inp, background: "#fffbeb", fontSize: "12pt", textAlign: "center", width: "100%", border: "none", borderBottom: "1px solid #ccc" }}
          placeholder="CONTRACT FOR SERVICES"
        />
      </div>

      {/* ── KNOW ALL MEN ── */}
      <div style={{ fontWeight: "bold", marginBottom: "16px" }}>KNOW ALL MEN BY THESE PRESENTS:</div>

      {/* ── Party intro ── */}
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          This contract, executed by and between <span style={{ ...fill(firstPartyAgency || "DEPARTMENT OF AGRARIAN REFORM", "200px") }}>{firstPartyAgency || "DEPARTMENT OF AGRARIAN REFORM"}</span> Provincial Office, 
          represented by <span style={{ ...fill(firstPartyRep || "[Official Name]", "140px") }}>{firstPartyRep || "[Official Name]"}</span> with office address at{" "}
          <input type="text" value={fields.firstPartyOffice} onChange={set("firstPartyOffice")}
            style={{ ...inp, minWidth: "200px" }} placeholder="Office address" />, hereinafter referred to as the party of the FIRST PART; 
          and <span style={{ ...fill(secondPartyName || "[Supplier]", "140px") }}>{secondPartyName || "[Supplier]"}</span>, represented by{" "}
          <input type="text" value={fields.secondPartyRep} onChange={set("secondPartyRep")}
            style={{ ...inp, minWidth: "140px" }} placeholder="Supplier representative" />, 
          Filipino, of legal age and a resident of{" "}
          <input type="text" value={fields.secondPartyCity} onChange={set("secondPartyCity")}
            style={{ ...inp, minWidth: "110px" }} placeholder="City" />{" "}
          hereinafter referred to as the party of the SECOND PART.
        </p>
      </div>

      {/* ── WITNESSETH ── */}
      <div style={{ textAlign: "center", fontWeight: "bold", letterSpacing: "6px", margin: "20px 0" }}>W I T N E S S E T H</div>

      {/* ── Consideration ── */}
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          That for and in consideration of the sum of{" "}
          <input type="text" value={fields.considerationAmountWords} onChange={set("considerationAmountWords")}
            style={{ ...inp, minWidth: "300px", textTransform: "uppercase" }}
            placeholder="AMOUNT IN WORDS" />{" "}
          ({fmtMoney(considerationAmount)}), which the FIRST PARTY agreed to pay unto the SECOND PARTY, the SECOND PARTY 
          agrees to deliver/provide the{" "}
          <input type="text" value={fields.serviceDescription} onChange={set("serviceDescription")}
            style={{ ...inp, minWidth: "250px", textTransform: "uppercase" }}
            placeholder="Service/delivery description…" />.
        </p>
      </div>

      {/* ── Payment ── */}
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          That the FIRST PARTY shall pay the full amount to the SECOND PARTY when the{" "}
          <input type="text" value={fields.paymentCondition} onChange={set("paymentCondition")}
            style={{ ...inp, minWidth: "300px", textTransform: "uppercase" }}
            placeholder="Payment condition (defaults to service description if blank)" />.
        </p>
      </div>

      {/* ── Job order ── */}
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          That the SECOND PARTY agrees to finish the{" "}
          <input type="text" value={fields.jobOrderDescription} onChange={set("jobOrderDescription")}
            style={{ ...inp, minWidth: "180px", textTransform: "uppercase" }}
            placeholder="JOB ORDER" />{" "}
          within{" "}
          <input type="text" value={fields.scheduledDays} onChange={set("scheduledDays")}
            style={{ ...inp, width: "45px", textAlign: "center" }} placeholder="__" />{" "}
          scheduled days counted from the day the contract for the{" "}
          <span style={{ ...fill(fields.serviceDescription || "[service item]", "200px"), textTransform: "uppercase" }}>
            {fields.serviceDescription || "[service item]"}
          </span>{" "}
          <span style={{ ...fill(comd.full || "", "180px") }}>{comd.full || ""}</span>{" "}
          has been issued by the FIRST PARTY; and should the SECOND PARTY fail to finish the job within the said period, 
          the SECOND PARTY shall indemnify the sum of{" "}
          <input type="text" value={fields.liquidatedDamagesRate} onChange={set("liquidatedDamagesRate")}
            style={{ ...inp, width: "130px" }} placeholder="1/10th of 1%" />{" "}
          for every day of delay of liquidated damages.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "9pt", color: "#666" }}>
          <span>Commencement date:</span>
          <input type="date" value={fields.commencementDate} onChange={set("commencementDate")}
            style={{ border: "1px solid #bbb", background: "#fffde7", fontSize: "9pt", padding: "1px 4px" }} />
        </div>
      </div>

      {/* ── Commencement ── */}
      <div style={{ paddingLeft: "2em", marginBottom: "14px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          That this Contract shall commence on{" "}
          <span style={{ ...fill(comd.full || "", "180px") }}>{comd.full || ""}</span>{" "}
          at{" "}
          <span style={{ ...fill(commencementLocation || "[Location]", "180px") }}>{commencementLocation || "[Location]"}</span>.
        </p>
      </div>

      {/* ── IN WITNESS WHEREOF ── */}
      <div style={{ paddingLeft: "2em", marginBottom: "20px" }}>
        <p style={{ margin: 0, textIndent: "2em" }}>
          IN WITNESS WHEREOF, the parties signed this contract on the{" "}
          <span style={{ ...fill(cd.ordDay || "___", "55px") }}>{cd.ordDay || "___"}</span>{" "}
          day of{" "}
          <span style={{ ...fill(cd.month || "___________", "130px") }}>{cd.month || "___________"}</span>, {cd.year || "____"}.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "9pt", color: "#666" }}>
          <span>Contract date:</span>
          <input type="date" value={fields.contractDate} onChange={set("contractDate")}
            style={{ border: "1px solid #bbb", background: "#fffde7", fontSize: "9pt", padding: "1px 4px" }} />
        </div>
      </div>

      {/* ── Signature block ── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px" }}>
        <div style={{ width: "44%", textAlign: "center" }}>
          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>{firstPartyAgency || "DEPARTMENT OF AGRARIAN REFORM"}:</div>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{firstPartyRep || "[Official Name]"}</div>
          <div style={{ borderBottom: "1px solid #000", marginBottom: "4px" }} />
          <div style={{ fontSize: "9pt" }}>(Signature of the FIRST PARTY)</div>
        </div>
        <div style={{ width: "44%", textAlign: "center" }}>
          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>{secondPartyName || "[Supplier]"}:</div>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{fields.secondPartyRep || "[Supplier Representative]"}</div>
          <div style={{ borderBottom: "1px solid #000", marginBottom: "4px" }} />
          <div style={{ fontSize: "9pt" }}>(Signature of the SECOND PARTY)</div>
        </div>
      </div>

      {/* ── Witnesses ── */}
      <div style={{ textAlign: "center", fontWeight: "bold", margin: "28px 0 16px" }}>WITNESSES:</div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "44%", textAlign: "center" }}>
          <input type="text" value={fields.witnessOne} onChange={set("witnessOne")}
            style={{ ...inp, width: "90%", textAlign: "center", textTransform: "uppercase", marginBottom: "4px" }}
            placeholder="WITNESS NAME" />
          <div style={{ borderBottom: "1px solid #000" }} />
        </div>
        <div style={{ width: "44%", textAlign: "center" }}>
          <input type="text" value={fields.witnessTwo} onChange={set("witnessTwo")}
            style={{ ...inp, width: "90%", textAlign: "center", textTransform: "uppercase", marginBottom: "4px" }}
            placeholder="WITNESS NAME" />
          <div style={{ borderBottom: "1px solid #000" }} />
        </div>
      </div>

    </div>
  );
}

export default function CreatePOModal({ visible, onClose, onCreate }: CreatePOModalProps) {
  const supabase = createClient();
  
  // PR Selection state
  const [availablePRs, setAvailablePRs] = useState<PurchaseRequest[]>([]);
  const [selectedPRId, setSelectedPRId] = useState<string>("");
  const [selectedPRNo, setSelectedPRNo] = useState<string>("");
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [prSearch, setPrSearch] = useState("");
  const [prSortBy, setPrSortBy] = useState<"date" | "pr_no" | "cost">("date");
  const [prSortDir, setPrSortDir] = useState<"asc" | "desc">("desc");
  const [prFilterPO, setPrFilterPO] = useState<"all" | "no_po" | "has_po">("all");
  const [prFilterDivision, setPrFilterDivision] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // PO Form state
  const [poNo, setPoNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [address, setAddress] = useState("");
  const [tin, setTin] = useState("");
  const [procurementMode, setProcurementMode] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState("");
  const [deliveryTerm, setDeliveryTerm] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [paymentTerm, setPaymentTerm] = useState("");
  const [officeSection, setOfficeSection] = useState("");
  const [fundCluster, setFundCluster] = useState("");
  const [items, setItems] = useState<POItemWithBold[]>([]);
  const [hideTotalRow, setHideTotalRow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [poDate, setPoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [previewCreatedAt] = useState(() => new Date().toISOString());
  const [officialName, setOfficialName] = useState("");
  const [officialDesig, setOfficialDesig] = useState("");
  const [accountantName, setAccountantName] = useState("");
  const [accountantDesig, setAccountantDesig] = useState("");
  const [conformeDate, setConformeDate] = useState("");

  // Contract state
  const [includesContract, setIncludesContract] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"po" | "contract">("po");
  const [amountWordsOverridden, setAmountWordsOverridden] = useState(false);
  const [contractFields, setContractFields] = useState<ContractFormState>({
    contractTitle: "CONTRACT FOR SERVICES",
    firstPartyOffice: "Do\u00f1a Dolores Bldg., Triangulo, Naga City, Camarines Sur",
    secondPartyRep: "",
    secondPartyCity: "",
    serviceDescription: "",
    deliveryLocation: "",
    paymentCondition: "",
    jobOrderDescription: "JOB ORDER",
    scheduledDays: "",
    liquidatedDamagesRate: "1/10th of 1%",
    contractDate: "",
    commencementDate: "",
    witnessOne: "",
    witnessTwo: "",
    considerationAmountWords: "",
  });

  // Text-only lines state (for printing only - descriptive lines between items)
  const [textOnlyLines, setTextOnlyLines] = useState<TextOnlyLine[]>([]);

  // Current user for print remarks
  const [currentUserFullname, setCurrentUserFullname] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const grandTotal = getGrandTotal(items);

  // Auto-sync considerationAmountWords with grandTotal (unless manually overridden)
  useEffect(() => {
    if (!amountWordsOverridden) {
      setContractFields(prev => ({ ...prev, considerationAmountWords: toWords(grandTotal) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotal, amountWordsOverridden]);

  // Reset contract tab when contract checkbox is unchecked
  useEffect(() => {
    if (!includesContract) setActivePreviewTab("po");
  }, [includesContract]);

  // Load current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user?.fullname) {
          setCurrentUserFullname(user.fullname);
        }
        if (user?.id) {
          setCurrentUserId(user.id);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Helper functions for text-only lines
  function addTextOnlyLine(afterIndex: number) {
    const newLine: TextOnlyLine = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: afterIndex,
      stock_no: "",
      unit: "",
      description: "",
      quantity: "",
      unit_price: "",
    };
    setTextOnlyLines((prev) => [...prev, newLine]);
  }

  function updateTextOnlyLine(id: string, field: keyof Omit<TextOnlyLine, 'id' | 'position'>, value: string) {
    setTextOnlyLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  }

  function removeTextOnlyLine(id: string) {
    setTextOnlyLines((prev) => prev.filter((line) => line.id !== id));
  }

  // Division dropdown state
  const [divisions, setDivisions] = useState<{ division_id: number; division_name: string }[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  // Fetch PRs with Abstract of Awards status (status_id = 37)
  useEffect(() => {
    if (visible) {
      fetchAvailablePRs();
      // Fetch divisions for dropdown
      (async () => {
        const { data } = await supabase
          .from("divisions")
          .select("division_id, division_name")
          .order("division_name");
        if (data) setDivisions(data);
      })();
    }
  }, [visible]);

  async function fetchAvailablePRs() {
    setLoadingPRs(true);
    try {
      // tig pakaray ko na nag fe fetch na 37
      // tig palitan ko si 33 ning 37
      // Fetch PRs with status 37 (Completed PR Phase)
      const { data: prsData, error: prsError } = await supabase
        .from("purchase_requests")
        .select("id, pr_no, purpose, office_section, fund_cluster, entity_name, total_cost, division_id, created_at")
        .eq("status_id", 37)
        .order("created_at", { ascending: false })
        .limit(500); // Limit to latest 500 PRs for performance

      if (prsError) {
        console.error("Error fetching PRs:", prsError);
        return;
      }

      if (!prsData || prsData.length === 0) {
        setAvailablePRs([]);
        return;
      }

      // Fetch existing POs to check which PRs already have POs
      const prIds = prsData.map(pr => pr.id);
      const { data: posData, error: posError } = await supabase
        .from("purchase_orders")
        .select("pr_id")
        .in("pr_id", prIds);

      if (posError) {
        console.error("Error fetching POs:", posError);
      }

      // Count POs per PR
      const poCountMap = new Map<number, number>();
      (posData || []).forEach(po => {
        if (po.pr_id) {
          poCountMap.set(po.pr_id, (poCountMap.get(po.pr_id) || 0) + 1);
        }
      });

      // Enrich PR data with PO status
      const enrichedPRs = prsData.map(pr => ({
        ...pr,
        has_po: poCountMap.has(pr.id),
        po_count: poCountMap.get(pr.id) || 0,
      }));

      // Initial sort: PRs without PO first, then by created_at descending
      enrichedPRs.sort((a, b) => {
        if (a.has_po !== b.has_po) {
          return a.has_po ? 1 : -1; // PRs without PO come first
        }
        // Both have same PO status, sort by date (newest first)
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      setAvailablePRs(enrichedPRs);
      // Reset filters when refreshing
      setPrFilterPO("all");
      setPrFilterDivision("all");
      setPrSortBy("date");
      setPrSortDir("desc");
    } catch (err) {
      console.error("Error fetching PRs:", err);
    } finally {
      setLoadingPRs(false);
    }
  }

  // Handle PR selection - fetch winning canvass and pre-fill PO fields
  async function handlePRSelect(prId: string) {
    setSelectedPRId(prId);
    if (!prId) {
      resetForm();
      return;
    }

    const selectedPR = availablePRs.find((pr) => pr.id.toString() === prId);
    if (!selectedPR) return;

    // Reset text-only lines first (critical for preview reset)
    setTextOnlyLines([]);

    // Store PR number for PO creation
    setSelectedPRNo(selectedPR.pr_no);

    // Pre-fill office info from PR
    setOfficeSection(selectedPR.office_section || "");
    let divId = selectedPR.division_id || null;
    if (!divId && selectedPR.office_section) {
      const match = divisions.find(d => d.division_name.trim().toLowerCase() === selectedPR.office_section?.trim().toLowerCase());
      if (match) divId = match.division_id;
    }
    setSelectedDivisionId(divId);
    setFundCluster(selectedPR.fund_cluster || "");
    setDeliveryPlace(selectedPR.entity_name || "");

    // Fetch winning canvass entries for this PR directly using pr_no
    try {
      const { data: winningEntries, error: entriesError } = await supabase
        .from("canvass_entries")
        .select("*")
        .eq("pr_no", selectedPR.pr_no)
        .eq("is_winning", true);

      if (entriesError) {
        console.error("Error fetching canvass entries:", entriesError);
        return;
      }

      // Fetch the purchase request items for descriptions
      const { data: prItemsData, error: prItemsError } = await supabase
        .from("purchase_request_items")
        .select("*")
        .eq("pr_id", selectedPR.id);

      if (prItemsError) {
        console.error("Error fetching PR items:", prItemsError);
      }

      console.log("Found winning entries:", winningEntries);

      if (winningEntries && winningEntries.length > 0) {
        // Use the first winning entry for supplier info
        const firstEntry = winningEntries[0];
        setSupplier(firstEntry.supplier_name || "");
        setAddress(firstEntry.supplier_address || "");
        setTin(firstEntry.tin_no || "");
        setDeliveryTerm(firstEntry.delivery_days ? `${firstEntry.delivery_days} days` : "");

        // Build line items from all winning entries
        const poItems: PurchaseOrderItemRow[] = winningEntries
          .filter((entry) => entry.unit || entry.unit_price || entry.quantity)
          .map((entry) => {
            // Find the corresponding PR item to get the description
            const prItem = prItemsData?.find((item) => item.id === entry.pr_items);
            return {
              stock_no: prItem?.stock_no || null,
              unit: entry.unit || null,
              description: prItem?.description || null,
              quantity: Number(entry.quantity) || 1,
              unit_price: Number(entry.unit_price) || 0,
              subtotal: Number(entry.total_price) || 0,
            };
          });

        setItems(poItems);
      } else {
        console.log("No winning entries found for PR:", selectedPR.pr_no);
        setItems([]);
        setSupplier("");
        setAddress("");
        setTin("");
        setDeliveryTerm("");
      }
    } catch (err) {
      console.error("Error fetching winning canvass:", err);
    }
  }

  function handlePoDateChange(newDate: string) {
    setPoDate(newDate);
    if (newDate) {
      const d = new Date(newDate + "T00:00:00");
      d.setDate(d.getDate() + 7);
      setDeliveryDate(d.toISOString().slice(0, 10));
    }
  }

  function resetForm() {
    setSelectedPRId("");
    setSelectedPRNo("");
    setPoNo("");
    setSupplier("");
    setAddress("");
    setTin("");
    setProcurementMode("");
    setDeliveryPlace("");
    setDeliveryTerm("");
    const dReset = new Date();
    dReset.setDate(dReset.getDate() + 7);
    setDeliveryDate(dReset.toISOString().slice(0, 10));
    setPaymentTerm("");
    setOfficeSection("");
    setSelectedDivisionId(null);
    setFundCluster("");
    setItems([]);
    setSaving(false);
    setPoDate(new Date().toISOString().slice(0, 10));
    setOfficialName("");
    setOfficialDesig("");
    setAccountantName("");
    setAccountantDesig("");
    setConformeDate("");
    setIncludesContract(false);
    setActivePreviewTab("po");
    setAmountWordsOverridden(false);
    setContractFields({
      contractTitle: "CONTRACT FOR SERVICES",
      firstPartyOffice: "Do\u00f1a Dolores Bldg., Triangulo, Naga City, Camarines Sur",
      secondPartyRep: "",
      secondPartyCity: "",
      serviceDescription: "",
      deliveryLocation: "",
      paymentCondition: "",
      jobOrderDescription: "JOB ORDER",
      scheduledDays: "",
      liquidatedDamagesRate: "1/10th of 1%",
      contractDate: "",
      commencementDate: "",
      witnessOne: "",
      witnessTwo: "",
      considerationAmountWords: "",
    });
  }

  function addItem() {
    setItems((s) => [...s, { stock_no: null, unit: null, description: null, quantity: null, unit_price: null, subtotal: 0 } as POItemWithBold]);
  }

  function updateItem(idx: number, patch: Partial<POItemWithBold>) {
    setItems((s) =>
      s.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, ...patch };
        const qty = updated.quantity ? Number(updated.quantity) : 0;
        const price = updated.unit_price ? Number(updated.unit_price) : 0;
        updated.subtotal = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
        return updated;
      }),
    );
  }

  function removeItem(idx: number) {
    setItems((s) => s.filter((_, i) => i !== idx));
  }

  function moveItem(idx: number, direction: 'up' | 'down') {
    setItems((s) => {
      if (direction === 'up' && idx > 0) {
        const updated = [...s];
        [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
        return updated;
      } else if (direction === 'down' && idx < s.length - 1) {
        const updated = [...s];
        [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
        return updated;
      }
      return s;
    });
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!supplier) { setErrorMsg("Supplier is required"); return; }
    if (!poNo.trim()) { setErrorMsg("PO Number is required"); return; }
    setSaving(true);
    try {
      const header: Partial<PurchaseOrderRow> = {
        po_no: poNo,
        pr_no: selectedPRNo || null,
        pr_id: selectedPRId ? parseInt(selectedPRId, 10) : null,
        supplier,
        address,
        tin,
        procurement_mode: procurementMode,
        delivery_place: deliveryPlace,
        delivery_term: deliveryTerm,
        delivery_date: deliveryDate || null,
        payment_term: paymentTerm,
        office_section: officeSection,
        fund_cluster: fundCluster,
        total_amount: grandTotal,
        status_id: 11,
        division_id: selectedDivisionId,
        hide_total_row: hideTotalRow,
        date: poDate || null,
        official_name: officialName || null,
        official_desig: officialDesig || null,
        accountant_name: accountantName || null,
        accountant_desig: accountantDesig || null,
        conforme_date: conformeDate || null,
      };
      const cleanItems = items.map((item) => ({ ...item, description: stripHtml(item.description ?? "") }));
      const newPoId = await onCreate(header, cleanItems);

      if (includesContract && newPoId) {
        const { error: contractError } = await supabase.from("contract_documents").insert({
          po_id: newPoId,
          po_no: poNo,
          contract_title: contractFields.contractTitle || null,
          first_party_agency: officeSection || "DEPARTMENT OF AGRARIAN REFORM",
          first_party_rep: officialName || null,
          first_party_office: contractFields.firstPartyOffice || null,
          first_party_city: deliveryPlace || null,
          second_party_name: supplier || null,
          second_party_rep: contractFields.secondPartyRep || null,
          second_party_address: address || null,
          second_party_city: contractFields.secondPartyCity || null,
          consideration_amount: grandTotal || null,
          consideration_amount_words: contractFields.considerationAmountWords || null,
          service_description: contractFields.serviceDescription || null,
          delivery_location: contractFields.deliveryLocation || null,
          payment_condition: contractFields.paymentCondition || null,
          job_order_description: contractFields.jobOrderDescription || null,
          scheduled_days: contractFields.scheduledDays || null,
          liquidated_damages_rate: contractFields.liquidatedDamagesRate || null,
          contract_date: contractFields.contractDate || null,
          commencement_date: contractFields.commencementDate || null,
          commencement_location: address || null,
          witness_one: contractFields.witnessOne || null,
          witness_two: contractFields.witnessTwo || null,
          created_by: currentUserId || null,
        });
        if (contractError) throw new Error(`Contract save failed: ${contractError.message}`);
      }

      setSuccessMsg(`Purchase Order ${poNo} has been created successfully.`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to create PO. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Compute filtered and sorted PR list
  const filteredAndSortedPRs = useMemo(() => {
    let filtered = availablePRs;

    // Apply PO status filter
    if (prFilterPO === "no_po") {
      filtered = filtered.filter(pr => !pr.has_po);
    } else if (prFilterPO === "has_po") {
      filtered = filtered.filter(pr => pr.has_po);
    }

    // Apply division filter
    if (prFilterDivision !== "all") {
      filtered = filtered.filter(pr => pr.division_id?.toString() === prFilterDivision);
    }

    // Apply search filter
    if (prSearch) {
      const searchLower = prSearch.toLowerCase();
      filtered = filtered.filter(pr =>
        pr.pr_no.toLowerCase().includes(searchLower) ||
        pr.purpose.toLowerCase().includes(searchLower) ||
        pr.office_section.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (prSortBy === "date") {
        aVal = new Date(a.created_at || 0).getTime();
        bVal = new Date(b.created_at || 0).getTime();
      } else if (prSortBy === "pr_no") {
        aVal = a.pr_no;
        bVal = b.pr_no;
      } else if (prSortBy === "cost") {
        aVal = a.total_cost;
        bVal = b.total_cost;
      }

      if (aVal < bVal) return prSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return prSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [availablePRs, prSearch, prFilterPO, prFilterDivision, prSortBy, prSortDir]);

  if (!visible) return null;

  return (
    <>
    <SuccessModal
      visible={!!successMsg}
      title="PO Created"
      message={successMsg ?? ""}
      onConfirm={() => { setSuccessMsg(null); resetForm(); onClose(); }}
    />
    <ErrorModal
      visible={!!errorMsg}
      message={errorMsg ?? ""}
      onDismiss={() => setErrorMsg(null)}
    />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">Create Purchase Order</h2>
            <p className="text-emerald-100 text-sm mt-1">Appendix 61 · Official Government Form</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-500/50 rounded-lg transition-colors">
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-[2] flex-col overflow-hidden border-r border-gray-200">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
              {/* PR Selection Section */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">Select Purchase Request</h3>
                <div className="space-y-3">
                  {/* Search, Filter Toggle, and Refresh */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search PR number, purpose, or office..."
                        value={prSearch}
                        onChange={(e) => setPrSearch(e.target.value)}
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                        showFilters 
                          ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                      }`}
                    >
                      <RiFilter3Line size={16} />
                      {showFilters ? "Hide" : "Filter"}
                    </button>
                    <button
                      type="button"
                      onClick={fetchAvailablePRs}
                      disabled={loadingPRs}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingPRs ? "Loading..." : "Refresh"}
                    </button>
                  </div>

                  {/* Sort and Filter Controls - Collapsible */}
                  {showFilters && (
                  <div className="grid grid-cols-4 gap-2 p-3 bg-white rounded-lg border border-emerald-200">
                    {/* Sort By */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Sort By</label>
                      <select
                        value={prSortBy}
                        onChange={(e) => setPrSortBy(e.target.value as "date" | "pr_no" | "cost")}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="date">Date</option>
                        <option value="pr_no">PR Number</option>
                        <option value="cost">Cost</option>
                      </select>
                    </div>

                    {/* Sort Direction */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Order</label>
                      <select
                        value={prSortDir}
                        onChange={(e) => setPrSortDir(e.target.value as "asc" | "desc")}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>

                    {/* PO Status Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">PO Status</label>
                      <select
                        value={prFilterPO}
                        onChange={(e) => setPrFilterPO(e.target.value as "all" | "no_po" | "has_po")}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="all">All PRs</option>
                        <option value="no_po">No PO Yet</option>
                        <option value="has_po">Has PO</option>
                      </select>
                    </div>

                    {/* Division Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Division</label>
                      <select
                        value={prFilterDivision}
                        onChange={(e) => setPrFilterDivision(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="all">All Divisions</option>
                        {divisions.map(div => (
                          <option key={div.division_id} value={div.division_id}>
                            {div.division_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                      Available PRs (Abstract of Awards) *
                    </label>
                    <select
                      value={selectedPRId}
                      onChange={(e) => handlePRSelect(e.target.value)}
                      className={inputCls}
                      required={!supplier} // Require PR selection if no manual entry
                    >
                      <option value="">-- Select a PR --</option>
                      {filteredAndSortedPRs
                        .slice(0, 100) // Limit displayed options to 100 for performance
                        .map((pr) => {
                          const poStatus = pr.has_po 
                            ? ` [${pr.po_count} PO${pr.po_count! > 1 ? 's' : ''} exist${pr.po_count! > 1 ? '' : 's'}]` 
                            : " [No PO yet]";
                          const purposePreview = pr.purpose.length > 40 
                            ? `${pr.purpose.substring(0, 40)}...` 
                            : pr.purpose;
                          return (
                            <option key={pr.id} value={pr.id}>
                              {pr.pr_no} - {purposePreview} (₱{pr.total_cost.toLocaleString()}){poStatus}
                            </option>
                          );
                        })}
                    </select>
                    {availablePRs.length === 0 && !loadingPRs && (
                      <p className="text-xs text-gray-500 mt-1">No PRs with Abstract of Awards status available.</p>
                    )}
                    {availablePRs.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Showing {Math.min(filteredAndSortedPRs.length, 100)} of {filteredAndSortedPRs.length} filtered PRs
                        {filteredAndSortedPRs.length !== availablePRs.length && (
                          <span className="text-gray-400"> (from {availablePRs.length} total)</span>
                        )}.
                        {" "}
                        {filteredAndSortedPRs.filter(pr => !pr.has_po).length > 0 && (
                          <span className="font-semibold text-emerald-600">
                            {filteredAndSortedPRs.filter(pr => !pr.has_po).length} without PO
                          </span>
                        )}
                        {filteredAndSortedPRs.filter(pr => pr.has_po).length > 0 && (
                          <span className="text-amber-600">
                            {filteredAndSortedPRs.filter(pr => !pr.has_po).length > 0 ? ", " : ""}
                            {filteredAndSortedPRs.filter(pr => pr.has_po).length} with existing PO(s)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Supplier Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Supplier *</label>
                    <input className={inputCls} placeholder="Supplier name" value={supplier} onChange={(e) => setSupplier(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Address</label>
                    <input className={inputCls} placeholder="Supplier address" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-2">TIN</label>
                      <input className={inputCls} placeholder="Tax ID" value={tin} onChange={(e) => setTin(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Mode of Procurement</label>
                      <input className={inputCls} placeholder="e.g., Public Bidding" value={procurementMode} onChange={(e) => setProcurementMode(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Delivery Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Place of Delivery</label>
                    <input className={inputCls} placeholder="Delivery location" value={deliveryPlace} onChange={(e) => setDeliveryPlace(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Delivery Term</label>
                      <input className={inputCls} placeholder="e.g., FOB" value={deliveryTerm} onChange={(e) => setDeliveryTerm(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Delivery Date</label>
                      <input type="date" className={inputCls} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Payment Term</label>
                      <input className={inputCls} placeholder="e.g., Net 30" value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Office Information</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Office / Section *</label>
                    <select
                      className={inputCls}
                      value={selectedDivisionId ?? ""}
                      onChange={(e) => {
                        const divId = e.target.value ? Number(e.target.value) : null;
                        setSelectedDivisionId(divId);
                        const div = divisions.find(d => d.division_id === divId);
                        setOfficeSection(div ? div.division_name : "");
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
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Fund Cluster</label>
                    <input className={inputCls} placeholder="e.g., 01" value={fundCluster} onChange={(e) => setFundCluster(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PO Number *</label>
                  <input className={inputCls} placeholder="e.g., PO-2024-001" value={poNo} onChange={(e) => setPoNo(e.target.value)} required />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Date &amp; Signatories</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PO Date</label>
                    <input type="date" className={inputCls} value={poDate} onChange={(e) => handlePoDateChange(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Authorized Official</label>
                    <input className={inputCls} placeholder="e.g., Juan Dela Cruz" value={officialName} onChange={(e) => setOfficialName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Designation</label>
                    <input className={inputCls} placeholder="e.g., PARPO II" value={officialDesig} onChange={(e) => setOfficialDesig(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Chief Accountant</label>
                  <input className={inputCls} placeholder="e.g., Maria Santos" value={accountantName} onChange={(e) => setAccountantName(e.target.value)} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Line Items</h3>
                  <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold px-3 py-1.5 border border-dashed border-emerald-300 rounded hover:bg-emerald-50 transition-colors">
                    <RiAddLine size={14} /> Add Item
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">No items yet — click "Add Item" to start</div>
                  ) : (
                    items.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                        <div className="absolute top-2 right-2 flex gap-1">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveItem(index, 'up')}
                              className="text-gray-400 hover:text-emerald-600 text-sm p-1"
                              title="Move up"
                            >
                              ↑
                            </button>
                          )}
                          {index < items.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveItem(index, 'down')}
                              className="text-gray-400 hover:text-emerald-600 text-sm p-1"
                              title="Move down"
                            >
                              ↓
                            </button>
                          )}
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800 text-lg font-bold ml-1">×</button>
                          )}
                        </div>
                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Item {index + 1}</div>
                        <div className="mb-2">
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Description</label>
                          <RichEditor
                            value={item.description ?? ""}
                            onChange={(html) => updateItem(index, { description: html })}
                            className={inputCls}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Stock No.</label>
                            <input className={inputCls} placeholder="Stock #" value={item.stock_no ?? ""} onChange={(e) => updateItem(index, { stock_no: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit</label>
                            <input className={inputCls} placeholder="pcs" value={item.unit ?? ""} onChange={(e) => updateItem(index, { unit: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Quantity</label>
                            <input className={inputCls} placeholder="0" value={item.quantity ?? ""} onChange={(e) => updateItem(index, { quantity: e.target.value ? Number(e.target.value) : null })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit Cost</label>
                            <input className={inputCls} placeholder="0.00" value={item.unit_price ?? ""} onChange={(e) => updateItem(index, { unit_price: e.target.value ? Number(e.target.value) : null })} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Subtotal</label>
                            <input className={`${inputCls} bg-emerald-50 font-bold text-emerald-700`} value={formatMoney(getItemTotal(item))} readOnly />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-emerald-700 text-white px-4 py-3 rounded-lg flex justify-between items-center font-bold">
                <span>GRAND TOTAL</span>
                <span className="text-lg">{formatMoney(grandTotal)}</span>
              </div>

              {/* Contract checkbox */}
              <div className="mt-4 p-4 rounded-lg border border-dashed border-amber-400 bg-amber-50">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includesContract}
                    onChange={(e) => setIncludesContract(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-amber-800">
                    This PO involves a Contract for Services
                  </span>
                </label>
                {includesContract && (
                  <p className="mt-1 ml-7 text-xs text-amber-700">
                    A contract document tab will appear in the preview panel. Fill in the contract fields before saving.
                  </p>
                )}
              </div>
            </div>

            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors">
                <RiSaveLine size={18} /> {saving ? "Creating..." : "Create PO"}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadPDF({
                    poNo,
                    prNo: selectedPRNo || null,
                    createdAt: previewCreatedAt,
                    supplier,
                    address,
                    tin,
                    procurementMode,
                    deliveryPlace,
                    deliveryTerm,
                    deliveryDate,
                    paymentTerm,
                    officeSection,
                    fundCluster,
                    items,
                    textOnlyLines,
                    hideTotalRow,
                    poDate,
                    officialName,
                    officialDesig,
                    accountantName,
                    accountantDesig,
                    conformeDate,
                    currentUserFullname,
                    currentUserId,
                    prId: selectedPRId ? Number(selectedPRId) : null,
                  })
                }
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
              >
                <RiFilePdf2Line size={18} /> PDF
              </button>
            </div>
          </form>

          <div className="flex flex-[3] overflow-y-auto bg-gray-100 flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
                <div className="flex items-center gap-2">
                  {/* Tab toggle — only when contract is enabled */}
                  {includesContract && (
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setActivePreviewTab("po")}
                        className={`px-3 py-1 transition-colors ${
                          activePreviewTab === "po"
                            ? "bg-emerald-700 text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        Purchase Order
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePreviewTab("contract")}
                        className={`px-3 py-1 transition-colors ${
                          activePreviewTab === "contract"
                            ? "bg-amber-600 text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        Contract
                      </button>
                    </div>
                  )}
                  {/* Total Row toggle — only on PO tab */}
                  {activePreviewTab === "po" && (
                    <button
                      type="button"
                      onClick={() => setHideTotalRow((v) => !v)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
                        hideTotalRow
                          ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                          : "bg-gray-100 border-gray-300 text-gray-500"
                      }`}
                      title="Toggle Total row in the PO document"
                    >
                      {hideTotalRow ? "Total Row: Hidden" : "Total Row: Visible"}
                    </button>
                  )}
                  {/* Contract PDF button — only on contract tab */}
                  {activePreviewTab === "contract" && includesContract && (
                    <button
                      type="button"
                      onClick={() => printWithIframe(buildContractPrintHtml({
                        contractTitle: contractFields.contractTitle || "CONTRACT FOR SERVICES",
                        firstPartyAgency: officeSection || "DEPARTMENT OF AGRARIAN REFORM",
                        firstPartyRep: officialName,
                        firstPartyOffice: contractFields.firstPartyOffice,
                        firstPartyCity: deliveryPlace,
                        secondPartyName: supplier,
                        secondPartyRep: contractFields.secondPartyRep,
                        secondPartyCity: contractFields.secondPartyCity,
                        commencementLocation: address,
                        considerationAmount: grandTotal,
                        considerationAmountWords: contractFields.considerationAmountWords,
                        serviceDescription: contractFields.serviceDescription,
                        deliveryLocation: contractFields.deliveryLocation,
                        paymentCondition: contractFields.paymentCondition,
                        jobOrderDescription: contractFields.jobOrderDescription,
                        scheduledDays: contractFields.scheduledDays,
                        liquidatedDamagesRate: contractFields.liquidatedDamagesRate,
                        contractDate: contractFields.contractDate,
                        commencementDate: contractFields.commencementDate,
                        witnessOne: contractFields.witnessOne,
                        witnessTwo: contractFields.witnessTwo,
                      }))}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded border bg-amber-600 border-amber-600 text-white hover:bg-amber-700 transition"
                    >
                      <RiFilePdf2Line size={13} /> Contract PDF
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 text-black">
                {activePreviewTab === "contract" ? (
                  <ContractEditablePreview
                    firstPartyAgency={officeSection || "DEPARTMENT OF AGRARIAN REFORM"}
                    firstPartyRep={officialName}
                    secondPartyName={supplier}
                    considerationAmount={grandTotal}
                    commencementLocation={address}
                    fields={contractFields}
                    setFields={setContractFields}
                    onAmountWordsManualEdit={() => setAmountWordsOverridden(true)}
                  />
                ) : (
                <POEditablePreview
                  poNo={poNo}
                  prNo={selectedPRNo}
                  createdAt={previewCreatedAt}
                  setPoNo={setPoNo}
                  supplier={supplier}
                  setSupplier={setSupplier}
                  address={address}
                  setAddress={setAddress}
                  tin={tin}
                  setTin={setTin}
                  procurementMode={procurementMode}
                  setProcurementMode={setProcurementMode}
                  deliveryPlace={deliveryPlace}
                  setDeliveryPlace={setDeliveryPlace}
                  deliveryTerm={deliveryTerm}
                  setDeliveryTerm={setDeliveryTerm}
                  deliveryDate={deliveryDate}
                  setDeliveryDate={setDeliveryDate}
                  paymentTerm={paymentTerm}
                  setPaymentTerm={setPaymentTerm}
                  fundCluster={fundCluster}
                  setFundCluster={setFundCluster}
                  items={items}
                  updateItem={updateItem}
                  addItem={addItem}
                  removeItem={removeItem}
                  // text-only lines commented out
                  textOnlyLines={[]}
                  addTextOnlyLine={() => {}}
                  updateTextOnlyLine={() => {}}
                  removeTextOnlyLine={() => {}}
                  hideTotalRow={hideTotalRow}
                  poDate={poDate}
                  setPoDate={handlePoDateChange}
                  officialName={officialName}
                  setOfficialName={setOfficialName}
                  officialDesig={officialDesig}
                  setOfficialDesig={setOfficialDesig}
                  conformeDate={conformeDate}
                  setConformeDate={setConformeDate}
                  accountantName={accountantName}
                  setAccountantName={setAccountantName}
                  accountantDesig={accountantDesig}
                  setAccountantDesig={setAccountantDesig}
                />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
