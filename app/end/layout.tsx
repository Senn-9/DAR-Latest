"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RiCloseLine, RiMenuLine, RiDashboardLine, RiFileList3Line,
  RiMoneyDollarCircleLine, RiCalendarLine, RiFileTextLine,
  RiSearchLine, RiCalendar2Line, RiArrowLeftSLine, RiArrowRightSLine,
  RiBellLine
} from "react-icons/ri";

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/end", icon: <RiDashboardLine size={25} /> },
  { id: "procurement", label: "Procurement", href: "/end/procurement", icon: <RiFileList3Line size={25} /> },
  { id: "budget", label: "Budget", href: "/end/budget", icon: <RiMoneyDollarCircleLine size={25} /> },
  { id: "calendar", label: "Calendar", href: "/end/calendar", icon: <RiCalendarLine size={25} /> },
  { id: "access logs", label: "Access Logs", href: "/end/accessLogs", icon: <RiFileTextLine size={25} /> },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function CalendarModal({ onClose }: { onClose: () => void }) {
  const today = new Date();
  const [current, setCurrent] = useState({ month: today.getMonth(), year: today.getFullYear() });

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const prevMonth = () => setCurrent(c =>
    c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year }
  );
  const nextMonth = () => setCurrent(c =>
    c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year }
  );

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>

        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <RiCloseLine size={18} />
        </button>

        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <RiArrowLeftSLine size={20} />
          </button>
          <h2 className="font-semibold text-gray-800 text-base">
            {MONTHS[current.month]} {current.year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <RiArrowRightSLine size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            const isToday =
              day === today.getDate() &&
              current.month === today.getMonth() &&
              current.year === today.getFullYear();
            return (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button className={`w-8 h-8 rounded-full text-sm transition-colors
                    ${isToday ? "bg-emerald-700 text-white font-bold" : "text-gray-700 hover:bg-emerald-100 hover:text-emerald-700"}`}>
                    {day}
                  </button>
                ) : <span />}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setCurrent({ month: today.getMonth(), year: today.getFullYear() })}
            className="px-4 py-1.5 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Overlay (mobile only) */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Calendar Modal */}
      {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} />}

      {/* Sidebar — fixed, never scrolls with page */}
      <aside className={`
        pt-10 fixed top-0 left-0 h-screen w-70 bg-emerald-900 shadow-slate-500 shadow-md
        text-lg z-30 overflow-y-auto transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:flex md:flex-col md:shrink-0
      `}>
        <div className="flex items-center gap-3 px-6 mb-4">
          <img src="/logo.png" alt="logo" className="w-10 h-10 object-cover rounded-full" />
          <span className="text-white font-bold text-lg">DAR Procurement</span>
        </div>

        <hr className="border-t border-emerald-800 mb-6" />

        <nav className="flex flex-col gap-1 pr-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { router.push(item.href); setIsOpen(false); }}
              className={`flex items-center gap-4 pl-6 py-3 text-left rounded-r-lg transition-colors duration-200
                ${pathname === item.href
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-emerald-100 hover:text-emerald-700"
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Right side — takes remaining width, scrolls independently */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-0 overflow-hidden">

        {/* Topbar — sticky at top */}
        <header className="shrink-0 w-full bg-white px-4 md:px-6 py-3 flex items-center gap-2 sticky top-0 z-10 shadow-sm">

          {/* Hamburger (mobile only) */}
          <button
            className="md:hidden text-gray-700 shrink-0 mr-1"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <RiCloseLine size={24} /> : <RiMenuLine size={24} />}
          </button>

          {/* Topbar bordered container */}
          <div className="flex flex-1 items-center border border-stone-200 rounded-lg overflow-hidden divide-x divide-stone-200">

            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-2 flex-1">
              <RiSearchLine className="text-gray-400 shrink-0" size={16} />
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent focus:outline-none text-sm text-gray-600 w-full"
              />
            </div>

            {/* Date */}
            <button
              onClick={() => setShowCalendar(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              <RiCalendar2Line size={16} className="text-gray-500" />
              <span className="text-sm hidden sm:inline">{today}</span>
            </button>

            {/* Notification bell */}
            <button className="flex items-center justify-center px-4 py-2 text-gray-500 hover:bg-gray-50 transition-colors shrink-0">
              <RiBellLine size={18} />
            </button>

          </div>
        </header>

        {/* Page content — this is the only thing that scrolls */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

      </div>
    </div>
  );
}
