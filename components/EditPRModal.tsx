"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiFilePdf2Line,
  RiSaveLine,
  RiAddLine,
} from "react-icons/ri";
import { buildPRPrintHtml } from "@/utils/print/PRPrintBuilder";
import { printWithIframe, stripHtml } from "@/utils/print/printUtils";
import { RichEditor } from "@/components/RichEditor";
import { SuccessModal, ErrorModal } from "@/components/StatusModal";

type ItemDataType = {
  _key: string; // stable unique ID for React key tracking
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

// Editable input class
const editableCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300";

// Read-only input class
const readonlyCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";

let _editItemKeyCounter = 0;
function emptyItem(): ItemDataType {
  return {
    _key: `eitem-${++_editItemKeyCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadPDF(formData: any, items: ItemDataType[], currentUserFullname?: string, currentUserId?: number | null, prId?: number) {
  if (currentUserFullname && prId) {
    postPrintRemark(currentUserFullname, "PR", currentUserId, prId);
  }
  const html = buildPRPrintHtml({
    prNo: formData.pr_no?.startsWith("PR-DRAFT-") ? "" : formData.pr_no || '',
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
async function postPrintRemark(fullname: string, documentType: "PR" | "PO" | "ORS", userId?: number | null, prId?: number | null) {
  try {
    const supabase = createClient();
    const remarkText = prId
      ? `[PRINT] ${fullname} downloaded/printed ${documentType} #${prId}`
      : `[PRINT] ${fullname} downloaded/printed a draft ${documentType} document`;

    await supabase.from("remarks").insert({
      remark: remarkText,
      user_id: userId || null,
      pr_id: prId || null,
      phase: "pr",
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to post print remark:", error);
  }
}

// Helper function to post edit remark
async function postEditRemark(fullname: string, prId: number, userId?: number | null) {
  try {
    const supabase = createClient();
    const remarkText = `[EDIT] ${fullname} successfully edited PR #${prId}`;

    await supabase.from("remarks").insert({
      remark: remarkText,
      user_id: userId || null,
      pr_id: prId,
      phase: "pr",
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to post edit remark:", error);
  }
}

interface EditPRModalProps {
  prId: number;
  onClose: () => void;
  onSave?: () => void;
}

export default function EditPRModal({ prId, onClose, onSave }: EditPRModalProps) {
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
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUserFullname, setCurrentUserFullname] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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

        setFormData({
          entity_name: form.entity_name || "",
          fund_cluster: form.fund_cluster || "",
          office_section: form.office_section || "",
          pr_no: form.pr_no || "",
          resp_code: form.resp_code || "",
          purpose: form.purpose || "",
          req_name: form.req_name || "",
          req_desig: form.req_desig || "",
          app_name: form.app_name || "",
          app_desig: form.app_desig || "",
          created_at: form.created_at?.slice(0, 10) || "",
        });

        const { data: itemData, error: itemErr } = await supabase
          .from("purchase_request_items")
          .select("*")
          .eq("pr_id", prId);

        if (itemErr) {
          console.error("Error fetching PR items:", itemErr?.message || itemErr);
        } else if (itemData) {
          const loaded = itemData.map((i: any) => ({
            _key: `eitem-${++_editItemKeyCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            stock_no: i.stock_no || "",
            unit: i.unit || "",
            description: i.description || "",
            quantity: String(i.quantity ?? ""),
            unit_price: String(i.unit_price ?? ""),
            subtotal: String(i.subtotal ?? ""),
            created_at: i.created_at || new Date().toISOString(),
          }));
          while (loaded.length < 20) loaded.push(emptyItem());
          setItems(loaded);
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

  // Helper functions for editing items
  const updateItem = (index: number, field: keyof ItemDataType, value: string) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, emptyItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const updatedItems = [...items];
      [updatedItems[index - 1], updatedItems[index]] = [updatedItems[index], updatedItems[index - 1]];
      setItems(updatedItems);
    } else if (direction === "down" && index < items.length - 1) {
      const updatedItems = [...items];
      [updatedItems[index], updatedItems[index + 1]] = [updatedItems[index + 1], updatedItems[index]];
      setItems(updatedItems);
    }
  };

  // Save function for updating PR
  const handleSave = async () => {
    setSaving(true);

    try {
      // Update PR header
      const { error: formError } = await supabase
        .from("purchase_requests")
        .update({
          entity_name: formData.entity_name,
          fund_cluster: formData.fund_cluster,
          office_section: formData.office_section,
          resp_code: formData.resp_code,
          purpose: formData.purpose,
          req_name: formData.req_name,
          req_desig: formData.req_desig,
          app_name: formData.app_name,
          app_desig: formData.app_desig,
        })
        .eq("id", prId);

      if (formError) {
        setErrorMsg("Error updating PR: " + formError.message);
        setSaving(false);
        return;
      }

      // Delete existing items and insert new ones
      await supabase.from("purchase_request_items").delete().eq("pr_id", prId);

      const itemsToInsert = items
        .map((item) => ({
          pr_id: prId,
          stock_no: item.stock_no || "",
          unit: item.unit || "",
          description: stripHtml(item.description),
          quantity: item.quantity.trim() === "" ? null : parseInt(item.quantity),
          unit_price: item.unit_price.trim() === "" ? null : parseFloat(item.unit_price),
          subtotal: Math.round(getItemTotal(item)),
          // _key is excluded — not sent to DB
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemError } = await supabase
          .from("purchase_request_items")
          .insert(itemsToInsert);

        if (itemError) {
          setErrorMsg("Error saving items: " + itemError.message);
          setSaving(false);
          return;
        }
      }

      // Post edit remark
      if (currentUserFullname) {
        await postEditRemark(currentUserFullname, prId, currentUserId);
      }

      setSuccessMsg("PR updated successfully!");
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error("Error saving PR:", error);
      setErrorMsg("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">Edit Purchase Request</h2>
            <p className="text-emerald-100 text-sm mt-1">PR #{formData.pr_no?.startsWith("PR-DRAFT-") ? "Draft" : formData.pr_no || prId}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Edit Form Side */}
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
                  {/* Edit mode notice */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
                    <span>✏️</span> You are now in <b>Edit Mode</b>. Make your changes and click Save.
                  </div>

                  {/* Header Information */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Header Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Entity Name</label>
                        <input
                          className={editableCls}
                          value={formData.entity_name}
                          onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Fund Cluster</label>
                          <input
                            className={editableCls}
                            value={formData.fund_cluster}
                            onChange={(e) => setFormData({ ...formData, fund_cluster: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PR Number</label>
                          <input className={readonlyCls} value={formData.pr_no?.startsWith("PR-DRAFT-") ? "" : formData.pr_no} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Office / Section</label>
                          <input
                            className={editableCls}
                            value={formData.office_section}
                            onChange={(e) => setFormData({ ...formData, office_section: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Date</label>
                          <input className={readonlyCls} value={formData.created_at} readOnly tabIndex={-1} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Responsibility Center Code</label>
                        <input
                          className={editableCls}
                          value={formData.resp_code}
                          onChange={(e) => setFormData({ ...formData, resp_code: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                        Items <span className="text-gray-400 font-normal normal-case ml-1">({items.length})</span>
                      </h3>
                      <button
                        onClick={addItem}
                        className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold px-3 py-1.5 border border-dashed border-emerald-300 rounded hover:bg-emerald-50 transition-colors"
                      >
                        <RiAddLine size={14} /> Add Item
                      </button>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {items.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No items on this PR.</p>
                      ) : (
                        items.map((item, index) => (
                          <div key={item._key} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                            <div className="absolute top-2 right-2 flex gap-1">
                              {index > 0 && (
                                <button
                                  onClick={() => moveItem(index, "up")}
                                  className="text-gray-400 hover:text-emerald-600 text-sm p-1"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                              )}
                              {index < items.length - 1 && (
                                <button
                                  onClick={() => moveItem(index, "down")}
                                  className="text-gray-400 hover:text-emerald-600 text-sm p-1"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                              )}
                              {items.length > 1 && (
                                <button
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800 text-lg font-bold ml-1"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Item {index + 1}</div>
                            <div className="mb-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Item Description</label>
                              <RichEditor
                                value={item.description}
                                onChange={(html) => updateItem(index, 'description', html)}
                                className={editableCls}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Stock/Prop No.</label>
                                <input
                                  className={editableCls}
                                  value={item.stock_no}
                                  onChange={(e) => updateItem(index, "stock_no", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit</label>
                                <input
                                  className={editableCls}
                                  value={item.unit}
                                  onChange={(e) => updateItem(index, "unit", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Qty</label>
                                <input
                                  className={editableCls}
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit Cost</label>
                                <input
                                  className={editableCls}
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Total Cost</label>
                                <input
                                  className={`${readonlyCls} bg-emerald-50 font-bold text-emerald-700`}
                                  value={getItemTotal(item).toFixed(2)}
                                  readOnly
                                  tabIndex={-1}
                                />
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
                        <input
                          className={editableCls}
                          value={formData.req_name}
                          onChange={(e) => setFormData({ ...formData, req_name: e.target.value })}
                        />
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2 mt-3">Designation</label>
                        <input
                          className={editableCls}
                          value={formData.req_desig}
                          onChange={(e) => setFormData({ ...formData, req_desig: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Approved By</label>
                        <input
                          className={editableCls}
                          value={formData.app_name}
                          onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                        />
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2 mt-3">Designation</label>
                        <input
                          className={editableCls}
                          value={formData.app_desig}
                          onChange={(e) => setFormData({ ...formData, app_desig: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Purpose</h3>
                    <textarea
                      className={editableCls}
                      rows={2}
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    />
                  </div>
                </div>

                {/* Footer — Save + Cancel + PDF */}
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <RiSaveLine size={18} className="flex-shrink-0" />
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={() => downloadPDF(formData, items, currentUserFullname, currentUserId, prId)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <RiFilePdf2Line size={18} className="flex-shrink-0" />
                    <span>PDF</span>
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
                <button
                  onClick={() => downloadPDF(formData, items, currentUserFullname, currentUserId, prId)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  <RiFilePdf2Line size={16} /> PDF
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-black">
                <PREditablePreview
                  formData={formData}
                  setFormData={setFormData}
                  items={items}
                  addItem={addItem}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SuccessModal
      visible={!!successMsg}
      title="PR Updated"
      message={successMsg ?? ""}
      onConfirm={() => setSuccessMsg(null)}
    />
    <ErrorModal
      visible={!!errorMsg}
      title="Error"
      message={errorMsg ?? ""}
      onDismiss={() => setErrorMsg(null)}
    />
    </>
  );
}

// Editable PR Preview Component (matches Create PR's live preview)
function PREditablePreview({
  formData,
  setFormData,
  items,
  addItem,
  updateItem,
  removeItem,
}: {
  formData: any;
  setFormData: (data: any) => void;
  items: ItemDataType[];
  addItem: () => void;
  updateItem: (index: number, field: keyof ItemDataType, value: string) => void;
  removeItem: (index: number) => void;
}) {
  const editableInputCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] whitespace-pre-wrap break-words resize-none overflow-hidden";
  const editableInputCenterCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-center whitespace-pre-wrap break-words resize-none overflow-hidden";
  const editableInputRightCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-right whitespace-pre-wrap break-words resize-none overflow-hidden";

  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

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
              Entity Name: <input type="text" value={formData.entity_name} onChange={e => setFormData({ ...formData, entity_name: e.target.value })} className={editableInputCls} style={{ fontWeight: "normal", width: "60%" }} />
            </td>
            <td colSpan={3} style={{ borderBottom: "1px solid black", fontSize: "8pt", padding: "2px 4px", fontWeight: "bold", color: "#000" }}>
              Fund Cluster: <input type="text" value={formData.fund_cluster} onChange={e => setFormData({ ...formData, fund_cluster: e.target.value })} className={editableInputCls} style={{ fontWeight: "normal", width: "60%" }} />
            </td>
          </tr>
          <tr style={{ height: "14px" }}>
            <td rowSpan={2} colSpan={2} style={{ border: "1px solid black", fontSize: "8pt", verticalAlign: "top", padding: "2px 4px", color: "#000" }}>
              Office/Section :<br />
              {formData.office_section}
            </td>
            <td colSpan={2} style={{ borderTop: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black", fontSize: "8pt", fontWeight: "bold", padding: "2px 4px", color: "#000" }}>
              PR No.: <span style={{ fontWeight: "normal" }}>{formData.pr_no?.startsWith("PR-DRAFT-") ? "" : formData.pr_no}</span>
            </td>
            <td rowSpan={2} colSpan={2} style={{ border: "1px solid black", fontSize: "8pt", fontWeight: "bold", verticalAlign: "top", padding: "2px 4px", color: "#000" }}>
              Date:
              <br />
              <span style={{ fontWeight: "normal" }}>{formData.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}</span>
            </td>
          </tr>
          <tr style={{ height: "15px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", fontSize: "8pt", fontWeight: "bold", padding: "2px 4px", color: "#000" }}>
              Responsibility Center Code: <input type="text" value={formData.resp_code} onChange={e => setFormData({ ...formData, resp_code: e.target.value })} className={editableInputCls} style={{ fontWeight: "normal", width: "40%" }} />
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
          {items.map((item, originalIndex) => {
            const total = getItemTotal(item);
            return (
              <React.Fragment key={item._key}>
                <tr style={{ height: "22px" }}>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                    <textarea value={item.stock_no} onChange={e => updateItem(originalIndex, 'stock_no', e.target.value)} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                    <textarea value={item.unit} onChange={e => updateItem(originalIndex, 'unit', e.target.value)} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, padding: "1px 4px", verticalAlign: "top" }}>
                    <RichEditor
                      value={item.description}
                      onChange={(html) => updateItem(originalIndex, 'description', html)}
                      compact
                      className={editableInputCls}
                      style={{ width: "95%", fontFamily: "'Times New Roman', Times, serif" }}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                    <textarea value={item.quantity} onChange={e => updateItem(originalIndex, 'quantity', e.target.value)} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", verticalAlign: "top" }}>
                    <textarea value={item.unit_price} onChange={e => updateItem(originalIndex, 'unit_price', e.target.value)} onInput={autoResize} className={editableInputRightCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", position: "relative", verticalAlign: "top" }}>
                    {total > 0 ? "₱" + total.toFixed(2) : ""}
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(originalIndex)} className="absolute right-1 top-1 text-red-500 hover:text-red-700 text-[10px]" title="Remove row">×</button>
                    )}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "4px", textAlign: "center" }}>
              <button
                type="button"
                onClick={addItem}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
              >
                + Add Item
              </button>
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td colSpan={5} style={{ borderTop: "1px solid black", padding: "4px", textAlign: "right", fontSize: "9pt", fontWeight: "bold" }}>
              TOTAL
            </td>
            <td style={{ borderTop: "1px solid black", padding: "4px", textAlign: "right", fontSize: "9pt", fontWeight: "bold" }}>
              {grandTotal > 0 ? "₱" + grandTotal.toFixed(2) : ""}
            </td>
          </tr>
          <tr style={{ height: "17px" }}>
            <td colSpan={6} style={{ borderTop: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", color: "#000" }}>
              <b>Purpose:</b> <textarea value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} className={editableInputCls} style={{ width: "90%", resize: "none", overflow: "hidden", minHeight: "20px", verticalAlign: "middle" }} placeholder="State the purpose of this request..." rows={1} />
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
            <td colSpan={2} style={{ borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>
              Signature :
            </td>
            <td></td>
            <td></td>
            <td></td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "12px" }}>
            <td colSpan={2} style={{ borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>
              Printed Name :
            </td>
            <td style={{ fontSize: "8.5pt", padding: "2px 4px" }}>
              <input type="text" value={formData.req_name} onChange={e => setFormData({ ...formData, req_name: e.target.value })} className={editableInputCls} placeholder="Full name" />
            </td>
            <td colSpan={2} style={{ fontSize: "8.5pt", padding: "2px 4px" }}>
              <input type="text" value={formData.app_name} onChange={e => setFormData({ ...formData, app_name: e.target.value })} className={editableInputCls} placeholder="Full name" />
            </td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "14.75px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>
              Designation :
            </td>
            <td style={{ borderBottom: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>
              <input type="text" value={formData.req_desig} onChange={e => setFormData({ ...formData, req_desig: e.target.value })} className={editableInputCls} placeholder="Designation" />
            </td>
            <td colSpan={2} style={{ borderBottom: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>
              <input type="text" value={formData.app_desig} onChange={e => setFormData({ ...formData, app_desig: e.target.value })} className={editableInputCls} placeholder="Designation" />
            </td>
            <td style={{ borderBottom: "1px solid black", borderRight: "1px solid black" }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
