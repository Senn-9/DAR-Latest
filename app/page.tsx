'use client'
import { useAuthLogic } from '@/hooks/useAuthLogic'
import { useLoginGuard } from '../hooks/useLoginGuard'
import { useState } from 'react'

export default function LoginPage() {
  const { 
    email, 
    setEmail, 
    password, 
    setPassword, 
    error,
    setError,
    handleLogin 
  } = useAuthLogic()

  const { canShowLogin, loading } = useLoginGuard()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  if (loading) {
    // If we are still checking the session, show a spinner
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is already logged in, don't show login form (guard will redirect)
  if (!canShowLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setError(null)
    
    const result = await handleLogin()
    
    if (!result.success) {
      setIsLoggingIn(false)
    }
    // If successful, handleLogin will redirect, so we don't need to reset loading
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Login</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              type="text" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoggingIn}
              required
            />
          </div>
          
          <div>
            <input 
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoggingIn ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}