"use client";

import { RiCloseLine, RiDownloadLine } from "react-icons/ri";
import * as XLSX from "xlsx-js-style";

type Props = {
  prNo: string;
  prOfficeSection: string;
  prEstimatedCost: number | null;
  resolutionNo: string;
  mode: string;
  resolvedAt: string;
  resolvedAtPlace: string;
  whereas1: string;
  whereas2: string;
  whereas3: string;
  nowThereforeText: string;
  onClose: () => void;
};

function getOrdinalDay(day: number): string {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function formatResolvedDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatResolvedStatement(iso: string, place: string): string {
  if (!iso) {
    return "RESOLVED at the HL Bldg. Carnation St, Triangulo Naga City, this _____ day of _____________ 2025.";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "RESOLVED at the HL Bldg. Carnation St, Triangulo Naga City, this _____ day of _____________ 2025.";
  }

  return `RESOLVED at the ${place || "HL Bldg. Carnation St, Triangulo Naga City"}, this ${getOrdinalDay(date.getDate())} day of ${date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}.`;
}

function DocumentHeader() {
  return (
    <div style={{ textAlign: "center", marginBottom: "10pt", paddingBottom: "6pt", borderBottom: "1px solid #666" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10pt", marginBottom: "4pt" }}>
        <div style={{ width: "48pt", height: "32pt" }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "10pt", margin: "0", fontWeight: "bold", letterSpacing: "0.2pt" }}>REPUBLIC OF THE PHILIPPINES</p>
          <p style={{ fontSize: "12pt", margin: "0", fontWeight: "bold" }}>DEPARTMENT OF AGRARIAN REFORM</p>
          <p style={{ fontSize: "9pt", margin: "0" }}>Tunay na Pagbabago sa Repormang Agrario</p>
        </div>
        <div style={{ width: "48pt", height: "32pt", border: "1px solid #999", borderRadius: "6pt" }} />
      </div>
      <p style={{ fontSize: "8.5pt", margin: "0", fontWeight: "bold" }}>PROVINCIAL BIDS AND AWARDS COMMITTEE OF</p>
      <p style={{ fontSize: "8.5pt", margin: "0", fontWeight: "bold" }}>DARPO-CAMARINES SUR I</p>
    </div>
  );
}

function ResolutionDocument({
  prNo,
  prOfficeSection,
  prEstimatedCost,
  resolutionNo,
  mode,
  resolvedAt,
  resolvedAtPlace,
  whereas1,
  whereas2,
  whereas3,
  nowThereforeText,
}: Omit<Props, "onClose">) {
  const dateText = formatResolvedDate(resolvedAt);
  const resolvedStatement = formatResolvedStatement(resolvedAt, resolvedAtPlace);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "8.5in",
        margin: "0 auto",
        background: "#fff",
        padding: "0.6in 0.7in",
        color: "#111",
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: "10pt",
        lineHeight: 1.45,
        boxShadow: "0 24px 80px rgba(0,0,0,0.12)",
        border: "1px solid #d8d8d8",
      }}
    >
      <DocumentHeader />

      <div style={{ textAlign: "center", marginBottom: "12pt" }}>
        <p style={{ margin: 0, fontWeight: "bold", fontSize: "9pt", textDecoration: "underline" }}>Resolution No. {resolutionNo || "2025-___"}</p>
      </div>

      <div style={{ textAlign: "center", marginBottom: "12pt" }}>
        <p style={{ margin: 0, fontSize: "10pt", fontWeight: 700 }}>
          "RESOLUTION RECOMMENDING THE PROCUREMENT BY ALTERNATIVE MODE OF PROCUREMENT (SMALL
          VALUE PROCUREMENT) OF ONE (1) APPROVED PURCHASE REQUEST/S"
        </p>
      </div>

      <div style={{ marginBottom: "10pt", textAlign: "justify" }}>
        <p style={{ margin: "0 0 8pt 0" }}>
          <span style={{ fontWeight: "bold" }}>WHEREAS,</span> {whereas1 || "the _____ Division of the Department of Agrarian Reform, Camarines Sur Provincial Office has requested for supply, labor and materials of _____________________________________"}
        </p>
        <p style={{ margin: "0 0 8pt 0" }}>
          <span style={{ fontWeight: "bold" }}>WHEREAS,</span> {whereas2 || "the requested supply, labor and materials of ___________________________________ which have fund earmarked for the estimated cost as certified by the Budget Officer."}
        </p>
        <p style={{ margin: 0 }}>
          <span style={{ fontWeight: "bold" }}>WHEREAS,</span> {whereas3 || "the requested supply, labor and materials as stated in the Purchase Request have been evaluated by the members of the Bid and Awards Committee (BAC) and is hereby recommended for procurement by SVP method, to wit:"}
        </p>
      </div>

      <div style={{ margin: "10pt 0 12pt" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt", tableLayout: "fixed" }}>
          <thead>
            <tr style={{ backgroundColor: "#d3d3d3" }}>
              <th style={tableHeaderCellStyle}>PR NUMBER</th>
              <th style={tableHeaderCellStyle}>DATE</th>
              <th style={tableHeaderCellStyle}>ESTIMATED COST (Php)</th>
              <th style={tableHeaderCellStyle}>END USER</th>
              <th style={tableHeaderCellStyle}>RECOMMENDED PROCUREMENT MODE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tableBodyCellStyleCenter}>{prNo || "2025-08-390"}</td>
              <td style={tableBodyCellStyleCenter}>{dateText || "___________"}</td>
              <td style={tableBodyCellStyleRight}>{prEstimatedCost != null ? prEstimatedCost.toLocaleString("en-US") : "_____________"}</td>
              <td style={tableBodyCellStyleCenter}>{prOfficeSection || "ARBDSP"}</td>
              <td style={tableBodyCellStyleCenter}>{mode || "SVP/Canvass"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ margin: "0 0 10pt 0", fontSize: "8.5pt" }}>Please see attached purchase request/s.</p>

      <div style={{ marginBottom: "10pt", textAlign: "justify" }}>
        <p style={{ margin: 0 }}>
          <span style={{ fontWeight: "bold" }}>NOW, THEREFORE,</span> we, the members of the Bids and Awards Committee, hereby <span style={{ fontWeight: "bold" }}>RESOLVE,</span> as it is hereby <span style={{ fontWeight: "bold" }}>RESOLVED,</span> to recommend to the Head of Procuring Entity the procurement of items through SVP method.
        </p>
      </div>

      <div style={{ marginBottom: "18pt" }}>
        <p style={{ margin: 0 }}>{resolvedStatement}</p>
      </div>

      <div style={{ marginTop: "20pt" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10pt", marginBottom: "14pt" }}>
          <SignatureBlock label="Chairperson" />
          <SignatureBlock label="BAC Vice-Chairperson" />
          <SignatureBlock label="BAC Member" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10pt", marginBottom: "18pt" }}>
          <SignatureBlock label="BAC Member" />
          <div />
          <SignatureBlock label="BAC Member" />
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "8pt" }}>
        <p style={{ margin: "0 0 4pt 0", fontSize: "9pt", fontWeight: "bold" }}>Approved by:</p>
        <div style={{ height: "28pt" }} />
        <div style={{ borderTop: "1px solid #111", paddingTop: "2pt", fontSize: "9pt", fontWeight: "bold" }}>RICARDO C. GARCIA</div>
        <p style={{ margin: "2pt 0 0 0", fontSize: "8pt" }}>HOPE</p>
      </div>
    </div>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ height: "28pt" }} />
      <div style={{ borderTop: "1px solid #111", paddingTop: "2pt", fontSize: "8pt", fontWeight: 700 }}>{label}</div>
    </div>
  );
}

const tableHeaderCellStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "6px 4px",
  textAlign: "center",
  fontWeight: 700,
  fontSize: "7pt",
  verticalAlign: "middle",
  wordBreak: "break-word",
};

const tableBodyCellStyleCenter: React.CSSProperties = {
  border: "1px solid #999",
  padding: "6px 4px",
  textAlign: "center",
  fontSize: "8pt",
  verticalAlign: "middle",
};

const tableBodyCellStyleRight: React.CSSProperties = {
  border: "1px solid #999",
  padding: "6px 4px",
  textAlign: "right",
  fontSize: "8pt",
  verticalAlign: "middle",
};

function buildExcelWorkbook(props: Omit<Props, "onClose">) {
  const resolvedDate = props.resolvedAt ? new Date(props.resolvedAt) : null;
  const resolvedDateText = resolvedDate && !Number.isNaN(resolvedDate.getTime())
    ? resolvedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "___________";
  const resolvedDateLine = resolvedDate && !Number.isNaN(resolvedDate.getTime())
    ? `RESOLVED at the ${props.resolvedAtPlace || "HL Bldg. Carnation St, Triangulo Naga City"}, this ${getOrdinalDay(resolvedDate.getDate())} day of ${resolvedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}.`
    : "RESOLVED at the HL Bldg. Carnation St, Triangulo Naga City, this _____ day of _____________ 2025.";

  const rows = [
    [""],
    ["REPUBLIC OF THE PHILIPPINES"],
    ["DEPARTMENT OF AGRARIAN REFORM"],
    ["Tunay na Pagbabago sa Repormang Agrario"],
    [""],
    ["PROVINCIAL BIDS AND AWARDS COMMITTEE OF"],
    ["DARPO-CAMARINES SUR I"],
    [""],
    [`Resolution No. ${props.resolutionNo || "2025-___"}`],
    [""],
    ["RESOLUTION RECOMMENDING THE PROCUREMENT BY ALTERNATIVE MODE OF PROCUREMENT"],
    ["(SMALL VALUE PROCUREMENT) OF ONE (1) APPROVED PURCHASE REQUEST/S"],
    [""],
    [props.whereas1 || "WHEREAS, the _____ Division of the Department of Agrarian Reform, Camarines Sur Provincial Office has requested for supply, labor and materials of _____________________________________"],
    [props.whereas2 || "WHEREAS, the requested supply, labor and materials of ___________________________________ which have fund earmarked for the estimated cost as certified by the Budget Officer."],
    [""],
    [props.whereas3 || "WHEREAS, the requested supply, labor and materials as stated in the Purchase Request have been evaluated by the members of the Bid and Awards Committee (BAC) and is hereby recommended for procurement by SVP method, to wit:"],
    [""],
    ["PR NUMBER", "DATE", "ESTIMATED COST (Php)", "END USER", "RECOMMENDED PROCUREMENT MODE"],
    [props.prNo || "2025-08-390", resolvedDateText, props.prEstimatedCost != null ? props.prEstimatedCost.toLocaleString("en-US") : "_____________", props.prOfficeSection || "ARBDSP", props.mode || "SVP/Canvass"],
    [""],
    ["Please see attached purchase request/s."],
    [""],
    ["NOW, THEREFORE, we, the members of the Bids and Awards Committee, hereby RESOLVE, as it is"],
    [props.nowThereforeText || "hereby RESOLVED, to recommend to the Head of Procuring Entity the procurement of items"],
    ["through SVP method."],
    [""],
    [resolvedDateLine],
    [""],
    [""],
    ["_______________________________", "", "_______________________________"],
    ["BAC Vice-Chairperson", "", "BAC Chairperson"],
    [""],
    ["_______________________________", "", "_______________________________"],
    ["BAC Member", "", "BAC Member"],
    [""],
    ["", "_______________________________"],
    ["", "BAC Member"],
    [""],
    [""],
    ["Approved by:"],
    [""],
    [""],
    ["_______________________________"],
    ["RICARDO C. GARCIA"],
    ["HOPE"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resolution Preview");

  ws["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 26 }];
  ws["!rows"] = rows.map((_, index) => ({
    hpt:
      index === 1 || index === 2
        ? 20
        : index === 8
          ? 18
          : index === 10 || index === 11
            ? 22
            : index >= 13 && index <= 17
              ? 22
              : index === 18 || index === 19
                ? 24
                : index === 21
                  ? 20
                  : index === 23 || index === 24 || index === 25
                    ? 20
                    : index >= 30 && index <= 39
                      ? 18
                      : 16,
  }));

  const fullMerge = (row: number) => ({ s: { r: row, c: 0 }, e: { r: row, c: 4 } });
  const leftMerge = (row: number) => ({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });
  const rightMerge = (row: number) => ({ s: { r: row, c: 3 }, e: { r: row, c: 4 } });

  ws["!merges"] = [
    fullMerge(1),
    fullMerge(2),
    fullMerge(3),
    fullMerge(5),
    fullMerge(6),
    fullMerge(8),
    fullMerge(10),
    fullMerge(11),
    fullMerge(13),
    fullMerge(14),
    fullMerge(16),
    fullMerge(18),
    fullMerge(19),
    fullMerge(20),
    fullMerge(21),
    fullMerge(22),
    fullMerge(24),
    fullMerge(25),
    fullMerge(27),
    fullMerge(29),
    leftMerge(31),
    rightMerge(31),
    leftMerge(32),
    rightMerge(32),
    leftMerge(34),
    rightMerge(34),
    leftMerge(35),
    rightMerge(35),
    leftMerge(37),
    rightMerge(37),
    fullMerge(40),
    fullMerge(43),
    fullMerge(44),
  ];

  const center = { horizontal: "center", vertical: "center" as const, wrapText: true };
  const left = { horizontal: "left", vertical: "top" as const, wrapText: true };
  const border = {
    top: { style: "thin", color: { rgb: "FF999999" } },
    bottom: { style: "thin", color: { rgb: "FF999999" } },
    left: { style: "thin", color: { rgb: "FF999999" } },
    right: { style: "thin", color: { rgb: "FF999999" } },
  };

  const setStyle = (row: number, col: number, style: Record<string, unknown>) => {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    if (!ws[cellRef]) ws[cellRef] = {};
    (ws[cellRef] as { s?: Record<string, unknown> }).s = style;
  };

  const styleRow = (row: number, columns: number, style: Record<string, unknown>) => {
    for (let col = 0; col < columns; col += 1) setStyle(row, col, style);
  };

  styleRow(1, 5, { font: { bold: true, sz: 13 }, alignment: center });
  styleRow(2, 5, { font: { bold: true, sz: 12 }, alignment: center });
  styleRow(3, 5, { font: { sz: 10 }, alignment: center });
  styleRow(5, 5, { font: { bold: true, sz: 10 }, alignment: center });
  styleRow(6, 5, { font: { bold: true, sz: 10 }, alignment: center });
  styleRow(8, 5, { font: { bold: true, sz: 10, underline: true }, alignment: center });
  styleRow(10, 5, { font: { bold: true, sz: 10 }, alignment: center });
  styleRow(11, 5, { font: { bold: true, sz: 10 }, alignment: center });
  styleRow(13, 5, { font: { sz: 10 }, alignment: left });
  styleRow(14, 5, { font: { sz: 10 }, alignment: left });
  styleRow(16, 5, { font: { sz: 10 }, alignment: left });
  styleRow(18, 5, { font: { sz: 10 }, alignment: left });
  styleRow(19, 5, { font: { sz: 10 }, alignment: left });
  styleRow(20, 5, { font: { sz: 10 }, alignment: left });
  styleRow(21, 5, { font: { sz: 10 }, alignment: left });
  styleRow(23, 5, { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: "FFD3D3D3" } }, alignment: center, border });
  styleRow(24, 5, { font: { sz: 9 }, alignment: center, border });
  styleRow(27, 5, { font: { sz: 8 }, alignment: center });
  styleRow(29, 5, { font: { bold: true, sz: 10 }, alignment: left });
  styleRow(30, 5, { font: { sz: 10 }, alignment: left });
  styleRow(31, 5, { font: { sz: 10 }, alignment: left });
  styleRow(32, 5, { font: { sz: 10 }, alignment: left });
  styleRow(34, 5, { font: { sz: 9 }, alignment: center });
  styleRow(35, 5, { font: { sz: 9 }, alignment: center });
  styleRow(37, 5, { font: { sz: 9 }, alignment: center });
  styleRow(38, 5, { font: { sz: 9 }, alignment: center });
  styleRow(40, 5, { font: { sz: 9 }, alignment: center });
  styleRow(43, 5, { font: { bold: true, sz: 9 }, alignment: center });
  styleRow(44, 5, { font: { sz: 8 }, alignment: center });
  styleRow(45, 5, { font: { sz: 8 }, alignment: center });

  return wb;
}

export default function ResolutionTableModal(props: Props) {
  const handleExportToExcel = () => {
    const wb = buildExcelWorkbook(props);
    XLSX.writeFile(wb, `Resolution_${props.prNo || "draft"}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={props.onClose} />

      <div className="relative z-10 w-full max-w-[95vw] max-h-[94vh] overflow-hidden rounded-2xl bg-[#f3f1ec] shadow-2xl flex flex-col">
        <div className="bg-linear-to-r from-purple-600 to-purple-700 px-8 py-4 flex items-center justify-between text-white">
          <div>
            <h2 className="text-lg font-bold">Resolution Template</h2>
            <p className="text-purple-100 text-sm mt-1">Preview and export use the same layout</p>
          </div>
          <button onClick={props.onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
            <RiCloseLine size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <ResolutionDocument {...props} />
        </div>

        <div className="px-8 py-4 bg-white border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={handleExportToExcel}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800"
          >
            <RiDownloadLine size={18} /> Export to Excel
          </button>
        </div>
      </div>
    </div>
  );
}
