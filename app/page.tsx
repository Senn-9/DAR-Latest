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
    <div className="min-h-screen bg-emerald-900 flex flex-col items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');
        * { font-family: 'Sora', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-emerald-800 text-3xl font-bold">DAR</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          DAR Procurement
        </h1>
        <p className="text-emerald-200 text-sm font-medium">
          Monitoring &amp; Automation System
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl p-8 md:p-10 w-full max-w-md shadow-2xl">
        {/* Sign In Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Sign In
        </h2>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Username field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all disabled:opacity-50"
            />
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all disabled:opacity-50"
            />
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            className="w-full mt-2 px-4 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            {isLoading ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="animate-spin"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="3"
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

      {/* Footer */}
      <p className="text-emerald-400/60 text-xs mt-8">
        Department of Agrarian Reform Procurement System
      </p>
    </div>
  );
}