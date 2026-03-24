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
  fullname: string;
  username: string;
  password: string;
  role_id: number;
  division_id: number;
  divisions?: Division;
  roles?: Roles;
};

export default function PGPage() {
  const supabase = createClient();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loginUserID, setLoginUserID] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginResult, setLoginResult] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select(`
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
        console.error(error);
        return;
      }

      setUsers(data || []);
    };

    fetchUsers();
  }, []);

  const handleLogin = () => {
    const matchedUser = users.find(
      (user) =>
        user.username === loginUserID && user.password === loginPassword
    );

    if (!matchedUser) {
      console.log("Login failed");
      setLoginResult("Invalid user ID or password");
      return;
    };

    // Store user data in localStorage
    localStorage.setItem('currentUser', JSON.stringify(matchedUser));
    
    router.push("/pg/pg2");
  };

  return (
    <div className="text-black p-6">

      <h1 className="text-xl font-bold mb-4">Mock Login</h1>

      <div className="flex flex-col gap-3 w-64">

        <input
          type="text"
          placeholder="User ID"
          value={loginUserID}
          onChange={(e) => setLoginUserID(e.target.value)}
          className="border p-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          className="border p-2"
        />

        <button
          onClick={handleLogin}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Login
        </button>

        {loginResult && (
          <p className="mt-2 font-medium">{loginResult}</p>
        )}

      </div>

    </div>
  );
}
