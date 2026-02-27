'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useAuthLogic() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)      // Added to handle the "Reverse Guard" check
  const supabase = createClient()

  // Reverse Guard
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // If user exists, find their role and send them to their dashboard
        const { data: profile } = await supabase
          .from('profile')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'super-admin' || profile?.role === 'admin') {
          router.push('/admn')
        } else {
          router.push('/end')
        }
      } else {
        // No user found, stop loading and show the login form
        setLoading(false)
      }
    }
    checkUser()
  }, [router, supabase])

  const handleLogin = async () => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email, password
    })

    if (authError) return alert(authError.message)
    
    // Fetch the role from your 'profile' table
    const { data: profile } = await supabase
      .from('profile')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    // CHECK THE ROLE AND REDIRECT
    if (profile?.role === 'super-admin' || profile?.role === 'admin') {
      router.push('/admn')
    } else if (profile?.role === 'end-user' || profile?.role === 'user') {
      router.push('/end')
    } else {
      alert("Role not found. Check your profile table!")
    }
  }

  // Return everything the page needs to function
  return {
    email, setEmail,
    password, setPassword,
    loading, handleLogin
  }
}