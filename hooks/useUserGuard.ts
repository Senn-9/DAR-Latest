'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DatabaseUser } from '@/types/user'

export function useUserGuard() {
  const router = useRouter()
  // Controls whether the page content is hidden or visible
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        // 1. Get the current user from localStorage
        const storedUser = localStorage.getItem('currentUser')
        
        console.log('User Guard - Stored User:', storedUser)
        
        // 2. If no user is logged in, send them to the login page
        if (!storedUser) {
          console.log('User Guard - No user found, redirecting to /auth')
          router.push('/')
          return
        }

        // 3. Parse the stored user data
        const user = JSON.parse(storedUser) as DatabaseUser
        console.log('User Guard - Parsed User:', user)
        console.log('User Guard - User ID:', user.id)

        // 4. Role Check: If they are an admin (id 1), they shouldn't be in the user area
        if (user.id === 1) {
          // Send admin back to their dashboard
          console.log('User Guard - Admin detected, redirecting to /admn')
          router.push('/admn')
          return
        }

        // 5. If they are a regular user (any other id), unlock the page!
        console.log('User Guard - Regular user authorized')
        setAuthorized(true)
        setLoading(false)
      } catch (error) {
        console.error('User guard error:', error)
        // If there's an error, redirect to login for safety
        router.push('/')
      }
    }

    checkUser()
  }, [router])

  return { authorized, loading }
}