'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DatabaseUser } from '@/types/user'

export function useAdminGuard() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // 1. Check if user data exists in localStorage
        const storedUser = localStorage.getItem('currentUser')
        
        // 2. If no one is logged in, kick them back to the login page
        if (!storedUser) {
          router.push('/')
          return
        }

        // 3. Parse the stored user data
        const user = JSON.parse(storedUser) as DatabaseUser

        // 4. Check their user id
        // Only user id 1 is admin
        if (user.id !== 1) {
          // If user is NOT id 1 (admin), send them to the end-user area
          router.push('/end')
          return
        }

        // 5. If they are admin (id 1), unlock the page!
        setAuthorized(true)
      } catch (error) {
        console.error('Admin guard error:', error)
        // If there's an error parsing or checking, redirect to login
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    // Run the check as soon as the page starts to load
    checkAdmin()
  }, [router])

  // Return the 'authorized' and 'loading' status so the page knows when to show the content
  return { authorized, loading }
}