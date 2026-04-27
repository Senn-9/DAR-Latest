"use client";

import { useState, useEffect } from "react";
import { RiCloseLine, RiEyeLine, RiArrowLeftLine, RiArrowRightLine, RiCheckLine } from "react-icons/ri";
import { FlagButton, StatusFlagPicker, type StatusFlag, getFlagId } from "../StatusFlagPicker";

// Read-only input style for preview
const readonlyCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 cursor-default select-text outline-none";

// JSX Preview Components
function IARPreview({ delivery, iar }: { delivery: any; iar: any }) {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineHeight: "1.25", color: "#111" }}>
      <div style={{ textAlign: "right", fontSize: "9pt", marginBottom: "2mm" }}>Appendix 62</div>
      <div style={{ textAlign: "center", fontSize: "14pt", fontWeight: 700, letterSpacing: "0.3px", marginBottom: "2mm" }}>INSPECTION AND ACCEPTANCE REPORT</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Entity Name : {delivery?.entity_name ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Fund Cluster :</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Supplier : {delivery?.supplier ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>IAR No. : {iar?.iar_no ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>PO No./Date : {delivery?.po_no ?? ""} {delivery?.po_date ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Date : {iar?.invoice_date ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Requisitioning Office/Dept. : {iar?.requisitioning_office ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Invoice No. : {iar?.invoice_no ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Responsibility Center Code : {iar?.responsibility_center ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Date : {iar?.invoice_date ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Stock/Property No.</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Unit</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "38%" }}>Description</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Quantity</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Unit Cost</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Amount</th>
          </tr>
          {[...Array(4)].map((_, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", height: "48mm", verticalAlign: "top" }}>
              <div style={{ fontWeight: 700, marginBottom: "2mm" }}>INSPECTION</div>
              <div style={{ fontSize: "9.5pt" }}>Inspected, verified and found in order as to quantity and specifications</div>
              <div style={{ height: "8mm" }}></div>
              <div>Date Inspected : {iar?.inspected_at ?? ""}</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>Inspection Officer/Inspection Committee</div>
            </td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", height: "48mm", verticalAlign: "top" }}>
              <div style={{ fontWeight: 700, marginBottom: "2mm" }}>ACCEPTANCE</div>
              <div style={{ fontSize: "9.5pt" }}>Complete</div>
              <div style={{ fontSize: "9.5pt" }}>Partial (pls. specify quantity)</div>
              <div style={{ height: "8mm" }}></div>
              <div>Date Received : {iar?.received_at ?? ""}</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{iar?.inspector_name ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Inspector</div>
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ fontWeight: 700 }}>A. Supply Officer:</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{iar?.supply_officer_name ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Supply Officer</div>
            </td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ fontWeight: 700 }}>B. Budget Officer:</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}></div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Budget Officer</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LOAPreview({ delivery, loa }: { delivery: any; loa: any }) {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineHeight: "1.25", color: "#111" }}>
      <div style={{ textAlign: "right", fontSize: "9pt", marginBottom: "2mm" }}>Appendix 63</div>
      <div style={{ textAlign: "center", fontSize: "14pt", fontWeight: 700, letterSpacing: "0.3px", marginBottom: "2mm" }}>LETTER OF ACCEPTANCE</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Entity Name : {delivery?.entity_name ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Fund Cluster :</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Supplier : {delivery?.supplier ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>LOA No. : {loa?.loa_no ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>PO No./Date : {delivery?.po_no ?? ""} {delivery?.po_date ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Date : {loa?.accepted_at ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Invoice No. : {loa?.invoice_no ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Invoice Date : {loa?.invoice_date ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: "4mm", marginBottom: "2mm", fontWeight: 700 }}>I hereby accept the following:</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Stock/Property No.</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Unit</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "38%" }}>Description</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Quantity</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Unit Cost</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt" }}>Amount</th>
          </tr>
          {[...Array(4)].map((_, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px", height: "9mm", fontSize: "10pt", textAlign: "right" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{loa?.accepted_by_name ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>{loa?.accepted_by_title ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt", marginTop: "2mm" }}>Accepted By</div>
            </td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}></div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}></div>
              <div style={{ textAlign: "center", fontSize: "9.5pt", marginTop: "2mm" }}>Supply Officer</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DVPreview({ delivery, dv }: { delivery: any; dv: any }) {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineHeight: "1.25", color: "#111" }}>
      <div style={{ textAlign: "right", fontSize: "9pt", marginBottom: "2mm" }}>Appendix 64</div>
      <div style={{ textAlign: "center", fontSize: "14pt", fontWeight: 700, letterSpacing: "0.3px", marginBottom: "2mm" }}>DISBURSEMENT VOUCHER</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Entity Name : {delivery?.entity_name ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Fund Cluster : {dv?.fund_cluster ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Payee : {dv?.payee ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>TIN/Employee No. : {dv?.payee_tin ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Address : {dv?.address ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>ORS/BURS No. : {dv?.ors_no ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Mode of Payment : {dv?.mode_of_payment ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", height: "8mm" }}>Amount Due : {dv?.amount_due ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "42%" }}>Particulars</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "20%" }}>Responsibility Center</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>MFO/PAP</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>Amount</th>
          </tr>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px" }}>{dv?.particulars ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px" }}>{dv?.responsibility_center ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px" }}>{dv?.mfo_pap ?? ""}</td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "right" }}>{dv?.amount_due ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "34%" }}>Account Title</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>UACS Code</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>Debit</th>
            <th style={{ border: "1px solid #111", padding: "4px 6px", textAlign: "center", fontSize: "9.5pt", width: "22%" }}>Credit</th>
          </tr>
          {[...Array(2)].map((_, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #111", padding: "4px 6px" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px" }}></td>
              <td style={{ border: "1px solid #111", padding: "4px 6px" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ fontWeight: 700 }}>C. Certified:</div>
              <div style={{ fontSize: "9.5pt" }}>Expenses/Cash Advance necessary, lawful and incurred under my direct supervision.</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{dv?.certified_by ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Head, Accounting Unit/Authorized Representative</div>
            </td>
            <td style={{ border: "1px solid #111", padding: "4px 6px", verticalAlign: "top", width: "50%" }}>
              <div style={{ fontWeight: 700 }}>D. Approved for Payment</div>
              <div style={{ marginTop: "10mm", textAlign: "center", fontWeight: 700 }}>{dv?.approved_by ?? ""}</div>
              <div style={{ textAlign: "center", fontSize: "9.5pt" }}>Agency Head/Authorized Representative</div>
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
        <tbody>
          <tr>
            <td style={{ padding: "4px 6px", width: "50%" }}>Check/ADA No. : </td>
            <td style={{ padding: "4px 6px", width: "50%" }}>Date : Bank Name &amp; Account Number:</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 6px" }}>Signature : Date :</td>
            <td style={{ padding: "4px 6px" }}>Official Receipt No. &amp; Date/Other Documents</td>
          </tr>
        </tbody>
      </table>
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
}: ProcessDeliveryModalProps) {
  const deliveryNo = active?.delivery_no ?? "—";
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<"delivery" | "iar" | "loa" | "dv">("delivery");

  // Validation function to check if all required fields are filled
  const isFormValid = () => {
    // For status 24/25 (no form fields), always valid
    if (active?.status_id === 24 || active?.status_id === 25) {
      return true;
    }
    
    // Delivery Receipt required fields (only for statuses 18 & 19)
    if ((active?.status_id === 18 || active?.status_id === 19)) {
      if (selectedDocument === "delivery") {
        return drNo.trim() !== "";
      }
    }
    
    // IAR required fields (for status 20 or when IAR is selected)
    if (active?.status_id === 20 || selectedDocument === "iar") {
      return iar?.iar_no?.trim() !== "" && 
             iar?.invoice_no?.trim() !== "" &&
             iar?.requisitioning_office?.trim() !== "" &&
             iar?.responsibility_center?.trim() !== "" &&
             iar?.invoice_date?.trim() !== "" &&
             iar?.inspected_at?.trim() !== "" &&
             iar?.received_at?.trim() !== "" &&
             iar?.inspector_name?.trim() !== "" &&
             iar?.supply_officer_name?.trim() !== "";
    }
    
    // LOA required fields (for status 22 or when LOA is selected)
    if (active?.status_id === 22 || selectedDocument === "loa") {
      return loa?.loa_no?.trim() !== "" && 
             loa?.invoice_no?.trim() !== "" &&
             loa?.invoice_date?.trim() !== "" &&
             loa?.accepted_at?.trim() !== "" &&
             loa?.accepted_by_name?.trim() !== "" &&
             loa?.accepted_by_title?.trim() !== "";
    }
    
    // DV required fields (for status 23 or when DV is selected)
    if (active?.status_id === 23 || selectedDocument === "dv") {
      return dv?.dv_no?.trim() !== "" && 
             dv?.amount_due?.trim() !== "" &&
             dv?.fund_cluster?.trim() !== "" &&
             dv?.ors_no?.trim() !== "" &&
             dv?.payee?.trim() !== "" &&
             dv?.payee_tin?.trim() !== "" &&
             dv?.address?.trim() !== "" &&
             dv?.mode_of_payment?.trim() !== "" &&
             dv?.responsibility_center?.trim() !== "" &&
             dv?.mfo_pap?.trim() !== "" &&
             dv?.particulars?.trim() !== "" &&
             dv?.certified_by?.trim() !== "" &&
             dv?.approved_by?.trim() !== "";
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
    
    // Delivery Receipt required fields (only for statuses 18 & 19)
    if ((active?.status_id === 18 || active?.status_id === 19)) {
      if (selectedDocument === "delivery") {
        if (!drNo.trim()) {
          errors.push("Delivery Receipt No. (DR No.) is required");
        }
      }
    }
    
    // IAR required fields (for status 20 or when IAR is selected)
    if (active?.status_id === 20 || selectedDocument === "iar") {
      if (!iar?.iar_no?.trim()) errors.push("IAR No. is required");
      if (!iar?.invoice_no?.trim()) errors.push("Invoice No. is required");
      if (!iar?.requisitioning_office?.trim()) errors.push("Requisitioning Office is required");
      if (!iar?.responsibility_center?.trim()) errors.push("Responsibility Center is required");
      if (!iar?.invoice_date?.trim()) errors.push("Invoice Date is required");
      if (!iar?.inspected_at?.trim()) errors.push("Date Inspected is required");
      if (!iar?.received_at?.trim()) errors.push("Date Received is required");
      if (!iar?.inspector_name?.trim()) errors.push("Inspector Name is required");
      if (!iar?.supply_officer_name?.trim()) errors.push("Supply Officer Name is required");
    }
    
    // LOA required fields (for status 22 or when LOA is selected)
    if (active?.status_id === 22 || selectedDocument === "loa") {
      if (!loa?.loa_no?.trim()) errors.push("LOA No. is required");
      if (!loa?.invoice_no?.trim()) errors.push("Invoice No. is required");
      if (!loa?.invoice_date?.trim()) errors.push("Invoice Date is required");
      if (!loa?.accepted_at?.trim()) errors.push("Date Accepted is required");
      if (!loa?.accepted_by_name?.trim()) errors.push("Accepted By Name is required");
      if (!loa?.accepted_by_title?.trim()) errors.push("Accepted By Title is required");
    }
    
    // DV required fields (for status 23 or when DV is selected)
    if (active?.status_id === 23 || selectedDocument === "dv") {
      if (!dv?.dv_no?.trim()) errors.push("DV No. is required");
      if (!dv?.amount_due?.trim()) errors.push("Amount Due is required");
      if (!dv?.fund_cluster?.trim()) errors.push("Fund Cluster is required");
      if (!dv?.ors_no?.trim()) errors.push("ORS/BURS No. is required");
      if (!dv?.payee?.trim()) errors.push("Payee is required");
      if (!dv?.payee_tin?.trim()) errors.push("Payee TIN/Employee No. is required");
      if (!dv?.address?.trim()) errors.push("Address is required");
      if (!dv?.mode_of_payment?.trim()) errors.push("Mode of Payment is required");
      if (!dv?.responsibility_center?.trim()) errors.push("Responsibility Center is required");
      if (!dv?.mfo_pap?.trim()) errors.push("MFO/PAP is required");
      if (!dv?.particulars?.trim()) errors.push("Particulars is required");
      if (!dv?.certified_by?.trim()) errors.push("Certified By is required");
      if (!dv?.approved_by?.trim()) errors.push("Approved By is required");
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
      steps.push({ id: 2, label: "Acceptance", icon: "" });
    }
    
    // DV step (Status 23)
    if (active?.status_id === 23 || active?.status_id >= 24) {
      steps.push({ id: 3, label: "Disbursement Voucher", icon: "" });
    }
    
    return steps;
  };
  
  const steps = getAvailableSteps();
  
  // Determine which document types are available based on status
  const getAvailableDocuments = (): ("delivery" | "iar" | "loa" | "dv")[] => {
    const documents: ("delivery" | "iar" | "loa" | "dv")[] = [];
    
    // Delivery Receipt available only for statuses 18 & 19
    if (active?.status_id === 18 || active?.status_id === 19) {
      documents.push("delivery");
    }
    
    // Status 20 (Delivery IAR) - Show all documents (IAR, LOA, DV)
    if (active?.status_id === 20) {
      documents.push("iar", "loa", "dv");
    }
    
    // Status 22 (Delivery LOA) - Only show LOA
    if (active?.status_id === 22) {
      documents.push("loa");
    }
    
    // Status 23 (Delivery DV) - Only show DV
    if (active?.status_id === 23) {
      documents.push("dv");
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
    }
  }, [visible]);

  // Update selected document when status changes
  useEffect(() => {
    const availableDocuments = getAvailableDocuments();
    if (availableDocuments.length > 0 && !availableDocuments.includes(selectedDocument)) {
      setSelectedDocument(availableDocuments[0]);
    }
  }, [active?.status_id]);
  
  if (!visible) return null;

  const renderFormContent = () => {
    // Delivery Receipt
    if (selectedDocument === "delivery") {
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
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Responsibility Center <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={iar?.responsibility_center ?? ""}
                  onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), responsibility_center: e.target.value }))}
                  placeholder="RC-XXXX"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
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
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Inspector (Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={iar?.inspector_name ?? ""}
                  onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), inspector_name: e.target.value }))}
                  placeholder="Printed name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Supply Officer (Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={iar?.supply_officer_name ?? ""}
                onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), supply_officer_name: e.target.value }))}
                placeholder="Printed name"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
        </div>
      );
    }
    
    // LOA Form
    if (selectedDocument === "loa") {
      return (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Acceptance (LOA)</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  LOA No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={loa?.loa_no ?? ""}
                  onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), loa_no: e.target.value }))}
                  placeholder="e.g. LOA-2026-0003"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                />
              </div>
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
    
    // DV Form
    if (selectedDocument === "dv") {
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Mode of Payment <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dv?.mode_of_payment ?? ""}
                onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), mode_of_payment: e.target.value }))}
                placeholder="e.g. MDS Check / ADA / Cash"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Certified By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.certified_by ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), certified_by: e.target.value }))}
                  placeholder="Printed name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Approved By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dv?.approved_by ?? ""}
                  onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), approved_by: e.target.value }))}
                  placeholder="Printed name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
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
      return <IARPreview delivery={active} iar={iar || {}} />;
    }
    
    if (selectedDocument === "loa") {
      return <LOAPreview delivery={active} loa={loa || {}} />;
    }
    
    if (selectedDocument === "dv") {
      return <DVPreview delivery={active} dv={dv || {}} />;
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
    // Validation for required fields
    if (active?.status_id === 18 || active?.status_id === 19) {
      return drNo.trim() !== "";
    }
    return true;
  };
  
  const getSubmitButtonText = () => {
    if (active?.status_id === 24) return "Forward to Division Chief";
    if (active?.status_id === 25) return "Submit & Complete Delivery Phase";
    if (steps.length > 1 && currentStep === steps.length) return "Save & Complete";
    return "Save & Update";
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
          <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Form Side */}
          <div className="flex flex-[2] flex-col overflow-hidden border-r border-gray-200">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
              {/* Document Type Tabs */}
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

              {/* Form Content */}
              {renderFormContent()}

              {/* Notes */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Notes</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Status Flag
                    </label>
                    <FlagButton selected={statusFlag} onPress={onPressStatusFlag} />
                  </div>
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

          {/* Preview Side */}
          <div className="flex flex-[3] overflow-y-auto bg-gray-100 flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
                <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200">
                  <div className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-700 text-white">
                    {selectedDocument === "delivery" ? "Delivery" : selectedDocument.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-black">
                {renderPreviewContent()}
              </div>
            </div>
          </div>
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
