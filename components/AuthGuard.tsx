"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DatabaseUser = {
  id: number;
  fullname: string;
  username: string;
  role_id: number;
  division_id: number;
};

type AuthGuardProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: number[]; // Optional: restrict by role_id
  redirectTo?: string; // Where to redirect unauthorized users
};

/**
 * AuthGuard Component
 * 
 * Protects routes from unauthorized access by checking if a user is logged in.
 * Shows a loading screen while checking authentication status.
 * Redirects to login page if no user is found.
 * 
 * @param children - The content to render if authorized
 * @param requireAuth - Whether authentication is required (default: true)
 * @param allowedRoles - Array of role_ids that are allowed to access (optional)
 * @param redirectTo - Custom redirect path for unauthorized users (default: "/")
 */
export function AuthGuard({
  children,
  requireAuth = true,
  allowedRoles,
  redirectTo = "/",
}: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Get user from localStorage
        const storedUser = localStorage.getItem("currentUser");

        // If no authentication is required, grant access
        if (!requireAuth) {
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // If user is not logged in, redirect to login
        if (!storedUser) {
          console.log("[AuthGuard] No user found, redirecting to:", redirectTo);
          router.push(redirectTo);
          return;
        }

        // Parse user data
        const user = JSON.parse(storedUser) as DatabaseUser;
        console.log("[AuthGuard] User found:", user.username, "Role:", user.role_id);

        // Check role restrictions if specified
        if (allowedRoles && allowedRoles.length > 0) {
          if (!allowedRoles.includes(user.role_id)) {
            console.log(
              "[AuthGuard] User role not authorized. Allowed:",
              allowedRoles,
              "User has:",
              user.role_id
            );
            // Redirect based on user role
            if (user.role_id === 1) {
              router.push("/admn");
            } else {
              router.push("/Dashboard");
            }
            return;
          }
        }

        // User is authorized
        console.log("[AuthGuard] User authorized");
        setIsAuthorized(true);
      } catch (error) {
        console.error("[AuthGuard] Error during auth check:", error);
        // On error, redirect to login for safety
        router.push(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, requireAuth, allowedRoles, redirectTo]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authorized, don't render anything (user is being redirected)
  if (!isAuthorized) {
    return null;
  }

  // User is authorized, render the protected content
  return <>{children}</>;
}
