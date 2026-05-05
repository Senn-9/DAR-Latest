"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import RemarksTimelineModal from "@/components/RemarksTimelineModal";
import CreatePOModal from "../../components/CreatePOModal";
import ORSProcessModal from "@/components/ORSProcessModal";
import {
  fetchPOWithItemsById,
  fetchPurchaseOrders,
  fetchPurchaseOrdersByDivision,
  updatePOStatus,
  createPurchaseOrder,
  type PurchaseOrderItemRow,
  type PurchaseOrderRow,
} from "@/utils/supabase/po";
import {
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiArrowUpLine,
  RiChat3Line,
  RiAddLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiEyeLine,
  RiFileListLine,
  RiMoneyDollarCircleLine,
  RiSearchLine,
  RiTimeLine,
  RiPlayCircleLine,
} from "react-icons/ri";

type CurrentUser = {
  id?: number;
  fullname: string;
  username: string;
  role_id: number;
  division_id?: number | null;
  divisions?: { division_id: number; division_name: string };
  roles?: { role_name: string };
};

type DivisionRow = {
  division_id: number;
  division_name: string | null;
};

type POUserContext = {
  role_id: number;
  username?: string | null;
  roles?: { role_name: string };
  divisions?: { division_id: number; division_name: string };
} | null;

type POStatusMeta = {
  label: string;
  color: string;
  bg: string;
  text: string;
};

const PAGE_SIZE = 10;

const PO_STATUS_CFG: Record<number, POStatusMeta> = {
  11: { label: "PO (Creation)", color: "po", bg: "bg-teal-50", text: "text-teal-800" },
  12: { label: "PO (Allocation)", color: "po", bg: "bg-teal-50", text: "text-teal-800" },
  13: { label: "ORS (Creation)", color: "ors", bg: "bg-orange-50", text: "text-orange-800" },
  14: { label: "ORS (Processing)", color: "ors", bg: "bg-blue-50", text: "text-blue-800" },
  15: { label: "PO (Accounting)", color: "accounting", bg: "bg-yellow-50", text: "text-yellow-800" },
  16: { label: "PO (PARPO)", color: "parpo", bg: "bg-fuchsia-50", text: "text-fuchsia-800" },
  17: { label: "PO (Serving)", color: "serving", bg: "bg-emerald-50", text: "text-emerald-800" },
  34: { label: "Completed (PO Phase)", color: "completed", bg: "bg-green-50", text: "text-green-800" },
};

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "po", label: "PO" },
  { value: "ors", label: "ORS" },
  { value: "accounting", label: "Accounting" },
  { value: "parpo", label: "PARPO" },
  { value: "serving", label: "Serving" },
  { value: "completed", label: "Completed" },
];

function fmtMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusMeta(statusId: number | null | undefined): POStatusMeta {
  if (statusId != null && PO_STATUS_CFG[statusId]) return PO_STATUS_CFG[statusId];
  return { label: statusId != null ? `Status ${statusId}` : "Unknown", color: "default", bg: "bg-gray-100", text: "text-gray-700" };
}

function getPhase(statusId: number | null | undefined): "po" | "ors" | "accounting" | "parpo" | "serving" | "completed" | "unknown" {
  if (statusId === 11 || statusId === 12) return "po";
  if (statusId === 13 || statusId === 14) return "ors";
  if (statusId === 15) return "accounting";
  if (statusId === 16) return "parpo";
  if (statusId === 17) return "serving";
  if (statusId === 34) return "completed";
  return "unknown";
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isStodDivision(divisionName: string | null | undefined) {
  return normalizeText(divisionName).includes("stod");
}

function isBudgetUser(user: POUserContext) {
  return user?.role_id === 4 || normalizeText(user?.roles?.role_name).includes("budget");
}

function isSupplyUser(user: POUserContext) {
  return user?.role_id === 8 || normalizeText(user?.roles?.role_name).includes("supply");
}

function isPPMPPointPerson(user: POUserContext) {
  const roleName = normalizeText(user?.roles?.role_name);
  const username = normalizeText(user?.username);
  return roleName.includes("ppmp") || roleName.includes("point person") || username.includes("ppmp");
}

function nextStatusOptions(statusId: number, user: POUserContext, divisionName?: string | null) {
  const roleId = user?.role_id ?? 0;

  if (roleId === 1) {
    return [11, 12, 13, 14, 15, 16, 17, 34].filter((s) => s !== statusId);
  }

  if (isSupplyUser(user)) {
    if (statusId === 11) return [12];
    if (statusId === 12) return [13];
    if (statusId === 16) return [17];
    if (statusId === 17) return [34];
    return [];
  }

  if (isBudgetUser(user)) {
    if (statusId === 13) return [14];
    if (statusId === 14) return [15];
    if (statusId === 15) return [16];
    return [];
  }

  if (isPPMPPointPerson(user)) {
    if (statusId === 15) return [16];
    return [];
  }

  return [];
}

function canProcessPO(user: POUserContext, statusId: number | null, divisionName?: string | null) {
  if (statusId == null) return false;
  return nextStatusOptions(statusId, user, divisionName).length > 0;
}

function ProcessModal({
  visible,
  po,
  roleId,
  divisionName,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  po: PurchaseOrderRow | null;
  roleId: number;
  divisionName: string | null;
  onClose: () => void;
  onSubmit: (statusId: number, remarks: string) => Promise<void>;
}) {
  const [statusId, setStatusId] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !po) return;
    const options = nextStatusOptions(
      Number(po.status_id ?? 0),
      { role_id: roleId, divisions: { division_id: Number(po.division_id ?? 0), division_name: divisionName ?? "" } },
      divisionName,
    );
    setStatusId(options[0] ?? "");
    setRemarks("");
    setSaving(false);
  }, [visible, po, roleId, divisionName]);

  if (!visible || !po) return null;

  const options = nextStatusOptions(
    Number(po.status_id ?? 0),
    { role_id: roleId, divisions: { division_id: Number(po.division_id ?? 0), division_name: divisionName ?? "" } },
    divisionName,
  );
  const isStod = isStodDivision(divisionName);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 bg-emerald-700 text-white">
          <h3 className="text-lg font-bold">Process Purchase Order</h3>
          <p className="text-xs text-emerald-100 mt-0.5">{po.po_no ?? "Unknown PO"}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            {isStod
              ? "STOD divisions follow the direct PCAO approval path for status 16."
              : "Non-STOD divisions require the PPMP point person signature before PO serving."}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">PR No</p><p className="font-semibold">{po.pr_no ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">Supplier</p><p className="font-semibold">{po.supplier ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">Current Status</p><p className="font-semibold">{getStatusMeta(po.status_id).label}</p></div>
            <div><p className="text-xs text-gray-500">Total Amount</p><p className="font-semibold">{fmtMoney(po.total_amount)}</p></div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Next Status</label>
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              {options.length === 0 ? (
                <option value="">No available transitions</option>
              ) : (
                options.map((id) => (
                  <option key={id} value={id}>
                    {getStatusMeta(id).label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
              placeholder="Add remarks for this PO step..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={saving || statusId === ""}
            onClick={async () => {
              if (statusId === "") return;
              setSaving(true);
              try {
                await onSubmit(statusId, remarks);
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "Processing…" : "Process"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({
  visible,
  po,
  items,
  loadingItems,
  onClose,
  onOpenRemarks,
  onOpenProcess,
  canProcess,
}: {
  visible: boolean;
  po: PurchaseOrderRow | null;
  items: PurchaseOrderItemRow[];
  loadingItems: boolean;
  onClose: () => void;
  onOpenRemarks: () => void;
  onOpenProcess: () => void;
  canProcess: boolean;
}) {
  if (!visible || !po) return null;
  const meta = getStatusMeta(po.status_id);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Purchase Order Details</h3>
            <p className="text-xs text-emerald-100 mt-0.5">{po.po_no ?? "—"} · {po.pr_no ?? "No linked PR"}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Supplier</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{po.supplier ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Status</p>
              <p className={`mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.text}`}>{meta.label}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Total Amount</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{fmtMoney(po.total_amount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <DetailItem label="Office Section" value={po.office_section} />
            <DetailItem label="Fund Cluster" value={po.fund_cluster} />
            <DetailItem label="Address" value={po.address} />
            <DetailItem label="TIN" value={po.tin} />
            <DetailItem label="Procurement Mode" value={po.procurement_mode} />
            <DetailItem label="Delivery Place" value={po.delivery_place} />
            <DetailItem label="Delivery Term" value={po.delivery_term} />
            <DetailItem label="Delivery Date" value={po.delivery_date} />
            <DetailItem label="Payment Term" value={po.payment_term} />
            <DetailItem label="Date" value={po.date} />
            <DetailItem label="ORS No." value={po.ors_no} />
            <DetailItem label="ORS Date" value={po.ors_date} />
            <DetailItem label="Funds Available" value={po.funds_available} />
            <DetailItem label="ORS Amount" value={po.ors_amount != null ? fmtMoney(po.ors_amount) : null} />
            <DetailItem label="Official Name" value={po.official_name} />
            <DetailItem label="Official Designation" value={po.official_desig} />
            <DetailItem label="Accountant Name" value={po.accountant_name} />
            <DetailItem label="Accountant Designation" value={po.accountant_desig} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-semibold text-gray-800">Line Items</h4>
              <span className="text-xs text-gray-500">{items.length} item(s)</span>
            </div>

            {loadingItems ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">Loading items…</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">No PO line items found.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 uppercase tracking-widest">
                      <th className="px-3 py-2 text-left">Stock No</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id ?? index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 text-gray-700">{item.stock_no ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{item.unit ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{item.description ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{item.quantity ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{item.unit_price != null ? fmtMoney(item.unit_price) : "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">{item.subtotal != null ? fmtMoney(item.subtotal) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onOpenRemarks}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <RiChat3Line size={16} />
            Remarks
          </button>
          <div className="flex items-center gap-2">
            {canProcess && (
              <button
                onClick={onOpenProcess}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 inline-flex items-center gap-2"
              >
                <RiPlayCircleLine size={16} />
                Process
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 break-words">{value ?? "—"}</p>
    </div>
  );
}

export default function PurchaseOrderPage() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [list, setList] = useState<PurchaseOrderRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"po_no" | "pr_no" | "supplier" | "total_amount" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderRow | null>(null);
  const [selectedItems, setSelectedItems] = useState<PurchaseOrderItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [divisionNames, setDivisionNames] = useState<Record<number, string>>({});

  const isAdmin = currentUser?.role_id === 1;
  const isBudget = currentUser?.role_id === 4 || (currentUser?.roles?.role_name?.toLowerCase().includes("budget") ?? false);
  const isSupply = currentUser?.role_id === 8 || (currentUser?.roles?.role_name?.toLowerCase().includes("supply") ?? false);
  const canViewAll = isAdmin || isBudget || isSupply;

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const loadDivisions = async () => {
      const { data } = await supabase.from("divisions").select("division_id, division_name");
      const map: Record<number, string> = {};
      (data ?? []).forEach((division: DivisionRow) => {
        map[division.division_id] = division.division_name ?? "";
      });
      setDivisionNames(map);
    };

    loadDivisions();
  }, [supabase]);

  useEffect(() => {
    const loadPOs = async () => {
      try {
        setLoading(true);
        const rows = canViewAll
          ? await fetchPurchaseOrders()
          : currentUser?.division_id != null
            ? await fetchPurchaseOrdersByDivision(currentUser.division_id)
            : [];
        setList(rows);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadPOs();
    }
  }, [currentUser, canViewAll]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(field === "created_at" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const filteredList = useMemo(() => {
    return list
      .filter((po) => {
        const meta = getStatusMeta(po.status_id);
        const matchSearch =
          (po.po_no ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.pr_no ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.supplier ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.office_section ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchSearch && (statusFilter === "all" || meta.color === statusFilter);
      })
      .sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";
        if (sortField === "total_amount") {
          aVal = Number(a.total_amount ?? 0);
          bVal = Number(b.total_amount ?? 0);
        } else if (sortField === "created_at") {
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        } else {
          aVal = String(a[sortField] ?? "");
          bVal = String(b[sortField] ?? "");
        }
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [list, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const pagedList = filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const counts = filteredList.reduce(
    (acc, po) => {
      const phase = getPhase(po.status_id);
      acc.total += 1;
      if (phase === "po") acc.po += 1;
      if (phase === "ors") acc.ors += 1;
      if (phase === "accounting") acc.accounting += 1;
      if (phase === "parpo") acc.parpo += 1;
      if (phase === "serving") acc.serving += 1;
      if (phase === "completed") acc.completed += 1;
      return acc;
    },
    { total: 0, po: 0, ors: 0, accounting: 0, parpo: 0, serving: 0, completed: 0 },
  );

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  const openDetails = async (po: PurchaseOrderRow) => {
    setSelectedPo(po);
    setDetailsOpen(true);
    setLoadingItems(true);
    try {
      const { header, items } = await fetchPOWithItemsById(Number(po.id));
      setSelectedPo(header);
      setSelectedItems(items);
    } catch {
      setSelectedItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const getDivisionName = (divisionId: number | null | undefined) => {
    if (divisionId == null) return null;
    return divisionNames[divisionId] ?? null;
  };

  const selectedPoDivisionName = getDivisionName(selectedPo?.division_id);

  const processPO = async (statusId: number, remarks: string) => {
    if (!selectedPo) return;
    setSaving(true);
    try {
      await updatePOStatus(Number(selectedPo.id), statusId);
      await supabase.from("remarks").insert({
        po_id: Number(selectedPo.id),
        pr_id: selectedPo.pr_id,
        user_id: currentUser?.id ?? null,
        remark: `[PO] ${remarks.trim()}`,
        phase: "po",
        status_flag_id: null,
      });
      const rows = canViewAll
        ? await fetchPurchaseOrders()
        : currentUser?.division_id != null
          ? await fetchPurchaseOrdersByDivision(currentUser.division_id)
          : [];
      setList(rows);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (header: Partial<PurchaseOrderRow>, items: PurchaseOrderItemRow[]) => {
    setSaving(true);
    try {
      const poId = await createPurchaseOrder(header, items);
      const rows = canViewAll
        ? await fetchPurchaseOrders()
        : currentUser?.division_id != null
          ? await fetchPurchaseOrdersByDivision(currentUser.division_id)
          : [];
      setList(rows);
      try {
        const { header: newHeader, items: newItems } = await fetchPOWithItemsById(Number(poId));
        setSelectedPo(newHeader);
        setSelectedItems(newItems);
        setDetailsOpen(true);
      } catch (err) {
        // ignore
      }
    } finally {
      setSaving(false);
    }
  };

  const statusCounts = counts;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <div className="w-full p-6 md:p-10 space-y-6">
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-8 w-56 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse" />
            ))}
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="w-full p-6 md:p-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">Purchase Order Portal</p>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
            {currentUser && (
              <p className="text-sm text-gray-400 mt-1">
                Signed in as <span className="text-gray-700 font-semibold">{currentUser.fullname}</span>
                {currentUser.divisions?.division_name && (
                  <span className="ml-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    {currentUser.divisions.division_name}
                  </span>
                )}
              </p>
            )}
          </div>
          {/* Create PO button in header (like Create PR) */}
          <div className="ml-auto">
            {isSupply && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-lg font-bold text-base transition-colors"
              >
                <RiAddLine size={20} /> Create PO
              </button>
            )}
          </div>
        </div>

        {pathname?.startsWith("/Procurement") && (
          <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
            {([
              { key: "pr", label: "Purchase Request", href: "/Procurement" },
              { key: "canvass", label: "Canvass", href: "/Procurement/Canvass" },
              { key: "abstract", label: "Abstract of Awards", href: "/Procurement/Abstract" },
              { key: "purchase-order", label: "Purchase Order", href: "/Procurement/PurchaseOrder" },
              { key: "delivery", label: "Delivery", href: "/Procurement/Delivery" },
              { key: "payment", label: "Payment", href: "/Procurement/Payment" },
            ] as const).map(({ key, label, href }) => {
              const isActive = pathname === href;
              return (
                <button
                  key={key}
                  onClick={() => router.push(href)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total", value: statusCounts.total, icon: <RiFileListLine size={20} />, cardBg: "bg-emerald-50", border: "border-emerald-100", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", numColor: "text-emerald-600" },
            { label: "PO", value: statusCounts.po, icon: <RiTimeLine size={20} />, cardBg: "bg-teal-50", border: "border-teal-100", iconBg: "bg-teal-100", iconColor: "text-teal-600", numColor: "text-teal-600" },
            { label: "ORS", value: statusCounts.ors, icon: <RiPlayCircleLine size={20} />, cardBg: "bg-orange-50", border: "border-orange-100", iconBg: "bg-orange-100", iconColor: "text-orange-600", numColor: "text-orange-600" },
            { label: "Accounting", value: statusCounts.accounting, icon: <RiMoneyDollarCircleLine size={20} />, cardBg: "bg-yellow-50", border: "border-yellow-100", iconBg: "bg-yellow-100", iconColor: "text-yellow-600", numColor: "text-yellow-600" },
            { label: "PARPO", value: statusCounts.parpo, icon: <RiCheckboxCircleLine size={20} />, cardBg: "bg-fuchsia-50", border: "border-fuchsia-100", iconBg: "bg-fuchsia-100", iconColor: "text-fuchsia-600", numColor: "text-fuchsia-600" },
            { label: "Completed", value: statusCounts.completed, icon: <RiCloseCircleLine size={20} />, cardBg: "bg-green-50", border: "border-green-100", iconBg: "bg-green-100", iconColor: "text-green-600", numColor: "text-green-600" },
          ].map((card) => (
            <div key={card.label} className={`${card.cardBg} border ${card.border} rounded-2xl p-4 flex items-center gap-3 shadow-sm`}>
              <div className={`${card.iconBg} ${card.iconColor} rounded-xl w-10 h-10 flex items-center justify-center shrink-0`}>{card.icon}</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                <p className={`text-xl font-bold ${card.numColor}`}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 max-w-6xl mx-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800">All Purchase Orders</h2>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setStatusFilter(value); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                    statusFilter === value
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
              <div className="relative flex items-center">
                <RiSearchLine size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search PO, PR, supplier or section…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-72"
                />
              </div>
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RiFileListLine size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No purchase orders found.</p>
              <p className="text-xs mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-700 text-white uppercase tracking-widest">
                      {[
                        { label: "PO No.", field: "po_no" as const, align: "text-left" },
                        { label: "PR No.", field: "pr_no" as const, align: "text-left" },
                        { label: "Supplier", field: "supplier" as const, align: "text-left" },
                        { label: "Section", field: null, align: "text-left" },
                        { label: "Date", field: "created_at" as const, align: "text-left" },
                        { label: "Status", field: null, align: "text-center" },
                        { label: "Amount", field: "total_amount" as const, align: "text-right" },
                        { label: "Actions", field: null, align: "text-center" },
                      ].map(({ label, field, align }) => (
                        <th
                          key={label}
                          onClick={field ? () => handleSort(field) : undefined}
                          className={`px-2 py-2 font-semibold whitespace-nowrap ${align} ${field ? "cursor-pointer select-none" : ""}`}
                        >
                          <span className="inline-flex items-center gap-0.5">{label}{field && <SortIcon field={field} />}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedList.map((po, index) => {
                      const meta = getStatusMeta(po.status_id);
                      const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                      const canProcess = canProcessPO(currentUser, po.status_id, getDivisionName(po.division_id));

                      return (
                        <tr key={po.id} className="border-b border-gray-100 transition-colors hover:bg-emerald-50/50">
                          <td className={`px-2 py-2 font-semibold text-gray-800 whitespace-nowrap ${rowBg}`}>{po.po_no ?? "—"}</td>
                          <td className={`px-2 py-2 text-gray-600 whitespace-nowrap ${rowBg}`}>{po.pr_no ?? "—"}</td>
                          <td className={`px-2 py-2 text-gray-600 truncate ${rowBg}`}>{po.supplier ?? <span className="text-gray-300">—</span>}</td>
                          <td className={`px-2 py-2 text-gray-600 truncate ${rowBg}`}>{po.office_section ?? <span className="text-gray-300">—</span>}</td>
                          <td className={`px-2 py-2 text-gray-500 whitespace-nowrap ${rowBg}`}>{po.created_at ? new Date(po.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : <span className="text-gray-300">—</span>}</td>
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.bg} ${meta.text}`}>{meta.label}</span>
                          </td>
                          <td className={`px-2 py-2 text-right font-semibold text-gray-800 ${rowBg}`}>{fmtMoney(po.total_amount)}</td>
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openDetails(po)}
                                className="px-2 py-1 text-xs font-semibold rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                              >
                                <RiEyeLine size={14} />
                                View
                              </button>
                              <button
                                onClick={() => { setSelectedPo(po); setRemarksOpen(true); }}
                                className="px-2 py-1 text-xs font-semibold rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                              >
                                <RiChat3Line size={14} />
                                Remarks
                              </button>
                              {canProcess && (
                                <button
                                  onClick={() => { setSelectedPo(po); setProcessOpen(true); }}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiPlayCircleLine size={14} />
                                  Process
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 -mx-6 px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  Showing <span className="font-semibold text-gray-700">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredList.length)}–{Math.min(currentPage * PAGE_SIZE, filteredList.length)}</span> of <span className="font-semibold text-gray-700">{filteredList.length}</span> purchase orders
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowLeftLine size={14} />
                  </button>
                  {pageNums.map((page, index) =>
                    page === "…" ? (
                      <span key={`e${index}`} className="px-1 text-gray-400">…</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
                          currentPage === page
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowRightLine size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <DetailsModal
        visible={detailsOpen}
        po={selectedPo}
        items={selectedItems}
        loadingItems={loadingItems}
        onClose={() => setDetailsOpen(false)}
        onOpenRemarks={() => setRemarksOpen(true)}
        onOpenProcess={() => setProcessOpen(true)}
        canProcess={selectedPo ? canProcessPO(currentUser, selectedPo.status_id, selectedPoDivisionName) : false}
      />

      {selectedPo?.status_id === 13 ? (
        <ORSProcessModal
          visible={processOpen}
          po={selectedPo}
          currentUser={currentUser}
          onClose={() => setProcessOpen(false)}
          onSubmit={async (statusId, remarks) => {
            await processPO(statusId, remarks);
            setProcessOpen(false);
          }}
        />
      ) : (
        <ProcessModal
          visible={processOpen}
          po={selectedPo}
          roleId={currentUser?.role_id ?? 0}
          divisionName={selectedPoDivisionName}
          onClose={() => setProcessOpen(false)}
          onSubmit={async (statusId, remarks) => {
            await processPO(statusId, remarks);
            setProcessOpen(false);
          }}
        />
      )}

      <CreatePOModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (header: Partial<PurchaseOrderRow>, items: PurchaseOrderItemRow[]) => {
          await handleCreate(header, items);
          setCreateOpen(false);
        }}
      />

      <RemarksTimelineModal
        visible={remarksOpen}
        target={{ poId: selectedPo ? Number(selectedPo.id) : null }}
        title={selectedPo?.po_no ? `Remarks · ${selectedPo.po_no}` : "Purchase Order Remarks"}
        subtitle={selectedPo?.supplier ?? "PO history and phase notes"}
        onClose={() => setRemarksOpen(false)}
      />
    </div>
  );

  function SortIcon({ field }: { field: typeof sortField }) {
    return (
      <span className={`inline-flex ml-1 ${sortField === field ? "opacity-100" : "opacity-30"}`}>
        {sortField === field && sortDir === "desc" ? <RiArrowDownLine size={12} /> : <RiArrowUpLine size={12} />}
      </span>
    );
  }
}
