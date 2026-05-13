"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RiErrorWarningLine, RiHome5Line, RiLoginCircleLine } from "react-icons/ri";

type DatabaseUser = {
  id: number;
  fullname: string;
  username: string;
};

export default function NotFound() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as DatabaseUser;
        setIsAuthenticated(true);
        setUserName(user.fullname || user.username);
      } catch (error) {
        console.error("Error parsing user data:", error);
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  }, []);

  const handleRedirect = () => {
    if (isAuthenticated) {
      router.push("/Dashboard");
    } else {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <RiErrorWarningLine className="text-white" size={48} />
            </div>
            <h1 className="text-6xl font-bold text-white mb-2">404</h1>
            <p className="text-white/90 text-lg font-semibold">Page Not Found</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {isAuthenticated ? (
              <>
                <p className="text-gray-600 text-center mb-2">
                  Hey <span className="font-semibold text-gray-900">{userName}</span>!
                </p>
                <p className="text-gray-600 text-center mb-6">
                  The page you're looking for doesn't exist or you don't have access to it.
                </p>
                <button
                  onClick={handleRedirect}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <RiHome5Line size={20} />
                  Go to Dashboard
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-center mb-6">
                  You need to be logged in to access this page. Please sign in to continue.
                </p>
                <button
                  onClick={handleRedirect}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <RiLoginCircleLine size={20} />
                  Sign In
                </button>
              </>
            )}

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                If you believe this is an error, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>

        {/* Helpful Links */}
        {isAuthenticated && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">Quick Links:</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => router.push("/Procurement")}
                className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
              >
                Procurement
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => router.push("/PurchaseOrder")}
                className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
              >
                Purchase Orders
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => router.push("/Budget")}
                className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
              >
                Budget
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
