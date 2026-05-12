import { escapeHtml } from "./printUtils";

export interface ContractPrintData {
  contractTitle: string;
  firstPartyAgency: string;
  firstPartyRep: string;
  firstPartyOffice: string;
  firstPartyCity: string;
  secondPartyName: string;
  secondPartyRep: string;
  secondPartyCity: string;
  commencementLocation: string;
  considerationAmount: number;
  considerationAmountWords: string;
  serviceDescription: string;
  deliveryLocation: string;
  paymentCondition: string;
  jobOrderDescription: string;
  scheduledDays: string;
  liquidatedDamagesRate: string;
  contractDate: string;
  commencementDate: string;
  witnessOne: string;
  witnessTwo: string;
}

function fmtDate(isoDate: string) {
  if (!isoDate) return { day: "", ordDay: "___", month: "___________", year: "____", full: "" };
  const d = new Date(isoDate + "T00:00:00");
  const day = d.getDate();
  const s = ["th","st","nd","rd"], v = day % 100;
  const ordDay = day + (s[(v-20)%10] || s[v] || s[0]);
  const month = d.toLocaleDateString("en-PH", { month: "long" });
  const year = d.getFullYear().toString();
  const full = d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  return { day: day.toString(), ordDay, month, year, full };
}

function fmtMoney(n: number): string {
  return "\u20B1" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Inline fill-in span — bold text sitting on an underline */
const F = (content: string, minW = "140px", extra = "") =>
  `<span style="display:inline-block;border-bottom:1px solid #000;font-weight:bold;text-align:center;min-width:${minW};padding:0 4px;vertical-align:bottom;${extra}">${content || "&nbsp;"}</span>`;

/* Flex row helper */
const ROW = (items: string, mb = "2px") =>
  `<div style="display:flex;align-items:flex-end;gap:4px;margin-bottom:${mb};">${items}</div>`;

/* Static label (nowrap) */
const L = (t: string) => `<span style="white-space:nowrap;">${t}</span>`;

/* Stretch fill — same as F but takes flex:1 */
const SF = (content: string, extra = "") =>
  `<span style="flex:1;min-width:0;border-bottom:1px solid #000;font-weight:bold;text-align:center;padding:0 4px;vertical-align:bottom;${extra}">${content || "&nbsp;"}</span>`;

export function buildContractPrintHtml(data: ContractPrintData): string {
  const cd   = fmtDate(data.contractDate);
  const comd = fmtDate(data.commencementDate);
  const paymentText = data.paymentCondition || data.serviceDescription;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(data.contractTitle || "Contract for Services")}</title>
  <style>
    @page { size: A4; margin: 20mm 22mm; }
    * { box-sizing: border-box; }
    html,body { margin:0; padding:0;
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt; color: #000; line-height: 1.55; }
    .bold { font-weight: bold; }
    .center { text-align: center; }
    .indent { padding-left: 2em; }
    .section { margin-bottom: 14px; }
    .row { display: flex; align-items: flex-end; gap: 4px; margin-bottom: 2px; }
  </style>
</head>
<body>

<!-- Title -->
<div class="center bold section" style="font-size:12pt;margin-bottom:20px;">
  ${escapeHtml(data.contractTitle || "CONTRACT FOR SERVICES")}
</div>

<!-- KNOW ALL MEN -->
<div class="bold section" style="margin-bottom:16px;">KNOW ALL MEN BY THESE PRESENTS:</div>

<!-- Party intro -->
<div class="indent section">
  ${ROW(L("This contract, executed by and between") + SF(escapeHtml(data.firstPartyAgency)))}
  ${ROW(L("Provincial Office, represented by") + F(escapeHtml(data.firstPartyRep)) + L("with office address at"))}
  ${ROW(`<span style="flex:1;min-width:0;border-bottom:1px solid #000;font-weight:bold;padding:0 4px;vertical-align:bottom;">${escapeHtml(data.firstPartyOffice) || "&nbsp;"}</span>` + L(", hereinafter referred to as the party of the FIRST PART;"))}
  ${ROW(L("and") + F(escapeHtml(data.secondPartyName)) + L(", represented by") + SF(escapeHtml(data.secondPartyRep)))}
  ${ROW(L("Filipino, of legal age and a resident of") + F(escapeHtml(data.secondPartyCity || data.commencementLocation), "110px") + L("hereinafter referred to"))}
  <div>as the party of the SECOND PART.</div>
</div>

<!-- WITNESSETH -->
<div class="center bold section" style="letter-spacing:6px;margin:20px 0;">W I T N E S S E T H</div>

<!-- Consideration -->
<div class="indent section">
  ${ROW(L("That for and in consideration of the sum of") + SF(escapeHtml(data.considerationAmountWords).toUpperCase(), "text-transform:uppercase;"))}
  ${ROW(`<span style="white-space:nowrap;">(${fmtMoney(data.considerationAmount)})</span><span style="margin-left:4px;">, which the FIRST PARTY agreed to pay unto the SECOND PARTY, the SECOND</span>`)}
  ${ROW(L("PARTY &nbsp;agrees to deliver/provide the") + SF(escapeHtml(data.serviceDescription), "text-transform:uppercase;"))}
</div>

<!-- Payment -->
<div class="indent section">
  <div>That the FIRST PARTY shall pay the full amount to the SECOND PARTY when &nbsp;the</div>
  <div style="border-bottom:1px solid #000;font-weight:bold;text-transform:uppercase;padding:2px 4px;min-height:20px;">
    ${escapeHtml(paymentText)}
  </div>
</div>

<!-- Job order -->
<div class="indent section">
  ${ROW(L("That the SECOND PARTY agrees to finish the") + SF(escapeHtml(data.jobOrderDescription || "JOB ORDER"), "text-transform:uppercase;"))}
  ${ROW(L("within") + F(escapeHtml(data.scheduledDays), "40px") + L("scheduled days counted from the day the contract for the") + SF(escapeHtml(data.serviceDescription), "text-transform:uppercase;"))}
  ${ROW(F(comd.full || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", "180px") + `<span>has been issued by the FIRST PARTY; and should the SECOND PARTY fail to finish</span>`)}
  <div>the job within the said period, the SECOND PARTY shall indemnify the sum of &nbsp;${escapeHtml(data.liquidatedDamagesRate)}&nbsp;for</div>
  <div>every day of delay of liquidated damages.</div>
</div>

<!-- Commencement -->
<div class="indent section">
  ${ROW(L("That this Contract shall commence on") + SF(comd.full || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"))}
  ${ROW(L("at") + SF(escapeHtml(data.commencementLocation)))}
</div>

<!-- IN WITNESS WHEREOF -->
<div class="indent section" style="margin-bottom:20px;">
  ${ROW(L("IN WITNESS WHEREOF, the parties signed &nbsp;&nbsp;this contract on the") + F(cd.ordDay, "55px") + L("day of"))}
  ${ROW(F(cd.month || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", "130px") + `<span style="white-space:nowrap;">&nbsp;&nbsp;, ${escapeHtml(cd.year || "____")}</span>`)}
</div>

<!-- Signature block -->
<div style="display:flex;justify-content:space-between;margin-top:28px;">
  <div style="width:44%;text-align:center;">
    <div class="bold" style="margin-bottom:2px;">${escapeHtml(data.firstPartyAgency)}:</div>
    <div class="bold" style="margin-bottom:4px;">${escapeHtml(data.firstPartyRep)}</div>
    <div style="border-bottom:1px solid #000;margin-bottom:4px;"></div>
    <div style="font-size:9pt;">(Signature of the FIRST PARTY)</div>
  </div>
  <div style="width:44%;text-align:center;">
    <div class="bold" style="margin-bottom:2px;">${escapeHtml(data.secondPartyName)}:</div>
    <div class="bold" style="margin-bottom:4px;">${escapeHtml(data.secondPartyRep)}</div>
    <div style="border-bottom:1px solid #000;margin-bottom:4px;"></div>
    <div style="font-size:9pt;">(Signature of the SECOND PARTY)</div>
  </div>
</div>

<!-- Witnesses -->
<div class="center bold" style="margin:28px 0 16px;">WITNESSES:</div>
<div style="display:flex;justify-content:space-between;">
  <div style="width:44%;text-align:center;">
    <div class="bold" style="margin-bottom:4px;">${escapeHtml(data.witnessOne)}</div>
    <div style="border-bottom:1px solid #000;"></div>
  </div>
  <div style="width:44%;text-align:center;">
    <div class="bold" style="margin-bottom:4px;">${escapeHtml(data.witnessTwo)}</div>
    <div style="border-bottom:1px solid #000;"></div>
  </div>
</div>

</body>
</html>`;
}
