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
import { IARPreview, buildIARHtml } from "../Delivery/IARPreview";
import { LOAPreview, buildLOAHtml } from "../Delivery/LOAPreview";
import { buildDVHtml } from "../Delivery/DVPreview";
// Editable input styles for live preview

const editableInputCls =
  "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] whitespace-pre-wrap break-words resize-none overflow-hidden";

const editableInputClsDV =
  "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-full text-[8.5pt] whitespace-pre-wrap break-words resize-none overflow-hidden text-center";
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

function DVEditablePreview({
  delivery,
  dv,
  poData,
  setDv,
}: {
  delivery: any;
  dv: any;
  poData: any;
  setDv: (data: any) => void;
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

  // Update DV field
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
  if (!mergedData.certified_by_name && dv?.certified_by_name) mergedData.certified_by_name = dv.certified_by_name;
  if (!mergedData.certified_by_position && dv?.certified_by_position) mergedData.certified_by_position = dv.certified_by_position;

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
                      value={mergedData.ors_no || transformedPoData.ors_no || ""}
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
                <tr style={{ height: "120px" }}>
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
                {[...Array(7)].map((_, i) => (
                  <tr key={i} style={{ height: "12  px" }}>
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
                <tr>
                  <td
                    style={{
                      padding: "4px 6px",
                      fontFamily: "Times New Roman, serif",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ marginBottom: "4px", marginTop: "20px" }}>
                      <input
                        type="text"
                        placeholder="GERRY L. MATAMOROSA"
                        value={mergedData.certified_by_name || ""}
                        onChange={(e) =>
                          updateDvField("certified_by_name", e.target.value)
                        }
                        className={editableInputCls}
                        style={{
                          width: "250px",
                          fontSize: "10px",
                          fontFamily: "Times New Roman, serif",
                          textAlign: "center",
                          borderBottom: "1px solid black",
                          fontWeight: "bold",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <input
                        type="text"
                        placeholder="POSITION"
                        value={mergedData.certified_by_position || ""}
                        onChange={(e) =>
                          updateDvField("certified_by_position", e.target.value)
                        }
                        className={editableInputCls}
                        style={{
                          width: "250px",
                          fontSize: "10px",
                          fontFamily: "Times New Roman, serif",
                          textAlign: "center",
                        }}
                      />
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
                  <tr key={i} style={{ height: "24px" }}>
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
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <div style={{
                      fontWeight: "bold", marginBottom: "4px", fontFamily: "Times New Roman, serif",
                    }}>
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
                        <span style={{ fontFamily: "Times New Roman, serif" }}>{item}</span>
                      </div>
                    ))}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>D. Approved for Payment</b>
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
                    <textarea
                      value={dv?.certified_printed_name || ""}
                      onChange={(e) =>
                        setDv({
                          ...dv,
                          certified_printed_name: e.target.value,
                        })
                      }
                      className={editableInputClsDV}
                      placeholder="Certified by name"
                      rows={1}
                      style={{
                        fontWeight: "bold",
                        fontFamily: "Times New Roman, serif",
                      }}
                    />
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
                    <textarea
                      value={dv?.approved_printed_name || ""}
                      onChange={(e) =>
                        setDv({
                          ...dv,
                          approved_printed_name: e.target.value,
                        })
                      }
                      className={editableInputClsDV}
                      placeholder="Approved by name"
                      rows={1}
                      style={{
                        fontWeight: "bold",
                        fontFamily: "Times New Roman, serif",
                      }}
                    />
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
                    <textarea
                      value={dv?.certified_position || ""}
                      onChange={(e) =>
                        setDv({ ...dv, certified_position: e.target.value })
                      }
                      className={editableInputClsDV}
                      placeholder="Position/Role"
                      rows={1}
                      style={{
                        fontWeight: "bold",
                        fontFamily: "Times New Roman, serif",
                      }}
                    />
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
                    <textarea
                      value={dv?.approved_position || ""}
                      onChange={(e) =>
                        setDv({ ...dv, approved_position: e.target.value })
                      }
                      className={editableInputClsDV}
                      placeholder="Position/Role"
                      rows={1}
                      style={{
                        fontFamily: "Times New Roman, serif",
                        fontWeight: "bold",
                      }}
                    />
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
                    <textarea
                      value={dv?.certified_date || ""}
                      onChange={(e) =>
                        setDv({ ...dv, certified_date: e.target.value })
                      }
                      className={editableInputCls}
                      placeholder="MM/DD/YYYY"
                      rows={1}
                    />
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
                  <td style={{ padding: "3px 4px", fontFamily: "Times New Roman, serif" }}>
                    <textarea
                      value={dv?.approved_date || ""}
                      onChange={(e) =>
                        setDv({ ...dv, approved_date: e.target.value })
                      }
                      className={editableInputCls}
                      placeholder="MM/DD/YYYY"
                      rows={1}
                    />
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
                {/* Row 1: E. Receipt of Payment | JEV No. (rowSpan=2, no bottom border) */}
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
                    JEV No.
                  </td>
                </tr>

                {/* Row 2: Check/ADA No. | Date: | Bank Name & Account Number: */}
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
                    Check/<br />ADA No.:
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

                {/* Row 3: Signature | Date: | Printed Name: | Date (borderTop marks end of JEV rowspan) */}
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
                    <div style={{
                      fontFamily: "Times New Roman, serif",
                    }}>Printed Name:</div>
                    <div
                      style={{
                        textAlign: "center",
                        fontFamily: "Times New Roman, serif",
                        marginTop: "6px",
                        fontSize: "9px",
                      }}
                    >
                      {mergedData.payee || transformedPoData.supplier || ""}
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

                {/* Row 4: Official Receipt No. — taller to fill remaining space */}
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

export type PaymentProcessDocType = "iar" | "loa" | "ors" | "dv";

function documentsForStatus(
  statusId: number | undefined,
): PaymentProcessDocType[] {
  switch (statusId) {
    case 29:
      return ["dv", "loa", "iar"];

    case 30:
      return ["dv", "ors"];

    case 32:

    case 33:
      return ["dv"];

    case 35:
      return ["dv"];

    case 36:
      return ["dv"];

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

  // JEV data state (for case 35 - Tax processing)
  const [jevData, setJevData] = useState({
    jev_no: "",
    jev_date: "",
  });

  const [cashReleaseDone, setCashReleaseDone] = useState(false);

  // DV Certification state (for case 33 - Cash)
  const [dvCertificationName, setDvCertificationName] = useState("");
  const [cashAvailable, setCashAvailable] = useState(false);
  const [authorityToDebit, setAuthorityToDebit] = useState(false);
  const [supportingDocumentsComplete, setSupportingDocumentsComplete] =
    useState(false);

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
        // Only require the reconciliation checkbox for accounting review
        return acctReconciled;

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

  // Get detailed validation error message
  const getValidationErrorMessage = (): string => {
    if (active?.status_id === 30) {
      if (!acctReconciled) {
        return "Toggle the 'Financial package reconciled' checkbox to proceed.";
      }
    }
    return "Choose a status flag to enable submit.";
  };

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

      setDvData({
        ...(dv || {}),
        certified_cash_available: dv?.certified_cash_available || false,
        certified_subject_to_authority:
          dv?.certified_subject_to_authority || false,
        certified_proper: dv?.certified_proper || false,
        jev_no: dv?.jev_no || "",
        jev_date: dv?.jev_date || "",
      });

      setJevData({
        jev_no: dv?.jev_no || "",
        jev_date: dv?.jev_date || "",
      });

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

      // Initialize DV certification fields from dvData
      setDvCertificationName(dv?.certified_printed_name || "");
      setCashAvailable(dv?.certified_cash_available || false);
      setAuthorityToDebit(dv?.certified_subject_to_authority || false);
      setSupportingDocumentsComplete(dv?.certified_proper || false);

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

      mode_of_payment_mds_check:
        dvData?.mode_of_payment === "MDS Check" || false,

      mode_of_payment_commercial_check:
        dvData?.mode_of_payment === "Commercial Check" || false,

      mode_of_payment_ada: dvData?.mode_of_payment === "ADA" || false,

      mode_of_payment_others: dvData?.mode_of_payment === "Others" || false,

      certified_expenses_cash_advance:
        dvData?.certified_expenses_cash_advance || false,

      certified_cash_available:
        cashAvailable || dvData?.certified_cash_available || false,

      certified_subject_to_authority:
        authorityToDebit || dvData?.certified_subject_to_authority || false,

      certified_proper:
        supportingDocumentsComplete || dvData?.certified_proper || false,

      certified_printed_name:
        dvCertificationName || dvData?.certified_printed_name || "",

      accounting_entries: accountingEntries.filter(
        (entry) =>
          // Only include entries that have at least one field filled

          entry.account_title || entry.uacs_code || entry.debit || entry.credit,
      ),

      // Include JEV data
      jev_no: jevData?.jev_no || "",
      jev_date: jevData?.jev_date || "",
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
              <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                JEV
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      JEV No.
                    </label>
                    <input
                      type="text"
                      value={jevData?.jev_no || ""}
                      onChange={(e) =>
                        setJevData({ ...jevData, jev_no: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="e.g., JEV-001"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="text"
                      value={jevData?.jev_date || ""}
                      onChange={(e) =>
                        setJevData({ ...jevData, jev_date: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                </div>
              </div>

              {/* Signature Section */}

              <div className="mt-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                  Signature Details
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Certified By (Printed Name)
                    </label>

                    <input
                      type="text"
                      value={dvData?.certified_printed_name || ""}
                      onChange={(e) =>
                        setDvData({
                          ...dvData,

                          certified_printed_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="e.g., Jolina Magdangal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Certified By Date
                    </label>

                    <input
                      type="text"
                      value={dvData?.certified_date || ""}
                      onChange={(e) =>
                        setDvData({ ...dvData, certified_date: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Approved By (Printed Name)
                    </label>

                    <input
                      type="text"
                      value={dvData?.approved_printed_name || ""}
                      onChange={(e) =>
                        setDvData({
                          ...dvData,

                          approved_printed_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="e.g., Marvin Agustin"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Approved By Date
                    </label>

                    <input
                      type="text"
                      value={dvData?.approved_date || ""}
                      onChange={(e) =>
                        setDvData({ ...dvData, approved_date: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
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
              Reconcile DV. Confirm the details is accurate before PARPO
              approval.
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

              {/* Signature Section */}

              <div className="mt-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                  Signature Details
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Certified By (Printed Name)
                    </label>

                    <input
                      type="text"
                      value={dvData?.certified_printed_name || ""}
                      onChange={(e) =>
                        setDvData({
                          ...dvData,

                          certified_printed_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="e.g., Jolina Magdangal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Certified By Date
                    </label>

                    <input
                      type="text"
                      value={dvData?.certified_date || ""}
                      onChange={(e) =>
                        setDvData({ ...dvData, certified_date: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Approved By (Printed Name)
                    </label>

                    <input
                      type="text"
                      value={dvData?.approved_printed_name || ""}
                      onChange={(e) =>
                        setDvData({
                          ...dvData,

                          approved_printed_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="e.g., Marvin Agustin"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Approved By Date
                    </label>

                    <input
                      type="text"
                      value={dvData?.approved_date || ""}
                      onChange={(e) =>
                        setDvData({ ...dvData, approved_date: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
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

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  A. Certified: Expenses/Cash Advance necessary, lawful and
                  incurred under my direct supervision.
                </label>
                <input
                  type="text"
                  value={dvCertificationName}
                  onChange={(e) => setDvCertificationName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  C. Certified:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cashAvailable}
                      onChange={(e) => {
                        setCashAvailable(e.target.checked);
                        setDvData({
                          ...dvData,
                          certified_cash_available: e.target.checked,
                        });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Cash available
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={authorityToDebit}
                      onChange={(e) => {
                        setAuthorityToDebit(e.target.checked);
                        setDvData({
                          ...dvData,
                          certified_subject_to_authority: e.target.checked,
                        });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Subject to Authority to Debit Account (when applicable)
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={supportingDocumentsComplete}
                      onChange={(e) => {
                        setSupportingDocumentsComplete(e.target.checked);
                        setDvData({
                          ...dvData,
                          certified_proper: e.target.checked,
                        });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Supporting documents complete and amount claimed proper
                    </span>
                  </label>
                </div>
              </div>
            </div>
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

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    JEV No.
                  </label>
                  <input
                    type="text"
                    value={jevData?.jev_no || ""}
                    onChange={(e) =>
                      setJevData({ ...jevData, jev_no: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g., JEV-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={jevData?.jev_date || ""}
                    onChange={(e) =>
                      setJevData({ ...jevData, jev_date: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              </div>
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
            dv={{ ...dvData, ...jevData } || {}}
            poData={poData}
            setDv={setDvData}
            accountingEntries={accountingEntries}
            onUpdateAccountingEntry={updateAccountingEntry}
          />
        );

      case "iar":
        return (
          <IARPreview
            delivery={active}
            iar={iarData || {}}
            poData={poData}
            showPrintButton={false}
          />
        );

      case "loa":
        return (
          <LOAPreview
            delivery={active}
            loa={loaData || {}}
            poData={poData}
            showPrintButton={false}
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

  const canOpenFullTemplate =
    previewTab === "iar" || previewTab === "loa" || previewTab === "dv";

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
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${isActive
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
                  className={`bg-white rounded-lg border p-4 ${statusFlag
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
                      {getValidationErrorMessage()}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isFormValid
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
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${previewTab === tab
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
