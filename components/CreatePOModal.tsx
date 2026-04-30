"use client";

import { useEffect, useState } from "react";
import type { PurchaseOrderItemRow, PurchaseOrderRow } from "@/utils/supabase/po";

export default function CreatePOModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (header: Partial<PurchaseOrderRow>, items: PurchaseOrderItemRow[]) => Promise<void>;
}) {
  const [supplier, setSupplier] = useState("");
  const [address, setAddress] = useState("");
  const [tin, setTin] = useState("");
  const [procurementMode, setProcurementMode] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState("");
  const [deliveryTerm, setDeliveryTerm] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("");
  const [officeSection, setOfficeSection] = useState("");
  const [fundCluster, setFundCluster] = useState("");
  const [items, setItems] = useState<PurchaseOrderItemRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) resetForm();
  }, [visible]);

  function resetForm() {
    setSupplier("");
    setAddress("");
    setTin("");
    setProcurementMode("");
    setDeliveryPlace("");
    setDeliveryTerm("");
    setDeliveryDate("");
    setPaymentTerm("");
    setOfficeSection("");
    setFundCluster("");
    setItems([]);
    setSaving(false);
  }

  function addItem() {
    setItems((s) => [...s, { stock_no: null, unit: null, description: null, quantity: 1, unit_price: 0, subtotal: 0 }]);
  }

  function updateItem(idx: number, patch: Partial<PurchaseOrderItemRow>) {
    setItems((s) => s.map((it, i) => (i === idx ? { ...it, ...patch, subtotal: computeSubtotal({ ...it, ...patch }) } : it)));
  }

  function removeItem(idx: number) {
    setItems((s) => s.filter((_, i) => i !== idx));
  }

  function computeSubtotal(it: PurchaseOrderItemRow) {
    const qty = Number(it.quantity ?? 0);
    const price = Number(it.unit_price ?? 0);
    return isNaN(qty) || isNaN(price) ? 0 : qty * price;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!supplier) return alert("Supplier is required");
    setSaving(true);
    try {
      const header: Partial<PurchaseOrderRow> = {
        supplier,
        address,
        tin,
        procurement_mode: procurementMode,
        delivery_place: deliveryPlace,
        delivery_term: deliveryTerm,
        delivery_date: deliveryDate || null,
        payment_term: paymentTerm,
        office_section: officeSection,
        fund_cluster: fundCluster,
        total_amount: items.reduce((acc, it) => acc + Number(it.subtotal ?? 0), 0),
        status_id: 11, // default to PO (Creation)
      };
      await onCreate(header, items);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create PO.");
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="px-6 py-4 bg-emerald-700 text-white">
          <h3 className="text-lg font-bold">Create Purchase Order</h3>
          <p className="text-xs text-emerald-100 mt-0.5">Create a new PO and add line items</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Supplier</label>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Office / Section</label>
              <input value={officeSection} onChange={(e) => setOfficeSection(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Fund Cluster</label>
              <input value={fundCluster} onChange={(e) => setFundCluster(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">TIN</label>
              <input value={tin} onChange={(e) => setTin(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Procurement Mode</label>
              <input value={procurementMode} onChange={(e) => setProcurementMode(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Delivery Place</label>
              <input value={deliveryPlace} onChange={(e) => setDeliveryPlace(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Delivery Term</label>
              <input value={deliveryTerm} onChange={(e) => setDeliveryTerm(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Delivery Date</label>
              <input type="date" value={deliveryDate ?? ""} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Payment Term</label>
              <input value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-gray-800">Line Items</h4>
              <div className="flex items-center gap-2">
                <button type="button" onClick={addItem} className="px-3 py-1 rounded-xl bg-emerald-700 text-white text-sm">Add Item</button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-400">No items yet — add one.</div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="rounded-xl border border-gray-200 bg-white p-3 grid grid-cols-12 gap-2 items-center">
                    <input className="col-span-2 rounded-lg border border-gray-200 px-2 py-1 text-sm" placeholder="Stock No" value={it.stock_no ?? ""} onChange={(e) => updateItem(idx, { stock_no: e.target.value })} />
                    <input className="col-span-1 rounded-lg border border-gray-200 px-2 py-1 text-sm" placeholder="Unit" value={it.unit ?? ""} onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                    <input className="col-span-5 rounded-lg border border-gray-200 px-2 py-1 text-sm" placeholder="Description" value={it.description ?? ""} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                    <input type="number" className="col-span-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right" placeholder="Qty" value={String(it.quantity ?? 0)} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                    <input type="number" step="0.01" className="col-span-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right" placeholder="Unit Price" value={String(it.unit_price ?? 0)} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
                    <div className="col-span-1 text-right text-sm font-semibold">₱{(it.subtotal ?? 0).toFixed(2)}</div>
                    <button type="button" onClick={() => removeItem(idx)} className="col-span-12 md:col-span-12 text-xs text-red-600">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-50">{saving ? "Creating…" : "Create PO"}</button>
        </div>
      </form>
    </div>
  );
}
