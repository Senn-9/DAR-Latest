import React from "react";
import { RiFilePdf2Line } from "react-icons/ri";

interface LOAPreviewProps {
  delivery?: any;
  loa?: any;
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

// Function to build LOA HTML for printing
export function buildLOAHtml(data: any): string {
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
    body { font-family: 'Times New Roman', serif; color: #000; }
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
        <div style="font-size: 11px; margin-bottom: 4px; font-family: 'Times New Roman', serif;">Republic of the Philippines</div>
        <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; font-family: 'Times New Roman', serif;">DEPARTMENT OF AGRARIAN REFORM</div>
        <div style="font-size: 10px; margin-bottom: 2px; font-family: 'Times New Roman', serif;">Camarines Sur Provincial Office</div>
        <div style="font-size: 10px; font-family: 'Times New Roman', serif;">2/FHL BLDG., CARNATION ST., BRGY. TRIANGULO, NAGA CITY</div>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin-bottom: 32px; margin-top: 28px;">
      <div style="font-family: 'Times New Roman', serif; font-weight: 700; font-size: 14px; text-transform: uppercase;">LETTER OF ACCEPTANCE</div>
    </div>

    <!-- Date Field - Right Aligned -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
      <div style="width: 150px; text-align: center;">
        <div style="font-size: 9px; border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; text-align: center;">${escapeHtml(data.accepted_at || "")}</div>
        <div style="font-size: 9px; margin-top: 4px;">Date</div>
      </div>
    </div>

    <!-- Acceptance Text -->
    <div style="font-family: 'Times New Roman', serif; font-size: 11px;">
      <!-- Line 1 - indented -->
      <div style="height: 32px; display: flex; align-items: flex-end; padding-bottom: 4px;">
        <span style="padding-left: 50px; font-family: 'Times New Roman', serif; word-spacing: 10px;">
          I/WE hereby certify to have accepted each and every articles/services delivered
        </span>
      </div>

      <!-- Line 2 - "rendered by ___" -->
      <div style="height: 32px; display: flex; align-items: flex-end;">
        <span style="white-space: nowrap; padding-bottom: 4px; font-family: 'Times New Roman', serif; word-spacing: 8px;">rendered&nbsp;by&nbsp;</span>
        <span style="flex: 1; border-bottom: 1.5px solid #000; text-align: center; padding-bottom: 2px;">${escapeHtml(data.supplier_name || data.supplier || "")}</span>
      </div>

      <!-- Line 3 - "listed in the attached Invoice No. ___ dated" -->
      <div style="height: 32px; display: flex; align-items: flex-end;">
        <span style="white-space: nowrap; padding-bottom: 4px; font-family: 'Times New Roman', serif; word-spacing: 8px;">listed&nbsp;in&nbsp;the&nbsp;attached&nbsp;Invoice&nbsp;No.&nbsp;</span>
        <span style="flex: 1; border-bottom: 1.5px solid #000; text-align: center; padding-bottom: 2px;">${escapeHtml(data.invoice_no || "")}</span>
        <span style="white-space: nowrap; padding-bottom: 4px; font-family: 'Times New Roman', serif; word-spacing: 8px;">&nbsp;dated</span>
      </div>

      <!-- Line 4 - "___ was/were found to be in accordance with the specifications" -->
      <div style="height: 32px; display: flex; align-items: flex-end;">
        <span style="width: 180px; flex-shrink: 0; border-bottom: 1.5px solid #000; text-align: center; padding-bottom: 2px;">${escapeHtml(data.invoice_date || "")}</span>
        <span style="white-space: nowrap; padding-bottom: 4px; font-family: 'Times New Roman', serif; word-spacing: 8px;">&nbsp;was/were found to be in accordance with the specifications</span>
      </div>

      <!-- Line 5 - "stipulated under Order No./Purchase Order No. ___ dated" -->
      <div style="height: 32px; display: flex; align-items: flex-end;">
        <span style="white-space: nowrap; padding-bottom: 4px; font-family: 'Times New Roman', serif; word-spacing: 8px;">stipulated&nbsp;under&nbsp;Order&nbsp;No./Purchase&nbsp;Order&nbsp;No.&nbsp;</span>
        <span style="flex: 1; border-bottom: 1.5px solid #000; text-align: center; padding-bottom: 2px;">${escapeHtml(data.po_no || "")}</span>
        <span style="white-space: nowrap; padding-bottom: 4px; font-family: 'Times New Roman', serif; word-spacing: 8px;">&nbsp;dated</span>
      </div>

      <!-- Line 6 - standalone PO date underline -->
      <div style="height: 32px; display: flex; align-items: flex-end;">
        <span style="width: 180px; border-bottom: 1.5px solid #000; text-align: center; padding-bottom: 2px;">${escapeHtml(data.po_date || "")}</span>
      </div>
    </div>

    <!-- Signature Section - Right Aligned -->
    <div style="display: flex; justify-content: flex-end; margin-top: 100px;">
      <div style="width: 200px; text-align: center;">
        <div style="border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; font-weight: 700; font-family: 'Times New Roman', serif; font-size: 11px;">${escapeHtml(data.accepted_by_name || "")}</div>
        <div style="font-size: 9px; margin-top: 4px; margin-bottom: 24px; font-family: 'Times New Roman', serif; word-spacing: 15px;">(Printed Name &amp; Signature)</div>

        <div style="border-bottom: 1.5px solid #000; min-height: 22px; padding-bottom: 2px; font-family: 'Times New Roman', serif; font-weight: 700; font-size: 11px;">${escapeHtml(data.accepted_by_title || "")}</div>
        <div style="font-size: 9px; margin-top: 4px; margin-bottom: 4px; font-family: 'Times New Roman', serif; word-spacing: 15px;">(Official Title)</div>
        <div style="font-size: 9px; font-family: 'Times New Roman', serif;;">(Head of Agency/Authorized Representative)</div>
      </div>
    </div>

    <!-- Form Reference - Bottom Right -->
    <div style="display: flex; justify-content: flex-end; margin-top: 40px;">
      <div style="font-size: 9px; font-weight: 700; font-family: 'Times New Roman', serif;">DAR CS1-QF-STO-016 REV 00</div>
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

export default function LOAPreview({
  delivery = {},
  loa = {},
  poData = {},
  className = "",
  containerHeight = "calc(100vh - 200px)",
  showPrintButton = true,
}: LOAPreviewProps) {
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

  // Handle print
  const handlePrint = () => {
    const loaMerged = { ...mergedData, ...loa };
    loaMerged.po_items = mergedData.po_items;
    if (mergedData.po_no) loaMerged.po_no = mergedData.po_no;
    const html = buildLOAHtml(loaMerged);
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
        className="overflow-auto"
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
            style={{
              maxWidth: "850px",
              minHeight: "1100px",
              padding: "64px 80px",
            }}
          >
            <div
              className="text-black font-sans text-[11px] leading-tight tracking-tight"
              style={{ fontFamily: "'Times New Roman', serif" }}
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
                      fontFamily: "'Times New Roman', serif",
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
                      fontFamily: "'Times New Roman', serif",
                    }}
                  >
                    DEPARTMENT OF AGRARIAN REFORM
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      marginBottom: "2px",
                      fontFamily: "'Times New Roman', serif",
                    }}
                  >
                    Camarines Sur Provincial Office
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontFamily: "'Times New Roman', serif",
                    }}
                  >
                    2/FHL BLDG., CARNATION ST., BRGY. TRIANGULO, NAGA CITY
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-8 mt-10">
                <div
                  style={{
                    fontFamily: "'Times New Roman', serif",
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
                <div style={{ width: "150px", textAlign: "center" }}>
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
                style={{ fontFamily: "'Times New Roman', serif" }}
              >
                {/* Line 1 - indented */}
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "flex-end",
                    paddingBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      paddingLeft: "50px",
                      fontFamily: "'Times New Roman', serif",
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
                      fontFamily: "'Times New Roman', serif",
                      wordSpacing: "8px",
                    }}
                  >
                    rendered&nbsp;by&nbsp;
                  </span>
                  <span style={{ flex: 1, borderBottom: "1.5px solid #000", textAlign: "center", paddingBottom: "2px" }}>
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
                      fontFamily: "'Times New Roman', serif",
                      wordSpacing: "8px",
                    }}
                  >
                    listed&nbsp;in&nbsp;the&nbsp;attached&nbsp;Invoice&nbsp;No.&nbsp;
                  </span>
                  <span style={{ flex: 1, borderBottom: "1.5px solid #000", textAlign: "center", paddingBottom: "2px" }}>
                    {mergedData.invoice_no || ""}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "'Times New Roman', serif",
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
                      textAlign: "center",
                      paddingBottom: "2px",
                    }}
                  >
                    {mergedData.invoice_date || ""}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "'Times New Roman', serif",
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
                      fontFamily: "'Times New Roman', serif",
                      wordSpacing: "8px",
                    }}
                  >
                    stipulated&nbsp;under&nbsp;Order&nbsp;No./Purchase&nbsp;Order&nbsp;No.&nbsp;
                  </span>
                  <span style={{ flex: 1, borderBottom: "1.5px solid #000", textAlign: "center", paddingBottom: "2px" }}>
                    {mergedData.po_no || ""}
                  </span>
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingBottom: "4px",
                      fontFamily: "'Times New Roman', serif",
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
                    style={{ width: "180px", borderBottom: "1.5px solid #000", textAlign: "center", paddingBottom: "2px" }}
                  >
                    {mergedData.po_date || ""}
                  </span>
                </div>
              </div>

              {/* Signature Section - Right Aligned */}
              <div className="flex justify-end" style={{ marginTop: "100px" }}>
                <div style={{ width: "200px", textAlign: "center" }}>
                  <div
                    style={{
                      borderBottom: "1.5px solid #000",
                      minHeight: "22px",
                      paddingBottom: "2px",
                      fontWeight: 700,
                      fontFamily: "'Times New Roman', serif",
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
                      fontFamily: "'Times New Roman', serif",
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
                      fontFamily: "'Times New Roman', serif",
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
                      fontFamily: "'Times New Roman', serif",
                      wordSpacing: "15px",
                    }}
                  >
                    (Official Title)
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      fontFamily: "'Times New Roman', serif",
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
                    fontFamily: "'Times New Roman', serif",
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
