"use client";

import { useState, useEffect, useRef } from "react";
import {
  RiCloseLine,
  RiEyeLine,
  RiCheckLine,
  RiFilePdf2Line,
  RiFileTextLine,
  RiTruckLine,
  RiBuildingLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiRefreshLine,
} from "react-icons/ri";
import { type StatusFlag } from "../StatusFlagPicker";

// Editable input styles for live preview
const editableInputCls =
  "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] whitespace-pre-wrap break-words resize-none overflow-hidden";
const editableInputCenterCls =
  "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-center whitespace-pre-wrap break-words resize-none overflow-hidden";
const editableInputRightCls =
  "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-right whitespace-pre-wrap break-words resize-none overflow-hidden";

// Template loading function
async function loadTemplate(templateName: string): Promise<string> {
  try {
    const response = await fetch(`/documents/${templateName}-template.html`);
    if (!response.ok)
      throw new Error(`Failed to load ${templateName} template`);
    return await response.text();
  } catch (error) {
    console.error(`Error loading ${templateName} template:`, error);
    throw error;
  }
}

// Placeholder replacement function
function replacePlaceholders(template: string, data: any): string {
  let result = template;

  // Handle Handlebars-style loops for PO items
  result = result.replace(
    /{{#each po_items}}([\s\S]*?){{\/each}}/g,
    (match, templateBlock) => {
      if (!data.po_items || !Array.isArray(data.po_items)) return "";

      return data.po_items
        .map((item: any, index: number) => {
          let itemBlock = templateBlock;

          Object.keys(item).forEach((key) => {
            const value = item[key] ?? "";

            const placeholder = new RegExp(`{{${key}}}`, "g");

            itemBlock = itemBlock.replace(placeholder, value);
          });

          // Handle {{add @index value}} for positioning
          itemBlock = itemBlock.replace(
            /{{add @index (\d+(?:\.\d+)?)}}/g,
            (_match: string, value: string) => {
              return (index + parseFloat(value)).toString();
            },
          );

          return itemBlock;
        })
        .join("");
    },
  );

  // Handle Handlebars conditionals
  result = result.replace(
    /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
    (_match: string, condition: string, content: string) => {
      const value = data[condition];
      const isTruthy = value && (!Array.isArray(value) || value.length > 0);
      return isTruthy ? content : "";
    },
  );

  result = result.replace(
    /{{#unless\s+(\w+)}}([\s\S]*?){{\/unless}}/g,
    (_match: string, condition: string, content: string) => {
      const value = data[condition];
      const isFalsy = !value || (Array.isArray(value) && value.length === 0);
      return isFalsy ? content : "";
    },
  );

  // Handle nested property access like {{po_items.length}}
  result = result.replace(
    /{{([^}]+\.([^}]+))}}/g,
    (match, fullExpression, property) => {
      const parts = fullExpression.split(".");

      let value = data;

      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = value[part];
        } else {
          return match; // Return original if not found
        }
      }

      return value !== undefined && value !== null ? String(value) : "";
    },
  );

  // Handle simple placeholders
  Object.keys(data).forEach((key) => {
    if (key === "po_items") return; // Skip arrays, handled above

    let value = data[key] ?? "";

    // Format date fields
    if (key === "created_at" && value) {
      const date = new Date(value);

      if (!isNaN(date.getTime())) {
        value = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      }
    }

    const placeholder = new RegExp(`{{${key}}}`, "g");

    result = result.replace(placeholder, value);
  });

  return result;
}

// JSX-to-HTML conversion functions for PDF generation

function escapeHtml(value: string) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildIARHtml(data: any): string {
  // Use iar_po_items if available (editable PO items), otherwise fall back to po_items
  const items = data.iar_po_items || data.po_items || [];

  // Build item rows
  let itemRows = "";

  // Add regular items (from iar_po_items or po_items)
  items.forEach((item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_cost || item.unit_price || 0);
    const amount = quantity * unitPrice;

    itemRows += `
      <tr>
        <td style="border:2px solid #000; padding:4px; text-align:center; font-size:9px;">${escapeHtml(item.stock_no || "")}</td>
        <td style="border:2px solid #000; padding:4px; text-align:center; font-size:9px;">${escapeHtml(item.unit || "")}</td>
        <td style="border:2px solid #000; padding:4px 8px; font-size:9px; overflow:hidden; word-wrap:break-word; white-space:normal;">${escapeHtml(item.description || "")}</td>
        <td style="border:2px solid #000; padding:4px; text-align:center; font-size:9px;">${quantity || ""}</td>
        <td style="border:2px solid #000; padding:4px 8px 4px 4px; text-align:right; font-size:9px;">${unitPrice ? unitPrice.toFixed(2) : ""}</td>
        <td style="border:2px solid #000; padding:4px 8px 4px 4px; text-align:right; font-size:9px;">${amount ? amount.toFixed(2) : ""}</td>
      </tr>`;
  });

  // Fill empty rows to maintain minimum height
  const emptyRows = Math.max(0, 15 - items.length);
  for (let i = 0; i < emptyRows; i++) {
    itemRows += `
      <tr style="height:24px;">
        <td style="border:2px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:2px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:2px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:2px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:2px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:2px solid #000; padding:4px;">&nbsp;</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Inspection and Acceptance Report</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Times New Roman, serif; color: #000; }
    table { width: 100%; border-collapse: collapse; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <div style="width: 816px; margin: 0 auto; min-height: 1056px;">
    <!-- Appendix Header -->
    <div style="text-align: right; margin-bottom: 8px;">
      <span style="font-size: 10px; font-style: italic;">Appendix 62</span>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 14px; font-weight: 700; letter-spacing: 1px;">INSPECTION AND ACCEPTANCE REPORT</div>
    </div>

    <!-- Entity Name and Fund Cluster Row -->
    <div style="margin-bottom: 12px; font-size: 10px; display: flex; align-items: baseline;">
      <span style="font-weight: bold;">Entity Name :</span>
      <span style="flex: 1; padding: 0 8px;">DEPARTMENT OF AGRARIAN REFORM-CAM SUR I</span>
      <span style="font-weight: bold;">Fund Cluster :</span>
      <span style="padding: 0 8px;">${escapeHtml(data.fund_cluster || "")}</span>
    </div>

    <!-- Main Info Box -->
    <div style="border: 2px solid #000; margin-bottom: 0; font-size: 10px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr;">
        <!-- Left Section -->
        <div style="border-right: 2px solid #000; padding: 8px;">
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">Supplier :</span>
            <span style="margin-left: 8px;">${escapeHtml(data.supplier_name || data.supplier || "")}</span>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">PO No./Date :</span>
            <span style="margin-left: 8px;">${escapeHtml(data.po_no || "")} / ${escapeHtml(data.po_date || "")}</span>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">Requisitioning Office/Dept. :</span>
            <span style="margin-left: 8px;">${escapeHtml(data.office_section || "")}</span>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">Responsibility Center Code :</span>
            <span style="margin-left: 8px;">${escapeHtml(data.responsibility_center_code || "")}</span>
          </div>
        </div>

        <!-- Right Section -->
        <div style="padding: 8px;">
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">IAR No. :</span>
            <span style="margin-left: 8px;">${escapeHtml(data.iar_no || "")}</span>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">Date :</span>
            <span style="margin-left: 8px;">${escapeHtml(data.iar_date || "")}</span>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">Invoice No. :</span>
            <span style="margin-left: 8px;">${escapeHtml(data.invoice_no || "")}</span>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">Date :</span>
            <span style="margin-left: 8px;">${escapeHtml(data.invoice_date || "")}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div style="margin-bottom: 0;">
      <table style="border-collapse: collapse; border: 2px solid #000; font-size: 9px; width: 100%;">
        <thead>
          <tr>
            <th style="border: 2px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 80px;">
              <div style="font-style: italic;">Stock/</div>
              <div style="font-style: italic;">Property No.</div>
            </th>
            <th style="border: 2px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 50px; font-style: italic;">Unit</th>
            <th style="border: 2px solid #000; padding: 4px; text-align: center; font-weight: bold; font-style: italic;">Description</th>
            <th style="border: 2px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 70px; font-style: italic;">Quantity</th>
            <th style="border: 2px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 80px; font-style: italic;">Unit Cost</th>
            <th style="border: 2px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 90px; font-style: italic;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <!-- Inspection and Acceptance Section -->
    <div style="border: 1px solid #000; font-size: 10px;">
      <div style="display: flex; min-height: 200px;">
        <!-- Inspection Column -->
        <div style="border-right: 1px solid #000; flex: 1; height: 100%;">
          <div style="border-bottom: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-style: italic;">INSPECTION</div>
          <div style="padding: 12px; position: relative; display: flex; flex-direction: column; height: 180px;">
            <div style="margin-bottom: 12px;">
              <span style="font-weight: bold;">Date Inspected :</span>
              <span style="border-bottom: 1px solid #000; display: inline-block; margin-left: 8px; min-width: 150px;">${escapeHtml(data.inspected_at || "")}</span>
            </div>
            
            <div style="margin-bottom: 16px; display: flex; align-items: flex-start; gap: 8px;">
              <div style="border: 1px solid #000; width: 18px; height: 18px; flex-shrink: 0;">
                ${data.inspection_verified ? '<div style="text-align: center; line-height: 14px;">✓</div>' : ""}
              </div>
              <span style="font-size: 9px;">Inspected, verified and found in order as to quantity and specifications</span>
            </div>

            <div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center; padding-bottom: 12px;">
              <div style="border-bottom: 1px solid #000; margin: 0 16px 4px 16px; padding-top: 24px; padding-bottom: 0; font-weight: 700;">${escapeHtml(data.inspection_officer || "")}</div>
              <div style="font-size: 9px;">Inspection Officer/Inspection Committee</div>
            </div>
          </div>
        </div>

        <!-- Acceptance Column -->
        <div style="flex: 1; height: 100%;">
          <div style="border-bottom: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-style: italic;">ACCEPTANCE</div>
          <div style="padding: 12px; position: relative; display: flex; flex-direction: column; height: 180px;">
            <div style="margin-bottom: 12px;">
              <span style="font-weight: bold;">Date Received :</span>
              <span style="border-bottom: 1px solid #000; display: inline-block; margin-left: 8px; min-width: 150px;">${escapeHtml(data.received_at || "")}</span>
            </div>
            
            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <div style="border: 1px solid #000; width: 18px; height: 18px; flex-shrink: 0;">
                ${data.items_complete !== false ? '<div style="text-align: center; line-height: 14px;">✓</div>' : ""}
              </div>
              <span style="font-size: 9px;">Complete</span>
            </div>
            
            <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <div style="border: 1px solid #000; width: 18px; height: 18px; flex-shrink: 0;">
                ${data.items_complete === false ? '<div style="text-align: center; line-height: 14px;">✓</div>' : ""}
              </div>
              <span style="font-size: 9px;">Partial (pls. specify quantity)</span>
            </div>

            <div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center; padding-bottom: 12px;">
              <div style="border-bottom: 1px solid #000; margin: 0 16px 4px 16px; padding-top: 24px; padding-bottom: 0; font-weight: 700;">${escapeHtml(data.supply_officer || "")}</div>
              <div style="font-size: 9px;">ARPT/SUPPLY OFFICER</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildDVHtml(data: any): string {
  // Use provided accounting entries or default empty rows
  const entries =
    data.accounting_entries && data.accounting_entries.length > 0
      ? data.accounting_entries
      : [
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
        ];

  // Build accounting entry rows
  let accountingRows = "";
  entries.forEach((entry: any, i: number) => {
    accountingRows += `
      <tr style="height: 20px;">
        <td style="border-right: 1px solid #000; ${i < entries.length - 1 ? "border-bottom: 1px solid #000;" : ""} padding: 2px 4px; font-size: 9px; font-family: Times New Roman, serif;">
          ${escapeHtml(entry.account_title || "")}
        </td>
        <td style="border-right: 1px solid #000; ${i < entries.length - 1 ? "border-bottom: 1px solid #000;" : ""} padding: 2px 4px; font-size: 9px; font-family: Times New Roman, serif;">
          ${escapeHtml(entry.uacs_code || "")}
        </td>
        <td style="border-right: 1px solid #000; ${i < entries.length - 1 ? "border-bottom: 1px solid #000;" : ""} padding: 2px 4px; text-align: right; font-size: 9px; font-family: Times New Roman, serif;">
          ${escapeHtml(entry.debit || "")}
        </td>
        <td style="${i < entries.length - 1 ? "border-bottom: 1px solid #000;" : ""} padding: 2px 4px; text-align: right; font-size: 9px; font-family: Times New Roman, serif;">
          ${escapeHtml(entry.credit || "")}
        </td>
      </tr>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Disbursement Voucher</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Times New Roman, serif; color: #000; font-size: 9px; }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  <div style="width: 600px; min-height: 1056px; margin: 0 auto; padding: 16px; font-family: Times New Roman, serif; font-size: 9px; color: #000;">
    <!-- Appendix -->
    <div style="text-align: right; font-style: italic; margin-bottom: 2px;">Appendix 32</div>

    <!-- HEADER: Logo | Title | Fund Cluster/Date/DV No -->
    <table style="width: 100%; border: 1px solid #000;">
      <tbody>
        <tr>
          <td style="width: 90px; padding: 4px; vertical-align: middle;">
            <img src="/temp_pic/image_1195822096_1.jpg" alt="DAR Logo" style="width: 72px; height: 44px; object-fit: contain;" />
          </td>
          <td style="border-right: 1px solid #000; padding: 4px; vertical-align: top;">
            <div style="font-size: 12px; font-weight: bold; text-align: center; font-family: Times New Roman, serif;">DEPARTMENT OF AGRARIAN REFORM</div>
            <div style="font-size: 10px; text-align: center; margin-bottom: 4px; font-family: Times New Roman, serif;">Camarines Sur Provincial Office</div>
            <div style="font-size: 11px; font-weight: bold; text-align: center; letter-spacing: 1px; padding-top: 4px; font-family: Times New Roman, serif;">DISBURSEMENT VOUCHER</div>
          </td>
          <td style="width: 160px; padding: 0; vertical-align: top;">
            <table style="width: 100%; height: 100%;">
              <tbody>
                <tr>
                  <td style="border-bottom: 1px solid #000; padding: 3px 4px;"><b style="font-family: Times New Roman, serif;">Fund:</b> ${escapeHtml(data.fund_cluster || "")}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #000; padding: 3px 4px;"><b style="font-family: Times New Roman, serif;">Date:</b> ${escapeHtml(data.dv_date || "")}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 4px;"><b style="font-family: Times New Roman, serif;">DV No.:</b> ${escapeHtml(data.dv_no || "")}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- MODE OF PAYMENT -->
    <table style="width: 100%; border: 1px solid #000; border-top: none;">
      <tbody>
        <tr>
          <td style="width: 50px; border-right: 1px solid #000; padding: 3px 6px; vertical-align: top;"><b style="font-family: Times New Roman, serif;">Mode of<br/>payment</b></td>
          <td style="padding: 3px 6px; vertical-align: top; font-family: Times New Roman, serif;">
            <div style="display: flex; gap: 35px; margin-top: 3px;">
              <label style="display: flex; align-items: center; gap: 3px; font-size: 9px;">
                <input type="checkbox" ${data.mode_of_payment === "MDS Check" ? "checked" : ""} style="margin: 0;" /> MDS Check
              </label>
              <label style="display: flex; align-items: center; gap: 3px; font-size: 9px;">
                <input type="checkbox" ${data.mode_of_payment === "Commercial Check" ? "checked" : ""} style="margin: 0;" /> Commercial Check
              </label>
              <label style="display: flex; align-items: center; gap: 3px; font-size: 9px;">
                <input type="checkbox" ${data.mode_of_payment === "ADA" ? "checked" : ""} style="margin: 0;" /> ADA
              </label>
              <label style="display: flex; align-items: center; gap: 3px; font-size: 9px;">
                <input type="checkbox" ${data.mode_of_payment === "Others" ? "checked" : ""} style="margin: 0;" /> Others (Please specify)
              </label>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- PAYEE / TIN / ORS / ADDRESS -->
    <table style="width: 100%; border: 1px solid #000; border-top: none;">
      <tbody>
        <tr>
          <td style="width: 50px; border-right: 1px solid #000; padding: 3px 4px;"><b style="font-family: Times New Roman, serif;">Payee</b></td>
          <td style="border-right: 1px solid #000; padding: 3px 4px;">${escapeHtml(data.payee || data.supplier || "")}</td>
          <td style="width: 140px; border-right: 1px solid #000; padding: 3px 4px;"><b style="font-family: Times New Roman, serif;">Tin/Employee No.</b></td>
          <td style="width: 120px; padding: 3px 4px;"><b style="font-family: Times New Roman, serif;">ORS/BURS No.</b></td>
        </tr>
        <tr>
          <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 3px 4px;"><b style="font-family: Times New Roman, serif;">Address</b></td>
          <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 3px 4px;">${escapeHtml(data.address || "")}</td>
          <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 3px 4px;">${escapeHtml(data.payee_tin || data.tin || "")}</td>
          <td style="border-top: 1px solid #000; padding: 3px 4px;">${escapeHtml(data.ors_no || "")}</td>
        </tr>
      </tbody>
    </table>

    <!-- PARTICULARS TABLE -->
    <table style="width: 100%; border: 1px solid #000; border-top: none;">
      <thead>
        <tr>
          <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: Times New Roman, serif;">Particulars</th>
          <th style="width: 130px; border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: Times New Roman, serif;">Responsibility Center</th>
          <th style="width: 90px; border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: Times New Roman, serif;">MFO/PAP</th>
          <th style="width: 100px; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: Times New Roman, serif;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr style="height: 110px;">
          <td style="border-right: 1px solid #000; padding: 3px 4px; vertical-align: top;">${escapeHtml(data.particulars || "")}</td>
          <td style="border-right: 1px solid #000; padding: 3px 4px; vertical-align: top;">${escapeHtml(data.responsibility_center || "")}</td>
          <td style="border-right: 1px solid #000; padding: 3px 4px; vertical-align: top;">${escapeHtml(data.mfo_pap || "")}</td>
          <td style="padding: 3px 4px; vertical-align: top; text-align: right;">${escapeHtml(data.amount_due || "")}</td>
        </tr>
        <tr style="height: 10px;">
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
        <tr style="height: 10px;">
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
        <tr style="height: 10px;">
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
        <tr>
          <td colspan="3" style="border-right: 1px solid #000; border-top: 1px solid #000; text-align: right; padding: 3px 4px; font-weight: bold; font-family: Times New Roman, serif;">Amount Due</td>
          <td style="border-top: 1px solid #000; padding: 3px 4px; text-align: right;">${escapeHtml(data.amount_due || "")}</td>
        </tr>
      </tbody>
    </table>

    <!-- SECTION A -->
    <table style="width: 100%; border: 1px solid #000; border-top: none;">
      <tbody>
        <tr>
          <td style="padding: 4px 6px; font-family: Times New Roman, serif;"><b>A.</b> Certified: Expenses/Cash Advance necessary, lawful and incurred under my direct supervision.</td>
        </tr>
        <tr style="height: 36px;">
          <td>&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <!-- SECTION B: Accounting Entry -->
    <table style="width: 100%; border: 1px solid #000; border-top: none;">
      <tbody>
        <tr>
          <td colspan="4" style="border-bottom: 1px solid #000; padding: 3px 6px; font-family: Times New Roman, serif;"><b>B.</b> Accounting Entry:</td>
        </tr>
        <tr>
          <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: Times New Roman, serif;">Account Title</th>
          <th style="width: 110px; border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: Times New Roman, serif;">UACS Code</th>
          <th style="width: 80px; border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: Times New Roman, serif;">Debit</th>
          <th style="width: 80px; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: Times New Roman, serif;">Credit</th>
        </tr>
        ${accountingRows}
      </tbody>
    </table>

    <!-- SECTIONS C & D -->
    <table style="width: 100%; border: 1px solid #000; border-top: none;">
      <tbody>
        <tr>
          <td style="width: 50%; border-right: 1px solid #000; padding: 4px 6px; vertical-align: top; font-family: Times New Roman, serif;">
            <div style="font-weight: bold; margin-bottom: 4px;">C. Certified:</div>
            <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 3px;">
              <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #000; flex-shrink: 0; margin-top: 1px;"></span>
              <span>Cash available</span>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 3px;">
              <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #000; flex-shrink: 0; margin-top: 1px;"></span>
              <span>Subject to Authority to Debit Account (when applicable)</span>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 3px;">
              <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #000; flex-shrink: 0; margin-top: 1px;"></span>
              <span>Supporting documents complete and amount claimed proper</span>
            </div>
          </td>
          <td style="padding: 4px 6px; vertical-align: top; font-family: Times New Roman, serif;"><b>D. Approved for Payment</b></td>
        </tr>
      </tbody>
    </table>

    <!-- SIGNATURES -->
    <table style="width: 100%; border: 1px solid #000; border-top: none;">
      <tbody>
        <tr>
          <td style="width: 80px; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Signature</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px;">&nbsp;</td>
          <td style="width: 80px; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Signature</td>
          <td style="border-bottom: 1px solid #000; padding: 3px 4px;">&nbsp;</td>
        </tr>
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Printed Name</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; height: 28px;">&nbsp;</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Printed Name</td>
          <td style="border-bottom: 1px solid #000; padding: 3px 4px;">&nbsp;</td>
        </tr>
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Position</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Head, Accounting Unit/Authorized Representative</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Position</td>
          <td style="border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Agency Head/Authorized Representative</td>
        </tr>
        <tr>
          <td style="border-right: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Date</td>
          <td style="border-right: 1px solid #000; padding: 3px 4px;">&nbsp;</td>
          <td style="border-right: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Date</td>
          <td style="padding: 3px 4px;">&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <!-- SECTION E: Receipt of Payment -->
    <table style="width: 100%; border: 1px solid #000; border-top: none;">
      <tbody>
        <tr>
          <td colspan="4" style="border-bottom: 1px solid #000; padding: 3px 6px; font-family: Times New Roman, serif;"><b>E. Receipt of Payment</b></td>
          <td style="border-bottom: 1px solid #000; border-left: 1px solid #000; padding: 3px 6px; font-family: Times New Roman, serif;"><b>JEV No.</b></td>
        </tr>
        <tr>
          <td style="width: 90px; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Check/<br/>ADA No.</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;"><b>Date :</b></td>
          <td colspan="2" style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;"><b>Bank Name &amp; Account Number:</b></td>
          <td style="border-bottom: 1px solid #000; border-left: 1px solid #000; padding: 3px 4px;">&nbsp;</td>
        </tr>
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;">Signature</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;"><b>Date :</b></td>
          <td colspan="2" style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;"><b>Printed Name:</b></td>
          <td style="border-bottom: 1px solid #000; border-left: 1px solid #000; padding: 3px 4px; font-family: Times New Roman, serif;"><b>Date</b></td>
        </tr>
        <tr>
          <td colspan="5" style="padding: 3px 6px; font-family: Times New Roman, serif;"><b>Official Receipt No. &amp; Date/Other Documents</b></td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function buildLOAHtml(data: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Letter of Acceptance</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Times New Roman, serif; color: #000; }
  </style>
</head>
<body>
  <div style="max-width: 850px; min-height: 1100px; margin: 0 auto; padding: 64px 80px;">
    <div style="color: #000; font-family: Times New Roman, serif; font-size: 11px; line-height: 1.2; letter-spacing: 0.5px;">
      <!-- Header Section -->
      <div style="position: relative; margin-bottom: 40px;">
        <!-- DAR Logo - Absolute Position -->
        <div style="position: absolute; left: 16px; top: 0;">
          <img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" style="height: 64px; width: 64px; object-fit: contain;" />
        </div>
        <!-- Office Details - With left padding for logo -->
        <div style="text-align: center; padding-left: 64px;">
          <div style="font-size: 11px; margin-bottom: 4px; font-family: Times New Roman, serif;">
            Republic of the Philippines
          </div>
          <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; font-family: Times New Roman, serif;">
            DEPARTMENT OF AGRARIAN REFORM
          </div>
          <div style="font-size: 10px; margin-bottom: 2px; font-family: Times New Roman, serif;">
            Camarines Sur Provincial Office
          </div>
          <div style="font-size: 10px; font-family: Times New Roman, serif;">
            2/FHL BLDG., CARNATION ST., BRGY. TRIANGULO, NAGA CITY
          </div>
        </div>
      </div>

      <!-- Title -->
      <div style="text-align: center; margin-bottom: 32px; margin-top: 40px;">
        <div style="font-family: Times New Roman, serif; font-weight: 700; font-size: 14px; text-transform: uppercase;">
          LETTER OF ACCEPTANCE
        </div>
      </div>

      <!-- Date Field - Right Aligned -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
        <div style="width: 280px; text-align: center;">
          <div style="border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; text-align: center;">
            ${escapeHtml(data.accepted_at || "")}
          </div>
          <div style="font-size: 9px; margin-top: 4px;">Date</div>
        </div>
      </div>

      <!-- Acceptance Text -->
      <div style="color: #000; font-family: Times New Roman, serif;">
        <!-- Line 1 - indented -->
        <div style="height: 32px; display: flex; align-items: flex-end; padding-bottom: 4px; font-family: Times New Roman, serif;">
          <span style="padding-left: 100px; font-family: Times New Roman, serif; word-spacing: 15px;">
            I/WE hereby certify to have accepted each and every
            articles/services delivered
          </span>
        </div>

        <!-- Line 2 - "rendered by ___" -->
        <div style="height: 32px; display: flex; align-items: flex-end;">
          <span style="white-space: nowrap; padding-bottom: 4px; font-family: Times New Roman, serif; word-spacing: 8px;">
            rendered&nbsp;by&nbsp;
          </span>
          <span style="flex: 1; border-bottom: 1.5px solid #000;">
            ${escapeHtml(data.supplier_name || data.supplier || "")}
          </span>
        </div>

        <!-- Line 3 - "listed in the attached Invoice No. ___ dated" -->
        <div style="height: 32px; display: flex; align-items: flex-end;">
          <span style="white-space: nowrap; padding-bottom: 4px; font-family: Times New Roman, serif; word-spacing: 8px;">
            listed&nbsp;in&nbsp;the&nbsp;attached&nbsp;Invoice&nbsp;No.&nbsp;
          </span>
          <span style="flex: 1; border-bottom: 1.5px solid #000;">
            ${escapeHtml(data.invoice_no || "")}
          </span>
          <span style="white-space: nowrap; padding-bottom: 4px; font-family: Times New Roman, serif; word-spacing: 8px;">
            &nbsp;dated
          </span>
        </div>

        <!-- Line 4 - "___ was/were found to be in accordance with the specifications" -->
        <div style="height: 32px; display: flex; align-items: flex-end;">
          <span style="width: 180px; flex-shrink: 0; border-bottom: 1.5px solid #000;">
            ${escapeHtml(data.invoice_date || "")}
          </span>
          <span style="white-space: nowrap; padding-bottom: 4px; font-family: Times New Roman, serif; word-spacing: 8px;">
            &nbsp;was/were found to be in accordance with the
            specifications
          </span>
        </div>

        <!-- Line 5 - "stipulated under Order No./Purchase Order No. ___ dated" -->
        <div style="height: 32px; display: flex; align-items: flex-end;">
          <span style="white-space: nowrap; padding-bottom: 4px; font-family: Times New Roman, serif; word-spacing: 8px;">
            stipulated&nbsp;under&nbsp;Order&nbsp;No./Purchase&nbsp;Order&nbsp;No.&nbsp;
          </span>
          <span style="flex: 1; border-bottom: 1.5px solid #000;">
            ${escapeHtml(data.po_no || "")}
          </span>
          <span style="white-space: nowrap; padding-bottom: 4px; font-family: Times New Roman, serif; word-spacing: 8px;">
            &nbsp;dated
          </span>
        </div>

        <!-- Line 6 - standalone PO date underline -->
        <div style="height: 32px; display: flex; align-items: flex-end;">
          <span style="width: 180px; border-bottom: 1.5px solid #000;">
            ${escapeHtml(data.po_date || "")}
          </span>
        </div>
      </div>

      <!-- Signature Section - Right Aligned -->
      <div style="display: flex; justify-content: flex-end; margin-top: 100px;">
        <div style="width: 340px; text-align: center;">
          <div style="border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; font-weight: 700; font-family: Times New Roman, serif; font-size: 11px;">
            ${escapeHtml(data.accepted_by_name || "")}
          </div>
          <div style="font-size: 9px; margin-top: 4px; margin-bottom: 24px; font-family: Times New Roman, serif; word-spacing: 15px;">
            (Printed Name &amp; Signature)
          </div>

          <div style="border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; font-family: Times New Roman, serif; font-weight: 700; font-size: 11px;">
            ${escapeHtml(data.accepted_by_title || "")}
          </div>
          <div style="font-size: 9px; margin-top: 4px; margin-bottom: 4px; font-family: Times New Roman, serif; word-spacing: 15px;">
            (Official Title)
          </div>
          <div style="font-size: 9px; font-family: Times New Roman, serif; word-spacing: 15px;">
            (Head of Agency/Authorized Representative)
          </div>
        </div>
      </div>

      <!-- Form Reference - Bottom Right -->
      <div style="display: flex; justify-content: flex-end; margin-top: 40px;">
        <div style="font-size: 9px; font-weight: 700; font-family: Times New Roman, serif;">
          DAR CS1-QF-STO-016 REV 00
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function downloadPDF(html: string) {
  try {
    const printWindow = window.open("", "_blank", "height=800,width=1200");

    if (!printWindow) {
      alert("Please allow popups for this site to print the document.");

      return;
    }

    printWindow.document.write(html);

    printWindow.document.close();

    // Wait for the document to fully load before printing

    printWindow.onload = () => {
      printWindow.print();
    };

    // Fallback: try printing after a delay if onload doesn't fire

    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.error("Print failed:", e);
      }
    }, 500);
  } catch (error) {
    console.error("Error opening print window:", error);

    alert("Failed to open print window. Please check your popup settings.");
  }
}

function IAREditablePreview({
  delivery,
  iar,
  poData,
  setIar,
}: {
  delivery: any;
  iar: any;
  poData: any;
  setIar: (data: any) => void;
}) {
  const [zoomLevel, setZoomLevel] = useState(0.85);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(0.85);
  };

  const scalePercentage = Math.round(zoomLevel * 100);

  // Auto-resize handler for textareas
  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = target.scrollHeight + "px";
  };

  // Update IAR field
  const updateIarField = (field: string, value: any) => {
    setIar({ ...iar, [field]: value });
  };

  // Update IAR PO item
  const updateIarPoItem = (index: number, field: string, value: string) => {
    const updatedItems = [...(iar?.iar_po_items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setIar({ ...iar, iar_po_items: updatedItems });
  };

  // Transform poData to have the correct structure
  const transformedPoData = poData
    ? {
        ...poData,
        po_items: poData.purchase_order_items || [],
        po_date: poData.date,
      }
    : {};

  const mergedData = { ...delivery, ...transformedPoData, ...iar };
  mergedData.po_items = iar?.iar_po_items || transformedPoData.po_items;
  if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;
  if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;

  const items = mergedData.po_items || [];

  return (
    <div className="space-y-2">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Zoom Out"
          >
            <RiZoomOutLine className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Reset Zoom"
          >
            <RiRefreshLine className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Zoom In"
          >
            <RiZoomInLine className="w-4 h-4" />
          </button>
        </div>

        <span className="text-sm text-gray-600 font-medium">
          {scalePercentage}%
        </span>
      </div>

      {/* Live JSX Preview Container */}
      <div className="overflow-auto bg-white" style={{ maxHeight: "600px" }}>
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
            width: `${100 / zoomLevel}%`,
          }}
        >
          <div
            className="bg-white"
            style={{
              maxWidth: "800px",
              minHeight: "1100px",
              margin: "0 auto",
              padding: "40px 60px",
            }}
          >
            {/* Appendix Header */}
            <div className="text-right mb-2">
              <span style={{ fontSize: "10px", fontStyle: "italic" }}>
                Appendix 62
              </span>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  fontFamily: "Times New Roman, serif",
                }}
              >
                INSPECTION AND ACCEPTANCE REPORT
              </div>
            </div>

            {/* Entity Name and Fund Cluster Row */}
            <div
              className="mb-3 flex items-baseline"
              style={{ fontSize: "10px", fontFamily: "Times New Roman, serif" }}
            >
              <span className="font-semibold">Entity Name :</span>
              <span className="flex-1 px-2">
                DEPARTMENT OF AGRARIAN REFORM-CAM SUR I
              </span>
              <span className="font-semibold">Fund Cluster :</span>
              <span className="ml-2">{mergedData.fund_cluster || ""}</span>
            </div>

            {/* Main Info Box */}
            <div
              className="border-2 border-black"
              style={{ fontSize: "10px", fontFamily: "Times New Roman, serif" }}
            >
              <div className="grid grid-cols-2">
                {/* Left Section */}
                <div className="border-r-2 border-black p-2 space-y-1">
                  <div>
                    <span className="font-semibold">Supplier :</span>
                    <span className="ml-2">
                      {mergedData.supplier_name || mergedData.supplier || ""}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">PO No./Date :</span>
                    <span className="ml-2">
                      {mergedData.po_no || ""} / {mergedData.po_date || ""}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">
                      Requisitioning Office/Dept. :
                    </span>
                    <span className="ml-2">
                      {mergedData.office_section || ""}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">
                      Responsibility Center Code :
                    </span>
                    <span className="ml-2">
                      {mergedData.responsibility_center_code || ""}
                    </span>
                  </div>
                </div>

                {/* Right Section */}
                <div className="p-2 space-y-1">
                  <div>
                    <span className="font-semibold">IAR No. :</span>
                    <span className="ml-2">{mergedData.iar_no || ""}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Date :</span>
                    <span className="ml-2">{mergedData.iar_date || ""}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Invoice No. :</span>
                    <span className="ml-2">{mergedData.invoice_no || ""}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Date :</span>
                    <span className="ml-2">
                      {mergedData.invoice_date || ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <table
                className="w-full border-collapse border-2 border-black"
                style={{
                  fontSize: "9px",
                  fontFamily: "Times New Roman, serif",
                }}
              >
                <thead>
                  <tr>
                    <th
                      className="border-2 border-black p-1 text-center font-bold"
                      style={{ width: "80px" }}
                    >
                      <div style={{ fontStyle: "italic" }}>Stock/</div>
                      <div style={{ fontStyle: "italic" }}>Property No.</div>
                    </th>
                    <th
                      className="border-2 border-black p-1 text-center font-bold"
                      style={{ width: "50px", fontStyle: "italic" }}
                    >
                      Unit
                    </th>
                    <th
                      className="border-2 border-black p-1 text-center font-bold"
                      style={{ fontStyle: "italic" }}
                    >
                      Description
                    </th>
                    <th
                      className="border-2 border-black p-1 text-center font-bold"
                      style={{ width: "70px", fontStyle: "italic" }}
                    >
                      Quantity
                    </th>
                    <th
                      className="border-2 border-black p-1 text-center font-bold"
                      style={{ width: "80px", fontStyle: "italic" }}
                    >
                      Unit Cost
                    </th>
                    <th
                      className="border-2 border-black p-1 text-center font-bold"
                      style={{ width: "90px", fontStyle: "italic" }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="border-2 border-black p-1 text-center">
                        {item.stock_no || ""}
                      </td>
                      <td className="border-2 border-black p-1 text-center">
                        {item.unit || ""}
                      </td>
                      <td
                        className="border-2 border-black p-1 px-2"
                        style={{
                          overflow: "hidden",
                          wordWrap: "break-word",
                          whiteSpace: "normal",
                        }}
                      >
                        {item.description || ""}
                      </td>
                      <td className="border-2 border-black p-1 text-center">
                        {item.quantity || ""}
                      </td>
                      <td className="border-2 border-black p-1 text-right pr-2">
                        {item.unit_cost || ""}
                      </td>
                      <td className="border-2 border-black p-1 text-right pr-2">
                        {item.quantity && item.unit_cost
                          ? (
                              Number(item.quantity) * Number(item.unit_cost)
                            ).toFixed(2)
                          : ""}
                      </td>
                    </tr>
                  ))}
                  {/* Fill empty rows */}
                  {[...Array(Math.max(0, 15 - items.length))].map((_, i) => (
                    <tr key={`empty-${i}`} style={{ height: "24px" }}>
                      <td className="border-2 border-black p-1">&nbsp;</td>
                      <td className="border-2 border-black p-1">&nbsp;</td>
                      <td className="border-2 border-black p-1">&nbsp;</td>
                      <td className="border-2 border-black p-1">&nbsp;</td>
                      <td className="border-2 border-black p-1">&nbsp;</td>
                      <td className="border-2 border-black p-1">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inspection and Acceptance Section */}
            <div
              className="border border-black"
              style={{ fontSize: "10px", fontFamily: "Times New Roman, serif" }}
            >
              <div className="flex" style={{ minHeight: "200px" }}>
                {/* Inspection Column */}
                <div className="border-r border-black flex-1 h-full">
                  <div
                    className="border-b border-black p-2 text-center font-bold"
                    style={{
                      fontStyle: "italic",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    INSPECTION
                  </div>
                  <div
                    className="p-3 relative flex flex-col"
                    style={{ height: "180px" }}
                  >
                    <div className="mb-3">
                      <span className="font-semibold">Date Inspected :</span>
                      <span className="ml-2">
                        {mergedData.inspected_at || ""}
                      </span>
                    </div>

                    <div className="mb-4 flex items-start gap-2">
                      <div
                        className="border border-black"
                        style={{ width: "18px", height: "18px", flexShrink: 0 }}
                      >
                        {mergedData.inspection_verified && (
                          <div
                            className="text-center"
                            style={{ lineHeight: "14px" }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        Inspected, verified and found in order as to quantity
                        and specifications
                      </span>
                    </div>

                    <div
                      className="absolute bottom-0 left-0 right-0 text-center"
                      style={{ paddingBottom: "12px" }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontFamily: "Times New Roman, serif",
                          width: "80%",
                          margin: "0 auto",
                          fontSize: "9px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {mergedData.inspection_officer || ""}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        Inspection Officer/Inspection Committee
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acceptance Column */}
                <div className="flex-1 h-full">
                  <div
                    className="border-b border-black p-2 text-center font-bold"
                    style={{
                      fontStyle: "italic",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    ACCEPTANCE
                  </div>
                  <div
                    className="p-3 relative flex flex-col"
                    style={{ height: "180px" }}
                  >
                    <div className="mb-3">
                      <span className="font-semibold">Date Received :</span>
                      <span className="ml-2">
                        {mergedData.received_at || ""}
                      </span>
                    </div>

                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className="border border-black"
                        style={{ width: "18px", height: "18px", flexShrink: 0 }}
                      >
                        {mergedData.items_complete !== false && (
                          <div
                            className="text-center"
                            style={{ lineHeight: "14px" }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        Complete
                      </span>
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      <div
                        className="border border-black"
                        style={{ width: "18px", height: "18px", flexShrink: 0 }}
                      >
                        {mergedData.items_complete === false && (
                          <div
                            className="text-center"
                            style={{ lineHeight: "14px" }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        Partial (pls. specify quantity)
                      </span>
                    </div>

                    <div
                      className="absolute bottom-0 left-0 right-0 text-center"
                      style={{ paddingBottom: "12px" }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontFamily: "Times New Roman, serif",
                          width: "80%",
                          margin: "0 auto",
                          fontSize: "9px",
                          borderBottom: "1px solid black",
                        }}
                      >
                        {mergedData.supply_officer || ""}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        ARPT/SUPPLY OFFICER
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LOAEditablePreview({
  delivery,
  loa,
  poData,
  setLoa,
}: {
  delivery: any;
  loa: any;
  poData: any;
  setLoa: (data: any) => void;
}) {
  const [zoomLevel, setZoomLevel] = useState(0.85);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(0.85);
  };

  const scalePercentage = Math.round(zoomLevel * 100);

  // Auto-resize handler for textareas
  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = target.scrollHeight + "px";
  };

  // Update LOA field
  const updateLoaField = (field: string, value: string) => {
    setLoa({ ...loa, [field]: value });
  };

  // Transform poData to have the correct structure
  const transformedPoData = poData
    ? {
        ...poData,
        po_items: poData.purchase_order_items || [],
        po_date: poData.date,
      }
    : {};

  const mergedData = { ...delivery, ...transformedPoData, ...loa };
  mergedData.po_items = transformedPoData.po_items;
  if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;
  if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;

  const items = mergedData.po_items || [];

  return (
    <div className="space-y-2">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Zoom Out"
          >
            <RiZoomOutLine className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Reset Zoom"
          >
            <RiRefreshLine className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Zoom In"
          >
            <RiZoomInLine className="w-4 h-4" />
          </button>
        </div>

        <span className="text-sm text-gray-600 font-medium">
          {scalePercentage}%
        </span>
      </div>

      {/* Live JSX Preview Container */}
      <div className="overflow-auto bg-white" style={{ maxHeight: "600px" }}>
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
            width: `${100 / zoomLevel}%`,
          }}
        >
          <div
            className="bg-white"
            style={{
              maxWidth: "800px",
              minHeight: "1100px",
              margin: "0 auto",
              padding: "40px 60px",
            }}
          >
            <div
              className="text-black font-sans text-[11px] leading-tight tracking-tight"
              style={{ fontFamily: "Times New Roman, serif" }}
            >
              {/* Header Section */}
              <div className="relative mb-10">
                {/* DAR Logo - Absolute Position */}
                <div className="absolute left-4 top-0">
                  <img
                    src="/temp_pic/image_1195822096_1.jpg"
                    alt="DAR logo"
                    className="h-16 w-16 object-contain"
                  />
                </div>
                {/* Office Details - With left padding for logo */}
                <div className="text-center pl-16">
                  <div
                    style={{
                      fontSize: "11px",
                      marginBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Republic of the Philippines
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    DEPARTMENT OF AGRARIAN REFORM
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      marginBottom: "2px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Camarines Sur Provincial Office
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    2/FHL BLDG., CARNATION ST., BRGY. TRIANGULO, NAGA CITY
                  </div>
                </div>
              </div>

              {/* Divider */}
              {/* <div style={{ borderBottom: "2px solid #000", marginBottom: "28px" }} /> */}

              {/* Title */}
              <div className="text-center mb-8 mt-10">
                <div
                  style={{
                    fontFamily: "Times New Roman, serif",
                    fontWeight: 700,
                    fontSize: "14px",
                    marginTop: "28px",
                    textTransform: "uppercase",
                  }}
                >
                  LETTER OF ACCEPTANCE
                </div>
              </div>
              {/* Date Field - Right Aligned */}
              <div className="flex justify-end mb-8">
                <div style={{ width: "280px", textAlign: "center" }}>
                  <div
                    style={{
                      borderBottom: "1.5px solid #000",
                      minHeight: "22px",
                      paddingBottom: "2px",
                      textAlign: "center",
                      fontSize: "9px",
                    }}
                  >
                    {mergedData.accepted_at || ""}
                  </div>
                  <div style={{ fontSize: "9px", marginTop: "4px" }}>Date</div>
                </div>
              </div>

              {/* Acceptance Text */}
              <div
                className="text-black"
                style={{ fontFamily: "Times New Roman, serif" }}
              >
                {/* Line 1 - indented */}
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "flex-end",
                    paddingBottom: "4px",
                    fontFamily: "Times New Roman, serif",
                  }}
                >
                  <span
                    style={{
                      paddingLeft: "50px",
                      fontFamily: "Times New Roman, serif",
                      wordSpacing: "10px",
                    }}
                  >
                    I/WE hereby certify to have accepted each and every
                    articles/services delivered
                  </span>
                </div>

                {/* Line 2 - "rendered by ___" */}
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                      wordSpacing: "8px",
                    }}
                  >
                    rendered&nbsp;by&nbsp;
                  </span>
                  <span style={{ flex: 1, borderBottom: "1.5px solid #000" }}>
                    {mergedData.supplier_name || mergedData.supplier || ""}
                  </span>
                </div>

                {/* Line 3 - "listed in the attached Invoice No. ___ dated" */}
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                      wordSpacing: "8px",
                    }}
                  >
                    listed&nbsp;in&nbsp;the&nbsp;attached&nbsp;Invoice&nbsp;No.&nbsp;
                  </span>
                  <span style={{ flex: 1, borderBottom: "1.5px solid #000" }}>
                    {mergedData.invoice_no || ""}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                      wordSpacing: "8px",
                    }}
                  >
                    &nbsp;dated
                  </span>
                </div>

                {/* Line 4 - "___ was/were found to be in accordance with the specifications" */}
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <span
                    style={{
                      width: "180px",
                      flexShrink: 0,
                      borderBottom: "1.5px solid #000",
                      fontSize: "9px",
                      display: "inline-block",
                    }}
                  >
                    {mergedData.invoice_date || ""}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                      wordSpacing: "8px",
                    }}
                  >
                    &nbsp;was/were found to be in accordance with the
                    specifications
                  </span>
                </div>

                {/* Line 5 - "stipulated under Order No./Purchase Order No. ___ dated" */}
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                      wordSpacing: "8px",
                    }}
                  >
                    stipulated&nbsp;under&nbsp;Order&nbsp;No./Purchase&nbsp;Order&nbsp;No.&nbsp;
                  </span>
                  <span style={{ flex: 1, borderBottom: "1.5px solid #000" }}>
                    {mergedData.po_no || ""}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                      wordSpacing: "8px",
                    }}
                  >
                    &nbsp;dated
                  </span>
                </div>

                {/* Line 6 - standalone PO date underline */}
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <span
                    style={{
                      width: "180px",
                      borderBottom: "1.5px solid #000",
                      fontSize: "9px",
                      display: "inline-block",
                    }}
                  >
                    {mergedData.po_date || ""}
                  </span>
                </div>
              </div>

              {/* Signature Section - Right Aligned */}
              <div className="flex justify-end" style={{ marginTop: "100px" }}>
                <div style={{ width: "340px", textAlign: "center" }}>
                  <div
                    style={{
                      borderBottom: "1.5px solid #000",
                      minHeight: "22px",
                      paddingBottom: "2px",
                      fontWeight: 700,
                      fontFamily: "Times New Roman, serif",
                      fontSize: "11px",
                      width: "100%",
                    }}
                  >
                    {mergedData.accepted_by_name || ""}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      marginTop: "4px",
                      marginBottom: "24px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    (Printed Name &amp; Signature)
                  </div>

                  <div
                    style={{
                      borderBottom: "1.5px solid #000",
                      minHeight: "22px",
                      paddingBottom: "2px",
                      fontFamily: "Times New Roman, serif",
                      fontWeight: 700,
                      fontSize: "11px",
                      width: "100%",
                    }}
                  >
                    {mergedData.accepted_by_title || ""}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      marginTop: "4px",
                      marginBottom: "4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    (Official Title)
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    (Head of Agency/Authorized Representative)
                  </div>
                </div>
              </div>

              {/* Form Reference - Bottom Right */}
              <div className="flex justify-end" style={{ marginTop: "40px" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    fontFamily: "Times New Roman, serif",
                  }}
                >
                  DAR CS1-QF-STO-016 REV 00
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DVEditablePreview({
  delivery,
  dv,
  poData,
  setDv,
  accountingEntries,
  onUpdateAccountingEntry,
}: {
  delivery: any;
  dv: any;
  poData: any;
  setDv: (data: any) => void;
  accountingEntries?: Array<{
    account_title: string;
    uacs_code: string;
    debit: string;
    credit: string;
  }>;
  onUpdateAccountingEntry?: (
    index: number,
    field: string,
    value: string,
  ) => void;
}) {
  const [zoomLevel, setZoomLevel] = useState(0.85);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(0.85);
  };

  const scalePercentage = Math.round(zoomLevel * 100);

  const updateDvField = (field: string, value: string) => {
    setDv({ ...dv, [field]: value });
  };

  // Transform poData to have the correct structure
  const transformedPoData = poData
    ? {
        ...poData,
        po_items: poData.purchase_order_items || [],
        po_date: poData.date,
      }
    : {};

  const mergedData = { ...delivery, ...transformedPoData, ...dv };
  mergedData.po_items = transformedPoData.po_items;

  // Ensure DV-specific fields are available in mergedData
  if (!mergedData.dv_no && dv?.dv_no) mergedData.dv_no = dv.dv_no;
  if (!mergedData.dv_date && dv?.dv_date) mergedData.dv_date = dv.dv_date;

  // Use provided accounting entries or default empty rows
  const entries =
    accountingEntries && accountingEntries.length > 0
      ? accountingEntries
      : [
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
        ];

  return (
    <div className="space-y-2">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Zoom Out"
          >
            <RiZoomOutLine className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Reset Zoom"
          >
            <RiRefreshLine className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Zoom In"
          >
            <RiZoomInLine className="w-4 h-4" />
          </button>
        </div>

        <span className="text-sm text-gray-600 font-medium">
          {scalePercentage}%
        </span>
      </div>

      {/* Preview Container */}
      <div className="overflow-auto bg-white" style={{ maxHeight: "600px" }}>
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
            width: `${100 / zoomLevel}%`,
          }}
        >
          <div
            className="bg-white p-4"
            style={{
              width: "600px",
              minHeight: "1056px",
              margin: "0 auto",
              fontFamily: "Times New Roman, serif",
              fontSize: "9px",
              color: "#000",
            }}
          >
            {/* Appendix */}
            <div
              style={{
                textAlign: "right",
                fontStyle: "italic",
                marginBottom: "2px",
              }}
            >
              Appendix 32
            </div>

            {/* HEADER: Logo | Title | Fund Cluster/Date/DV No */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: "90px",
                      padding: "4px",
                      verticalAlign: "middle",
                    }}
                  >
                    <img
                      src="/temp_pic/image_1195822096_1.jpg"
                      alt="DAR Logo"
                      style={{
                        width: "72px",
                        height: "44px",
                        objectFit: "contain",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "4px",
                      verticalAlign: "top",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        textAlign: "center",
                        fontFamily: "Times New Roman, serif",
                      }}
                    >
                      DEPARTMENT OF AGRARIAN REFORM
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        textAlign: "center",
                        marginBottom: "4px",
                        fontFamily: "Times New Roman, serif",
                      }}
                    >
                      Camarines Sur Provincial Office
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "bold",
                        textAlign: "center",
                        letterSpacing: "1px",
                        paddingTop: "4px",
                        fontFamily: "Times New Roman, serif",
                      }}
                    >
                      DISBURSEMENT VOUCHER
                    </div>
                  </td>
                  <td
                    style={{ width: "160px", padding: 0, verticalAlign: "top" }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        height: "100%",
                      }}
                    >
                      <tbody>
                        <tr>
                          <td
                            style={{
                              borderBottom: "1px solid #000",
                              padding: "3px 4px",
                            }}
                          >
                            <b style={{ fontFamily: "Times New Roman, serif" }}>
                              Fund:
                            </b>{" "}
                            <input
                              type="text"
                              value={mergedData.fund_cluster || ""}
                              onChange={(e) =>
                                updateDvField("fund_cluster", e.target.value)
                              }
                              className={editableInputCls}
                              style={{
                                width: "60px",
                                fontSize: "9px",
                                fontFamily: "Times New Roman, serif",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              borderBottom: "1px solid #000",
                              padding: "3px 4px",
                            }}
                          >
                            <b style={{ fontFamily: "Times New Roman, serif" }}>
                              Date:
                            </b>{" "}
                            <input
                              type="text"
                              value={mergedData.dv_date || ""}
                              onChange={(e) =>
                                updateDvField("dv_date", e.target.value)
                              }
                              className={editableInputCls}
                              style={{
                                width: "80px",
                                fontSize: "9px",
                                fontFamily: "Times New Roman, serif",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: "3px 4px" }}>
                            <b style={{ fontFamily: "Times New Roman, serif" }}>
                              DV No.:
                            </b>{" "}
                            <input
                              type="text"
                              value={mergedData.dv_no || ""}
                              onChange={(e) =>
                                updateDvField("dv_no", e.target.value)
                              }
                              className={editableInputCls}
                              style={{
                                width: "100px",
                                fontSize: "9px",
                                fontFamily: "Times New Roman, serif",
                              }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* MODE OF PAYMENT */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
                borderTop: "none",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: "50px",
                      borderRight: "1px solid #000",
                      padding: "3px 6px",
                      verticalAlign: "top",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Mode of <br /> payment
                    </b>
                  </td>
                  <td
                    style={{
                      padding: "3px 6px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: "35px", marginTop: "3px" }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={mergedData.mode_of_payment === "MDS Check"}
                          onChange={(e) =>
                            updateDvField(
                              "mode_of_payment",
                              e.target.checked ? "MDS Check" : "",
                            )
                          }
                          style={{ margin: 0 }}
                        />
                        MDS Check
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            mergedData.mode_of_payment === "Commercial Check"
                          }
                          onChange={(e) =>
                            updateDvField(
                              "mode_of_payment",
                              e.target.checked ? "Commercial Check" : "",
                            )
                          }
                          style={{ margin: 0 }}
                        />
                        Commercial Check
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={mergedData.mode_of_payment === "ADA"}
                          onChange={(e) =>
                            updateDvField(
                              "mode_of_payment",
                              e.target.checked ? "ADA" : "",
                            )
                          }
                          style={{ margin: 0 }}
                        />
                        ADA
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "9px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={mergedData.mode_of_payment === "Others"}
                          onChange={(e) =>
                            updateDvField(
                              "mode_of_payment",
                              e.target.checked ? "Others" : "",
                            )
                          }
                          style={{ margin: 0 }}
                        />
                        Others (Please specify)
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* PAYEE / TIN / ORS / ADDRESS */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
                borderTop: "none",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: "50px",
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Payee
                    </b>
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <input
                      type="text"
                      value={
                        mergedData.payee || transformedPoData.supplier || ""
                      }
                      onChange={(e) => updateDvField("payee", e.target.value)}
                      className={editableInputCls}
                      style={{
                        width: "95%",
                        fontSize: "9px",
                        fontFamily: "Times New Roman, serif",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      width: "140px",
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Tin/Employee No.
                    </b>
                  </td>
                  <td style={{ width: "120px", padding: "3px 4px" }}>
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      ORS/BURS No.
                    </b>
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderTop: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Address
                    </b>
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderTop: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <input
                      type="text"
                      value={
                        mergedData.address || transformedPoData.address || ""
                      }
                      onChange={(e) => updateDvField("address", e.target.value)}
                      className={editableInputCls}
                      style={{ width: "95%", fontSize: "9px" }}
                    />
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderTop: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <input
                      type="text"
                      value={
                        mergedData.payee_tin || transformedPoData.tin || ""
                      }
                      onChange={(e) =>
                        updateDvField("payee_tin", e.target.value)
                      }
                      className={editableInputCls}
                      style={{
                        width: "95%",
                        fontSize: "9px",
                        fontFamily: "Times New Roman, serif",
                      }}
                      placeholder="VAT 766-956-523-000"
                    />
                  </td>
                  <td
                    style={{
                      borderTop: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <input
                      type="text"
                      value={mergedData.ors_no || ""}
                      onChange={(e) => updateDvField("ors_no", e.target.value)}
                      className={editableInputCls}
                      style={{
                        width: "95%",
                        fontSize: "9px",
                        fontFamily: "Times New Roman, serif",
                      }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* PARTICULARS TABLE */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
                borderTop: "none",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      textAlign: "center",
                      padding: "3px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Particulars
                  </th>
                  <th
                    style={{
                      width: "130px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      textAlign: "center",
                      padding: "3px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Responsibility Center
                  </th>
                  <th
                    style={{
                      width: "90px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      textAlign: "center",
                      padding: "3px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    MFO/PAP
                  </th>
                  <th
                    style={{
                      width: "100px",
                      borderBottom: "1px solid #000",
                      textAlign: "center",
                      padding: "3px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: "30px" }}>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      verticalAlign: "top",
                    }}
                  >
                    <textarea
                      value={mergedData.particulars || ""}
                      onChange={(e) =>
                        updateDvField("particulars", e.target.value)
                      }
                      className={editableInputCls}
                      style={{
                        width: "95%",
                        minHeight: "110px",
                        fontSize: "9px",
                        fontFamily: "Times New Roman, serif",
                      }}
                      rows={6}
                    />
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      verticalAlign: "top",
                    }}
                  >
                    <input
                      type="text"
                      value={mergedData.responsibility_center || ""}
                      onChange={(e) =>
                        updateDvField("responsibility_center", e.target.value)
                      }
                      className={editableInputCls}
                      style={{
                        width: "95%",
                        fontSize: "9px",
                        fontFamily: "Times New Roman, serif",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      verticalAlign: "top",
                    }}
                  >
                    <input
                      type="text"
                      value={mergedData.mfo_pap || ""}
                      onChange={(e) => updateDvField("mfo_pap", e.target.value)}
                      className={editableInputCls}
                      style={{
                        width: "95%",
                        fontSize: "9px",
                        fontFamily: "Times New Roman, serif",
                      }}
                    />
                  </td>
                  <td style={{ padding: "3px 4px", verticalAlign: "top" }}>
                    <input
                      type="text"
                      value={mergedData.amount_due || ""}
                      onChange={(e) =>
                        updateDvField("amount_due", e.target.value)
                      }
                      className={editableInputRightCls}
                      style={{
                        width: "95%",
                        fontSize: "9px",
                        fontFamily: "Times New Roman, serif",
                      }}
                    />
                  </td>
                </tr>
                {[...Array(3)].map((_, i) => (
                  <tr key={i} style={{ height: "10px" }}>
                    <td style={{ borderRight: "1px solid #000" }}>&nbsp;</td>
                    <td style={{ borderRight: "1px solid #000" }}>&nbsp;</td>
                    <td style={{ borderRight: "1px solid #000" }}>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      borderRight: "1px solid #000",
                      borderTop: "1px solid #000",
                      textAlign: "right",
                      padding: "3px 4px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Amount Due
                  </td>
                  <td
                    style={{
                      borderTop: "1px solid #000",
                      padding: "3px 4px",
                      textAlign: "right",
                    }}
                  >
                    {mergedData.amount_due || ""}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* SECTION A */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
                borderTop: "none",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "4px 6px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b>A.</b> Certified: Expenses/Cash Advance necessary, lawful
                    and incurred under my direct supervision.
                  </td>
                </tr>
                <tr style={{ height: "36px" }}>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
            </table>

            {/* SECTION B: Accounting Entry */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
                borderTop: "none",
              }}
            >
              <tbody>
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 6px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b>B.</b> Accounting Entry:
                  </td>
                </tr>
                <tr>
                  <th
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      textAlign: "center",
                      padding: "3px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Account Title
                  </th>
                  <th
                    style={{
                      width: "110px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      textAlign: "center",
                      padding: "3px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    UACS Code
                  </th>
                  <th
                    style={{
                      width: "80px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      textAlign: "center",
                      padding: "3px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Debit
                  </th>
                  <th
                    style={{
                      width: "80px",
                      borderBottom: "1px solid #000",
                      textAlign: "center",
                      padding: "3px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Credit
                  </th>
                </tr>
                {entries.map((entry, i) => (
                  <tr key={i} style={{ height: "20px" }}>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        borderBottom:
                          i < entries.length - 1 ? "1px solid #000" : "none",
                        padding: "2px 4px",
                      }}
                    >
                      {onUpdateAccountingEntry ? (
                        <input
                          type="text"
                          value={entry.account_title || ""}
                          onChange={(e) =>
                            onUpdateAccountingEntry(
                              i,
                              "account_title",
                              e.target.value,
                            )
                          }
                          className="w-full bg-transparent border-none outline-none text-[9px] px-1"
                          style={{ fontFamily: "Times New Roman, serif" }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: "9px",
                            fontFamily: "Times New Roman, serif",
                          }}
                        >
                          {entry.account_title || "\u00A0"}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        borderBottom:
                          i < entries.length - 1 ? "1px solid #000" : "none",
                        padding: "2px 4px",
                      }}
                    >
                      {onUpdateAccountingEntry ? (
                        <input
                          type="text"
                          value={entry.uacs_code || ""}
                          onChange={(e) =>
                            onUpdateAccountingEntry(
                              i,
                              "uacs_code",
                              e.target.value,
                            )
                          }
                          className="w-full bg-transparent border-none outline-none text-[9px] px-1"
                          style={{ fontFamily: "Times New Roman, serif" }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: "9px",
                            fontFamily: "Times New Roman, serif",
                          }}
                        >
                          {entry.uacs_code || "\u00A0"}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        borderBottom:
                          i < entries.length - 1 ? "1px solid #000" : "none",
                        padding: "2px 4px",
                        textAlign: "right",
                      }}
                    >
                      {onUpdateAccountingEntry ? (
                        <input
                          type="text"
                          value={entry.debit || ""}
                          onChange={(e) =>
                            onUpdateAccountingEntry(i, "debit", e.target.value)
                          }
                          className="w-full bg-transparent border-none outline-none text-[9px] px-1 text-right"
                          style={{ fontFamily: "Times New Roman, serif" }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: "9px",
                            fontFamily: "Times New Roman, serif",
                          }}
                        >
                          {entry.debit || "\u00A0"}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        borderBottom:
                          i < entries.length - 1 ? "1px solid #000" : "none",
                        padding: "2px 4px",
                        textAlign: "right",
                      }}
                    >
                      {onUpdateAccountingEntry ? (
                        <input
                          type="text"
                          value={entry.credit || ""}
                          onChange={(e) =>
                            onUpdateAccountingEntry(i, "credit", e.target.value)
                          }
                          className="w-full bg-transparent border-none outline-none text-[9px] px-1 text-right"
                          style={{ fontFamily: "Times New Roman, serif" }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: "9px",
                            fontFamily: "Times New Roman, serif",
                          }}
                        >
                          {entry.credit || "\u00A0"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* SECTIONS C & D */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
                borderTop: "none",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: "52.4%",
                      borderRight: "1px solid #000",
                      padding: "4px 5px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        marginBottom: "4px",

                        fontFamily: "Times New Roman, serif",
                      }}
                    >
                      C. Certified:
                    </div>
                    {[
                      "Cash available",
                      "Subject to Authority to Debit Account (when applicable)",
                      "Supporting documents complete and amount claimed proper",
                    ].map((item) => (
                      <div
                        key={item}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "4px",
                          marginBottom: "3px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "10px",
                            height: "10px",
                            border: "1px solid #000",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        ></span>
                        <span style={{ fontFamily: "Times New Roman, serif" }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td
                    style={{
                      padding: "5px 5px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      D. Approved for Payment
                    </b>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* SIGNATURES */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
                borderTop: "none",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: "80px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Signature
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    &nbsp;
                  </td>
                  <td
                    style={{
                      width: "91px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Signature
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Printed Name
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      height: "28px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    &nbsp;
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Printed Name
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Position
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Head, Accounting Unit/Authorized Representative
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Position
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Agency Head/Authorized Representative
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Date
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    &nbsp;
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Date
                  </td>
                  <td
                    style={{
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            </table>

            {/* SECTION E: Receipt of Payment */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #000",
                borderTop: "none",
              }}
            >
              <tbody>
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 6px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      E. Receipt of Payment
                    </b>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      borderLeft: "1px solid #000",
                      padding: "3px 6px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      JEV No.
                    </b>
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      width: "90px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Check/
                    <br />
                    ADA No.
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Date :
                    </b>
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Bank Name &amp; Account Number:
                    </b>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      borderLeft: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Signature
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Date :
                    </b>
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Printed Name:
                    </b>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      borderLeft: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>Date</b>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "3px 6px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      Official Receipt No. &amp; Date/Other Documents
                    </b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export type PaymentProcessDocType = "iar" | "loa" | "ors" | "dv";

function documentsForStatus(
  statusId: number | undefined,
): PaymentProcessDocType[] {
  switch (statusId) {
    case 29:
      return ["iar", "loa", "dv"];
    case 30:
      return ["dv", "ors"];
    case 32:
    case 33:
      return ["dv", "ors"];
    case 35:
      return ["ors", "dv"];
    case 36:
      return ["dv", "ors"];
    default:
      return [];
  }
}

function docTabLabel(tab: PaymentProcessDocType): string {
  switch (tab) {
    case "iar":
      return "IAR";
    case "loa":
      return "LOA";
    case "ors":
      return "ORS";
    case "dv":
      return "DV";
  }
}

function ChecklistRow({
  checked,
  onChange,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <label className="flex gap-3 items-start p-3 rounded-xl border border-gray-200 bg-white hover:border-emerald-300/60 cursor-pointer transition-colors">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle ? (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            {subtitle}
          </p>
        ) : null}
      </div>
    </label>
  );
}

function DeliveryContextPanel({
  active,
  poData,
}: {
  active: any;
  poData: any;
}) {
  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">
            Record
          </p>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 shrink-0">Delivery No.</dt>
              <dd className="font-mono font-semibold text-gray-900 text-right truncate">
                {active?.delivery_no ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 shrink-0">PO No.</dt>
              <dd className="font-mono font-medium text-gray-900 text-right truncate">
                {active?.po_no ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 shrink-0">Supplier</dt>
              <dd className="text-gray-900 text-right truncate">
                {active?.supplier ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 shrink-0">Section</dt>
              <dd className="text-gray-900 text-right truncate">
                {active?.office_section ?? "—"}
              </dd>
            </div>
            {poData?.total_amount != null && (
              <div className="flex justify-between gap-4 pt-2 border-t border-emerald-100">
                <dt className="text-gray-500 shrink-0">PO amount</dt>
                <dd className="font-mono font-semibold text-emerald-900">
                  ₱
                  {Number(poData.total_amount).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Supporting documents (IAR, LOA, ORS, DV) open in the preview column on
          later steps. Advance to Voucher Verification when this record is
          ready.
        </p>
      </div>
    </div>
  );
}

const PAYMENT_FLOW_STRIP: { id: number; label: string }[] = [
  { id: 29, label: "Voucher" },
  { id: 30, label: "Accounting" },
  { id: 32, label: "PARPO" },
  { id: 33, label: "Cash" },
  { id: 35, label: "Tax" },
  { id: 36, label: "Cash Release" },
  { id: 37, label: "Completed" },
];

interface ProcessPaymentModalProps {
  visible: boolean;
  active: any;
  onClose: () => void;
  onSubmit: (data: {
    dvData?: any;
    orsData?: any;
    iarData?: any;
    loaData?: any;
    notes?: string;
  }) => Promise<void>;
  statusLabel: string;
  statusFlag: StatusFlag | null;
  onSelectStatusFlag: (flag: StatusFlag | null) => void;
  onPreviewDocument: (type: PaymentProcessDocType) => void;
  voucher?: any;
  ors?: any;
  dv?: any;
  iar?: any;
  loa?: any;
  poData?: any;
}

export default function ProcessPaymentModal({
  visible,
  active,
  onClose,
  onSubmit,
  statusLabel,
  statusFlag,
  onSelectStatusFlag,
  onPreviewDocument,
  voucher: _voucherUnused,
  ors,
  dv,
  iar,
  loa,
  poData,
}: ProcessPaymentModalProps) {
  const formPaneRef = useRef<HTMLDivElement | null>(null);
  const [notes, setNotes] = useState("");
  const [previewTab, setPreviewTab] = useState<PaymentProcessDocType | null>(
    null,
  );
  const [orsData, setOrsData] = useState(ors || {});
  const [dvData, setDvData] = useState(dv || {});
  const [iarData, setIarData] = useState(iar || {});
  const [loaData, setLoaData] = useState(loa || {});

  const [iarReviewed, setIarReviewed] = useState(false);
  const [loaReviewed, setLoaReviewed] = useState(false);
  const [acctReconciled, setAcctReconciled] = useState(false);
  const [parpoPackageOk, setParpoPackageOk] = useState(false);
  const [cashRouted, setCashRouted] = useState(false);
  const [bir2307Done, setBir2307Done] = useState(false);
  const [jevDone, setJevDone] = useState(false);
  const [cashReleaseDone, setCashReleaseDone] = useState(false);

  // Accounting entries state (for Section B)
  const [accountingEntries, setAccountingEntries] = useState<
    Array<{
      account_title: string;
      uacs_code: string;
      debit: string;
      credit: string;
    }>
  >([
    { account_title: "", uacs_code: "", debit: "", credit: "" },
    { account_title: "", uacs_code: "", debit: "", credit: "" },
    { account_title: "", uacs_code: "", debit: "", credit: "" },
    { account_title: "", uacs_code: "", debit: "", credit: "" },
    { account_title: "", uacs_code: "", debit: "", credit: "" },
    { account_title: "", uacs_code: "", debit: "", credit: "" },
  ]);

  // Update accounting entry
  const updateAccountingEntry = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updatedEntries = [...accountingEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setAccountingEntries(updatedEntries);
  };

  // Add new accounting entry row
  const addAccountingEntry = () => {
    setAccountingEntries([
      ...accountingEntries,
      { account_title: "", uacs_code: "", debit: "", credit: "" },
    ]);
  };

  // Remove accounting entry row
  const removeAccountingEntry = (index: number) => {
    if (accountingEntries.length > 1) {
      setAccountingEntries(accountingEntries.filter((_, i) => i !== index));
    }
  };

  // Action label for the transition out of the current status (matches Payment page onSubmit)
  const getCurrentStepInfo = () => {
    switch (active?.status_id) {
      case 29:
        return { label: "Complete Voucher Verification", nextStatus: 30 };
      case 30:
        return { label: "Complete Accounting Review", nextStatus: 32 };
      case 32:
        return { label: "Complete PARPO Approval", nextStatus: 33 };
      case 33:
        return { label: "Complete Forward to Cash", nextStatus: 35 };
      case 35:
        return { label: "Complete Tax processing handoff", nextStatus: 36 };
      case 36:
        return { label: "Complete Cash for Release", nextStatus: 37 };
      default:
        return { label: "Complete Voucher Verification", nextStatus: 30 };
    }
  };

  const currentStepInfo = getCurrentStepInfo();

  const stepChecklistOk = (): boolean => {
    switch (active?.status_id) {
      case 29:
        return iarReviewed && loaReviewed;
      case 30:
        // Validate required DV fields for accounting review
        const dvFieldsValid =
          (dvData?.fund_cluster?.trim() || "") !== "" &&
          (dvData?.dv_date?.trim() || "") !== "" &&
          (dvData?.dv_no?.trim() || "") !== "" &&
          (dvData?.responsibility_center?.trim() || "") !== "" &&
          (dvData?.mfo_pap?.trim() || "") !== "" &&
          (dvData?.amount_due?.trim() || "") !== "" &&
          acctReconciled;
        return dvFieldsValid;
      case 32:
        return parpoPackageOk;
      case 33:
        return cashRouted;
      case 35:
        return bir2307Done && jevDone;
      case 36:
        return cashReleaseDone;
      default:
        return true;
    }
  };

  const isFormValid = stepChecklistOk() && statusFlag !== null;

  const resetStepFields = () => {
    setIarReviewed(false);
    setLoaReviewed(false);
    setAcctReconciled(false);
    setParpoPackageOk(false);
    setCashRouted(false);
    setBir2307Done(false);
    setJevDone(false);
    setCashReleaseDone(false);
    setAccountingEntries([
      { account_title: "", uacs_code: "", debit: "", credit: "" },
      { account_title: "", uacs_code: "", debit: "", credit: "" },
      { account_title: "", uacs_code: "", debit: "", credit: "" },
      { account_title: "", uacs_code: "", debit: "", credit: "" },
      { account_title: "", uacs_code: "", debit: "", credit: "" },
      { account_title: "", uacs_code: "", debit: "", credit: "" },
    ]);
  };

  useEffect(() => {
    if (visible) {
      setNotes("");
      resetStepFields();
      setOrsData(ors || {});
      setDvData(dv || {});
      setIarData(iar || {});
      setLoaData(loa || {});

      // Initialize accounting entries from dvData if available
      if (dv?.accounting_entries && Array.isArray(dv.accounting_entries)) {
        setAccountingEntries(dv.accounting_entries);
      } else {
        // Reset to default empty entries if no data
        setAccountingEntries([
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
          { account_title: "", uacs_code: "", debit: "", credit: "" },
        ]);
      }

      const tabs = documentsForStatus(active?.status_id);
      setPreviewTab(tabs[0] ?? null);
    }
  }, [visible, ors, dv, iar, loa, active?.status_id]);

  useEffect(() => {
    if (visible) {
      formPaneRef.current?.focus();
    }
  }, [visible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare updated DV data with accounting entries
    const updatedDvData = {
      ...dvData,
      // Ensure boolean fields are properly set
      mode_of_payment_mds_check: dvData?.mode_of_payment === "MDS Check" || false,
      mode_of_payment_commercial_check: dvData?.mode_of_payment === "Commercial Check" || false,
      mode_of_payment_ada: dvData?.mode_of_payment === "ADA" || false,
      mode_of_payment_others: dvData?.mode_of_payment === "Others" || false,
      certified_expenses_cash_advance: dvData?.certified_expenses_cash_advance || false,
      certified_cash_available: dvData?.certified_cash_available || false,
      certified_subject_to_authority: dvData?.certified_subject_to_authority || false,
      certified_proper: dvData?.certified_proper || false,
      accounting_entries: accountingEntries.filter(entry => 
        // Only include entries that have at least one field filled
        entry.account_title || entry.uacs_code || entry.debit || entry.credit
      ),
    };

    console.log("Submitting DV data:", updatedDvData);
    console.log("Accounting entries:", accountingEntries);

    // Pass all updated document data back to parent
    await onSubmit({
      dvData: updatedDvData,
      orsData,
      iarData,
      loaData,
      notes,
    });
    
    onClose();
  };

  const renderFormContent = () => {
    switch (active?.status_id) {
      case 29:
        return (
          <div className="space-y-3">
            <div className="space-y-2 pb-10">
              <ChecklistRow
                checked={iarReviewed}
                onChange={setIarReviewed}
                title="IAR reviewed"
                subtitle="Inspection and acceptance aligns with delivery and PO."
              />
              <ChecklistRow
                checked={loaReviewed}
                onChange={setLoaReviewed}
                title="LOA reviewed"
                subtitle="Letter of acceptance is complete and consistent with IAR/PO."
              />
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
              Voucher verification
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Use the document preview to review IAR and LOA templates, and
              ORS/DV references. Confirm each line item below matches your
              review.
            </p>

              <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
              DV 
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fund Cluster
                  </label>
                  <input
                    type="text"
                    value={dvData?.fund_cluster || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, fund_cluster: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g., 101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    DV Date
                  </label>
                  <input
                    type="text"
                    value={dvData?.dv_date || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, dv_date: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="MM/DD/YYYY"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    DV No.
                  </label>
                  <input
                    type="text"
                    value={dvData?.dv_no || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, dv_no: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g., DV-001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Responsibility Center
                  </label>
                  <input
                    type="text"
                    value={dvData?.responsibility_center || ""}
                    onChange={(e) =>
                      setDvData({
                        ...dvData,
                        responsibility_center: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g., DAR-CS I"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    MFO/PAP
                  </label>
                  <input
                    type="text"
                    value={dvData?.mfo_pap || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, mfo_pap: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g., OE-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="text"
                    value={dvData?.amount_due || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, amount_due: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g., 10,000.00"
                  />
                </div>
              </div>

              {/* Accounting Entries Section */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700">
                    Accounting Entries (Section B)
                  </label>
                  <button
                    type="button"
                    onClick={addAccountingEntry}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Row
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                          Account Title
                        </th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 w-28">
                          UACS Code
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-200 w-24">
                          Debit
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-200 w-24">
                          Credit
                        </th>
                        <th className="px-2 py-2 border-b border-gray-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountingEntries.map((entry, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={entry.account_title || ""}
                              onChange={(e) =>
                                updateAccountingEntry(
                                  index,
                                  "account_title",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                              placeholder="Account title"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={entry.uacs_code || ""}
                              onChange={(e) =>
                                updateAccountingEntry(
                                  index,
                                  "uacs_code",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                              placeholder="Code"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={entry.debit || ""}
                              onChange={(e) =>
                                updateAccountingEntry(
                                  index,
                                  "debit",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={entry.credit || ""}
                              onChange={(e) =>
                                updateAccountingEntry(
                                  index,
                                  "credit",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {accountingEntries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAccountingEntry(index)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove row"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 30:
        return (
          <div className="space-y-3">
              <ChecklistRow
                checked={acctReconciled}
                onChange={setAcctReconciled}
                title="Financial package reconciled"
                subtitle="Amounts, references, and supporting documents are consistent and compliant."
              />
            <p className="text-xs font-bold uppercase tracking-widest text-purple-800">
              Accounting review
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Reconcile ORS and DV with supporting IAR/LOA. Confirm the package
              is accurate before PARPO approval.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fund Cluster
                  </label>
                  <input
                    type="text"
                    value={dvData?.fund_cluster || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, fund_cluster: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="e.g., 101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    DV Date
                  </label>
                  <input
                    type="text"
                    value={dvData?.dv_date || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, dv_date: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="MM/DD/YYYY"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    DV No.
                  </label>
                  <input
                    type="text"
                    value={dvData?.dv_no || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, dv_no: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="e.g., DV-001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Responsibility Center
                  </label>
                  <input
                    type="text"
                    value={dvData?.responsibility_center || ""}
                    onChange={(e) =>
                      setDvData({
                        ...dvData,
                        responsibility_center: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="e.g., DAR-CS I"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    MFO/PAP
                  </label>
                  <input
                    type="text"
                    value={dvData?.mfo_pap || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, mfo_pap: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="e.g., OE-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="text"
                    value={dvData?.amount_due || ""}
                    onChange={(e) =>
                      setDvData({ ...dvData, amount_due: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="e.g., 10,000.00"
                  />
                </div>
              </div>
            

              {/* Accounting Entries Section */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700">
                    Accounting Entries (Section B)
                  </label>
                  <button
                    type="button"
                    onClick={addAccountingEntry}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    + Add Row
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                          Account Title
                        </th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 w-28">
                          UACS Code
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-200 w-24">
                          Debit
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-200 w-24">
                          Credit
                        </th>
                        <th className="px-2 py-2 border-b border-gray-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountingEntries.map((entry, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={entry.account_title || ""}
                              onChange={(e) =>
                                updateAccountingEntry(
                                  index,
                                  "account_title",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-300"
                              placeholder="Account title"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={entry.uacs_code || ""}
                              onChange={(e) =>
                                updateAccountingEntry(
                                  index,
                                  "uacs_code",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-300"
                              placeholder="Code"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={entry.debit || ""}
                              onChange={(e) =>
                                updateAccountingEntry(
                                  index,
                                  "debit",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-300"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={entry.credit || ""}
                              onChange={(e) =>
                                updateAccountingEntry(
                                  index,
                                  "credit",
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-300"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {accountingEntries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAccountingEntry(index)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove row"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 32:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-800">
              PARPO approval
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              PARPO confirms the procurement and payment package. Review DV (and
              ORS) in the preview panel.
            </p>
            <ChecklistRow
              checked={parpoPackageOk}
              onChange={setParpoPackageOk}
              title="PARPO approval confirmed"
              subtitle="Procurement sign-off is justified; file may proceed to Cash."
            />
          </div>
        );

      case 33:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-800">
              Forward to Cash
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Cash classifies payment instrument (check, LLDAP, etc.) and
              handles EMDS encoding as applicable.
            </p>
            <ChecklistRow
              checked={cashRouted}
              onChange={setCashRouted}
              title="Routed to Cash / classification logged"
              subtitle="DV and ORS handed off for  Cash processing."
            />
          </div>
        );

      case 35:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-900">
              Tax processing
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Accounting completes BIR 2307, JEV, and related entries before
              final Cash release.
            </p>
            <div className="space-y-2">
              <ChecklistRow
                checked={bir2307Done}
                onChange={setBir2307Done}
                title="BIR 2307 / withholding completed"
              />
              <ChecklistRow
                checked={jevDone}
                onChange={setJevDone}
                title="JEV prepared and linked"
              />
            </div>
          </div>
        );

      case 36:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-green-800">
              Cash for Release
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Cash office finalizes payment release after tax processing
              completion.
            </p>
            <ChecklistRow
              checked={cashReleaseDone}
              onChange={setCashReleaseDone}
              title="Payment release finalized"
              subtitle="All requirements met and payment ready for final completion."
            />
          </div>
        );

      default:
        return (
          <p className="text-sm text-gray-500">
            This status is not configured for payment processing in this modal.
          </p>
        );
    }
  };

  const renderPreviewContent = () => {
    if (active?.status_id === 28) {
      return <DeliveryContextPanel active={active} poData={poData} />;
    }

    if (!previewTab) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[240px] text-center p-8 text-gray-500 text-sm">
          <RiFileTextLine className="size-10 mb-2 opacity-40" aria-hidden />
          No document preview for this step.
        </div>
      );
    }
    switch (previewTab) {
      case "ors":
        return (
          <div className="flex flex-col h-full min-h-[240px]">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                ORS
              </p>
              <p className="text-lg font-mono font-semibold text-gray-900 mt-1">
                {orsData.ors_no || "—"}
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-gray-500">
              Open the full ORS document when your workflow provides a generated
              file. Inline voucher-style fields are not shown here.
            </div>
          </div>
        );
      case "dv":
        return (
          <DVEditablePreview
            delivery={active}
            dv={dvData || {}}
            poData={poData}
            setDv={setDvData}
            accountingEntries={accountingEntries}
            onUpdateAccountingEntry={updateAccountingEntry}
          />
        );
      case "iar":
        return (
          <IAREditablePreview
            delivery={active}
            iar={iarData || {}}
            poData={poData}
            setIar={setIarData}
          />
        );
      case "loa":
        return (
          <LOAEditablePreview
            delivery={active}
            loa={loaData || {}}
            poData={poData}
            setLoa={setLoaData}
          />
        );
      default:
        return null;
    }
  };

  if (!visible) return null;

  const docTabs = documentsForStatus(active?.status_id);
  const statusBadge =
    active?.status_id === 29
      ? "Voucher Verification"
      : active?.status_id === 30
        ? "Accounting Review"
        : active?.status_id === 32
          ? "PARPO Approval"
          : active?.status_id === 33
            ? "Forward to Cash"
            : active?.status_id === 35
              ? "Tax processing"
              : active?.status_id === 36
                ? "Cash for Release"
                : active?.status_id === 37
                  ? "Payment Completed"
                  : "Unknown";

  const canOpenFullTemplate = previewTab === "iar" || previewTab === "loa" || previewTab === "dv";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex flex-col max-h-[85vh] w-full max-w-7xl overflow-hidden rounded-xl shadow-xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b bg-emerald-700  border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide">
              {statusLabel}
            </p>
            <h1 className="text-xl font-semibold text-white mt-1">
              Process Payment
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-white">
              <span className="flex items-center gap-1">
                <RiTruckLine className="size-4" />
                {active?.delivery_no}
              </span>
              <span>·</span>
              <span className="font-mono">{active?.po_no}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
              {statusBadge}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RiCloseLine size={20} />
            </button>
          </div>
        </header>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 px-6 py-3 bg-gray-50 border-b border-gray-200">
          {PAYMENT_FLOW_STRIP.map((step) => {
            const isActive = active?.status_id === step.id;
            const isPast =
              PAYMENT_FLOW_STRIP.findIndex((s) => s.id === active?.status_id) >
              PAYMENT_FLOW_STRIP.findIndex((s) => s.id === step.id);
            return (
              <div
                key={step.id}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : isPast
                      ? "bg-white text-gray-600 border border-gray-200"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {step.label}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-auto bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Left Column - Form */}
            <div className="flex flex-col min-h-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Next Action */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Next Action
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentStepInfo.label}
                  </p>
                </div>

                {/* Form Content */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  {renderFormContent()}
                </div>

                {/* Status Flag */}
                <div
                  className={`bg-white rounded-lg border p-4 ${
                    statusFlag
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-gray-200"
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Status Flag{" "}
                    {!statusFlag && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={statusFlag ?? ""}
                    onChange={(e) =>
                      onSelectStatusFlag(
                        e.target.value === ""
                          ? null
                          : (e.target.value as StatusFlag),
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select status flag</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete_info">Incomplete info</option>
                    <option value="wrong_information">Wrong information</option>
                    <option value="needs_revision">Needs revision</option>
                    <option value="on_hold">On hold</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  {!statusFlag && (
                    <p className="mt-2 text-xs text-gray-500">
                      Required together with the step checklist.
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional remarks for this step…"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  {!isFormValid && (
                    <p className="text-xs text-amber-600 mb-3 text-center">
                      Complete the step checklist and choose a status flag to
                      enable submit.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isFormValid
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <RiCheckLine size={18} />
                    {currentStepInfo.label}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column - Document Preview */}
            <div className="flex flex-col min-h-0 bg-white rounded-lg border border-gray-200">
              {/* Document Tabs */}
              {docTabs.length > 0 && (
                <div className="flex items-center justify-between border-b border-gray-200">
                  <div className="flex">
                    {docTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPreviewTab(tab)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                          previewTab === tab
                            ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {docTabLabel(tab)}
                      </button>
                    ))}
                  </div>
                  {canOpenFullTemplate && (
                    <button
                      type="button"
                      onClick={() => {
                        if (previewTab === "dv") {
                          // Transform poData to have the correct structure
                          const transformedPoData = poData
                            ? {
                                ...poData,
                                po_items: poData.purchase_order_items || [],
                                po_date: poData.date,
                              }
                            : {};

                          const mergedData = {
                            ...active,
                            ...transformedPoData,
                            ...dvData,
                          };
                          mergedData.po_items = transformedPoData.po_items;
                          if (transformedPoData.po_no)
                            mergedData.po_no = transformedPoData.po_no;
                          if (transformedPoData.po_date)
                            mergedData.po_date = transformedPoData.po_date;

                          // Add accounting entries to merged data
                          mergedData.accounting_entries = accountingEntries;

                          const html = buildDVHtml(mergedData);
                          downloadPDF(html);
                        } else if (previewTab === "iar") {
                          // Transform poData to have the correct structure
                          const transformedPoData = poData
                            ? {
                                ...poData,
                                po_items: poData.purchase_order_items || [],
                                po_date: poData.date,
                              }
                            : {};

                          const mergedData = {
                            ...active,
                            ...transformedPoData,
                            ...iarData,
                          };
                          mergedData.po_items =
                            iarData?.iar_po_items || transformedPoData.po_items;
                          if (transformedPoData.po_no)
                            mergedData.po_no = transformedPoData.po_no;
                          if (transformedPoData.po_date)
                            mergedData.po_date = transformedPoData.po_date;

                          const html = buildIARHtml(mergedData);
                          downloadPDF(html);
                        } else if (previewTab === "loa") {
                          // Transform poData to have the correct structure
                          const transformedPoData = poData
                            ? {
                                ...poData,
                                po_items: poData.purchase_order_items || [],
                                po_date: poData.date,
                              }
                            : {};

                          const mergedData = {
                            ...active,
                            ...transformedPoData,
                            ...loaData,
                          };
                          mergedData.po_items = transformedPoData.po_items;
                          if (transformedPoData.po_no)
                            mergedData.po_no = transformedPoData.po_no;
                          if (transformedPoData.po_date)
                            mergedData.po_date = transformedPoData.po_date;

                          const html = buildLOAHtml(mergedData);
                          downloadPDF(html);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 mr-2 text-sm font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Print document"
                    >
                      <RiFilePdf2Line className="size-4" />
                      Print
                    </button>
                  )}
                </div>
              )}

              {/* Preview Content */}
              <div className="flex-1 min-h-0 overflow-auto">
                {renderPreviewContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
