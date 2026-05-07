"use client";







import { useState, useEffect, useRef } from "react";



import { RiCloseLine, RiFilePdf2Line, RiDeleteBinLine } from "react-icons/ri";



import { useRouter } from "next/navigation";



import DeleteDeliveryModal from "@/components/Delivery/DeleteDeliveryModal";







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



function getNestedValue(obj: any, path: string): any {



  return path.split('.').reduce((current, key) => current && current[key], obj);



}







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
      itemBlock = itemBlock.replace(/{{add @index (\d+(?:\.\d+)?)}}/g, (_match: string, value: string) => {
        return (index + parseFloat(value)).toString();
      });
      
      return itemBlock;
    }).join('');
  });

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

  // Handle nested property access like {{po_items.length}}
  result = result.replace(/{{([^}]+\.([^}]+))}}/g, (match: string, fullExpression: string, _property: string) => {
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

    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value);
  });

  // Handle Handlebars-style conditionals {{#if condition}}content{{/if}} - PROCESS LAST
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    const value = getNestedValue(data, condition);
    const isTruthy = value && (!Array.isArray(value) || value.length > 0);
    return isTruthy ? content : '';
  });

  // Handle Handlebars-style conditionals with negation {{#unless condition}}content{{\/unless}} - (Adding this just in case View uses it)
  result = result.replace(/{{#unless\s+(\w+)}}([\s\S]*?){{\/unless}}/g, (match, condition, content) => {
    const value = getNestedValue(data, condition);
    const isFalsy = !value || (Array.isArray(value) && value.length === 0);
    return isFalsy ? content : '';
  });

  // Handle Handlebars-style conditionals with negation {{#if condition}}content{{else}}other{{/if}} - PROCESS LAST
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, (match, condition, trueContent, falseContent) => {
    const value = getNestedValue(data, condition);
    const isTruthy = value && (!Array.isArray(value) || value.length > 0);
    return isTruthy ? trueContent : falseContent;
  });

  return result;
}







interface ViewDeliveryModalProps {



  visible: boolean;



  onClose: () => void;



  delivery: any;



  iar: any;



  loa: any;



  poData: any;



  defaultTab?: "iar" | "loa";



}







// Read-only input style



const readonlyCls =



  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";







// JSX Preview Components - based on templates



function IARPreview({ delivery, iar, poData }: { delivery: any; iar: any; poData: any }) {



  const [html, setHtml] = useState<string>("");



  const iframeRef = useRef<HTMLIFrameElement>(null);







  useEffect(() => {



    const loadPreview = async () => {



      try {



        const template = await loadTemplate("IAR");



        



        // Transform poData to have the correct structure for templates



        const transformedPoData = poData ? {



          ...poData,



          po_items: poData.purchase_order_items || [],



          po_date: poData.date, // Map PO date to template's po_date placeholder



        } : {};



        



        const mergedData = { ...delivery, ...transformedPoData, ...iar };



        // Explicitly preserve PO fields from transformedPoData



        mergedData.po_items = transformedPoData.po_items;

        if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;

        if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;



        



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







function LOAPreview({ delivery, loa, poData }: { delivery: any; loa: any; poData: any }) {



  const [html, setHtml] = useState<string>("");



  const iframeRef = useRef<HTMLIFrameElement>(null);







  useEffect(() => {



    const loadPreview = async () => {



      try {



        const template = await loadTemplate("LOA");



        



        // Transform poData to have the correct structure for templates



        const transformedPoData = poData ? {



          ...poData,



          po_items: poData.purchase_order_items || [],



          po_date: poData.date, // Map PO date to template's po_date placeholder



        } : {};



        



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













// Keep HTML functions for PDF download



async function buildIARHtml(d: any): Promise<string> {



  const template = await loadTemplate("IAR");



  return replacePlaceholders(template, d);



}







async function buildLOAHtml(d: any): Promise<string> {



  const template = await loadTemplate("LOA");



  return replacePlaceholders(template, d);



}
















function downloadPDF(html: string) {



  const printWindow = window.open("", "", "height=800,width=1200");



  if (printWindow) {



    printWindow.document.write(html);



    printWindow.document.close();



    setTimeout(() => printWindow.print(), 250);



  }



}







async function handlePrintPDF(tab: "iar" | "loa", delivery: any, iar: any, loa: any, poData: any) {



  try {



    let html: string | null = null;



    



    // Transform poData to have the correct structure for templates



    const transformedPoData = poData ? {
      ...poData,
      po_items: poData.purchase_order_items || [],
      po_date: poData.date // Map PO date to template's po_date placeholder
    } : {};

    const mergedData = { ...delivery, ...transformedPoData };
    
    // Explicitly preserve PO fields from transformedPoData
    if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;
    if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;

    if (tab === "iar") {
      const iarData = { ...mergedData, ...iar };
      iarData.po_items = mergedData.po_items;
      if (mergedData.po_no) iarData.po_no = mergedData.po_no;
      if (mergedData.po_date) iarData.po_date = mergedData.po_date;

      html = await buildIARHtml(iarData);
    } else if (tab === "loa") {
      const loaData = { ...mergedData, ...loa };
      loaData.po_items = mergedData.po_items;
      if (mergedData.po_no) loaData.po_no = mergedData.po_no;
      if (mergedData.po_date) loaData.po_date = mergedData.po_date;

      html = await buildLOAHtml(loaData);
    }



    



    if (html) {



      downloadPDF(html);



    } else {



      alert("Unable to generate PDF. No document data available.");



    }



  } catch (error) {



    console.error("Error generating PDF:", error);



    alert("Failed to generate PDF. Please try again.");



  }



}







export default function ViewDeliveryModal({



  visible,



  onClose,



  delivery,



  iar,



  loa,



  poData,



  defaultTab = "iar",



}: ViewDeliveryModalProps) {



  const [tab, setTab] = useState<"iar" | "loa">(defaultTab);



  const [deleteModalOpen, setDeleteModalOpen] = useState(false);



  const [currentUser, setCurrentUser] = useState<any>(null);



  const [currentHtml, setCurrentHtml] = useState<string | null>(null);



  const router = useRouter();







  useEffect(() => {



    const stored = localStorage.getItem("currentUser");



    if (stored) setCurrentUser(JSON.parse(stored));



  }, []);







  // Debug logging for received props



  useEffect(() => {



    if (visible) {



      console.log("=== VIEW DELIVERY MODAL PROPS ===");



      console.log("Delivery:", delivery);



      console.log("IAR data:", iar);



      console.log("LOA data:", loa);



      console.log("PO data:", poData);



      console.log("Default tab:", defaultTab);



      console.log("Current tab:", tab);



    }



  }, [visible, delivery, iar, loa, poData, defaultTab, tab]);







  // Update tab when defaultTab changes



  useEffect(() => {



    if (visible) {



      setTab(defaultTab);



    }



  }, [visible, defaultTab]);







  // Load HTML template when tab or data changes



  useEffect(() => {



    if (!visible) return;



    



    console.log("=== LOADING HTML FOR VIEW MODAL ===");



    console.log("Current tab:", tab);



    console.log("IAR exists:", !!iar, iar);



    console.log("LOA exists:", !!loa, loa);



    



    const loadHtml = async () => {



      try {



        let html: string | null = null;



        



        // Transform poData to have the correct structure for templates



        const transformedPoData = poData ? {



          ...poData,



          po_items: poData.purchase_order_items || [],



          po_date: poData.date, // Map PO date to template's po_date placeholder



        } : {};



        



        const mergedData = { ...delivery, ...transformedPoData };



        



        if (tab === "iar" && iar) {



          console.log("Building IAR HTML...");



          const iarData = { ...mergedData, ...iar };



          // Explicitly preserve PO fields from mergedData



          iarData.po_items = mergedData.po_items;



          if (mergedData.po_no) iarData.po_no = mergedData.po_no;



          if (mergedData.po_date) iarData.po_date = mergedData.po_date;



          html = await buildIARHtml(iarData);



          console.log("IAR HTML generated successfully");



        } else if (tab === "loa" && loa) {



          console.log("Building LOA HTML...");



          const loaData = { ...mergedData, ...loa };



          // Explicitly preserve PO fields from mergedData



          loaData.po_items = mergedData.po_items;



          if (mergedData.po_no) loaData.po_no = mergedData.po_no;



          if (mergedData.po_date) loaData.po_date = mergedData.po_date;



          html = await buildLOAHtml(loaData);



          console.log("LOA HTML generated successfully");





        } else {



          console.log("No data available for tab:", tab, {



            hasIar: !!iar,



            hasLoa: !!loa



          });



        }



        



        console.log("Final HTML:", html ? "Generated" : "Not generated");



        setCurrentHtml(html);



      } catch (error) {



        console.error("Error loading document HTML:", error);



        setCurrentHtml(null);



      }



    };



    



    loadHtml();



  }, [visible, tab, delivery, iar, loa, poData]);







  // Lock body scroll while open



  useEffect(() => {



    document.body.style.overflow = "hidden";



    return () => { document.body.style.overflow = ""; };



  }, []);







  if (!visible) return null;







  // Get the current document data and HTML



  const getCurrentDoc = () => {



    switch (tab) {



      case "iar":



        return { data: iar, html: currentHtml, label: "Inspection & Acceptance Report", component: <IARPreview delivery={delivery} iar={iar || {}} poData={poData || {}} /> };



      case "loa":



        return { data: loa, html: currentHtml, label: "Letter of Acceptance", component: <LOAPreview delivery={delivery} loa={loa || {}} poData={poData || {}} /> };



    }



  };







  const currentDoc = getCurrentDoc();







  return (



    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">



      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />



      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">







        {/* ── HEADER ── */}



        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">



          <div>



            <h2 className="text-xl font-bold">Delivery Documents</h2>



            <p className="text-emerald-100 text-sm mt-1">{delivery?.delivery_no ?? "—"} · PO {delivery?.po_no ?? "—"}</p>



          </div>



          <div className="flex items-center gap-4">



            



          



            {/* Document Tabs */}



            <div className="flex bg-white/20 rounded-lg overflow-hidden border border-white/30 backdrop-blur">



              <button



                onClick={() => setTab("iar")}



                className={`px-5 py-2 text-sm font-semibold transition-all ${



                  tab === "iar"



                    ? "bg-white text-emerald-700"



                    : "text-white hover:bg-white/10"



                }`}



              >



                IAR



              </button>



              <button



                onClick={() => setTab("loa")}



                className={`px-5 py-2 text-sm font-semibold transition-all ${



                  tab === "loa"



                    ? "bg-white text-emerald-700"



                    : "text-white hover:bg-white/10"



                }`}



              >



                LOA



              </button>





            </div>



            {currentUser?.role_id === 1 && (



              <button



                onClick={() => setDeleteModalOpen(true)}



                className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors"



                title="Delete Delivery"



              >



                <RiDeleteBinLine size={20} />



              </button>



            )}



            <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">



              <RiCloseLine size={24} />



            </button>



          </div>



        </div>







        {/* ── BODY ── */}



        <div className="flex flex-1 overflow-hidden">







          {/* Form Side — read-only */}



          <div className="flex-[2] flex flex-col overflow-hidden border-r border-gray-200">



            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">







              {/* View-only notice */}



              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">



                <span>👁</span> This is a read-only view. No changes can be made.



              </div>







              {/* Delivery Info */}



              <div>



                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">



                  Delivery Information



                </h3>



                <div className="grid grid-cols-2 gap-4">



                  <div>



                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Delivery No.</label>



                    <input className={readonlyCls} value={delivery?.delivery_no ?? ""} readOnly tabIndex={-1} />



                  </div>



                  <div>



                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PO Number</label>



                    <input className={readonlyCls} value={delivery?.po_no ?? ""} readOnly tabIndex={-1} />



                  </div>



                  <div>



                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Supplier</label>



                    <input className={readonlyCls} value={delivery?.supplier ?? ""} readOnly tabIndex={-1} />



                  </div>



                  <div>



                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Office/Section</label>



                    <input className={readonlyCls} value={delivery?.office_section ?? ""} readOnly tabIndex={-1} />



                  </div>



                  <div>



                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">DR No.</label>



                    <input className={readonlyCls} value={delivery?.dr_no ?? ""} readOnly tabIndex={-1} />



                  </div>





                  <div>



                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Created At</label>



                    <input



                      className={readonlyCls}



                      value={delivery?.created_at ? new Date(delivery.created_at).toLocaleDateString("en-PH") : ""}



                      readOnly



                      tabIndex={-1}



                    />



                  </div>



                </div>



                {delivery?.notes && (



                  <div className="mt-4">



                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Notes</label>



                    <textarea



                      className={`${readonlyCls} resize-none`}



                      rows={2}



                      value={delivery.notes}



                      readOnly



                      tabIndex={-1}



                    />



                  </div>



                )}



              </div>







              {/* Document-specific fields */}



              <div>



                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">



                  {tab === "iar" ? "Inspection & Acceptance Report" : "Letter of Acceptance"} Details



                </h3>



                <div className="grid grid-cols-2 gap-4">



                    {tab === "iar" && (



                      <>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">IAR No.</label>



                          <input className={readonlyCls} value={iar?.iar_no ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Invoice No.</label>



                          <input className={readonlyCls} value={iar?.invoice_no ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Invoice Date</label>



                          <input className={readonlyCls} value={iar?.invoice_date ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Date Inspected</label>



                          <input className={readonlyCls} value={iar?.inspected_at ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Date Received</label>



                          <input className={readonlyCls} value={iar?.received_at ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Requisitioning Office</label>



                          <input className={readonlyCls} value={iar?.requisitioning_office ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Responsibility Center</label>



                          <input className={readonlyCls} value={iar?.responsibility_center ?? ""} readOnly tabIndex={-1} />



                        </div>



                                                



                        {/* Inspection Confirmation Display */}



                        <div className="col-span-2">



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Inspection Confirmation</label>



                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">



                            <div className="text-sm">



                              <div className="flex items-center gap-2">



                                <span className={`w-4 h-4 rounded flex items-center justify-center text-xs font-bold ${iar?.items_complete ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>



                                  {iar?.items_complete ? '✓' : '✗'}



                                </span>



                                <span className="text-gray-700">



                                  {iar?.items_complete ? 'Complete Delivery' : 'Partial Delivery'}



                                </span>



                              </div>



                            </div>



                          </div>



                        </div>







                        {/* Officer Signatures Display */}



                        <div className="col-span-2">



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Officer Signatures</label>



                          <div className="grid grid-cols-2 gap-4">



                            <div>



                              <p className="text-xs font-bold text-gray-600 mb-1">INSPECTION OFFICER/INSPECTION COMMITTEE</p>



                              <input className={readonlyCls} value={iar?.inspecting_officer_name ?? ""} readOnly tabIndex={-1} placeholder="Name of Inspecting Officer" />



                            </div>



                            <div>



                              <p className="text-xs font-bold text-gray-600 mb-1">ARPT/SUPPLY OFFICER</p>



                              <input className={readonlyCls} value={iar?.supply_officer_signature_name ?? ""} readOnly tabIndex={-1} placeholder="Name of Supply Officer" />



                            </div>



                          </div>



                        </div>



                      </>



                    )}



                    {tab === "loa" && (



                      <>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">LOA No.</label>



                          <input className={readonlyCls} value={loa?.loa_no ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Invoice No.</label>



                          <input className={readonlyCls} value={loa?.invoice_no ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Invoice Date</label>



                          <input className={readonlyCls} value={loa?.invoice_date ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Acceptance Date</label>



                          <input className={readonlyCls} value={loa?.accepted_at ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Accepted By (Name)</label>



                          <input className={readonlyCls} value={loa?.accepted_by_name ?? ""} readOnly tabIndex={-1} />



                        </div>



                        <div>



                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Accepted By (Title)</label>



                          <input className={readonlyCls} value={loa?.accepted_by_title ?? ""} readOnly tabIndex={-1} />



                        </div>



                      </>



                    )}





                  </div>



                </div>



            </div>







            {/* Footer */}



            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">



              <button



                onClick={() => handlePrintPDF(tab, delivery, iar, loa, poData)}



                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"



              >



                <RiFilePdf2Line size={18} /> Download PDF



              </button>



              <button



                onClick={onClose}



                className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition-colors"



              >



                <RiCloseLine size={18} /> Close



              </button>



            </div>



          </div>







          {/* Preview Side */}



          <div className="flex-[3] flex flex-col overflow-hidden bg-gray-100">



            <div className="flex-1 overflow-y-auto p-8">



              <div className="flex items-center justify-between mb-4">



                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">



                  {currentDoc.label} · LIVE PREVIEW



                </h3>



               



              </div>



              <div className="bg-white rounded-lg shadow-lg p-8 text-black overflow-x-auto" style={{ minHeight: '800px' }}>



                {currentDoc.component}



              </div>



            </div>



          </div>







        </div>



      </div>



        <DeleteDeliveryModal



          visible={deleteModalOpen}



          deliveryId={delivery?.id ?? null}



          deliveryNo={delivery?.delivery_no ?? null}



          onClose={() => setDeleteModalOpen(false)}



          onDeleted={(id) => {



            setDeleteModalOpen(false);



            onClose();



            try { router.refresh(); } catch (e) { window.location.reload(); }



          }}



          roleId={currentUser?.role_id}



        />



    </div>



  );



}



