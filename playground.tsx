"use client"

import { useState } from "react";
import { RiMenuLine, RiCloseLine } from "react-icons/ri";

export default function Layout() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen">

      {/* Overlay (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-70 bg-white shadow-lg z-30 p-6 min-h-screen transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
        <h2 className="text-lg font-semibold mb-6">My App</h2>
        <nav className="flex flex-col gap-0 mt-50">
          <a href="#" className="hover:rounded-md hover:border py-5 border-black text-lg font-semibold pl-10 text-gray-700 hover:text-blue-500">Dashboard</a>
          <a href="#" className="hover:rounded-md hover:border py-5 border-black text-lg font-semibold pl-10 text-gray-700 hover:text-blue-500">Procurement</a>
          <a href="#" className="hover:rounded-md hover:border py-5 border-black text-lg font-semibold pl-10 text-gray-700 hover:text-blue-500">Budget</a>
          <a href="#" className="hover:rounded-md hover:border py-5 border-black text-lg font-semibold pl-10 text-gray-700 hover:text-blue-500">Calendar</a>
          <a href="#" className="hover:rounded-md hover:border py-5 border-black text-lg font-semibold pl-10 text-gray-700 hover:text-blue-500">Access Logs</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">

        {/* Hamburger button (mobile only) */}
        <button
          className="md:hidden mb-4 text-gray-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <RiCloseLine size={24} /> : <RiMenuLine size={24} />}
        </button>

        <h1 className="text-black text-xl font-bold">Main Content</h1>
      </main>

    </div>
  );
}