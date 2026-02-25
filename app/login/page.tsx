"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BsEye } from "react-icons/bs";
import { RiEyeOffLine } from "react-icons/ri";


export default function Login() {

  const [showPassword, setShowPassword] = useState(false);


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-md p-8 flex flex-col items-center justify-center border border-gray-200">
        <h1 className="text-gray-800 text-center text-lg lg:text-3xl font-bold mb-6">
          Procurement Workflow Monitoring and Document System
        </h1>

        <input
          type="text"
          placeholder="Username"
          className="hover:shadow-md hover:scale-105 w-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 border border-gray-300 p-2 pl-5 rounded-full mb-4"
        />

        <div className="relative w-xs">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="hover:shadow-md hover:scale-105 w-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 border border-gray-300 p-2 pl-5 rounded-full"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute text-sm right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:scale-105 hover:text-gray-700"
          >
            {showPassword ? <BsEye size={18} /> : <RiEyeOffLine size={18} />}
          </button>
        </div>
        
        <button className="hover:shadow-md rounded-full w-xs bg-blue-600 text-white font-semibold p-3 mt-6 hover:bg-blue-700 transition-colors hover:scale-105">
          Sign In
        </button>
      </div>
    </div>
  );
}