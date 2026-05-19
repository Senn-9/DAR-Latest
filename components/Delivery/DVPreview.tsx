"use client";

import { useState } from "react";
import {
  RiZoomInLine,
  RiZoomOutLine,
  RiRefreshLine,
  RiFilePdf2Line,
} from "react-icons/ri";

interface DVPreviewProps {
  delivery?: any;
  dv?: any;
  poData?: any;
  className?: string;
  containerHeight?: string;
  showPrintButton?: boolean;
}

// Function to download/print PDF
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

// JSX-to-HTML conversion function for PDF generation
function escapeHtml(value: string) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildDVHtml(data: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Disbursement Voucher</title>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; color: #000; font-size: 9px; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div style="width: 600px; min-height: 1056px; margin: 0 auto; padding: 16px; font-family: 'Times New Roman', serif; font-size: 9px; color: #000;">
    <!-- Appendix -->
    <div style="text-align: right; font-style: italic; margin-bottom: 2px; font-family: 'Times New Roman', serif;">Appendix 32</div>

    <!-- HEADER: Logo | Title | Fund Cluster/Date/DV No -->
    <table style="border: 1px solid #000; border-collapse: collapse;">
      <tr>
        <td style="width: 90px; padding: 4px; vertical-align: middle;">
          <img src="/temp_pic/image_1195822096_1.jpg" alt="DAR Logo" style="width: 72px; height: 44px; object-fit: contain;" />
        </td>
        <td style="border-right: 1px solid #000; padding: 4px; vertical-align: top;">
          <div style="font-size: 12px; font-weight: bold; text-align: center; font-family: 'Times New Roman', serif;">DEPARTMENT OF AGRARIAN REFORM</div>
          <div style="font-size: 10px; text-align: center; margin-bottom: 4px; font-family: 'Times New Roman', serif;">Camarines Sur Provincial Office</div>
          <div style="font-size: 14px; font-weight: bold; text-align: center; letter-spacing: 1px; padding-top: 4px; font-family: 'Times New Roman', serif;">DISBURSEMENT VOUCHER</div>
        </td>
        <td style="width: 160px; padding: 0; vertical-align: top;">
          <table style="width: 100%; height: 100%; border-collapse: collapse;">
            <tr>
              <td style="border-bottom: 1px solid #000; padding: 3px 4px;"><b style="font-family: 'Times New Roman', serif;">Fund:</b> ${escapeHtml(data.fund_cluster || "")}</td>
            </tr>
            <tr>
              <td style="border-bottom: 1px solid #000; padding: 3px 4px;"><b style="font-family: 'Times New Roman', serif;">Date:</b> ${escapeHtml(data.dv_date || "")}</td>
            </tr>
            <tr>
              <td style="padding: 3px 4px;"><b style="font-family: 'Times New Roman', serif;">DV No.:</b> ${escapeHtml(data.dv_no || "")}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- MODE OF PAYMENT -->
    <table style="border: 1px solid #000; border-top: none; border-collapse: collapse;">
      <tr>
        <td style="width: 50px; border-right: 1px solid #000; padding: 3px 6px; vertical-align: top;"><b style="font-family: 'Times New Roman', serif;">Mode of <br /> payment</b></td>
        <td style="padding: 3px 6px; vertical-align: top; font-family: 'Times New Roman', serif;">
          <div style="display: flex; gap: 35px; margin-top: 3px;">
            <label style="display: flex; align-items: center; gap: 3px; font-size: 9px; font-family: 'Times New Roman', serif;">
              <input type="checkbox" ${data.mode_of_payment === "MDS Check" ? "checked" : ""} style="margin: 0;" />MDS Check
            </label>
            <label style="display: flex; align-items: center; gap: 3px; font-size: 9px; font-family: 'Times New Roman', serif;">
              <input type="checkbox" ${data.mode_of_payment === "Commercial Check" ? "checked" : ""} style="margin: 0;" />Commercial Check
            </label>
            <label style="display: flex; align-items: center; gap: 3px; font-size: 9px; font-family: 'Times New Roman', serif;">
              <input type="checkbox" ${data.mode_of_payment === "ADA" ? "checked" : ""} style="margin: 0;" />ADA
            </label>
            <label style="display: flex; align-items: center; gap: 3px; font-size: 9px; font-family: 'Times New Roman', serif;">
              <input type="checkbox" ${data.mode_of_payment === "Others" ? "checked" : ""} style="margin: 0;" />Others (Please specify)
            </label>
          </div>
        </td>
      </tr>
    </table>

    <!-- PAYEE / TIN / ORS / ADDRESS -->
    <table style="border: 1px solid #000; border-top: none; border-collapse: collapse;">
      <tr>
        <td style="width: 50px; border-right: 1px solid #000; padding: 3px 4px;"><b style="font-family: 'Times New Roman', serif;">Payee</b></td>
        <td style="border-right: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">${escapeHtml(data.payee || data.supplier || "")}</td>
        <td style="width: 140px; border-right: 1px solid #000; padding: 3px 4px;"><b style="font-family: 'Times New Roman', serif;">Tin/Employee No.</b></td>
        <td style="width: 120px; padding: 3px 4px;"><b style="font-family: 'Times New Roman', serif;">ORS/BURS No.</b></td>
      </tr>
      <tr>
        <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 3px 4px;"><b style="font-family: 'Times New Roman', serif;">Address</b></td>
        <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">${escapeHtml(data.address || "")}</td>
        <td style="border-right: 1px solid #000; border-top: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">${escapeHtml(data.payee_tin || data.tin || "")}</td>
        <td style="border-top: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">${escapeHtml(data.ors_no || "")}</td>
      </tr>
    </table>

    <!-- PARTICULARS TABLE -->
    <table style="border: 1px solid #000; border-top: none; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: 'Times New Roman', serif;">Particulars</th>
          <th style="width: 130px; border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: 'Times New Roman', serif;">Responsibility Center</th>
          <th style="width: 90px; border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: 'Times New Roman', serif;">MFO/PAP</th>
          <th style="width: 100px; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: 'Times New Roman', serif;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr style="height: 0px;">
          <td style="border-right: 1px solid #000; padding: 3px 4px; vertical-align: top; font-family: 'Times New Roman', serif; white-space: pre-wrap;">${escapeHtml(data.particulars || "")}</td>
          <td style="border-right: 1px solid #000; padding: 3px 4px; vertical-align: top; font-family: 'Times New Roman', serif;">${escapeHtml(data.responsibility_center || "")}</td>
          <td style="border-right: 1px solid #000; padding: 3px 4px; vertical-align: top; font-family: 'Times New Roman', serif;">${escapeHtml(data.mfo_pap || "")}</td>
          <td style="padding: 3px 4px; vertical-align: top; font-family: 'Times New Roman', serif; text-align: right;">${escapeHtml(data.amount_due || "")}</td>
        </tr>
        ${[...Array(7)].map(() => `
        <tr style="height: 0px;">
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td style="border-right: 1px solid #000;">&nbsp;</td>
          <td>&nbsp;</td>
        </tr>`).join("")}
        <tr>
          <td colspan="3" style="border-right: 1px solid #000; border-top: 1px solid #000; text-align: right; padding: 3px 4px; font-weight: bold; font-family: 'Times New Roman', serif;">Amount Due</td>
          <td style="border-top: 1px solid #000; padding: 3px 4px; text-align: right; font-family: 'Times New Roman', serif;">${escapeHtml(data.amount_due || "")}</td>
        </tr>
      </tbody>
    </table>

    <!-- SECTION A -->
    <table style="border: 1px solid #000; border-top: none; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 6px; font-family: 'Times New Roman', serif;"><b>A.</b> Certified: Expenses/Cash Advance necessary, lawful and incurred under my direct supervision.</td>
      </tr>
      <tr>
        <td style="padding: 4px 6px; font-family: 'Times New Roman', serif; text-align: center;">
          <div style="margin-bottom: 4px; margin-top: 20px;">
            <span style="font-weight: bold; font-size: 10px; font-family: 'Times New Roman', serif;">${escapeHtml(data.certified_by_name || "")}</span>
          </div>
          <div style="margin-bottom: 20px;">
            <span style="font-size: 10px; font-family: 'Times New Roman', serif;">${escapeHtml(data.certified_by_position || "")}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- SECTION B: Accounting Entry -->
    <table style="border: 1px solid #000; border-top: none; border-collapse: collapse;">
      <tr>
        <td colspan="4" style="border-bottom: 1px solid #000; padding: 3px 6px; font-family: 'Times New Roman', serif;"><b>B.</b> Accounting Entry:</td>
      </tr>
      <tr>
        <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: 'Times New Roman', serif;">Account Title</th>
        <th style="width: 110px; border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: 'Times New Roman', serif;">UACS Code</th>
        <th style="width: 80px; border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: 'Times New Roman', serif;">Debit</th>
        <th style="width: 80px; border-bottom: 1px solid #000; text-align: center; padding: 3px; font-weight: bold; font-family: 'Times New Roman', serif;">Credit</th>
      </tr>
      ${(data.accounting_entries || []).map((entry: any) => `
      <tr style="height: 24px;">
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">${escapeHtml(entry.account_title || "")}</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">${escapeHtml(entry.uacs_code || "")}</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; text-align: right;">${escapeHtml(entry.debit || "")}</td>
        <td style="border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; text-align: right;">${escapeHtml(entry.credit || "")}</td>
      </tr>`).join("")}
      <tr style="height: 20px;">
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    </table>

    <!-- SECTIONS C & D -->
    <table style="border: 1px solid #000; border-top: none; border-collapse: collapse;">
      <tr>
        <td style="width: 52.5%; border-right: 1px solid #000; padding: 4px 6px; vertical-align: top; font-family: 'Times New Roman', serif;">
          <div style="font-weight: bold; margin-bottom: 4px; font-family: 'Times New Roman', serif;">C. Certified:</div>
          <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 3px;">
            <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #000; flex-shrink: 0; margin-top: 1px;"></span>
            <span style="font-family: 'Times New Roman', serif;">Cash available</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 3px;">
            <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #000; flex-shrink: 0; margin-top: 1px;"></span>
            <span style="font-family: 'Times New Roman', serif;">Subject to Authority to Debit Account (when applicable)</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 3px;">
            <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #000; flex-shrink: 0; margin-top: 1px;"></span>
            <span style="font-family: 'Times New Roman', serif;">Supporting documents complete and amount claimed proper</span>
          </div>
          <div style="height: 20px;"></div>
        </td>
        <td style="padding: 4px 6px; vertical-align: top; font-family: 'Times New Roman', serif;">
          <b style="font-family: 'Times New Roman', serif;">D. Approved for Payment</b>
          <div style="height: 70px;"></div>
        </td>
      </tr>
    </table>

    <!-- SIGNATURES -->
    <table style="border: 1px solid #000; border-top: none; border-collapse: collapse;">
      <tr>
        <td style="width: 68px; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">Signature</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; height: 28px; font-family: 'Times New Roman', serif;">&nbsp;</td>
        <td style="width: 80px; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">Signature</td>
        <td style="border-bottom: 1px solid #000; padding: 3px 4px; height: 28px; font-family: 'Times New Roman', serif;">&nbsp;</td>
      </tr>
      <tr>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">Printed Name</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; height: 24px; font-family: 'Times New Roman', serif;">&nbsp;</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">Printed Name</td>
        <td style="border-bottom: 1px solid #000; padding: 3px 4px; height: 24px; font-family: 'Times New Roman', serif;">&nbsp;</td>
      </tr>
      <tr>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;" rowspan="2">Position</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; height: 24px; font-family: 'Times New Roman', serif;">&nbsp;</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;" rowspan="2">Position</td>
        <td style="border-bottom: 1px solid #000; padding: 3px 4px; height: 24px; font-family: 'Times New Roman', serif;">&nbsp;</td>
      </tr>
      <tr>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; height: 24px; font-family: 'Times New Roman', serif;">Head, Accounting Unit/Authorized Representative</td>
        <td style="border-bottom: 1px solid #000; padding: 3px 4px; height: 24px; font-family: 'Times New Roman', serif;">Agency Head/Authorized Representative</td>
      </tr>
      <tr>
        <td style="border-right: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">Date</td>
        <td style="border-right: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">&nbsp;</td>
        <td style="border-right: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif;">Date</td>
        <td style="padding: 3px 4px; font-family: 'Times New Roman', serif;">&nbsp;</td>
      </tr>
    </table>

    <!-- SECTION E: Receipt of Payment -->
    <table style="border: 1px solid #000; border-top: none; border-collapse: collapse;">
      <tbody>
        <tr>
          <td colspan="3" style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 6px; font-weight: bold; font-family: 'Times New Roman', serif;">E. Receipt of Payment</td>
          <td rowspan="2" style="padding: 3px 6px; font-family: 'Times New Roman', serif; vertical-align: top;"><b style="font-family: 'Times New Roman', serif;">JEV No.</b></td>
        </tr>
        <tr>
          <td style="width: 100px; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; vertical-align: top;">Check/<br/>ADA No.:</td>
          <td style="width: 120px; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; vertical-align: top;">Date:</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; vertical-align: top;">Bank Name &amp; Account Number:</td>
        </tr>
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; vertical-align: top; height: 44px;">Signature</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; vertical-align: top;">Date:</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; vertical-align: top;"><div style="font-family: 'Times New Roman', serif;">Printed Name:</div><div style="text-align: center; font-family: 'Times New Roman', serif; margin-top: 6px; font-size: 9px;">${escapeHtml(data.payee || data.supplier || "")}</div></td>
          <td style="border-top: 1px solid #000; padding: 3px 4px; font-family: 'Times New Roman', serif; vertical-align: top;">Date</td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 6px 6px; font-family: 'Times New Roman', serif; height: 40px; vertical-align: top; border-right: 1px solid #000;">Official Receipt No. &amp; Date/Other Documents</td>
          <td style="padding: 6px 4px; font-family: 'Times New Roman', serif; vertical-align: top;">&nbsp;</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

export default function DVPreview({
  delivery = {},
  dv = {},
  poData = {},
  className = "",
  containerHeight = "calc(100vh - 200px)",
  showPrintButton = true,
}: DVPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(1.05);

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

  // Ensure DV-specific fields are available in mergedData
  if (!mergedData.dv_no && dv?.dv_no) mergedData.dv_no = dv.dv_no;
  if (!mergedData.payee && dv?.payee) mergedData.payee = dv.payee;
  if (!mergedData.address && dv?.address) mergedData.address = dv.address;
  if (!mergedData.payee_tin && dv?.payee_tin) mergedData.payee_tin = dv.payee_tin;
  if (!mergedData.ors_no && dv?.ors_no) mergedData.ors_no = dv.ors_no;
  if (!mergedData.fund_cluster && dv?.fund_cluster) mergedData.fund_cluster = dv.fund_cluster;
  if (!mergedData.responsibility_center && dv?.responsibility_center) mergedData.responsibility_center = dv.responsibility_center;
  if (!mergedData.mfo_pap && dv?.mfo_pap) mergedData.mfo_pap = dv.mfo_pap;
  if (!mergedData.amount_due && dv?.amount_due) mergedData.amount_due = dv.amount_due;
  if (!mergedData.mode_of_payment && dv?.mode_of_payment) mergedData.mode_of_payment = dv.mode_of_payment;
  if (!mergedData.particulars && dv?.particulars) mergedData.particulars = dv.particulars;
  if (!mergedData.certified_by_name && dv?.certified_by_name) mergedData.certified_by_name = dv.certified_by_name;
  if (!mergedData.certified_by_position && dv?.certified_by_position) mergedData.certified_by_position = dv.certified_by_position;

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

  // Handle print
  const handlePrint = () => {
    const dvMerged = { ...mergedData, ...dv };
    // Ensure DV-specific fields are available
    if (!dvMerged.dv_no && dv?.dv_no) dvMerged.dv_no = dv.dv_no;
    if (!dvMerged.payee && dv?.payee) dvMerged.payee = dv.payee;
    if (!dvMerged.address && dv?.address) dvMerged.address = dv.address;
    if (!dvMerged.payee_tin && dv?.payee_tin) dvMerged.payee_tin = dv.payee_tin;
    if (!dvMerged.ors_no && dv?.ors_no) dvMerged.ors_no = dv.ors_no;
    if (!dvMerged.fund_cluster && dv?.fund_cluster) dvMerged.fund_cluster = dv.fund_cluster;
    if (!dvMerged.responsibility_center && dv?.responsibility_center) dvMerged.responsibility_center = dv.responsibility_center;
    if (!dvMerged.mfo_pap && dv?.mfo_pap) dvMerged.mfo_pap = dv.mfo_pap;
    if (!dvMerged.amount_due && dv?.amount_due) dvMerged.amount_due = dv.amount_due;
    if (!dvMerged.mode_of_payment && dv?.mode_of_payment) dvMerged.mode_of_payment = dv.mode_of_payment;
    if (!dvMerged.particulars && dv?.particulars) dvMerged.particulars = dv.particulars;
    const html = buildDVHtml(dvMerged);
    downloadPDF(html);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Print Button */}
      {showPrintButton && (
        <div className="flex justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-black font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <RiFilePdf2Line className="w-5 h-5" />
            Print
          </button>
        </div>
      )}

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
      <div className="overflow-auto bg-white" style={{ height: containerHeight }}>
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
                        fontSize: "14px",
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
                        fontFamily: "Times New Roman, serif",
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
                <tr style={{ height: "80px" }}>
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
                  <td style={{ padding: "4px 6px", fontFamily: "Times New Roman, serif" }}>
                    <b>A.</b> Certified: Expenses/Cash Advance necessary, lawful
                    and incurred under my direct supervision.
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "4px 6px",
                      fontFamily: "Times New Roman, serif",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ marginBottom: "4px", marginTop: "20px" }}>
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: "10px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        {mergedData.certified_by_name || ""}
                      </span>
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        {mergedData.certified_by_position || ""}
                      </span>
                    </div>
                  </td>
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
                      width: "52.3%",
                      borderRight: "1px solid #000",
                      padding: "4px 6px",
                      verticalAlign: "top",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "4px", fontFamily: "Times New Roman, serif" }}>
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
                          fontFamily: "Times New Roman, serif",
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
                            fontFamily: "Times New Roman, serif",
                          }}
                        ></span>
                        <span style={{ fontFamily: "Times New Roman, serif" }}>{item}</span>
                      </div>
                    ))}
                    <div style={{ height: "20px" }}></div>
                  </td>
                  <td style={{ padding: "4px 6px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "4px", fontFamily: "Times New Roman, serif" }}>
                      D. Approved for Payment
                    </div>
                    <div style={{ height: "70px" }}></div>
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
                      width: "65px",
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
                      height: "28px",
                      fontFamily: "Times New Roman, serif",
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
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Signature
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      height: "28px",
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
                      height: "24px",
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
                      height: "24px",
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
                    rowSpan={2}
                  >
                    Position
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      height: "24px",
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
                    rowSpan={2}
                  >
                    Position
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      height: "24px",
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
                      height: "24px",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    Head, Accounting Unit/Authorized Representative
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      height: "24px",
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
                  <td style={{ padding: "3px 4px", fontFamily: "Times New Roman, serif" }}>&nbsp;</td>
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
                    colSpan={3}
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 6px",
                      fontWeight: "bold",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    E. Receipt of Payment
                  </td>
                  <td
                    rowSpan={2}
                    style={{
                      padding: "3px 6px",
                      fontFamily: "Times New Roman, serif",
                      verticalAlign: "top",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>JEV No.</b>
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      width: "100px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                      verticalAlign: "top",
                    }}
                  >
                    Check/
                    <br />
                    ADA No.:
                  </td>
                  <td
                    style={{
                      width: "120px",
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                      verticalAlign: "top",
                    }}
                  >
                    Date:
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                      verticalAlign: "top",
                    }}
                  >
                    Bank Name &amp; Account Number:
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                      verticalAlign: "top",
                      height: "44px",
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
                      verticalAlign: "top",
                    }}
                  >
                    Date:
                  </td>
                  <td
                    style={{
                      borderRight: "1px solid #000",
                      borderBottom: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                      verticalAlign: "top",
                    }}
                  >
                    <div style={{ fontFamily: "Times New Roman, serif" }}>Printed Name:</div>
                    <div
                      style={{
                        textAlign: "center",
                        fontFamily: "Times New Roman, serif",
                        marginTop: "6px",
                        fontSize: "9px",
                      }}
                    >
                      {mergedData.payee || mergedData.supplier || ""}
                    </div>
                  </td>
                  <td
                    style={{
                      borderTop: "1px solid #000",
                      padding: "3px 4px",
                      fontFamily: "Times New Roman, serif",
                      verticalAlign: "top",
                    }}
                  >
                    Date
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      padding: "6px 6px",
                      fontFamily: "Times New Roman, serif",
                      height: "40px",
                      verticalAlign: "top",
                      borderRight: "1px solid #000",
                    }}
                  >
                    Official Receipt No. &amp; Date/Other Documents
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      fontFamily: "Times New Roman, serif",
                      verticalAlign: "top",
                    }}
                  >
                    &nbsp;
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
