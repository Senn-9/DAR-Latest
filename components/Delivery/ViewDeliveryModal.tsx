"use client";

import { useState, useEffect, useRef } from "react";
import {
  RiCloseLine,
  RiFilePdf2Line,
  RiDeleteBinLine,
} from "react-icons/ri";
import { useRouter } from "next/navigation";
import DeleteDeliveryModal from "@/components/Delivery/DeleteDeliveryModal";
import { IARPreview } from "./IARPreview";
import { LOAPreview } from "./LOAPreview";
import DVPreview, { buildDVHtml } from "./DVPreview";

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
  const items = data.po_items || [];

  // Build item rows
  let itemRows = "";

  // Add items
  items.forEach((item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
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

  // Calculate total amount
  const totalAmount = items.reduce((sum: number, item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    return sum + (quantity * unitPrice);
  }, 0);

  // Add total amount row
  itemRows += `
    <tr>
      <td colspan="5" style="border:2px solid #000; padding:4px;">&nbsp;</td>
      <td style="border:2px solid #000; padding:4px 8px 4px 4px; text-align:right; font-size:9px; font-weight:bold;">${totalAmount.toFixed(2)}</td>
    </tr>`;

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
    body { font-family: Arial, sans-serif; color: #000; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div style="width: 816px; margin: 0 auto; min-height: 1056px; padding: 32px; background: white;">
    <!-- Appendix Header -->
    <div style="text-align: right; margin-bottom: 8px;">
      <span style="font-size: 10px; font-style: italic;">Appendix 62</span>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 14px; font-weight: 700; letter-spacing: 1px; font-family: Arial, sans-serif;">INSPECTION AND ACCEPTANCE REPORT</div>
    </div>

    <!-- Entity Name and Fund Cluster Row -->
    <div style="margin-bottom: 12px; font-size: 10px; font-family: Arial, sans-serif; display: flex; align-items: baseline;">
      <span style="font-weight: 600;">Entity Name :</span>
      <span style="flex: 1; padding: 0 8px;">DEPARTMENT OF AGRARIAN REFORM-CAM SUR I</span>
      <span style="font-weight: 600;">Fund Cluster :</span>
      <span style="padding: 0 8px;">${escapeHtml(data.fund_cluster || "")}</span>
    </div>

    <!-- Main Info Box -->
    <div style="border: 2px solid #000; margin-bottom: 0; font-size: 10px; font-family: Arial, sans-serif;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <!-- Left Section -->
          <td style="border-right: 2px solid #000; padding: 8px; width: 50%; vertical-align: top;">
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 600;">Supplier :</span>
              <span style="margin-left: 8px;">${escapeHtml(data.supplier_name || data.supplier || "")}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 600;">PO No./Date :</span>
              <span style="margin-left: 8px;">${escapeHtml(data.po_no || "")} / ${escapeHtml(data.po_date || "")}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 600;">Requisitioning Office/Dept. :</span>
              <span style="margin-left: 8px;">${escapeHtml(data.office_section || "")}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 600;">Responsibility Center Code :</span>
              <span style="margin-left: 8px;">${escapeHtml(data.responsibility_center_code || "")}</span>
            </div>
          </td>

          <!-- Right Section -->
          <td style="padding: 8px; width: 50%; vertical-align: top;">
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 600;">IAR No. :</span>
              <span style="margin-left: 8px;">${escapeHtml(data.iar_no || "")}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 600;">Date :</span>
              <span style="margin-left: 8px;">${escapeHtml(data.iar_date || "")}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 600;">Invoice No. :</span>
              <span style="margin-left: 8px;">${escapeHtml(data.invoice_no || "")}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 600;">Date :</span>
              <span style="margin-left: 8px;">${escapeHtml(data.invoice_date || "")}</span>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Items Table -->
    <div>
      <table style="border-collapse: collapse; border: 2px solid #000; font-size: 9px; width: 100%; font-family: Arial, sans-serif;">
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
    <div style="border: 1px solid #000; font-size: 10px; font-family: Arial, sans-serif;">
      <table style="width: 100%; border-collapse: collapse; min-height: 200px;">
        <tr>
          <!-- Inspection Column -->
          <td style="border-right: 1px solid #000; width: 50%; vertical-align: top;">
            <div style="border-bottom: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-style: italic; font-family: Arial, sans-serif;">INSPECTION</div>
            <div style="padding: 12px; position: relative; height: 180px;">
              <div style="margin-bottom: 12px;">
                <span style="font-weight: 600;">Date Inspected :</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; margin-left: 8px; min-width: 150px;">${escapeHtml(data.inspected_at || "")}</span>
              </div>
              
              <div style="margin-bottom: 16px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 18px; vertical-align: top; padding: 0;">
                      <div style="border: 1px solid #000; width: 18px; height: 18px; text-align: center; line-height: 14px;">
                        ${data.inspection_verified ? "✓" : ""}
                      </div>
                    </td>
                    <td style="padding-left: 8px; vertical-align: top;">
                      <span style="font-size: 9px; font-family: Arial, sans-serif;">Inspected, verified and found in order as to quantity and specifications</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="position: absolute; bottom: 12px; left: 16px; right: 16px; text-align: center;">
                <div style="border-bottom: 1px solid #000; padding-top: 24px; padding-bottom: 0; font-weight: 700; font-family: Arial, sans-serif;">${escapeHtml(data.inspection_officer || "")}</div>
                <div style="font-size: 9px; margin-top: 4px; font-family: Arial, sans-serif;">Inspection Officer/Inspection Committee</div>
              </div>
            </div>
          </td>

          <!-- Acceptance Column -->
          <td style="width: 50%; vertical-align: top;">
            <div style="border-bottom: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-style: italic; font-family: Arial, sans-serif;">ACCEPTANCE</div>
            <div style="padding: 12px; position: relative; height: 180px;">
              <div style="margin-bottom: 12px;">
                <span style="font-weight: 600;">Date Received :</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; margin-left: 8px; min-width: 150px;">${escapeHtml(data.received_at || "")}</span>
              </div>
              
              <div style="margin-bottom: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 18px; vertical-align: middle; padding: 0;">
                      <div style="border: 1px solid #000; width: 18px; height: 18px; text-align: center; line-height: 14px;">
                        ${data.items_complete !== false ? "✓" : ""}
                      </div>
                    </td>
                    <td style="padding-left: 8px; vertical-align: middle;">
                      <span style="font-size: 9px; font-family: Arial, sans-serif;">Complete</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <div style="margin-bottom: 16px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 18px; vertical-align: middle; padding: 0;">
                      <div style="border: 1px solid #000; width: 18px; height: 18px; text-align: center; line-height: 14px;">
                        ${data.items_complete === false ? "✓" : ""}
                      </div>
                    </td>
                    <td style="padding-left: 8px; vertical-align: middle;">
                      <span style="font-size: 9px; font-family: Arial, sans-serif;">Partial (pls. specify quantity)</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="position: absolute; bottom: 12px; left: 16px; right: 16px; text-align: center;">
                <div style="border-bottom: 1px solid #000; padding-top: 24px; padding-bottom: 0; font-weight: 700; font-family: Arial, sans-serif;">${escapeHtml(data.supply_officer || "")}</div>
                <div style="font-size: 9px; margin-top: 4px; font-family: Arial, sans-serif;">ARPT/SUPPLY OFFICER</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function buildLOAHtml(data: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Letter of Acceptance</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #000; }
    .underline { border-bottom: 1.5px solid #000; display: inline-block; min-width: 180px; }
  </style>
</head>
<body>
  <div style="max-width: 850px; min-height: 1100px; margin: 0 auto; padding: 64px 80px;">
    <!-- Header Section -->
    <div style="position: relative; margin-bottom: 40px;">
      <!-- DAR Logo - Absolute Position -->
      <div style="position: absolute; left: 16px; top: 0;">
        <img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" style="height: 64px; width: 64px; object-fit: contain;" />
      </div>
      
      <!-- Office Details - With left padding for logo -->
      <div style="text-align: center; padding-left: 64px;">
        <div style="font-size: 11px; margin-bottom: 4px; font-family: Arial, sans-serif;">Republic of the Philippines</div>
        <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; font-family: Arial, sans-serif;">DEPARTMENT OF AGRARIAN REFORM</div>
        <div style="font-size: 10px; margin-bottom: 2px; font-family: Arial, sans-serif;">Camarines Sur Provincial Office</div>
        <div style="font-size: 10px; font-family: Arial, sans-serif;">2/FHL BLDG., CARNATION ST., BRGY. TRIANGULO, NAGA CITY</div>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin-bottom: 32px; margin-top: 28px;">
      <div style="font-family: Arial, sans-serif; font-weight: 700; font-size: 14px; text-transform: uppercase;">LETTER OF ACCEPTANCE</div>
    </div>

    <!-- Date Field - Right Aligned -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
      <div style="width: 150px; text-align: center;">
        <div style="border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; text-align: center;">${escapeHtml(data.accepted_at || "")}</div>
        <div style="font-size: 9px; margin-top: 4px;">Date</div>
      </div>
    </div>

    <!-- Acceptance Text -->
    <div style="font-family: Arial, sans-serif; font-size: 11px; line-height: 32px;">
      <!-- Line 1 - indented -->
      <div style="padding-left: 50px; word-spacing: 8px;">
        I/WE hereby certify to have accepted each and every articles/services delivered
      </div>

      <!-- Line 2 - "rendered by ___" -->
      <div style="display: flex; align-items: flex-end;">
        <span style="white-space: nowrap; word-spacing: 8px;">rendered&nbsp;by&nbsp;</span>
        <span style="flex: 1; border-bottom: 1.5px solid #000;">${escapeHtml(data.supplier_name || data.supplier || "")}</span>
      </div>

      <!-- Line 3 - "listed in the attached Invoice No. ___ dated" -->
      <div style="display: flex; align-items: flex-end;">
        <span style="white-space: nowrap; word-spacing: 8px;">listed&nbsp;in&nbsp;the&nbsp;attached&nbsp;Invoice&nbsp;No.&nbsp;</span>
        <span style="flex: 1; border-bottom: 1.5px solid #000;">${escapeHtml(data.invoice_no || "")}</span>
        <span style="white-space: nowrap; word-spacing: 8px;">&nbsp;dated</span>
      </div>

      <!-- Line 4 - "___ was/were found to be in accordance with the specifications" -->
      <div style="display: flex; align-items: flex-end;">
        <span style="width: 180px; flex-shrink: 0; border-bottom: 1.5px solid #000;">${escapeHtml(data.invoice_date || "")}</span>
        <span style="white-space: nowrap; word-spacing: 8px;">&nbsp;was/were found to be in accordance with the specifications</span>
      </div>

      <!-- Line 5 - "stipulated under Order No./Purchase Order No. ___ dated" -->
      <div style="display: flex; align-items: flex-end;">
        <span style="white-space: nowrap; word-spacing: 8px;">stipulated&nbsp;under&nbsp;Order&nbsp;No./Purchase&nbsp;Order&nbsp;No.&nbsp;</span>
        <span style="flex: 1; border-bottom: 1.5px solid #000;">${escapeHtml(data.po_no || "")}</span>
        <span style="white-space: nowrap; word-spacing: 8px;">&nbsp;dated</span>
      </div>

      <!-- Line 6 - standalone PO date underline -->
      <div>
        <span style="width: 180px; display: inline-block; border-bottom: 1.5px solid #000;">${escapeHtml(data.po_date || "")}</span>
      </div>
    </div>

    <!-- Signature Section - Right Aligned -->
    <div style="display: flex; justify-content: flex-end; margin-top: 100px;">
      <div style="width: 200px; text-align: center;">
        <div style="border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; font-weight: 700; font-family: Arial, sans-serif; font-size: 11px;">${escapeHtml(data.accepted_by_name || "")}</div>
        <div style="font-size: 9px; margin-top: 4px; margin-bottom: 24px; font-family: Arial, sans-serif; word-spacing: 15px;">(Printed Name &amp; Signature)</div>

        <div style="border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; font-family: Arial, sans-serif; font-weight: 700; font-size: 11px;">${escapeHtml(data.accepted_by_title || "")}</div>
        <div style="font-size: 9px; margin-top: 4px; margin-bottom: 4px; font-family: Arial, sans-serif; word-spacing: 15px;">(Official Title)</div>
        <div style="font-size: 9px; font-family: Arial, sans-serif; word-spacing: 15px;">(Head of Agency/Authorized Representative)</div>
      </div>
    </div>

    <!-- Form Reference - Bottom Right -->
    <div style="display: flex; justify-content: flex-end; margin-top: 40px;">
      <div style="font-size: 9px; font-weight: 700; font-family: Arial, sans-serif;">DAR CS1-QF-STO-016 REV 00</div>
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

    // Use setTimeout as the primary method since onload won't fire after document.write
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.error("Print failed:", e);
        alert("Failed to print. Please check your browser settings.");
      }
    }, 250);
  } catch (error) {
    console.error("Error opening print window:", error);
    alert("Failed to open print window. Please check your popup settings.");
  }
}

interface ViewDeliveryModalProps {
  visible: boolean;
  onClose: () => void;
  delivery: any;
  iar: any;
  loa: any;
  dv?: any;
  poData: any;
  defaultTab?: "iar" | "loa" | "dv";
}

// Read-only input style
const readonlyCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";

// JSX Preview Components - based on templates

// JSX-to-HTML conversion functions for PDF generation

export default function ViewDeliveryModal({
  visible,
  onClose,
  delivery,
  iar,
  loa,
  dv,
  poData,
  defaultTab = "iar",
}: ViewDeliveryModalProps) {
  const [tab, setTab] = useState<"iar" | "loa" | "dv">(defaultTab);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentHtml, setCurrentHtml] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");

    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  // Handle PDF printing
  const handlePrintPDF = (
    currentTab: "iar" | "loa" | "dv",
    deliveryData: any,
    iarData: any,
    loaData: any,
    dvData: any,
    poDataParam: any,
  ) => {
    const transformedPoData = poDataParam
      ? {
          ...poDataParam,
          po_items: poDataParam.purchase_order_items || [],
          po_date: poDataParam.date,
        }
      : {};
    const mergedData = { ...deliveryData, ...transformedPoData };

    if (currentTab === "iar") {
      const iarMerged = { ...mergedData, ...(iarData || {}) };
      iarMerged.po_items = mergedData.po_items;
      if (mergedData.po_no) iarMerged.po_no = mergedData.po_no;
      if (mergedData.po_date) iarMerged.po_date = mergedData.po_date;
      if (iarData?.iar_po_items) {
        iarMerged.iar_po_items = iarData.iar_po_items;
      }
      const html = buildIARHtml(iarMerged);
      downloadPDF(html);
    } else if (currentTab === "loa") {
      const loaMerged = { ...mergedData, ...(loaData || {}) };
      loaMerged.po_items = mergedData.po_items;
      if (mergedData.po_no) loaMerged.po_no = mergedData.po_no;
      // PO date should not be copied to LOA - keep it blank
      const html = buildLOAHtml(loaMerged);
      downloadPDF(html);
    } else if (currentTab === "dv") {
      const dvMerged = { ...mergedData, ...(dvData || {}) };
      // Ensure DV-specific fields are available
      if (!dvMerged.dv_no && dvData?.dv_no) dvMerged.dv_no = dvData.dv_no;
      if (!dvMerged.payee && dvData?.payee) dvMerged.payee = dvData.payee;
      if (!dvMerged.address && dvData?.address) dvMerged.address = dvData.address;
      if (!dvMerged.payee_tin && dvData?.payee_tin) dvMerged.payee_tin = dvData.payee_tin;
      if (!dvMerged.ors_no && dvData?.ors_no) dvMerged.ors_no = dvData.ors_no;
      if (!dvMerged.fund_cluster && dvData?.fund_cluster) dvMerged.fund_cluster = dvData.fund_cluster;
      if (!dvMerged.responsibility_center && dvData?.responsibility_center) dvMerged.responsibility_center = dvData.responsibility_center;
      if (!dvMerged.mfo_pap && dvData?.mfo_pap) dvMerged.mfo_pap = dvData.mfo_pap;
      if (!dvMerged.amount_due && dvData?.amount_due) dvMerged.amount_due = dvData.amount_due;
      if (!dvMerged.mode_of_payment && dvData?.mode_of_payment) dvMerged.mode_of_payment = dvData.mode_of_payment;
      if (!dvMerged.particulars && dvData?.particulars) dvMerged.particulars = dvData.particulars;
      const html = buildDVHtml(dvMerged);
      downloadPDF(html);
    }
  };

  // Debug logging for received props

  useEffect(() => {
    if (visible) {
      console.log("=== VIEW DELIVERY MODAL PROPS ===");

      console.log("Delivery:", delivery);

      console.log("IAR data:", iar);

      console.log("LOA data:", loa);

      console.log("PO data:", poData);

      console.log("Default tab:", defaultTab);

      console.log("Current tab:", tab);
    }
  }, [visible, delivery, iar, loa, poData, defaultTab, tab]);

  // Update tab when defaultTab changes

  useEffect(() => {
    if (visible) {
      setTab(defaultTab);
    }
  }, [visible, defaultTab]);

  // Load HTML template when tab or data changes

  useEffect(() => {
    if (!visible) return;

    console.log("=== LOADING HTML FOR VIEW MODAL ===");

    console.log("Current tab:", tab);

    console.log("IAR exists:", !!iar, iar);

    console.log("LOA exists:", !!loa, loa);

    const loadHtml = async () => {
      try {
        let html: string | null = null;

        // Transform poData to have the correct structure for templates

        const transformedPoData = poData
          ? {
              ...poData,

              po_items: poData.purchase_order_items || [],

              po_date: poData.date, // Map PO date to template's po_date placeholder
            }
          : {};

        const mergedData = { ...delivery, ...transformedPoData };

        if (tab === "iar" && iar) {
          console.log("IAR preview uses live JSX renderer.");

          const iarData = { ...mergedData, ...iar };

          // Explicitly preserve PO fields from mergedData

          iarData.po_items = mergedData.po_items;

          if (mergedData.po_no) iarData.po_no = mergedData.po_no;

          if (mergedData.po_date) iarData.po_date = mergedData.po_date;

          html = null;

          console.log("Skipped IAR HTML template generation.");
        } else if (tab === "loa" && loa) {
          console.log("Building LOA HTML...");

          const loaData = { ...mergedData, ...loa };

          // Explicitly preserve PO fields from mergedData

          loaData.po_items = mergedData.po_items;

          if (mergedData.po_no) loaData.po_no = mergedData.po_no;

          // PO date should not be copied to LOA - keep it blank

          html = await buildLOAHtml(loaData);

          console.log("LOA HTML generated successfully");
        } else {
          console.log("No data available for tab:", tab, {
            hasIar: !!iar,

            hasLoa: !!loa,
          });
        }

        console.log("Final HTML:", html ? "Generated" : "Not generated");

        setCurrentHtml(html);
      } catch (error) {
        console.error("Error loading document HTML:", error);

        setCurrentHtml(null);
      }
    };

    loadHtml();
  }, [visible, tab, delivery, iar, loa, poData]);

  // Lock body scroll while open

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!visible) return null;

  // Get the current document data and HTML

  const getCurrentDoc = () => {
    switch (tab) {
      case "iar":
        return {
          data: iar,
          html: currentHtml,
          label: "Inspection & Acceptance Report",
          component: (
            <IARPreview
              delivery={delivery}
              iar={iar || {}}
              poData={poData || {}}
            />
          ),
        };

      case "loa":
        return {
          data: loa,
          html: currentHtml,
          label: "Letter of Acceptance",
          component: (
            <LOAPreview
              delivery={delivery}
              loa={loa || {}}
              poData={poData || {}}
            />
          ),
        };

      case "dv":
        return {
          data: {},
          html: null,
          label: "Disbursement Voucher",
          component: <DVPreview delivery={delivery} dv={dv} poData={poData || {}} />,
        };
    }
  };

  const currentDoc = getCurrentDoc();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* ── HEADER ── */}

        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">Delivery Documents</h2>

            <p className="text-emerald-100 text-sm mt-1">
              {delivery?.delivery_no ?? "—"} · PO {delivery?.po_no ?? "—"}
            </p>
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

            <button
              onClick={onClose}
              className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors"
            >
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}

        <div className="flex flex-1 overflow-hidden">
          {/* Form Side — read-only */}

          <div className="flex-[2] flex flex-col overflow-hidden border-r border-gray-200">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
              {/* View-only notice */}

              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
                <span>👁</span> This is a read-only view. No changes can be
                made.
              </div>

              {/* Delivery Info */}

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
                  Delivery Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                      Delivery No.
                    </label>

                    <input
                      className={readonlyCls}
                      value={delivery?.delivery_no ?? ""}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                      PO Number
                    </label>

                    <input
                      className={readonlyCls}
                      value={delivery?.po_no ?? ""}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                      Supplier
                    </label>

                    <input
                      className={readonlyCls}
                      value={delivery?.supplier ?? ""}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                      Office/Section
                    </label>

                    <input
                      className={readonlyCls}
                      value={delivery?.office_section ?? ""}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                      DR No.
                    </label>

                    <input
                      className={readonlyCls}
                      value={delivery?.dr_no ?? ""}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                      Created At
                    </label>

                    <input
                      className={readonlyCls}
                      value={
                        delivery?.created_at
                          ? new Date(delivery.created_at).toLocaleDateString(
                              "en-PH",
                            )
                          : ""
                      }
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                </div>

                {delivery?.notes && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                      Notes
                    </label>

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
                  {tab === "iar"
                    ? "Inspection & Acceptance Report"
                    : tab === "loa"
                      ? "Letter of Acceptance"
                      : "Disbursement Voucher"}{" "}
                  Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {tab === "iar" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          IAR No.
                        </label>

                        <input
                          className={readonlyCls}
                          value={iar?.iar_no ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Invoice No.
                        </label>

                        <input
                          className={readonlyCls}
                          value={iar?.invoice_no ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Invoice Date
                        </label>

                        <input
                          className={readonlyCls}
                          value={iar?.invoice_date ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Date Inspected
                        </label>

                        <input
                          className={readonlyCls}
                          value={iar?.inspected_at ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Date Received
                        </label>

                        <input
                          className={readonlyCls}
                          value={iar?.received_at ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Requisitioning Office
                        </label>

                        <input
                          className={readonlyCls}
                          value={iar?.requisitioning_office ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Responsibility Center
                        </label>

                        <input
                          className={readonlyCls}
                          value={iar?.responsibility_center ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      {/* Inspection Confirmation Display */}

                      <div className="col-span-2">
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Inspection Confirmation
                        </label>

                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center text-xs font-bold ${iar?.items_complete ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                              >
                                {iar?.items_complete ? "✓" : "✗"}
                              </span>

                              <span className="text-gray-700">
                                {iar?.items_complete
                                  ? "Complete Delivery"
                                  : "Partial Delivery"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Officer Signatures Display */}

                      <div className="col-span-2">
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Officer Signatures
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-gray-600 mb-1">
                              INSPECTION OFFICER/INSPECTION COMMITTEE
                            </p>

                            <input
                              className={readonlyCls}
                              value={iar?.inspecting_officer_name ?? ""}
                              readOnly
                              tabIndex={-1}
                              placeholder="Name of Inspecting Officer"
                            />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-gray-600 mb-1">
                              ARPT/SUPPLY OFFICER
                            </p>

                            <input
                              className={readonlyCls}
                              value={iar?.supply_officer_signature_name ?? ""}
                              readOnly
                              tabIndex={-1}
                              placeholder="Name of Supply Officer"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {tab === "loa" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          LOA No.
                        </label>

                        <input
                          className={readonlyCls}
                          value={loa?.loa_no ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Invoice No.
                        </label>

                        <input
                          className={readonlyCls}
                          value={loa?.invoice_no ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Invoice Date
                        </label>

                        <input
                          className={readonlyCls}
                          value={loa?.invoice_date ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Acceptance Date
                        </label>

                        <input
                          className={readonlyCls}
                          value={loa?.accepted_at ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Accepted By (Name)
                        </label>

                        <input
                          className={readonlyCls}
                          value={loa?.accepted_by_name ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Accepted By (Title)
                        </label>

                        <input
                          className={readonlyCls}
                          value={loa?.accepted_by_title ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>
                    </>
                  )}

                  {tab === "dv" && (
                    <>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Payee
                        </label>
                        <input
                          className={readonlyCls}
                          value={dv?.payee ?? poData?.supplier ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          TIN/Employee No.
                        </label>
                        <input
                          className={readonlyCls}
                          value={dv?.payee_tin ?? poData?.tin ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          ORS/BURS No.
                        </label>
                        <input
                          className={readonlyCls}
                          value={dv?.ors_no ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Address
                        </label>
                        <input
                          className={readonlyCls}
                          value={dv?.address ?? poData?.address ?? ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                          Particulars
                        </label>
                        <textarea
                          className={readonlyCls}
                          value={dv?.particulars ?? ""}
                          readOnly
                          tabIndex={-1}
                          rows={4}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}

            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => handlePrintPDF(tab, delivery, iar, loa, dv, poData)}
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
          </div>

          {/* Preview Side */}
          <div className="flex-[3] flex flex-col overflow-hidden bg-gray-100">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                  {currentDoc.label} · LIVE PREVIEW
                </h3>
              
              </div>
              <div
                className="bg-white rounded-lg shadow-lg p-8 text-black overflow-x-auto"
                style={{ minHeight: "800px" }}
              >
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
          try {
            router.refresh();
          } catch (e) {
            window.location.reload();
          }
        }}
        roleId={currentUser?.role_id}
      />
    </div>
  );
}
