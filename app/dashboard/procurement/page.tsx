"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  RiAddLine, RiInboxLine, RiCloseLine, RiDeleteBinLine, RiFilePdf2Line,
  RiFileExcel2Line, RiSaveLine, RiEditLine, RiArrowDownSLine, RiArrowUpSLine,
} from "react-icons/ri";

// ── Types ──────────────────────────────────────────────────────────
type PRItem = {
  id: string;
  stockNo: string;
  unit: string;
  description: string;
  quantity: string;
  unitCost: string;
};

type PRRecord = {
  id: string;
  savedAt: string;
  entityName: string;
  fundCluster: string;
  office: string;
  prNumber: string;
  date: string;
  respCode: string;
  purpose: string;
  items: PRItem[];
  reqName: string;
  reqDesig: string;
  appName: string;
  appDesig: string;
  status: string;
};

// ── Tabs config ────────────────────────────────────────────────────
const tabs = [
  { id: "purchase-request", label: "Purchase Request", dropdown: ["Abstract of Awards", "Summary Report", "Export CSV"] },
  { id: "purchase-order", label: "Purchase Order", dropdown: ["View All Orders", "Pending Orders", "Export CSV"] },
  { id: "delivery-inspection", label: "Delivery & Inspection", dropdown: ["Inspection Reports", "Pending Delivery", "Export CSV"] },
  { id: "payment-closure", label: "Payment & Closure", dropdown: ["Payment History", "Closed Items", "Export CSV"] },
];

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "In Progress", "Completed"];

const statusColors: Record<string, string> = {
  "Pending": "bg-yellow-400",
  "Approved": "bg-emerald-500",
  "Rejected": "bg-red-500",
  "In Progress": "bg-blue-500",
  "Completed": "bg-gray-400",
};

// ── Helpers ────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function emptyItem(): PRItem {
  return { id: uid(), stockNo: "", unit: "", description: "", quantity: "", unitCost: "" };
}

function emptyRecord(): PRRecord {
  return {
    id: uid(), savedAt: new Date().toISOString(),
    entityName: "", fundCluster: "", office: "", prNumber: "",
    date: new Date().toISOString().slice(0, 10),
    respCode: "", purpose: "",
    items: [emptyItem()],
    reqName: "", reqDesig: "", appName: "", appDesig: "",
    status: "Pending",
  };
}

function getItemTotal(item: PRItem) {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0);
}

function getGrandTotal(items: PRItem[]) {
  return items.reduce((s, i) => s + getItemTotal(i), 0);
}

// ── Styles for print layout ───────────────────────────────────────
const tdStyle: React.CSSProperties = {
  border: "1px solid black",
  fontSize: "8pt",
  padding: "1px 3px",
  fontFamily: "'Times New Roman', Times, serif",
  color: "#000",
  overflow: "hidden",
  wordWrap: "break-word",
  whiteSpace: "normal",
};

const thStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "center",
  fontWeight: "bold",
};

// ── PR Preview Component ───────────────────────────────────────────
function PRPreview({ pr }: { pr: PRRecord }): React.ReactElement {
  const itemRows = [...pr.items];
  while (itemRows.length < 30) itemRows.push(emptyItem());

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "9pt", color: "#000" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", color: "#000", tableLayout: "fixed" }}>
        <tbody>
          <tr style={{ height: "27px" }}>
            <td colSpan={6} style={{ textAlign: "right", fontSize: "10pt", paddingRight: "4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>
              Appendix 60
            </td>
          </tr>
          <tr style={{ height: "34px" }}>
            <td colSpan={6} style={{ textAlign: "center", fontWeight: "bold", fontSize: "12pt", fontFamily: "'Times New Roman', serif", color: "#000" }}>
              PURCHASE REQUEST
            </td>
          </tr>
          <tr style={{ height: "21px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", fontSize: "8pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", fontWeight: "bold", color: "#000", overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
              Entity Name: <span style={{ fontWeight: "normal" }}>{pr.entityName}</span>
            </td>
            <td style={{ borderBottom: "1px solid black" }}></td>
            <td colSpan={3} style={{ borderBottom: "1px solid black", fontSize: "8pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", fontWeight: "bold", color: "#000", overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
              Fund Cluster: <span style={{ fontWeight: "normal" }}>{pr.fundCluster}</span>
            </td>
          </tr>
          <tr style={{ height: "14px" }}>
            <td rowSpan={2} colSpan={2} style={{ border: "1px solid black", fontSize: "8pt", verticalAlign: "top", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000", overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
              Office/Section :<br />{pr.office}
            </td>
            <td colSpan={2} style={{ borderTop: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black", fontSize: "8pt", fontWeight: "bold", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000", overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
              PR No.: <span style={{ fontWeight: "normal" }}>{pr.prNumber}</span>
            </td>
            <td rowSpan={2} colSpan={2} style={{ border: "1px solid black", fontSize: "8pt", fontWeight: "bold", verticalAlign: "top", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000", overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
              Date:<br /><span style={{ fontWeight: "normal" }}>{pr.date}</span>
            </td>
          </tr>
          <tr style={{ height: "15px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", fontSize: "8pt", fontWeight: "bold", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000", overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
              Responsibility Center Code : <span style={{ fontWeight: "normal" }}>{pr.respCode}</span>
            </td>
          </tr>
          <tr style={{ height: "22.5px" }}>
            <th style={thStyle}>Stock/<br />Property No.</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Item Description</th>
            <th style={thStyle}>Quantity</th>
            <th style={thStyle}>Unit Cost</th>
            <th style={thStyle}>Total Cost</th>
          </tr>
          {itemRows.map((item, idx) => {
            const total = getItemTotal(item);
            return (
              <tr key={idx} style={{ height: "11px" }}>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.stockNo}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.unit}</td>
                <td style={{ ...tdStyle, textAlign: "left", padding: "1px 4px" }}>{item.description}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.quantity}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{item.unitCost ? parseFloat(item.unitCost).toFixed(2) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{total > 0 ? total.toFixed(2) : ""}</td>
              </tr>
            );
          })}
          <tr style={{ height: "17px" }}>
            <td colSpan={6} style={{ borderTop: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000", overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal" }}>
              <b>Purpose:</b> {pr.purpose}
            </td>
          </tr>
          <tr style={{ height: "30px" }}>
            <td colSpan={6} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "12px" }}>
            <td style={{ borderTop: "1px solid black", borderLeft: "1px solid black", fontFamily: "'Times New Roman', serif", color: "#000" }}></td>
            <td colSpan={2} style={{ borderTop: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>
              <i>Requested by:</i>
            </td>
            <td colSpan={2} style={{ borderTop: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>
              <i>Approved by:</i>
            </td>
            <td style={{ borderTop: "1px solid black", borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "12px" }}>
            <td colSpan={2} style={{ borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>
              Signature :
            </td>
            <td></td><td></td><td></td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "12px" }}>
            <td colSpan={2} style={{ borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>
              Printed Name :
            </td>
            <td style={{ fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>{pr.reqName}</td>
            <td colSpan={2} style={{ fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>{pr.appName}</td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "14.75px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>
              Designation :
            </td>
            <td style={{ borderBottom: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>{pr.reqDesig}</td>
            <td colSpan={2} style={{ borderBottom: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", fontFamily: "'Times New Roman', serif", color: "#000" }}>{pr.appDesig}</td>
            <td style={{ borderBottom: "1px solid black", borderRight: "1px solid black" }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Build Appendix 60 HTML string for export ───────────────────────
function buildPRHtml(pr: PRRecord): string {
  // This function now generates HTML from the same data structure
  // Used only for PDF export
  const itemRows = [...pr.items];
  while (itemRows.length < 30) itemRows.push(emptyItem());
  const td = `border:1px solid black;font-size:8pt;padding:1px 3px;font-family:'Times New Roman',Times,serif;color:#000;`;

  const rows = itemRows.map((it) => {
    const tot = getItemTotal(it);
    return `<tr style="height:11px">
      <td style="${td}text-align:center">${it.stockNo}</td>
      <td style="${td}text-align:center">${it.unit}</td>
      <td style="${td}text-align:left;padding:1px 4px">${it.description}</td>
      <td style="${td}text-align:center">${it.quantity}</td>
      <td style="${td}text-align:right">${it.unitCost ? parseFloat(it.unitCost).toFixed(2) : ""}</td>
      <td style="${td}text-align:right">${tot > 0 ? tot.toFixed(2) : ""}</td>
    </tr>`;
  }).join("");

  return `
  <div style="font-family:'Times New Roman',Times,serif;font-size:9pt;color:#000">
    <table style="width:100%;border-collapse:collapse;color:#000">
      <tbody>
        <tr style="height:27px"><td colspan="6" style="text-align:right;font-size:10pt;padding-right:4px;font-family:'Times New Roman',serif;color:#000">Appendix 60</td></tr>
        <tr style="height:34px"><td colspan="6" style="text-align:center;font-weight:bold;font-size:12pt;font-family:'Times New Roman',serif;color:#000">PURCHASE REQUEST</td></tr>
        <tr style="height:21px">
          <td colspan="2" style="border-bottom:1px solid black;font-size:8pt;padding:2px 4px;font-family:'Times New Roman',serif;font-weight:bold;color:#000">
            Entity Name: <span style="font-weight:normal">${pr.entityName}</span></td>
          <td style="border-bottom:1px solid black"></td>
          <td colspan="3" style="border-bottom:1px solid black;font-size:8pt;padding:2px 4px;font-family:'Times New Roman',serif;font-weight:bold;color:#000">
            Fund Cluster: <span style="font-weight:normal">${pr.fundCluster}</span></td>
        </tr>
        <tr style="height:14px">
          <td rowspan="2" colspan="2" style="border:1px solid black;font-size:8pt;vertical-align:top;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            Office/Section :<br/>${pr.office}</td>
          <td colspan="2" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;font-size:8pt;font-weight:bold;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            PR No.: <span style="font-weight:normal">${pr.prNumber}</span></td>
          <td rowspan="2" colspan="2" style="border:1px solid black;font-size:8pt;font-weight:bold;vertical-align:top;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            Date:<br/><span style="font-weight:normal">${pr.date}</span></td>
        </tr>
        <tr style="height:15px">
          <td colspan="2" style="border-bottom:1px solid black;border-left:1px solid black;font-size:8pt;font-weight:bold;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            Responsibility Center Code : <span style="font-weight:normal">${pr.respCode}</span></td>
        </tr>
        <tr style="height:22.5px">
          <th style="${td}text-align:center">Stock/<br/>Property No.</th>
          <th style="${td}text-align:center">Unit</th>
          <th style="${td}text-align:center">Item Description</th>
          <th style="${td}text-align:center">Quantity</th>
          <th style="${td}text-align:center">Unit Cost</th>
          <th style="${td}text-align:center">Total Cost</th>
        </tr>
        ${rows}
        <tr style="height:17px">
          <td colspan="6" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            <b>Purpose:</b> ${pr.purpose}</td>
        </tr>
        <tr style="height:30px">
          <td colspan="6" style="border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black"></td>
        </tr>
        <tr style="height:12px">
          <td style="border-top:1px solid black;border-left:1px solid black;font-family:'Times New Roman',serif;color:#000"></td>
          <td colspan="2" style="border-top:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000"><i>Requested by:</i></td>
          <td colspan="2" style="border-top:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000"><i>Approved by:</i></td>
          <td style="border-top:1px solid black;border-right:1px solid black"></td>
        </tr>
        <tr style="height:12px">
          <td colspan="2" style="border-left:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">Signature :</td>
          <td></td><td></td><td></td>
          <td style="border-right:1px solid black"></td>
        </tr>
        <tr style="height:12px">
          <td colspan="2" style="border-left:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">Printed Name :</td>
          <td style="font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">${pr.reqName}</td>
          <td colspan="2" style="font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">${pr.appName}</td>
          <td style="border-right:1px solid black"></td>
        </tr>
        <tr style="height:14.75px">
          <td colspan="2" style="border-bottom:1px solid black;border-left:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">Designation :</td>
          <td style="border-bottom:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">${pr.reqDesig}</td>
          <td colspan="2" style="border-bottom:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">${pr.appDesig}</td>
          <td style="border-bottom:1px solid black;border-right:1px solid black"></td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

// ── Download PDF (opens print dialog immediately) ──────────────────
function downloadPDF(pr: PRRecord) {
  const html = buildPRHtml(pr);
  const full = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <title>PR_${pr.prNumber}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Times New Roman',Times,serif;font-size:9pt;color:#000;}
      table{width:100%;border-collapse:collapse;}
      @page{size:A4;margin:1.5cm;}
      @media print{body{-webkit-print-color-adjust:exact;color-adjust:exact;}}
    </style>
  </head><body>${html}<script>
    window.onload=function(){setTimeout(function(){window.print();},300);};
  <\/script></body></html>`;

  const blob = new Blob([full], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // fallback: direct download
    const a = document.createElement("a");
    a.href = url; a.download = `PR_${pr.prNumber || "export"}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── Export XLSX ────────────────────────────────────────────────────
function downloadXLSX(pr: PRRecord) {
  const XLSX = (window as any).XLSX;
  if (!XLSX) { alert("XLSX library not loaded."); return; }
  const tnr = "Times New Roman";
  const thin = () => ({ style: "thin", color: { rgb: "000000" } });
  const noB = () => ({ style: null });
  const bdr = (t?: any, b?: any, l?: any, r?: any) => ({ top: t || noB(), bottom: b || noB(), left: l || noB(), right: r || noB() });
  const allT = () => bdr(thin(), thin(), thin(), thin());
  const ws: any = {};

  function sc(r: number, c: number, v: any, bold = false, sz = 10, ha = "left", va = "bottom", bd: any = {}, wrap = false) {
    const addr = XLSX.utils.encode_cell({ r, c });
    ws[addr] = {
      v: v ?? "", t: typeof v === "number" ? "n" : "s",
      s: { font: { name: tnr, bold, sz }, alignment: { horizontal: ha, vertical: va, wrapText: wrap }, border: bd }
    };
  }

  sc(0, 5, "Appendix 60", false, 10, "center");
  sc(1, 2, "PURCHASE REQUEST", true, 10, "left");
  sc(2, 0, "Entity Name:", true, 8, "left", "bottom", bdr(null, thin()));
  sc(2, 1, pr.entityName, false, 8, "left", "bottom", bdr(null, thin()));
  sc(2, 2, "", false, 8, "left", "bottom", bdr(null, thin()));
  sc(2, 3, "Fund Cluster: " + pr.fundCluster, true, 8, "left", "bottom", bdr(null, thin()));
  sc(2, 4, "", false, 8, "left", "bottom", bdr(null, thin()));
  sc(2, 5, "", false, 8, "left", "bottom", bdr(null, thin()));
  sc(3, 0, "Office/Section :\n" + pr.office, false, 8, "left", "top", bdr(thin(), thin(), thin(), thin()), true);
  sc(3, 2, "PR No.: " + pr.prNumber, true, 8, "left", "bottom", bdr(thin(), null, thin(), thin()));
  sc(3, 4, "Date:\n" + pr.date, true, 8, "left", "top", bdr(thin(), thin(), thin(), thin()), true);
  sc(4, 2, "Responsibility Center Code : " + pr.respCode, true, 8, "left", "bottom", bdr(null, thin(), thin(), null));

  const hdrs = ["Stock/\nProperty No.", "Unit", "Item Description", "Quantity", "Unit Cost", "Total Cost"];
  for (let c = 0; c < 6; c++) sc(5, c, hdrs[c], c !== 0, c === 0 ? 10 : 8, "center", "center", allT(), c === 0);

  const padded = [...pr.items];
  while (padded.length < 30) padded.push(emptyItem());
  padded.forEach((item, i) => {
    const r = 6 + i;
    const q = parseFloat(item.quantity) || null;
    const uc = parseFloat(item.unitCost) || null;
    const tot = q && uc ? q * uc : null;
    sc(r, 0, item.stockNo || "", false, 8, "center", "center", allT());
    sc(r, 1, item.unit || "", false, 8, "center", "center", allT());
    sc(r, 2, item.description || "", false, 8, "left", "center", allT());
    sc(r, 3, q ?? "", false, 8, "center", "center", allT());
    sc(r, 4, uc ?? "", false, 8, "right", "center", allT());
    sc(r, 5, tot ?? "", false, 8, "right", "center", allT());
  });

  sc(36, 0, "Purpose:", false, 8.5, "left", "bottom", bdr(thin(), null, thin(), null));
  sc(36, 1, pr.purpose, false, 8.5, "left", "bottom", bdr(thin(), null, null, null));
  for (let c = 2; c < 5; c++) sc(36, c, "", false, 8, "left", "bottom", bdr(thin(), null, null, null));
  sc(36, 5, "", false, 8, "left", "bottom", bdr(thin(), null, null, thin()));
  sc(37, 0, "", false, 8, "left", "bottom", bdr(null, thin(), thin(), null));
  sc(37, 5, "", false, 8, "left", "bottom", bdr(null, thin(), null, thin()));
  sc(38, 0, "", false, 8.5, "left", "bottom", bdr(thin(), null, thin(), null));
  sc(38, 1, "Requested by:", false, 8.5, "left", "bottom", bdr(thin(), null, null, null));
  sc(38, 2, "", false, 8, "left", "bottom", bdr(thin(), null, null, null));
  sc(38, 3, "Approved by:", false, 8.5, "left", "bottom", bdr(thin(), null, null, null));
  sc(38, 4, "", false, 8, "left", "bottom", bdr(thin(), null, null, null));
  sc(38, 5, "", false, 8, "left", "bottom", bdr(thin(), null, null, thin()));
  sc(39, 0, "Signature :", false, 8.5, "left", "bottom", bdr(null, null, thin(), null));
  sc(39, 5, "", false, 8, "left", "bottom", bdr(null, null, null, thin()));
  sc(40, 0, "Printed Name :", false, 8.5, "left", "bottom", bdr(null, null, thin(), null));
  sc(40, 2, pr.reqName, false, 8.5);
  sc(40, 3, pr.appName, false, 8.5);
  sc(40, 5, "", false, 8, "left", "bottom", bdr(null, null, null, thin()));
  sc(41, 0, "Designation :", false, 8.5, "left", "bottom", bdr(null, thin(), thin(), null));
  sc(41, 1, "", false, 8, "left", "bottom", bdr(null, thin(), null, null));
  sc(41, 2, pr.reqDesig, false, 8.5, "left", "bottom", bdr(null, thin(), null, null));
  sc(41, 3, pr.appDesig, false, 8.5, "left", "bottom", bdr(null, thin(), null, null));
  sc(41, 4, "", false, 8, "left", "bottom", bdr(null, thin(), null, null));
  sc(41, 5, "", false, 8, "left", "bottom", bdr(null, thin(), null, thin()));

  ws["!ref"] = "A1:F42";
  ws["!cols"] = [{ wch: 12.67 }, { wch: 15.11 }, { wch: 45.33 }, { wch: 15.11 }, { wch: 10.44 }, { wch: 16.22 }];
  ws["!rows"] = [27, 34, 21, 14, 15, 22.5, ...Array(30).fill(11), 17, 30, 12, 12, 12, 14.75].map(h => ({ hpt: h }));
  ws["!merges"] = [
    { s: { r: 2, c: 3 }, e: { r: 2, c: 5 } }, { s: { r: 3, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } }, { s: { r: 3, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } }, { s: { r: 37, c: 0 }, e: { r: 37, c: 5 } },
    { s: { r: 39, c: 0 }, e: { r: 39, c: 1 } }, { s: { r: 39, c: 3 }, e: { r: 39, c: 4 } },
    { s: { r: 40, c: 0 }, e: { r: 40, c: 1 } }, { s: { r: 40, c: 3 }, e: { r: 40, c: 4 } },
    { s: { r: 41, c: 0 }, e: { r: 41, c: 1 } }, { s: { r: 41, c: 3 }, e: { r: 41, c: 4 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Table 1");
  XLSX.writeFile(wb, `PR_${pr.prNumber || "export"}.xlsx`);
}

// ── Input helpers ──────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300";

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
      <RiInboxLine size={32} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ── PR Modal ───────────────────────────────────────────────────────
function PRModal({ open, onClose, onSave, editData }: {
  open: boolean;
  onClose: () => void;
  onSave: (pr: PRRecord) => void;
  editData?: PRRecord | null;
}) {
  const [rec, setRec] = useState<PRRecord>(emptyRecord());
  const [tab, setTab] = useState<"form" | "preview">("form");

  useEffect(() => {
    if (open) { setRec(editData ? { ...editData } : emptyRecord()); setTab("form"); }
  }, [open, editData]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const set = (k: keyof PRRecord, v: any) => setRec(r => ({ ...r, [k]: v }));
  const setItem = (id: string, k: keyof PRItem, v: string) =>
    setRec(r => ({ ...r, items: r.items.map(i => i.id === id ? { ...i, [k]: v } : i) }));
  const addItem = () => setRec(r => ({ ...r, items: [...r.items, emptyItem()] }));
  const delItem = (id: string) =>
    setRec(r => ({ ...r, items: r.items.length > 1 ? r.items.filter(i => i.id !== id) : r.items }));

  const grandTotal = getGrandTotal(rec.items);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">
              {editData ? "Edit Purchase Request" : "New Purchase Request"}
            </h2>
            <p className="text-emerald-200 text-xs mt-0.5">Appendix 60 · Official Government Form</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-emerald-500 mr-2">
              <button onClick={() => setTab("form")}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${tab === "form" ? "bg-white text-emerald-700" : "text-emerald-200 hover:text-white"}`}>
                Form
              </button>
              <button onClick={() => setTab("preview")}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${tab === "preview" ? "bg-white text-emerald-700" : "text-emerald-200 hover:text-white"}`}>
                Preview
              </button>
            </div>
            <button onClick={onClose} className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-600 transition-colors">
              <RiCloseLine size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── FORM ── */}
          <div className={`flex flex-col overflow-hidden ${tab === "form" ? "flex-1" : "hidden"} md:flex md:w-[420px] md:flex-none md:border-r border-gray-100`}>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">Header Information</h3>
                <div className="space-y-3">
                  <Field label="Entity Name">
                    <input className={inputCls} value={rec.entityName} onChange={e => set("entityName", e.target.value)} placeholder="e.g. Department of Education" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fund Cluster">
                      <input className={inputCls} value={rec.fundCluster} onChange={e => set("fundCluster", e.target.value)} placeholder="e.g. 01" />
                    </Field>
                    <Field label="PR Number *">
                      <input className={inputCls} value={rec.prNumber} onChange={e => set("prNumber", e.target.value)} placeholder="PR-2024-001" />
                    </Field>
                    <Field label="Office / Section">
                      <input className={inputCls} value={rec.office} onChange={e => set("office", e.target.value)} placeholder="Procurement" />
                    </Field>
                    <Field label="Date *">
                      <input className={inputCls} type="date" value={rec.date} onChange={e => set("date", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Responsibility Center Code">
                    <input className={inputCls} value={rec.respCode} onChange={e => set("respCode", e.target.value)} placeholder="e.g. 10001" />
                  </Field>
                  <Field label="Status">
                    <select className={inputCls} value={rec.status} onChange={e => set("status", e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">Items</h3>
                <div className="space-y-3">
                  {rec.items.map((item, idx) => (
                    <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Item {idx + 1}</span>
                        <button onClick={() => delItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <RiDeleteBinLine size={14} />
                        </button>
                      </div>
                      <Field label="Item Description">
                        <input className={inputCls} value={item.description} onChange={e => setItem(item.id, "description", e.target.value)} placeholder="Describe the item" />
                      </Field>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Field label="Stock/Prop No.">
                          <input className={inputCls} value={item.stockNo} onChange={e => setItem(item.id, "stockNo", e.target.value)} placeholder="—" />
                        </Field>
                        <Field label="Unit">
                          <input className={inputCls} value={item.unit} onChange={e => setItem(item.id, "unit", e.target.value)} placeholder="pcs" />
                        </Field>
                        <Field label="Qty">
                          <input className={inputCls} type="number" value={item.quantity} onChange={e => setItem(item.id, "quantity", e.target.value)} placeholder="0" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Field label="Unit Cost">
                          <input className={inputCls} type="number" value={item.unitCost} onChange={e => setItem(item.id, "unitCost", e.target.value)} placeholder="0.00" />
                        </Field>
                        <Field label="Total Cost">
                          <input className={inputCls} value={getItemTotal(item).toFixed(2)} readOnly
                            style={{ background: "#f0fdf4", color: "#15803d", fontWeight: 600 }} />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <button onClick={addItem} className="w-full py-2.5 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 text-sm font-medium hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                    + Add Item Row
                  </button>
                  <div className="flex justify-between items-center px-3 py-2 bg-emerald-700 rounded-lg">
                    <span className="text-emerald-100 text-xs font-bold uppercase tracking-wide">Grand Total</span>
                    <span className="text-white font-bold text-sm">{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">Signatures</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-2">Requested By</p>
                    <div className="space-y-2">
                      <Field label="Printed Name"><input className={inputCls} value={rec.reqName} onChange={e => set("reqName", e.target.value)} placeholder="Full name" /></Field>
                      <Field label="Designation"><input className={inputCls} value={rec.reqDesig} onChange={e => set("reqDesig", e.target.value)} placeholder="Position/Title" /></Field>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-2">Approved By</p>
                    <div className="space-y-2">
                      <Field label="Printed Name"><input className={inputCls} value={rec.appName} onChange={e => set("appName", e.target.value)} placeholder="Full name" /></Field>
                      <Field label="Designation"><input className={inputCls} value={rec.appDesig} onChange={e => set("appDesig", e.target.value)} placeholder="Position/Title" /></Field>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">Purpose</h3>
                <Field label="Purpose">
                  <textarea className={inputCls} rows={3} value={rec.purpose} onChange={e => set("purpose", e.target.value)} placeholder="State the purpose..." />
                </Field>
              </section>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 flex-shrink-0">
              <button onClick={() => {
                if (!rec.prNumber) { alert("PR Number is required."); return; }
                const saved: PRRecord = { ...rec, savedAt: new Date().toISOString() };
                onSave(saved);
                onClose();
              }}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                <RiSaveLine size={15} /> Save
              </button>
              <button onClick={() => {
                if (!rec.prNumber) { alert("PR Number is required."); return; }
                downloadPDF(rec);
              }}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                <RiFilePdf2Line size={15} /> Download PDF
              </button>
            </div>
          </div>

          {/* ── PREVIEW ── */}
          <div className={`flex-1 overflow-y-auto bg-gray-100 p-6 ${tab === "preview" ? "block" : "hidden"} md:block`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Live Preview</span>
              <div className="flex gap-2">
                <button onClick={() => downloadPDF(rec)}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                  <RiFilePdf2Line size={13} /> Download PDF
                </button>
                <button onClick={() => downloadXLSX(rec)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                  <RiFileExcel2Line size={13} /> Export XLSX
                </button>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-lg p-6 overflow-x-auto text-black">
              <PRPreview pr={rec} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function Procurement() {
  const [activeTab, setActiveTab] = useState("purchase-request");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState(false);
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<PRRecord | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSavePR = useCallback((pr: PRRecord) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === pr.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = pr; return next; }
      return [pr, ...prev];
    });
    // TODO: await supabase.from("procurement").upsert({ ...pr, stage: activeTab });
  }, []);

  const handleCreate = () => { setEditData(null); setModalOpen(true); };
  const handleEdit = (pr: PRRecord) => { setEditData(pr); setModalOpen(true); };

  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label;
  const visibleRecords = activeTab === "purchase-request" ? records : [];

  return (
    <>
      <PRModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSavePR} editData={editData} />

      <div className="flex flex-col gap-6">

        {/* ── Tabs + Create ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">

          {/* Mobile tab selector */}
          <div className="w-full md:hidden">
            <button onClick={() => setMobileTab(!mobileTab)}
              className="flex items-center justify-between w-full px-4 py-3 bg-emerald-700 text-white rounded-lg font-medium text-sm">
              {activeTabLabel}
              {mobileTab ? <RiArrowUpSLine size={18} /> : <RiArrowDownSLine size={18} />}
            </button>
            {mobileTab && (
              <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                {tabs.map(tab => (
                  <div key={tab.id}>
                    <div className={`flex items-center justify-between text-sm font-medium transition-colors
                      ${activeTab === tab.id ? "bg-emerald-700 text-white" : "text-gray-700 hover:bg-emerald-50"}`}>
                      <button onClick={() => { setActiveTab(tab.id); setMobileTab(false); setOpenDropdown(null); }} className="flex-1 text-left px-4 py-3">
                        {tab.label}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === tab.id ? null : tab.id); }}
                        className={`px-4 py-3 ${activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-emerald-700"}`}>
                        {openDropdown === tab.id ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                      </button>
                    </div>
                    {openDropdown === tab.id && (
                      <div className="bg-gray-50 border-t border-gray-100">
                        {tab.dropdown.map(item => (
                          <button key={item} onClick={() => setOpenDropdown(null)}
                            className="w-full text-left px-8 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop tabs */}
          <div ref={dropdownRef} className="hidden md:flex items-center gap-0 border-b border-gray-200 relative">
            {tabs.map(tab => (
              <div key={tab.id} className="relative">
                <div className={`flex items-center border-b-2 -mb-px transition-colors duration-200
                  ${activeTab === tab.id ? "border-emerald-700 bg-emerald-700 rounded-t-md" : "border-transparent hover:border-emerald-200"}`}>
                  <button onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium transition-colors duration-200
                      ${activeTab === tab.id ? "text-white" : "text-gray-600 hover:text-emerald-700"}`}>
                    {tab.label}
                  </button>
                  <button onClick={() => setOpenDropdown(openDropdown === tab.id ? null : tab.id)}
                    className={`pr-3 py-3 transition-colors duration-200 ${activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-emerald-700"}`}>
                    {openDropdown === tab.id ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                  </button>
                </div>
                {openDropdown === tab.id && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    {tab.dropdown.map(item => (
                      <button key={item} onClick={() => setOpenDropdown(null)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create button */}
          <button onClick={handleCreate}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors duration-200 w-full md:w-auto justify-center">
            <RiAddLine size={18} /> Create
          </button>
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden md:block rounded-xl overflow-hidden shadow-sm border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-700 text-white">
                <th className="px-4 py-3 text-left font-semibold">PR No.</th>
                <th className="px-4 py-3 text-left font-semibold">Item Description</th>
                <th className="px-4 py-3 text-left font-semibold">Office Section</th>
                <th className="px-4 py-3 text-center font-semibold">Quantity</th>
                <th className="px-4 py-3 text-right font-semibold">Total Cost</th>
                <th className="px-4 py-3 text-center font-semibold">Date</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.length === 0 ? (
                <tr><td colSpan={8} className="py-12"><EmptyState label="No data available." /></td></tr>
              ) : (
                visibleRecords.map((pr, idx) => {
                  const totalCost = getGrandTotal(pr.items);
                  const totalQty = pr.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
                  const firstDesc = pr.items[0]?.description || "—";
                  return (
                    <tr key={pr.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-3 text-gray-800 font-medium">{pr.prNumber}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={firstDesc}>{firstDesc}</td>
                      <td className="px-4 py-3 text-gray-700">{pr.office}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{totalQty}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₱{totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{pr.date}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[pr.status] ?? "bg-gray-400"}`} />
                          <span className="text-gray-600 text-xs">{pr.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleEdit(pr)}
                            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors">
                            <RiEditLine size={12} /> Edit
                          </button>
                          <button onClick={() => downloadXLSX(pr)}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors">
                            <RiFileExcel2Line size={12} /> XLSX
                          </button>
                          <button onClick={() => downloadPDF(pr)}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors">
                            <RiFilePdf2Line size={12} /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Cards ── */}
        <div className="flex flex-col gap-3 md:hidden">
          {visibleRecords.length === 0 ? (
            <EmptyState label="No data available." />
          ) : (
            visibleRecords.map(pr => {
              const totalCost = getGrandTotal(pr.items);
              const totalQty = pr.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
              return (
                <div key={pr.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800 text-sm">{pr.prNumber}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusColors[pr.status] ?? "bg-gray-400"}`} />
                      <span className="text-xs text-gray-500">{pr.status}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-1 truncate">{pr.items[0]?.description || "—"}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{pr.office}</span>
                    <span>{pr.date}</span>
                    <span>Qty: {totalQty}</span>
                    <span>₱{totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(pr)}
                      className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-md text-xs font-medium transition-colors">
                      <RiEditLine size={12} /> Edit
                    </button>
                    <button onClick={() => downloadXLSX(pr)}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-md text-xs font-medium transition-colors">
                      <RiFileExcel2Line size={12} /> XLSX
                    </button>
                    <button onClick={() => downloadPDF(pr)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-md text-xs font-medium transition-colors">
                      <RiFilePdf2Line size={12} /> PDF
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}