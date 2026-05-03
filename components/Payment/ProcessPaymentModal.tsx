"use client";

import { useState, useEffect, useRef } from "react";
import { RiCloseLine, RiEyeLine, RiArrowLeftLine, RiArrowRightLine, RiCheckLine, RiFilePdf2Line, RiZoomInLine, RiZoomOutLine, RiRefreshLine, RiMoneyDollarCircleLine, RiFileListLine, RiCalculatorLine } from "react-icons/ri";
import { type StatusFlag, getFlagId } from "../StatusFlagPicker";

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

interface ProcessPaymentModalProps {
  visible: boolean;
  active: any;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  statusLabel: string;
  statusFlag: StatusFlag | null;
  onSelectStatusFlag: (flag: StatusFlag | null) => void;
  onPreviewDocument: (type: 'voucher' | 'ors' | 'dv' | 'iar' | 'loa') => void;
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
  voucher,
  ors,
  dv,
  iar,
  loa,
  poData,
}: ProcessPaymentModalProps) {
  const formPaneRef = useRef<HTMLDivElement | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<"voucher" | "ors" | "dv" | "iar" | "loa">("voucher");
  const [voucherData, setVoucherData] = useState(voucher || {});
  const [orsData, setOrsData] = useState(ors || {});
  const [dvData, setDvData] = useState(dv || {});
  const [iarData, setIarData] = useState(iar || {});
  const [loaData, setLoaData] = useState(loa || {});

  // Get current step based on delivery status
  const getCurrentStepInfo = () => {
    switch (active?.status_id) {
      case 28: // Payment Pending
        return { step: 1, label: "Voucher Verification", nextStatus: 29 };
      case 29: // Voucher Verification
        return { step: 1, label: "Voucher Verification", nextStatus: 30 };
      case 30: // Accounting Review
        return { step: 2, label: "Account Review", nextStatus: 32 };
      case 32: // Final Approval
        return { step: 3, label: "PARPO Approval", nextStatus: 35 };
      default:
        return { step: 1, label: "Voucher Verification", nextStatus: 29 };
    }
  };

  const currentStepInfo = getCurrentStepInfo();

  // Validation function for current status
  const validateCurrentStatus = () => {
    // All payment statuses now only require status flag, no input fields needed
    return true;
  };

  // Check if form is valid for submission
  const isFormValid = validateCurrentStatus() && statusFlag !== null;

  // Debug status flag availability and form validation
  useEffect(() => {
    if (visible && active?.status_id === 29) {
      console.log("Voucher Verification - Status Flag:", statusFlag);
      console.log("Voucher Verification - Status Flag Required:", statusFlag !== null);
      console.log("Voucher Verification - Form Valid:", isFormValid);
      console.log("Voucher Verification - validateCurrentStatus:", validateCurrentStatus());
    }
  }, [visible, statusFlag, active?.status_id, isFormValid]);

  useEffect(() => {
    if (visible) {
      setNotes("");
      setVoucherData(voucher || {});
      setOrsData(ors || {});
      setDvData(dv || {});
      setIarData(iar || {});
      setLoaData(loa || {});
      
      // Set current step based on delivery status
      switch (active?.status_id) {
        case 28: // Payment Pending
        case 29: // Payment Processing
          setCurrentStep(1); // Verify Voucher
          break;
        case 30: // Accounting Review
          setCurrentStep(2); // Account Review
          break;
        case 32: // Final Approval
          setCurrentStep(3); // PARPO Approval
          break;
        default:
          setCurrentStep(1);
      }
    }
  }, [visible, voucher, ors, dv, iar, loa, active?.status_id]);

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

  const handleNext = () => {
    if (!validateCurrentStatus()) {
      alert("Validation failed. Please try again.");
      return;
    }
    if (!statusFlag) {
      alert("Please set a status flag before proceeding.");
      return;
    }
    // For step-by-step processing, we don't navigate within the modal
    // Each modal handles one status transition
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderFormContent = () => {
    switch (active?.status_id) {
      case 28: // Payment Pending
      case 29: // Voucher Verification
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 1: Voucher Verification</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Voucher Verification:</strong> This step involves reviewing the payment voucher and supporting documents to ensure all required information is accurate and complete. The verification process includes checking the Inspection and Acceptance Report (IAR) and Letter of Acceptance (LOA) documents for compliance with procurement regulations and proper authorization. Set the appropriate status flag to proceed to the next step.
              </p>
            </div>
          </div>
        );

      case 30: // Accounting Review
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 2: Account Review</h3>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-purple-800">
                <strong>Accounting Review:</strong> This is the critical financial validation step where the accounting department reviews all payment documents for accuracy, completeness, and compliance with accounting standards and government regulations. The review includes verification of fund availability, proper allocation, budgetary compliance, and ensuring all supporting documents are properly authenticated. This step prevents financial discrepancies and ensures proper fund management before proceeding to budget review.
              </p>
            </div>
          </div>
        );

      case 32: // Final Approval
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 3: PARPO Approval</h3>
            
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-cyan-800">
                <strong>PARPO Approval:</strong> This is the final authorization step where the Procurement Administrative and Regulatory Processing Officer (PARPO) provides the ultimate approval for payment processing. This step represents the culmination of all previous reviews and confirms that the payment request has passed all necessary validations including voucher verification, accounting review, and budget availability. Upon approval, the payment proceeds to disbursement and the entire procurement cycle moves toward completion.
              </p>
            </div>
          </div>
        );

      
      default:
        return null;
    }
  };

  const renderPreviewContent = () => {
    switch (selectedDocument) {
      case "voucher":
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Voucher Preview</h4>
            <div className="space-y-2">
              <p><strong>Voucher No:</strong> {voucherData.voucher_no || "N/A"}</p>
              <p><strong>Amount:</strong> ₱{voucherData.amount || "0.00"}</p>
              <p><strong>Status:</strong> {voucherData.verification_status || "Not Set"}</p>
              <p><strong>Accountant:</strong> {voucherData.accountant_name || "N/A"}</p>
            </div>
          </div>
        );
      case "ors":
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">ORS Preview</h4>
            <div className="space-y-2">
              <p><strong>ORS No:</strong> {orsData.ors_no || "N/A"}</p>
              <p><strong>Budget Officer:</strong> {orsData.budget_officer_name || "N/A"}</p>
              <p><strong>Budget Status:</strong> {orsData.budget_status || "Not Set"}</p>
            </div>
          </div>
        );
      case "dv":
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">DV Preview</h4>
            <div className="space-y-2">
              <p><strong>PARPO:</strong> {dvData.parpo_name || "N/A"}</p>
              <p><strong>Payment Type:</strong> {dvData.payment_type || "Not Set"}</p>
              <p><strong>Check No:</strong> {dvData.check_no || "N/A"}</p>
              <p><strong>Release Date:</strong> {dvData.release_date || "N/A"}</p>
            </div>
          </div>
        );
      case "iar":
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Inspection and Acceptance Report (IAR)</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <IARDocumentPreview delivery={active} iar={iarData} poData={poData} />
            </div>
          </div>
        );
      case "loa":
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Letter of Acceptance (LOA)</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <LOADocumentPreview delivery={active} loa={loaData} poData={poData} />
            </div>
          </div>
        );
      default:
        return <div>Select a document to preview</div>;
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-6 py-4 border-b border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{statusLabel}</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Delivery: {active?.delivery_no} | PO: {active?.po_no}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-100 hover:text-white transition-colors"
            >
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* Current Step Info */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {currentStepInfo.label}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Processing: {active?.delivery_no} | PO: {active?.po_no}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-700">
                Current Status
              </p>
              <p className="text-xs text-gray-500">
                {active?.status_id === 28 ? "Payment Pending" : 
                 active?.status_id === 29 ? "Voucher Verification" :
                 active?.status_id === 30 ? "Accounting Review" :
                 active?.status_id === 32 ? "Final Approval" : "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row"
        >
          {/* Form Side */}
          <div
            ref={formPaneRef}
            tabIndex={0}
            className="w-full lg:w-2/5 xl:w-1/3 min-h-0 overflow-y-auto bg-white p-6 outline-none border-r border-gray-200"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Status Flag */}
              <div className={`rounded-lg p-4 border ${
                statusFlag 
                  ? "bg-emerald-50 border-emerald-200" 
                  : "bg-gray-50 border-gray-200"
              }`}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">
                  Status Flag {!statusFlag && "*"}
                </h3>
                <select
                value={statusFlag ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  onSelectStatusFlag(value === "" ? null : value as StatusFlag);
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                  statusFlag 
                    ? "border-emerald-300 bg-emerald-50" 
                    : "border-gray-300"
                }`}
              >
                <option value="">Select Status Flag *</option>
                <option value="complete">✅ Complete</option>
                <option value="incomplete_info">⚠️ Incomplete Info</option>
                <option value="wrong_information">❌ Wrong Information</option>
                <option value="needs_revision">🔄 Needs Revision</option>
                <option value="on_hold">⏸️ On Hold</option>
                <option value="urgent">🔥 Urgent</option>
              </select>
                {!statusFlag && (
                  <p className="text-xs text-gray-500 mt-2">
                    Please set a status flag to enable processing.
                  </p>
                )}
              </div>

              {/* Form Content */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                {renderFormContent()}
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Notes</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Processing Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes for this payment processing step…"
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 -mb-6 pb-6">
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                    isFormValid
                      ? "bg-emerald-700 text-white hover:bg-emerald-800 shadow-emerald-100"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <RiCheckLine size={16} />
                  Process {currentStepInfo.label}
                </button>
              </div>
            </form>
          </div>

          {/* Preview Side */}
          <div className="w-full lg:w-3/5 xl:w-2/3 min-h-0 overflow-y-auto bg-gray-100 border-t lg:border-t-0 lg:border-l border-gray-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">DOCUMENT PREVIEW</h3>
              </div>

              {/* Document Selection */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedDocument("voucher")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedDocument === "voucher"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Voucher
                </button>
                
                {/* Show IAR and LOA for Voucher Verification (status 29) */}
                {(active?.status_id === 29) && (
                  <>
                    <button
                      onClick={() => setSelectedDocument("iar")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        selectedDocument === "iar"
                          ? "bg-emerald-700 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      IAR
                    </button>
                    <button
                      onClick={() => setSelectedDocument("loa")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        selectedDocument === "loa"
                          ? "bg-emerald-700 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      LOA
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setSelectedDocument("ors")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedDocument === "ors"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  ORS
                </button>
                <button
                  onClick={() => setSelectedDocument("dv")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedDocument === "dv"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  DV
                </button>
              </div>

              {/* Preview Content */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="min-h-[400px] lg:min-h-[450px]">
                  {renderPreviewContent()}
                </div>
              </div>

              {/* Preview Actions */}
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onPreviewDocument(selectedDocument)}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <RiEyeLine size={16} />
                  View Full Document
                </button>
                {selectedDocument === "iar" || selectedDocument === "loa" ? (
                  <div className="text-xs text-gray-500 flex items-center">
                    <RiFilePdf2Line size={14} className="mr-1" />
                    HTML Template Preview
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        </div>
    </div>
  );
}
