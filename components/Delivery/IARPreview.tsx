import React from "react";
import { RiFilePdf2Line } from "react-icons/ri";

interface IARPreviewProps {
  delivery?: any;
  iar?: any;
  poData?: any;
  className?: string;
  containerHeight?: string;
  showPrintButton?: boolean;
}

// Helper function to escape HTML
function escapeHtml(value: string) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Function to build IAR HTML for printing
export function buildIARHtml(data: any): string {
  const items = data.po_items || [];

  // Build item rows
  let itemRows = "";

  // Add items
  items.forEach((item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || item.unit_cost || 0);
    const amount = quantity * unitPrice;

    itemRows += `
      <tr style="height:24px;">
        <td style="border:0.5px solid #000; padding:4px; text-align:center; font-size:9px;">${escapeHtml(item.stock_no || "")}</td>
        <td style="border:0.5px solid #000; padding:4px; text-align:center; font-size:9px;">${escapeHtml(item.unit || "")}</td>
        <td style="border:0.5px solid #000; padding:4px 8px; font-size:9px; overflow:hidden; word-wrap:break-word; white-space:normal;">${escapeHtml(item.description || "")}</td>
        <td style="border:0.5px solid #000; padding:4px; text-align:center; font-size:9px;">${quantity || ""}</td>
        <td style="border:0.5px solid #000; padding:4px 8px 4px 4px; text-align:right; font-size:9px;">${unitPrice ? unitPrice.toFixed(2) : ""}</td>
        <td style="border:0.5px solid #000; padding:4px 8px 4px 4px; text-align:right; font-size:9px;">${amount ? amount.toFixed(2) : ""}</td>
      </tr>`;
  });

  // Fill empty rows to maintain minimum height
  const emptyRows = Math.max(0, 15 - items.length);
  for (let i = 0; i < emptyRows; i++) {
    itemRows += `
      <tr style="height:24px;">
        <td style="border:0.5px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:0.5px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:0.5px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:0.5px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:0.5px solid #000; padding:4px;">&nbsp;</td>
        <td style="border:0.5px solid #000; padding:4px;">&nbsp;</td>
      </tr>`;
  }

  // Calculate total amount
  const totalAmount = items.reduce((sum: number, item: any) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || item.unit_cost || 0);
    return sum + (quantity * unitPrice);
  }, 0);

  // Add total amount row
  itemRows += `
    <tr>
      <td colspan="5" style="border:0.5px solid #000; padding:4px;">&nbsp;</td>
      <td style="border:0.5px solid #000; padding:4px 8px 4px 4px; text-align:right; font-size:9px; font-weight:bold;">${totalAmount.toFixed(2)}</td>
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
    body { font-family: "Times New Roman", serif; color: #000; }
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
      <div style="font-size: 14px; font-weight: 700; letter-spacing: 1px; font-family: "Times New Roman", serif;">INSPECTION AND ACCEPTANCE REPORT</div>
    </div>

    <!-- Entity Name and Fund Cluster Row -->
    <div style="margin-bottom: 12px; font-size: 10px; font-family: "Times New Roman", serif; display: flex; align-items: baseline;">
      <span style="font-weight: 600;">Entity Name :</span>
      <span style="flex: 1; padding: 0 8px;">DEPARTMENT OF AGRARIAN REFORM-CAM SUR I</span>
      <span style="font-weight: 600;">Fund Cluster :</span>
      <span style="padding: 0 8px;">${escapeHtml(data.fund_cluster || "")}</span>
    </div>

    <!-- Main Info Box -->
    <div style="border: 0.5px solid #000; margin-bottom: 0; font-size: 10px; font-family: "Times New Roman", serif;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <!-- Left Section -->
          <td style="border-right: 0.5px solid #000; padding: 8px; width: 50%; vertical-align: top;">
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
      <table style="border-collapse: collapse; border: 0.5px solid #000; font-size: 9px; width: 100%; font-family: "Times New Roman", serif;">
        <thead>
          <tr>
            <th style="border: 0.5px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 80px;">
              <div style="font-style: italic;">Stock/</div>
              <div style="font-style: italic;">Property No.</div>
            </th>
            <th style="border: 0.5px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 50px; font-style: italic;">Unit</th>
            <th style="border: 0.5px solid #000; padding: 4px; text-align: center; font-weight: bold; font-style: italic;">Description</th>
            <th style="border: 0.5px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 70px; font-style: italic;">Quantity</th>
            <th style="border: 0.5px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 80px; font-style: italic;">Unit Cost</th>
            <th style="border: 0.5px solid #000; padding: 4px; text-align: center; font-weight: bold; width: 90px; font-style: italic;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <!-- Inspection and Acceptance Section -->
    <div style="border: 0.5px solid #000; font-size: 10px; font-family: "Times New Roman", serif;">
      <table style="width: 100%; border-collapse: collapse; min-height: 160px;">
        <tr>
          <!-- Inspection Column -->
          <td style="border-right: 0.5px solid #000; width: 50%; vertical-align: top;">
            <div style="border-bottom: 0.5px solid #000; padding: 8px; text-align: center; font-weight: bold; font-style: italic; font-family: "Times New Roman", serif;">INSPECTION</div>
            <div style="padding: 12px; position: relative; height: 140px;">
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
                      <span style="font-size: 9px; font-family: "Times New Roman", serif;">Inspected, verified and found in order as to quantity and specifications</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="position: absolute; bottom: 12px; left: 16px; right: 16px; text-align: center;">
                <div style="border-bottom: 1px solid #000; padding-top: 24px; padding-bottom: 0; font-weight: 700; font-family: "Times New Roman", serif;">${escapeHtml(data.inspection_officer || "")}</div>
                <div style="font-size: 9px; margin-top: 4px; font-family: "Times New Roman", serif;">Inspection Officer/Inspection Committee</div>
              </div>
            </div>
          </td>

          <!-- Acceptance Column -->
          <td style="width: 50%; vertical-align: top;">
            <div style="border-bottom: 0.5px solid #000; padding: 8px; text-align: center; font-weight: bold; font-style: italic; font-family: "Times New Roman", serif;">ACCEPTANCE</div>
            <div style="padding: 12px; position: relative; height: 140px;">
              <div style="margin-bottom: 12px;">
                <span style="font-weight: 600;">Date Received :</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; margin-left: 8px; min-width: 150px;">${escapeHtml(data.received_at || "")}</span>
              </div>
              
              <div style="margin-bottom: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 18px; vertical-align: middle; padding: 0;">
                      <div style="border: 1px solid #000; width: 18px; height: 18px; text-align: center; line-height: 14px;">
                        ${data.items_complete === true ? "✓" : ""}
                      </div>
                    </td>
                    <td style="padding-left: 8px; vertical-align: middle;">
                      <span style="font-size: 9px; font-family: "Times New Roman", serif;">Complete</span>
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
                      <span style="font-size: 9px; font-family: "Times New Roman", serif;">Partial (pls. specify quantity)</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="position: absolute; bottom: 12px; left: 16px; right: 16px; text-align: center;">
                <div style="border-bottom: 1px solid #000; padding-top: 24px; padding-bottom: 0; font-weight: 700; font-family: "Times New Roman", serif;">${escapeHtml(data.supply_officer || "")}</div>
                <div style="font-size: 9px; margin-top: 4px; font-family: "Times New Roman", serif;">ARPT/SUPPLY OFFICER</div>
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

export function IARPreview({
  delivery = {},
  iar = {},
  poData = {},
  className = "",
  containerHeight = "calc(100vh - 200px)",
  showPrintButton = true,
}: IARPreviewProps) {
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

  // Handle print
  const handlePrint = () => {
    const iarMerged = { ...mergedData, ...iar };
    iarMerged.po_items = mergedData.po_items;
    if (mergedData.po_no) iarMerged.po_no = mergedData.po_no;
    if (mergedData.po_date) iarMerged.po_date = mergedData.po_date;
    if (iar?.iar_po_items) {
      iarMerged.iar_po_items = iar.iar_po_items;
    }
    const html = buildIARHtml(iarMerged);
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

      {/* Live JSX Preview Container */}
      <div
        className="overflow-auto bg-white"
        style={{ height: containerHeight }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="bg-white shadow-lg"
            style={{ width: "816px", minHeight: "1056px", padding: "32px", fontFamily: "Times New Roman, serif" }}
          >
            {/* Appendix Header */}
            <div className="text-right mb-2">
              <span style={{ fontSize: "10px", fontStyle: "italic", fontFamily: "Times New Roman, serif" }}>
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
              <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>Entity Name :</span>
              <span className="flex-1 px-2" style={{ fontFamily: "Times New Roman, serif" }}>
                DEPARTMENT OF AGRARIAN REFORM-CAM SUR I
              </span>
              <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>Fund Cluster :</span>
              <span className="px-2" style={{ fontFamily: "Times New Roman, serif" }}>{mergedData.fund_cluster || ""}</span>
            </div>

            {/* Main Info Box */}
            <div
              style={{ fontSize: "10px", fontFamily: "Times New Roman, serif", border: "0.5px solid #000" }}
            >
              <div className="grid grid-cols-2">
                {/* Left Section */}
                <div className="p-2 space-y-1" style={{ borderRight: "0.5px solid #000" }}>
                  <div style={{ fontFamily: "Times New Roman, serif" }}>
                    <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>Supplier :</span>
                    <span className="ml-2" style={{ fontFamily: "Times New Roman, serif" }}>
                      {mergedData.supplier_name || mergedData.supplier || ""}
                    </span>
                  </div>
                  <div style={{ fontFamily: "Times New Roman, serif" }}>
                    <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>PO No./Date :</span>
                    <span className="ml-2" style={{ fontFamily: "Times New Roman, serif" }}>
                      {mergedData.po_no || ""} / {mergedData.po_date || ""}
                    </span>
                  </div>
                  <div style={{ fontFamily: "Times New Roman, serif" }}>
                    <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>
                      Requisitioning Office/Dept. :
                    </span>
                    <span className="ml-2" style={{ fontFamily: "Times New Roman, serif" }}>
                      {mergedData.office_section || ""}
                    </span>
                  </div>
                  <div style={{ fontFamily: "Times New Roman, serif" }}>
                    <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>
                      Responsibility Center Code :
                    </span>
                    <span className="ml-2" style={{ fontFamily: "Times New Roman, serif" }}>
                      {mergedData.responsibility_center_code || ""}
                    </span>
                  </div>
                </div>

                {/* Right Section */}
                <div className="p-2 space-y-1">
                  <div style={{ fontFamily: "Times New Roman, serif" }}>
                    <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>IAR No. :</span>
                    <span className="ml-2" style={{ fontFamily: "Times New Roman, serif" }}>{mergedData.iar_no || ""}</span>
                  </div>
                  <div style={{ fontFamily: "Times New Roman, serif" }}>
                    <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>Date :</span>
                    <span className="ml-2" style={{ fontFamily: "Times New Roman, serif" }}>{mergedData.iar_date || ""}</span>
                  </div>
                  <div style={{ fontFamily: "Times New Roman, serif" }}>
                    <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>Invoice No. :</span>
                    <span className="ml-2" style={{ fontFamily: "Times New Roman, serif" }}>{mergedData.invoice_no || ""}</span>
                  </div>
                  <div style={{ fontFamily: "Times New Roman, serif" }}>
                    <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>Date :</span>
                    <span className="ml-2" style={{ fontFamily: "Times New Roman, serif" }}>
                      {mergedData.invoice_date || ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <table
                className="w-full border-collapse"
                style={{ fontSize: "9px", fontFamily: "Times New Roman, serif", border: "0.5px solid #000" }}
              >
                <thead>
                  <tr>
                    <th
                      className="p-1 text-center font-bold"
                      style={{ width: "80px", border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}
                    >
                      <div style={{ fontStyle: "italic", fontFamily: "Times New Roman, serif" }}>Stock/</div>
                      <div style={{ fontStyle: "italic", fontFamily: "Times New Roman, serif" }}>Property No.</div>
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{ width: "50px", fontStyle: "italic", border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}
                    >
                      Unit
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{ fontStyle: "italic", border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}
                    >
                      Description
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{ width: "70px", fontStyle: "italic", border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}
                    >
                      Quantity
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{ width: "80px", fontStyle: "italic", border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}
                    >
                      Unit Cost
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{ width: "90px", fontStyle: "italic", border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, i: number) => (
                    <tr key={i} style={{ height: "24px" }}>
                      <td className="p-1 text-center" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>
                        {item.stock_no || ""}
                      </td>
                      <td className="p-1 text-center" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>
                        {item.unit || ""}
                      </td>
                      <td
                        className="p-1 px-2"
                        style={{
                          overflow: "hidden",
                          wordWrap: "break-word",
                          whiteSpace: "normal",
                          border: "0.5px solid #000",
                          fontFamily: "Times New Roman, serif",
                        }}
                      >
                        {item.description || ""}
                      </td>
                      <td className="p-1 text-center" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>
                        {item.quantity || ""}
                      </td>
                      <td className="p-1 text-right pr-2" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>
                        {item.unit_price || item.unit_cost || ""}
                      </td>
                      <td className="p-1 text-right pr-2" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>
                        {item.quantity && (item.unit_price || item.unit_cost)
                          ? (
                              Number(item.quantity) * Number(item.unit_price || item.unit_cost)
                            ).toFixed(2)
                          : ""}
                      </td>
                    </tr>
                  ))}
                  {/* Fill empty rows */}
                  {[...Array(Math.max(0, 15 - items.length))].map((_, i) => (
                    <tr key={`empty-${i}`} style={{ height: "24px" }}>
                      <td className="p-1" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>&nbsp;</td>
                      <td className="p-1" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>&nbsp;</td>
                      <td className="p-1" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>&nbsp;</td>
                      <td className="p-1" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>&nbsp;</td>
                      <td className="p-1" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>&nbsp;</td>
                      <td className="p-1" style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}>&nbsp;</td>
                    </tr>
                  ))}
                  {/* Total Amount Row */}
                  <tr>
                    <td
                      colSpan={5}
                      className="p-1"
                      style={{ border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}
                    >
                      &nbsp;
                    </td>
                    <td
                      className="p-1 text-right pr-2 font-bold"
                      style={{ fontSize: "9px", border: "0.5px solid #000", fontFamily: "Times New Roman, serif" }}
                    >
                      {items
                        .reduce(
                          (sum: number, item: any) =>
                            sum +
                            (item.quantity && (item.unit_price || item.unit_cost)
                              ? Number(item.quantity) * Number(item.unit_price || item.unit_cost)
                              : 0),
                          0
                        )
                        .toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Inspection and Acceptance Section */}
            <div
              style={{ fontSize: "10px", fontFamily: "Times New Roman, serif", border: "0.5px solid #000" }}
            >
              <div className="flex" style={{ minHeight: "160px" }}>
                {/* Inspection Column */}
                <div className="flex-1 h-full" style={{ borderRight: "0.5px solid #000" }}>
                  <div
                    className="p-2 text-center font-bold"
                    style={{
                      fontStyle: "italic",
                      fontFamily: "Times New Roman, serif",
                      borderBottom: "0.5px solid #000",
                    }}
                  >
                    INSPECTION
                  </div>
                  <div
                    className="p-3 relative flex flex-col"
                    style={{ height: "140px" }}
                  >
                    <div className="mb-3" style={{ fontFamily: "Times New Roman, serif" }}>
                      <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>Date Inspected :</span>
                      <span
                        className="border-b border-black inline-block ml-2"
                        style={{ minWidth: "150px", fontFamily: "Times New Roman, serif" }}
                      >
                        {mergedData.inspected_at || ""}
                      </span>
                    </div>

                    <div className="mb-4 flex items-start gap-2">
                      <div
                        className="border border-black"
                        style={{
                          width: "18px",
                          height: "18px",
                          flexShrink: 0,
                        }}
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
                        }}
                        className="border-b border-black mx-4 mb-1 pt-6"
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
                    className="p-2 text-center font-bold"
                    style={{
                      fontStyle: "italic",
                      fontFamily: "Times New Roman, serif",
                      borderBottom: "0.5px solid #000",
                    }}
                  >
                    ACCEPTANCE
                  </div>
                  <div
                    className="p-3 relative flex flex-col"
                    style={{ height: "140px" }}
                  >
                    <div className="mb-3" style={{ fontFamily: "Times New Roman, serif" }}>
                      <span className="font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>Date Received :</span>
                      <span
                        className="border-b border-black inline-block ml-2"
                        style={{ minWidth: "150px", fontFamily: "Times New Roman, serif" }}
                      >
                        {mergedData.received_at || ""}
                      </span>
                    </div>

                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className="border border-black"
                        style={{
                          width: "18px",
                          height: "18px",
                          flexShrink: 0,
                        }}
                      >
                        {mergedData.items_complete === true && (
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
                        style={{
                          width: "18px",
                          height: "18px",
                          flexShrink: 0,
                        }}
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
                        }}
                        className="border-b border-black mx-4 mb-1 pt-6"
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
