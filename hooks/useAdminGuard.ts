'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export function useAdminGuard() {
  const router = useRouter()
  const supabase = createClient()
  // This state tracks if we should show the page content or 'Loading...'
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      // 1. Ask Supabase: "Is anyone even logged in right now?"
      const { data: { user } } = await supabase.auth.getUser()
      
      // 2. If no one is logged in, kick them back to the login/main page
      if (!user) {
        return router.push('/')
      }

      // 3. If they are logged in, check their role in the 'profile' table
      const { data: profile } = await supabase
        .from('profile')
        .select('role')
        .eq('id', user.id)
        .single()

      // 4. Lock: If their role is NOT 'admin' or 'super-admin', send them to the end-user area
      if (profile?.role !== 'admin' && profile?.role !== 'super-admin') {
        router.push('/end') 
      } else {
        // 5. If they are an admin, unlock the page!
        setAuthorized(true)
      }
    }

    // Run the check as soon as the page starts to load
    checkAdmin()
  }, [router, supabase])

  // Return the 'authorized' status so the page knows when to show the content
  return { authorized }
}