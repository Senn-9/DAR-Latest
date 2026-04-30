"use client";

import { useState, useEffect, useRef } from "react";
import { RiCloseLine, RiEyeLine, RiArrowLeftLine, RiArrowRightLine, RiCheckLine, RiFilePdf2Line, RiZoomInLine, RiZoomOutLine, RiRefreshLine } from "react-icons/ri";
import { FlagButton, StatusFlagPicker, type StatusFlag, getFlagId } from "../StatusFlagPicker";

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
  result = result.replace(/{{#each po_items}}([\s\S]*?){{\/each}}/g, (match, templateBlock) => {
    if (!data.po_items || !Array.isArray(data.po_items)) return '';
    
    return data.po_items.map((item: any, index: number) => {
      let itemBlock = templateBlock;
      Object.keys(item).forEach(key => {
        const value = item[key] ?? "";
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        itemBlock = itemBlock.replace(placeholder, value);
      });
      
      // Handle {{add @index value}} for positioning
      itemBlock = itemBlock.replace(/{{add @index (\d+(?:\.\d+)?)}}/g, (match, value) => {
        return (index + parseFloat(value)).toString();
      });
      
      return itemBlock;
    }).join('');
  });

  // Handle Handlebars conditionals
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    const value = data[condition];
    return value ? content : '';
  });

  result = result.replace(/{{#unless\s+(\w+)}}([\s\S]*?){{\/unless}}/g, (match, condition, content) => {
    const value = data[condition];
    return !value ? content : '';
  });

    
  // Handle nested property access like {{po_items.length}}
  result = result.replace(/{{([^}]+\.([^}]+))}}/g, (match, fullExpression, property) => {
    const parts = fullExpression.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return match; // Return original if not found
      }
    }
    
    return value !== undefined && value !== null ? String(value) : '';
  });
  
  // Handle simple placeholders
  Object.keys(data).forEach(key => {
    if (key === 'po_items') return; // Skip arrays, handled above
    const value = data[key] ?? "";
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value);
  });
  
  return result;
}

// Read-only input style for preview
const readonlyCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";

// Keep HTML functions for PDF download
async function buildIARHtml(d: any): Promise<string> {
  const template = await loadTemplate("IAR");
  return replacePlaceholders(template, d);
}

async function buildLOAHtml(d: any): Promise<string> {
  const template = await loadTemplate("LOA");
  return replacePlaceholders(template, d);
}

async function buildDVHtml(d: any): Promise<string> {
  const template = await loadTemplate("DV");
  return replacePlaceholders(template, d);
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

// JSX Preview Components - based on templates
function IARPreview({ delivery, iar, poData }: { delivery: any; iar: any; poData: any }) {
  const [html, setHtml] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const template = await loadTemplate("IAR");
        // Transform poData to have the correct structure for templates
        const transformedPoData = poData ? {
          ...poData,
          po_items: poData.purchase_order_items || []
        } : {};
        const mergedData = { ...delivery, ...transformedPoData, ...iar };
        // Explicitly preserve po_items from transformedPoData
        mergedData.po_items = transformedPoData.po_items;
        
        const filled = replacePlaceholders(template, mergedData);
        setHtml(filled);
      } catch (error) {
        console.error("Error loading IAR preview:", error);
      }
    };
    loadPreview();
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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(0.7);
  };

  const scalePercentage = Math.round(zoomLevel * 100);
  const containerWidth = 100 / zoomLevel;
  const containerHeight = 100 / zoomLevel;

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
        <span className="text-sm text-gray-600 font-medium">{scalePercentage}%</span>
      </div>
      
      {/* Preview Container */}
      <div className="overflow-auto" style={{ maxHeight: '600px' }}>
        <div 
          style={{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top left', 
            width: `${containerWidth}%`, 
            height: `${containerHeight}%`
          }}
        >
          <iframe
            ref={iframeRef}
            title="IAR Preview"
            className="w-full border-0"
            style={{ height: '1000px', minHeight: '1000px' }}
          />
        </div>
      </div>
    </div>
  );
}

function LOAPreview({ delivery, loa, poData }: { delivery: any; loa: any; poData: any }) {
  const [html, setHtml] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const template = await loadTemplate("LOA");
        // Transform poData to have the correct structure for templates
        const transformedPoData = poData ? {
          ...poData,
          po_items: poData.purchase_order_items || []
        } : {};
        const mergedData = { ...delivery, ...transformedPoData, ...loa };
        // Explicitly preserve po_items from transformedPoData
        mergedData.po_items = transformedPoData.po_items;
        const filled = replacePlaceholders(template, mergedData);
        setHtml(filled);
      } catch (error) {
        console.error("Error loading LOA preview:", error);
      }
    };
    loadPreview();
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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(0.7);
  };

  const scalePercentage = Math.round(zoomLevel * 100);
  const containerWidth = 100 / zoomLevel;
  const containerHeight = 100 / zoomLevel;

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
        <span className="text-sm text-gray-600 font-medium">{scalePercentage}%</span>
      </div>
      
      {/* Preview Container */}
      <div className="overflow-auto" style={{ maxHeight: '600px' }}>
        <div 
          style={{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top left', 
            width: `${containerWidth}%`, 
            height: `${containerHeight}%`
          }}
        >
          <iframe
            ref={iframeRef}
            title="LOA Preview"
            className="w-full border-0"
            style={{ height: '1000px', minHeight: '1000px' }}
          />
        </div>
      </div>
    </div>
  );
}

function DVPreview({ delivery, dv, poData }: { delivery: any; dv: any; poData: any }) {
  const [html, setHtml] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const template = await loadTemplate("DV");
        // Transform poData to have the correct structure for templates
        const transformedPoData = poData ? {
          ...poData,
          po_items: poData.purchase_order_items || []
        } : {};
        const mergedData = { ...delivery, ...transformedPoData, ...dv };
        // Explicitly preserve po_items from transformedPoData
        mergedData.po_items = transformedPoData.po_items;
        const filled = replacePlaceholders(template, mergedData);
        setHtml(filled);
      } catch (error) {
        console.error("Error loading DV preview:", error);
      }
    };
    loadPreview();
  }, [delivery, dv, poData]);

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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(0.7);
  };

  const scalePercentage = Math.round(zoomLevel * 100);
  const containerWidth = 100 / zoomLevel;
  const containerHeight = 100 / zoomLevel;

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
        <span className="text-sm text-gray-600 font-medium">{scalePercentage}%</span>
      </div>
      
      {/* Preview Container */}
      <div className="overflow-auto" style={{ maxHeight: '600px' }}>
        <div 
          style={{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top left', 
            width: `${containerWidth}%`, 
            height: `${containerHeight}%`
          }}
        >
          <iframe
            ref={iframeRef}
            title="DV Preview"
            className="w-full border-0"
            style={{ height: '1000px', minHeight: '1000px' }}
          />
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
  soaNo: string;
  setSoaNo: (v: string) => void;
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
  soaNo,
  setSoaNo,
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
  const [selectedDocument, setSelectedDocument] = useState<"delivery" | "iar" | "loa" | "dv">("delivery");
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);

  // Validation function to check if all required fields are filled
  const isFormValid = () => {
    // For status 24/25 (no form fields), always valid
    if (active?.status_id === 24 || active?.status_id === 25) {
      return true;
    }
    
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
    
    // Status 20 (Delivery IAR) - ALL documents should be completed
    if (active?.status_id === 20) {
      const iarValid = iar?.iar_no?.trim() !== "" && 
                      iar?.invoice_no?.trim() !== "" &&
                      iar?.requisitioning_office?.trim() !== "" &&
                      iar?.invoice_date?.trim() !== "" &&
                      iar?.inspected_at?.trim() !== "" &&
                      iar?.received_at?.trim() !== "";
      
      const loaValid = loa?.invoice_no?.trim() !== "" &&
                      loa?.invoice_date?.trim() !== "" &&
                      loa?.accepted_at?.trim() !== "" &&
                      loa?.accepted_by_name?.trim() !== "" &&
                      loa?.accepted_by_title?.trim() !== "";
      
      const dvValid = dv?.dv_no?.trim() !== "" && 
                     dv?.amount_due?.trim() !== "" &&
                     dv?.fund_cluster?.trim() !== "" &&
                     dv?.ors_no?.trim() !== "" &&
                     dv?.payee?.trim() !== "" &&
                     dv?.payee_tin?.trim() !== "" &&
                     dv?.address?.trim() !== "" &&
                     dv?.responsibility_center?.trim() !== "" &&
                     dv?.mfo_pap?.trim() !== "" &&
                     dv?.particulars?.trim() !== "";
      
      console.log("Status 20 validation check:");
      console.log("IAR valid:", iarValid, iar);
      console.log("LOA valid:", loaValid, loa);
      console.log("DV valid:", dvValid, dv);
      
      return iarValid && loaValid && dvValid;
    }
    
    // IAR required fields (when IAR is selected for other statuses)
    if (selectedDocument === "iar") {
      return iar?.iar_no?.trim() !== "" && 
             iar?.invoice_no?.trim() !== "" &&
             iar?.requisitioning_office?.trim() !== "" &&
             iar?.invoice_date?.trim() !== "" &&
             iar?.inspected_at?.trim() !== "" &&
             iar?.received_at?.trim() !== "";
    }
    
    // Status 22 (Delivery LOA) - Preview only, require status flag
    if (active?.status_id === 22) {
      return statusFlag !== null;
    }
    
    // LOA required fields (when LOA is selected for other statuses)
    if (selectedDocument === "loa" && active?.status_id !== 22) {
      return loa?.invoice_no?.trim() !== "" &&
             loa?.invoice_date?.trim() !== "" &&
             loa?.accepted_at?.trim() !== "" &&
             loa?.accepted_by_name?.trim() !== "" &&
             loa?.accepted_by_title?.trim() !== "";
    }
    
    // Status 23 (Delivery DV) - Preview only, require status flag
    if (active?.status_id === 23) {
      return statusFlag !== null;
    }
    
    return false;
  };

  // Enhanced validation function that returns specific error messages
  const validateFormFields = (): string[] => {
    const errors: string[] = [];
    
    // For status 24/25 (no form fields), always valid
    if (active?.status_id === 24 || active?.status_id === 25) {
      return errors;
    }
    
    // Status 21 (IAR Processing) - External work, require status flag
    if (active?.status_id === 21) {
      if (!statusFlag) {
        errors.push("Status flag is required to proceed with IAR Processing status");
      }
    }
    
    // Delivery (Waiting) - require status flag
    if (active?.status_id === 18) {
      if (!statusFlag) {
        errors.push("Status flag is required to proceed with Delivery (Waiting) status");
      }
    }
    
    // Delivery Receipt required fields (only for status 19)
    if ( active?.status_id === 19) {
      if (!drNo.trim()) {
        errors.push("Delivery Receipt No. (DR No.) is required");
      }
    }
    
    // Status 20 (Delivery IAR) - ALL documents are required
    if (active?.status_id === 20) {
      // Check IAR fields
      if (!iar?.iar_no?.trim()) errors.push("IAR No. is required");
      if (!iar?.invoice_no?.trim()) errors.push("IAR Invoice No. is required");
      if (!iar?.requisitioning_office?.trim()) errors.push("IAR Requisitioning Office is required");
      if (!iar?.invoice_date?.trim()) errors.push("IAR Invoice Date is required");
      if (!iar?.inspected_at?.trim()) errors.push("IAR Date Inspected is required");
      if (!iar?.received_at?.trim()) errors.push("IAR Date Received is required");
      
      // Check LOA fields
      if (!loa?.invoice_no?.trim()) errors.push("LOA Invoice No. is required");
      if (!loa?.invoice_date?.trim()) errors.push("LOA Invoice Date is required");
      if (!loa?.accepted_at?.trim()) errors.push("LOA Date Accepted is required");
      if (!loa?.accepted_by_name?.trim()) errors.push("LOA Accepted By Name is required");
      if (!loa?.accepted_by_title?.trim()) errors.push("LOA Accepted By Title is required");
      
      // Check DV fields
      if (!dv?.dv_no?.trim()) errors.push("DV No. is required");
      if (!dv?.amount_due?.trim()) errors.push("DV Amount Due is required");
      if (!dv?.fund_cluster?.trim()) errors.push("DV Fund Cluster is required");
      if (!dv?.ors_no?.trim()) errors.push("DV ORS/BURS No. is required");
      if (!dv?.payee?.trim()) errors.push("DV Payee is required");
      if (!dv?.payee_tin?.trim()) errors.push("DV Payee TIN/Employee No. is required");
      if (!dv?.address?.trim()) errors.push("DV Address is required");
      if (!dv?.responsibility_center?.trim()) errors.push("DV Responsibility Center is required");
      if (!dv?.mfo_pap?.trim()) errors.push("DV MFO/PAP is required");
      if (!dv?.particulars?.trim()) errors.push("DV Particulars is required");
    }
    
    // IAR required fields (when IAR is selected for other statuses)
    if (selectedDocument === "iar" && active?.status_id !== 20) {
      if (!iar?.iar_no?.trim()) errors.push("IAR No. is required");
      if (!iar?.invoice_no?.trim()) errors.push("Invoice No. is required");
      if (!iar?.requisitioning_office?.trim()) errors.push("Requisitioning Office is required");
      if (!iar?.invoice_date?.trim()) errors.push("Invoice Date is required");
      if (!iar?.inspected_at?.trim()) errors.push("Date Inspected is required");
      if (!iar?.received_at?.trim()) errors.push("Date Received is required");
    }
    
    // Status 22 (Delivery LOA) - Preview only, require status flag
    if (active?.status_id === 22) {
      if (!statusFlag) {
        errors.push("Status flag is required to proceed with Delivery (LOA) preview status");
      }
    }
    
    // LOA required fields (when LOA is selected for other statuses)
    if (selectedDocument === "loa" && active?.status_id !== 22) {
      if (!loa?.invoice_no?.trim()) errors.push("Invoice No. is required");
      if (!loa?.invoice_date?.trim()) errors.push("Invoice Date is required");
      if (!loa?.accepted_at?.trim()) errors.push("Date Accepted is required");
      if (!loa?.accepted_by_name?.trim()) errors.push("Accepted By Name is required");
      if (!loa?.accepted_by_title?.trim()) errors.push("Accepted By Title is required");
    }
    
    // Status 23 (Delivery DV) - Preview only, require status flag
    if (active?.status_id === 23) {
      if (!statusFlag) {
        errors.push("Status flag is required to proceed with Delivery (DV) preview status");
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
    const steps = [];
    
    // Status 21 (IAR Processing) - External work, no steps needed
    if (active?.status_id === 21) {
      return steps; // No steps for external work
    }
    
    // Always include delivery receipt info for statuses 18 & 19
    if (active?.status_id === 18 || active?.status_id === 19) {
      steps.push({ id: 1, label: "Delivery Receipt", icon: "" });
    }
    
    // IAR step (Status 20)
    if (active?.status_id === 20 || active?.status_id >= 24) {
      steps.push({ id: 1, label: "Inspection & Acceptance", icon: "" });
    }
    
    // LOA step (Status 22)
    if (active?.status_id === 22 || active?.status_id >= 24) {
      steps.push({ id: 2, label: "Document Preview", icon: "" });
    }
    
    // DV step (Status 23)
    if (active?.status_id === 23 || active?.status_id >= 24) {
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
    
    // Status 20 (Delivery IAR) - Show all documents (IAR, LOA, DV)
    if (active?.status_id === 20) {
      documents.push("iar", "loa", "dv");
    }
    
    // Status 22 (Delivery LOA) - Show all documents for preview forwarding to Division Chief
    if (active?.status_id === 22) {
      documents.push("iar", "loa", "dv");
    }
    
    // Status 23 (Delivery DV) - Show all documents for preview forwarding to Division Chief
    if (active?.status_id === 23) {
      documents.push("iar", "loa", "dv");
    }
    
    // For status 24/25 (End-User Forward/Division Chief), show all documents
    if (active?.status_id === 24 || active?.status_id === 25) {
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
      if (availableDocuments.length > 0 && !availableDocuments.includes(selectedDocument)) {
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

  // Load HTML template when document changes
  useEffect(() => {
    if (!visible) return;
    
    console.log("=== DOCUMENT CHANGE IN PROCESS MODAL ===");
    console.log("Selected document:", selectedDocument);
    console.log("IAR data:", iar);
    console.log("LOA data:", loa);
    console.log("DV data:", dv);
    
    const loadHtml = async () => {
      try {
        let html: string | null = null;
        // Transform poData to have the correct structure for templates
        const transformedPoData = poData ? {
          ...poData,
          po_items: poData.purchase_order_items || []
        } : {};
        const mergedData = { ...active, ...transformedPoData };
        
        if (selectedDocument === "iar" && iar) {
          html = await buildIARHtml({ ...mergedData, ...iar });
        } else if (selectedDocument === "loa" && loa) {
          html = await buildLOAHtml({ ...mergedData, ...loa });
        } else if (selectedDocument === "dv" && dv) {
          html = await buildDVHtml({ ...mergedData, ...dv });
        }
        
        setCurrentHtml(html);
      } catch (error) {
        console.error("Error loading document HTML:", error);
        setCurrentHtml(null);
      }
    };
    
    loadHtml();
  }, [visible, selectedDocument, active, iar, loa, dv, poData]);

  // Update selected document when status changes
  useEffect(() => {
    const availableDocuments = getAvailableDocuments();
    if (availableDocuments.length > 0 && !availableDocuments.includes(selectedDocument)) {
      setSelectedDocument(availableDocuments[0]);
    }
  }, [active?.status_id]);
  
  if (!visible) return null;

  const renderFormContent = () => {
    // Status 21 (IAR Processing) - External work, no document forms
    if (active?.status_id === 21) {
      return (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <p className="text-sm text-purple-900 leading-5">
            IAR Processing is handled externally. Please set a status flag to track
            the progress of this external work and proceed when completed.
          </p>
        </div>
      );
    }
    
    // Delivery Receipt - Hide for Delivery (Waiting) status
    if (selectedDocument === "delivery") {
      // Don't show delivery receipt form for status 18 (Delivery Waiting)
      if (active?.status_id === 18) {
        return (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Delivery Receipt</h3>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
              <span>ℹ</span> Delivery receipt information will be captured when the delivery is received.
            </div>
          </div>
        );
      }
      
      return (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Delivery Receipt</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Delivery Receipt No. (DR No.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={drNo}
                  onChange={(e) => setDrNo(e.target.value)}
                  placeholder="e.g. DR-2026-0012"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Statement of Account (SOA No.)
                </label>
                <input
                  type="text"
                  value={soaNo}
                  onChange={(e) => setSoaNo(e.target.value)}
                  placeholder="e.g. SOA-2026-0008"
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
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Inspection & Acceptance Report (IAR)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                IAR No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={iar?.iar_no ?? ""}
                onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), iar_no: e.target.value }))}
                placeholder="e.g. IAR-2026-0015"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
              />
            </div>
                        <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Invoice No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={iar?.invoice_no ?? ""}
                  onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), invoice_no: e.target.value }))}
                  placeholder="e.g. INV-2026-0042"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={iar?.invoice_date ?? ""}
                  onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), invoice_date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Requisitioning Office <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={iar?.requisitioning_office ?? ""}
                  onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), requisitioning_office: e.target.value }))}
                  placeholder="Office / Section"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
                          </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={iar?.invoice_date ?? ""}
                  onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), invoice_date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Date Inspected <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={iar?.inspected_at ?? ""}
                  onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), inspected_at: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Date Received <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={iar?.received_at ?? ""}
                onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), received_at: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
              />
            </div>

            {/* Inspection Verification */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Inspection Verification <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-white rounded-lg p-2 transition-colors">
                  <input
                    type="checkbox"
                    checked={iar?.inspection_verified ?? false}
                    onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), inspection_verified: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">Inspected, verified and found in order as to quantity and specifications</span>
                </label>
              </div>
            </div>

            {/* Inspection Confirmation */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Inspection Confirmation <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-white rounded-lg p-2 transition-colors">
                  <input
                    type="checkbox"
                    checked={iar?.items_complete ?? false}
                    onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), items_complete: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">Complete Delivery</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-white rounded-lg p-2 transition-colors">
                  <input
                    type="checkbox"
                    checked={!iar?.items_complete ?? false}
                    onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), items_complete: !e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">Partial (please specify quantity)</span>
                </label>
              </div>
            </div>

                      </div>
        </div>
      );
    }
    
    // Status 22 (Delivery LOA) - Preview only for forwarding to Division Chief
    if (active?.status_id === 22) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-900 leading-5">
            Preview documents for forwarding to Division Chief for signature. 
            This step allows you to review the IAR, LOA, and DV documents before 
            sending them to the Division Chief for final approval.
          </p>
        </div>
      );
    }
    
    // LOA Form (for other statuses when LOA is selected)
    if (selectedDocument === "loa" && active?.status_id !== 22) {
      return (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Acceptance (LOA)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Invoice No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={loa?.invoice_no ?? ""}
                onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), invoice_no: e.target.value }))}
                placeholder="e.g. INV-2026-0042"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={loa?.invoice_date ?? ""}
                  onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), invoice_date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Acceptance Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={loa?.accepted_at ?? ""}
                  onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), accepted_at: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
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
                  onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), accepted_by_name: e.target.value }))}
                  placeholder="Printed name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Accepted By (Title/Designation) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={loa?.accepted_by_title ?? ""}
                  onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), accepted_by_title: e.target.value }))}
                  placeholder="Position title"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Status 23 (Delivery DV) - Preview only for forwarding to Division Chief
    if (active?.status_id === 23) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-sm text-green-900 leading-5">
            Preview documents for forwarding to Division Chief for signature. 
            This step allows you to review the IAR, LOA, and DV documents before 
            sending them to the Division Chief for final approval.
          </p>
        </div>
      );
    }
    
    // DV Form (for other statuses when DV is selected)
    if (selectedDocument === "dv" && active?.status_id !== 23) {
      return (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Disbursement Voucher (DV)</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  DV No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.dv_no ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), dv_no: e.target.value }))}
                  placeholder="e.g. DV-2026-0009"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Amount Due <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.amount_due ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), amount_due: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Fund Cluster <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.fund_cluster ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), fund_cluster: e.target.value }))}
                  placeholder="e.g. 01"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ORS No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.ors_no ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), ors_no: e.target.value }))}
                  placeholder="e.g. ORS-2026-0007"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Payee <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.payee ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), payee: e.target.value }))}
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
                  value={dv?.payee_tin ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), payee_tin: e.target.value }))}
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
                value={dv?.address ?? ""}
                onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), address: e.target.value }))}
                placeholder="Payee address"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Responsibility Center <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.responsibility_center ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), responsibility_center: e.target.value }))}
                  placeholder="RC-XXXX"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  MFO/PAP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.mfo_pap ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), mfo_pap: e.target.value }))}
                  placeholder="MFO/PAP code"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Particulars <span className="text-red-500">*</span>
              </label>
              <textarea
                value={dv?.particulars ?? ""}
                onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), particulars: e.target.value }))}
                placeholder="Brief description of payment"
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              />
            </div>
          </div>
        </div>
      );
    }
    
    // Status 24: End-User Forward
    if (active?.status_id === 24) {
      return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <p className="text-sm text-indigo-900 leading-5">
            Forward LOA and DV to Division Chief for signature. This step
            ensures the Division Chief reviews and approves the disbursement
            before final completion.
          </p>
        </div>
      );
    }
    
    // Status 25: Division Chief
    if (active?.status_id === 25) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-sm text-emerald-900 leading-5">
            Finalize inspection and acceptance for this delivery. Submitting
            marks the delivery phase as complete and moves the record to
            Payment and Closure.
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
          <p className="text-sm">This document is not available at the current delivery stage.</p>
          <p className="text-xs mt-2">Please proceed to the appropriate stage to access this document.</p>
        </div>
      );
    }
    
    // Delivery Receipt
    if (selectedDocument === "delivery") {
      return (
        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">No document preview available for delivery receipt.</p>
          <p className="text-xs mt-2">Proceed to the next stage to view document previews.</p>
        </div>
      );
    }
    
    // Show selected document preview
    if (selectedDocument === "iar") {
      return <IARPreview delivery={active} iar={iar || {}} poData={poData} />;
    }
    
    if (selectedDocument === "loa") {
      return <LOAPreview delivery={active} loa={loa || {}} poData={poData} />;
    }
    
    if (selectedDocument === "dv") {
      return <DVPreview delivery={active} dv={dv || {}} poData={poData} />;
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
    return true;
  };
  
  const getSubmitButtonText = () => {
    if (active?.status_id === 21) return "Update Status Flag";
    if (active?.status_id === 22) return "Forward to Division Chief for Signature";
    if (active?.status_id === 24) return "Forward to Division Chief";
    if (active?.status_id === 25) return "Submit & Complete Delivery Phase";
    if (steps.length > 1 && currentStep === steps.length) return "Save & Complete";
    return "Save & Update";
  };

  const handlePrintPDF = async () => {
    try {
      let html: string | null = null;
      
      // Transform poData to have the correct structure for templates
      const transformedPoData = poData ? {
        ...poData,
        po_items: poData.purchase_order_items || []
      } : {};
      const mergedData = { ...active, ...transformedPoData };
      
      if (selectedDocument === "iar") {
        const iarData = { ...mergedData, ...iar };
        iarData.po_items = mergedData.po_items;
        html = await buildIARHtml(iarData);
      } else if (selectedDocument === "loa") {
        const loaData = { ...mergedData, ...loa };
        loaData.po_items = mergedData.po_items;
        html = await buildLOAHtml(loaData);
      } else if (selectedDocument === "dv") {
        const dvData = { ...mergedData, ...dv };
        dvData.po_items = mergedData.po_items;
        html = await buildDVHtml(dvData);
      }
      
      if (html) {
        downloadPDF(html);
      } else {
        alert("Unable to generate PDF. Please ensure all required fields are filled.");
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
          <div className="flex flex-[2] flex-col overflow-hidden border-r border-gray-200">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
              {/* Document Type Tabs - Hide for Delivery (Received) since only delivery receipt is shown */}
              {active?.status_id !== 19 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Document Type</h3>
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
              {steps.length > 1 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Progress</h3>
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
                          {currentStep > step.id ? <RiCheckLine size={14} /> : step.icon}
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`w-8 h-0.5 mx-2 transition-colors ${
                              currentStep > step.id ? "bg-emerald-500" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                    <div className="ml-4">
                      <p className="text-xs font-medium text-gray-700">
                        Step {currentStep} of {steps.length}
                      </p>
                      <p className="text-xs text-gray-500">{steps[currentStep - 1]?.label}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Flag - For Delivery (Waiting) and IAR Processing */}
              {(active?.status_id === 18 || active?.status_id === 21) && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Status Flag</h3>
                  <FlagButton selected={statusFlag} onPress={onPressStatusFlag} />
                </div>
              )}

              {/* Form Content */}
              {renderFormContent()}

              {/* Notes - Remove Status Flag from here for Delivery (Waiting) and IAR Processing */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Notes</h3>
                <div className="space-y-4">
                  {active?.status_id !== 18 && active?.status_id !== 21 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Status Flag
                      </label>
                      <FlagButton selected={statusFlag} onPress={onPressStatusFlag} />
                    </div>
                  )}
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
            </div>
          </div>

          {/* Preview Side - Hide for Status 21 (IAR Processing) */}
          {active?.status_id !== 21 && (
            <div className="flex flex-[3] overflow-y-auto bg-gray-100 flex-col">
              <div className="flex-1 overflow-y-auto p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200">
                      <div className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-700 text-white">
                        {selectedDocument === "delivery" ? "Delivery" : selectedDocument.toUpperCase()}
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
          {steps.length > 1 && currentStep > 1 && (
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
          {steps.length > 1 && currentStep < steps.length ? (
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
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getSubmitButtonText()}
            </button>
          )}
        </div>
      </div>
      <StatusFlagPicker
        visible={flagPickerOpen}
        selected={statusFlag}
        onSelect={onSelectStatusFlag}
        onClose={onCloseFlagPicker}
      />
    </div>
  );
}
