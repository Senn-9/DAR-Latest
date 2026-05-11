"use client";

import { useState, useEffect, useRef } from "react";
import {
  RiCloseLine,
  RiFilePdf2Line,
  RiDeleteBinLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiRefreshLine,
} from "react-icons/ri";
import { useRouter } from "next/navigation";
import DeleteDeliveryModal from "@/components/Delivery/DeleteDeliveryModal";

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
  const missingItems = data.iar_po_items || [];

  // Build item rows
  let itemRows = "";

  // Add regular items
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

  // Add missing items
  missingItems.forEach((item: any) => {
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
  const emptyRows = Math.max(0, 15 - items.length - missingItems.length);
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
    body { font-family: Arial, sans-serif; color: #000; }
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

function buildLOAHtml(data: any): string {
  const items = data.po_items || [];

  // Build item rows
  let itemRows = "";

  items.forEach((item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    const amount = quantity * unitPrice;

    itemRows += `
      <tr>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">${escapeHtml(item.stock_no || "")}</td>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">${escapeHtml(item.unit || "")}</td>
        <td style="border:1px solid #000; padding:2px; font-size:9.5px;">${escapeHtml(item.description || "")}</td>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">${quantity || ""}</td>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">${unitPrice ? unitPrice.toFixed(2) : ""}</td>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">${amount ? amount.toFixed(2) : ""}</td>
      </tr>`;
  });

  // Fill empty rows to maintain minimum height
  const emptyRows = Math.max(0, 10 - items.length);
  for (let i = 0; i < emptyRows; i++) {
    itemRows += `
      <tr>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:2px; font-size:9.5px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9.5px;">&nbsp;</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Letter of Acceptance</title>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Arial Narrow', Arial, sans-serif; color: #000; }
    table { width: 100%; border-collapse: collapse; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <div style="max-width: 850px; min-height: 1100px; margin: 0 auto; padding: 48px;">
    <div style="color: #000; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 10px;">
      <!-- Top Section -->
      <div style="display: grid; grid-template-columns: 1fr 3fr 1fr; align-items: start; margin-bottom: 8px;">
        <div></div>

        <!-- Center Logos and Text -->
        <div style="display: flex; align-items: flex-start; justify-content: center; gap: 12px;">
          <img src="/temp_pic/image_1195822096_0.jpg" alt="Republic of the Philippines emblem" style="height: 48px; width: 48px; object-fit: contain;" />
          <img src="/temp_pic/image_1195822096_1.jpg" alt="DAR logo" style="height: 48px; width: 48px; object-fit: contain;" />
          <div style="margin-top: 4px; text-align: center;">
            <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.01em;">REPUBLIC OF THE PHILIPPINES</div>
            <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.01em;">DEPARTMENT OF AGRARIAN REFORM</div>
            <div style="font-size: 8px; font-weight: 400;">Tunay na Pagbabago sa Repormang Agraryo</div>
          </div>
          <img src="/temp_pic/image_1195822096_2.jpg" alt="ISO certified" style="margin-left: 4px; height: 48px; width: 48px; border-radius: 4px; object-fit: contain;" />
          <div style="width: 48px; height: 48px; margin-left: 12px;"></div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 9px; font-weight: 700;">Appendix 63</div>
        </div>
      </div>

      <!-- Title -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-weight: bold; font-size: 12px; text-transform: uppercase;">LETTER OF ACCEPTANCE</div>
      </div>

      <!-- Meta Information -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 10px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-weight: bold;">Entity Name:</span>
            <span>DEPARTMENT OF AGRARIAN REFORM-CAM SUR 1</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-weight: bold;">Supplier:</span>
            <span style="border-bottom: 1px solid #000; flex: 1; padding: 0 4px;">${escapeHtml(data.supplier_name || data.supplier || "")}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-weight: bold;">PO No./Date:</span>
            <span style="border-bottom: 1px solid #000; flex: 1; padding: 0 4px;">${escapeHtml(data.po_no || "")}</span>
          </div>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-weight: bold;">Invoice No.:</span>
            <span style="border-bottom: 1px solid #000; flex: 1; padding: 0 4px;">${escapeHtml(data.invoice_no || "")}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: bold;">Date:</span>
            <span style="border-bottom: 1px solid #000; flex: 1; padding: 0 4px;">${escapeHtml(data.invoice_date || "")}</span>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div style="margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9.5px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Stock No.</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Unit</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Description</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Quantity</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Unit Cost</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- Acceptance Section -->
      <div style="margin-bottom: 24px;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 16px;">ACCEPTANCE</div>
        <div style="font-size: 10px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span>Date Accepted:</span>
            <span style="border-bottom: 1px solid #000; flex: 1; padding: 0 4px;">${escapeHtml(data.accepted_at || "")}</span>
          </div>
          <div style="margin-top: 16px;">
            <span style="border-bottom: 1px solid #000; display: block; width: 100%; padding: 0 4px; font-weight: bold;">${escapeHtml(data.accepted_by_name || "")}</span>
            <div style="font-size: 9px;">${escapeHtml(data.accepted_by_title || "")}</div>
          </div>
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

function IARPreview({
  delivery,
  iar,
  poData,
}: {
  delivery: any;
  iar: any;
  poData: any;
}) {

  // Transform poData to have the correct structure
  const transformedPoData = poData
    ? {
        ...poData,
        po_items: poData.purchase_order_items || [],
        po_date: poData.date,
      }
    : {};

  const mergedData = { ...delivery, ...transformedPoData, ...iar };
  mergedData.po_items = transformedPoData.po_items;
  if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;
  if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;
  if (iar?.iar_po_items) {
    mergedData.iar_po_items = iar.iar_po_items;
  }

  const items = mergedData.po_items || [];
  const missingItems = mergedData.iar_po_items || [];

  return (
    <div className="space-y-2">
      {/* Live JSX Preview Container */}
      <div className="overflow-auto bg-white" style={{ height: "calc(100vh - 200px)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "20px", backgroundColor: "#f5f5f5" }}>
          <div className="bg-white shadow-lg" style={{ width: "816px", minHeight: "1056px", padding: "32px" }}>
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
                  fontFamily: "Arial, sans-serif",
                }}
              >
                INSPECTION AND ACCEPTANCE REPORT
              </div>
            </div>

            {/* Entity Name and Fund Cluster Row */}
            <div
              className="mb-3 flex items-baseline"
              style={{ fontSize: "10px", fontFamily: "Arial, sans-serif" }}
            >
              <span className="font-semibold">Entity Name :</span>
              <span className="flex-1 px-2">
                DEPARTMENT OF AGRARIAN REFORM-CAM SUR I
              </span>
              <span className="font-semibold">Fund Cluster :</span>
              <span className="px-2">{mergedData.fund_cluster || ""}</span>
            </div>

            {/* Main Info Box */}
            <div
              className="border-2 border-black"
              style={{ fontSize: "10px", fontFamily: "Arial, sans-serif" }}
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
                style={{ fontSize: "9px", fontFamily: "Arial, sans-serif" }}
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
                      <td className="border-2 border-black p-1 px-2" style={{ overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
                        {item.description || ""}
                      </td>
                      <td className="border-2 border-black p-1 text-center">
                        {item.quantity || ""}
                      </td>
                      <td className="border-2 border-black p-1 text-right pr-2">
                        {item.unit_price || ""}
                      </td>
                      <td className="border-2 border-black p-1 text-right pr-2">
                        {item.quantity && item.unit_price
                          ? (
                              Number(item.quantity) * Number(item.unit_price)
                            ).toFixed(2)
                          : ""}
                      </td>
                    </tr>
                  ))}
                  {missingItems.length > 0 &&
                    missingItems.map((item: any, i: number) => (
                      <tr key={`missing-${i}`}>
                        <td className="border-2 border-black p-1 text-center">
                          {item.stock_no || ""}
                        </td>
                        <td className="border-2 border-black p-1 text-center">
                          {item.unit || ""}
                        </td>
                        <td className="border-2 border-black p-1 px-2" style={{ overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
                          {item.description || ""}
                        </td>
                        <td className="border-2 border-black p-1 text-center">
                          {item.quantity || ""}
                        </td>
                        <td className="border-2 border-black p-1 text-right pr-2">
                          {item.unit_price || ""}
                        </td>
                        <td className="border-2 border-black p-1 text-right pr-2">
                          {item.quantity && item.unit_price
                            ? (
                                Number(item.quantity) * Number(item.unit_price)
                              ).toFixed(2)
                            : ""}
                        </td>
                      </tr>
                    ))}
                  {/* Fill empty rows */}
                  {[
                    ...Array(
                      Math.max(0, 15 - items.length - missingItems.length),
                    ),
                  ].map((_, i) => (
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
              style={{ fontSize: "10px", fontFamily: "Arial, sans-serif" }}
            >
              <div className="flex" style={{ minHeight: "200px" }}>
                {/* Inspection Column */}
                <div className="border-r border-black flex-1 h-full">
                  <div
                    className="border-b border-black p-2 text-center font-bold"
                    style={{
                      fontStyle: "italic",
                      fontFamily: "Arial, sans-serif",
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
                      <span
                        className="border-b border-black inline-block ml-2"
                        style={{ minWidth: "150px" }}
                      >
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
                          fontFamily: "Arial, sans-serif",
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
                          fontFamily: "Arial, sans-serif",
                        }}
                        className="border-b border-black mx-4 mb-1 pt-6"
                      >
                        {mergedData.inspection_officer || ""}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontFamily: "Arial, sans-serif",
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
                      fontFamily: "Arial, sans-serif",
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
                      <span
                        className="border-b border-black inline-block ml-2"
                        style={{ minWidth: "150px" }}
                      >
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
                          fontFamily: "Arial, sans-serif",
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
                          fontFamily: "Arial, sans-serif",
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
                          fontFamily: "Arial, sans-serif",
                        }}
                        className="border-b border-black mx-4 mb-1 pt-6"
                      >
                        {mergedData.supply_officer || ""}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontFamily: "Arial, sans-serif",
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

function LOAPreview({
  delivery,
  loa,
  poData,
}: {
  delivery: any;
  loa: any;
  poData: any;
}) {

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
      {/* Live JSX Preview Container */}
      <div className="overflow-auto bg-white" style={{ height: "calc(100vh - 200px)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "20px", backgroundColor: "#f5f5f5" }}>
          <div className="bg-white shadow-lg" style={{ maxWidth: "850px", minHeight: "1100px", padding: "64px 80px" }}>
            <div
              className="text-black font-sans text-[11px] leading-tight tracking-tight"
              style={{ fontFamily: "Arial, sans-serif" }}
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
                      fontFamily: "Arial, sans-serif",
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
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    DEPARTMENT OF AGRARIAN REFORM
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      marginBottom: "2px",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Camarines Sur Provincial Office
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontFamily: "Arial, sans-serif",
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
                    fontFamily: "Arial, sans-serif", // Matches the template's clean terminals
                    fontWeight: 700,
                    fontSize: "14px",
                    marginTop: "28px",
                    textTransform: "uppercase", // Ensures consistent casing
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
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                {/* Line 1 - indented */}
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "flex-end",
                    paddingBottom: "4px",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <span
                    style={{
                      paddingLeft: "100px",

                      fontFamily: "Arial, sans-serif",
                      wordSpacing: "15px",
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
                      fontFamily: "Arial, sans-serif",
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
                      fontFamily: "Arial, sans-serif",
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
                      fontFamily: "Arial, sans-serif",
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
                    }}
                  >
                    {mergedData.invoice_date || ""}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "Arial, sans-serif",
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
                      fontFamily: "Arial, sans-serif",
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
                      fontFamily: "Arial, sans-serif",
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
                    style={{ width: "180px", borderBottom: "1.5px solid #000" }}
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
                      fontFamily: "Arial, sans-serif",
                      fontSize: "11px",
                    }}
                  >
                    {mergedData.accepted_by_name || ""}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      marginTop: "4px",
                      marginBottom: "24px",
                      fontFamily: "Arial, sans-serif",
                      wordSpacing: "15px",
                    }}
                  >
                    (Printed Name &amp; Signature)
                  </div>

                  <div
                    style={{
                      borderBottom: "1.5px solid #000",
                      minHeight: "22px",
                      paddingBottom: "2px",
                      fontFamily: "Arial, sans-serif",
                      fontWeight: 700,
                      fontSize: "11px",
                    }}
                  >
                    {mergedData.accepted_by_title || ""}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      marginTop: "4px",
                      marginBottom: "4px",
                      fontFamily: "Arial, sans-serif",
                      wordSpacing: "15px",
                    }}
                  >
                    (Official Title)
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      fontFamily: "Arial, sans-serif",
                      wordSpacing: "15px",
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
                    fontFamily: "Arial, sans-serif",
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

function DVPreview({ delivery, dv, poData }: { delivery: any; dv: any; poData: any }) {
  const [zoomLevel, setZoomLevel] = useState(0.85);

  // Transform PO data - keep all fields and just add the transformed ones
  const transformedPoData = poData
    ? {
        ...poData,
        po_items: poData.purchase_order_items || [],
        po_date: poData.date,
      }
    : {};
  
  // Merge delivery data with transformed PO data and DV data
  const mergedData = { ...delivery, ...transformedPoData, ...dv };
  mergedData.po_items = transformedPoData.po_items;

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
                            {mergedData.fund_cluster || ""}
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
                            {mergedData.dv_date || ""}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: "3px 4px" }}>
                            <b style={{ fontFamily: "Times New Roman, serif" }}>
                              DV No.:
                            </b>{" "}
                            {mergedData.dv_no || ""}
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
                      {["MDS Check", "Commercial Check", "ADA", "Others"].map(
                        (opt) => (
                          <label
                            key={opt}
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
                              checked={mergedData.mode_of_payment === opt}
                              readOnly
                              style={{ margin: 0 }}
                            />
                            {opt === "Others" ? "Others (Please specify)" : opt}
                          </label>
                        ),
                      )}
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
                    {mergedData.payee || mergedData.supplier || ""}
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
                    {mergedData.address || ""}
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderTop: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    {mergedData.payee_tin || mergedData.tin || ""}
                  </td>
                  <td
                    style={{
                      borderTop: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    {mergedData.ors_no || ""}
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
                <tr style={{ height: "120px" }}>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                      fontSize: "9px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {mergedData.particulars || ""}
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                      fontSize: "9px",
                    }}
                  >
                    {mergedData.responsibility_center || ""}
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                      fontSize: "9px",
                    }}
                  >
                    {mergedData.mfo_pap || ""}
                  </td>
                  <td
                    style={{
                      padding: "3px 4px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                      fontSize: "9px",
                      textAlign: "right",
                    }}
                  >
                    {mergedData.amount_due || ""}
                  </td>
                </tr>
                {[...Array(7)].map((_, i) => (
                  <tr key={i} style={{ height: "20px" }}>
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
                      fontFamily: "Times New Roman, serif",
                      fontSize: "9px",
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
                  <td style={{ padding: "4px 6px" }}>
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
                    }}
                  >
                    Credit
                  </th>
                </tr>
                {[...Array(6)].map((_, i) => (
                  <tr key={i} style={{ height: "20px" }}>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        borderBottom: "1px solid #000",
                      }}
                    >
                      &nbsp;
                    </td>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        borderBottom: "1px solid #000",
                      }}
                    >
                      &nbsp;
                    </td>
                    <td
                      style={{
                        borderRight: "1px solid #000",
                        borderBottom: "1px solid #000",
                      }}
                    >
                      &nbsp;
                    </td>
                    <td style={{ borderBottom: "1px solid #000" }}>&nbsp;</td>
                  </tr>
                ))}
                <tr style={{ height: "20px" }}>
                  <td style={{ borderRight: "1px solid #000" }}>&nbsp;</td>
                  <td style={{ borderRight: "1px solid #000" }}>&nbsp;</td>
                  <td style={{ borderRight: "1px solid #000" }}>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
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
                      width: "50%",
                      borderRight: "1px solid #000",
                      padding: "4px 6px",
                      verticalAlign: "top",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
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
                        <span>{item}</span>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: "4px 6px", verticalAlign: "top" }}>
                    <b>D. Approved for Payment</b>
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
                    }}
                  >
                    Signature
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    &nbsp;
                  </td>
                  <td
                    style={{
                      width: "80px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    Signature
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
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
                    }}
                  >
                    &nbsp;
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    Printed Name
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
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
                    }}
                  >
                    Position
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    Head, Accounting Unit/Authorized Representative
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    Position
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
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
                    }}
                  >
                    Date
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    &nbsp;
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    Date
                  </td>
                  <td style={{ padding: "3px 4px" }}>&nbsp;</td>
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
                    }}
                  >
                    <b>E. Receipt of Payment</b>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      borderLeft: "1px solid #000",
                      padding: "3px 6px",
                    }}
                  >
                    <b>JEV No.</b>
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      width: "90px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
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
                    }}
                  >
                    <b>Date :</b>
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <b>Bank Name &amp; Account Number:</b>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      borderLeft: "1px solid #000",
                      padding: "3px 4px",
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
                    }}
                  >
                    Signature
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <b>Date :</b>
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <b>Printed Name:</b>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      borderLeft: "1px solid #000",
                      padding: "3px 4px",
                    }}
                  >
                    <b>Date</b>
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ padding: "3px 6px" }}>
                    <b>Official Receipt No. &amp; Date/Other Documents</b>
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
    poDataParam: any,
  ) => {
    if (currentTab === "dv") {
      alert("DV PDF generation will be implemented in the next phase.");
      return;
    }

    const transformedPoData = poDataParam
      ? {
          ...poDataParam,
          po_items: poDataParam.purchase_order_items || [],
          po_date: poDataParam.date,
        }
      : {};
    const mergedData = { ...deliveryData, ...transformedPoData };

    if (currentTab === "iar" && iarData) {
      const iarMerged = { ...mergedData, ...iarData };
      iarMerged.po_items = mergedData.po_items;
      if (mergedData.po_no) iarMerged.po_no = mergedData.po_no;
      if (mergedData.po_date) iarMerged.po_date = mergedData.po_date;
      if (iarData?.iar_po_items) {
        iarMerged.iar_po_items = iarData.iar_po_items;
      }
      const html = buildIARHtml(iarMerged);
      downloadPDF(html);
    } else if (currentTab === "loa" && loaData) {
      const loaMerged = { ...mergedData, ...loaData };
      loaMerged.po_items = mergedData.po_items;
      if (mergedData.po_no) loaMerged.po_no = mergedData.po_no;
      // PO date should not be copied to LOA - keep it blank
      const html = buildLOAHtml(loaMerged);
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
                onClick={() => handlePrintPDF(tab, delivery, iar, loa, poData)}
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
                {/* PDF Print Button */}
                <button
                  onClick={() => {
                    if (tab === "dv") {
                      alert(
                        "DV PDF generation will be implemented in the next phase.",
                      );
                      return;
                    }

                    const transformedPoData = poData
                      ? {
                          ...poData,
                          po_items: poData.purchase_order_items || [],
                          po_date: poData.date,
                        }
                      : {};
                    const mergedData = { ...delivery, ...transformedPoData };

                    if (tab === "iar" && iar) {
                      const iarData = { ...mergedData, ...iar };
                      iarData.po_items = mergedData.po_items;
                      if (mergedData.po_no) iarData.po_no = mergedData.po_no;
                      if (mergedData.po_date)
                        iarData.po_date = mergedData.po_date;
                      if (iar?.iar_po_items) {
                        iarData.iar_po_items = iar.iar_po_items;
                      }
                      const html = buildIARHtml(iarData);
                      downloadPDF(html);
                    } else if (tab === "loa" && loa) {
                      const loaData = { ...mergedData, ...loa };
                      loaData.po_items = mergedData.po_items;
                      if (mergedData.po_no) loaData.po_no = mergedData.po_no;
                      // PO date should not be copied to LOA - keep it blank
                      const html = buildLOAHtml(loaData);
                      downloadPDF(html);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                  title="Print to PDF"
                >
                  <RiFilePdf2Line size={18} />
                  <span>Print PDF</span>
                </button>
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
