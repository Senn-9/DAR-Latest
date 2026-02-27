'use client'
import { useUserGuard } from '@/hooks/useUserGuard'
import SignOutButton from '@/components/SignOutButton'

export default function EndPage() {
  // Activate the security guard
  const { authorized } = useUserGuard()

  // Show a loading state while the hook checks the database
  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500 animate-pulse">Checking Permissions...</p>
      </div>
    )
  }

  return(
    <main className="min-h-screen bg-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Dashboard</h1>
            <p className="text-gray-500">Welcome to your personal area</p>
          </div>
          <SignOutButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Example User Content Cards */}
          <div className="p-6 border rounded-xl shadow-sm bg-gray-50">
            <h3 className="font-semibold mb-2">My Profile</h3>
            <p className="text-sm text-gray-600">View and edit your personal details.</p>
          </div>
        </div>
      </div>
    </main>
  )
}