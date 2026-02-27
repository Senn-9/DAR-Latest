'use client'
// Import your custom security guard hook
import { useAdminGuard } from '@/hooks/useAdminGuard'
// Import your reusable components
import SignOutButton from '@/components/SignOutButton'

export default function AdminPage() {
  // Use our hook to handle all the security logic automatically
  const { authorized } = useAdminGuard()

  // If the hook hasn't finished checking or the user isn't allowed, show 'Loading'
  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500 animate-pulse">Checking Permissions...</p>
      </div>
    )
  }

  // Once authorized is true, the actual Admin Page design appears
  return(
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6">
        <header className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
          {/* Our reusable sign-out button component */}
          <SignOutButton />
        </header>

        <section className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <p className="text-blue-800 font-medium">
            Welcome, Admin. You have access to restricted settings.
          </p>
        </section>
      </div>
    </main>
  )
}