'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { DatabaseUser } from '@/types/user'
import { verifyPassword, hashPassword, isBcryptHash } from '@/utils/auth/password'

export function useAuthLogic() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true) // Reverse Guard check
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<DatabaseUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Initialize user from localStorage on mount
  useEffect(() => {
    try {
      // Check if user data is stored in localStorage from previous login
      const storedUser = localStorage.getItem('currentUser')
      
      if (storedUser) {
        const user = JSON.parse(storedUser)
        setCurrentUser(user as DatabaseUser)
        setIsAuthenticated(true)
      }
      
      // Always set loading to false - let individual guards handle redirects
      setLoading(false)
    } catch (err) {
      console.error('Auth check error:', err)
      setLoading(false)
    }
  }, [])

  const handleLogin = async (): Promise<{ success: boolean; message?: string }> => {
    if (!email.trim() || !password.trim()) {
      const message = 'Please enter both email and password'
      setError(message)
      return { success: false, message }
    }

    try {
      setError(null)
      console.log('Attempting sign in with:', email)

      // Fetch user by username only, then verify password client-side
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('username', email)
        .maybeSingle()

      if (profileError) {
        console.error('Sign-in Error:', profileError.message)
        setError('Invalid email or password')
        return { success: false, message: 'Invalid email or password' }
      }

      if (!profile) {
        const message = 'Invalid email or password'
        setError(message)
        return { success: false, message }
      }

      const passwordValid = await verifyPassword(password, profile.password ?? '')
      if (!passwordValid) {
        const message = 'Invalid email or password'
        setError(message)
        return { success: false, message }
      }

      if (!isBcryptHash(profile.password ?? '')) {
        const newHash = await hashPassword(password)
        await supabase.from('users').update({ password: newHash }).eq('id', profile.id)
        profile.password = newHash
      }

      console.log('Sign-in successful:', profile.email)
      setCurrentUser(profile as DatabaseUser)
      setIsAuthenticated(true)

      // Save user to localStorage for reverse guard check
      localStorage.setItem('currentUser', JSON.stringify(profile))

      // Redirect based on user id
      if (profile.id === 1) {
        // id 1 = admin
        router.push('/admn')
      } else {
        // All other users go to Dashboard
        router.push('/Dashboard')
      }

      return { success: true }
    } catch (err) {
      console.error('Sign in error:', err)
      const message = 'An error occurred during sign in'
      setError(message)
      return { success: false, message }
    }
  }

  const handleSignOut = async (): Promise<void> => {
    try {
      setIsAuthenticated(false)
      setCurrentUser(null)
      setEmail('')
      setPassword('')
      setError(null)
      localStorage.removeItem('currentUser')
      router.push('/')
    } catch (err) {
      console.error('Sign out error:', err)
      setError('An error occurred during sign out')
    }
  }

  // Return everything the page needs to function
  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    isAuthenticated,
    currentUser,
    error,
    setError,
    handleLogin,
    handleSignOut,
  }
}