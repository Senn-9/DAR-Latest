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
  ${data.contractTitle || "CONTRACT FOR SERVICES"}
</div>

<!-- KNOW ALL MEN -->
<div class="bold section" style="margin-bottom:16px;">KNOW ALL MEN BY THESE PRESENTS:</div>

<!-- Party intro -->
<div class="indent section">
  <p style="margin:0;text-indent:2em;">
    This contract, executed by and between ${F(escapeHtml(data.firstPartyAgency))} Provincial Office, 
    represented by ${F(escapeHtml(data.firstPartyRep))} with office address at 
    ${F(escapeHtml(data.firstPartyOffice), "200px")}, hereinafter referred to as the party of the FIRST PART; 
    and ${F(escapeHtml(data.secondPartyName))}, represented by ${F(escapeHtml(data.secondPartyRep))}, 
    Filipino, of legal age and a resident of ${F(escapeHtml(data.secondPartyCity || data.commencementLocation), "110px")} 
    hereinafter referred to as the party of the SECOND PART.
  </p>
</div>

<!-- WITNESSETH -->
<div class="center bold section" style="letter-spacing:6px;margin:20px 0;">W I T N E S S E T H</div>

<!-- Consideration -->
<div class="indent section">
  <p style="margin:0;text-indent:2em;">
    That for and in consideration of the sum of ${F(escapeHtml(data.considerationAmountWords).toUpperCase(), "300px", "text-transform:uppercase;")} 
    (${fmtMoney(data.considerationAmount)}), which the FIRST PARTY agreed to pay unto the SECOND PARTY, the SECOND PARTY 
    agrees to deliver/provide the ${F(data.serviceDescription || "", "250px")}.  
  </p>
</div>

<!-- Payment -->
<div class="indent section">
  <p style="margin:0;text-indent:2em;">
    That the FIRST PARTY shall pay the full amount to the SECOND PARTY when the 
    ${F(data.paymentCondition || data.serviceDescription || "", "300px")}.  
  </p>
</div>

<!-- Job order -->
<div class="indent section">
  <p style="margin:0;text-indent:2em;">
    That the SECOND PARTY agrees to finish the ${F(data.jobOrderDescription || "JOB ORDER", "180px")} 
    within ${F(escapeHtml(data.scheduledDays), "40px")} scheduled days counted from the day the contract for the 
    ${F(data.serviceDescription || "", "200px")} ${F(comd.full || "", "180px")} 
    has been issued by the FIRST PARTY; and should the SECOND PARTY fail to finish the job within the said period, 
    the SECOND PARTY shall indemnify the sum of ${escapeHtml(data.liquidatedDamagesRate)} for every day of delay of liquidated damages.
  </p>
</div>

<!-- Commencement -->
<div class="indent section">
  <p style="margin:0;text-indent:2em;">
    That this Contract shall commence on ${F(comd.full || "", "180px")} at ${F(escapeHtml(data.commencementLocation), "180px")}.
  </p>
</div>

<!-- IN WITNESS WHEREOF -->
<div class="indent section" style="margin-bottom:20px;">
  <p style="margin:0;text-indent:2em;">
    IN WITNESS WHEREOF, the parties signed this contract on the ${F(cd.ordDay, "55px")} day of 
    ${F(cd.month || "", "130px")}, ${escapeHtml(cd.year || "")}.
  </p>
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
