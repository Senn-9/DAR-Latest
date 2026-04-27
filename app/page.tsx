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
    <div className="min-h-screen bg-gray-100 flex flex-col">
   
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="DAR Logo" 
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold mb-8 text-center text-gray-800">
            Department of Agrarian Reform
          </h1>
        
          {/* System Title */}
            <h3 className="text-sm mb-8 text-center text-gray-800">
            Procurement Monitoring and Document System
          </h3>

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
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full mt-2 px-4 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}