"use client";

import { useState } from "react";
import {
  RiFileTextLine,
  RiSearchLine,
  RiAwardLine,
  RiShoppingCartLine,
  RiTruckLine,
  RiMoneyDollarCircleLine,
  RiCheckboxCircleLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiInformationLine,
  RiCloseLine,
  RiUserLine,
} from "react-icons/ri";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tag = { label: string; cls: string };

type Step = {
  id: number;
  name: string;
  desc: string;
  tags: Tag[];
  detail: string;
  actor: string;
};

type Phase = {
  id: string;
  label: string;
  icon: React.ReactNode;
  headerBg: string;
  headerText: string;
  borderColor: string;
  dotColor: string;
  lineColor: string;
  steps: Step[];
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    id: "pr",
    label: "Purchase Request",
    icon: <RiFileTextLine size={16} />,
    headerBg: "bg-blue-50",
    headerText: "text-blue-800",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500 border-blue-300",
    lineColor: "bg-blue-200",
    steps: [
      {
        id: 1,
        name: "Pending",
        desc: "PR submitted, awaiting initial review",
        actor: "End User",
        tags: [{ label: "End User", cls: "bg-blue-50 text-blue-800 border border-blue-200" }],
        detail:
          "The requesting office/section submits the purchase request. It sits in queue until a Division Head picks it up for review and endorsement.",
      },
      {
        id: 2,
        name: "Processing — Division Head",
        desc: "Division Head reviews and endorses the PR",
        actor: "Division Head",
        tags: [{ label: "Division Head", cls: "bg-teal-50 text-teal-800 border border-teal-200" }],
        detail:
          "The Division Head validates the necessity of the purchase, checks against available budget, and either endorses it to BAC or returns it for revision with remarks.",
      },
      {
        id: 3,
        name: "Processing — BAC",
        desc: "BAC determines procurement modality",
        actor: "BAC",
        tags: [{ label: "BAC", cls: "bg-purple-50 text-purple-800 border border-purple-200" }],
        detail:
          "The Bids and Awards Committee evaluates the PR and determines the appropriate procurement mode: Shopping, Direct Contracting, Public Bidding, etc., based on the amount and nature of the purchase.",
      },
      {
        id: 4,
        name: "Processing — Budget",
        desc: "Budget Office certifies fund availability",
        actor: "Budget Office",
        tags: [{ label: "Budget", cls: "bg-amber-50 text-amber-800 border border-amber-200" }],
        detail:
          "The Budget Office issues a Certification of Fund Availability (CFA), confirming that the budget allotment covers the requested procurement.",
      },
      {
        id: 5,
        name: "Processing — PARPO",
        desc: "PARPO reviews and approves the PR",
        actor: "PARPO",
        tags: [{ label: "PARPO", cls: "bg-rose-50 text-rose-800 border border-rose-200" }],
        detail:
          "The Provincial Administrator / Regional Planning Office reviews the PR for policy compliance and approves before canvassing begins.",
      },
    ],
  },
  {
    id: "canvas",
    label: "Canvassing",
    icon: <RiSearchLine size={16} />,
    headerBg: "bg-violet-50",
    headerText: "text-violet-800",
    borderColor: "border-violet-200",
    dotColor: "bg-violet-500 border-violet-300",
    lineColor: "bg-violet-200",
    steps: [
      {
        id: 6,
        name: "Canvassing — Reception",
        desc: "Requests for Quotation (RFQ) received",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "Supply Office prepares and sends out Requests for Quotation (RFQ) to at least 3 suppliers as required under RA 9184 for Shopping mode.",
      },
      {
        id: 8,
        name: "Canvassing — Releasing",
        desc: "RFQs released to prospective suppliers",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "RFQs are formally released to prospective suppliers with a stated deadline for submission of price quotations.",
      },
      {
        id: 9,
        name: "Canvassing — Collection",
        desc: "Quotations collected and tabulated",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "Submitted quotations from suppliers are collected and tabulated in a Comparative Statement of Prices for BAC evaluation.",
      },
    ],
  },
  {
    id: "bac",
    label: "BAC Evaluation",
    icon: <RiAwardLine size={16} />,
    headerBg: "bg-purple-50",
    headerText: "text-purple-800",
    borderColor: "border-purple-200",
    dotColor: "bg-purple-500 border-purple-300",
    lineColor: "bg-purple-200",
    steps: [
      {
        id: 7,
        name: "BAC Resolution",
        desc: "BAC evaluates bids and issues resolution",
        actor: "BAC",
        tags: [{ label: "BAC", cls: "bg-purple-50 text-purple-800 border border-purple-200" }],
        detail:
          "BAC opens and evaluates submitted quotations/bids, identifies the Lowest Calculated Responsive Bid (LCRB), and issues a BAC Resolution recommending award.",
      },
      {
        id: 10,
        name: "Abstract of Awards (AAA)",
        desc: "Award summary document prepared",
        actor: "BAC / Supply",
        tags: [
          { label: "BAC", cls: "bg-purple-50 text-purple-800 border border-purple-200" },
          { label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
        ],
        detail:
          "The Abstract of Canvass / Abstract of Awards document is prepared and signed, formally recording the winning bidder, awarded items, and total award amount.",
      },
    ],
  },
  {
    id: "po",
    label: "Purchase Order (PO)",
    icon: <RiShoppingCartLine size={16} />,
    headerBg: "bg-teal-50",
    headerText: "text-teal-800",
    borderColor: "border-teal-200",
    dotColor: "bg-teal-500 border-teal-300",
    lineColor: "bg-teal-200",
    steps: [
      {
        id: 11,
        name: "PO — Creation",
        desc: "Purchase Order document drafted",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "Supply Office prepares the Purchase Order based on the awarded quotation/bid, detailing items, quantities, unit prices, and delivery terms.",
      },
      {
        id: 12,
        name: "PO — Allocation",
        desc: "ORS number allocated to the PO",
        actor: "Budget Office",
        tags: [{ label: "Budget", cls: "bg-amber-50 text-amber-800 border border-amber-200" }],
        detail:
          "Budget Office assigns an Obligation Request and Status (ORS) number, formally obligating the funds against the allotment.",
      },
      {
        id: 13,
        name: "ORS — Creation",
        desc: "ORS document formally created",
        actor: "Budget Office",
        tags: [{ label: "Budget", cls: "bg-amber-50 text-amber-800 border border-amber-200" }],
        detail:
          "The Obligation Request and Status (ORS) document is formally created, recording the obligation against the specific allotment class and fund.",
      },
      {
        id: 14,
        name: "ORS — Processing",
        desc: "ORS reviewed and allotment certified",
        actor: "Budget Office",
        tags: [{ label: "Budget", cls: "bg-amber-50 text-amber-800 border border-amber-200" }],
        detail:
          "The ORS undergoes review and the Chief Accountant / Budget Officer issues a Certification of Availability of Allotment (CAA).",
      },
      {
        id: 15,
        name: "PO — Accounting",
        desc: "Accounting pre-audits the PO package",
        actor: "Accounting",
        tags: [{ label: "Accounting", cls: "bg-blue-50 text-blue-800 border border-blue-200" }],
        detail:
          "Accounting Office performs a pre-audit: verifies completeness of supporting documents, correctness of prices and computations, and presence of required signatures.",
      },
      {
        id: 16,
        name: "PO — PARPO",
        desc: "Approving authority signs the PO",
        actor: "PARPO",
        tags: [{ label: "PARPO", cls: "bg-rose-50 text-rose-800 border border-rose-200" }],
        detail:
          "The authorized approving authority signs the Purchase Order, making it an official and legally binding contract with the supplier.",
      },
      {
        id: 17,
        name: "PO — Serving",
        desc: "Signed PO served to supplier",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "The signed PO is formally delivered to the winning supplier, who acknowledges receipt. The delivery period clock begins from this date.",
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: <RiTruckLine size={16} />,
    headerBg: "bg-cyan-50",
    headerText: "text-cyan-800",
    borderColor: "border-cyan-200",
    dotColor: "bg-cyan-500 border-cyan-300",
    lineColor: "bg-cyan-200",
    steps: [
      {
        id: 18,
        name: "Delivery — Waiting",
        desc: "Awaiting supplier delivery within PO terms",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "Agency waits for the supplier to deliver the items within the agreed delivery period as stated in the PO. Delays may trigger liquidated damages.",
      },
      {
        id: 19,
        name: "Delivery — Received",
        desc: "Items physically received and inspected",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "Supply Officer physically receives the delivered items and inspects them against the PO specifications — checking quantity, quality, and conformance.",
      },
      {
        id: 20,
        name: "Delivery — IAR",
        desc: "Inspection and Acceptance Report prepared",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "The Supply Officer and end-user jointly inspect items and prepare the Inspection and Acceptance Report (IAR) certifying conformance to specifications.",
      },
      {
        id: 21,
        name: "Delivery — IAR Processing",
        desc: "IAR signed by inspector and end-user",
        actor: "Supply / End User",
        tags: [
          { label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
          { label: "End User", cls: "bg-blue-50 text-blue-800 border border-blue-200" },
        ],
        detail:
          "Designated inspector and end-user sign the IAR. This document is critical — it formally certifies that items meet the required specifications.",
      },
      {
        id: 22,
        name: "Delivery — LOA",
        desc: "Letter of Acceptance prepared",
        actor: "Supply Office",
        tags: [{ label: "Supply", cls: "bg-emerald-50 text-emerald-800 border border-emerald-200" }],
        detail:
          "A Letter of Acceptance (LOA) is prepared and signed by the authorized official, formally accepting the delivery from the supplier.",
      },
      {
        id: 23,
        name: "Delivery — DV Preparation",
        desc: "Disbursement Voucher drafted by Accounting",
        actor: "Accounting",
        tags: [{ label: "Accounting", cls: "bg-blue-50 text-blue-800 border border-blue-200" }],
        detail:
          "Accounting Office prepares the Disbursement Voucher (DV) and attaches all supporting documents: PO, ORS, IAR, LOA, delivery receipt, and tax documents.",
      },
      {
        id: 24,
        name: "Delivery — Division Chief",
        desc: "Division Chief certifies the DV (Box C)",
        actor: "Division Head",
        tags: [{ label: "Division Head", cls: "bg-teal-50 text-teal-800 border border-teal-200" }],
        detail:
          "The Division Chief certifies Box C of the DV, confirming that the expenses are necessary, lawful, and incurred under their supervision.",
      },
    ],
  },
  {
    id: "payment",
    label: "Payment Processing",
    icon: <RiMoneyDollarCircleLine size={16} />,
    headerBg: "bg-orange-50",
    headerText: "text-orange-800",
    borderColor: "border-orange-200",
    dotColor: "bg-orange-500 border-orange-300",
    lineColor: "bg-orange-200",
    steps: [
      {
        id: 25,
        name: "Payment — Accounting",
        desc: "Accounting performs final DV review",
        actor: "Accounting",
        tags: [{ label: "Accounting", cls: "bg-blue-50 text-blue-800 border border-blue-200" }],
        detail:
          "Accounting Office performs a thorough final pre-audit of the complete DV package before certification of funds availability.",
      },
      {
        id: 28,
        name: "Payment Pending",
        desc: "DV queued in Accounting",
        actor: "Accounting",
        tags: [{ label: "Accounting", cls: "bg-blue-50 text-blue-800 border border-blue-200" }],
        detail:
          "DV is queued in Accounting for processing — funds verification, obligation matching, and certification of availability of funds.",
      },
      {
        id: 29,
        name: "Voucher Verification",
        desc: "DV verified for completeness of attachments",
        actor: "Accounting",
        tags: [{ label: "Accounting", cls: "bg-blue-50 text-blue-800 border border-blue-200" }],
        detail:
          "Accountant verifies all attachments are present and correct: PO, IAR, LOA, ORS/CAA, delivery receipt, and required tax documents.",
      },
      {
        id: 30,
        name: "Accounting Review",
        desc: "Chief Accountant certifies DV (Box B)",
        actor: "Accounting",
        tags: [{ label: "Accounting", cls: "bg-blue-50 text-blue-800 border border-blue-200" }],
        detail:
          "The Chief Accountant reviews and certifies the DV by signing Box B, confirming availability of funds and proper accounting entries.",
      },
      {
        id: 32,
        name: "PARPO Approval",
        desc: "Approving authority signs DV (Box D)",
        actor: "PARPO",
        tags: [{ label: "PARPO", cls: "bg-rose-50 text-rose-800 border border-rose-200" }],
        detail:
          "The Provincial Administrator / approving authority signs Box D of the DV, formally authorizing the payment to be made.",
      },
      {
        id: 33,
        name: "Forward to Cash",
        desc: "Approved DV transmitted to Cashier",
        actor: "Cash",
        tags: [{ label: "Cash", cls: "bg-orange-50 text-orange-800 border border-orange-200" }],
        detail:
          "The fully approved DV is transmitted to the Cashier's Office for check preparation or Authority to Debit Account (ADA) processing.",
      },
      {
        id: 34,
        name: "Forward to PARPO Signature",
        desc: "Check routed for co-signature",
        actor: "PARPO",
        tags: [{ label: "PARPO", cls: "bg-rose-50 text-rose-800 border border-rose-200" }],
        detail:
          "The prepared check or ADA is forwarded back to PARPO / approving authority for co-signing as required by bank and COA regulations.",
      },
      {
        id: 35,
        name: "Tax Processing",
        desc: "BIR taxes computed and withheld",
        actor: "Cash",
        tags: [{ label: "Cash", cls: "bg-orange-50 text-orange-800 border border-orange-200" }],
        detail:
          "Cash Office computes and withholds applicable taxes (Expanded Withholding Tax, VAT) per BIR regulations and prepares BIR Form 2307 (Certificate of Creditable Tax Withheld).",
      },
      {
        id: 36,
        name: "Cash for Release",
        desc: "Payment ready — supplier notified",
        actor: "Cash",
        tags: [{ label: "Cash", cls: "bg-orange-50 text-orange-800 border border-orange-200" }],
        detail:
          "The check or ADA is ready for release. Supplier is formally notified to claim payment from the Cashier's Office, presenting required IDs and documents.",
      },
    ],
  },
  {
    id: "completed",
    label: "Completed",
    icon: <RiCheckboxCircleLine size={16} />,
    headerBg: "bg-green-50",
    headerText: "text-green-800",
    borderColor: "border-green-200",
    dotColor: "bg-green-500 border-green-300",
    lineColor: "bg-green-200",
    steps: [
      {
        id: 37,
        name: "Completed (PR phase)",
        desc: "PR cycle formally closed",
        actor: "System",
        tags: [{ label: "System", cls: "bg-gray-100 text-gray-700 border border-gray-200" }],
        detail:
          "The Purchase Request has been fully processed through all PR-phase steps and endorsed for the next procurement stage. Record archived.",
      },
      {
        id: 38,
        name: "Completed (PO phase)",
        desc: "PO fully executed and served",
        actor: "System",
        tags: [{ label: "System", cls: "bg-gray-100 text-gray-700 border border-gray-200" }],
        detail:
          "The Purchase Order has been fully signed, approved, and served to the supplier. The delivery period has commenced.",
      },
      {
        id: 39,
        name: "Completed (Delivery phase)",
        desc: "Items received and accepted",
        actor: "System",
        tags: [{ label: "System", cls: "bg-gray-100 text-gray-700 border border-gray-200" }],
        detail:
          "All items have been received, inspected, and accepted. The IAR and LOA are signed. The DV package is complete and ready for payment.",
      },
      {
        id: 40,
        name: "Completed (Payment phase)",
        desc: "Supplier paid — cycle fully closed",
        actor: "System",
        tags: [{ label: "System", cls: "bg-gray-100 text-gray-700 border border-gray-200" }],
        detail:
          "Payment has been fully released to the supplier. All withholding taxes are filed. All procurement documents are archived. The procurement cycle is completely closed.",
      },
    ],
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepRow({
  step,
  isFirst,
  isLast,
  phase,
  isActive,
  onToggle,
}: {
  step: Step;
  isFirst: boolean;
  isLast: boolean;
  phase: Phase;
  isActive: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left flex items-stretch hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
      >
        {/* Status ID */}
        <div className="flex items-center justify-center w-10 shrink-0 border-r border-gray-100">
          <span className="font-mono text-[10px] font-semibold text-gray-400">{step.id}</span>
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center w-7 shrink-0">
          <div
            className={`w-px flex-1 ${phase.lineColor} ${isFirst ? "opacity-0" : ""}`}
          />
          <div
            className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${phase.dotColor}`}
          />
          <div
            className={`w-px flex-1 ${phase.lineColor} ${isLast ? "opacity-0" : ""}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 py-2.5 pr-3 pl-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-800 leading-tight">{step.name}</span>
            <span className="shrink-0 text-gray-300">
              {isActive ? <RiArrowDownSLine size={14} /> : <RiArrowRightSLine size={14} />}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{step.desc}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {step.tags.map((tag) => (
              <span
                key={tag.label}
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tag.cls}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </button>

      {/* Detail panel */}
      {isActive && (
        <div className="bg-gray-50 border-b border-gray-100 px-3 py-2.5 pl-[74px]">
          <div className="flex items-start gap-2">
            <RiInformationLine size={13} className="text-gray-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-600 leading-relaxed">{step.detail}</p>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <RiUserLine size={11} className="text-gray-400" />
            <span className="text-[10px] text-gray-400 font-medium">Handled by:</span>
            <span className="text-[10px] text-gray-600 font-semibold">{step.actor}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseAccordion({
  phase,
  activeStep,
  onStepToggle,
}: {
  phase: Phase;
  activeStep: number | null;
  onStepToggle: (id: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Phase header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${phase.headerBg} border-b ${phase.borderColor} focus:outline-none`}
      >
        <span className={`${phase.headerText}`}>{phase.icon}</span>
        <span className={`text-xs font-bold tracking-wide uppercase ${phase.headerText}`}>
          {phase.label}
        </span>
        <span className={`ml-1 text-[10px] font-semibold ${phase.headerText} opacity-60`}>
          {phase.steps.length} steps
        </span>
        <span className={`ml-auto ${phase.headerText} opacity-60`}>
          {collapsed ? <RiArrowRightSLine size={14} /> : <RiArrowDownSLine size={14} />}
        </span>
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="bg-white">
          {phase.steps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              phase={phase}
              isFirst={idx === 0}
              isLast={idx === phase.steps.length - 1}
              isActive={activeStep === step.id}
              onToggle={() => onStepToggle(step.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND = [
  { label: "PR phase", dot: "bg-blue-500" },
  { label: "Canvassing", dot: "bg-violet-500" },
  { label: "BAC", dot: "bg-purple-500" },
  { label: "Purchase Order", dot: "bg-teal-500" },
  { label: "Delivery", dot: "bg-cyan-500" },
  { label: "Payment", dot: "bg-orange-500" },
  { label: "Completed", dot: "bg-green-500" },
];

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProcurementTimeline({ modalView = false }: { modalView?: boolean }) {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailModal, setDetailModal] = useState<Step | null>(null);

  const totalSteps = PHASES.reduce((s, p) => s + p.steps.length, 0);
  const maxStatusId = Math.max(...PHASES.flatMap((phase) => phase.steps.map((step) => step.id)));

  const handleStepToggle = (id: number) => {
    setActiveStep((prev) => (prev === id ? null : id));
  };

  // Filter phases/steps by search query
  const filteredPhases = searchQuery.trim()
    ? PHASES.map((phase) => ({
        ...phase,
        steps: phase.steps.filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(s.id).includes(searchQuery)
        ),
      })).filter((p) => p.steps.length > 0)
    : PHASES;

  const displayedStepCount = filteredPhases.reduce((s, p) => s + p.steps.length, 0);

  return (
    <div className={modalView ? "min-h-[72vh]" : "min-h-screen"}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <div className="w-full max-w-2xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">
              Reference Guide
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Procurement Workflow</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="mono font-semibold text-gray-600">{displayedStepCount}</span> steps across{" "}
              <span className="mono font-semibold text-gray-600">{PHASES.length}</span> phases
            </p>
            {!searchQuery.trim() && maxStatusId !== totalSteps && (
              <p className="text-[11px] text-gray-400 mt-1">
                Status IDs run through <span className="font-mono font-semibold text-gray-600">{maxStatusId}</span>.
              </p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <RiSearchLine size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search steps, actors, or status ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-gray-400 hover:text-gray-600"
            >
              <RiCloseLine size={14} />
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {LEGEND.map(({ label, dot }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-[11px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Phases */}
        <div className="space-y-3">
          {filteredPhases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <RiSearchLine size={32} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No steps match your search.</p>
            </div>
          ) : (
            filteredPhases.map((phase) => (
              <PhaseAccordion
                key={phase.id}
                phase={phase}
                activeStep={activeStep}
                onStepToggle={handleStepToggle}
              />
            ))
          )}
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-gray-400 text-center pb-4">
          Status IDs correspond to <span className="font-mono">status_id</span> values in the{" "}
          <span className="font-mono">status</span> table. Click any step to expand details.
        </p>
      </div>

      {/* Detail modal (optional full-screen view) */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 mono">Status ID {detailModal.id}</p>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">{detailModal.name}</h3>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{detailModal.detail}</p>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <RiUserLine size={14} className="text-gray-400" />
              <span className="text-xs text-gray-400">Handled by:</span>
              <span className="text-xs font-semibold text-gray-700">{detailModal.actor}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}