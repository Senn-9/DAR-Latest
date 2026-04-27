"use client";

import { useRef } from "react";

 type ResolutionPDFProps = {
  resolutionNo: string;
  mode: string;
  modeTop: string;
  preparedBy: string;
  resolvedAt: string;
  whereas1: string;
  whereas2: string;
  whereas3: string;
  nowThereforeText: string;
  resolvedAtPlace: string;
  prNo: string;
  prOfficeSection: string;
  prEstimatedCost: number | null;
  users: { id: number; fullname: string | null }[];
};

function getOrdinalDay(day: number): string {
  if (day > 3 && day < 21) return day + "th";
  switch (day % 10) {
    case 1:
      return day + "st";
    case 2:
      return day + "nd";
    case 3:
      return day + "rd";
    default:
      return day + "th";
  }
}

function parseBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function generateResolutionPDF(props: ResolutionPDFProps) {
  const {
    resolutionNo,
    mode,
    modeTop,
    preparedBy,
    resolvedAt,
    whereas1,
    whereas2,
    whereas3,
    nowThereforeText,
    resolvedAtPlace,
    prNo,
    prOfficeSection,
    prEstimatedCost,
    users,
  } = props;

  const preparedByUser = users.find((u) => u.id === Number(preparedBy));
  const preparedByName = preparedByUser?.fullname || "___________________";

  const printWindow = window.open("", "_blank", "height=800,width=1200");
  if (!printWindow) return;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>BAC Resolution ${resolutionNo || ""}</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .page {
        page-break-after: always;
      }
      .page:last-child {
        page-break-after: auto;
      }
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      color: #000;
      line-height: 1.5;
      margin: 0;
      padding: 0.5in 0.75in;
    }
    .header {
      text-align: center;
      margin-bottom: 12pt;
      padding-bottom: 8pt;
      border-bottom: 1px solid #000;
    }
    .header p {
      margin: 0 0 2pt 0;
    }
    .resolution-number {
      text-align: center;
      margin-bottom: 12pt;
    }
    .title {
      text-align: center;
      margin-bottom: 12pt;
      font-size: 10pt;
      font-weight: bold;
      line-height: 1.4;
    }
    .whereas-clauses {
      margin-bottom: 12pt;
      text-align: justify;
    }
    .whereas-clauses p {
      margin: 0 0 6pt 0;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 12pt;
    }
    th, td {
      border: 1px solid #999;
      padding: 6px 4px;
      text-align: center;
    }
    th {
      background-color: #d3d3d3;
      font-weight: bold;
      font-size: 7pt;
    }
    .note {
      margin: 8pt 0;
      font-size: 8pt;
    }
    .now-therefore {
      margin-bottom: 12pt;
      text-align: justify;
    }
    .now-therefore p {
      margin: 0 0 6pt 0;
      line-height: 1.5;
    }
    .resolved {
      margin-bottom: 12pt;
    }
    .signatures {
      margin-top: 14pt;
    }
    .signature-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16pt;
      margin-bottom: 10pt;
    }
    .signature {
      text-align: center;
    }
    .signature-line {
      height: 18pt;
      margin-bottom: 2pt;
    }
    .signature-label {
      border-top: 1px solid #000;
      padding-top: 2pt;
      font-size: 7pt;
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: clip;
    }
    .approved-by {
      text-align: center;
      margin-top: 10pt;
      padding-top: 8pt;
      border-top: 1px solid #000;
    }
    .approved-by .signature-line {
      height: 18pt;
      margin: 2pt 0;
    }
    .approved-by .name {
      border-top: 1px solid #000;
      padding-top: 2pt;
      font-size: 9pt;
      font-weight: bold;
    }
    .approved-by .title {
      margin: 2pt 0 0 0;
      font-size: 8pt;
      font-weight: normal;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <p style="font-size: 9pt; font-weight: bold;">REPUBLIC OF THE PHILIPPINES</p>
    <p style="font-size: 10pt; font-weight: bold;">DEPARTMENT OF AGRARIAN REFORM</p>
    <p style="font-size: 9pt;">Tunay na Pagbabago sa Repormang Agrario</p>
    <p style="font-size: 8pt; font-weight: bold;">PROVINCIAL BIDS AND AWARDS COMMITTEE OF</p>
    <p style="font-size: 8pt; font-weight: bold; margin-bottom: 8pt;">DARPO-CAMARINES SUR I</p>
  </div>

  <!-- Resolution Number -->
  <div class="resolution-number">
    <p style="font-size: 9pt; margin: 0 0 4pt 0; font-weight: bold;">Resolution No. ${resolutionNo || "_________"}</p>
  </div>

  <!-- Title -->
  <div class="title">
    "RESOLUTION RECOMMENDING THE PROCUREMENT BY ALTERNATIVE MODE OF PROCUREMENT (${modeTop || "SMALL VALUE PROCUREMENT"}) OF ONE (1) APPROVED PURCHASE REQUEST/S"
  </div>

  <!-- Whereas Clauses -->
  <div class="whereas-clauses">
    ${whereas1 ? `<p><span style="font-weight: bold;">WHEREAS,</span> ${parseBold(whereas1)}</p>` : ""}
    ${whereas2 ? `<p><span style="font-weight: bold;">WHEREAS,</span> ${parseBold(whereas2)}</p>` : ""}
    ${whereas3 ? `<p><span style="font-weight: bold;">WHEREAS,</span> ${parseBold(whereas3)}</p>` : ""}
  </div>

  <!-- Details Table -->
  <table>
    <thead>
      <tr>
        <th>PR NUMBER</th>
        <th>DATE</th>
        <th>ESTIMATED COST (Php)</th>
        <th>END USER</th>
        <th style="max-width: 60px;">RECOMMENDED<br>PROCUREMENT<br>MODE</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${prNo || "2025-08-390"}</td>
        <td>${resolvedAt ? new Date(resolvedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" }) : "___________"}</td>
        <td>${prEstimatedCost ? prEstimatedCost.toLocaleString("en-US") : "_____________"}</td>
        <td>${prOfficeSection || "ARBDSP"}</td>
        <td>${mode || "SVP/Canvass"}</td>
      </tr>
    </tbody>
  </table>

  <!-- Please see note -->
  <p class="note">Please see attached purchase request/s.</p>

  <!-- Now Therefore Clause -->
  ${nowThereforeText ? `
  <div class="now-therefore">
    <p><span style="font-weight: bold;">NOW, THEREFORE,</span> ${parseBold(nowThereforeText)}</p>
  </div>
  ` : ""}

  <!-- Resolved -->
  <div class="resolved">
    <p style="margin: 0; line-height: 1.5;">
      <span style="font-weight: bold;">RESOLVED</span> at the ${resolvedAtPlace || "________________________"}, this ${resolvedAt ? getOrdinalDay(new Date(resolvedAt).getDate()) : "_____"} day of ${resolvedAt ? new Date(resolvedAt).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "_______ ___"}.
    </p>
  </div>

  <!-- Signature Block -->
  <div class="signatures">
    <!-- First Row - Chairperson (Center) -->
    <div class="signature-row">
      <div></div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-label">ATTY. JAIME G. RESOCO, JR.</div>
        <div style="font-size: 8pt; font-weight: bold;">BAC Chairperson</div>
      </div>
      <div></div>
    </div>

    <!-- Second Row - Vice Chairperson and Member -->
    <div class="signature-row">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-label">LEA A. VILLARAZA</div>
        <div style="font-size: 8pt; font-weight: bold;">BAC Vice-Chairperson</div>
      </div>
      <div></div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-label">ENGR. MA. ELIZABETH N. ARCILLA</div>
        <div style="font-size: 8pt; font-weight: bold;">BAC Member</div>
      </div>
    </div>

    <!-- Third Row - Members -->
    <div class="signature-row">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-label">ENGR. JOSE JESUS B. REY, JR.</div>
        <div style="font-size: 8pt; font-weight: bold;">BAC Member</div>
      </div>
      <div></div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-label">MARIA REBECCA R. TAROG</div>
        <div style="font-size: 8pt; font-weight: bold;">BAC Member</div>
      </div>
    </div>
  </div>

  <!-- Approved By -->
  <div class="approved-by">
    <p style="margin: 0 0 4pt 0; font-size: 9pt; font-weight: bold;">Approved by:</p>
    <div class="signature-line"></div>
    <div class="name">RICARDO C. GARCIA</div>
    <p class="title">HOPE</p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export default function ResolutionPDF(props: ResolutionPDFProps) {
  return null;
}
