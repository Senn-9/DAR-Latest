"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiFilePdf2Line,
  RiSaveLine,
  RiAddLine,
} from "react-icons/ri";

type ItemDataType = {
  stock_num: string;
  unit: string;
  description: string;
  quantity: string;
  unit_cost: string;
  total_cost: string;
  created_at: string;
  division: string;
};

type CurrentUser = {
  fullname: string;
  username: string;
  role_id: number;
  division_id?: number;
  divisions?: { division_name: string };
  roles?: { role_name: string };
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

const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300";

function emptyItem(): ItemDataType {
  return {
    stock_num: "",
    unit: "",
    description: "",
    quantity: "",
    unit_cost: "",
    total_cost: "",
    division: "",
    created_at: new Date().toISOString(),
  };
}

function getItemTotal(item: ItemDataType): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);
}

function getGrandTotal(items: ItemDataType[]): number {
  return items.reduce((sum, item) => sum + getItemTotal(item), 0);
}

function PRPreview({ formData, items }: { formData: any; items: ItemDataType[] }) {
  const itemRows = [...items];
  while (itemRows.length < 30) {
    itemRows.push(emptyItem());
  }

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
          <tr style={{ height: "34px" }}>
            <td colSpan={6} style={{ textAlign: "center", fontWeight: "bold", fontSize: "12pt", color: "#000" }}>
              PURCHASE REQUEST
            </td>
          </tr>
          <tr style={{ height: "21px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", fontSize: "8pt", padding: "2px 4px", fontWeight: "bold", color: "#000" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "nowrap" }}>
                <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>Entity Name:</span>
                <span
                  style={{
                    fontWeight: "normal",
                    borderBottom: "1px solid #000",
                    paddingBottom: "1px",
                    whiteSpace: "nowrap",
                    minWidth: "140px",
                    flexShrink: 0,
                  }}
                >
                  {formData.entity_name}
                </span>
              </div>
            </td>
            <td style={{ borderBottom: "1px solid black" }}></td>
            <td colSpan={3} style={{ borderBottom: "1px solid black", fontSize: "8pt", padding: "2px 4px", fontWeight: "bold", color: "#000" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "nowrap" }}>
                <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>Fund Cluster:</span>
                <span
                  style={{
                    fontWeight: "normal",
                    borderBottom: "1px solid #000",
                    paddingBottom: "1px",
                    whiteSpace: "nowrap",
                    minWidth: "100px",
                    flexShrink: 0,
                  }}
                >
                  {formData.fund_cluster}
                </span>
              </div>
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
              Date:
              <br />
              <span style={{ fontWeight: "normal" }}>{formData.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}</span>
            </td>
          </tr>
          <tr style={{ height: "15px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", fontSize: "8pt", fontWeight: "bold", padding: "2px 4px", color: "#000" }}>
              Responsibility Center Code : <span style={{ fontWeight: "normal" }}>{formData.resp_code}</span>
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
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.stock_num}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.unit}</td>
                <td style={{ ...tdStyle, textAlign: "left", padding: "1px 4px" }}>{item.description}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.quantity}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{item.unit_cost ? parseFloat(item.unit_cost).toFixed(2) : ""}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{total > 0 ? total.toFixed(2) : ""}</td>
              </tr>
            );
          })}
          <tr style={{ height: "17px" }}>
            <td colSpan={6} style={{ borderTop: "1px solid black", borderLeft: "1px solid black", borderRight: "1px solid black", fontSize: "8.5pt", padding: "2px 4px", color: "#000" }}>
              <b>Purpose:</b> {formData.purpose}
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
            <td style={{ fontSize: "8.5pt", padding: "2px 4px" }}>{formData.req_name}</td>
            <td colSpan={2} style={{ fontSize: "8.5pt", padding: "2px 4px" }}>{formData.app_name}</td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>
          <tr style={{ height: "14.75px" }}>
            <td colSpan={2} style={{ borderBottom: "1px solid black", borderLeft: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>
              Designation :
            </td>
            <td style={{ borderBottom: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>{formData.req_desig}</td>
            <td colSpan={2} style={{ borderBottom: "1px solid black", fontSize: "8.5pt", padding: "2px 4px" }}>{formData.app_desig}</td>
            <td style={{ borderBottom: "1px solid black", borderRight: "1px solid black" }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function downloadPDF(formData: any, items: ItemDataType[]) {
  const element = document.createElement("div");
  element.innerHTML = `
    <div style="font-family:'Times New Roman',serif;font-size:10pt;padding:20px">
      <div style="text-align:right;font-weight:bold;margin-bottom:10px">Appendix 60</div>
    </div>
  `;
  const printWindow = window.open("", "", "height=800,width=1200");
  if (printWindow) {
    printWindow.document.write(element.innerHTML);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }
}

// Helper to check if user is an end user (no special roles)
function checkIsEndUser(user: CurrentUser | null): boolean {
  if (!user) return false;
  const roleName = user.roles?.role_name?.toLowerCase() || "";
  const username = user.username?.toLowerCase() || "";
  // End user has no special role
  const isSpecialRole =
    roleName.includes("admin") ||
    roleName.includes("division head") ||
    roleName.includes("bac") ||
    roleName.includes("parpo") ||
    roleName.includes("budget") ||
    roleName.includes("supply") ||
    username === "admin" ||
    username === "bac" ||
    username === "parpo" ||
    username === "budget" ||
    username === "supply";
  return !isSpecialRole;
}

interface PRModalComponentProps {
  onSave?: () => void;
}

export default function PRModalComponent({ onSave }: PRModalComponentProps) {
  const supabase = createClient();
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    entity_name: "DAR CAMSUR 1",  // ← default value
    fund_cluster: "",
    office_section: "",
    resp_code: "",
    purpose: "",
    req_name: "",
    req_desig: "",
    app_name: "",
    app_desig: "",
    created_at: new Date().toISOString().slice(0, 10),
  });

  const [items, setItems] = useState<ItemDataType[]>([emptyItem()]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"form" | "preview">("form");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Check if current user is an end user
  const isEndUser = checkIsEndUser(currentUser);

  useEffect(() => {
    if (modalOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as CurrentUser;
        setCurrentUser(user);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser?.divisions?.division_name) {
      setFormData((prev) => ({
        ...prev,
        office_section: currentUser.divisions!.division_name,
      }));
    }
  }, [currentUser]);

  const addItem = () => {
    setItems([...items, emptyItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ItemDataType, value: string) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const grandTotal = getGrandTotal(items);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Auto-generate PR number like CreatePRModal does
      const prNo = `PR-DRAFT-${Date.now().toString(36).toUpperCase()}`;

      const formDataWithStatus = {
        entity_name: formData.entity_name,
        fund_cluster: formData.fund_cluster,
        office_section: formData.office_section,
        pr_no: prNo,
        resp_code: formData.resp_code,
        purpose: formData.purpose,
        req_name: formData.req_name,
        req_desig: formData.req_desig,
        app_name: formData.app_name,
        app_desig: formData.app_desig,
        created_at: new Date().toISOString(),
        status_id: 1,
        status: "Pending",
        total_cost: Math.round(grandTotal),
        division_id: currentUser?.division_id ?? null,
      };

      const { data: formResult, error: formError } = await supabase
        .from("purchase_requests")
        .insert([formDataWithStatus])
        .select()
        .single();

      if (formError) {
        alert("❌ Error saving PR Form: " + formError.message);
        setLoading(false);
        return;
      }

      const itemsToInsert = items
        .filter((item) => item.description.trim() !== "")
        .map((item) => ({
          pr_id: formResult.id,
          stock_no: item.stock_num || "",
          unit: item.unit || "",
          description: item.description,
          quantity: parseInt(item.quantity) || 0,
          unit_price: parseInt(item.unit_cost) || 0,
          subtotal: Math.round(getItemTotal(item)),
        }));

      console.log("Form Result PR_ID:", formResult.id);
      console.log("Items to insert:", itemsToInsert);

      if (itemsToInsert.length === 0) {
        alert("⚠️ No items with descriptions to save. PR Form saved but no items added.");
        resetForm();
        setModalOpen(false);
        if (onSave) onSave();
        return;
      }

      const { data: itemData, error: itemError } = await supabase
        .from("purchase_request_items")
        .insert(itemsToInsert)
        .select();

      console.log("Item insert response:", { itemData, itemError });

      if (itemError) {
        alert("⚠️ PR Form saved but error saving items: " + itemError.message);
        console.error("Item insert error details:", itemError);
      } else {
        alert("✅ PR saved successfully!");
        resetForm();
        setModalOpen(false);
        if (onSave) onSave();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      alert("❌ Error: " + errorMsg);
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entity_name: "DAR CAMSUR 1",  // ← reset also restores the default
      fund_cluster: "",
      office_section: currentUser?.divisions?.division_name || "",
      resp_code: "",
      purpose: "",
      req_name: "",
      req_desig: "",
      app_name: "",
      app_desig: "",
      created_at: new Date().toISOString().slice(0, 10),
    });
    setItems([emptyItem()]);
    setTab("form");
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  return (
    <>
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
              <div>
                <h2 className="text-xl font-bold">New Purchase Request</h2>
                <p className="text-emerald-100 text-sm mt-1">Appendix 60 · Official Government Form</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-white/20 rounded-lg overflow-hidden border border-white/30 backdrop-blur">
                  <button
                    onClick={() => setTab("form")}
                    className={`px-5 py-2 text-sm font-semibold transition-all ${
                      tab === "form" ? "bg-white text-emerald-700" : "text-white hover:bg-white/10"
                    }`}
                  >
                    Form
                  </button>
                  <button
                    onClick={() => setTab("preview")}
                    className={`px-5 py-2 text-sm font-semibold transition-all ${
                      tab === "preview" ? "bg-white text-emerald-700" : "text-white hover:bg-white/10"
                    }`}
                  >
                    Preview
                  </button>
                </div>
                <button onClick={handleClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
                  <RiCloseLine size={24} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Form Side */}
              <div className={`${tab === "form" ? "flex" : "hidden"} md:flex flex-[2] flex-col overflow-hidden border-r border-gray-200`}>
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
                  {/* Header Information */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Header Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Entity Name</label>
                        <input
                          className={inputCls}
                          placeholder="e.g. DAR CAMSUR 1"
                          value={formData.entity_name}
                          onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Fund Cluster</label>
                          <input className={inputCls} placeholder="e.g. 01" value={formData.fund_cluster} onChange={(e) => setFormData({ ...formData, fund_cluster: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PR Number</label>
                          <input className={`${inputCls} bg-gray-100 text-gray-500 cursor-not-allowed`} value="Pending BAC assignment" readOnly disabled title="PR number will be assigned by BAC" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Office / Section</label>
                          <input className={inputCls} placeholder="Procurement" value={formData.office_section} readOnly />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Date *</label>
                          <input className={inputCls} type="date" value={formData.created_at} onChange={(e) => setFormData({ ...formData, created_at: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Responsibility Center Code</label>
                        <input className={inputCls} placeholder="e.g. 10001" value={formData.resp_code} onChange={(e) => setFormData({ ...formData, resp_code: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Items</h3>
                      <button onClick={addItem} className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold px-3 py-1.5 border border-dashed border-emerald-300 rounded hover:bg-emerald-50 transition-colors">
                        <RiAddLine size={14} /> Add Item Row
                      </button>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {items.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                          {items.length > 1 && (
                            <button onClick={() => removeItem(index)} className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-lg font-bold">
                              ×
                            </button>
                          )}
                          <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Item {index + 1}</div>
                          <div className="mb-2">
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Item Description</label>
                            <input className={inputCls} placeholder="Describe the item" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Stock/Prop No.</label>
                              <input className={inputCls} placeholder="—" value={item.stock_num} onChange={(e) => updateItem(index, "stock_num", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit</label>
                              <input className={inputCls} placeholder="pcs" value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Qty</label>
                              <input className={inputCls} placeholder="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit Cost</label>
                              <input className={inputCls} placeholder="0.00" value={item.unit_cost} onChange={(e) => updateItem(index, "unit_cost", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Total Cost</label>
                              <input className={`${inputCls} bg-emerald-50 font-bold text-emerald-700`} value={getItemTotal(item).toFixed(2)} readOnly />
                            </div>
                          </div>
                        </div>
                      ))}
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
                        <input className={inputCls} placeholder="Full name" value={formData.req_name} onChange={(e) => setFormData({ ...formData, req_name: e.target.value })} />
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2 mt-3">Designation</label>
                        <input className={inputCls} placeholder="Position/Title" value={formData.req_desig} onChange={(e) => setFormData({ ...formData, req_desig: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Approved By</label>
                        <input className={inputCls} placeholder="Full name" value={formData.app_name} onChange={(e) => setFormData({ ...formData, app_name: e.target.value })} />
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-2 mt-3">Designation</label>
                        <input className={inputCls} placeholder="Position/Title" value={formData.app_desig} onChange={(e) => setFormData({ ...formData, app_desig: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Purpose</h3>
                    <textarea className={`${inputCls} resize-none`} rows={2} placeholder="State the purpose of this request..." value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                  <button onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors">
                    <RiSaveLine size={18} /> {loading ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => downloadPDF(formData, items)} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">
                    <RiFilePdf2Line size={18} /> PDF
                  </button>
                </div>
              </div>

              {/* Preview Side */}
              <div className={`${tab === "preview" ? "flex" : "hidden"} md:flex flex-[3] overflow-y-auto bg-gray-100 flex-col`}>
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
                    <button onClick={() => downloadPDF(formData, items)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors">
                      <RiFilePdf2Line size={16} /> PDF
                    </button>
                  </div>
                  <div className="bg-white rounded-lg shadow-lg p-8 text-black">
                    <PRPreview formData={formData} items={items} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Button - Only visible to End Users */}
      {isEndUser && (
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-lg font-bold text-base transition-colors"
        >
          <RiAddLine size={20} /> Create PR
        </button>
      )}
    </>
  );
}