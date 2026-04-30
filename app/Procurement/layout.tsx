"use client"

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiDashboardLine, RiFileList3Line, RiMoneyDollarCircleLine, RiFileTextLine, RiMenuLine, RiCloseLine } from "react-icons/ri";
import { MdLogout } from "react-icons/md";
import SignoutModal from "@/components/SignOutModal";

type CurrentUser = {
  fullname: string;
  username: string;
  role_id: number;
  divisions?: { division_name: string };
  roles?: { role_name: string };
}

export default function Layout({ children }: { children: ReactNode }) {
  const baseButtons = [
    { id: "dashboard", icon: RiDashboardLine, label: "Dashboard", href: "/Dashboard" },
    { id: "procurement", icon: RiFileList3Line, label: "Procurement", href: "/Procurement" },
    { id: "budget", icon: RiMoneyDollarCircleLine, label: "Budget", href: "/Budget" },
    { id: "logs", icon: RiFileTextLine, label: "Procurement Logs", href: "/Logs" },
  ];

  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [signoutModalOpen, setSignoutModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttons =
    currentUser?.role_id === 1
      ? [
          ...baseButtons,
          { id: "user-management", icon: RiFileList3Line, label: "User Management", href: "/UserManagement" },
        ]
      : baseButtons;

  useEffect(() => {
    setMounted(true);
    // Load stored user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
    }
    // Set sidebar open on desktop by default
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-white" suppressHydrationWarning>
      {/* Mobile Sidebar Overlay */}
      {mounted && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 md:w-80 bg-emerald-900 p-4 text-white font-[family-name:var(--font-sora)] antialiased
        flex flex-col transition-all duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        overflow-y-auto
      `}>
        
        {/* Logo Section */}
        <div className="shrink-0 mb-6">
          <div className="flex items-center justify-center">
            <img src="/logo.png" alt="logo" className="w-24 h-24 rounded-full" />
          </div>
          <p className="text-center text-white font-bold text-lg mt-3">DAR Procurement</p>
          <p className="text-center text-emerald-300/90 text-sm">Monitoring and Automation System</p>
          <div className="border border-emerald-800 mt-6 rounded-full" />
        </div>

        {/* Navigation - scrollable if needed */}
        <nav className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {buttons.map((btn) => {
              const isActive = pathname.toLowerCase().startsWith(btn.href.toLowerCase());

              return (
                <Link key={btn.id} href={btn.href} onClick={() => setSidebarOpen(false)}>
                  <button
                    className={`
                      h-12 pl-4 w-full text-left flex items-center gap-3 text-sm font-medium
                      transition-all duration-200 rounded-full
                      ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "hover:bg-white/10 text-emerald-100"
                      }
                    `}
                  >
                    <btn.icon size={20} /> 
                    <span>{btn.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Info - fixed at bottom */}
        <div className="shrink-0 space-y-3">
          {currentUser && (
            <div className="border-t border-emerald-700 bg-white/10 rounded-xl p-4">
              <div className="flex flex-row items-center gap-3 mb-3">
                <div className="text-white w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-xl font-bold shrink-0">
                  {currentUser.fullname.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-white font-medium text-sm truncate">{currentUser.fullname}</p>
                  <p className="text-emerald-200 text-xs">{currentUser.username}</p>
                </div>
              </div>

              <div className="border-t border-emerald-700 mb-3" />

              <div className="space-y-2 text-xs">
                <div className="flex flex-row justify-between">
                  <p className="font-semibold text-emerald-300">ROLE:</p>
                  <p className="text-white text-right">{currentUser.roles?.role_name || "N/A"}</p>
                </div>

                <div className="flex flex-row justify-between">
                  <p className="font-semibold text-emerald-300">DIVISION:</p>
                  <p className="text-white text-right">{currentUser.divisions?.division_name || "N/A"}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setSignoutModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-400/30 bg-red-500/10 text-red-300 rounded-lg hover:bg-red-500 hover:text-white transition-colors duration-200 font-medium text-sm"
          >
            <MdLogout size={18} />
            Sign Out
          </button>

          <SignoutModal 
            open={signoutModalOpen}
            onClose={() => setSignoutModalOpen(false)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header with Menu Toggle */}
        <div className="md:hidden bg-emerald-900 text-white p-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">DAR Procurement</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-emerald-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? <RiCloseLine size={24} /> : <RiMenuLine size={24} />}
          </button>
        </div>

        {/* Content Area - scrollable */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
