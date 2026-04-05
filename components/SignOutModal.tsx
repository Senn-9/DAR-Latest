"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignoutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignout = () => {
    setLoading(true);
    
    // Clear user data from localStorage
    localStorage.removeItem('currentUser');
    
    // Redirect to login page
    router.push("/");
    
    setLoading(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign Out</h2>
        <p className="text-gray-600 mb-6">Are you sure you want to sign out?</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSignout}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}