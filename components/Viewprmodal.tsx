"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { buildPRPrintHtml } from "@/utils/print/PRPrintBuilder";
import { printWithIframe } from "@/utils/print/printUtils";
import {
  RiCloseLine,
  RiFilePdf2Line,
  RiEditLine,
  RiDeleteBinLine,
} from "react-icons/ri";
import { RichEditor } from "@/components/RichEditor";

type ItemDataType = {
  uiId: string;
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

const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300";

function emptyItem(): ItemDataType {
  return {
    uiId: crypto.randomUUID(),
    stock_no: "",
    unit: "",
    description: "",
    quantity: "",
    unit_price: "",
    subtotal: "",
    created_at: new Date().toISOString(),
  };
}

function createTableItem(): ItemDataType {
  return emptyItem();
}

function padItems(items: ItemDataType[], minRows: number): ItemDataType[] {
  const nextItems = [...items];
  while (nextItems.length < minRows) {
    nextItems.push(createTableItem());
  }
  return nextItems;
}

function isEmptyItem(item: ItemDataType): boolean {
  return (
    item.stock_no.trim() === "" &&
    item.unit.trim() === "" &&
    item.description.trim() === "" &&
    item.quantity.trim() === "" &&
    item.unit_price.trim() === ""
  );
}

function getItemTotal(item: ItemDataType): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
}

function getGrandTotal(items: ItemDataType[]): number {
  return items.reduce((sum, item) => sum + getItemTotal(item), 0);
}

function PRPreview({
  formData,
  items,
  onItemChange,
  onRemoveItem,
  onAddItem,
}: {
  formData: any;
  items: ItemDataType[];
  onItemChange: (uiId: string, field: keyof ItemDataType, value: string) => void;
  onRemoveItem: (uiId: string) => void;
  onAddItem: () => void;
}) {
  const grandTotal = getGrandTotal(items);
  const editableInputCls =
    "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] whitespace-pre-wrap break-words resize-none overflow-hidden";
  const editableInputCenterCls = `${editableInputCls} text-center`;
  const editableInputRightCls = `${editableInputCls} text-right`;

  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

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
          {items.map((item) => (
            <tr key={item.uiId} style={{ height: "16px" }}>
              <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                <textarea
                  value={item.stock_no}
                  onChange={(e) => onItemChange(item.uiId, "stock_no", e.target.value)}
                  onInput={autoResize}
                  className={editableInputCenterCls}
                  style={{ width: "95%", minHeight: "16px" }}
                  rows={1}
                />
              </td>
              <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                <textarea
                  value={item.unit}
                  onChange={(e) => onItemChange(item.uiId, "unit", e.target.value)}
                  onInput={autoResize}
                  className={editableInputCenterCls}
                  style={{ width: "95%", minHeight: "16px" }}
                  rows={1}
                />
              </td>
              <td style={{ ...tdStyle, textAlign: "left", padding: "1px 4px", verticalAlign: "top" }}>
                <RichEditor
                  value={item.description}
                  onChange={(html) => onItemChange(item.uiId, "description", html)}
                  compact
                  className={editableInputCls}
                  style={{ width: "95%", fontFamily: "'Times New Roman', Times, serif" }}
                />
              </td>
              <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                <textarea
                  value={item.quantity}
                  onChange={(e) => onItemChange(item.uiId, "quantity", e.target.value)}
                  onInput={autoResize}
                  className={editableInputCenterCls}
                  style={{ width: "95%", minHeight: "16px" }}
                  rows={1}
                />
              </td>
              <td style={{ ...tdStyle, textAlign: "right", verticalAlign: "top" }}>
                <textarea
                  value={item.unit_price}
                  onChange={(e) => onItemChange(item.uiId, "unit_price", e.target.value)}
                  onInput={autoResize}
                  className={editableInputRightCls}
                  style={{ width: "95%", minHeight: "16px" }}
                  rows={1}
                />
              </td>
              <td style={{ ...tdStyle, textAlign: "right", position: "relative", verticalAlign: "top" }}>
                {getItemTotal(item) > 0 ? "₱" + getItemTotal(item).toFixed(2) : ""}
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.uiId)}
                  className="absolute right-1 top-1 text-red-500 hover:text-red-700 text-[10px]"
                  title="Remove row"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} style={{ border: "1px solid #111", padding: "4px", textAlign: "center" }}>
              <button
                type="button"
                onClick={onAddItem}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
              >
                + Add Item
              </button>
            </td>
          </tr>
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

function downloadPDF(
  formData: any,
  items: Array<Omit<ItemDataType, "uiId">>,
  currentUserFullname?: string,
  currentUserId?: number | null,
  prId?: number,
) {
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

  const updateItem = (uiId: string, field: keyof ItemDataType, value: string) => {
    setItems((currentItems) => {
      const nextItems = currentItems.map((item) => (item.uiId === uiId ? { ...item, [field]: value } : item));
      return nextItems;
    });
  };

  const addItem = () => {
    setItems((currentItems) => [...currentItems, createTableItem()]);
  };

  const removeItem = (uiId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.uiId !== uiId));
  };

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
            uiId: crypto.randomUUID(),
            stock_no:   i.stock_no    || "",
            unit:       i.unit        || "",
            description: i.description || "",
            quantity:   String(i.quantity   ?? ""),
            unit_price: String(i.unit_price ?? ""),
            subtotal:   String(i.subtotal   ?? ""),
            created_at: i.created_at  || new Date().toISOString(),
          }));
        setItems(padItems(mappedItems, 20));
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
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-600 to-emerald-700 px-8 py-5 flex items-center justify-between text-white">
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
            {/* Download PDF */}
            <button
              onClick={() => downloadPDF(
                { ...formData, entity_name: editablePREntityName, purpose: editablePRPurpose },
                items.map(({ uiId, ...item }) => item),
                currentUserFullname, currentUserId, prId
              )}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-semibold"
            >
              <RiFilePdf2Line size={18} /> Download PDF
            </button>
            <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-gray-100 flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
              </div>
              <div id="pr-preview-content" className="bg-white rounded-lg shadow-lg p-8 text-black">
                <PRPreview
                  formData={{ ...formData, entity_name: editablePREntityName, purpose: editablePRPurpose }}
                  items={items}
                  onItemChange={updateItem}
                  onRemoveItem={removeItem}
                  onAddItem={addItem}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}