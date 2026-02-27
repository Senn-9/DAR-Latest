'use client'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    // 1. Tell Supabase to end the session
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert("Error signing out: " + error.message)
    } else {
      // 2. Clear the screen and send them to the login page
      router.push('/')
      // 3. Optional: Refresh to clear any sensitive data from memory
      router.refresh()
    }
  }

  return (
    <button 
      onClick={handleSignOut}
      style={{
        padding: '8px 16px',
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Sign Out
    </button>
  )
}