'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DatabaseUser } from '@/types/user'

export function useLoginGuard() {
  const router = useRouter()
  const [canShowLogin, setCanShowLogin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        // 1. Get the current user from localStorage
        const storedUser = localStorage.getItem('currentUser')
        
        console.log('Login Guard - Stored User:', storedUser)
        
        // 2. If user is already logged in, redirect them
        if (storedUser) {
          const user = JSON.parse(storedUser) as DatabaseUser
          console.log('Login Guard - User already logged in, redirecting...')
          console.log('Login Guard - User ID:', user.id)

          // Redirect based on user id
          if (user.id === 1) {
            // Admin goes to admin page
            router.push('/admn')
          } else {
            // Regular users go to end page
            router.push('/end')
          }
          return
        }

        // 3. No user logged in, show the login page
        console.log('Login Guard - No user found, showing login form')
        setCanShowLogin(true)
        setLoading(false)
      } catch (error) {
        console.error('Login guard error:', error)
        // If there's an error, show login form
        setCanShowLogin(true)
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  return { canShowLogin, loading }
}