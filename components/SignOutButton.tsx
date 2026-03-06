'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsLoading(true)

      // 1. Clear user data from localStorage
      localStorage.removeItem('currentUser')

      // 2. Optional: Clear any other auth-related data
      localStorage.removeItem('authToken')
      sessionStorage.clear()

      // 3. Redirect to login page
      router.push('/')

      // 4. Refresh to clear any sensitive data from memory
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Error signing out. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Signing out...
        </>
      ) : (
        'Sign Out'
      )}
    </button>
  )
}