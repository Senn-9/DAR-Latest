"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { buildPRPrintHtml } from "@/utils/print/PRPrintBuilder";
import { printWithIframe } from "@/utils/print/printUtils";
import {
  RiCloseLine,
  RiFilePdf2Line,
  RiEditLine,
} from "react-icons/ri";
import { RichEditor } from "@/components/RichEditor";

type ItemDataType = {
  stock_no: string;
  unit: string;
  description: string;
  quantity: string;
  unit_price: string;
  subtotal: string;
  created_at: string;
};

const tdStyle: React.CSSProperties = {
  border: "1px solid black",
  fontSize: "8pt",
  padding: "1px 3px",
  fontFamily: "'Times New Roman', Times, serif",
  color: "#000",
  overflow: "hidden",
  wordWrap: "break-word",
  whiteSpace: "normal",
};

const thStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "center",
  fontWeight: "bold",
};

// Read-only input — same look as the form but no interaction
const readonlyCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";

function emptyItem(): ItemDataType {
  return {
    stock_no: "",
    unit: "",
    description: "",
    quantity: "",
    unit_price: "",
    subtotal: "",
    created_at: new Date().toISOString(),
  };
}

function getItemTotal(item: ItemDataType): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
}

function getGrandTotal(items: ItemDataType[]): number {
  return items.reduce((sum, item) => sum + getItemTotal(item), 0);
}

function PRPreview({ formData, items }: { formData: any; items: ItemDataType[] }) {
  const itemRows = [...items];
  while (itemRows.length < 30) {
    itemRows.push(emptyItem());
  }
  const grandTotal = getGrandTotal(items);

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "9pt", color: "#000" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          color: "#000",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: "12%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "15%" }} />
        </colgroup>
        <tbody>
          <tr style={{ height: "27px" }}>
            <td colSpan={6} style={{ textAlign: "right", fontSize: "10pt", paddingRight: "4px", color: "#000" }}>
              Appendix 60
            </td>
          </tr>
          <tr style={{ height: "52px" }}>
            <td colSpan={6} style={{ textAlign: "center", fontWeight: "bold", fontSize: "12pt", color: "#000", verticalAlign: "top", paddingTop: "6px" }}>
              PURCHASE REQUEST
            </td>
          </tr>
          <tr style={{ height: "21px" }}>
            <td colSpan={3} style={{ borderBottom: "1px solid black", fontSize: "8pt", padding: "2px 4px", fontWeight: "bold", color: "#000", whiteSpace: "nowrap", overflow: "hidden" }}>
              Entity Name: <span style={{ fontWeight: "normal" }} dangerouslySetInnerHTML={{ __html: formData.entity_name || "" }} />
            </td>
            <td colSpan={3} style={{ borderBottom: "1px solid black", fontSize: "8pt", padding: "2px 4px", fontWeight: "bold", color: "#000" }}>
              Fund Cluster: <span style={{ fontWeight: "normal" }}>{formData.fund_cluster}</span>
            </td>
          </tr>
          <tr style={{ height: "14px" }}>
            <td rowSpan={2} colSpan={2} style={{ border: "1px solid black", fontSize: "8pt", verticalAlign: "top", padding: "2px 4px", color: "#000" }}>
              Office/Section :<br />
              {formData.office_section}
            </td>
            <td colSpan={2} style={{ borderTop: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black", fontSize: "8pt", fontWeight: "bold", padding: "2px 4px", color: "#000" }}>
              PR No.: <span style={{ fontWeight: "normal" }}>{formData.pr_no}</span>
            </td>
            <td rowSpan={2} colSpan={2} style={{ border: "1px solid black", fontSize: "8pt", fontWeight: "bold", verticalAlign: "top", padding: "2px 4px", color: "#000" }}>
              Date:<br />
              <span style={{ fontWeight: "normal" }}>{formData.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}</span>
            </td>
          </tr>
          <tr style={{ height: "15px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", fontSize: "8pt", fontWeight: "bold", padding: "2px 4px", color: "#000" }}>
              Responsibility Center Code: <span style={{ fontWeight: "normal" }}>{formData.resp_code}</span>
            </td>
          </tr>
          <tr style={{ height: "22.5px" }}>
            <th style={thStyle}>Stock/
                Property No.</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Item Description</th>
            <th style={thStyle}>Quantity</th>
            <th style={thStyle}>Unit Cost</th>
            <th style={thStyle}>Total Cost</th>
          </tr>
          {itemRows.map((item, idx) => {
            const total = getItemTotal(item);
            return (
              <tr key={idx} style={{ height: "16px" }}>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.stock_no}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.unit}</td>
                <td style={{ ...tdStyle, textAlign: "left", padding: "1px 4px" }} dangerouslySetInnerHTML={{ __html: item.description || "" }} />
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.quantity}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{item.unit_price ? "₱" + parseFloat(item.unit_price).toFixed(2) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{total > 0 ? "₱" + total.toFixed(2) : ""}</td>
              </tr>
            );
          })}
          <tr style={{ height: "17px" }}>
            <td colSpan={5} style={{ borderTop: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", fontSize: "8.5pt", padding: "2px 4px", textAlign: "right", fontWeight: "bold" }}>
              TOTAL
            </td>
            <td style={{ borderTop: "1px solid black", borderRight: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", textAlign: "right", fontWeight: "bold" }}>
              {grandTotal > 0 ? "₱" + grandTotal.toFixed(2) : ""}
            </td>
          </tr>
          <tr style={{ height: "17px" }}>
            <td colSpan={6} style={{ borderTop: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", color: "#000" }}>
              <b>Purpose:</b> <span dangerouslySetInnerHTML={{ __html: formData.purpose || "" }} />
            </td>
          </tr>
          <tr style={{ height: "30px" }}>
            <td colSpan={6} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "12px" }}>
            <td style={{ borderTop: "1px solid black", borderLeft: "1px solid black" }}></td>
            <td colSpan={2} style={{ borderTop: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>
              <i>Requested by:</i>
            </td>
            <td colSpan={2} style={{ borderTop: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>
              <i>Approved by:</i>
            </td>
            <td style={{ borderTop: "1px solid black", borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "12px" }}>
            <td colSpan={2} style={{ borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>Signature :</td>
            <td></td>
            <td></td>
            <td></td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "12px" }}>
            <td colSpan={2} style={{ borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>Printed Name :</td>
            <td style={{ fontSize: "8.5pt", padding: "2px 4px" }}>{formData.req_name}</td>
            <td colSpan={2} style={{ fontSize: "8.5pt", padding: "2px 4px" }}>{formData.app_name}</td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "14.75px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>Designation :</td>
            <td style={{ borderBottom: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>{formData.req_desig}</td>
            <td colSpan={2} style={{ borderBottom: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>{formData.app_desig}</td>
            <td style={{ borderBottom: "1px solid black", borderRight: "1px solid black" }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Helper function to escape HTML special characters
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadPDF(formData: any, items: ItemDataType[], currentUserFullname?: string, currentUserId?: number | null, prId?: number) {
  // Post remark if currentUser is available
  if (currentUserFullname) {
    postPrintRemark(currentUserFullname, 'PR', currentUserId, prId);
  }
  const html = buildPRPrintHtml({
    prNo: formData.pr_no || '',
    entityName: formData.entity_name || '',
    fundCluster: formData.fund_cluster || '',
    officeSection: formData.office_section || '',
    respCode: formData.resp_code || '',
    date: formData.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    purpose: formData.purpose || '',
    reqName: formData.req_name || '',
    reqDesig: formData.req_desig || '',
    appName: formData.app_name || '',
    appDesig: formData.app_desig || '',
    items: items.map((item) => ({
      stock_no: item.stock_no,
      unit: item.unit,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  });
  printWithIframe(html);
}

// Helper function to post print remark
async function postPrintRemark(fullname: string, documentType: 'PR' | 'PO' | 'ORS', userId?: number | null, prId?: number) {
  try {
    const supabase = createClient();
    const remarkText = `[PRINT] ${fullname} downloaded/printed a ${documentType} document`;

    // Insert into remarks table
    await supabase.from('remarks').insert({
      remark: remarkText,
      user_id: userId || null,
      pr_id: prId || null,
      phase: 'pr',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to post print remark:', error);
  }
}

interface ViewPRModalProps {
  prId: number;
  onClose: () => void;
  onEdit?: () => void;
}

export default function ViewPRModal({ prId, onClose, onEdit }: ViewPRModalProps) {
  const supabase = createClient();

  const [formData, setFormData] = useState({
    entity_name: "",
    fund_cluster: "",
    office_section: "",
    pr_no: "",
    resp_code: "",
    purpose: "",
    req_name: "",
    req_desig: "",
    app_name: "",
    app_desig: "",
    created_at: "",
  });

  const [items, setItems] = useState<ItemDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserFullname, setCurrentUserFullname] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");

  // Editable styled fields for print (not saved to DB)
  const [editablePREntityName, setEditablePREntityName] = useState<string>("");
  const [editablePRPurpose, setEditablePRPurpose] = useState<string>("");
  const [editablePRItemDescs, setEditablePRItemDescs] = useState<string[]>([]);

  // Load current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user?.fullname) {
          setCurrentUserFullname(user.fullname);
        }
        if (user?.id) {
          setCurrentUserId(user.id);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Fetch PR data
  useEffect(() => {
    const fetchPR = async () => {
      try {
        setLoading(true);
        const { data: form, error: formErr } = await supabase
          .from("purchase_requests")
          .select("*")
          .eq("id", prId)
          .maybeSingle();

      if (formErr) {
        console.error("Error fetching PR:", formErr?.message || formErr);
        setLoading(false);
        return;
      }

      if (!form) {
        console.error("PR not found with ID:", prId);
        setLoading(false);
        return;
      }

      setStatus(form.status || "");
      setFormData({
        entity_name:  form.entity_name   || "",
        fund_cluster: form.fund_cluster  || "",
        office_section: form.office_section || "",
        pr_no:        form.pr_no         || "",
        resp_code:    form.resp_code     || "",
        purpose:      form.purpose       || "",
        req_name:     form.req_name      || "",
        req_desig:    form.req_desig     || "",
        app_name:     form.app_name      || "",
        app_desig:    form.app_desig     || "",
        created_at:   form.created_at?.slice(0, 10) || "",
      });
      setEditablePREntityName(form.entity_name || "");
      setEditablePRPurpose(form.purpose || "");

      const { data: itemData, error: itemErr } = await supabase
        .from("purchase_request_items")
        .select("*")
        .eq("pr_id", prId);

      if (itemErr) {
        console.error("Error fetching PR items:", itemErr?.message || itemErr);
      } else if (itemData) {
        const mappedItems = itemData.map((i: any) => ({
            stock_no:   i.stock_no    || "",
            unit:       i.unit        || "",
            description: i.description || "",
            quantity:   String(i.quantity   ?? ""),
            unit_price: String(i.unit_price ?? ""),
            subtotal:   String(i.subtotal   ?? ""),
            created_at: i.created_at  || new Date().toISOString(),
          }));
        setItems(mappedItems);
        setEditablePRItemDescs(mappedItems.map(item => item.description));
      }

      setLoading(false);
      } catch (error) {
        console.error("Unexpected error fetching PR:", error);
        setLoading(false);
      }
    };

    fetchPR();
  }, [prId, supabase]);

  const grandTotal = getGrandTotal(items);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── HEADER ── same gradient as PRModalComponent */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">View Purchase Request</h2>
            <p className="text-emerald-100 text-sm mt-1">Appendix 60 · Official Government Form</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Edit Button - only for Pending status */}
            {status === "Pending" && onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors text-sm font-semibold border border-white/50 shadow-sm"
              >
                <RiEditLine size={16} /> Edit
              </button>
            )}
            <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* View Mode — read-only */}
          <div className="flex flex-[2] flex-col overflow-hidden border-r border-gray-200">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="space-y-3 w-full px-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

                  {/* View-only notice */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
                    <span>👁</span> This PR is in <b>{status || "Unknown"}</b> status. {status === "Pending" ? "Click 'Edit PR' to make changes." : "Editing is disabled."}
                  </div>

                  {/* Print styling notice */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
                    <span>🎨</span> <b>Print Styling:</b> Fields marked <span className="text-emerald-600">(Editable)</span> support Bold, Italic, Underline, and alignment for the printed document only. Changes are not saved.
                  </div>

                  {/* Header Information */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Header Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Entity Name <span className="text-emerald-600">(Editable)</span></label>
                        <RichEditor value={editablePREntityName} onChange={setEditablePREntityName} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white" compact />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Fund Cluster</label>
                          <input className={readonlyCls} value={formData.fund_cluster} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PR Number</label>
                          <input className={readonlyCls} value={formData.pr_no} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Office / Section</label>
                          <input className={readonlyCls} value={formData.office_section} readOnly tabIndex={-1} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Date</label>
                          <input className={readonlyCls} value={formData.created_at} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Responsibility Center Code</label>
                        <input className={readonlyCls} value={formData.resp_code} readOnly tabIndex={-1} />
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                        Items <span className="text-gray-400 font-normal normal-case ml-1">({items.length})</span>
                      </h3>
                    </div>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {items.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No items on this PR.</p>
                      ) : (
                        items.map((item, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Item {index + 1}</div>
                            <div className="mb-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Description <span className="text-emerald-600 normal-case">(Editable)</span></label>
                              <RichEditor
                                value={editablePRItemDescs[index] ?? item.description ?? ""}
                                onChange={(html) => {
                                  const updated = [...editablePRItemDescs];
                                  updated[index] = html;
                                  setEditablePRItemDescs(updated);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Stock/Prop No.</label>
                                <input className={readonlyCls} value={item.stock_no} readOnly tabIndex={-1} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit</label>
                                <input className={readonlyCls} value={item.unit} readOnly tabIndex={-1} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Qty</label>
                                <input className={readonlyCls} value={item.quantity} readOnly tabIndex={-1} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit Cost</label>
                                <input className={readonlyCls} value={item.unit_price ? parseFloat(item.unit_price).toFixed(2) : ""} readOnly tabIndex={-1} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Total Cost</label>
                                <input className={`${readonlyCls} bg-emerald-50 font-bold text-emerald-700`} value={getItemTotal(item).toFixed(2)} readOnly tabIndex={-1} />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="bg-emerald-700 text-white px-4 py-3 rounded-lg flex justify-between items-center font-bold">
                    <span>GRAND TOTAL</span>
                    <span className="text-lg">₱{grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Signatures */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Signatures</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Requested By</label>
                        <input className={readonlyCls} value={formData.req_name} readOnly tabIndex={-1} />
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2 mt-3">Designation</label>
                        <input className={readonlyCls} value={formData.req_desig} readOnly tabIndex={-1} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Approved By</label>
                        <input className={readonlyCls} value={formData.app_name} readOnly tabIndex={-1} />
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2 mt-3">Designation</label>
                        <input className={readonlyCls} value={formData.app_desig} readOnly tabIndex={-1} />
                      </div>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Purpose <span className="text-emerald-600 normal-case text-xs font-normal">(Editable)</span></h3>
                    <RichEditor value={editablePRPurpose} onChange={setEditablePRPurpose} className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white" />
                  </div>
                </div>

                {/* Footer — PDF only, no Save */}
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => downloadPDF(
                      { ...formData, entity_name: editablePREntityName, purpose: editablePRPurpose },
                      items.map((item, i) => ({ ...item, description: editablePRItemDescs[i] ?? item.description })),
                      currentUserFullname, currentUserId, prId
                    )}
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
              </>
            )}
          </div>

          {/* Preview Side */}
          <div className="flex flex-[3] overflow-y-auto bg-gray-100 flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
              </div>
              <div id="pr-preview-content" className="bg-white rounded-lg shadow-lg p-8 text-black">
                <PRPreview
                  formData={{ ...formData, entity_name: editablePREntityName, purpose: editablePRPurpose }}
                  items={items.map((item, i) => ({ ...item, description: editablePRItemDescs[i] ?? item.description }))}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}