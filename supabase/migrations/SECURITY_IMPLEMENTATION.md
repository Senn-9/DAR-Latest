# Security Implementation Guide

## Overview

This application now implements a comprehensive authentication guard system to prevent unauthorized access to protected routes. Users attempting to manually navigate to protected pages via URL will be automatically redirected to the login page.

## How It Works

### 1. **AuthGuard Component** (`components/AuthGuard.tsx`)

A reusable wrapper component that:
- Checks if a user is logged in (via localStorage)
- Shows a loading screen during authentication check
- Redirects unauthorized users to the login page
- Optionally restricts access by user role
- Prevents content flash by delaying render until auth is verified

### 2. **Login Page Protection** (`app/page.tsx`)

The login page uses `useLoginGuard` hook to:
- Prevent already-logged-in users from seeing the login form
- Automatically redirect logged-in users to their appropriate dashboard
- Show loading state during redirect

### 3. **Protected Routes** (e.g., `app/Procurement/page.tsx`)

All protected pages are wrapped with `<AuthGuard>` component to:
- Block unauthenticated users
- Redirect to login page if no session exists
- Show loading screen during verification

## Implementation Status

### ✅ Secured Pages:
- `/` - Login page (prevents logged-in users from accessing)
- `/Procurement` - Purchase Requests page (requires authentication)

### ⚠️ Pages That Need Protection:
The following pages should be wrapped with `<AuthGuard>`:
- `/Dashboard` - Main dashboard
- `/PurchaseOrder` - Purchase Orders view
- `/Budget` - Budget management
- `/UserManagement` - User administration
- `/Logs` - System logs
- `/All` - All records view
- `/analytics` - Analytics dashboard

## How to Protect a Page

### Step 1: Import AuthGuard

```tsx
import { AuthGuard } from "@/components/AuthGuard";
```

### Step 2: Wrap Page Content

```tsx
export default function YourPage() {
  // ... your component logic ...

  return (
    <AuthGuard>
      <div>
        {/* Your page content */}
      </div>
    </AuthGuard>
  );
}
```

### Step 3 (Optional): Restrict by Role

```tsx
<AuthGuard allowedRoles={[1]}>  {/* Only admins (role_id: 1) */}
  <div>Admin-only content</div>
</AuthGuard>
```

```tsx
<AuthGuard allowedRoles={[2, 3, 4]}>  {/* Regular users only */}
  <div>User content</div>
</AuthGuard>
```

## Advanced Configuration

### AuthGuard Props

```tsx
interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;        // Default: true
  allowedRoles?: number[];       // Optional role restriction
  redirectTo?: string;           // Default: "/" (login page)
}
```

### Example: Public Page with Auth Check

```tsx
<AuthGuard requireAuth={false}>
  <PublicContent />
</AuthGuard>
```

### Example: Admin-Only Page

```tsx
<AuthGuard 
  allowedRoles={[1]} 
  redirectTo="/Dashboard"  // Redirect non-admins to dashboard
>
  <AdminPanel />
</AuthGuard>
```

## Security Features

### 1. **Automatic Redirects**
- Unauthenticated users → Login page
- Wrong role → Appropriate dashboard
- Logged-in users on login page → Dashboard

### 2. **Loading States**
- Shows spinner during authentication check
- Prevents content flash
- User-friendly experience

### 3. **localStorage-based Sessions**
- User data stored in `localStorage.currentUser`
- Checked on every protected route access
- Cleared on logout

### 4. **Role-Based Access Control (RBAC)**
- Optional role restrictions per page
- Flexible role_id checking
- Automatic redirect for unauthorized roles

## Migration Checklist

To secure all existing pages:

- [x] Create AuthGuard component
- [x] Secure login page with useLoginGuard
- [x] Protect Procurement page
- [ ] Protect Dashboard page
- [ ] Protect PurchaseOrder page
- [ ] Protect Budget page
- [ ] Protect UserManagement page
- [ ] Protect Logs page
- [ ] Protect All page
- [ ] Protect analytics page

## Testing

### Test Authentication:
1. Log out completely
2. Try to access `/Procurement` directly via URL
3. Verify you're redirected to login page
4. Log in successfully
5. Verify you're redirected to your dashboard
6. Try to access `/` (login page)
7. Verify you're redirected away from login

### Test Role Restrictions:
1. Log in as admin (role_id: 1)
2. Try to access user-only pages
3. Verify appropriate redirection
4. Repeat for regular users

## Future Improvements

1. **JWT Tokens**: Replace localStorage with secure HTTP-only cookies
2. **Session Expiry**: Add automatic logout after inactivity
3. **Middleware**: Implement Next.js middleware for server-side protection
4. **Supabase Auth**: Integrate with Supabase authentication system
5. **Refresh Tokens**: Implement token refresh mechanism

## Important Notes

⚠️ **Current Limitation**: This implementation uses client-side checks with localStorage. While effective for UX, it should be supplemented with:
- Server-side API authentication
- Database-level permission checks
- Secure session management

✅ **Current Protection Level**: Prevents casual unauthorized access and improves user experience. Sufficient for internal tools with trusted users.

🔒 **Production Recommendation**: For public-facing applications, implement server-side authentication with secure token management.

## Support

For issues or questions about the authentication system:
1. Check this documentation
2. Review the AuthGuard component code
3. Check console logs for `[AuthGuard]` messages
4. Verify localStorage contains valid user data

---

**Last Updated**: May 13, 2026
**Implemented By**: System Security Update
