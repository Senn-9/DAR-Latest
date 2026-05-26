"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import ViewPRModal from "@/components/Viewprmodal";
import CanvassLivePreview from "@/components/Canvassing/CanvassLivePreview";
import BACRESO from "@/components/BACResolution/BACRESO";
import LivePreview from "@/components/test/livePreview";

type PRRow = {
	id: number;
	pr_no: string;
	office_section: string;
	created_at: string;
};

type PreviewType = "canvass" | "bacreso" | "live" | null;

export default function FilesPage() {
	const router = useRouter();
	const supabase = useMemo(() => createClient(), []);

	const [rows, setRows] = useState<PRRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [dateSortDir, setDateSortDir] = useState<"asc" | "desc">("desc");
	const PAGE_SIZE = 10;

	const [viewPrId, setViewPrId] = useState<number | null>(null);
	const [selectedPrNo, setSelectedPrNo] = useState("");
	const [openPreview, setOpenPreview] = useState<PreviewType>(null);
	const [roleChecked, setRoleChecked] = useState(false);
	const [authorized, setAuthorized] = useState(false);

	useEffect(() => {
		const storedUser = localStorage.getItem("currentUser");
		if (!storedUser) {
			router.replace("/");
			setRoleChecked(true);
			return;
		}

		try {
			const user = JSON.parse(storedUser) as { role_id?: number };
			if (user?.role_id === 3) {
				setAuthorized(true);
			} else {
				router.replace("/Dashboard");
			}
		} catch {
			router.replace("/");
		} finally {
			setRoleChecked(true);
		}
	}, [router]);

	useEffect(() => {
		if (!authorized) return;

		const fetchPurchaseRequests = async () => {
			setLoading(true);
			try {
				const { data, error } = await supabase
					.from("purchase_requests")
					.select("id, pr_no, office_section, created_at")
					.eq("status_id", 37)
					.order("created_at", { ascending: false });

				if (error) throw error;

				const mappedRows = (data || [])
					.filter((row) => !!row.pr_no)
					.map((row) => ({
						id: row.id as number,
						pr_no: row.pr_no as string,
						office_section: (row.office_section as string) || "N/A",
						created_at: (row.created_at as string) || "",
					}));

				setRows(mappedRows);
			} catch (error) {
				console.error("Error loading purchase requests:", error);
				setRows([]);
			} finally {
				setLoading(false);
			}
		};

		void fetchPurchaseRequests();
	}, [authorized, supabase]);

	const openByType = (prNo: string, type: Exclude<PreviewType, null>) => {
		setSelectedPrNo(prNo);
		setOpenPreview(type);
	};

	const closePreviews = () => {
		setOpenPreview(null);
		setSelectedPrNo("");
	};

	const filteredRows = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return rows;
		return rows.filter(
			(row) =>
				row.pr_no.toLowerCase().includes(term) ||
				(row.office_section || "").toLowerCase().includes(term)
		);
	}, [rows, search]);

	const sortedRows = useMemo(() => {
		return [...filteredRows].sort((a, b) => {
			const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
			const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
			return dateSortDir === "asc" ? aTime - bTime : bTime - aTime;
		});
	}, [filteredRows, dateSortDir]);

	useEffect(() => {
		setCurrentPage(1);
	}, [search]);

	const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
	const safePage = Math.min(currentPage, totalPages);
	const startIndex = (safePage - 1) * PAGE_SIZE;
	const paginatedRows = sortedRows.slice(startIndex, startIndex + PAGE_SIZE);
	const shownCount = paginatedRows.length;
	const firstItem = sortedRows.length === 0 ? 0 : startIndex + 1;
	const lastItem = sortedRows.length === 0 ? 0 : startIndex + shownCount;

	const formatDate = (value: string) => {
		if (!value) return "N/A";
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return parsed.toLocaleDateString("en-PH", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	if (!roleChecked || !authorized) {
		return null;
	}

	return (
		<AuthGuard>
			<main className="p-6 sm:p-8">
				<div className="mx-auto w-full max-w-6xl rounded-2xl border border-gray-200 bg-white shadow-sm">
					<div className="border-b border-gray-200 px-6 py-4">
						<h1 className="text-xl font-semibold text-gray-900">Files Preview Table</h1>
						<p className="mt-1 text-sm text-gray-500">
							Select a PR number and open any preview document.
						</p>
						<div className="mt-3 max-w-sm">
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search PR number or section..."
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
							/>
						</div>
						<p className="mt-3 text-sm text-gray-600">
							Showing {firstItem}-{lastItem} of {filteredRows.length} PRs ({shownCount} on this page)
						</p>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
										PR Number
									</th>
									<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
										Section
									</th>
									<th
										onClick={() => {
											setDateSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
											setCurrentPage(1);
										}}
										className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 cursor-pointer select-none"
									>
										Creation Date {dateSortDir === "asc" ? "↑" : "↓"}
									</th>
									<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
										Preview Buttons
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{loading ? (
									<tr>
										<td colSpan={4} className="px-6 py-8 text-sm text-gray-500">
											Loading purchase requests...
										</td>
									</tr>
								) : filteredRows.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-6 py-8 text-sm text-gray-500">
											No matching PR number found.
										</td>
									</tr>
								) : (
									paginatedRows.map((row) => (
										<tr key={row.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 text-sm font-medium text-gray-900">{row.pr_no}</td>
											<td className="px-6 py-4 text-sm text-gray-700">{row.office_section}</td>
											<td className="px-6 py-4 text-sm text-gray-700">{formatDate(row.created_at)}</td>
											<td className="px-6 py-4">
												<div className="flex flex-wrap gap-2">
													<button
														onClick={() => setViewPrId(row.id)}
														className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
													>
														PR
													</button>
													<button
														onClick={() => openByType(row.pr_no, "canvass")}
														className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
													>
														Canvass
													</button>
													<button
														onClick={() => openByType(row.pr_no, "bacreso")}
														className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
													>
														Resolution
													</button>
													<button
														onClick={() => openByType(row.pr_no, "live")}
														className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
													>
														AOA
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{!loading && filteredRows.length > 0 && (
						<div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
							<p className="text-sm text-gray-600">
								Page {safePage} of {totalPages}
							</p>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={safePage === 1}
									className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Previous
								</button>
								<button
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={safePage === totalPages}
									className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</div>

				{viewPrId !== null && (
					<ViewPRModal prId={viewPrId} onClose={() => setViewPrId(null)} onEdit={() => {}} />
				)}

				<CanvassLivePreview
					open={openPreview === "canvass"}
					onClose={closePreviews}
					prNo={selectedPrNo}
				/>

				<BACRESO open={openPreview === "bacreso"} onClose={closePreviews} prNo={selectedPrNo} />

				<LivePreview open={openPreview === "live"} onClose={closePreviews} prNo={selectedPrNo} />
			</main>
		</AuthGuard>
	);
}
