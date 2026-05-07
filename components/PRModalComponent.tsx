"use client";

import React, { useEffect, useState } from "react";
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

// Type for text-only lines in the PR (for printing only)
// Each field corresponds to a column like regular PR items
type TextOnlyLine = {
  id: string; // unique identifier for React key
  position: number; // position after which this line appears (1-based index after item)
  stock_num: string;
  unit: string;
  description: string;
  quantity: string;
  unit_cost: string;
};

type CurrentUser = {
  id: number | null | undefined;
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

function PREditablePreview({
  formData,
  setFormData,
  items,
  addItem,
  updateItem,
  removeItem,
  textOnlyLines = [],
  addTextOnlyLine,
  updateTextOnlyLine,
  removeTextOnlyLine
}: {
  formData: any;
  setFormData: (data: any) => void;
  items: ItemDataType[];
  addItem: () => void;
  updateItem: (index: number, field: keyof ItemDataType, value: string) => void;
  removeItem: (index: number) => void;
  textOnlyLines?: TextOnlyLine[];
  addTextOnlyLine: (afterIndex: number) => void;
  updateTextOnlyLine: (id: string, field: keyof Omit<TextOnlyLine, 'id' | 'position'>, value: string) => void;
  removeTextOnlyLine: (id: string) => void;
}) {
  const editableInputCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] whitespace-pre-wrap break-words resize-none overflow-hidden";
  const editableInputCenterCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-center whitespace-pre-wrap break-words resize-none overflow-hidden";
  const editableInputRightCls = "border-b border-gray-400 bg-transparent px-1 py-0 text-inherit font-inherit focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-colors w-[90%] text-[8.5pt] text-right whitespace-pre-wrap break-words resize-none overflow-hidden";

  // Auto-resize handler for textareas
  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  // Text-only lines feature commented out
  // const rows: (ItemDataType | TextOnlyLine & { isTextLine?: boolean })[] = [];
  // items.forEach((item, index) => {
  //   rows.push(item);
  //   const linesAfterThisItem = textOnlyLines.filter(line => line.position === index + 1);
  //   linesAfterThisItem.forEach(line => {
  //     rows.push({ ...line, isTextLine: true });
  //   });
  // });
  const rows = items;
  
  while (rows.length < 30) {
    rows.push(emptyItem());
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
              Entity Name: <input type="text" value={formData.entity_name} onChange={e => setFormData({ ...formData, entity_name: e.target.value })} className={editableInputCls} style={{ fontWeight: "normal", width: "60%" }} />
            </td>
            <td style={{ borderBottom: "1px solid black" }}></td>
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
              PR No.: <span style={{ fontWeight: "normal" }}>{formData.pr_no}</span>
            </td>
            <td rowSpan={2} colSpan={2} style={{ border: "1px solid black", fontSize: "8pt", fontWeight: "bold", verticalAlign: "top", padding: "2px 4px", color: "#000" }}>
              Date:
              <br />
              <input type="date" value={formData.created_at} onChange={e => setFormData({ ...formData, created_at: e.target.value })} className={editableInputCls} style={{ fontWeight: "normal", width: "90%" }} />
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
          {/* Text-only lines feature commented out */}
          {rows.map((item, idx) => {
            const originalItemIndex = items.indexOf(item);
            const isPadding = originalItemIndex === -1 || originalItemIndex >= items.length;
            
            if (isPadding) {
              return (
                <tr key={`item-pad-${idx}`}>
                  <td style={{ ...tdStyle }}></td>
                  <td style={{ ...tdStyle }}></td>
                  <td style={{ ...tdStyle }}></td>
                  <td style={{ ...tdStyle }}></td>
                  <td style={{ ...tdStyle }}></td>
                  <td style={{ ...tdStyle }}></td>
                </tr>
              );
            }

            const total = getItemTotal(item);
            return (
              <React.Fragment key={`item-frag-${originalItemIndex}`}>
                <tr>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                    <textarea value={item.stock_num} onChange={e => updateItem(originalItemIndex, 'stock_num', e.target.value)} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                    <textarea value={item.unit} onChange={e => updateItem(originalItemIndex, 'unit', e.target.value)} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "left", padding: "1px 4px", verticalAlign: "top" }}>
                    <textarea value={item.description} onChange={e => updateItem(originalItemIndex, 'description', e.target.value)} onInput={autoResize} className={editableInputCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                    <textarea value={item.quantity} onChange={e => updateItem(originalItemIndex, 'quantity', e.target.value)} onInput={autoResize} className={editableInputCenterCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", verticalAlign: "top" }}>
                    <textarea value={item.unit_cost} onChange={e => updateItem(originalItemIndex, 'unit_cost', e.target.value)} onInput={autoResize} className={editableInputRightCls} style={{ width: "95%", minHeight: "16px" }} rows={1} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", position: "relative", verticalAlign: "top" }}>
                    {total > 0 ? total.toFixed(2) : ""}
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(originalItemIndex)} className="absolute right-1 top-1 text-red-500 hover:text-red-700 text-[10px]" title="Remove item">×</button>
                    )}
                  </td>
                </tr>
                {/* <tr style={{ height: "auto" }}>
                  <td colSpan={6} style={{ border: "none", padding: "1px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => addTextOnlyLine(originalItemIndex + 1)}
                      className="text-gray-400 hover:text-emerald-600 text-[10px] italic transition-colors"
                      title="Insert text-only line after this item"
                    >
                      + insert text line
                    </button>
                  </td>
                </tr> */}
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
function downloadPDF(formData: any, items: ItemDataType[], currentUser?: CurrentUser | null) {
  // Post remark if currentUser is available
  if (currentUser?.fullname) {
    postPrintRemark(currentUser.fullname, 'PR', currentUser.id);
  }
  
  const printWindow = window.open("", "", "height=800,width=1200");
  if (!printWindow) return;

  // Build item rows HTML
  const itemRows: string[] = [];
  items.forEach((item) => {
    const total = getItemTotal(item);
    itemRows.push(`
      <tr style="height: 16px;">
        <td style="border: 1px solid black; text-align: center; font-size: 8pt;">${escapeHtml(item.stock_num)}</td>
        <td style="border: 1px solid black; text-align: center; font-size: 8pt;">${escapeHtml(item.unit)}</td>
        <td style="border: 1px solid black; text-align: left; font-size: 8pt; padding: 1px 4px;">${escapeHtml(item.description)}</td>
        <td style="border: 1px solid black; text-align: center; font-size: 8pt;">${escapeHtml(item.quantity)}</td>
        <td style="border: 1px solid black; text-align: right; font-size: 8pt;">${item.unit_cost ? parseFloat(item.unit_cost).toFixed(2) : ""}</td>
        <td style="border: 1px solid black; text-align: right; font-size: 8pt;">${total > 0 ? total.toFixed(2) : ""}</td>
      </tr>
    `);
  });

  // Pad to 30 rows
  while (itemRows.length < 30) {
    itemRows.push(`
      <tr style="height: 16px;">
        <td style="border: 1px solid black;"></td>
        <td style="border: 1px solid black;"></td>
        <td style="border: 1px solid black;"></td>
        <td style="border: 1px solid black;"></td>
        <td style="border: 1px solid black;"></td>
        <td style="border: 1px solid black;"></td>
      </tr>
    `);
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Purchase Request - ${escapeHtml(formData.pr_no || 'Draft')}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #000; padding: 20px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid black; font-size: 8pt; padding: 1px 3px; font-family: 'Times New Roman', Times, serif; }
      </style>
    </head>
    <body>
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 9pt; color: #000;">
        <table style="width: 100%; border-collapse: collapse; color: #000; table-layout: fixed;">
          <colgroup>
            <col style="width: 12%" />
            <col style="width: 8%" />
            <col style="width: 40%" />
            <col style="width: 10%" />
            <col style="width: 15%" />
            <col style="width: 15%" />
          </colgroup>
          <tbody>
            <tr style="height: 27px;">
              <td colspan="6" style="text-align: right; font-size: 10pt; padding-right: 4px; color: #000;">Appendix 60</td>
            </tr>
            <tr style="height: 34px;">
              <td colspan="6" style="text-align: center; font-weight: bold; font-size: 12pt; color: #000;">PURCHASE REQUEST</td>
            </tr>
            <tr style="height: 21px;">
              <td colspan="2" style="border-bottom: 1px solid black; font-size: 8pt; padding: 2px 4px; font-weight: bold; color: #000;">
                Entity Name: <span style="font-weight: normal;">${escapeHtml(formData.entity_name)}</span>
              </td>
              <td style="border-bottom: 1px solid black;"></td>
              <td colspan="3" style="border-bottom: 1px solid black; font-size: 8pt; padding: 2px 4px; font-weight: bold; color: #000;">
                Fund Cluster: <span style="font-weight: normal;">${escapeHtml(formData.fund_cluster)}</span>
              </td>
            </tr>
            <tr style="height: 14px;">
              <td rowspan="2" colspan="2" style="border: 1px solid black; font-size: 8pt; vertical-align: top; padding: 2px 4px; color: #000;">
                Office/Section:<br/>${escapeHtml(formData.office_section)}
              </td>
              <td colspan="2" style="border-top: 1px solid black; border-left: 1px solid black; border-right: 1px solid black; font-size: 8pt; font-weight: bold; padding: 2px 4px; color: #000;">
                PR No.: <span style="font-weight: normal;">${escapeHtml(formData.pr_no)}</span>
              </td>
              <td rowspan="2" colspan="2" style="border: 1px solid black; font-size: 8pt; font-weight: bold; vertical-align: top; padding: 2px 4px; color: #000;">
                Date:<br/><span style="font-weight: normal;">${formData.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}</span>
              </td>
            </tr>
            <tr style="height: 15px;">
              <td colspan="2" style="border-bottom: 1px solid black; border-left: 1px solid black; font-size: 8pt; font-weight: bold; padding: 2px 4px; color: #000;">
                Responsibility Center Code: <span style="font-weight: normal;">${escapeHtml(formData.resp_code)}</span>
              </td>
            </tr>
            <tr style="height: 22.5px;">
              <th style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 8pt; padding: 1px 3px;">Stock/<br/>Property No.</th>
              <th style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 8pt; padding: 1px 3px;">Unit</th>
              <th style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 8pt; padding: 1px 3px;">Item Description</th>
              <th style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 8pt; padding: 1px 3px;">Quantity</th>
              <th style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 8pt; padding: 1px 3px;">Unit Cost</th>
              <th style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 8pt; padding: 1px 3px;">Total Cost</th>
            </tr>
            ${itemRows.join('')}
            <tr style="height: 40px;">
              <td colspan="6" style="border: 1px solid black; font-size: 8.5pt; padding: 4px; color: #000; vertical-align: top;">
                <b>Purpose:</b> ${escapeHtml(formData.purpose)}
              </td>
            </tr>
            <tr style="height: 25px;">
              <td style="border-left: 1px solid black;"></td>
              <td colspan="2" style="border-bottom: 1px solid black; font-size: 8.5pt; text-align: center; vertical-align: bottom; padding-bottom: 2px;"><i>Requested by:</i></td>
              <td colspan="2" style="border-bottom: 1px solid black; font-size: 8.5pt; text-align: center; vertical-align: bottom; padding-bottom: 2px;"><i>Approved by:</i></td>
              <td style="border-right: 1px solid black;"></td>
            </tr>
            <tr style="height: 20px;">
              <td colspan="2" style="border-left: 1px solid black; font-size: 8.5pt; padding: 2px 4px; vertical-align: bottom;">Signature :</td>
              <td colspan="2" style="font-size: 8.5pt; text-align: center; vertical-align: bottom;"></td>
              <td colspan="2" style="border-right: 1px solid black; font-size: 8.5pt; text-align: center; vertical-align: bottom;"></td>
            </tr>
            <tr style="height: 20px;">
              <td colspan="2" style="border-left: 1px solid black; font-size: 8.5pt; padding: 2px 4px; vertical-align: bottom;">Printed Name :</td>
              <td colspan="2" style="font-size: 8.5pt; text-align: center; vertical-align: bottom;">${escapeHtml(formData.req_name)}</td>
              <td colspan="2" style="border-right: 1px solid black; font-size: 8.5pt; text-align: center; vertical-align: bottom;">${escapeHtml(formData.app_name)}</td>
            </tr>
            <tr style="height: 20px;">
              <td colspan="2" style="border-bottom: 1px solid black; border-left: 1px solid black; font-size: 8.5pt; padding: 2px 4px; vertical-align: bottom;">Designation :</td>
              <td colspan="2" style="border-bottom: 1px solid black; font-size: 8.5pt; text-align: center; vertical-align: bottom;">${escapeHtml(formData.req_desig)}</td>
              <td colspan="2" style="border-bottom: 1px solid black; border-right: 1px solid black; font-size: 8.5pt; text-align: center; vertical-align: bottom;">${escapeHtml(formData.app_desig)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
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

// Helper function to post print remark
async function postPrintRemark(fullname: string, documentType: 'PR' | 'PO' | 'ORS', userId?: number | null) {
  try {
    const supabase = createClient();
    const remarkText = `[PRINT] ${fullname} downloaded/printed a draft ${documentType} document`;
    
    // Insert into remarks table
    await supabase.from('remarks').insert({
      remark: remarkText,
      user_id: userId || null,
      phase: 'pr',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to post print remark:', error);
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
  const [textOnlyLines, setTextOnlyLines] = useState<TextOnlyLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"form" | "preview">("form");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Helper functions for text-only lines
  function addTextOnlyLine(afterIndex: number) {
    const newLine: TextOnlyLine = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: afterIndex,
      stock_num: "",
      unit: "",
      description: "",
      quantity: "",
      unit_cost: "",
    };
    setTextOnlyLines((prev) => [...prev, newLine]);
  }

  function updateTextOnlyLine(id: string, field: keyof Omit<TextOnlyLine, 'id' | 'position'>, value: string) {
    setTextOnlyLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  }

  function removeTextOnlyLine(id: string) {
    setTextOnlyLines((prev) => prev.filter((line) => line.id !== id));
  }

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

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const updatedItems = [...items];
      [updatedItems[index - 1], updatedItems[index]] = [updatedItems[index], updatedItems[index - 1]];
      setItems(updatedItems);
    } else if (direction === 'down' && index < items.length - 1) {
      const updatedItems = [...items];
      [updatedItems[index], updatedItems[index + 1]] = [updatedItems[index + 1], updatedItems[index]];
      setItems(updatedItems);
    }
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
          quantity: item.quantity.trim() === "" ? null : parseInt(item.quantity),
          unit_price: item.unit_cost.trim() === "" ? null : parseInt(item.unit_cost),
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
                        <React.Fragment key={`item-frag-${index}`}>
                          {/* Regular Item */}
                          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                            <div className="absolute top-2 right-2 flex gap-1">
                              {index > 0 && (
                                <button
                                  onClick={() => moveItem(index, 'up')}
                                  className="text-gray-400 hover:text-emerald-600 text-sm p-1"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                              )}
                              {index < items.length - 1 && (
                                <button
                                  onClick={() => moveItem(index, 'down')}
                                  className="text-gray-400 hover:text-emerald-600 text-sm p-1"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                              )}
                              {items.length > 1 && (
                                <button onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800 text-lg font-bold ml-1">
                                  ×
                                </button>
                              )}
                            </div>
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

                          {/* Text-only lines feature commented out */}
                          {/* {textOnlyLines
                            .filter((line) => line.position === index + 1)
                            .map((line) => (
                              <div key={`text-${line.id}`} className="border border-gray-200 rounded-lg p-3 bg-yellow-50/50 relative">
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button
                                    onClick={() => removeTextOnlyLine(line.id)}
                                    className="text-red-600 hover:text-red-800 text-lg font-bold"
                                    title="Remove text line"
                                  >
                                    ×
                                  </button>
                                </div>
                                <div className="text-xs font-bold text-gray-500 mb-2 uppercase italic">Text Line</div>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Stock/Prop No.</label>
                                    <input
                                      className={`${inputCls} italic text-gray-600`}
                                      placeholder="Stock No."
                                      value={line.stock_num}
                                      onChange={(e) => updateTextOnlyLine(line.id, 'stock_num', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit</label>
                                    <input
                                      className={`${inputCls} italic text-gray-600`}
                                      placeholder="Unit"
                                      value={line.unit}
                                      onChange={(e) => updateTextOnlyLine(line.id, 'unit', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Qty</label>
                                    <input
                                      className={`${inputCls} italic text-gray-600`}
                                      placeholder="Qty"
                                      value={line.quantity}
                                      onChange={(e) => updateTextOnlyLine(line.id, 'quantity', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="mb-2">
                                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Description</label>
                                  <input
                                    className={`${inputCls} italic text-gray-600`}
                                    placeholder="Description (for printing only)"
                                    value={line.description}
                                    onChange={(e) => updateTextOnlyLine(line.id, 'description', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Unit Cost</label>
                                  <input
                                    className={`${inputCls} italic text-gray-600`}
                                    placeholder="Unit Cost"
                                    value={line.unit_cost}
                                    onChange={(e) => updateTextOnlyLine(line.id, 'unit_cost', e.target.value)}
                                  />
                                </div>
                              </div>
                            ))}

                          <div className="flex justify-center">
                            <button
                              onClick={() => addTextOnlyLine(index + 1)}
                              className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                            >
                              <RiAddLine size={12} /> + Add text-only line
                            </button>
                          </div> */}
                        </React.Fragment>
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
                  <button onClick={() => downloadPDF(formData, items, currentUser)} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">
                    <RiFilePdf2Line size={18} /> PDF
                  </button>
                </div>
              </div>

              {/* Preview Side */}
              <div className={`${tab === "preview" ? "flex" : "hidden"} md:flex flex-[3] overflow-y-auto bg-gray-100 flex-col`}>
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
                    <button onClick={() => downloadPDF(formData, items, currentUser)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors">
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
                      textOnlyLines={textOnlyLines}
                      addTextOnlyLine={addTextOnlyLine}
                      updateTextOnlyLine={updateTextOnlyLine}
                      removeTextOnlyLine={removeTextOnlyLine}
                    />
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