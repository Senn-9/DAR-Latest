'use client'
import { useAuthLogic } from '@/hooks/useAuthLogic'

export default function LoginPage() {
  const { email, setEmail, password, setPassword, loading, handleLogin } = useAuthLogic()

  if (loading) {
    // If we are still checking the session, show a blank screen or a spinner
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Login Test</h1>
        
        <div className="space-y-4">
          <input 
            className="w-full p-2 border rounded text-black"
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            className="w-full p-2 border rounded text-black"
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Log In
          </button>
        </div>
      </div>
    </main>
  )
};