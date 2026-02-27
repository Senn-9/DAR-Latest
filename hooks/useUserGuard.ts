'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export function useUserGuard() {
  const router = useRouter()
  const supabase = createClient()
  // Controls whether the page content is hidden or visible
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      // 1. Get the current user session from Supabase
      const { data: { user } } = await supabase.auth.getUser()
      
      // 2. If no user is logged in, send them to the main/login page
      if (!user) {
        return router.push('/')
      }

      // 3. Fetch the specific role for this user
      const { data: profile } = await supabase
        .from('profile')
        .select('role')
        .eq('id', user.id)
        .single()

      // 4. Role Check: If they are an admin, they shouldn't be in the user area
      if (profile?.role === 'admin' || profile?.role === 'super-admin') {
        // Send admins back to their dashboard
        router.push('/admn') 
      } else if (profile?.role === 'user' || profile?.role === 'end-user') {
        // 5. If they are a regular user, unlock the page!
        setAuthorized(true)
      } else {
        // 6. If no role is found at all, go to login for safety
        router.push('/')
      }
    }

    checkUser()
  }, [router, supabase])

  return { authorized }
}