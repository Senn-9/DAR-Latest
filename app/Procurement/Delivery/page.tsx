"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/utils/supabase/client";

import {
  RiFileListLine,
  RiSearchLine,
  RiAddLine,
  RiTimeLine,
  RiCheckboxCircleLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiEyeLine,
  RiEditLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiTruckLine,
  RiDeleteBinLine,
  RiMore2Line,
  RiChat3Line,
  RiPlayCircleLine,
} from "react-icons/ri";

import ViewDeliveryModal from "@/components/Delivery/ViewDeliveryModal";

import CreateDeliveryModal from "@/components/Delivery/CreateDeliveryModal";

import ProcessDeliveryModal from "@/components/Delivery/ProcessDeliveryModal";

import DeleteDeliveryModal from "@/components/Delivery/DeleteDeliveryModal";

import RemarksModal from "@/components/Delivery/RemarksModal";

import {
  fetchPoCandidatesForDelivery,
  insertDelivery,
  updateDelivery,
  updateDeliveryStatusOnly,
  fetchIARByDelivery,
  fetchLOAByDelivery,
  fetchDVByDelivery,
  upsertIARByDelivery,
  upsertLOAByDelivery,
  upsertDVByDelivery,
  fetchDeliveryStatuses,
  insertDeliveryProcessRemark,
  fetchPoIdsWithActiveDeliveries,
  hasActiveDeliveryForPo,
  fetchPODataForDelivery,
} from "@/utils/supabase/delivery";

import {
  FlagButton,
  StatusFlagPicker,
  type StatusFlag,
  getFlagId,
} from "@/components/StatusFlagPicker";

export default function DeliveryPage() {
  const supabase = createClient();

  const router = useRouter();

  type DeliveryRow = {
    id: number;

    po_id: number | null;

    po_no: string;

    supplier: string | null;

    office_section: string | null;

    division_id: number | null;

    status_id: number;

    delivery_no: string;

    dr_no: string | null;

    soa_no: string | null;

    notes: string | null;

    expected_delivery_date: string | null;

    created_by: number | null;

    created_at: string;

    updated_at: string | null;

    po_date?: string | null;

    fund_cluster?: string | null;

    responsibility_center_code?: string | null;

    po_items?: Array<{
      stock_no: string | null;

      unit: string | null;

      description: string | null;

      quantity: number | null;

      unit_price: number | null;

      subtotal: number | null;
    }>;

    entity_name?: string;
  };

  type CurrentUser = {
    fullname: string;

    username: string;

    role_id: number;

    divisions?: { division_name: string };

    roles?: { role_name: string };
  };

  type SubTab = "all" | "deliveries" | "inspection" | "acceptance" | "completed";

  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [subTab, setSubTab] = useState<SubTab>("all");

  const [sortField, setSortField] = useState<
    "delivery_no" | "po_no" | "created_at"
  >("created_at");

  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRow | null>(
    null,
  );

  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [processModalOpen, setProcessModalOpen] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [remarksModalOpen, setRemarksModalOpen] = useState(false);

  const [iarData, setIarData] = useState<any>(null);

  const [loaData, setLoaData] = useState<any>(null);

  const [dvData, setDvData] = useState<any>(null);

  const [poCandidates, setPoCandidates] = useState<any[]>([]);

  const [poIdsWithActiveDelivery, setPoIdsWithActiveDelivery] = useState<
    number[]
  >([]);

  const [statuses, setStatuses] = useState<
    { id: number; status_name: string }[]
  >([]);

  const [selectedPoId, setSelectedPoId] = useState<number | null>(null);

  const [drNo, setDrNo] = useState("");

  const [notes, setNotes] = useState("");

  const [iar, setIar] = useState<any>(null);

  const [loa, setLoa] = useState<any>(null);

  const [dv, setDv] = useState<any>(null);

  const [statusFlag, setStatusFlag] = useState<StatusFlag | null>(null);

  const [flagPickerOpen, setFlagPickerOpen] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<number | null>(null);

  const [sectionFilter, setSectionFilter] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<"created_at" | "updated_at">(
    "created_at",
  );

  const [defaultViewTab, setDefaultViewTab] = useState<"iar" | "loa">("iar");

  const [poData, setPoData] = useState<any>(null);

  const PAGE_SIZE = 10;

  // Helper function to filter out Phase 4 payment statuses

  const filterDeliveryData = (data: any[]) => {
    const paymentStatuses = [28, 29, 30, 32, 33, 34, 35];

    return data.filter((delivery) => {
      // Exclude Phase 4 payment statuses except completed (36) - they belong to Payment page

      if (paymentStatuses.includes(delivery.status_id)) {
        return false;
      }

      // STOD roles (BAC, Supply, Budget, PARPO, Accounting) and Admin can view all deliveries

      if (
        isAdmin ||
        isBACAccount ||
        isPARPOAccount ||
        isBudgetAccount ||
        isSupplyAccount ||
        isAccountingRole
      ) {
        return true;
      }

      // End users and Division Heads can only view deliveries from their division

      return delivery.office_section === currentUser?.divisions?.division_name;
    });
  };

  const SUB_TAB_STATUS_MAP: Record<SubTab, number[]> = {
    all: [],

    deliveries: [18, 19],

    inspection: [20, 21],

    acceptance: [22, 23, 24, 25],

    completed: [], // Will be handled separately for non-defined statuses
  };

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

    23: { bg: "bg-green-50", text: "text-green-800", label: "Delivery (DV)" },

    25: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      label: "Delivery (Division Chief)",
    },

    27: { bg: "bg-red-50", text: "text-red-800", label: "Cancelled" },
  };

  const SUB_TAB_OPTIONS = [
    { value: "all" as const, label: "All" },

    { value: "deliveries" as const, label: "Deliveries" },

    { value: "inspection" as const, label: "Inspection" },

    { value: "acceptance" as const, label: "Acceptance" },

    { value: "completed" as const, label: "Completed" },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");

    if (storedUser) {
      const user = JSON.parse(storedUser);

      setCurrentUser(user);

      setIsAdmin(user.role_id === 1);
    }
  }, []);

  // Role definitions - moved before useEffect that uses them

  const isDivisionHead =
    currentUser?.roles?.role_name?.toLowerCase().includes("division head") ??
    false;

  const isBACAccount =
    currentUser?.username?.toLowerCase() === "bac" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("bac") ?? false);

  const isPARPOAccount =
    currentUser?.username?.toLowerCase() === "parpo" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("parpo") ?? false);

  const isBudgetAccount =
    currentUser?.username?.toLowerCase() === "budget" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("budget") ?? false);

  const isSupplyAccount =
    currentUser?.username?.toLowerCase() === "supply" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("supply") ?? false);

  const isAccountingRole =
    currentUser?.roles?.role_name?.toLowerCase().includes("accounting") ??
    false;

  const isEndUser =
    !isAdmin &&
    !isDivisionHead &&
    !isBACAccount &&
    !isPARPOAccount &&
    !isBudgetAccount &&
    !isSupplyAccount &&
    !isAccountingRole;

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase

          .from("deliveries")

          .select("*")

          .order("created_at", { ascending: false });

        const filteredData = filterDeliveryData(data || []);
        setDeliveries(filteredData as DeliveryRow[]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, [
    supabase,
    isAdmin,
    currentUser,
    isBACAccount,
    isPARPOAccount,
    isBudgetAccount,
    isSupplyAccount,
    isAccountingRole,
  ]);

  useEffect(() => {
    const fetchData = async () => {
      const [candidates, statusData, activePoIds] = await Promise.all([
        fetchPoCandidatesForDelivery(),

        fetchDeliveryStatuses(),

        fetchPoIdsWithActiveDeliveries(),
      ]);

      setPoCandidates(candidates);

      setStatuses(statusData);

      setPoIdsWithActiveDelivery(activePoIds ?? []);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchDeliveryDocuments = async () => {
      if (!selectedDelivery) {
        setIarData(null);

        setLoaData(null);

        setDvData(null);

        setPoData(null);

        return;
      }

      try {
        const [iarRes, loaRes, dvRes] = await Promise.all([
          fetchIARByDelivery(selectedDelivery.id),

          fetchLOAByDelivery(selectedDelivery.id),

          fetchDVByDelivery(selectedDelivery.id),
        ]);

        // Fetch PO data if po_id exists with proper error handling
        let poDataResult = null;

        if (selectedDelivery.po_id) {
          try {
            poDataResult = await fetchPODataForDelivery(selectedDelivery.po_id);
          } catch (poError) {
            // Silently handle PO data fetch errors to prevent breaking document loading
            poDataResult = null;
          }
        }

        setIarData(iarRes?.data || null);
        setLoaData(loaRes?.data || null);
        setDvData(dvRes?.data || null);
        setPoData(poDataResult);
      } catch (error) {
        // Silently handle document fetching errors
      }
    };

    fetchDeliveryDocuments();
  }, [selectedDelivery?.id, supabase]);

  const canRoleProcess = (roleId: number, statusId: number) => {
    if (roleId === 1) return true;

    if (roleId === 8 && [18, 19, 20, 21, 22].includes(statusId)) return true; // Supply role - removed 23

    if (roleId === 2 && statusId === 25) return true; // Division Chief approval

    return false;
  };

  const BLOCKING_FLAGS: StatusFlag[] = [
    "needs_revision",
    "wrong_information",
    "on_hold",
  ];

  const handleCreateDelivery = async () => {
    if (!selectedPoId) {
      alert("Please select a PO.");

      return;
    }

    try {
      // Client-side pre-check to avoid UX round-trip when possible

      try {
        const already = await hasActiveDeliveryForPo(selectedPoId);

        if (already) {
          alert(
            "Selected PO already has an active delivery process. Cannot create another Log Delivery.",
          );

          return;
        }
      } catch (e) {}

      const selectedPo = poCandidates.find((p) => p.id === selectedPoId);

      await insertDelivery({
        po_id: selectedPoId,

        po_no: selectedPo?.po_no || "",

        supplier: selectedPo?.supplier || null,

        office_section: selectedPo?.office_section || null,

        division_id: selectedPo?.division_id || null,

        created_by: currentUser?.role_id || null,
      });

      setCreateModalOpen(false);

      setSelectedPoId(null);

      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setDeliveries(filterDeliveryData(data) as DeliveryRow[]);
    } catch (e: any) {
      const errorMessage = e?.message ?? "Failed to create delivery.";

      // Provide more specific error messages for common issues
      if (errorMessage.includes("active delivery process")) {
        alert(errorMessage);
      } else if (errorMessage.includes("unique delivery number")) {
        alert(
          "System encountered a temporary issue generating a delivery number. Please try again in a moment.",
        );
      } else if (
        errorMessage.includes(
          "Failed to create delivery after multiple attempts",
        )
      ) {
        alert(
          "System is experiencing high load. Please wait a few seconds and try again.",
        );
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleProcessDelivery = async () => {
    if (!selectedDelivery) return;

    try {
      // Fixed status progression: Follow proper sequential flow

      let nextStatus = selectedDelivery.status_id + 1;

      // Skip DV (status 23) and End-User Forward (status 24) - go directly from LOA (status 22) to Division Chief (status 25)

      if (selectedDelivery.status_id === 22) {
        nextStatus = 25; // LOA goes directly to Division Chief
      }

      // Handle special cases for Phase 3 to Phase 4 transition

      if (selectedDelivery.status_id === 25) {
        nextStatus = 28; // Division Chief approval → Payment Pending (Phase 4)

        // Ensure LOA and IAR documents are available for payment phase
        // These documents are required for Voucher Verification

        // Check if IAR document exists, if not, warn the user
        const iarData = await fetchIARByDelivery(selectedDelivery.id);
        if (!iarData || Object.keys(iarData).length === 0) {
          alert(
            "Warning: No IAR document found. IAR is required for the payment phase.",
          );
        }

        // Check if LOA document exists, if not, warn the user
        const loaData = await fetchLOAByDelivery(selectedDelivery.id);
        if (!loaData || Object.keys(loaData).length === 0) {
          alert(
            "Warning: No LOA document found. LOA is required for the payment phase.",
          );
        }
      }

      // Normal sequential progression for all other statuses

      // 18→19→20→21→22→25→28→(Phase 4) - DV (23) and End-User Forward (24) are skipped
      // Phase 3: Delivery (18-25) → Phase 4: Payment (28–36, no budget step 31)

      // Status validation for debugging

      // Update delivery status

      try {
        const result = await updateDeliveryStatusOnly(
          selectedDelivery.id,
          nextStatus,
        );

        // Status update successful
      } catch (directError: any) {
        alert(`Status update failed: ${directError.message}`);

        return;
      }

      // Continue with normal flow

      const payload: any = {
        dr_no: drNo || null,

        notes: notes || null,
      };

      // Update delivery record with additional fields

      // Update the main delivery record with DR No., SOA No., and notes

      try {
        const updatedDelivery = await updateDelivery(
          selectedDelivery.id,
          payload,
        );

        // Delivery record updated successfully
      } catch (deliveryError: any) {
        alert(`Failed to update delivery record: ${deliveryError.message}`);

        return;
      }

      // Insert remark if notes are provided

      if (notes) {
        try {
          await insertDeliveryProcessRemark(
            selectedDelivery.id,

            currentUser?.role_id || null,

            notes,

            statusFlag ? getFlagId(statusFlag) : null,

            "delivery",
          );
        } catch (remarkError: any) {
          // Continue even if remark fails
        }
      }

      // Save document data whenever it's provided

      // Save document data if provided

      // Check if LOA and DV objects have any actual data

      const hasIarData = iar && Object.keys(iar).length > 0;

      const hasLoaData = loa && Object.keys(loa).length > 0;

      const hasDvData = dv && Object.keys(dv).length > 0;

      // Check document data existence

      if (hasIarData) {
        await upsertIARByDelivery(selectedDelivery.id, iar);
      } else {
        // No IAR data to save
      }

      if (hasLoaData) {
        await upsertLOAByDelivery(selectedDelivery.id, loa);
      } else {
        // No LOA data to save
      }

      if (hasDvData) {
        await upsertDVByDelivery(selectedDelivery.id, dv);
      } else {
        // No DV data to save
      }

      // Document saving complete

      // Refresh deliveries list first

      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setDeliveries(filterDeliveryData(data) as DeliveryRow[]);

      // Then clear form state and close modal

      setProcessModalOpen(false);

      setDrNo("");

      setNotes("");

      setIar(null);

      setLoa(null);

      setDv(null);

      setStatusFlag(null);
    } catch (e: any) {
      alert(e?.message ?? "Failed to process delivery.");
    }
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    const { data } = await supabase
      .from("deliveries")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setDeliveries(filterDeliveryData(data) as DeliveryRow[]);
  };

  const handleOpenProcessModal = async (delivery: DeliveryRow) => {
    // Proceed with normal modal flow for all statuses

    setSelectedDelivery(delivery);

    setDrNo(delivery.dr_no ?? "");

    setNotes(delivery.notes ?? "");

    setStatusFlag(null);

    // Load document data when opening modal (don't reset existing data first)

    const [iarDoc, loaDoc, dvDoc] = await Promise.all([
      fetchIARByDelivery(delivery.id),

      fetchLOAByDelivery(delivery.id),

      fetchDVByDelivery(delivery.id),
    ]);

    setIar(iarDoc);

    setLoa(loaDoc);

    setDv(dvDoc);

    setProcessModalOpen(true);
  };

  const handleOpenDeleteModal = (delivery: DeliveryRow) => {
    setSelectedDelivery(delivery);

    setDeleteModalOpen(true);
  };

  const handlePreviewDocument = async (type: "iar" | "loa") => {
    if (!selectedDelivery) return;

    try {
      console.log("=== HANDLE PREVIEW DOCUMENT ===");

      console.log("Type:", type);

      console.log("Selected delivery:", selectedDelivery);

      setDefaultViewTab(type);

      // Fetch PO data if not already loaded

      if (!poData && selectedDelivery.po_id) {
        console.log("Fetching PO data...");

        const po = await fetchPODataForDelivery(selectedDelivery.po_id);

        if (po) {
          setPoData(po);

          console.log("PO data set:", po);
        }
      }

      // ALWAYS fetch ALL document data from database for View modal

      console.log("Fetching ALL document data from database...");

      const iarDoc = await fetchIARByDelivery(selectedDelivery.id);

      console.log("Fetched IAR:", iarDoc);

      setIarData(iarDoc);

      const loaDoc = await fetchLOAByDelivery(selectedDelivery.id);

      console.log("Fetched LOA:", loaDoc);

      setLoaData(loaDoc);

      const dvDoc = await fetchDVByDelivery(selectedDelivery.id);

      console.log("Fetched DV:", dvDoc);

      setDvData(dvDoc);

      console.log("=== ALL DOCUMENT DATA FETCHED ===");

      console.log("IAR data:", iarDoc);

      console.log("LOA data:", loaDoc);

      console.log("DV data:", dvDoc);

      setViewModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch document:", error);

      alert("Failed to load document preview.");
    }
  };

  const getDueDateStatus = (expectedDate: string | null) => {
    if (!expectedDate) return null;

    const now = new Date();

    const expected = new Date(expectedDate);

    const diffDays = Math.floor(
      (expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return {
        status: "past-due",
        label: "Past Due",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
      };
    } else if (diffDays <= 3) {
      return {
        status: "near-due",
        label: "Near Due",
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
      };
    } else {
      return {
        status: "on-track",
        label: "On Track",
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
      };
    }
  };

  const getElapsedTime = (date: string | null) => {
    if (!date) return null;

    const now = new Date();

    const past = new Date(date);

    const diffMs = now.getTime() - past.getTime();

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";

    if (diffDays === 1) return "Yesterday";

    if (diffDays < 7) return `${diffDays} days ago`;

    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getTimeUntilDelivery = (expectedDate: string | null) => {
    if (!expectedDate) return null;

    const now = new Date();

    const expected = new Date(expectedDate);

    const diffMs = expected.getTime() - now.getTime();

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";

    if (diffDays === 1) return "Tomorrow";

    if (diffDays > 0 && diffDays <= 7) return `in ${diffDays} days`;

    if (diffDays > 7 && diffDays <= 30)
      return `in ${Math.floor(diffDays / 7)} weeks`;

    if (diffDays > 30) return `in ${Math.floor(diffDays / 30)} months`;

    // Handle past dates

    const pastDays = Math.abs(diffDays);

    if (pastDays === 1) return "1 day ago";

    if (pastDays <= 7) return `${pastDays} days ago`;

    if (pastDays <= 30) return `${Math.floor(pastDays / 7)} weeks ago`;

    return `${Math.floor(pastDays / 30)} months ago`;
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(field === "created_at" ? "desc" : "asc");
    }

    setCurrentPage(1);
  };

  // Get defined status IDs for filtering completed deliveries
  const definedStatusIds = Object.keys(STATUS_CFG).map((id) => Number(id));

  const filteredDeliveries = deliveries

    .filter((delivery) => {
      const matchSearch =
        delivery.delivery_no
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        delivery.po_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (delivery.supplier || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const tabStatuses = SUB_TAB_STATUS_MAP[subTab];

      const matchTab =
        subTab === "all" || 
        (subTab === "completed" && !definedStatusIds.includes(delivery.status_id)) ||
        (subTab !== "completed" && tabStatuses.includes(delivery.status_id));

      const matchStatus =
        statusFilter === null || delivery.status_id === statusFilter;

      const matchSection =
        sectionFilter === null || delivery.office_section === sectionFilter;

      return matchSearch && matchTab && matchStatus && matchSection;
    })

    .sort((a, b) => {
      const dateField = sortBy === "created_at" ? "created_at" : "updated_at";

      const aVal = a[dateField] ? new Date(a[dateField]).getTime() : 0;

      const bVal = b[dateField] ? new Date(b[dateField]).getTime() : 0;

      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeliveries.length / PAGE_SIZE),
  );

  const pagedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const countByStatus = (statuses: number[]) =>
    deliveries.reduce(
      (n, d) => (statuses.includes(d.status_id) ? n + 1 : n),
      0,
    );

  // Count completed deliveries (those not in STATUS_CFG, which are payment phase/completed)
  const countCompleted = () => {
    return deliveries.reduce(
      (n, d) => (!definedStatusIds.includes(d.status_id) ? n + 1 : n),
      0,
    );
  };

  const STAT_CARDS = [
    {
      label: "Total",
      value: deliveries.length,
      icon: <RiFileListLine size={20} />,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      numColor: "text-emerald-600",
      cardBg: "bg-emerald-50",
      border: "border-emerald-100",
    },

    {
      label: "Waiting",
      value: countByStatus([18]),
      icon: <RiTimeLine size={20} />,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      numColor: "text-yellow-600",
      cardBg: "bg-yellow-50",
      border: "border-yellow-100",
    },

    {
      label: "Received",
      value: countByStatus([19]),
      icon: <RiTruckLine size={20} />,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      numColor: "text-orange-600",
      cardBg: "bg-orange-50",
      border: "border-orange-100",
    },

    {
      label: "Inspection",
      value: countByStatus([20, 21]),
      icon: <RiEyeLine size={20} />,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      numColor: "text-teal-600",
      cardBg: "bg-teal-50",
      border: "border-teal-100",
    },

    {
      label: "Acceptance",
      value: countByStatus([22, 23, 24]),
      icon: <RiCheckLine size={20} />,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      numColor: "text-blue-600",
      cardBg: "bg-blue-50",
      border: "border-blue-100",
    },

    {
      label: "Completed",
      value: countCompleted(),
      icon: <RiCheckboxCircleLine size={20} />,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      numColor: "text-green-600",
      cardBg: "bg-green-50",
      border: "border-green-100",
    },
  ];

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span
      className={`inline-flex ml-1 ${sortField === field ? "opacity-100" : "opacity-30"}`}
    >
      {sortField === field && sortDir === "desc" ? (
        <RiArrowDownLine size={12} />
      ) : (
        <RiArrowUpLine size={12} />
      )}
    </span>
  );

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)

    .filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
    )

    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");

      acc.push(p);

      return acc;
    }, []);

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

          <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer h-9 w-28 rounded-xl" />
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm"
              >
                <div className="skeleton-shimmer w-10 h-10 rounded-xl shrink-0" />

                <div className="space-y-1.5 flex-1">
                  <div className="skeleton-shimmer h-3 w-16 rounded" />

                  <div className="skeleton-shimmer h-6 w-10 rounded" />
                </div>
              </div>
            ))}
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
              Delivery Management
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

          {(isAdmin || isSupplyAccount) && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition-colors flex items-center gap-2"
            >
              <RiAddLine size={20} />
              New Delivery
            </button>
          )}
        </div>

        {/* ── TABS ── */}

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
                key: "purchase order",
                label: "Purchase Order",
                href: "/Procurement/PurchaseOrder",
              },

              { key: "delivery", label: "Delivery", href: null },

              {
                key: "payment",
                label: "Payment",
                href: "/Procurement/Payment",
              },
            ] as const
          ).map(({ key, label, href }) => (
            <button
              key={key}
              onClick={() => href && router.push(href)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                key === "delivery"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter Panel */}

        {filterOpen && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-50">
                <label className="block text-xs font-bold text-gray-500 mb-2">
                  STATUS
                </label>

                <select
                  value={statusFilter ?? ""}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">All Statuses</option>

                  {statuses

                    .filter((s) => {
                      // Only show Phase 3 delivery statuses (18-25) plus system statuses

                      const deliveryStatuses = [18, 19, 20, 21, 22, 23, 24, 25];

                      const systemStatuses = [27]; // Cancelled

                      return (
                        deliveryStatuses.includes(s.id) ||
                        systemStatuses.includes(s.id)
                      );
                    })

                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.status_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex-1 min-w-50">
                <label className="block text-xs font-bold text-gray-500 mb-2">
                  SECTION
                </label>

                <select
                  value={sectionFilter ?? ""}
                  onChange={(e) => setSectionFilter(e.target.value || null)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">All Sections</option>

                  {Array.from(
                    new Set(
                      deliveries.map((d) => d.office_section).filter(Boolean),
                    ),
                  ).map((section) => (
                    <option key={section} value={section ?? ""}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-50">
                <label className="block text-xs font-bold text-gray-500 mb-2">
                  SORT BY
                </label>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "created_at" | "updated_at")
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="created_at">Date Created</option>

                  <option value="updated_at">Last Updated</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter(null);
                    setSectionFilter(null);
                    setSortBy("created_at");
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards */}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAT_CARDS.map(
            ({
              label,
              value,
              icon,
              iconBg,
              iconColor,
              numColor,
              cardBg,
              border,
            }) => (
              <div
                key={label}
                className={`${cardBg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}
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

        {/* Table Panel */}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 max-w-6xl mx-auto">
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-800 shrink-0">
                All Deliveries
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
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                    filterOpen
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Filters
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {SUB_TAB_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setSubTab(value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                    subTab === value
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RiFileListLine size={38} className="opacity-30 mb-3" />

              <p className="text-sm font-medium">No deliveries found.</p>

              <p className="text-xs mt-1">
                Try adjusting your search or filter.
              </p>
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

                        { label: "Status", field: null, align: "text-center" },

                        {
                          label: "Expected Delivery",
                          field: null,
                          align: "text-left",
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
                        bg: "bg-emerald-100",
                        text: "text-emerald-900",
                        label: "Completed",
                      };

                      const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";

                      const canProcess = canRoleProcess(
                        currentUser?.role_id || 0,
                        delivery.status_id,
                      );

                      // Debug process button permissions

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

                          <td
                            className={`px-2 py-2 whitespace-nowrap ${rowBg}`}
                          >
                            {(() => {
                              const dueStatus = getDueDateStatus(
                                delivery.expected_delivery_date,
                              );

                              const timeUntilDelivery = getTimeUntilDelivery(
                                delivery.expected_delivery_date,
                              );

                              if (!delivery.expected_delivery_date) {
                                return <span className="text-gray-300">—</span>;
                              }

                              return (
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-600">
                                    {new Date(
                                      delivery.expected_delivery_date,
                                    ).toLocaleDateString("en-PH", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>

                                  {dueStatus && (
                                    <span
                                      className={`text-xs font-semibold ${dueStatus.color}`}
                                    >
                                      {dueStatus.label} ({timeUntilDelivery})
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedDelivery(delivery);

                                  setDefaultViewTab("iar");

                                  handlePreviewDocument("iar");
                                }}
                                className="px-2 py-1 text-xs font-semibold rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                              >
                                <RiEyeLine size={14} />
                                View
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedDelivery(delivery);
                                  setRemarksModalOpen(true);
                                }}
                                className="px-2 py-1 text-xs font-semibold rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                              >
                                <RiChat3Line size={14} />
                                Remarks
                              </button>

                              {canProcess && (
                                <button
                                  onClick={() => {
                                    handleOpenProcessModal(delivery);
                                  }}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiPlayCircleLine size={14} />
                                  Process
                                </button>
                              )}

                              {(isAdmin || isSupplyAccount) && (
                                <button
                                  onClick={() =>
                                    handleOpenDeleteModal(delivery)
                                  }
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all whitespace-nowrap"
                                >
                                  <RiDeleteBinLine size={12} />
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
                <p className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(currentPage * PAGE_SIZE, filteredDeliveries.length)}{" "}
                  of {filteredDeliveries.length} entries
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <RiArrowLeftLine size={14} />
                  </button>

                  {pageNums.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => typeof p === "number" && setCurrentPage(p)}
                      disabled={typeof p !== "number"}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                        currentPage === p
                          ? "bg-emerald-700 text-white"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      } ${typeof p !== "number" ? "cursor-default" : ""}`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <RiArrowRightLine size={14} />
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* View Modal */}

      <ViewDeliveryModal
        visible={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        delivery={selectedDelivery}
        iar={iarData}
        loa={loaData}
        poData={poData}
        defaultTab={defaultViewTab}
      />

      {/* Create Modal */}

      <CreateDeliveryModal
        visible={createModalOpen}
        poOptions={poCandidates}
        selectedPoId={selectedPoId}
        setSelectedPoId={setSelectedPoId}
        poActiveIds={poIdsWithActiveDelivery}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateDelivery}
      />

      {/* Process Modal */}

      <ProcessDeliveryModal
        visible={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        onSubmit={handleProcessDelivery}
        active={selectedDelivery}
        statusLabel={STATUS_CFG[selectedDelivery?.status_id ?? 18]?.label ?? ""}
        drNo={drNo}
        setDrNo={setDrNo}
        notes={notes}
        setNotes={setNotes}
        iar={iar}
        setIar={setIar}
        loa={loa}
        setLoa={setLoa}
        dv={dv}
        setDv={setDv}
        poData={poData}
        statusFlag={statusFlag}
        onPressStatusFlag={() => setFlagPickerOpen(true)}
        flagPickerOpen={flagPickerOpen}
        onCloseFlagPicker={() => setFlagPickerOpen(false)}
        onSelectStatusFlag={setStatusFlag}
        onPreviewIAR={() => handlePreviewDocument("iar")}
        onPreviewLOA={() => handlePreviewDocument("loa")}
      />

      {/* Delete Modal */}

      <DeleteDeliveryModal
        visible={deleteModalOpen}
        deliveryId={selectedDelivery?.id ?? null}
        deliveryNo={selectedDelivery?.delivery_no ?? null}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={handleDeleteDelivery}
        roleId={currentUser?.role_id}
      />

      {/* Remarks Modal */}

      <RemarksModal
        visible={remarksModalOpen}
        deliveryId={selectedDelivery?.id ?? null}
        onClose={() => setRemarksModalOpen(false)}
      />
    </div>
  );
}
