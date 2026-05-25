"use client";

import { useState, useEffect } from "react";

import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiFilePdf2Line,
  RiZoomInLine,
  RiZoomOutLine,
  RiRefreshLine,
  RiAddLine,
} from "react-icons/ri";

import {
  FlagButton,
  StatusFlagPicker,
  type StatusFlag,
  getFlagId,
} from "../StatusFlagPicker";
import { buildIARHtml } from "./IARPreview";
import { buildLOAHtml } from "./LOAPreview";
import { buildDVHtml } from "./DVPreview";

// Editable input styles for live preview
const editableInputCls =
  "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] whitespace-pre-wrap break-words resize-none overflow-hidden";
const editableInputCenterCls =
  "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-center whitespace-pre-wrap break-words resize-none overflow-hidden";
const editableInputRightCls =
  "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-right whitespace-pre-wrap break-words resize-none overflow-hidden";

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
  const [zoomLevel, setZoomLevel] = useState(0.75);

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
  const updateIarField = (field: string, value: string | boolean | null) => {
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
              <input
                type="text"
                value={mergedData.fund_cluster || ""}
                onChange={(e) => updateIarField("fund_cluster", e.target.value)}
                className={editableInputCls}
                style={{ width: "60px", fontSize: "9px" }}
              />
            </div>

            {/* Main Info Box */}
            <div
              style={{
                fontSize: "10px",
                fontFamily: "Times New Roman, serif",
                border: "0.5px solid #000",
              }}
            >
              <div className="grid grid-cols-2">
                {/* Left Section */}
                <div
                  className="p-2 space-y-1"
                  style={{ borderRight: "0.5px solid #000" }}
                >
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
                    <input
                      type="text"
                      value={mergedData.iar_no || ""}
                      onChange={(e) => updateIarField("iar_no", e.target.value)}
                      className={editableInputCls}
                      style={{ width: "100px", fontSize: "9px" }}
                    />
                  </div>
                  <div>
                    <span className="font-semibold">Date :</span>
                    <input
                      type="text"
                      value={mergedData.iar_date || ""}
                      onChange={(e) =>
                        updateIarField("iar_date", e.target.value)
                      }
                      className={editableInputCls}
                      style={{ width: "100px", fontSize: "9px" }}
                    />
                  </div>
                  <div>
                    <span className="font-semibold">Invoice No. :</span>
                    <input
                      type="text"
                      value={mergedData.invoice_no || ""}
                      onChange={(e) =>
                        updateIarField("invoice_no", e.target.value)
                      }
                      className={editableInputCls}
                      style={{ width: "100px", fontSize: "9px" }}
                    />
                  </div>
                  <div>
                    <span className="font-semibold">Date :</span>
                    <input
                      type="text"
                      value={mergedData.invoice_date || ""}
                      onChange={(e) =>
                        updateIarField("invoice_date", e.target.value)
                      }
                      className={editableInputCls}
                      style={{ width: "100px", fontSize: "9px" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <table
                className="w-full border-collapse"
                style={{
                  fontSize: "9px",
                  fontFamily: "Times New Roman, serif",
                  border: "0.5px solid #000",
                }}
              >
                <thead>
                  <tr>
                    <th
                      className="p-1 text-center font-bold"
                      style={{ width: "80px", border: "0.5px solid #000" }}
                    >
                      <div style={{ fontStyle: "italic" }}>Stock/</div>
                      <div style={{ fontStyle: "italic" }}>Property No.</div>
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{
                        width: "50px",
                        fontStyle: "italic",
                        border: "0.5px solid #000",
                      }}
                    >
                      Unit
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{
                        fontStyle: "italic",
                        border: "0.5px solid #000",
                      }}
                    >
                      Description
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{
                        width: "70px",
                        fontStyle: "italic",
                        border: "0.5px solid #000",
                      }}
                    >
                      Quantity
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{
                        width: "80px",
                        fontStyle: "italic",
                        border: "0.5px solid #000",
                      }}
                    >
                      Unit Cost
                    </th>
                    <th
                      className="p-1 text-center font-bold"
                      style={{
                        width: "90px",
                        fontStyle: "italic",
                        border: "0.5px solid #000",
                      }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, i: number) => (
                    <tr key={i}>
                      <td
                        className="p-1 text-center"
                        style={{ border: "0.5px solid #000" }}
                      >
                        <textarea
                          value={item.stock_no || ""}
                          onChange={(e) =>
                            updateIarPoItem(i, "stock_no", e.target.value)
                          }
                          onInput={autoResize}
                          className={editableInputCenterCls}
                          style={{
                            width: "95%",
                            minHeight: "16px",
                            fontSize: "9px",
                          }}
                          rows={1}
                        />
                      </td>
                      <td
                        className="p-1 text-center"
                        style={{ border: "0.5px solid #000" }}
                      >
                        <textarea
                          value={item.unit || ""}
                          onChange={(e) =>
                            updateIarPoItem(i, "unit", e.target.value)
                          }
                          onInput={autoResize}
                          className={editableInputCenterCls}
                          style={{
                            width: "95%",
                            minHeight: "16px",
                            fontSize: "9px",
                          }}
                          rows={1}
                        />
                      </td>
                      <td
                        className="p-1 px-2"
                        style={{
                          overflow: "hidden",
                          wordWrap: "break-word",
                          whiteSpace: "normal",
                          border: "0.5px solid #000",
                        }}
                      >
                        <textarea
                          value={item.description || ""}
                          onChange={(e) =>
                            updateIarPoItem(i, "description", e.target.value)
                          }
                          onInput={autoResize}
                          className={editableInputCls}
                          style={{
                            width: "95%",
                            minHeight: "16px",
                            fontSize: "9px",
                          }}
                          rows={1}
                        />
                      </td>
                      <td
                        className="p-1 text-center"
                        style={{ border: "0.5px solid #000" }}
                      >
                        <textarea
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateIarPoItem(i, "quantity", e.target.value)
                          }
                          onInput={autoResize}
                          className={editableInputCenterCls}
                          style={{
                            width: "95%",
                            minHeight: "16px",
                            fontSize: "9px",
                          }}
                          rows={1}
                        />
                      </td>
                      <td
                        className="p-1 text-right pr-2"
                        style={{ border: "0.5px solid #000" }}
                      >
                        <textarea
                          value={item.unit_cost || ""}
                          onChange={(e) =>
                            updateIarPoItem(i, "unit_cost", e.target.value)
                          }
                          onInput={autoResize}
                          className={editableInputRightCls}
                          style={{
                            width: "95%",
                            minHeight: "16px",
                            fontSize: "9px",
                          }}
                          rows={1}
                        />
                      </td>
                      <td
                        className="p-1 text-right pr-2"
                        style={{ border: "0.5px solid #000" }}
                      >
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
                      <td
                        className="p-1"
                        style={{ border: "0.5px solid #000" }}
                      >
                        &nbsp;
                      </td>
                      <td
                        className="p-1"
                        style={{ border: "0.5px solid #000" }}
                      >
                        &nbsp;
                      </td>
                      <td
                        className="p-1"
                        style={{ border: "0.5px solid #000" }}
                      >
                        &nbsp;
                      </td>
                      <td
                        className="p-1"
                        style={{ border: "0.5px solid #000" }}
                      >
                        &nbsp;
                      </td>
                      <td
                        className="p-1"
                        style={{ border: "0.5px solid #000" }}
                      >
                        &nbsp;
                      </td>
                      <td
                        className="p-1"
                        style={{ border: "0.5px solid #000" }}
                      >
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                  {/* Total Amount Row */}
                  <tr>
                    <td
                      colSpan={5}
                      className="p-1"
                      style={{ border: "0.5px solid #000" }}
                    >
                      &nbsp;
                    </td>
                    <td
                      className="p-1 text-right pr-2 font-bold"
                      style={{ fontSize: "9px", border: "0.5px solid #000" }}
                    >
                      {items
                        .reduce(
                          (sum: number, item: any) =>
                            sum +
                            (item.quantity && item.unit_cost
                              ? Number(item.quantity) * Number(item.unit_cost)
                              : 0),
                          0,
                        )
                        .toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Inspection and Acceptance Section */}
            <div
              style={{
                fontSize: "10px",
                fontFamily: "Times New Roman, serif",
                border: "0.5px solid #000",
              }}
            >
              <div className="flex" style={{ minHeight: "200px" }}>
                {/* Inspection Column */}
                <div
                  className="flex-1 h-full"
                  style={{ borderRight: "0.5px solid #000" }}
                >
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
                    style={{ height: "180px" }}
                  >
                    <div className="mb-3">
                      <span className="font-semibold">Date Inspected :</span>
                      <input
                        type="text"
                        value={mergedData.inspected_at || ""}
                        onChange={(e) =>
                          updateIarField("inspected_at", e.target.value)
                        }
                        className={editableInputCls}
                        style={{ minWidth: "150px", fontSize: "9px" }}
                      />
                    </div>

                    <div className="mb-4 flex items-start gap-2">
                      <div
                        className="border border-black cursor-pointer"
                        style={{ width: "18px", height: "18px", flexShrink: 0 }}
                        onClick={() =>
                          updateIarField(
                            "inspection_verified",
                            !mergedData.inspection_verified,
                          )
                        }
                      >
                        {mergedData.inspection_verified === true && (
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
                      <input
                        type="text"
                        value={mergedData.inspection_officer || ""}
                        onChange={(e) =>
                          updateIarField("inspection_officer", e.target.value)
                        }
                        className={editableInputCls}
                        style={{
                          fontWeight: 700,
                          fontFamily: "Times New Roman, serif",
                          width: "80%",
                          fontSize: "9px",
                          borderBottom: "1px solid black",
                          textAlign: "center",
                          paddingBottom: "2px",
                        }}
                        placeholder="Inspection Officer"
                      />
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
                    style={{ height: "180px" }}
                  >
                    <div className="mb-3">
                      <span className="font-semibold">Date Received :</span>
                      <input
                        type="text"
                        value={mergedData.received_at || ""}
                        onChange={(e) =>
                          updateIarField("received_at", e.target.value)
                        }
                        className={editableInputCls}
                        style={{ minWidth: "150px", fontSize: "9px" }}
                      />
                    </div>

                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className="border border-black cursor-pointer"
                        style={{ width: "18px", height: "18px", flexShrink: 0 }}
                        onClick={() => updateIarField("items_complete", true)}
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
                        className="border border-black cursor-pointer"
                        style={{ width: "18px", height: "18px", flexShrink: 0 }}
                        onClick={() => updateIarField("items_complete", false)}
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
                      <input
                        type="text"
                        value={mergedData.supply_officer || ""}
                        onChange={(e) =>
                          updateIarField("supply_officer", e.target.value)
                        }
                        className={editableInputCls}
                        style={{
                          fontWeight: 700,
                          fontFamily: "Times New Roman, serif",
                          width: "80%",
                          fontSize: "9px",
                          borderBottom: "1px solid black",
                          textAlign: "center",
                          paddingBottom: "2px",
                        }}
                        placeholder="Supply Officer"
                      />
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
  if (transformedPoData.po_no && !loa?.po_no)
    mergedData.po_no = transformedPoData.po_no;
  if (transformedPoData.po_date && !loa?.po_date)
    mergedData.po_date = transformedPoData.po_date;

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
                  <input
                    type="text"
                    value={mergedData.accepted_at || ""}
                    onChange={(e) =>
                      updateLoaField("accepted_at", e.target.value)
                    }
                    className={editableInputCls}
                    style={{
                      borderBottom: "1.5px solid #000",
                      minHeight: "22px",
                      paddingBottom: "2px",
                      textAlign: "center",
                      fontSize: "9px",
                    }}
                  />
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
                  <input
                    type="text"
                    value={mergedData.invoice_no || ""}
                    onChange={(e) =>
                      updateLoaField("invoice_no", e.target.value)
                    }
                    className={editableInputCls}
                    style={{
                      flex: 1,
                      borderBottom: "1.5px solid #000",
                      fontSize: "9px",
                    }}
                  />
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
                  <input
                    type="text"
                    value={mergedData.invoice_date || ""}
                    onChange={(e) =>
                      updateLoaField("invoice_date", e.target.value)
                    }
                    className={editableInputCls}
                    style={{
                      width: "180px",
                      flexShrink: 0,
                      borderBottom: "1.5px solid #000",
                      fontSize: "9px",
                    }}
                  />
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
                  <input
                    type="text"
                    value={mergedData.po_date || ""}
                    onChange={(e) => updateLoaField("po_date", e.target.value)}
                    className={editableInputCls}
                    style={{
                      width: "180px",
                      borderBottom: "1.5px solid #000",
                      fontSize: "9px",
                    }}
                  />
                </div>
              </div>

              {/* Signature Section - Right Aligned */}
              <div className="flex justify-end" style={{ marginTop: "100px" }}>
                <div style={{ width: "200px", textAlign: "center" }}>
                  <input
                    type="text"
                    value={mergedData.accepted_by_name || ""}
                    onChange={(e) =>
                      updateLoaField("accepted_by_name", e.target.value)
                    }
                    className={editableInputCls}
                    style={{
                      borderBottom: "1.5px solid #000",
                      minHeight: "22px",
                      paddingBottom: "2px",
                      fontWeight: 700,
                      fontFamily: "Times New Roman, serif",
                      fontSize: "11px",
                      width: "100%",
                    }}
                    placeholder="Printed Name & Signature"
                  />
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

                  <input
                    type="text"
                    value={mergedData.accepted_by_title || ""}
                    onChange={(e) =>
                      updateLoaField("accepted_by_title", e.target.value)
                    }
                    className={editableInputCls}
                    style={{
                      borderBottom: "1.5px solid #000",
                      minHeight: "22px",
                      paddingBottom: "2px",
                      fontFamily: "Times New Roman, serif",
                      fontWeight: 700,
                      fontSize: "11px",
                      width: "100%",
                    }}
                    placeholder="Official Title"
                  />
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
  if (!mergedData.certified_by_name && dv?.certified_by_name)
    mergedData.certified_by_name = dv.certified_by_name;
  if (!mergedData.certified_by_position && dv?.certified_by_position)
    mergedData.certified_by_position = dv.certified_by_position;

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
                      value={
                        mergedData.ors_no || transformedPoData.ors_no || ""
                      }
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
                      width: "52.5%",
                      borderRight: "1px solid #000",
                      padding: "4px 6px",
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
                    <div style={{ height: "20px" }}></div>
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      verticalAlign: "top",
                      fontFamily: "Times New Roman, serif",
                    }}
                  >
                    <b style={{ fontFamily: "Times New Roman, serif" }}>
                      D. Approved for Payment
                    </b>
                    <div
                      style={{
                        fontWeight: "bold",
                        marginBottom: "4px",
                        fontFamily: "Times New Roman, serif",
                      }}
                    >
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
                      width: "68px",
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

interface ProcessDeliveryModalProps {
  visible: boolean;

  onClose: () => void;

  onSubmit: () => void;

  active: any;

  statusLabel: string;

  drNo: string;

  setDrNo: (v: string) => void;

  notes: string;

  setNotes: (v: string) => void;

  iar: any;

  setIar: (v: any) => void;

  loa: any;

  setLoa: (v: any) => void;

  dv: any;

  setDv: (v: any) => void;

  statusFlag: StatusFlag | null;

  onPressStatusFlag: () => void;

  flagPickerOpen: boolean;

  onCloseFlagPicker: () => void;

  onSelectStatusFlag: (flag: StatusFlag | null) => void;

  onPreviewIAR?: () => void;

  onPreviewLOA?: () => void;

  onPreviewDV?: () => void;

  poData?: any;
}

export default function ProcessDeliveryModal({
  visible,

  onClose,

  onSubmit,

  active,

  statusLabel,

  drNo,

  setDrNo,

  notes,

  setNotes,

  iar,

  setIar,

  loa,

  setLoa,

  dv,

  setDv,

  statusFlag,

  onPressStatusFlag,

  flagPickerOpen,

  onCloseFlagPicker,

  onSelectStatusFlag,

  onPreviewIAR,

  onPreviewLOA,

  onPreviewDV,

  poData,
}: ProcessDeliveryModalProps) {
  const deliveryNo = active?.delivery_no ?? "—";

  // Wizard state

  const [currentStep, setCurrentStep] = useState(1);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<
    "delivery" | "iar" | "loa" | "dv"
  >("delivery");

  // Validation function to check if all required fields are filled

  const isFormValid = () => {
    // For status 25 (Division Chief) - no form fields, always valid

    // Status 21 (IAR Processing) - External work, only require status flag

    if (active?.status_id === 21) {
      return statusFlag !== null;
    }

    // Delivery (Waiting) - require status flag to be set

    if (active?.status_id === 18) {
      return statusFlag !== null;
    }

    // Delivery Receipt required fields (only for status 19)

    if (active?.status_id === 19) {
      return drNo.trim() !== "";
    }

    // Status 20 (Delivery IAR) - Both IAR and LOA documents must be completed

    if (active?.status_id === 20) {
      // Check if IAR document exists and is valid

      const iarExists = iar && Object.keys(iar).length > 0;

      const iarValid =
        iarExists &&
        iar?.iar_no?.trim() !== "" &&
        iar?.invoice_no?.trim() !== "" &&
        iar?.invoice_date?.trim() !== "" &&
        iar?.iar_date?.trim() !== "" &&
        iar?.inspected_at?.trim() !== "" &&
        iar?.received_at?.trim() !== "" &&
        iar?.inspection_officer?.trim() !== "" &&
        iar?.supply_officer?.trim() !== "";

      // Check if LOA document exists and is valid

      const loaExists = loa && Object.keys(loa).length > 0;

      const loaValid =
        loaExists &&
        loa?.invoice_no?.trim() !== "" &&
        loa?.invoice_date?.trim() !== "" &&
        loa?.po_date?.trim() !== "" &&
        loa?.accepted_at?.trim() !== "" &&
        loa?.accepted_by_name?.trim() !== "" &&
        loa?.accepted_by_title?.trim() !== "";

      // Both documents must exist and be valid for Status 20

      return iarValid && loaValid;
    }

    // IAR required fields (when IAR is selected for other statuses)

    if (selectedDocument === "iar") {
      return (
        iar?.iar_no?.trim() !== "" &&
        iar?.invoice_no?.trim() !== "" &&
        iar?.invoice_date?.trim() !== "" &&
        iar?.iar_date?.trim() !== "" &&
        iar?.inspected_at?.trim() !== "" &&
        iar?.received_at?.trim() !== "" &&
        iar?.inspection_officer?.trim() !== "" &&
        iar?.supply_officer?.trim() !== ""
      );
    }

    // Status 22 (Delivery LOA) - Preview only, require status flag and ensure IAR data is preserved

    if (active?.status_id === 22) {
      const hasIarData =
        iar && Object.keys(iar).length > 0 && iar?.iar_no?.trim() !== "";

      return statusFlag !== null && hasIarData;
    }

    // LOA required fields (when LOA is selected)

    if (selectedDocument === "loa") {
      return (
        loa?.invoice_no?.trim() !== "" &&
        loa?.invoice_date?.trim() !== "" &&
        loa?.accepted_at?.trim() !== "" &&
        loa?.accepted_by_name?.trim() !== "" &&
        loa?.accepted_by_title?.trim() !== ""
      );
    }

    // Status 23 (Delivery DV) - This status is now skipped in workflow

    // Status 25 (Division Chief) - Preview only, require status flag

    if (active?.status_id === 25) {
      return statusFlag !== null;
    }

    return false;
  };

  // Enhanced validation function that returns specific error messages

  const validateFormFields = (): string[] => {
    const errors: string[] = [];

    // For status 25 (Division Chief) - no form fields, always valid

    // Status 21 (IAR Processing) - External work, require status flag

    if (active?.status_id === 21) {
      if (!statusFlag) {
        errors.push(
          "Status flag is required to proceed with IAR Processing status",
        );
      }
    }

    // Delivery (Waiting) - require status flag

    if (active?.status_id === 18) {
      if (!statusFlag) {
        errors.push(
          "Status flag is required to proceed with Delivery (Waiting) status",
        );
      }
    }

    // Delivery Receipt required fields (only for status 19)

    if (active?.status_id === 19) {
      if (!drNo.trim()) {
        errors.push("Delivery Receipt No. (DR No.) is required");
      }
    }

    // Status 20 (Delivery IAR) - IAR and LOA documents are required

    if (active?.status_id === 20) {
      // Check IAR fields

      if (!iar?.iar_no?.trim()) errors.push("IAR No. is required");

      if (!iar?.invoice_no?.trim()) errors.push("IAR Invoice No. is required");

      if (!iar?.invoice_date?.trim())
        errors.push("IAR Invoice Date is required");

      if (!iar?.iar_date?.trim()) errors.push("IAR Date is required");

      if (!iar?.inspection_officer?.trim())
        errors.push("Inspection Officer/Inspection Committee is required");

      if (!iar?.supply_officer?.trim())
        errors.push("ARPT/SUPPLY OFFICER is required");

      // Check LOA fields

      if (!loa?.invoice_no?.trim()) errors.push("LOA Invoice No. is required");

      if (!loa?.invoice_date?.trim())
        errors.push("LOA Invoice Date is required");

      if (!loa?.accepted_at?.trim())
        errors.push("LOA Date Accepted is required");

      if (!loa?.accepted_by_name?.trim())
        errors.push("LOA Accepted By Name is required");

      if (!loa?.accepted_by_title?.trim())
        errors.push("LOA Accepted By Title is required");
    }

    // IAR required fields (when IAR is selected for other statuses)

    if (selectedDocument === "iar" && active?.status_id !== 20) {
      if (!iar?.iar_no?.trim()) errors.push("IAR No. is required");

      if (!iar?.invoice_no?.trim()) errors.push("Invoice No. is required");

      if (!iar?.invoice_date?.trim()) errors.push("Invoice Date is required");

      if (!iar?.iar_date?.trim()) errors.push("IAR Date is required");

      if (!iar?.inspection_officer?.trim())
        errors.push("Inspection Officer/Inspection Committee is required");

      if (!iar?.supply_officer?.trim())
        errors.push("ARPT/SUPPLY OFFICER is required");
    }

    // Status 22 (Delivery LOA) - Preview only, require status flag and ensure IAR data is preserved

    if (active?.status_id === 22) {
      if (!statusFlag) {
        errors.push(
          "Status flag is required to proceed with Delivery (LOA) preview status",
        );
      }

      const hasIarData =
        iar && Object.keys(iar).length > 0 && iar?.iar_no?.trim() !== "";

      if (!hasIarData) {
        errors.push(
          "IAR data must be present before forwarding to Division Chief",
        );
      }
    }

    // LOA required fields (when LOA is selected)

    if (selectedDocument === "loa") {
      if (!loa?.invoice_no?.trim()) errors.push("Invoice No. is required");

      if (!loa?.invoice_date?.trim()) errors.push("Invoice Date is required");

      if (!loa?.po_date?.trim()) errors.push("PO Date is required");

      if (!loa?.accepted_at?.trim()) errors.push("Date Accepted is required");

      if (!loa?.accepted_by_name?.trim())
        errors.push("Accepted By Name is required");

      if (!loa?.accepted_by_title?.trim())
        errors.push("Accepted By Title is required");
    }

    // Status 23 (Delivery DV) - This status is now skipped in workflow

    // Status 25 (Division Chief) - Preview only, require status flag

    if (active?.status_id === 25) {
      if (!statusFlag) {
        errors.push(
          "Status flag is required to proceed with Division Chief review status",
        );
      }
    }

    return errors;
  };

  const handleSubmit = () => {
    const errors = validateFormFields();

    if (errors.length > 0) {
      alert("Please fix the following errors:\n\n" + errors.join("\n"));

      return;
    }

    onSubmit();
  };

  // Determine which steps to show based on status

  const getAvailableSteps = () => {
    const steps: Array<{ id: number; label: string; icon: string }> = [];

    // Status 21 (IAR Processing) - External work, no steps needed

    if (active?.status_id === 21) {
      return steps; // No steps for external work
    }

    // Always include delivery receipt info for statuses 18 & 19

    if (active?.status_id === 18 || active?.status_id === 19) {
      steps.push({ id: 1, label: "Delivery Receipt", icon: "" });
    }

    // IAR step (Status 20)

    if (active?.status_id === 20 || active?.status_id >= 25) {
      steps.push({ id: 1, label: "Inspection & Acceptance", icon: "" });
    }

    // LOA step (Status 22)

    if (active?.status_id === 22 || active?.status_id >= 25) {
      steps.push({ id: 2, label: "Document Preview", icon: "" });
    }

    // Document Preview step (Status 25 and above)
    if (active?.status_id >= 25) {
      steps.push({ id: 3, label: "Document Preview", icon: "" });
    }

    return steps;
  };

  const steps = getAvailableSteps();

  // Determine which document types are available based on status

  const getAvailableDocuments = (): ("delivery" | "iar" | "loa" | "dv")[] => {
    const documents: ("delivery" | "iar" | "loa" | "dv")[] = [];

    // Status 21 (IAR Processing) - External work, no documents needed

    if (active?.status_id === 21) {
      return documents; // No documents for external work
    }

    // Delivery Receipt available only for statuses 18 & 19

    if (active?.status_id === 18 || active?.status_id === 19) {
      documents.push("delivery");
    }

    // Status 20 (Delivery IAR) - Show IAR, LOA, and DV documents

    if (active?.status_id === 20) {
      documents.push("iar", "loa", "dv");
    }

    // Status 22 (Delivery LOA) - Show IAR, LOA, and DV documents for preview forwarding to Division Chief

    if (active?.status_id === 22) {
      documents.push("iar", "loa", "dv");
    }

    // Status 23 (Delivery DV) - Show IAR, LOA, and DV documents

    if (active?.status_id === 23) {
      documents.push("iar", "loa", "dv");
    }

    // For status 25 (Division Chief) - show IAR, LOA, and DV documents

    if (active?.status_id === 25) {
      documents.push("iar", "loa", "dv");
    }

    return documents;
  };

  // Reset step and selected document when modal opens or status changes

  useEffect(() => {
    if (visible) {
      setCurrentStep(1);

      // Reset selected document to first available document for current status

      const availableDocuments = getAvailableDocuments();

      if (
        availableDocuments.length > 0 &&
        !availableDocuments.includes(selectedDocument)
      ) {
        setSelectedDocument(availableDocuments[0]);
      }

      // For Delivery (Received), force selection to delivery receipt only

      if (active?.status_id === 19) {
        setSelectedDocument("delivery");
      }

      // For Status 21 (IAR Processing), clear selected document since no documents are available

      if (active?.status_id === 21) {
        setSelectedDocument("delivery"); // Reset to default, but won't be used since no documents available
      }
    }
  }, [visible, active?.status_id]);

  // Update selected document when status changes

  useEffect(() => {
    const availableDocuments = getAvailableDocuments();

    if (
      availableDocuments.length > 0 &&
      !availableDocuments.includes(selectedDocument)
    ) {
      setSelectedDocument(availableDocuments[0]);
    }
  }, [active?.status_id]);

  // Initialize iar_po_items with PO items when poData is available and iar_po_items is empty
  useEffect(() => {
    if (
      poData?.purchase_order_items &&
      (!iar?.iar_po_items || iar.iar_po_items.length === 0)
    ) {
      const poItems = poData.purchase_order_items;
      const initialItems = poItems.map((poItem: any, index: number) => ({
        id: `po_${index}_${Date.now()}`,
        stock_no: poItem.stock_no || "",
        unit: poItem.unit || "",
        description: poItem.description || "",
        quantity: poItem.quantity?.toString() || "0",
        unit_cost: poItem.unit_price?.toString() || "0",
        total_cost: poItem.subtotal?.toString() || "0",
      }));
      setIar((p: any) => ({
        ...(p ?? {}),
        iar_po_items: initialItems,
        items_complete: null,
        inspection_verified: null,
      }));
    }
  }, [poData]);

  if (!visible) return null;

  const renderFormContent = () => {
    // Status 21 (IAR Processing) - External work, comprehensive information

    if (active?.status_id === 21) {
      return (
        <div className="max-h-[600px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100 sticky top-0 bg-white z-10">
            Delivery Status: IAR Processing - External Work Phase
          </h3>

          {/* Status Overview */}

          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">21</span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-purple-900 mb-2">
                  IAR Processing Status
                </h4>

                <p className="text-xs text-purple-800 leading-5">
                  The Inspection & Acceptance Report (IAR) is being processed by
                  external departments or offices. This phase involves
                  verification, approval, and documentation processes that occur
                  outside the immediate delivery workflow.
                </p>
              </div>
            </div>
          </div>

          {/* What This Status Means */}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">i</span>
              </span>
              What This Status Means
            </h4>

            <ul className="space-y-2 text-xs text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>

                <span>
                  IAR document is under review by external authorities
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>

                <span>Administrative approval processes are in progress</span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>

                <span>
                  Quality assurance and compliance verification ongoing
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>

                <span>Financial and budgetary reviews may be underway</span>
              </li>
            </ul>
          </div>

          {/* Required Actions */}

          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">✓</span>
              </span>
              Required Actions
            </h4>

            <ul className="space-y-2 text-xs text-green-800">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>

                <span>
                  Set status flag to track external processing progress
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>

                <span>
                  Monitor IAR processing status with external departments
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>

                <span>Follow up on pending approvals if delays occur</span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>

                <span>
                  Prepare for next phase once IAR processing completes
                </span>
              </li>
            </ul>
          </div>

          {/* Next Steps in Process */}

          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">→</span>
              </span>
              Next Steps in Process
            </h4>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  20
                </div>

                <div className="flex-1">
                  <p className="text-xs font-medium text-indigo-800">
                    IAR Processing (Current)
                  </p>

                  <p className="text-xs text-indigo-600">
                    External review and approval phase
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  22
                </div>

                <div className="flex-1">
                  <p className="text-xs font-medium text-indigo-800">
                    Delivery (Delivery (Forward LOA / IAR))
                  </p>

                  <p className="text-xs text-indigo-600">
                    Letter of Authority generation and forwarding
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  23
                </div>

                <div className="flex-1">
                  <p className="text-xs font-medium text-indigo-800">
                    Delivery (DV)
                  </p>

                  <p className="text-xs text-indigo-600">
                    Disbursement Voucher preparation
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}

          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">!</span>
              </span>
              Important Notes
            </h4>

            <ul className="space-y-2 text-xs text-red-800">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>

                <span>
                  IAR processing timeline varies by department and workload
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>

                <span>
                  Document any delays or issues in the status flag comments
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>

                <span>
                  Maintain communication with external processing offices
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>

                <span>
                  Ensure all IAR requirements are met before this phase
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>

                <span>
                  Prepare LOA documents in advance for faster processing
                </span>
              </li>
            </ul>
          </div>
        </div>
      );
    }

    // Delivery Receipt - Comprehensive content for Delivery (Waiting) status

    if (selectedDocument === "delivery") {
      // Show comprehensive information for status 18 (Delivery Waiting)

      if (active?.status_id === 18) {
        return (
          <div className="max-h-[600px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100 sticky top-0 bg-white z-10">
              Delivery Status: Waiting for Receipt
            </h3>

            {/* Status Overview */}

            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">18</span>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">
                    Delivery (Waiting) Status
                  </h4>

                  <p className="text-xs text-amber-800 leading-5">
                    The Purchase Order has been served to the supplier and
                    delivery is expected. This status indicates that we are
                    waiting for the supplier to deliver the goods/services and
                    for the delivery to be physically received by our office.
                  </p>
                </div>
              </div>
            </div>

            {/* What This Status Means */}

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">ℹ</span>
                </span>
                What This Status Means
              </h4>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="space-y-2 text-xs text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>

                    <span>
                      Purchase Order has been officially served to the supplier
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>

                    <span>
                      Supplier is expected to deliver the ordered goods/services
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>

                    <span>
                      Physical delivery has not yet been received by our office
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>

                    <span>
                      Delivery receipt information will be captured upon actual
                      receipt
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Required Actions */}

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">✓</span>
                </span>
                Required Actions
              </h4>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">1.</span>

                    <div>
                      <p className="text-xs font-medium text-green-900">
                        Monitor Delivery Progress
                      </p>

                      <p className="text-xs text-green-700">
                        Track the supplier's delivery timeline and coordinate
                        with relevant departments
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">2.</span>

                    <div>
                      <p className="text-xs font-medium text-green-900">
                        Prepare for Receipt
                      </p>

                      <p className="text-xs text-green-700">
                        Ensure receiving area and personnel are ready for
                        incoming delivery
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">3.</span>

                    <div>
                      <p className="text-xs font-medium text-green-900">
                        Update Status When Received
                      </p>

                      <p className="text-xs text-green-700">
                        Change status to "Delivery (Received)" once goods are
                        physically received
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">→</span>
                </span>
                Next Steps in Process
              </h4>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="space-y-2 text-xs text-purple-800">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                      19
                    </div>

                    <span className="font-medium">Delivery (Received)</span>

                    <span className="text-purple-600">
                      - Capture delivery receipt details
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                      20
                    </div>

                    <span className="font-medium">Delivery (IAR)</span>

                    <span className="text-purple-600">
                      - Complete Inspection and Acceptance Report
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                      21
                    </div>

                    <span className="font-medium">
                      Delivery (IAR Processing)
                    </span>

                    <span className="text-purple-600">
                      - Process IAR for approval
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">!</span>
                </span>
                Important Notes
              </h4>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <ul className="space-y-2 text-xs text-red-800">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>

                    <span>
                      Do not proceed to IAR processing until physical delivery
                      is received
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>

                    <span>
                      Ensure all delivered items match the Purchase Order
                      specifications
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>

                    <span>
                      Document any discrepancies or damages upon receipt
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>

                    <span>
                      Contact supplier immediately if delivery is delayed beyond
                      agreed timeline
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
      }

      // Show comprehensive information for status 19 (Delivery Received) before the form

      if (active?.status_id === 19) {
        return (
          <div className="max-h-[600px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100 sticky top-0 bg-white z-10">
              Delivery Status: Received - Capture Receipt Details
            </h3>

            {/* Delivery Receipt Form - Moved to Top */}

            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
                Delivery Receipt Information
              </h3>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-xs text-amber-800 font-medium mb-2">
                  📋 Complete the delivery receipt details below:
                </p>

                <p className="text-xs text-amber-700">
                  All required fields must be filled out before proceeding to
                  the IAR phase.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Delivery Receipt No. (DR No.){" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="text"
                      value={drNo}
                      onChange={(e) => setDrNo(e.target.value)}
                      placeholder="e.g. 113039"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes - Only for Delivery Receipt Information */}

            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
                Notes
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Notes / Remarks
                  </label>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes for this delivery record…"
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Status Overview */}

            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">19</span>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-green-900 mb-2">
                    Delivery (Received) Status
                  </h4>

                  <p className="text-xs text-green-800 leading-5">
                    The goods/services have been physically received from the
                    supplier. This status requires capturing the delivery
                    receipt details and verifying that all items match the
                    Purchase Order specifications before proceeding to the
                    Inspection and Acceptance Report (IAR) phase.
                  </p>
                </div>
              </div>
            </div>

            {/* What This Status Means */}

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">ℹ</span>
                </span>
                What This Status Means
              </h4>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="space-y-2 text-xs text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>

                    <span>
                      Physical delivery has been received and verified
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>

                    <span>
                      Delivery receipt information must be captured and
                      documented
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>

                    <span>
                      Items need to be inspected for quantity and quality
                      compliance
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>

                    <span>
                      Ready to proceed to IAR (Inspection & Acceptance Report)
                      phase
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Required Actions */}

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">✓</span>
                </span>
                Required Actions
              </h4>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">1.</span>

                    <div>
                      <p className="text-xs font-medium text-green-900">
                        Capture Delivery Receipt Details
                      </p>

                      <p className="text-xs text-green-700">
                        Enter DR No. in the form below
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">2.</span>

                    <div>
                      <p className="text-xs font-medium text-green-900">
                        Verify Delivery Contents
                      </p>

                      <p className="text-xs text-green-700">
                        Ensure all items match Purchase Order specifications
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">3.</span>

                    <div>
                      <p className="text-xs font-medium text-green-900">
                        Document Discrepancies
                      </p>

                      <p className="text-xs text-green-700">
                        Note any damages, shortages, or non-conforming items
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">4.</span>

                    <div>
                      <p className="text-xs font-medium text-green-900">
                        Prepare for IAR
                      </p>

                      <p className="text-xs text-green-700">
                        Gather documentation for Inspection & Acceptance Report
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">→</span>
                </span>
                Next Steps in Process
              </h4>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="space-y-2 text-xs text-purple-800">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                      20
                    </div>

                    <span className="font-medium">Delivery (IAR)</span>

                    <span className="text-purple-600">
                      - Complete Inspection and Acceptance Report
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                      21
                    </div>

                    <span className="font-medium">
                      Delivery (IAR Processing)
                    </span>

                    <span className="text-purple-600">
                      - Process IAR for approval
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                      22
                    </div>

                    <span className="font-medium">
                      Delivery (Forward LOA / IAR)
                    </span>

                    <span className="text-purple-600">
                      - Generate Letter of Authority
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">!</span>
                </span>
                Important Notes
              </h4>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <ul className="space-y-2 text-xs text-red-800">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>

                    <span>
                      Delivery Receipt No. (DR No.) is required and must be
                      accurate
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>

                    <span>
                      Verify all delivered items against the Purchase Order
                      before signing
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>

                    <span>
                      Document any discrepancies immediately with photos and
                      written notes
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>

                    <span>
                      Ensure proper storage and security of received items
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
            Delivery Receipt
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Delivery Receipt No. (DR No.){" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={drNo}
                  onChange={(e) => setDrNo(e.target.value)}
                  placeholder="e.g. 11930"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // IAR Form

    if (selectedDocument === "iar") {
      return (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
            Inspection & Acceptance Report (IAR)
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  IAR No. <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={iar?.iar_no ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),

                      iar_no: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. IAR-2026-0015"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Responsibility Center Code
                </label>

                <input
                  type="text"
                  value={iar?.responsibility_center_code ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),
                      responsibility_center_code: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. 100000"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Invoice No. <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={iar?.invoice_no ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),

                      invoice_no: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. INV-2026-0042"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Invoice Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={iar?.invoice_date ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),

                      invoice_date: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. 2024-01-15"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  IAR Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={iar?.iar_date ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),

                      iar_date: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. 2024-01-15"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Date Inspected
                </label>

                <input
                  type="text"
                  value={iar?.inspected_at ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),

                      inspected_at: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. 2024-01-15"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Date Received
                </label>

                <input
                  type="text"
                  value={iar?.received_at ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),

                      received_at: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. 2024-01-15"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Inspection Officer/Inspection Committee{" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={iar?.inspection_officer ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),

                      inspection_officer: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="Name of Inspection Officer or Committee"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ARPT/SUPPLY OFFICER <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={iar?.supply_officer ?? ""}
                  onChange={(e) =>
                    setIar((p: any) => ({
                      ...(p ?? {}),

                      supply_officer: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="Name of ARPT or Supply Officer"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>
            </div>

            {/* Inspection Verification */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Inspection Verification <span className="text-red-500">*</span>
              </label>

              <div className="space-y-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label
                  className={`flex items-center gap-3 p-2 transition-colors rounded-lg ${
                    active?.status_id === 25
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={iar?.inspection_verified === true}
                    onChange={(e) =>
                      setIar((p: any) => ({
                        ...(p ?? {}),

                        inspection_verified: e.target.checked,
                      }))
                    }
                    disabled={active?.status_id === 25}
                    className={`w-4 h-4 rounded focus:ring-2 ${
                      active?.status_id === 25
                        ? "text-gray-400 border-gray-300 cursor-not-allowed"
                        : "text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    }`}
                  />

                  <span className="text-sm text-gray-700">
                    Inspected, verified and found in order as to quantity and
                    specifications
                  </span>
                </label>
              </div>
            </div>

            {/* Inspection Confirmation */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Inspection Confirmation <span className="text-red-500">*</span>
              </label>

              <div className="space-y-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label
                  className={`flex items-center gap-3 p-2 transition-colors rounded-lg ${
                    active?.status_id === 25
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={iar?.items_complete === true}
                    onChange={(e) =>
                      setIar((p: any) => ({
                        ...(p ?? {}),

                        items_complete: e.target.checked,
                      }))
                    }
                    disabled={active?.status_id === 25}
                    className={`w-4 h-4 rounded focus:ring-2 ${
                      active?.status_id === 25
                        ? "text-gray-400 border-gray-300 cursor-not-allowed"
                        : "text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    }`}
                  />

                  <span className="text-sm text-gray-700">
                    Complete Delivery
                  </span>
                </label>

                {/* Partial row — only shown when Complete is NOT checked */}
                {iar?.items_complete === false && (
                  <label
                    className={`flex items-center gap-3 p-2 transition-colors rounded-lg ${
                      active?.status_id === 25
                        ? "cursor-not-allowed"
                        : "cursor-pointer hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={iar?.items_complete === false}
                      onChange={(e) =>
                        setIar((p: any) => ({
                          ...(p ?? {}),

                          items_complete: !e.target.checked,
                        }))
                      }
                      disabled={active?.status_id === 25}
                      className={`w-4 h-4 rounded focus:ring-2 ${
                        active?.status_id === 25
                          ? "text-gray-400 border-gray-300 cursor-not-allowed"
                          : "text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      }`}
                    />

                    <span className="text-sm text-gray-700">
                      Partial (please specify quantity)
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Missing Units - Optional Input Field */}
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Edit Units <span className="text-gray-400">(Optional)</span>
                </h3>
                <button
                  onClick={() => {
                    const currentItems = iar?.iar_po_items || [];

                    // Add a single empty row
                    const newItem = {
                      id:
                        Date.now().toString() +
                        "_" +
                        Math.random().toString(36).substr(2, 9),
                      stock_no: "",
                      unit: "",
                      description: "",
                      quantity: "0",
                      unit_cost: "0",
                      total_cost: "0",
                    };

                    setIar((p: any) => ({
                      ...(p ?? {}),
                      iar_po_items: [...currentItems, newItem],
                    }));
                  }}
                  disabled={active?.status_id === 25}
                  className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold px-3 py-1.5 border border-dashed border-emerald-300 rounded hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RiAddLine size={14} /> Add Row
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800 mb-3">
                  Edit the existing PO items below or add additional rows if
                  needed for items supplied but not in the original PO.
                </p>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(iar?.iar_po_items || []).map((item: any, index: number) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative"
                    >
                      {(iar?.iar_po_items || []).length > 1 && (
                        <button
                          onClick={() => {
                            const currentItems = iar?.iar_po_items || [];
                            const updatedItems = currentItems.filter(
                              (_: any, i: number) => i !== index,
                            );
                            setIar((p: any) => ({
                              ...(p ?? {}),
                              iar_po_items: updatedItems,
                            }));
                          }}
                          disabled={active?.status_id === 25}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ×
                        </button>
                      )}
                      <div className="text-xs font-bold text-gray-500 mb-2 uppercase">
                        ITEM {index + 1}
                      </div>

                      <div className="mb-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                          Item Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const currentItems = iar?.iar_po_items || [];
                            const updatedItems = [...currentItems];
                            updatedItems[index] = {
                              ...updatedItems[index],
                              description: e.target.value,
                            };
                            setIar((p: any) => ({
                              ...(p ?? {}),
                              iar_po_items: updatedItems,
                            }));
                          }}
                          readOnly={active?.status_id === 25}
                          placeholder="Describe the item"
                          className={`w-full px-2 py-1.5 text-xs rounded border ${
                            active?.status_id === 25
                              ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                              : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                            Stock/Prop No.
                          </label>
                          <input
                            type="text"
                            value={item.stock_no}
                            onChange={(e) => {
                              const currentItems = iar?.iar_po_items || [];
                              const updatedItems = [...currentItems];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                stock_no: e.target.value,
                              };
                              setIar((p: any) => ({
                                ...(p ?? {}),
                                iar_po_items: updatedItems,
                              }));
                            }}
                            readOnly={active?.status_id === 25}
                            placeholder="—"
                            className={`w-full px-2 py-1.5 text-xs rounded border ${
                              active?.status_id === 25
                                ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                                : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                            Unit
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => {
                              const currentItems = iar?.iar_po_items || [];
                              const updatedItems = [...currentItems];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                unit: e.target.value,
                              };
                              setIar((p: any) => ({
                                ...(p ?? {}),
                                iar_po_items: updatedItems,
                              }));
                            }}
                            disabled={active?.status_id === 25}
                            className={`w-full px-2 py-1.5 text-xs rounded border ${
                              active?.status_id === 25
                                ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                                : "border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                            }`}
                          >
                            <option value="">Select Unit</option>
                            <option value="pcs">pcs</option>
                            <option value="sets">sets</option>
                            <option value="boxes">boxes</option>
                            <option value="kg">kg</option>
                            <option value="liters">liters</option>
                            <option value="meters">meters</option>
                            <option value="units">units</option>
                            <option value="dozens">dozens</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                            Qty
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const currentItems = iar?.iar_po_items || [];
                              const updatedItems = [...currentItems];
                              const quantity = e.target.value;
                              const unitCost = parseFloat(item.unit_cost) || 0;
                              const totalCost =
                                (parseFloat(quantity) || 0) * unitCost;
                              updatedItems[index] = {
                                ...updatedItems[index],
                                quantity: e.target.value,
                                total_cost: totalCost.toFixed(2),
                              };
                              setIar((p: any) => ({
                                ...(p ?? {}),
                                iar_po_items: updatedItems,
                              }));
                            }}
                            readOnly={active?.status_id === 25}
                            placeholder="0"
                            className={`w-full px-2 py-1.5 text-xs rounded border ${
                              active?.status_id === 25
                                ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                                : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                            Unit Cost
                          </label>
                          <input
                            type="number"
                            value={item.unit_cost}
                            onChange={(e) => {
                              const currentItems = iar?.iar_po_items || [];
                              const updatedItems = [...currentItems];
                              const unitCost = e.target.value;
                              const quantity = parseFloat(item.quantity) || 0;
                              const totalCost =
                                quantity * (parseFloat(unitCost) || 0);
                              updatedItems[index] = {
                                ...updatedItems[index],
                                unit_cost: e.target.value,
                                total_cost: totalCost.toFixed(2),
                              };
                              setIar((p: any) => ({
                                ...(p ?? {}),
                                iar_po_items: updatedItems,
                              }));
                            }}
                            readOnly={active?.status_id === 25}
                            placeholder="0.00"
                            className={`w-full px-2 py-1.5 text-xs rounded border ${
                              active?.status_id === 25
                                ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                                : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                            Total Cost
                          </label>
                          <input
                            type="text"
                            value={item.total_cost}
                            readOnly
                            placeholder="0.00"
                            className="w-full px-2 py-1.5 text-xs rounded border font-mono bg-emerald-50 text-emerald-700 border-gray-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {(iar?.iar_po_items || []).length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">No items to display.</p>
                      <p className="text-xs">
                        Click "Add Row" to add items that were supplied but not
                        in the original PO.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Status 22 (Delivery LOA) - Show preview only when no valid document is selected, otherwise show document forms

    if (
      active?.status_id === 22 &&
      !getAvailableDocuments().includes(selectedDocument as any)
    ) {
      const hasIarData =
        iar && Object.keys(iar).length > 0 && iar?.iar_no?.trim() !== "";

      return (
        <div
          className={`rounded-xl px-4 py-3 ${hasIarData ? "bg-blue-50 border border-blue-200" : "bg-yellow-50 border border-yellow-200"}`}
        >
          <p
            className={`text-sm leading-5 ${hasIarData ? "text-blue-900" : "text-yellow-900"}`}
          >
            {hasIarData ? (
              <>
                Preview documents for forwarding to Division Chief for
                signature. This step allows you to review the IAR and LOA
                documents before sending them to the Division Chief for final
                approval.
              </>
            ) : (
              <>
                <strong>⚠️ IAR data required:</strong> You must complete the IAR
                form before forwarding to Division Chief. Please go back and
                ensure all IAR fields are filled out and saved.
              </>
            )}
          </p>
        </div>
      );
    }

    // LOA Form (when LOA is selected)

    if (selectedDocument === "loa") {
      return (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
            Acceptance (LOA)
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Invoice No. <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={loa?.invoice_no ?? ""}
                  onChange={(e) =>
                    setLoa((p: any) => ({
                      ...(p ?? {}),

                      invoice_no: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. INV-2026-0042"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  PO Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={loa?.po_date ?? ""}
                  onChange={(e) =>
                    setLoa((p: any) => ({
                      ...(p ?? {}),

                      po_date: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. 2024-01-15"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Invoice Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={loa?.invoice_date ?? ""}
                  onChange={(e) =>
                    setLoa((p: any) => ({
                      ...(p ?? {}),

                      invoice_date: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. 2024-01-15"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Acceptance Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={loa?.accepted_at ?? ""}
                  onChange={(e) =>
                    setLoa((p: any) => ({
                      ...(p ?? {}),

                      accepted_at: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="e.g. 2024-01-15"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Accepted By (Name) <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={loa?.accepted_by_name ?? ""}
                  onChange={(e) =>
                    setLoa((p: any) => ({
                      ...(p ?? {}),

                      accepted_by_name: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="Printed name"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Accepted By (Title/Designation){" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={loa?.accepted_by_title ?? ""}
                  onChange={(e) =>
                    setLoa((p: any) => ({
                      ...(p ?? {}),

                      accepted_by_title: e.target.value,
                    }))
                  }
                  readOnly={active?.status_id === 25}
                  placeholder="Position title"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                    active?.status_id === 25
                      ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                      : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Status 23 (Delivery DV) - This status is now skipped in workflow

    // DV Form (for other statuses when DV is selected)

    if (selectedDocument === "dv") {
      return (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
            Disbursement Voucher (DV)
          </h3>

          <h2 className="text-xs font-semibold text-gray-700 mb-5">
            Payee, Address and other data are pre-filled from PO/ORS, input if
            there are any discrepancies or changes.
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Payee <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={dv?.payee ?? poData?.supplier ?? ""}
                  onChange={(e) =>
                    setDv((p: any) => ({ ...(p ?? {}), payee: e.target.value }))
                  }
                  placeholder="Supplier / Payee name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Payee TIN <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={dv?.payee_tin ?? poData?.tin ?? ""}
                  onChange={(e) =>
                    setDv((p: any) => ({
                      ...(p ?? {}),

                      payee_tin: e.target.value,
                    }))
                  }
                  placeholder="XXX-XXX-XXX-XXX"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Address <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                value={dv?.address ?? poData?.address ?? ""}
                onChange={(e) =>
                  setDv((p: any) => ({ ...(p ?? {}), address: e.target.value }))
                }
                placeholder="Payee address"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Particulars <span className="text-red-500">*</span>
              </label>

              <textarea
                value={dv?.particulars ?? ""}
                onChange={(e) =>
                  setDv((p: any) => ({
                    ...(p ?? {}),

                    particulars: e.target.value,
                  }))
                }
                placeholder="Brief description of payment"
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Certified Name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={dv?.certified_by_name ?? ""}
                  onChange={(e) =>
                    setDv((p: any) => ({
                      ...(p ?? {}),
                      certified_by_name: e.target.value,
                    }))
                  }
                  placeholder="Certified by"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Position <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={dv?.certified_by_position ?? ""}
                  onChange={(e) =>
                    setDv((p: any) => ({
                      ...(p ?? {}),
                      certified_by_position: e.target.value,
                    }))
                  }
                  placeholder="Position/Designation"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Status 24: End-User Forward - This status is now skipped in workflow

    // Status 25: Division Chief - Show preview only when no valid document is selected, otherwise show document forms

    if (
      active?.status_id === 25 &&
      !getAvailableDocuments().includes(selectedDocument as any)
    ) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-sm text-emerald-900 leading-5">
            Finalize inspection and acceptance for this delivery. Review all
            documents (IAR and LOA) before submitting. Submitting marks the
            delivery phase as complete and moves the record to Payment and
            Closure.
          </p>
        </div>
      );
    }

    return null;
  };

  const renderPreviewContent = () => {
    const availableDocuments = getAvailableDocuments();

    // Check if selected document is available for current status

    if (!availableDocuments.includes(selectedDocument)) {
      return (
        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">
            This document is not available at the current delivery stage.
          </p>

          <p className="text-xs mt-2">
            Please proceed to the appropriate stage to access this document.
          </p>
        </div>
      );
    }

    // Delivery Receipt

    if (selectedDocument === "delivery") {
      return (
        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">
            No document preview available for delivery receipt.
          </p>

          <p className="text-xs mt-2">
            Proceed to the next stage to view document previews.
          </p>
        </div>
      );
    }

    // Show selected document preview

    if (selectedDocument === "iar") {
      return (
        <IAREditablePreview
          delivery={active}
          iar={iar || {}}
          poData={poData}
          setIar={setIar}
        />
      );
    }

    if (selectedDocument === "loa") {
      return (
        <LOAEditablePreview
          delivery={active}
          loa={loa || {}}
          poData={poData}
          setLoa={setLoa}
        />
      );
    }

    if (selectedDocument === "dv") {
      return (
        <DVEditablePreview
          delivery={active}
          dv={dv || {}}
          poData={poData}
          setDv={setDv}
        />
      );
    }

    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">Select a document to preview.</p>
      </div>
    );
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canGoNext = () => {
    // Status 21 (IAR Processing) - External work, require status flag

    if (active?.status_id === 21) {
      return statusFlag !== null;
    }

    // Delivery (Waiting) - require status flag to be set

    if (active?.status_id === 18) {
      return statusFlag !== null;
    }

    // Delivery (Received) - require DR number

    if (active?.status_id === 19) {
      return drNo.trim() !== "";
    }

    // Status 25 (Division Chief) - require status flag

    if (active?.status_id === 25) {
      return statusFlag !== null;
    }

    return true;
  };

  const getSubmitButtonText = () => {
    if (active?.status_id === 21) return "Update Status Flag";

    if (active?.status_id === 22)
      return "Forward to Division Chief for Signature";

    if (active?.status_id === 25) return "Submit & Complete Delivery Phase";

    if (steps.length > 1 && currentStep === steps.length)
      return "Save & Complete";

    return "Save & Update";
  };

  const handlePrintPDF = async () => {
    try {
      let html: string | null = null;

      // Transform poData to have the correct structure for JSX generation
      const transformedPoData = poData
        ? {
            ...poData,
            po_items: poData.purchase_order_items || [],
            po_date: poData.date, // Map PO date to template's po_date placeholder
          }
        : {};

      const mergedData = { ...active, ...transformedPoData };

      // Explicitly preserve PO fields from transformedPoData
      if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;
      if (transformedPoData.po_date)
        mergedData.po_date = transformedPoData.po_date;

      if (selectedDocument === "iar") {
        const iarData = { ...mergedData, ...iar };
        // Use iar_po_items if available (editable PO items), otherwise fall back to po_items
        iarData.po_items = iar?.iar_po_items || mergedData.po_items;
        if (mergedData.po_no) iarData.po_no = mergedData.po_no;
        if (mergedData.po_date) iarData.po_date = mergedData.po_date;
        console.log("IAR data for JSX PDF generation:", iarData);

        // Use JSX-based HTML generation (synchronous now)
        html = buildIARHtml(iarData);
      } else if (selectedDocument === "loa") {
        const loaData = { ...mergedData, ...loa };
        loaData.po_items = mergedData.po_items;
        if (mergedData.po_no) loaData.po_no = mergedData.po_no;
        // PO date should not be copied to LOA - keep it blank

        // Use JSX-based HTML generation (synchronous now)
        html = buildLOAHtml(loaData);
      } else if (selectedDocument === "dv") {
        const dvData = { ...mergedData, ...dv };
        dvData.po_items = mergedData.po_items;
        if (mergedData.po_no) dvData.po_no = mergedData.po_no;
        if (mergedData.po_date) dvData.po_date = mergedData.po_date;

        // Use JSX-based HTML generation (synchronous now)
        html = buildDVHtml(dvData);
      }

      if (html) {
        downloadPDF(html);
      } else {
        alert(
          "Unable to generate PDF. Please ensure all required fields are filled.",
        );
      }
    } catch (error) {
      console.error("Error generating PDF:", error);

      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}

        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">{deliveryNo}</h2>

            <p className="text-emerald-100 text-sm mt-1">{statusLabel}</p>
          </div>
        </div>

        {/* Body */}

        <div className="flex flex-1 overflow-hidden">
          {/* Form Side */}

          <div
            className={`${active?.status_id === 18 || active?.status_id === 19 || active?.status_id === 21 ? "flex-[1]" : "flex-[2]"} flex-col overflow-hidden ${active?.status_id === 18 || active?.status_id === 19 || active?.status_id === 21 ? "" : "border-r border-gray-200"}`}
          >
            <div
              className="overflow-y-auto flex-1 px-8 py-6 space-y-6 scroll-smooth"
              style={{ maxHeight: "calc(90vh - 200px)" }}
            >
              {/* Status Flag - Always show at top */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
                  Status Flag
                </h3>
                <FlagButton selected={statusFlag} onPress={onPressStatusFlag} />
              </div>

              {/* Document Type Tabs - Hide for Delivery (Received), Delivery (Waiting), and IAR Processing since comprehensive content is shown */}

              {active?.status_id !== 19 &&
                active?.status_id !== 18 &&
                active?.status_id !== 21 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
                      Document Type
                    </h3>

                    <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200 w-fit">
                      {getAvailableDocuments().includes("delivery") && (
                        <button
                          onClick={() => setSelectedDocument("delivery")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                            selectedDocument === "delivery"
                              ? "bg-emerald-700 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          Delivery
                        </button>
                      )}

                      {getAvailableDocuments().includes("iar") && (
                        <button
                          onClick={() => setSelectedDocument("iar")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                            selectedDocument === "iar"
                              ? "bg-emerald-700 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          IAR
                        </button>
                      )}

                      {getAvailableDocuments().includes("loa") && (
                        <button
                          onClick={() => setSelectedDocument("loa")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                            selectedDocument === "loa"
                              ? "bg-emerald-700 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          LOA
                        </button>
                      )}

                      {getAvailableDocuments().includes("dv") && (
                        <button
                          onClick={() => setSelectedDocument("dv")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                            selectedDocument === "dv"
                              ? "bg-emerald-700 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          DV
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {/* Step Indicator */}

              {steps.length > 1 && active?.status_id !== 25 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">
                    Progress
                  </h3>

                  <div className="flex items-center gap-2">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                            currentStep === step.id
                              ? "bg-emerald-700 text-white"
                              : currentStep > step.id
                                ? "bg-emerald-500 text-white"
                                : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {currentStep > step.id ? (
                            <RiCheckLine size={14} />
                          ) : (
                            step.icon
                          )}
                        </div>

                        {index < steps.length - 1 && (
                          <div
                            className={`w-8 h-0.5 mx-2 transition-colors ${
                              currentStep > step.id
                                ? "bg-emerald-500"
                                : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                    ))}

                    <div className="ml-4">
                      <p className="text-xs font-medium text-gray-700">
                        Step {currentStep} of {steps.length}
                      </p>

                      <p className="text-xs text-gray-500">
                        {steps[currentStep - 1]?.label}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Content */}

              {renderFormContent()}
            </div>
          </div>

          {/* Preview Side - Hide for Status 18 (Delivery Waiting), Status 19 (Delivery Received), and Status 21 (IAR Processing) */}

          {active?.status_id !== 18 &&
            active?.status_id !== 19 &&
            active?.status_id !== 21 && (
              <div className="flex flex-[3] overflow-y-auto bg-gray-100 flex-col">
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                      LIVE PREVIEW
                    </h3>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200">
                        <div className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-700 text-white">
                          {selectedDocument === "delivery"
                            ? "Delivery"
                            : selectedDocument.toUpperCase()}
                        </div>
                      </div>

                      {selectedDocument !== "delivery" && (
                        <button
                          onClick={() => handlePrintPDF()}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          <RiFilePdf2Line size={16} /> PDF
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-8 text-black">
                    {renderPreviewContent()}
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Footer */}

        <div className="px-6 py-4 bg-white border-t border-gray-100 flex gap-2">
          {steps.length > 1 && currentStep > 1 && active?.status_id !== 25 && (
            <button
              onClick={handlePrevious}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RiArrowLeftLine size={16} />
              Previous
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          {steps.length > 1 &&
          currentStep < steps.length &&
          active?.status_id !== 25 ? (
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <RiArrowRightLine size={16} />
            </button>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!isFormValid()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getSubmitButtonText()}
            </button>
          )}
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            style={{ animation: "fadeScaleIn 0.18s ease" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <RiCheckLine className="text-white" size={22} />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">
                  Confirm Action
                </p>
                <p className="text-emerald-100 text-xs mt-0.5">
                  Please review before proceeding
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                You are about to{" "}
                <span className="font-semibold text-emerald-700">
                  {getSubmitButtonText()}
                </span>{" "}
                for delivery{" "}
                <span className="font-semibold text-gray-900">
                  {deliveryNo}
                </span>
                .
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                This action will advance the record to the next status. Make
                sure all required information has been filled in correctly
                before confirming.
              </p>

              {/* Current status pill */}
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">
                  {statusLabel}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  handleSubmit();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <RiCheckLine size={16} />
                Confirm
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeScaleIn {
              from { opacity: 0; transform: scale(0.92); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      <StatusFlagPicker
        visible={flagPickerOpen}
        selected={statusFlag}
        onSelect={onSelectStatusFlag}
        onClose={onCloseFlagPicker}
      />
    </div>
  );
}
