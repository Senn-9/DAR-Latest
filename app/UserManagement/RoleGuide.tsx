"use client";

import { RiShieldUserLine } from "react-icons/ri";

export default function RoleGuide() {
  return (
    <div className="space-y-6">
      {/* Admin Role */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine size={24} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Admin</h3>
            <p className="text-sm text-gray-500">System Administrator</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">User Management:</span> Create, edit, and delete user accounts
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Data Deletion:</span> Permanently delete purchase requests, purchase orders, deliveries, and payments entries
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">System Oversight:</span> Full visibility into all procurement activities and user actions
            </p>
          </div>
          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-800">
              Note: The Admin role is primarily focused on managing users and maintaining data integrity through deletion capabilities. Refrain from using the process button as it may lead to conflict of process with other roles within the system.
            </p>
          </div>
        </div>
      </div>

      {/* Division Head Role */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Division Head</h3>
            <p className="text-sm text-gray-500">Department Manager</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">PR Approval:</span> Review and approves purchase requests for their division
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Monitoring:</span> Track procurement activities specific to their division
            </p>
          </div>
           <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-800">
              Note: The Division Head role is primarily focused on the approval of entries solely within their assigned division throughout the system.
            </p>
          </div>
        </div>
      </div>

      {/* BAC Role */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine size={24} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">BAC (Bids and Awards Committee)</h3>
            <p className="text-sm text-gray-500">Procurement Oversight</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">PR Processing:</span> Assigns PR no. and manages the purchase request processing workflow
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Vendor Management:</span> Review and select suppliers for procurement
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Compliance:</span> Ensure procurement follows government regulations
            </p>
          </div>
           <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-800">
              Note: The BAC role is the sole user role that can/should assign a PR no. throughout the system.
            </p>
          </div>
        </div>
      </div>

      {/* PARPO Role */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine size={24} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">PARPO</h3>
            <p className="text-sm text-gray-500">Procurement Coordination</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Workflow Coordination:</span> Oversee the entire procurement process
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Document Review:</span> Review and validate procurement documents
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Process Optimization:</span> Identify and implement process improvements
            </p>
          </div>
           <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-800">
              Note: The PARPO role is primarily focused on entry approval and review throughout the system.
            </p>
          </div>
        </div>
      </div>

      {/* Supply Role */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine size={24} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Supply Officer</h3>
            <p className="text-sm text-gray-500">Inventory & Delivery Management</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">PO Processing:</span> Creates and manages the Purchase Order process
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Delivery Processing:</span> Record and manage item deliveries
            </p>
          </div>
          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-800">
              Note: The Supply Officer role is the sole role that can/should create a PO entry along with assigning a PO no. throughout the system.
            </p>
          </div>
        </div>
      </div>

      {/* Budget Role */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine size={24} className="text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Budget Officer</h3>
            <p className="text-sm text-gray-500">Financial Oversight</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Budget Management:</span> One of the 2 roles that can manage the data in the Budget Management Page
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Cost Analysis:</span> Review and validate procurement costs within the system
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Financial Compliance:</span> Ensures financial accuracy within the system
            </p>
          </div>
          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-800">
              Note: The Budget Officer role is the primary role that can/should input the allocated annual budget for the divisions within the system
            </p>
          </div>
        </div>
      </div>

      {/* Accounting Role */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine size={24} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Accounting Officer</h3>
            <p className="text-sm text-gray-500">Payment Processing</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Payment Processing:</span> Process payments for completed deliveries
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Invoice Verification:</span> Validate supplier invoices against deliveries
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Financial Records:</span> Maintain accurate payment records
            </p>
          </div>
          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-800">
              Note: The Accounting role is focused on processing the and forwarding entries within the system. Payment processing is processed manually.
            </p>
          </div>
        </div>
      </div>

      {/* Cash Role */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine size={24} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Cash Officer</h3>
            <p className="text-sm text-gray-500">Disbursement Management</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Cash Management:</span> Monitor cash flow and liquidity
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Transaction Recording:</span> Record all cash disbursements accurately
            </p>
          </div>
          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-800">
              Note: The Cash role is the sole role is similar to the Accounting role, wherein it is more focused on review and forwarding entries within the systems
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}