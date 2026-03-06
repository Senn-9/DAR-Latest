'use client'
import { useUserGuard } from '@/hooks/useUserGuard'
import SignOutButton from '@/components/SignOutButton'
import { useAuthLogic } from '@/hooks/useAuthLogic'

export default function EndPage() {
  // Activate the security guard
  const { authorized, loading } = useUserGuard()
  const { currentUser } = useAuthLogic()

  // Show a loading state while the hook checks the database
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking Permissions...</p>
        </div>
      </div>
    )
  }

  // If not authorized, show access denied
  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg font-semibold">Access Denied</p>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome to your personal area</p>
          </div>
          <SignOutButton />
        </header>

        {/* User Info Section */}
        {currentUser && (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Username</p>
                <p className="text-lg font-medium text-gray-900">{currentUser.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-medium text-gray-900">{currentUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">User ID</p>
                <p className="text-lg font-medium text-gray-900">{currentUser.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Division ID</p>
                <p className="text-lg font-medium text-gray-900">{currentUser.division_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Role ID</p>
                <p className="text-lg font-medium text-gray-900">{currentUser.role_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(currentUser.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">My Profile</h3>
            <p className="text-sm text-gray-600 mb-4">View and edit your personal details.</p>
            <button className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Edit Profile
            </button>
          </div>

          {/* Card 2 */}
          <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">My Requests</h3>
            <p className="text-sm text-gray-600 mb-4">Check your purchase requests and orders.</p>
            <button className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              View Requests
            </button>
          </div>

          {/* Card 3 */}
          <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Settings</h3>
            <p className="text-sm text-gray-600 mb-4">Update your account and preferences.</p>
            <button className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              Go to Settings
            </button>
          </div>
        </div>

        {/* Additional Section */}
        <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              Download Documents
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              View History
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              Contact Support
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              Report Issue
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}