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
} from "react-icons/ri";
import { type StatusFlag } from "../StatusFlagPicker";

// Template loading function
async function loadTemplate(templateName: string): Promise<string> {
  try {
    const response = await fetch(`/documents/${templateName}-template.html`);
    if (!response.ok) throw new Error(`Failed to load ${templateName} template`);
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

      return value ? content : "";
    },
  );

  result = result.replace(
    /{{#unless\s+(\w+)}}([\s\S]*?){{\/unless}}/g,
    (_match: string, condition: string, content: string) => {
      const value = data[condition];

      return !value ? content : "";
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

// HTML building functions
async function buildIARHtml(d: any): Promise<string> {
  const template = await loadTemplate("IAR");
  return replacePlaceholders(template, d);
}

async function buildLOAHtml(d: any): Promise<string> {
  const template = await loadTemplate("LOA");
  return replacePlaceholders(template, d);
}

// Document Preview Components
function IARDocumentPreview({ delivery, iar, poData }: { delivery: any; iar: any; poData: any }) {
  const [html, setHtml] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const generateHtml = async () => {
      if (delivery && iar) {
        try {
          // Transform poData to have the correct structure for templates
          const transformedPoData = poData ? {
            ...poData,
            po_items: poData.purchase_order_items || []
          } : {};
          
          // Merge data in correct priority order: IAR data > PO data > delivery data
          const mergedData = { ...delivery, ...transformedPoData, ...iar };
          mergedData.po_items = transformedPoData.po_items || [];
          
          // Ensure required boolean fields have default values for template conditionals
          mergedData.inspection_verified = mergedData.inspection_verified || false;
          mergedData.items_complete = mergedData.items_complete !== false; // Default to true unless explicitly false
          
          // Add default values for all required IAR fields to prevent missing data
          // Only set defaults if the value is not already present from PO or IAR data
          mergedData.fund_cluster = mergedData.fund_cluster || 'General Fund';
          mergedData.supplier = mergedData.supplier || 'Not specified';
          mergedData.iar_no = mergedData.iar_no || 'N/A';
          mergedData.iar_date = mergedData.iar_date || new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          // Create PO No./Date field with both number and date
          const poNumber = transformedPoData.po_no || delivery.po_no || 'N/A';
          const poDate = transformedPoData.date || transformedPoData.created_at;
          const formattedPoDate = poDate ? new Date(poDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }) : '';
          
          // Only override if we have actual PO data
          if (transformedPoData.po_no && transformedPoData.po_no !== 'N/A') {
            mergedData.po_no = formattedPoDate ? `${poNumber} / ${formattedPoDate}` : poNumber;
          } else if (!mergedData.po_no || mergedData.po_no === 'N/A') {
            mergedData.po_no = poNumber;
          }
          mergedData.office_section = mergedData.office_section || 'Not specified';
          mergedData.responsibility_center_code = mergedData.responsibility_center_code || 'N/A';
          mergedData.invoice_no = mergedData.invoice_no || 'N/A';
          mergedData.invoice_date = mergedData.invoice_date || new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          mergedData.inspected_at = mergedData.inspected_at || new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          mergedData.received_at = mergedData.received_at || new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          mergedData.inspection_officer = mergedData.inspection_officer || 'Not specified';
          mergedData.supply_officer = mergedData.supply_officer || 'Not specified';
          
          // Ensure po_items have default values for all required fields
          if (mergedData.po_items && Array.isArray(mergedData.po_items)) {
            mergedData.po_items = mergedData.po_items.map((item: any) => ({
              stock_no: item.stock_no || 'N/A',
              unit: item.unit || 'pcs',
              description: item.description || 'No description',
              quantity: item.quantity || '0',
              unit_price: item.unit_price || '0.00',
              subtotal: item.subtotal || '0.00',
              ...item
            }));
          }
          
          const generatedHtml = await buildIARHtml(mergedData);
          setHtml(generatedHtml);
        } catch (error) {
          console.error("Error generating IAR HTML:", error);
        }
      }
    };

    generateHtml();
  }, [delivery, iar, poData]);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '142.85%', height: '142.85%' }}>
      <iframe
        ref={iframeRef}
        title="IAR Preview"
        className="w-full border-0"
        style={{ height: '1000px', minHeight: '1000px' }}
      />
    </div>
  );
}

function LOADocumentPreview({ delivery, loa, poData }: { delivery: any; loa: any; poData: any }) {
  const [html, setHtml] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const generateHtml = async () => {
      if (delivery && loa) {
        try {
          // Transform poData to have the correct structure for templates
          const transformedPoData = poData ? {
            ...poData,
            po_items: poData.purchase_order_items || []
          } : {};
          
          // Merge data in correct priority order: LOA data > PO data > delivery data
          const mergedData = { ...delivery, ...transformedPoData, ...loa };
          mergedData.po_items = transformedPoData.po_items || [];
          
          // Create PO No./Date field with both number and date
          const poNumber = transformedPoData.po_no || delivery.po_no || 'N/A';
          const poDate = transformedPoData.date || transformedPoData.created_at;
          const formattedPoDate = poDate ? new Date(poDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }) : '';
          
          // Only override if we have actual PO data
          if (transformedPoData.po_no && transformedPoData.po_no !== 'N/A') {
            mergedData.po_no = formattedPoDate ? `${poNumber} / ${formattedPoDate}` : poNumber;
          } else if (!mergedData.po_no || mergedData.po_no === 'N/A') {
            mergedData.po_no = poNumber;
          }
          
          const generatedHtml = await buildLOAHtml(mergedData);
          setHtml(generatedHtml);
        } catch (error) {
          console.error("Error generating LOA HTML:", error);
        }
      }
    };

    generateHtml();
  }, [delivery, loa, poData]);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '142.85%', height: '142.85%' }}>
      <iframe
        ref={iframeRef}
        title="LOA Preview"
        className="w-full border-0"
        style={{ height: '1000px', minHeight: '1000px' }}
      />
    </div>
  );
}

export type PaymentProcessDocType = "iar" | "loa" | "ors" | "dv";

function documentsForStatus(statusId: number | undefined): PaymentProcessDocType[] {
  switch (statusId) {
    case 29:
      return ["iar", "loa", "ors", "dv"];
    case 30:
      return ["ors", "dv", "iar", "loa"];
    case 32:
    case 33:
      return ["dv", "ors"];
    case 34:
      return ["dv"];
    case 35:
      return ["ors", "dv"];
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
        {subtitle ? <p className="text-xs text-gray-500 mt-0.5 leading-snug">{subtitle}</p> : null}
      </div>
    </label>
  );
}

function DeliveryContextPanel({ active, poData }: { active: any; poData: any }) {
  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">Record</p>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 shrink-0">Delivery No.</dt>
              <dd className="font-mono font-semibold text-gray-900 text-right truncate">{active?.delivery_no ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 shrink-0">PO No.</dt>
              <dd className="font-mono font-medium text-gray-900 text-right truncate">{active?.po_no ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 shrink-0">Supplier</dt>
              <dd className="text-gray-900 text-right truncate">{active?.supplier ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 shrink-0">Section</dt>
              <dd className="text-gray-900 text-right truncate">{active?.office_section ?? "—"}</dd>
            </div>
            {poData?.total_amount != null && (
              <div className="flex justify-between gap-4 pt-2 border-t border-emerald-100">
                <dt className="text-gray-500 shrink-0">PO amount</dt>
                <dd className="font-mono font-semibold text-emerald-900">
                  ₱{Number(poData.total_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Supporting documents (IAR, LOA, ORS, DV) open in the preview column on later steps. Advance to Voucher Verification when this record is ready.
        </p>
      </div>
    </div>
  );
}

const PAYMENT_FLOW_STRIP: { id: number; label: string }[] = [
  { id: 28, label: "Pending" },
  { id: 29, label: "Voucher" },
  { id: 30, label: "Accounting" },
  { id: 32, label: "PARPO" },
  { id: 33, label: "Cash" },
  { id: 34, label: "PARPO sig." },
  { id: 35, label: "Tax" },
  { id: 36, label: "Done" },
];

interface ProcessPaymentModalProps {
  visible: boolean;
  active: any;
  onClose: () => void;
  onSubmit: () => Promise<void>;
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
  const [previewTab, setPreviewTab] = useState<PaymentProcessDocType | null>(null);
  const [orsData, setOrsData] = useState(ors || {});
  const [dvData, setDvData] = useState(dv || {});
  const [iarData, setIarData] = useState(iar || {});
  const [loaData, setLoaData] = useState(loa || {});

  const [queueReady, setQueueReady] = useState(false);
  const [iarReviewed, setIarReviewed] = useState(false);
  const [loaReviewed, setLoaReviewed] = useState(false);
  const [acctReconciled, setAcctReconciled] = useState(false);
  const [parpoPackageOk, setParpoPackageOk] = useState(false);
  const [cashRouted, setCashRouted] = useState(false);
  const [parpoSignatureDone, setParpoSignatureDone] = useState(false);
  const [bir2307Done, setBir2307Done] = useState(false);
  const [jevDone, setJevDone] = useState(false);

  // Action label for the transition out of the current status (matches Payment page onSubmit)
  const getCurrentStepInfo = () => {
    switch (active?.status_id) {
      case 28:
        return { label: "Advance to Voucher Verification", nextStatus: 29 };
      case 29:
        return { label: "Complete Voucher Verification", nextStatus: 30 };
      case 30:
        return { label: "Complete Accounting Review", nextStatus: 32 };
      case 32:
        return { label: "Complete PARPO Approval", nextStatus: 33 };
      case 33:
        return { label: "Complete Forward to Cash", nextStatus: 34 };
      case 34:
        return { label: "Complete PARPO signature routing", nextStatus: 35 };
      case 35:
        return { label: "Complete Tax processing handoff", nextStatus: 36 };
      default:
        return { label: "Advance to Voucher Verification", nextStatus: 29 };
    }
  };

  const currentStepInfo = getCurrentStepInfo();

  const stepChecklistOk = (): boolean => {
    switch (active?.status_id) {
      case 28:
        return queueReady;
      case 29:
        return iarReviewed && loaReviewed;
      case 30:
        return acctReconciled;
      case 32:
        return parpoPackageOk;
      case 33:
        return cashRouted;
      case 34:
        return parpoSignatureDone;
      case 35:
        return bir2307Done && jevDone;
      default:
        return true;
    }
  };

  const isFormValid = stepChecklistOk() && statusFlag !== null;

  const resetStepFields = () => {
    setQueueReady(false);
    setIarReviewed(false);
    setLoaReviewed(false);
    setAcctReconciled(false);
    setParpoPackageOk(false);
    setCashRouted(false);
    setParpoSignatureDone(false);
    setBir2307Done(false);
    setJevDone(false);
  };

  useEffect(() => {
    if (visible) {
      setNotes("");
      resetStepFields();
      setOrsData(ors || {});
      setDvData(dv || {});
      setIarData(iar || {});
      setLoaData(loa || {});
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
    await onSubmit();
    onClose();
  };

  const renderFormContent = () => {
    switch (active?.status_id) {
      case 28:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-800">Payment Pending</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Confirm this delivery is ready to enter voucher verification. Use the checklist and status flag before advancing.
            </p>
            <ChecklistRow
              checked={queueReady}
              onChange={setQueueReady}
              title="Ready for voucher verification"
              subtitle="Delivery, PO, and section are correct; you will move the record to Voucher Verification."
            />
          </div>
        );

      case 29:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-800">Voucher verification</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Use the document preview to review IAR and LOA templates, and ORS/DV references. Confirm each line item below matches your review.
            </p>
            <div className="space-y-2">
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
          </div>
        );

      case 30:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-800">Accounting review</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Reconcile ORS and DV with supporting IAR/LOA. Confirm the package is accurate before PARPO approval.
            </p>
            <ChecklistRow
              checked={acctReconciled}
              onChange={setAcctReconciled}
              title="Financial package reconciled"
              subtitle="Amounts, references, and supporting documents are consistent and compliant."
            />
          </div>
        );

      case 32:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-800">PARPO approval</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              PARPO confirms the procurement and payment package. Review DV (and ORS) in the preview panel.
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
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-800">Forward to Cash</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Cash classifies payment instrument (check, LLDAP, etc.) and handles EMDS encoding as applicable.
            </p>
            <ChecklistRow
              checked={cashRouted}
              onChange={setCashRouted}
              title="Routed to Cash / classification logged"
              subtitle="DV and ORS handed off for Cash processing."
            />
          </div>
        );

      case 34:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-800">PARPO office signature</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Complete required PARPO office signatures on the DV chain before tax processing.
            </p>
            <ChecklistRow
              checked={parpoSignatureDone}
              onChange={setParpoSignatureDone}
              title="PARPO office signatures obtained"
              subtitle="Signature block complete per internal procedure."
            />
          </div>
        );

      case 35:
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-900">Tax processing</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Accounting completes BIR 2307, JEV, and related entries before final Cash release.
            </p>
            <div className="space-y-2">
              <ChecklistRow
                checked={bir2307Done}
                onChange={setBir2307Done}
                title="BIR 2307 / withholding completed"
              />
              <ChecklistRow checked={jevDone} onChange={setJevDone} title="JEV prepared and linked" />
            </div>
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
    
    // Voucher verification status: use tab-based navigation
    if (active?.status_id === 29) {
      // Set default tab to IAR if no tab is selected
      if (!previewTab) {
        setPreviewTab("iar");
      }
      
      // Use the same logic as other statuses but with tabs
      if (!previewTab) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500 text-sm">
            <RiFileTextLine className="size-10 mb-2 opacity-40" aria-hidden />
            Select a document to preview.
          </div>
        );
      }
      
      switch (previewTab) {
        case "iar":
          return (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/80">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-700">IAR — template preview</p>
              </div>
              <div className="flex-1 overflow-auto bg-white">
                <IARDocumentPreview delivery={active} iar={iarData} poData={poData} />
              </div>
            </div>
          );
        case "loa":
          return (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-gray-100 bg-green-50/80">
                <p className="text-xs font-bold uppercase tracking-widest text-green-700">LOA — template preview</p>
              </div>
              <div className="flex-1 overflow-auto bg-white">
                <LOADocumentPreview delivery={active} loa={loaData} poData={poData} />
              </div>
            </div>
          );
        case "ors":
          return (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">ORS</p>
                <p className="text-lg font-mono font-semibold text-gray-900 mt-1">{orsData.ors_no || "—"}</p>
              </div>
              <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-gray-500">
                Open the full ORS document when your workflow provides a generated file.
              </div>
            </div>
          );
        case "dv":
          return (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">DV</p>
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">Payment type:</span>{" "}
                  <span className="font-medium">{dvData.payment_type || "—"}</span>
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-gray-500">
                Use <span className="font-semibold text-gray-700">View full document</span> when DV HTML/PDF preview is available.
              </div>
            </div>
          );
        default:
          return null;
      }
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
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">ORS</p>
              <p className="text-lg font-mono font-semibold text-gray-900 mt-1">{orsData.ors_no || "—"}</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-gray-500">
              Open the full ORS document when your workflow provides a generated file. Inline voucher-style fields are not shown here.
            </div>
          </div>
        );
      case "dv":
        return (
          <div className="flex flex-col h-full min-h-[240px]">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">DV</p>
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Payment type:</span>{" "}
                <span className="font-medium">{dvData.payment_type || "—"}</span>
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-gray-500">
              Use <span className="font-semibold text-gray-700">View full document</span> when DV HTML/PDF preview is wired. No voucher detail block is shown in this panel.
            </div>
          </div>
        );
      case "iar":
        return (
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/80">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">IAR — template preview</p>
            </div>
            <div className="flex-1 min-h-[360px] overflow-auto border-t border-gray-100">
              <IARDocumentPreview delivery={active} iar={iarData} poData={poData} />
            </div>
          </div>
        );
      case "loa":
        return (
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/80">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">LOA — template preview</p>
            </div>
            <div className="flex-1 min-h-[360px] overflow-auto border-t border-gray-100">
              <LOADocumentPreview delivery={active} loa={loaData} poData={poData} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!visible) return null;

  const docTabs = documentsForStatus(active?.status_id);
  const statusBadge =
    active?.status_id === 28 ? "Payment Pending" :
    active?.status_id === 29 ? "Voucher Verification" :
    active?.status_id === 30 ? "Accounting Review" :
    active?.status_id === 32 ? "PARPO Approval" :
    active?.status_id === 33 ? "Forward to Cash" :
    active?.status_id === 34 ? "PARPO office signature" :
    active?.status_id === 35 ? "Tax processing" :
    active?.status_id === 36 ? "Payment completed" :
    "Unknown";

  const canOpenFullTemplate = previewTab === "iar" || previewTab === "loa";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex flex-col max-h-[85vh] w-full max-w-7xl overflow-hidden rounded-xl shadow-xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b bg-emerald-700  border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium text-white-500 uppercase tracking-wide">{statusLabel}</p>
            <h1 className="text-xl font-semibold text-white mt-1">Process Payment</h1>
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
            const isPast = PAYMENT_FLOW_STRIP.findIndex(s => s.id === active?.status_id) > PAYMENT_FLOW_STRIP.findIndex(s => s.id === step.id);
            return (
              <div
                key={step.id}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
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
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Panel - Form */}
          <div className="flex-1 flex flex-col border-r border-gray-200 bg-gray-50">
            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Next Action */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Next Action</h3>
                  <p className="text-sm text-gray-600">{currentStepInfo.label}</p>
                </div>

                {/* Form Content */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  {renderFormContent()}
                </div>

                {/* Status Flag */}
                <div className={`bg-white rounded-lg border p-4 ${
                  statusFlag ? "border-emerald-200 bg-emerald-50" : "border-gray-200"
                }`}>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Status Flag {!statusFlag && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={statusFlag ?? ""}
                    onChange={(e) => onSelectStatusFlag(e.target.value === "" ? null : e.target.value as StatusFlag)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select status flag</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete_info">Incomplete info</option>
                    <option value="wrong_information">Wrong information</option>
                    <option value="needs_revision">Needs revision</option>
                    <option value="on_hold">On hold</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  {!statusFlag && (
                    <p className="mt-2 text-xs text-gray-500">Required together with the step checklist.</p>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
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
                      Complete the step checklist and choose a status flag to enable submit.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isFormValid
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
          </div>

          {/* Right Panel - Document Preview */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-900">
                {active?.status_id === 28 ? "Record Details" : 
                 active?.status_id === 29 ? "Voucher Documents" : "Documents"}
              </h2>
              {docTabs.length > 0 && (
                <div className="flex gap-2">
                  {docTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPreviewTab(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        previewTab === tab
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {docTabLabel(tab)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden bg-white">
              {renderPreviewContent()}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                disabled={!previewTab || active?.status_id === 28}
                onClick={() => previewTab && onPreviewDocument(previewTab)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  previewTab && active?.status_id !== 28
                    ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                    : "text-gray-400 bg-gray-100 cursor-not-allowed"
                }`}
              >
                <RiEyeLine size={16} />
                View Full {previewTab ? docTabLabel(previewTab) : "Document"}
              </button>
              
              <div className="text-xs text-gray-500">
                {canOpenFullTemplate && active?.status_id !== 28 ? (
                  <span className="flex items-center gap-1">
                    <RiFilePdf2Line size={14} />
                    Opens as HTML template
                  </span>
                ) : previewTab && active?.status_id !== 28 ? (
                  <span>Document preview available</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
