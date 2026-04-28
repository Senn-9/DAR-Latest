"use client"

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // Changed from useSelectedLayoutSegment
import { RiDashboardLine, RiFileList3Line, RiMoneyDollarCircleLine, RiFileTextLine } from "react-icons/ri";
import { MdLogout } from "react-icons/md";
import SignoutModal from "@/components/SignOutModal";

type CurrentUser = {
  fullname: string;
  username: string;
  role_id: number;
  divisions?: { division_name: string };
  roles?: { role_name: string };
}

// This layout is shared across all pages in the Purchase Order section
export default function Layout({ children }: { children: ReactNode }) {
  const baseButtons = [
    { id: "dashboard", icon: RiDashboardLine, label: "Dashboard", href: "/Dashboard" },
    { id: "procurement", icon: RiFileList3Line, label: "Procurement", href: "/Procurement" },
    { id: "purchase-order", icon: RiFileList3Line, label: "Purchase Order", href: "/PurchaseOrder" },
    { id: "budget", icon: RiMoneyDollarCircleLine, label: "Budget", href: "/Budget" },
    { id: "logs", icon: RiFileTextLine, label: "Procurement Logs", href: "/Logs" },
  ];

  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [signoutModalOpen, setSignoutModalOpen] = useState(false);
  const buttons =
    currentUser?.role_id === 1
      ? [
          ...baseButtons,
          { id: "user-management", icon: RiFileList3Line, label: "User Management", href: "/UserManagement" },
        ]
      : baseButtons;

  useEffect(() => {
    // Load stored user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
    }
  }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="text-lg bg-emerald-900 p-4 text-white w-80 flex flex-col h-screen overflow-hidden">
        
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center">
            <img src="/logo.png" alt="logo" className="w-25 h-25 mb-4 rounded-full" />
          </div>

          <p className="text-center text-white font-bold text-lg">DAR Procurement</p>
          <p className="text-center text-emerald-300/90 text-sm mb-6">Monitoring and Automation System</p>

          <div className="border border-emerald-800 mb-6 rounded-full"> </div>

          {buttons.map((btn) => {
            // Check if the current URL starts with the button's href
            // We use toLowerCase() to avoid case-sensitivity issues
            const isActive = pathname.toLowerCase().startsWith(btn.href.toLowerCase());

            return (
              <Link key={btn.id} href={btn.href}>
                <button
                  className={`
                    mb-2 h-15 pl-4 w-full text-left flex items-center gap-2
                    transition-all duration-200
                    ${
                      isActive
                        ? "rounded-full bg-white/10"
                        : "rounded-full hover:bg-white/10"
                    }
                  `}
                >
                  <btn.icon /> {btn.label}
                </button>
              </Link>
            );
          })}

          {currentUser && (
            <div className="border-t-1 border-emerald-700 bg-white/10 rounded-xl p-4 mb-2 mt-6">
              <div className="flex flex-row items-center gap-3">
                <div className="text-white w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-2xl font-bold">
                  {currentUser.fullname.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <p className="text-white ">{currentUser.fullname}</p>
                </div>
              </div>

              <div className="border-t-1 border-emerald-700 mt-3 mb-3"></div>

              <div className="flex flex-row justify-between">
                <p className="text-sm font-semibold text-emerald-500">ROLE:</p>
                <p className="text-sm text-white">{currentUser.roles?.role_name || "N/A"}</p>
              </div>

              <div className="flex flex-row justify-between">
                <p className="text-sm font-semibold text-emerald-500">DIVISION:</p>
                <p className="text-sm text-white">{currentUser.divisions?.division_name || "N/A"}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setSignoutModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-red-400/20 bg-red-500/20 text-red-400 rounded-xl hover:text-white hover:bg-red-500 transition-colors mb-4"
          >
            <MdLogout />
            Sign Out
          </button>
        </div>


        <SignoutModal 
          open={signoutModalOpen}
          onClose={() => setSignoutModalOpen(false)}
        />

        <div className="pt-5"> </div>
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
