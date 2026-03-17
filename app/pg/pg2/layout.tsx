"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { RiDashboardLine, RiFileList3Line, RiMoneyDollarCircleLine, RiFileTextLine } from "react-icons/ri";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [activeButton, setActiveButton] = useState("dashboard");

  const buttons = [
    { id: "dashboard", icon: RiDashboardLine, label: "Dashboard", href: "/pg/pg2" },
    { id: "procurement", icon: RiFileList3Line, label: "Procurement", href: "/pg/pg2/procurement" },
    { id: "budget", icon: RiMoneyDollarCircleLine, label: "Budget", href: "/pg/pg2/budget" },
    { id: "logs", icon: RiFileTextLine, label: "Procurement Logs", href: "/pg/pg2/logs" },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="text-lg bg-emerald-900 p-4 text-white w-80">
        <div className="">
          {buttons.map((btn) => (
            <Link key={btn.id} href={btn.href}>
              <button
                onClick={() => setActiveButton(btn.id)}
                className={`
                  mb-2 h-15 pl-4 w-full text-left flex items-center gap-2
                  transition-all duration-200
                  ${
                    activeButton === btn.id
                      ? "rounded-full bg-emerald-500"
                      : "rounded-full hover:bg-emerald-500"
                  }
                `}
              >
                <btn.icon /> {btn.label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}