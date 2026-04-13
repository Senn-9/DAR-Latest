"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type Division = {
  division_id: number;
  division_name: string;
};

type Roles = {
  role_name: string;
};

type User = {
  id?: number;
  fullname: string;
  username: string;
  password: string;
  role_id: number;
  division_id: number;
  divisions?: Division;
  roles?: Roles;
};

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          fullname,
          username,
          password,
          role_id,
          division_id,
          divisions (
            division_id,
            division_name
          ),
          roles (
            role_name
          )
        `)
        .returns<User[]>();

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setUsers(data || []);
    };

    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const matchedUser = users.find(
      (user) => user.username === username && user.password === password
    );

    if (!matchedUser) {
      setError("Invalid username or password");
      setIsLoading(false);
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(matchedUser));
    setIsLoading(false);
    router.push("/Dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        padding: "1rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "3rem",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#1a4d4d",
            margin: "0 0 0.5rem",
            letterSpacing: "-0.5px",
          }}
        >
          DAR Procurement
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#888888",
            margin: 0,
            fontWeight: "400",
          }}
        >
          Monitoring &amp; Automation System
        </p>
      </div>

      {/* Login Card */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "3rem 2.5rem",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Sign In Title */}
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "#000000",
            textAlign: "center",
            margin: "0 0 2rem",
          }}
        >
          Sign In
        </h2>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "0.5px solid #fecaca",
              borderRadius: "8px",
              padding: "10px 12px",
              marginBottom: "1.5rem",
              fontSize: "13px",
              color: "#dc2626",
              fontWeight: "500",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Username field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#333333",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              style={{
                padding: "12px 16px",
                fontSize: "14px",
                border: "0.5px solid #e5e5e5",
                borderRadius: "8px",
                background: "#f9f9f9",
                color: "#333333",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
                fontFamily: "var(--font-sans)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.background = "#ffffff";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e5e5";
                e.currentTarget.style.background = "#f9f9f9";
              }}
            />
          </div>

          {/* Password field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#333333",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              style={{
                padding: "12px 16px",
                fontSize: "14px",
                border: "0.5px solid #e5e5e5",
                borderRadius: "8px",
                background: "#f9f9f9",
                color: "#333333",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
                fontFamily: "var(--font-sans)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.background = "#ffffff";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e5e5";
                e.currentTarget.style.background = "#f9f9f9";
              }}
            />
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            style={{
              width: "100%",
              padding: "12px 16px",
              marginTop: "1rem",
              fontSize: "16px",
              fontWeight: "600",
              color: "white",
              background: "#0d6b5f",
              border: "none",
              borderRadius: "8px",
              cursor: isLoading || !username.trim() || !password.trim()
                ? "not-allowed"
                : "pointer",
              transition: "all 0.2s ease",
              opacity: isLoading || !username.trim() || !password.trim() ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && username.trim() && password.trim()) {
                e.currentTarget.style.background = "#084d45";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0d6b5f";
            }}
          >
            {isLoading ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    animation: "spin 1s linear infinite",
                  }}
                >
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}