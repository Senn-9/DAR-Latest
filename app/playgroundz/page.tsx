"use client";

import { useState } from "react";

export default function ProcurementPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="text-black">
      {/* Open Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-black rounded"
      >
        New Procurement Request
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          {/* Blurred Background */}
          <div className="absolute inset-0 backdrop-blur-md bg-black/40 z-40" />
          
          {/* Modal Content - click stops propagation */}
          <div
            className="relative bg-white border border-black rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 z-50 text-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-black">Procurement Request Form</h1>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Your form content goes here */}
            <div className="space-y-6">
              {/* pr_form section */}
              <div className="grid grid-cols-2 gap-4 border-b pb-6">
                <input className="border p-2 text-black" placeholder="Entity Name" />
                <input className="border p-2 text-black" placeholder="PR Number" />
                <input className="border p-2 text-black" placeholder="Fund Cluster" />
                <input className="border p-2 text-black" placeholder="Office Section" />
              </div>

              {/* pr_item section */}
              <div className="grid grid-cols-2 gap-4 border-b pb-6">
                <input className="border p-2 text-black" placeholder="Stock Number" />
                <input className="border p-2 text-black" placeholder="Unit" />
                <input className="border p-2 text-black" placeholder="Description" />
                <input className="border p-2 text-black" placeholder="Quantity" />
                <input className="border p-2 text-black" placeholder="Unit Cost" />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border text-black rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Your table stays outside */}
      <div className="p-8 text-black">
        <h2 className="text-xl font-bold mb-4">Purchase Request Overview</h2>
        {/* table code */}
      </div>
    </div>
  );
}