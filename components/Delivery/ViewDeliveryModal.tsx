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
function replacePlaceholders(template: string, data: any): string {
  let result = template;
  Object.keys(data).forEach(key => {
    const value = data[key] ?? "";
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value);
  });
  return result;
}

interface ViewDeliveryModalProps {
  visible: boolean;
  onClose: () => void;
  delivery: any;
  iar: any;
  loa: any;
  dv: any;
  defaultTab?: "iar" | "loa" | "dv";
}

// Read-only input style
const readonlyCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";

// JSX Preview Components - based on templates
function IARPreview({ delivery, iar }: { delivery: any; iar: any }) {
  const [html, setHtml] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const template = await loadTemplate("IAR");
        const mergedData = { ...delivery, ...iar };
        const filled = replacePlaceholders(template, mergedData);
        setHtml(filled);
      } catch (error) {
        console.error("Error loading IAR preview:", error);
      }
    };
    loadPreview();
  }, [delivery, iar]);

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

function LOAPreview({ delivery, loa }: { delivery: any; loa: any }) {
  const [html, setHtml] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const template = await loadTemplate("LOA");
        const mergedData = { ...delivery, ...loa };
        const filled = replacePlaceholders(template, mergedData);
        setHtml(filled);
      } catch (error) {
        console.error("Error loading LOA preview:", error);
      }
    };
    loadPreview();
  }, [delivery, loa]);

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

function DVPreview({ delivery, dv }: { delivery: any; dv: any }) {
  const [html, setHtml] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const template = await loadTemplate("DV");
        const mergedData = { ...delivery, ...dv };
        const filled = replacePlaceholders(template, mergedData);
        setHtml(filled);
      } catch (error) {
        console.error("Error loading DV preview:", error);
      }
    };
    loadPreview();
  }, [delivery, dv]);

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
        title="DV Preview"
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

async function buildDVHtml(d: any): Promise<string> {
  const template = await loadTemplate("DV");
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

export default function ViewDeliveryModal({
  visible,
  onClose,
  delivery,
  iar,
  loa,
  dv,
  defaultTab = "iar",
}: ViewDeliveryModalProps) {
  const [tab, setTab] = useState<"iar" | "loa" | "dv">(defaultTab);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  // Update tab when defaultTab changes
  useEffect(() => {
    if (visible) {
      setTab(defaultTab);
    }
  }, [visible, defaultTab]);

  // Load HTML template when tab or data changes
  useEffect(() => {
    if (!visible) return;
    
    const loadHtml = async () => {
      try {
        let html: string | null = null;
        const mergedData = { ...delivery };
        
        if (tab === "iar" && iar) {
          html = await buildIARHtml({ ...mergedData, ...iar });
        } else if (tab === "loa" && loa) {
          html = await buildLOAHtml({ ...mergedData, ...loa });
        } else if (tab === "dv" && dv) {
          html = await buildDVHtml({ ...mergedData, ...dv });
        }
        
        setCurrentHtml(html);
      } catch (error) {
        console.error("Error loading document HTML:", error);
        setCurrentHtml(null);
      }
    };
    
    loadHtml();
  }, [visible, tab, delivery, iar, loa, dv]);

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
        return { data: iar, html: currentHtml, label: "Inspection & Acceptance Report", component: <IARPreview delivery={delivery} iar={iar || {}} /> };
      case "loa":
        return { data: loa, html: currentHtml, label: "Letter of Acceptance", component: <LOAPreview delivery={delivery} loa={loa || {}} /> };
      case "dv":
        return { data: dv, html: currentHtml, label: "Disbursement Voucher", component: <DVPreview delivery={delivery} dv={dv || {}} /> };
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
            
            {currentDoc.html && (
              <button
                onClick={() => downloadPDF(currentDoc.html!)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
              >
                <RiFilePdf2Line size={16} /> Print PDF
              </button>
            )}
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
              <button
                onClick={() => setTab("dv")}
                className={`px-5 py-2 text-sm font-semibold transition-all ${
                  tab === "dv"
                    ? "bg-white text-emerald-700"
                    : "text-white hover:bg-white/10"
                }`}
              >
                DV
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
          <div className="flex-[2] flex-col overflow-hidden border-r border-gray-200">
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
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">SOA No.</label>
                    <input className={readonlyCls} value={delivery?.soa_no ?? ""} readOnly tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Expected Delivery Date</label>
                    <input className={readonlyCls} value={delivery?.expected_delivery_date ?? ""} readOnly tabIndex={-1} />
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
                  {tab === "iar" ? "Inspection & Acceptance Report" : tab === "loa" ? "Letter of Acceptance" : "Disbursement Voucher"} Details
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
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Inspector Name</label>
                          <input className={readonlyCls} value={iar?.inspector_name ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Supply Officer Name</label>
                          <input className={readonlyCls} value={iar?.supply_officer_name ?? ""} readOnly tabIndex={-1} />
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
                    {tab === "dv" && (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">DV No.</label>
                          <input className={readonlyCls} value={dv?.dv_no ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Amount Due</label>
                          <input className={readonlyCls} value={dv?.amount_due ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Fund Cluster</label>
                          <input className={readonlyCls} value={dv?.fund_cluster ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">ORS No.</label>
                          <input className={readonlyCls} value={dv?.ors_no ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Payee</label>
                          <input className={readonlyCls} value={dv?.payee ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Payee TIN</label>
                          <input className={readonlyCls} value={dv?.payee_tin ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Address</label>
                          <input className={readonlyCls} value={dv?.address ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Mode of Payment</label>
                          <input className={readonlyCls} value={dv?.mode_of_payment ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Responsibility Center</label>
                          <input className={readonlyCls} value={dv?.responsibility_center ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">MFO/PAP</label>
                          <input className={readonlyCls} value={dv?.mfo_pap ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Particulars</label>
                          <textarea
                            className={`${readonlyCls} resize-none`}
                            rows={2}
                            value={dv?.particulars ?? ""}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Certified By</label>
                          <input className={readonlyCls} value={dv?.certified_by ?? ""} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Approved By</label>
                          <input className={readonlyCls} value={dv?.approved_by ?? ""} readOnly tabIndex={-1} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              {currentDoc.html && (
                <button
                  onClick={() => downloadPDF(currentDoc.html!)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  <RiFilePdf2Line size={18} /> Download PDF
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition-colors"
              >
                <RiCloseLine size={18} /> Close
              </button>
            </div>
          </div>

          {/* Preview Side */}
          <div className="flex-3 overflow-y-auto bg-gray-100 flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                  {currentDoc.label} · LIVE PREVIEW
                </h3>
                {currentDoc.html && (
                  <button
                    onClick={() => downloadPDF(currentDoc.html!)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    <RiFilePdf2Line size={16} /> PDF
                  </button>
                )}
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
