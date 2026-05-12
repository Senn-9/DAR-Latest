"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  RiFileListLine,
  RiSearchLine,
  RiTimeLine,
  RiCheckboxCircleLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiEyeLine,
  RiMoneyDollarCircleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiTruckLine,
  RiMore2Line,
  RiChat3Line,
  RiPlayCircleLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiCalendarLine,
  RiFilter3Line,
  RiCloseLine,
} from "react-icons/ri";
import ViewDeliveryModal from "@/components/Delivery/ViewDeliveryModal";
import ProcessDeliveryModal from "@/components/Delivery/ProcessDeliveryModal";
import RemarksModal from "@/components/Delivery/RemarksModal";
import ProcessPaymentModal, {
  type PaymentProcessDocType,
} from "@/components/Payment/ProcessPaymentModal";
import ViewPaymentModal from "@/components/Payment/ViewPaymentModal";
import DeletePaymentModal from "@/components/Payment/DeletePaymentModal";
import {
  fetchDeliveriesForPaymentPhase,
  fetchPaymentPhaseStatuses,
  insertDeliveryProcessRemark,
  fetchIARByDelivery,
  fetchLOAByDelivery,
  fetchDVByDelivery,
  upsertIARByDelivery,
  upsertLOAByDelivery,
  upsertDVByDelivery,
  updateDeliveryStatusOnly,
} from "@/utils/supabase/delivery";
import { fetchPOWithItemsById } from "@/utils/supabase/po";
import {
  FlagButton,
  StatusFlagPicker,
  type StatusFlag,
  getFlagId,
} from "@/components/StatusFlagPicker";

export default function PaymentPage() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  type DeliveryRow = {
    id: number;
    po_id: number | null;
    po_no: string;
    supplier: string | null;
    office_section: string | null;
    division_id: string | null;
    delivery_no: string;
    expected_delivery_date: string | null;
    dr_no: string | null;
    soa_no: string | null;
    status_id: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
    entity_name?: string;
    po_date?: string;
    created_by: number | null;
  };

  type CurrentUser = {
    id: number;
    fullname: string;
    username: string;
    role_id: number;
    division_id?: number | null;
    divisions?: { division_name: string; division_id: number };
    roles?: { role_name: string };
  };

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Role checks for specialized accounts (same logic as Dashboard)
  const isBACAccount = 
    currentUser?.username?.toLowerCase() === "bac" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("bac") ?? false);
  const isPARPOAccount = 
    currentUser?.username?.toLowerCase() === "parpo" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("parpo") ?? false);
  const isSupplyAccount = 
    currentUser?.username?.toLowerCase() === "supply" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("supply") ?? false);
  const isBudgetAccount = 
    currentUser?.roles?.role_name?.toLowerCase().includes("budget") ?? false;
  const isAccountingAccount = 
    currentUser?.roles?.role_name?.toLowerCase().includes("accounting") ?? false;
  const isCashAccount =
    currentUser?.username?.toLowerCase() === "cash" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("cash") ?? false);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<
    "delivery_no" | "po_no" | "created_at"
  >("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRow | null>(
    null,
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);
    const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [paymentViewModalOpen, setPaymentViewModalOpen] = useState(false);
  const [paymentProcessModalOpen, setPaymentProcessModalOpen] = useState(false);
  const [deletePaymentModalOpen, setDeletePaymentModalOpen] = useState(false);
  const [iarData, setIarData] = useState<any>(null);
  const [loaData, setLoaData] = useState<any>(null);
  const [dvData, setDvData] = useState<any>(null);
  const [poData, setPoData] = useState<any>(null);
  const [statuses, setStatuses] = useState<
    { id: number; status_name: string }[]
  >([]);
  const [statusFlag, setStatusFlag] = useState<StatusFlag | null>(null);

  const PAGE_SIZE = 10;
  const CURRENT_YEAR = new Date().getFullYear();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [fiscalYear, setFiscalYear] = useState(CURRENT_YEAR);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 5; y--) years.push(y);
    return years;
  }, []);

  const PAYMENT_STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "pending-review", label: "Pending Review" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const STATUS_CFG: Record<
    number,
    { bg: string; text: string; label: string }
  > = {
    18: {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      label: "Delivery (Waiting)",
    },
    19: {
      bg: "bg-orange-50",
      text: "text-orange-800",
      label: "Delivery (Received)",
    },
    20: { bg: "bg-teal-50", text: "text-teal-800", label: "Delivery (IAR)" },
    21: {
      bg: "bg-purple-50",
      text: "text-purple-800",
      label: "Delivery (IAR Processing)",
    },
    22: { bg: "bg-blue-50", text: "text-blue-800", label: "Delivery (LOA)" },
    25: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      label: "Division Chief Review",
    },
    28: {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      label: "Payment Pending",
    },
    29: {
      bg: "bg-orange-50",
      text: "text-orange-800",
      label: "Voucher Verification",
    },
    30: {
      bg: "bg-purple-50",
      text: "text-purple-800",
      label: "Accounting Review",
    },
    32: { bg: "bg-cyan-50", text: "text-cyan-800", label: "PARPO Approval" },
    33: {
      bg: "bg-indigo-50",
      text: "text-indigo-800",
      label: "Forward to Cash",
    },
    34: {
      bg: "bg-sky-50",
      text: "text-sky-800",
      label: "Forward to PARPO office for signature",
    },
    35: {
      bg: "bg-amber-50",
      text: "text-amber-900",
      label: "Forward to Accounting for Tax processing",
    },
    36: {
      bg: "bg-emerald-100",
      text: "text-emerald-900",
      label: "Cash for Release",
    },
    37: {
      bg: "bg-emerald-100",
      text: "text-emerald-900",
      label: "Payment completed",
    },
    26: { bg: "bg-red-50", text: "text-red-800", label: "Payment Cancelled" },
    27: { bg: "bg-red-50", text: "text-red-800", label: "Cancelled" },
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAdmin(user.role_id === 1);
    }
  }, []);

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true);

        // Fetch all deliveries for payment phase (admin gets all, users get filtered client-side)
        const deliveriesData = await fetchDeliveriesForPaymentPhase(null);
        
        // Apply client-side filtering based on user role (same logic as Dashboard)
        const filteredDeliveries = deliveriesData.filter(delivery => {
          // Admin and specialized roles see all payment data
          if (isAdmin || isBACAccount || isPARPOAccount || isBudgetAccount || isSupplyAccount || isAccountingAccount || isCashAccount) {
            return true;
          }
          
          // Division heads and end users see payment data from their division based on office_section
          return delivery.office_section === currentUser?.divisions?.division_name;
        });
        
        setDeliveries(filteredDeliveries as any);

        // Fetch payment phase statuses
        const statusesData = await fetchPaymentPhaseStatuses();
        setStatuses(statusesData);
      } catch (error) {
        console.error("Error fetching payment data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchPaymentData();
    }
  }, [currentUser, isAdmin, isCashAccount]);

  const getPaymentStatusCategory = (statusId: number) => {
    // Map status IDs to filter categories - only payment phase statuses (28+)
    if ([28, 29, 30, 32, 33, 34, 35].includes(statusId))
      return "pending-review";
    if ([36, 37].includes(statusId)) return "completed";
    if ([26, 27].includes(statusId)) return "cancelled"; // Cancelled
    return "other"; // Other statuses (including delivery phase)
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field)
      return <RiArrowUpLine size={10} className="text-gray-400" />;
    return sortDir === "asc" ? (
      <RiArrowUpLine size={10} className="text-white" />
    ) : (
      <RiArrowDownLine size={10} className="text-white" />
    );
  };

  const filteredDeliveries = deliveries.filter(
    (delivery) => {
      const matchSearch =
        delivery.delivery_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delivery.po_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (delivery.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false);
      
      const statusCategory = getPaymentStatusCategory(delivery.status_id);
      const matchStatus = statusFilter === "all" || statusCategory === statusFilter;
      const matchSection = sectionFilter === null || (delivery.office_section ?? null) === sectionFilter;
      const matchYear = delivery.created_at ? new Date(delivery.created_at).getFullYear() === fiscalYear : true;
      return matchSearch && matchStatus && matchSection && matchYear;
    },
  );

  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === "created_at") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedDeliveries.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedDeliveries = sortedDeliveries.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const canRoleProcess = (roleId: number, statusId: number) => {
    const adminOrAccounting = [1, 9].includes(roleId);
    const adminOrParpo = [1, 5].includes(roleId);
    const adminOrCash = roleId === 1 || isCashAccount;
    switch (statusId) {
      case 28:
        return adminOrAccounting;
      case 29:
        return adminOrAccounting;
      case 30:
        return adminOrAccounting;
      case 32:
        return adminOrParpo;
      case 33:
        return adminOrCash;
      case 34:
        return adminOrParpo;
      case 35:
        return adminOrAccounting;
      case 36:
        return adminOrAccounting || adminOrCash;
      default:
        return false;
    }
  };

  
  const handleViewDelivery = async (delivery: DeliveryRow) => {
    setSelectedDelivery(delivery);

    // Fetch related documents
    try {
      const [iar, loa, dv] = await Promise.all([
        fetchIARByDelivery(delivery.id),
        fetchLOAByDelivery(delivery.id),
        fetchDVByDelivery(delivery.id),
      ]);

      setIarData(iar);
      setLoaData(loa);
      setDvData(dv);
    } catch (error) {
      console.error("Error fetching delivery documents:", error);
    }

    setViewModalOpen(true);
  };

  
  const handleOpenRemarks = (delivery: DeliveryRow) => {
    setSelectedDelivery(delivery);
    setRemarksModalOpen(true);
  };

  const handleViewPayment = (delivery: DeliveryRow) => {
    setSelectedDelivery(delivery);
    setPaymentViewModalOpen(true);
  };

  const handleProcessPayment = async (delivery: DeliveryRow) => {
    console.log("Opening payment modal for delivery:", delivery);
    setSelectedDelivery(delivery);
    
    // Don't reset status flag - let user maintain their selection during the session
    
    // Fetch DV data for all statuses
    try {
      const dv = await fetchDVByDelivery(delivery.id);
      console.log("Fetched DV data:", dv);
      console.log("DV accounting_entries:", dv?.accounting_entries);
      setDvData(dv);
    } catch (error) {
      console.error("Error fetching DV data:", error);
    }
    
    // Fetch IAR, LOA, and PO data for Payment Pending / Voucher Verification
    if (delivery.status_id === 28 || delivery.status_id === 29) {
      try {
        console.log("Fetching IAR, LOA, and PO data for Voucher Verification...");
        const [iar, loa, poDataResult] = await Promise.all([
          fetchIARByDelivery(delivery.id),
          fetchLOAByDelivery(delivery.id),
          delivery.po_id ? fetchPOWithItemsById(delivery.po_id) : Promise.resolve(null)
        ]);

        console.log("IAR data:", iar);
        console.log("LOA data:", loa);
        console.log("PO data:", poDataResult);
        setIarData(iar);
        setLoaData(loa);
        
        // Transform PO data to match expected structure
        if (poDataResult) {
          const transformedPoData = {
            ...poDataResult.header,
            purchase_order_items: poDataResult.items
          };
          setPoData(transformedPoData);
        }
      } catch (error) {
        console.error("Error fetching documents for Voucher Verification:", error);
      }
    } else {
      // Fetch PO data for other statuses as well
      try {
        const poDataResult = delivery.po_id ? await fetchPOWithItemsById(delivery.po_id) : null;
        if (poDataResult) {
          const transformedPoData = {
            ...poDataResult.header,
            purchase_order_items: poDataResult.items
          };
          setPoData(transformedPoData);
        }
      } catch (error) {
        console.error("Error fetching PO data:", error);
      }
    }
    
    setPaymentProcessModalOpen(true);
  };


  const handleDeletePayment = (delivery: DeliveryRow) => {
    setSelectedDelivery(delivery);
    setDeletePaymentModalOpen(true);
  };

  
  const handlePreviewDocument = (type: "iar" | "loa" | "dv") => {
    // Implementation for document preview
    console.log(`Preview ${type} document`);
  };

  const handlePreviewPaymentDocument = async (type: PaymentProcessDocType) => {
    if (!selectedDelivery) return;
    
    try {
      // For IAR and LOA, use the same HTML template viewing as delivery system
      if (type === "iar" || type === "loa") {
        // Transform poData to have the correct structure for templates
        const transformedPoData = poData ? {
          ...poData,
          po_items: poData.purchase_order_items || []
        } : {};
        
        const mergedData = { ...selectedDelivery, ...transformedPoData };
        
        let html: string | null = null;
        
        if (type === "iar") {
          const iarDocumentData = { ...mergedData, ...iarData };
          iarDocumentData.po_items = mergedData.po_items;
          html = await buildIARHtml(iarDocumentData);
        } else if (type === "loa") {
          const loaDocumentData = { ...mergedData, ...loaData };
          loaDocumentData.po_items = mergedData.po_items;
          html = await buildLOAHtml(loaDocumentData);
        }
        
        if (html) {
          // Open HTML in new window for full document view
          const printWindow = window.open("", "", "height=800,width=1200");
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
          }
        } else {
          alert(`Unable to generate ${type.toUpperCase()} document. No document data available.`);
        }
      } else {
        // For voucher, ORS, DV - use existing implementation or placeholder
        console.log(`Preview ${type} document (placeholder implementation)`);
        alert(`${type.toUpperCase()} document preview not yet implemented.`);
      }
    } catch (error) {
      console.error(`Error generating ${type} document:`, error);
      alert(`Failed to generate ${type.toUpperCase()} document. Please try again.`);
    }
  };

// Helper functions for HTML generation (same as delivery system)
async function buildIARHtml(d: any): Promise<string> {
  try {
    const response = await fetch(`/documents/IAR-template.html`);
    if (!response.ok) throw new Error('Failed to load IAR template');
    const template = await response.text();
    
    // Replace placeholders
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return d[key] !== undefined ? String(d[key]) : match;
    });
  } catch (error) {
    console.error('Error building IAR HTML:', error);
    throw error;
  }
}

async function buildLOAHtml(d: any): Promise<string> {
  try {
    const response = await fetch(`/documents/LOA-template.html`);
    if (!response.ok) throw new Error('Failed to load LOA template');
    const template = await response.text();
    
    // Replace placeholders
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return d[key] !== undefined ? String(d[key]) : match;
    });
  } catch (error) {
    console.error('Error building LOA HTML:', error);
    throw error;
  }
}

  // Skeleton loading component
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { font-family: 'Sora', sans-serif; }
          .mono { font-family: 'JetBrains Mono', monospace; }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .skeleton-shimmer {
            background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
        `}</style>

        <div className="w-full p-6 md:p-10 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="skeleton-shimmer h-3 w-32 rounded" />
              <div className="skeleton-shimmer h-8 w-48 rounded" />
              <div className="skeleton-shimmer h-4 w-40 rounded" />
            </div>
            <div className="skeleton-shimmer h-10 w-32 rounded-xl" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="skeleton-shimmer h-5 w-40 rounded" />
              <div className="flex flex-wrap items-center gap-2">
                <div className="skeleton-shimmer h-8 w-56 rounded-lg" />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="skeleton-shimmer h-4 w-24 rounded shrink-0" />
                  <div className="skeleton-shimmer h-4 w-28 rounded shrink-0" />
                  <div className="skeleton-shimmer h-4 w-full max-w-xs rounded" />
                  <div className="skeleton-shimmer h-6 w-32 rounded-full shrink-0" />
                  <div className="skeleton-shimmer h-4 w-20 rounded shrink-0 ml-auto" />
                  <div className="flex items-center justify-center gap-1.5 shrink-0">
                    <div className="skeleton-shimmer h-7 w-16 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .tr-row:hover td { background-color: #f0fdf4 !important; }
        .th-sort:hover { background-color: #065f46 !important; cursor: pointer; }
      `}</style>

      <div className="w-full p-6 md:p-10 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">
              Procurement Portal
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Payment Processing
            </h1>
            {currentUser && (
              <p className="text-sm text-gray-400 mt-1">
                Signed in as{" "}
                <span className="text-gray-700 font-semibold">
                  {currentUser.fullname}
                </span>
                {currentUser.divisions?.division_name && (
                  <span className="ml-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    {currentUser.divisions.division_name}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowYearPicker(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-400 rounded-xl px-4 py-2.5 transition-colors shadow-sm"
          >
            <RiCalendarLine size={16} className="text-emerald-600" />
            <span className="font-semibold text-gray-700 text-sm">FY {fiscalYear}</span>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
          {(
            [
              { key: "pr", label: "Purchase Request", href: "/Procurement" },
              {
                key: "canvass",
                label: "Canvass",
                href: "/Procurement/Canvass",
              },
              {
                key: "abstract",
                label: "Abstract of Awards",
                href: "/Procurement/Abstract",
              },
              {
                key: "purchase-order",
                label: "Purchase Order",
                href: "/Procurement/PurchaseOrder",
              },
              {
                key: "delivery",
                label: "Delivery",
                href: "/Procurement/Delivery",
              },
              {
                key: "payment",
                label: "Payment",
                href: "/Procurement/Payment",
              },
            ] as const
          ).map(({ key, label, href }) => {
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

        {/* Payment Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: "Total Payments",
              value: deliveries.length,
              icon: <RiMoneyDollarCircleLine />,
              bg: "bg-emerald-50",
              border: "border-emerald-200",
              iconBg: "bg-emerald-100",
              iconColor: "text-emerald-700",
              numColor: "text-emerald-700",
            },
                                    {
              label: "Pending Review",
              value: deliveries.filter((d) =>
                [28, 29, 30, 32, 33, 34, 35].includes(d.status_id),
              ).length,
              icon: <RiTimeLine />,
              bg: "bg-yellow-50",
              border: "border-yellow-200",
              iconBg: "bg-yellow-100",
              iconColor: "text-yellow-700",
              numColor: "text-yellow-700",
            },
            {
              label: "Completed",
              value: deliveries.filter((d) => d.status_id === 37).length,
              icon: <RiCheckboxCircleLine />,
              bg: "bg-emerald-50",
              border: "border-emerald-200",
              iconBg: "bg-emerald-100",
              iconColor: "text-emerald-700",
              numColor: "text-emerald-700",
            },
            {
              label: "Cancelled",
              value: deliveries.filter((d) => [26, 27].includes(d.status_id))
                .length,
              icon: <RiCloseCircleLine />,
              bg: "bg-red-50",
              border: "border-red-200",
              iconBg: "bg-red-100",
              iconColor: "text-red-700",
              numColor: "text-red-700",
            },
          ].map(
            ({
              label,
              value,
              icon,
              bg,
              border,
              iconBg,
              iconColor,
              numColor,
            }) => (
              <div
                key={label}
                className={`${bg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}
              >
                <div
                  className={`${iconBg} ${iconColor} rounded-xl w-10 h-10 flex items-center justify-center shrink-0`}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className={`mono text-xl font-bold ${numColor}`}>
                    {value}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>

        {/* Payment Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 max-w-6xl mx-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800 shrink-0">
              Payment Processing Queue
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex items-center">
                <RiSearchLine
                  size={14}
                  className="absolute left-2.5 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search delivery, PO or supplier…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-56"
                />
              </div>
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  filterOpen ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <RiFilter3Line size={14} />
                Filters
              </button>
            </div>
          </div>

          {/* Status sub-tabs */}
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {PAYMENT_STATUS_OPTIONS.map(({ value, label }) => (
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
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap gap-4">
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-bold text-gray-500 mb-2">SECTION</label>
                <select
                  value={sectionFilter ?? ""}
                  onChange={(e) => { setSectionFilter(e.target.value || null); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">All Sections</option>
                  {Array.from(new Set(deliveries.map((d) => d.office_section).filter((s): s is string => s != null && s !== ""))).map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-bold text-gray-500 mb-2">SORT BY</label>
                <select
                  value={sortField}
                  onChange={(e) => handleSort(e.target.value as typeof sortField)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="created_at">Date Created</option>
                  <option value="delivery_no">Delivery No</option>
                  <option value="po_no">PO Number</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setSectionFilter(null); setCurrentPage(1); }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {filteredDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RiMoneyDollarCircleLine size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No payment records found.</p>
              <p className="text-xs mt-1">Try adjusting your search.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-700 text-white uppercase tracking-widest">
                      {[
                        {
                          label: "Delivery No",
                          field: "delivery_no" as const,
                          align: "text-left",
                        },
                        {
                          label: "PO Number",
                          field: "po_no" as const,
                          align: "text-left",
                        },
                        { label: "Supplier", field: null, align: "text-left" },
                        {
                          label: "Date",
                          field: "created_at" as const,
                          align: "text-left",
                        },
                        {
                          label: "Payment Status",
                          field: null,
                          align: "text-center",
                        },
                        { label: "Actions", field: null, align: "text-center" },
                      ].map(({ label, field, align }) => (
                        <th
                          key={label}
                          onClick={field ? () => handleSort(field) : undefined}
                          className={`px-2 py-2 font-semibold whitespace-nowrap ${align} ${field ? "th-sort select-none cursor-pointer" : ""}`}
                        >
                          <span className="inline-flex items-center gap-0.5">
                            {label}
                            {field && <SortIcon field={field} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDeliveries.map((delivery, index) => {
                      const statusInfo = STATUS_CFG[delivery.status_id] || {
                        bg: "bg-gray-100",
                        text: "text-gray-800",
                        label: "Unknown status",
                      };
                      const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                      const canProcess = canRoleProcess(
                        currentUser?.role_id || 0,
                        delivery.status_id,
                      );

                      return (
                        <tr
                          key={delivery.id}
                          className="tr-row border-b border-gray-100 transition-colors hover:bg-emerald-50/50"
                        >
                          <td
                            className={`mono px-2 py-2 font-semibold text-gray-800 whitespace-nowrap ${rowBg}`}
                          >
                            {delivery.delivery_no}
                          </td>
                          <td
                            className={`mono px-2 py-2 text-gray-600 whitespace-nowrap ${rowBg}`}
                          >
                            {delivery.po_no}
                          </td>
                          <td
                            className={`px-2 py-2 text-gray-600 truncate ${rowBg}`}
                          >
                            {delivery.supplier || (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td
                            className={`px-2 py-2 text-gray-500 whitespace-nowrap ${rowBg}`}
                          >
                            {delivery.created_at ? (
                              new Date(delivery.created_at).toLocaleDateString(
                                "en-PH",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusInfo.bg} ${statusInfo.text}`}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleViewPayment(delivery)}
                                className="px-2 py-1 text-xs font-semibold rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                              >
                                View Payment
                              </button>
                                                       <button
                                onClick={() => handleOpenRemarks(delivery)}
                                className="px-2 py-1 text-xs font-semibold rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                              >
                                <RiChat3Line size={14} />
                                Remarks
                              </button>
                              {canRoleProcess(
                                currentUser?.role_id || 0,
                                delivery.status_id,
                              ) && (
                                <button
                                  onClick={() => handleProcessPayment(delivery)}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <RiPlayCircleLine size={14} />
                                  Process
                                </button>
                              )}
                                                                                                                        {isAdmin && (
                                <button
                                  onClick={() => handleDeletePayment(delivery)}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <RiDeleteBinLine size={14} />
                                  Delete
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

              {/* Pagination */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + PAGE_SIZE, sortedDeliveries.length)} of{" "}
                  {sortedDeliveries.length} entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowLeftLine size={14} />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                          currentPage === pageNum
                            ? "bg-emerald-700 text-white border border-emerald-700"
                            : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
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

      {/* ── YEAR PICKER MODAL ── */}
      {showYearPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Select</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">Fiscal Year</h3>
              </div>
              <button onClick={() => setShowYearPicker(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <RiCloseLine size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2">
              {yearOptions.map((year) => (
                <button
                  key={year}
                  onClick={() => { setFiscalYear(year); setShowYearPicker(false); setCurrentPage(1); }}
                  className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${fiscalYear === year ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                >
                  <span className={`font-semibold ${fiscalYear === year ? "text-emerald-700" : "text-gray-700"}`}>FY {year}</span>
                  {fiscalYear === year && <RiCheckLine size={18} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedDelivery && viewModalOpen && (
        <ViewDeliveryModal
          visible={viewModalOpen}
          delivery={selectedDelivery}
          iar={iarData}
          loa={loaData}
          poData={poData}
          onClose={() => setViewModalOpen(false)}
        />
      )}

      
      {selectedDelivery && remarksModalOpen && (
        <RemarksModal
          visible={remarksModalOpen}
          deliveryId={selectedDelivery.id}
          onClose={() => setRemarksModalOpen(false)}
        />
      )}

      {selectedDelivery && paymentViewModalOpen && (
        <ViewPaymentModal
          visible={paymentViewModalOpen}
          delivery={selectedDelivery}
          voucher={iarData}
          ors={loaData}
          dv={dvData}
          poData={poData}
          onClose={() => setPaymentViewModalOpen(false)}
        />
      )}

      {selectedDelivery && paymentProcessModalOpen && (
        <ProcessPaymentModal
          visible={paymentProcessModalOpen}
          active={selectedDelivery}
          onClose={() => setPaymentProcessModalOpen(false)}
          onSubmit={async (data) => {
            // Handle payment processing with proper status transition
            try {
              console.log("Payment processing onSubmit called");
              console.log("selectedDelivery:", selectedDelivery);
              console.log("statusFlag:", statusFlag);
              console.log("Document data:", data);
              
              if (!selectedDelivery) {
                console.error("Missing selected delivery for payment processing");
                alert("No delivery selected. Please select a delivery and try again.");
                return;
              }
              if (!statusFlag) {
                console.error("Missing status flag for payment processing");
                alert("Please set a status flag before processing payment.");
                return;
              }

              // Get the next status based on current status
              let nextStatusId: number;
              switch (selectedDelivery.status_id) {
                case 28:
                  nextStatusId = 29;
                  break;
                case 29:
                  nextStatusId = 30;
                  break;
                case 30:
                  nextStatusId = 32;
                  break;
                case 32:
                  nextStatusId = 33;
                  break;
                case 33:
                  nextStatusId = 34;
                  break;
                case 34:
                  nextStatusId = 35;
                  break;
                case 35:
                  nextStatusId = 36;
                  break;
                case 36:
                  nextStatusId = 37;
                  break;
                default:
                  console.error("Invalid status for payment processing");
                  return;
              }

              // Save document data (DV, ORS, IAR, LOA) to database
              if (data.dvData) {
                console.log("Saving DV data:", data.dvData);
                try {
                  await upsertDVByDelivery(selectedDelivery.id, data.dvData);
                  setDvData(data.dvData); // Update local state
                  console.log("DV data saved successfully");
                } catch (dvError: any) {
                  console.error("Error saving DV data:", dvError);
                  console.error("DV Error details:", JSON.stringify(dvError, null, 2));
                  const errorMsg = dvError?.message || dvError?.error?.message || dvError?.details || JSON.stringify(dvError);
                  throw new Error(`Failed to save DV data: ${errorMsg}`);
                }
              }
              if (data.orsData) {
                console.log("Saving ORS data:", data.orsData);
                // Add upsertORSByDelivery if you have ORS table
              }
              if (data.iarData) {
                console.log("Saving IAR data:", data.iarData);
                try {
                  await upsertIARByDelivery(selectedDelivery.id, data.iarData);
                  setIarData(data.iarData); // Update local state
                  console.log("IAR data saved successfully");
                } catch (iarError: any) {
                  console.error("Error saving IAR data:", iarError);
                  console.error("IAR Error details:", JSON.stringify(iarError, null, 2));
                  const errorMsg = iarError?.message || iarError?.error?.message || iarError?.details || JSON.stringify(iarError);
                  throw new Error(`Failed to save IAR data: ${errorMsg}`);
                }
              }
              if (data.loaData) {
                console.log("Saving LOA data:", data.loaData);
                try {
                  await upsertLOAByDelivery(selectedDelivery.id, data.loaData);
                  setLoaData(data.loaData); // Update local state
                  console.log("LOA data saved successfully");
                } catch (loaError: any) {
                  console.error("Error saving LOA data:", loaError);
                  console.error("LOA Error details:", JSON.stringify(loaError, null, 2));
                  const errorMsg = loaError?.message || loaError?.error?.message || loaError?.details || JSON.stringify(loaError);
                  throw new Error(`Failed to save LOA data: ${errorMsg}`);
                }
              }

              // Update delivery status
              await updateDeliveryStatusOnly(selectedDelivery.id, nextStatusId, selectedDelivery.status_id);

              // Insert processing remark
              const stepLabel =
                selectedDelivery.status_id === 28 ? "Payment Pending" :
                selectedDelivery.status_id === 29 ? "Voucher Verification" :
                selectedDelivery.status_id === 30 ? "Accounting Review" :
                selectedDelivery.status_id === 32 ? "PARPO Approval" :
                selectedDelivery.status_id === 33 ? "Forward to Cash" :
                selectedDelivery.status_id === 34 ? "Forward to PARPO office for signature" :
                selectedDelivery.status_id === 35 ? "Forward to Accounting for Tax processing" :
                selectedDelivery.status_id === 36 ? "Cash for Release" :
                selectedDelivery.status_id === 37 ? "Payment Completed" :
                "Unknown Step";
              
              const remarkText = data.notes 
                ? `${stepLabel}: ${data.notes}`
                : `Payment processing completed for ${stepLabel}`;
              
              await insertDeliveryProcessRemark(
                selectedDelivery.id,
                currentUser?.id || null,
                remarkText,
                getFlagId(statusFlag),
                "payment"
              );

              // Refresh the deliveries list
              const deliveriesData = await fetchDeliveriesForPaymentPhase(null);
              
              // Apply client-side filtering based on user role (same logic as Dashboard)
              const filteredDeliveries = deliveriesData.filter(delivery => {
                // Admin and specialized roles see all payment data
                if (isAdmin || isBACAccount || isPARPOAccount || isBudgetAccount || isSupplyAccount || isAccountingAccount || isCashAccount) {
                  return true;
                }
                
                // Division heads and end users see payment data from their division based on office_section
                return delivery.office_section === currentUser?.divisions?.division_name;
              });
              
              setDeliveries(filteredDeliveries as any);

              setPaymentProcessModalOpen(false);
            } catch (error) {
              console.error("Error processing payment:", error);
              const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
              alert(`Failed to process payment: ${errorMessage}`);
            }
          }}
          statusLabel="Payment Processing"
          statusFlag={statusFlag}
          onSelectStatusFlag={(flag) => setStatusFlag(flag)}
          onPreviewDocument={handlePreviewPaymentDocument}
          voucher={iarData}
          ors={loaData}
          dv={dvData}
          iar={iarData}
          loa={loaData}
          poData={poData}
        />
      )}

      

      {selectedDelivery && deletePaymentModalOpen && (
        <DeletePaymentModal
          visible={deletePaymentModalOpen}
          deliveryId={selectedDelivery.id}
          deliveryNo={selectedDelivery.delivery_no}
          onClose={() => setDeletePaymentModalOpen(false)}
          onDeleted={async (deliveryId) => {
            // Refresh the deliveries list after deletion
            try {
              const deliveriesData = await fetchDeliveriesForPaymentPhase(null);
              
              // Apply client-side filtering based on user role (same logic as Dashboard)
              const filteredDeliveries = deliveriesData.filter(delivery => {
                // Admin and specialized roles see all payment data
                if (isAdmin || isBACAccount || isPARPOAccount || isBudgetAccount || isSupplyAccount || isAccountingAccount || isCashAccount) {
                  return true;
                }
                
                // Division heads and end users see payment data from their division based on office_section
                return delivery.office_section === currentUser?.divisions?.division_name;
              });
              
              setDeliveries(filteredDeliveries as any);
            } catch (error) {
              console.error("Error refreshing payment data:", error);
            }
          }}
          roleId={currentUser?.role_id}
        />
      )}
    </div>
  );
}
