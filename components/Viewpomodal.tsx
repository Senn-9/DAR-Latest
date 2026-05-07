"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RiCloseLine, RiFilePdf2Line } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { fetchPOWithItemsById, type PurchaseOrderItemRow, type PurchaseOrderRow } from "@/utils/supabase/po";

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
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "left", fontSize: "9pt", lineHeight: 1.3, whiteSpace: "pre-wrap", wordWrap: "break-word" }}>{String(item.description ?? "")}</td>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "center", fontSize: "9pt", lineHeight: 1.3 }}>{Number(item.quantity ?? 0) ? String(Number(item.quantity ?? 0)) : ""}</td>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "right", fontSize: "9pt", lineHeight: 1.3 }}>{Number(item.unit_price ?? 0) ? formatMoney(Number(item.unit_price ?? 0)).replace("₱", "") : ""}</td>
        <td style={{ border: "1px solid #111", verticalAlign: "top", padding: "4px", textAlign: "right", fontSize: "9pt", lineHeight: 1.3 }}>{total ? formatMoney(total).replace("₱", "") : ""}</td>
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
          {itemRows.length > 0 ? itemRows : (
            <tr>
              <td colSpan={6} style={{ border: "1px solid #111", padding: "16px", textAlign: "center", color: "#666", fontStyle: "italic" }}>
                No items found
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={5} style={{ border: "1px solid #111", padding: "3px 6px", fontSize: "9pt", fontWeight: "bold", textAlign: "right" }}>
              TOTAL :
            </td>
            <td style={{ border: "1px solid #111", padding: "3px 4px", fontSize: "9pt", fontWeight: "bold", textAlign: "right" }}>
              {grandTotal ? formatMoney(grandTotal).replace("₱", "") : ""}
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "2px 6px", fontSize: "9pt" }}>
              <span style={{ fontWeight: "bold" }}>(Total Amount in Words) </span>
              {amountWords}
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
          <td style="border:1px solid #111;vertical-align:top;padding:3px 4px;font-size:9pt;white-space:pre-wrap">${escapeHtml(item?.description ?? "")}</td>
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
  currentUserFullname?: string;
  currentUserId?: number | null;
}) {
  if (data.currentUserFullname) {
    postPrintRemark(data.currentUserFullname, 'PO', data.currentUserId, data.poId);
  }
  
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(buildPurchaseOrderPrintHtml(data));
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
  setTimeout(() => {
    if (printWindow.document.readyState === "complete") {
      printWindow.focus();
      printWindow.print();
    }
  }, 300);
}

export default function Viewpomodal({ visible, poId, onClose, currentUser }: ViewpomodalProps) {
  const [loading, setLoading] = useState(true);
  const [poHeader, setPoHeader] = useState<PurchaseOrderRow | null>(null);
  const [poItems, setPoItems] = useState<PurchaseOrderItemRow[]>([]);
  const [tab, setTab] = useState<"form" | "preview">("form");
  const [currentUserFullname, setCurrentUserFullname] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Load current user from localStorage
  useEffect(() => {
    if (currentUser?.fullname) {
      setCurrentUserFullname(currentUser.fullname);
    }
    if (currentUser?.id) {
      setCurrentUserId(currentUser.id);
    }
  }, [currentUser]);

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
            {/* Tab Toggle */}
            <div className="flex bg-white/20 rounded-lg overflow-hidden border border-white/30 backdrop-blur">
              <button
                onClick={() => setTab("form")}
                className={`px-5 py-2 text-sm font-semibold transition-all ${
                  tab === "form" ? "bg-white text-emerald-700" : "text-white hover:bg-white/10"
                }`}
              >
                Form
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`px-5 py-2 text-sm font-semibold transition-all ${
                  tab === "preview" ? "bg-white text-emerald-700" : "text-white hover:bg-white/10"
                }`}
              >
                Preview
              </button>
            </div>
            <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Form Side — read-only */}
          <div className={`${tab === "form" ? "flex" : "hidden"} md:flex flex-[2] flex-col overflow-hidden border-r border-gray-200`}>
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
                    <span>👁</span> This is a read-only view. No changes can be made.
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
                              <input className={readonlyCls} value={item.description || ""} readOnly tabIndex={-1} />
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

                {/* Footer — PDF only, no Save */}
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
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
                        currentUserFullname,
                        currentUserId,
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    <RiFilePdf2Line size={18} /> Download PDF
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition-colors"
                  >
                    <RiCloseLine size={18} /> Close
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Preview Side */}
          <div className={`${tab === "preview" ? "flex" : "hidden"} md:flex flex-[3] overflow-y-auto bg-gray-100 flex-col`}>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
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
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
