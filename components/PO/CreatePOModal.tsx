"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RiAddLine, RiCloseLine, RiFilePdf2Line, RiSaveLine, RiSearchLine } from "react-icons/ri";
import type { PurchaseOrderItemRow, PurchaseOrderRow } from "@/utils/supabase/po";
import { createClient } from "@/utils/supabase/client";

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
  onCreate: (header: Partial<PurchaseOrderRow>, items: PurchaseOrderItemRow[]) => Promise<void>;
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
const editableInputCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] whitespace-pre-wrap break-words resize-none overflow-hidden";
const editableInputCenterCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-center whitespace-pre-wrap break-words resize-none overflow-hidden";
const editableInputRightCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-right whitespace-pre-wrap break-words resize-none overflow-hidden";

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

// Editable PO Preview - allows manual input directly in the preview panel
function POEditablePreview({
  poNo,
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
}: {
  poNo: string;
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
  items: PurchaseOrderItemRow[];
  updateItem: (idx: number, patch: Partial<PurchaseOrderItemRow>) => void;
  addItem: () => void;
  removeItem: (idx: number) => void;
  textOnlyLines: TextOnlyLine[];
  addTextOnlyLine: (afterIndex: number) => void;
  updateTextOnlyLine: (id: string, field: keyof Omit<TextOnlyLine, 'id' | 'position'>, value: string) => void;
  removeTextOnlyLine: (id: string) => void;
}) {
  const grandTotal = getGrandTotal(items);
  const amountWords = toWords(grandTotal);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "10pt", color: "#000", padding: 0, margin: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "right", fontSize: "11pt", fontWeight: "bold", padding: 0 }}>Appendix 61</td>
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
              Date : <span style={{ fontWeight: "normal" }}>{today}</span>
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
            return (
              <React.Fragment key={itemKey}>
                <tr>
                  <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                    <textarea value={item.stock_no ?? ""} onChange={(e) => updateItem(index, { stock_no: e.target.value })} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                    <textarea value={item.unit ?? ""} onChange={(e) => updateItem(index, { unit: e.target.value })} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "left", fontSize: "9pt" }}>
                    <textarea value={item.description ?? ""} onChange={(e) => updateItem(index, { description: e.target.value })} onInput={autoResize} className={editableInputCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                    <textarea value={item.quantity ?? 0} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                    <textarea value={item.unit_price ?? 0} onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) || 0 })} onInput={autoResize} className={editableInputRightCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt" }}>
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
                {/* Render text-only lines that belong after this item */}
                {textOnlyLines
                  .filter((line) => line.position === index + 1)
                  .map((line) => (
                    <tr key={`text-${line.id}`} style={{ backgroundColor: "#fefce8" }}>
                      <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                        <textarea value={line.stock_no} onChange={(e) => updateTextOnlyLine(line.id, 'stock_no', e.target.value)} onInput={autoResize} placeholder="Stock No." className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px", fontStyle: "italic", color: "#666" }} rows={1} />
                      </td>
                      <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                        <textarea value={line.unit} onChange={(e) => updateTextOnlyLine(line.id, 'unit', e.target.value)} onInput={autoResize} placeholder="Unit" className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px", fontStyle: "italic", color: "#666" }} rows={1} />
                      </td>
                      <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "left", fontSize: "9pt" }}>
                        <textarea value={line.description} onChange={(e) => updateTextOnlyLine(line.id, 'description', e.target.value)} onInput={autoResize} placeholder="Description" className={editableInputCls} style={{ width: "95%", minHeight: "16px", fontStyle: "italic", color: "#666" }} rows={1} />
                      </td>
                      <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                        <textarea value={line.quantity} onChange={(e) => updateTextOnlyLine(line.id, 'quantity', e.target.value)} onInput={autoResize} placeholder="Qty" className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px", fontStyle: "italic", color: "#666" }} rows={1} />
                      </td>
                      <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "2px", textAlign: "center", fontSize: "9pt" }}>
                        <textarea value={line.unit_price} onChange={(e) => updateTextOnlyLine(line.id, 'unit_price', e.target.value)} onInput={autoResize} placeholder="Unit Cost" className={editableInputRightCls} style={{ width: "95%", minHeight: "16px", fontStyle: "italic", color: "#666" }} rows={1} />
                      </td>
                      <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt" }}>
                        <button
                          type="button"
                          onClick={() => removeTextOnlyLine(line.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                          title="Remove text line"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                {/* Insert text-only line button */}
                <tr style={{ height: "auto" }}>
                  <td colSpan={6} style={{ border: "none", padding: "1px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => addTextOnlyLine(index + 1)}
                      className="text-gray-400 hover:text-emerald-600 text-[10px] italic transition-colors"
                      title="Insert text-only line after this item"
                    >
                      + insert text line
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "4px", textAlign: "center" }}>
              <button
                type="button"
                onClick={addItem}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
              >
                + Add Item
              </button>
            </td>
          </tr>

          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "2px 6px", fontSize: "9pt", fontWeight: "bold" }}>
              (Total Amount in Words)
            </td>
          </tr>

          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "0" }}>
              <div style={{ padding: "8px 10px", fontSize: "9pt", lineHeight: 1.28 }}>
                In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td style={{ border: "none", padding: "10px 8px 6px", fontSize: "9pt" }}>Conforme:</td>
                    <td style={{ border: "none", padding: "10px 8px 6px", fontSize: "9pt", textAlign: "left" }}>Very truly yours,</td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "20px 8px 2px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #111", width: "72%", margin: "0 auto" }} />
                    </td>
                    <td style={{ border: "none", padding: "20px 8px 2px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #111", width: "72%", margin: "0 auto" }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "2px 8px", textAlign: "center", fontSize: "9pt" }}>Signature over Printed Name of Supplier</td>
                    <td style={{ border: "none", padding: "2px 8px", textAlign: "center", fontSize: "9pt" }}>Signature over Printed Name of Authorized Official</td>
                  </tr>
                  <tr>
                    <td style={{ border: "none", padding: "10px 8px 2px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #111", width: "45%", margin: "0 auto" }} />
                    </td>
                    <td style={{ border: "none", padding: "10px 8px 2px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #111", width: "45%", margin: "0 auto" }} />
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
              <div style={{ fontSize: "10pt", marginBottom: "24px" }}><b>Funds Available :</b> </div>

              <div style={{ borderBottom: "1px solid #111", width: "80%", margin: "36px auto 2px" }} />
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
    </div>
  );
}

// Static PO Preview - read-only display for print
function POPreview({
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
  items: PurchaseOrderItemRow[];
  textOnlyLines?: TextOnlyLine[];
  currentUserFullname?: string;
}) {
  const grandTotal = getGrandTotal(items);
  const amountWords = toWords(grandTotal);
  const today = new Date().toISOString().slice(0, 10);

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
    return (
      <tr key={index} style={{ height: "auto" }}>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{String(item.stock_no ?? "")}</td>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{String(item.unit ?? "")}</td>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{String(item.description ?? "")}</td>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{Number(item.quantity ?? 0) ? String(Number(item.quantity ?? 0)) : ""}</td>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{Number(item.unit_price ?? 0) ? formatMoney(Number(item.unit_price ?? 0)).replace("₱", "") : ""}</td>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{total ? formatMoney(total).replace("₱", "") : ""}</td>
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
              P.O. No. : <span style={{ fontWeight: "normal" }}></span>
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
            <td colSpan={6} style={{ border: "1px solid #111", padding: "2px 6px", fontSize: "9pt", fontWeight: "bold" }}>
              (Total Amount in Words)
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "0" }}>
              <div style={{ padding: "8px 10px", fontSize: "9pt", lineHeight: 1.28 }}>
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
  textOnlyLines?: TextOnlyLine[];
}) {
  const grandTotal = getGrandTotal(data.items);
  const amountWords = toWords(grandTotal);
  const today = new Date().toISOString().slice(0, 10);
  const normalizedItems = data.items.filter(
    (item) =>
      String(item.description ?? "").trim() ||
      String(item.stock_no ?? "").trim() ||
      String(item.unit ?? "").trim() ||
      Number(item.quantity ?? 0) > 0 ||
      Number(item.unit_price ?? 0) > 0,
  );

  // Build item rows with text-only lines inserted at correct positions
  const textLines = data.textOnlyLines || [];
  let itemRows = "";
  
  for (let i = 0; i < normalizedItems.length; i++) {
    const item = normalizedItems[i];
    const qty = Number(item?.quantity ?? 0);
    const unitCost = Number(item?.unit_price ?? 0);
    const amount = item ? getItemTotal(item) : 0;
    
    // Add the item row
    itemRows += `
        <tr>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(item?.stock_no ?? "")}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(item?.unit ?? "")}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap">${escapeHtml(item?.description ?? "")}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${qty ? String(qty) : ""}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${unitCost ? formatMoney(unitCost).replace("₱", "") : ""}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${amount ? formatMoney(amount).replace("₱", "") : ""}</td>
        </tr>`;
    
    // Add any text-only lines that should appear after this item (position is 1-based)
    const linesAfterThisItem = textLines.filter(line => line.position === i + 1);
    for (const line of linesAfterThisItem) {
      // Only render if at least one field has content
      const hasContent = line.stock_no.trim() || line.unit.trim() || line.description.trim() || line.quantity.trim() || line.unit_price.trim();
      if (hasContent) {
        itemRows += `
        <tr style="background-color:#fefce8">
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(line.stock_no)}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap;text-align:center">${escapeHtml(line.unit)}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap">${escapeHtml(line.description)}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${escapeHtml(line.quantity)}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right">${escapeHtml(line.unit_price)}</td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;text-align:right"></td>
        </tr>`;
      }
    }
  }
  
  // If no items, ensure at least one empty row
  if (normalizedItems.length === 0) {
    itemRows = `
        <tr>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt"></td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt"></td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt"></td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt"></td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt"></td>
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt"></td>
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
        <td colSpan="3" style="padding:2px 4px;font-size:9pt;font-weight:bold">Date : <span style="font-weight:normal">${today}</span></td>
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
      ${itemRows || `<tr><td style="border:1px solid #111;padding:4px">&nbsp;</td><td style="border:1px solid #111;padding:4px">&nbsp;</td><td style="border:1px solid #111;padding:4px">&nbsp;</td><td style="border:1px solid #111;padding:4px">&nbsp;</td><td style="border:1px solid #111;padding:4px">&nbsp;</td><td style="border:1px solid #111;padding:4px">&nbsp;</td></tr>`}
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
            <div style="padding:8px 10px;font-size:9pt;line-height:1.28">In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.</div>
            <table style="border:none">
              <tr>
                <td style="border:none;padding:10px 8px 6px;font-size:9pt">Conforme:</td>
                <td style="border:none;padding:10px 8px 6px;font-size:9pt;text-align:left">Very truly yours,</td>
              </tr>
              <tr>
                <td style="border:none;padding:20px 8px 2px;text-align:center"><div style="border-bottom:1px solid #111;width:72%;margin:0 auto"></div></td>
                <td style="border:none;padding:20px 8px 2px;text-align:center"><div style="border-bottom:1px solid #111;width:72%;margin:0 auto"></div></td>
              </tr>
              <tr>
                <td style="border:none;padding:2px 8px;text-align:center;font-size:9pt">Signature over Printed Name of Supplier</td>
                <td style="border:none;padding:2px 8px;text-align:center;font-size:9pt">Signature over Printed Name of Authorized Official</td>
              </tr>
              <tr>
                <td style="border:none;padding:10px 8px 2px;text-align:center"><div style="border-bottom:1px solid #111;width:45%;margin:0 auto"></div></td>
                <td style="border:none;padding:10px 8px 2px;text-align:center"><div style="border-bottom:1px solid #111;width:45%;margin:0 auto"></div></td>
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
            <div style="font-size:10pt;margin-bottom:24px"><b>Funds Available :</b> </div>
            <div style="border-bottom:1px solid #111;width:80%;margin:36px auto 2px"></div>
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
  items: PurchaseOrderItemRow[];
  textOnlyLines?: TextOnlyLine[];
  currentUserFullname?: string;
  currentUserId?: number | null;
  prId?: number | null;
}) {
  // Post remark if currentUser is available
  if (data.currentUserFullname) {
    postPrintRemark(data.currentUserFullname, 'PO', data.currentUserId, data.prId);
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(buildPurchaseOrderPrintHtml(data));
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

export default function CreatePOModal({ visible, onClose, onCreate }: CreatePOModalProps) {
  const supabase = createClient();
  
  // PR Selection state
  const [availablePRs, setAvailablePRs] = useState<PurchaseRequest[]>([]);
  const [selectedPRId, setSelectedPRId] = useState<string>("");
  const [selectedPRNo, setSelectedPRNo] = useState<string>("");
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [prSearch, setPrSearch] = useState("");
  
  // PO Form state
  const [poNo, setPoNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [address, setAddress] = useState("");
  const [tin, setTin] = useState("");
  const [procurementMode, setProcurementMode] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState("");
  const [deliveryTerm, setDeliveryTerm] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("");
  const [officeSection, setOfficeSection] = useState("");
  const [fundCluster, setFundCluster] = useState("");
  const [items, setItems] = useState<PurchaseOrderItemRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Text-only lines state (for printing only - descriptive lines between items)
  const [textOnlyLines, setTextOnlyLines] = useState<TextOnlyLine[]>([]);

  // Current user for print remarks
  const [currentUserFullname, setCurrentUserFullname] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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

  // Fetch PRs with Abstract of Awards status (status_id = 33)
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
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("id, pr_no, purpose, office_section, fund_cluster, entity_name, total_cost, division_id")
        .eq("status_id", 33) // Completed (PR Phase) status
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching PRs:", error);
        return;
      }

      setAvailablePRs(data || []);
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
    setDeliveryDate("");
    setPaymentTerm("");
    setOfficeSection("");
    setSelectedDivisionId(null);
    setFundCluster("");
    setItems([]);
    setSaving(false);
  }

  function addItem() {
    setItems((s) => [...s, { stock_no: null, unit: null, description: null, quantity: 1, unit_price: 0, subtotal: 0 } as PurchaseOrderItemRow]);
  }

  function updateItem(idx: number, patch: Partial<PurchaseOrderItemRow>) {
    setItems((s) =>
      s.map((it, i) =>
        i === idx
          ? {
              ...it,
              ...patch,
              subtotal:
                Number.isFinite(Number(patch.quantity ?? it.quantity)) && Number.isFinite(Number(patch.unit_price ?? it.unit_price))
                  ? Number(patch.quantity ?? it.quantity) * Number(patch.unit_price ?? it.unit_price)
                  : it.subtotal,
            }
          : it,
      ),
    );
  }

  function removeItem(idx: number) {
    setItems((s) => s.filter((_, i) => i !== idx));
  }

  const grandTotal = getGrandTotal(items);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!supplier) return alert("Supplier is required");
    if (!poNo.trim()) return alert("PO Number is required");
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
      };
      await onCreate(header, items);
      resetForm();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create PO.");
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Floating action buttons - like livePreview.tsx */}
      <div className="absolute right-4 top-4 z-20 flex gap-2">
        <button
          type="button"
          onClick={() =>
            downloadPDF({
              poNo,
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
            })
          }
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

      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">Create Purchase Order</h2>
            <p className="text-emerald-100 text-sm mt-1">Appendix 61 · Official Government Form</p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-[2] flex-col overflow-hidden border-r border-gray-200">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
              {/* PR Selection Section */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">Select Purchase Request</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search PR number..."
                        value={prSearch}
                        onChange={(e) => setPrSearch(e.target.value)}
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fetchAvailablePRs}
                      disabled={loadingPRs}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingPRs ? "Loading..." : "Refresh"}
                    </button>
                  </div>
                  
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
                      {availablePRs
                        .filter((pr) =>
                          pr.pr_no.toLowerCase().includes(prSearch.toLowerCase()) ||
                          pr.purpose.toLowerCase().includes(prSearch.toLowerCase())
                        )
                        .map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.pr_no} - {pr.purpose.substring(0, 50)}{pr.purpose.length > 50 ? "..." : ""} (₱{pr.total_cost.toLocaleString()})
                          </option>
                        ))}
                    </select>
                    {availablePRs.length === 0 && !loadingPRs && (
                      <p className="text-xs text-gray-500 mt-1">No PRs with Abstract of Awards status available.</p>
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
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Line Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold px-3 py-1.5 border border-dashed border-emerald-300 rounded hover:bg-emerald-50 transition-colors"
                  >
                    <RiAddLine size={14} /> Add Item
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">No items yet — click "Add Item" to start</div>
                  ) : (
                    items.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-lg font-bold">×</button>
                        )}
                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Item {index + 1}</div>
                        <div className="mb-2">
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Description</label>
                          <input className={inputCls} placeholder="Item description" value={item.description ?? ""} onChange={(e) => updateItem(index, { description: e.target.value })} />
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
                            <input type="number" className={inputCls} placeholder="0" value={item.quantity ?? 0} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit Cost</label>
                            <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={item.unit_price ?? 0} onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })} />
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
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 text-black">
                <POEditablePreview
                  poNo={poNo}
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
    </div>
  );
}
