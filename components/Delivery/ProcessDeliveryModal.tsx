"use client";



import { useState, useEffect, useRef } from "react";



import {

  RiCloseLine,

  RiEyeLine,

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



// Template loading function



async function loadTemplate(templateName: string): Promise<string> {

  try {

    const response = await fetch(`/documents/${templateName}-template.html`);



    if (!response.ok)

      throw new Error(`Failed to load ${templateName} template`);



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



  // Handle Handlebars-style loops for missing units items



  result = result.replace(

    /{{#each missing_units_items}}([\s\S]*?){{\/each}}/g,

    (match, templateBlock) => {

      if (!data.missing_units_items || !Array.isArray(data.missing_units_items)) return "";



      return data.missing_units_items

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
      const isTruthy = value && (!Array.isArray(value) || value.length > 0);
      return isTruthy ? content : "";
    },
  );

  result = result.replace(
    /{{#unless\s+(\w+)}}([\s\S]*?){{\/unless}}/g,
    (_match: string, condition: string, content: string) => {
      const value = data[condition];
      const isFalsy = !value || (Array.isArray(value) && value.length === 0);
      return isFalsy ? content : "";
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



function IARPreview({

  delivery,

  iar,

  poData,

}: {

  delivery: any;

  iar: any;

  poData: any;

}) {

  const [html, setHtml] = useState<string>("");



  const [zoomLevel, setZoomLevel] = useState(0.7);



  const iframeRef = useRef<HTMLIFrameElement>(null);



  useEffect(() => {

    const loadPreview = async () => {

      try {

        const template = await loadTemplate("IAR");



        // Transform poData to have the correct structure for templates



        const transformedPoData = poData

          ? {

              ...poData,

              po_items: poData.purchase_order_items || [],

              po_date: poData.date, // Map PO date to template's po_date placeholder

            }

          : {};



        const mergedData = { ...delivery, ...transformedPoData, ...iar };



        // Explicitly preserve PO fields from transformedPoData



        mergedData.po_items = transformedPoData.po_items;



        if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;



        if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;

        // Explicitly include missing units items for preview
        if (iar?.missing_units_items) {
          mergedData.missing_units_items = iar.missing_units_items;
          console.log("Missing units items for preview:", iar.missing_units_items);
        } else {
          console.log("No missing units items found in iar data");
        }
        console.log("Merged data for IAR preview:", mergedData);

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

    setZoomLevel((prev) => Math.min(prev + 0.1, 2));

  };



  const handleZoomOut = () => {

    setZoomLevel((prev) => Math.max(prev - 0.1, 0.3));

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



        <span className="text-sm text-gray-600 font-medium">

          {scalePercentage}%

        </span>

      </div>



      {/* Preview Container */}



      <div className="overflow-auto" style={{ maxHeight: "600px" }}>

        <div

          style={{

            transform: `scale(${zoomLevel})`,



            transformOrigin: "top left",



            width: `${containerWidth}%`,



            height: `${containerHeight}%`,

          }}

        >

          <iframe

            ref={iframeRef}

            title="IAR Preview"

            className="w-full border-0"

            style={{ height: "1000px", minHeight: "1000px" }}

          />

        </div>

      </div>

    </div>

  );

}



function LOAPreview({

  delivery,

  loa,

  poData,

}: {

  delivery: any;

  loa: any;

  poData: any;

}) {

  const [html, setHtml] = useState<string>("");



  const [zoomLevel, setZoomLevel] = useState(0.7);



  const iframeRef = useRef<HTMLIFrameElement>(null);



  useEffect(() => {

    const loadPreview = async () => {

      try {

        const template = await loadTemplate("LOA");



        // Transform poData to have the correct structure for templates



        const transformedPoData = poData

          ? {

              ...poData,



              po_items: poData.purchase_order_items || [],



              po_date: poData.date, // Map PO date to template's po_date placeholder

            }

            : {};



        const mergedData = { ...delivery, ...transformedPoData, ...loa };



          // Explicitly preserve PO fields from transformedPoData



          mergedData.po_items = transformedPoData.po_items;

          if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;

          if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;



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

    setZoomLevel((prev) => Math.min(prev + 0.1, 2));

  };



  const handleZoomOut = () => {

    setZoomLevel((prev) => Math.max(prev - 0.1, 0.3));

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



        <span className="text-sm text-gray-600 font-medium">

          {scalePercentage}%

        </span>

      </div>



      {/* Preview Container */}



      <div className="overflow-auto" style={{ maxHeight: "600px" }}>

        <div

          style={{

            transform: `scale(${zoomLevel})`,



            transformOrigin: "top left",



            width: `${containerWidth}%`,



            height: `${containerHeight}%`,

          }}

        >

          <iframe

            ref={iframeRef}

            title="LOA Preview"

            className="w-full border-0"

            style={{ height: "1000px", minHeight: "1000px" }}

          />

        </div>

      </div>

    </div>

  );

}



function DVPreview({

  delivery,

  dv,

  poData,

}: {

  delivery: any;

  dv: any;

  poData: any;

}) {

  const [html, setHtml] = useState<string>("");



  const [zoomLevel, setZoomLevel] = useState(0.7);



  const iframeRef = useRef<HTMLIFrameElement>(null);



  useEffect(() => {

    const loadPreview = async () => {

      try {

        const template = await loadTemplate("DV");



        // Transform poData to have the correct structure for templates



        const transformedPoData = poData

          ? {

              ...poData,



              po_items: poData.purchase_order_items || [],

            }

          : {};



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

    setZoomLevel((prev) => Math.min(prev + 0.1, 2));

  };



  const handleZoomOut = () => {

    setZoomLevel((prev) => Math.max(prev - 0.1, 0.3));

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



        <span className="text-sm text-gray-600 font-medium">

          {scalePercentage}%

        </span>

      </div>



      {/* Preview Container */}



      <div className="overflow-auto" style={{ maxHeight: "600px" }}>

        <div

          style={{

            transform: `scale(${zoomLevel})`,



            transformOrigin: "top left",



            width: `${containerWidth}%`,



            height: `${containerHeight}%`,

          }}

        >

          <iframe

            ref={iframeRef}

            title="DV Preview"

            className="w-full border-0"

            style={{ height: "1000px", minHeight: "1000px" }}

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



  const [currentHtml, setCurrentHtml] = useState<string | null>(null);



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

      const iarValid = iarExists && 

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

      const loaValid = loaExists &&

        loa?.invoice_no?.trim() !== "" &&

        loa?.invoice_date?.trim() !== "" &&

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



      if (!iar?.inspected_at?.trim())

        errors.push("IAR Date Inspected is required");



      if (!iar?.received_at?.trim())

        errors.push("IAR Date Received is required");



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



      if (!iar?.inspected_at?.trim()) errors.push("Date Inspected is required");



      if (!iar?.received_at?.trim()) errors.push("Date Received is required");



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



    // Status 20 (Delivery IAR) - Show IAR and LOA documents only



    if (active?.status_id === 20) {

      documents.push("iar", "loa");

    }



    // Status 22 (Delivery LOA) - Show IAR and LOA documents only for preview forwarding to Division Chief



    if (active?.status_id === 22) {

      documents.push("iar", "loa");

    }



    // Status 23 (Delivery DV) - This status is now skipped in workflow



    // For status 25 (Division Chief) - show IAR and LOA documents only

    if (active?.status_id === 25) {
      documents.push("iar", "loa");
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



        const transformedPoData = poData

          ? {

              ...poData,



              po_items: poData.purchase_order_items || [],

            }

          : {};



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



    if (

      availableDocuments.length > 0 &&

      !availableDocuments.includes(selectedDocument)

    ) {

      setSelectedDocument(availableDocuments[0]);

    }

  }, [active?.status_id]);



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



                    <span className="font-medium">Delivery (Forward LOA / IAR)</span>



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

                  Date Inspected <span className="text-red-500">*</span>

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

                  Date Received <span className="text-red-500">*</span>

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

                    checked={iar?.inspection_verified ?? false}

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

                    checked={iar?.items_complete ?? false}

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
                {!iar?.items_complete && (

                  <label

                    className={`flex items-center gap-3 p-2 transition-colors rounded-lg ${

                      active?.status_id === 25

                        ? "cursor-not-allowed"

                        : "cursor-pointer hover:bg-white"

                    }`}

                  >

                    <input

                      type="checkbox"

                      checked={!iar?.items_complete}

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
                  Missing Units <span className="text-gray-400">(Optional)</span>
                </h3>
                <button 
                  onClick={() => {
                    const currentItems = iar?.missing_units_items || [];
                    const poItems = poData?.purchase_order_items || [];
                    
                    // Add all PO items as missing unit rows
                    const newItems = poItems.map((poItem: any, index: number) => ({
                      id: Date.now().toString() + "_" + index + "_" + Math.random().toString(36).substr(2, 9),
                      stock_no: poItem.stock_no || "",
                      unit: poItem.unit || "",
                      description: poItem.description || "",
                      quantity: poItem.quantity?.toString() || "0",
                      unit_cost: poItem.unit_price?.toString() || "0",
                      total_cost: poItem.subtotal?.toString() || "0"
                    }));
                    
                    setIar((p: any) => ({
                      ...(p ?? {}),
                      missing_units_items: [...currentItems, ...newItems]
                    }));
                  }}
                  disabled={active?.status_id === 25}
                  className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold px-3 py-1.5 border border-dashed border-emerald-300 rounded hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RiAddLine size={14} /> Add Missing Unit Row
                </button>
                              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800 mb-3">
                  Use this section to add any missing units that were not included in the original Purchase Order but were supplied.
                </p>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(iar?.missing_units_items || []).map((item: any, index: number) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                      {(iar?.missing_units_items || []).length > 1 && (
                        <button 
                          onClick={() => {
                            const currentItems = iar?.missing_units_items || [];
                            const updatedItems = currentItems.filter((_: any, i: number) => i !== index);
                            setIar((p: any) => ({
                              ...(p ?? {}),
                              missing_units_items: updatedItems
                            }));
                          }}
                          disabled={active?.status_id === 25}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ×
                        </button>
                      )}
                      <div className="text-xs font-bold text-gray-500 mb-2 uppercase">MISSING UNIT {index + 1}</div>
                      
                      <div className="mb-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Item Description</label>
                        <input 
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const currentItems = iar?.missing_units_items || [];
                            const updatedItems = [...currentItems];
                            updatedItems[index] = { ...updatedItems[index], description: e.target.value };
                            setIar((p: any) => ({
                              ...(p ?? {}),
                              missing_units_items: updatedItems
                            }));
                          }}
                          readOnly={active?.status_id === 25}
                          placeholder="Describe the missing item"
                          className={`w-full px-2 py-1.5 text-xs rounded border ${
                            active?.status_id === 25
                              ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                              : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                          }`}
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Stock/Prop No.</label>
                          <input 
                            type="text"
                            value={item.stock_no}
                            onChange={(e) => {
                              const currentItems = iar?.missing_units_items || [];
                              const updatedItems = [...currentItems];
                              updatedItems[index] = { ...updatedItems[index], stock_no: e.target.value };
                              setIar((p: any) => ({
                                ...(p ?? {}),
                                missing_units_items: updatedItems
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
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => {
                              const currentItems = iar?.missing_units_items || [];
                              const updatedItems = [...currentItems];
                              updatedItems[index] = { ...updatedItems[index], unit: e.target.value };
                              setIar((p: any) => ({
                                ...(p ?? {}),
                                missing_units_items: updatedItems
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
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Qty</label>
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const currentItems = iar?.missing_units_items || [];
                              const updatedItems = [...currentItems];
                              const quantity = e.target.value;
                              const unitCost = parseFloat(item.unit_cost) || 0;
                              const totalCost = (parseFloat(quantity) || 0) * unitCost;
                              updatedItems[index] = { 
                                ...updatedItems[index], 
                                quantity: e.target.value,
                                total_cost: totalCost.toFixed(2)
                              };
                              setIar((p: any) => ({
                                ...(p ?? {}),
                                missing_units_items: updatedItems
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
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit Cost</label>
                          <input 
                            type="number"
                            value={item.unit_cost}
                            onChange={(e) => {
                              const currentItems = iar?.missing_units_items || [];
                              const updatedItems = [...currentItems];
                              const unitCost = e.target.value;
                              const quantity = parseFloat(item.quantity) || 0;
                              const totalCost = quantity * (parseFloat(unitCost) || 0);
                              updatedItems[index] = { 
                                ...updatedItems[index], 
                                unit_cost: e.target.value,
                                total_cost: totalCost.toFixed(2)
                              };
                              setIar((p: any) => ({
                                ...(p ?? {}),
                                missing_units_items: updatedItems
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
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Total Cost</label>
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
                  
                  {(iar?.missing_units_items || []).length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">No missing units added yet.</p>
                      <p className="text-xs">Click "Add Missing Unit Row" to add items that were supplied but not in the original PO.</p>
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

                  value={loa?.po_date ?? poData?.date ?? ""}

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



          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">

                  DV No. <span className="text-red-500">*</span>

                </label>



                <input

                  type="text"

                  value={dv?.dv_no ?? ""}

                  onChange={(e) =>

                    setDv((p: any) => ({ ...(p ?? {}), dv_no: e.target.value }))

                  }

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

                  onChange={(e) =>

                    setDv((p: any) => ({

                      ...(p ?? {}),

                      amount_due: e.target.value,

                    }))

                  }

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

                  onChange={(e) =>

                    setDv((p: any) => ({

                      ...(p ?? {}),

                      fund_cluster: e.target.value,

                    }))

                  }

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

                  onChange={(e) =>

                    setDv((p: any) => ({

                      ...(p ?? {}),

                      ors_no: e.target.value,

                    }))

                  }

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

                  value={dv?.payee_tin ?? ""}

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

                value={dv?.address ?? ""}

                onChange={(e) =>

                  setDv((p: any) => ({ ...(p ?? {}), address: e.target.value }))

                }

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

                  onChange={(e) =>

                    setDv((p: any) => ({

                      ...(p ?? {}),

                      responsibility_center: e.target.value,

                    }))

                  }

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

                  onChange={(e) =>

                    setDv((p: any) => ({

                      ...(p ?? {}),

                      mfo_pap: e.target.value,

                    }))

                  }

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



      // Transform poData to have the correct structure for templates



      const transformedPoData = poData

        ? {

            ...poData,



            po_items: poData.purchase_order_items || [],

          }

        : {};



      const mergedData = { ...active, ...transformedPoData };



      if (selectedDocument === "iar") {

        const iarData = { ...mergedData, ...iar };



        iarData.po_items = mergedData.po_items;

        // Include missing units items for preview
        if (iar?.missing_units_items) {
          iarData.missing_units_items = iar.missing_units_items;
          console.log("Missing units items for preview (second location):", iar.missing_units_items);
        } else {
          console.log("No missing units items found in iar data (second location)");
        }
        console.log("IAR data for preview:", iarData);

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
                <FlagButton
                  selected={statusFlag}
                  onPress={onPressStatusFlag}
                />
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
                <p className="text-white font-bold text-base leading-tight">Confirm Action</p>
                <p className="text-emerald-100 text-xs mt-0.5">Please review before proceeding</p>
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
                <span className="font-semibold text-gray-900">{deliveryNo}</span>.
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                This action will advance the record to the next status. Make sure all
                required information has been filled in correctly before confirming.
              </p>

              {/* Current status pill */}
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">{statusLabel}</p>
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

