# Project Handover Document

## Overview
This document summarizes recent changes to the DAR Procurement System for developer transition.

---

## Recent Changes Summary

### 1. BAC Resolution Workflow (Major Feature - April 22, 2026 Update)

#### Components Modified:

**`components/CanvassingModals/ResolutionModal.tsx`** (RENAMED + ENHANCED)
- **MOVED** from `components/Canvassing/` to `components/CanvassingModals/` for better organization
- **NEW**: Split-pane layout with Form/Preview tabs
  - Left side: Resolution form (input fields)
  - Right side: Live preview of the resolution document
- **NEW**: Mode field above "Mode of Procurement" for document title
- **NEW**: Bold text support in Whereas clauses and Now Therefore text (use `**word**` syntax)
- **NEW**: Download PDF button generates full print-ready document
- Provides a dedicated "Submit Resolution" button separate from the Process modal
- Handles submission flow and updates PR status to "Canvassing (Releasing)" (status_id: 8)
- Auto-inserts remark "Bac Resolution Submitted" to remarks table with current user_id
- Key features:
  - Uses ref pattern (`hasReceivedSubmitFn`) to prevent infinite re-renders
  - Exposes external submit control via `onSubmit` callback
  - Integrates with `CanvassResolutionDetailsPanel` via `setSubmitFn` pattern
  - Live preview updates instantly as user types
- **NOW USES**: `ResolutionTableModal` as a test document/export view that mirrors the preview layout

**`components/CanvassingModals/ResolutionTableModal.tsx`** (NEW)
- Preview-matching resolution document view
- Renders the same paper-style layout as the on-screen preview
- Export button generates an Excel file using the same layout and values

**`components/Canvassing/CanvassResolutionDetailsPanel.tsx`** (MODIFIED)
- Refactored to support external submission control
- Added `onSubmit` prop to expose internal `handleSave` function to parent
- Added `hideActions` prop to conditionally hide internal buttons
- Fixed stale closure issues using refs for all state variables:
  - `resolutionNoRef`, `modeRef`, `divisionIdRef`, etc.
  - Refs updated via `useEffect` hooks to ensure latest values in callbacks
- Simplified user/division_id fetching:
  - Reads `currentUser` from localStorage (stored at login)
  - Extracts `id` and `division_id` directly
  - Sets `division_id` in payload for `bac_resolution` table
- Removed duplicate "Whereas clauses" section that caused JSX errors

**`app/Procurement/Canvass/page.tsx`** (MODIFIED)
- Removed resolution step from `CanvassProcessModal` flow
- Added `ResolutionModal` usage with separate "Resolution" button
- Added status_id 8 ("Canvassing (Releasing)") to `getStatusInfo` mapping
- Key changes:
  - `resolutionTarget` state for managing Resolution modal
  - Separate "Resolution" button appears beside "Process" button
  - `onSubmitted` callback updates PR status in local list

**`components/Canvassing/CanvassProcessModal.tsx`** (MODIFIED)
- Removed "resolution" step from the stepper
- Simplified flow: reception → collect → aaa (skips resolution)
- Resolution is now handled separately via `ResolutionModal`

### 2. Purchase Order Page (NEW)

**`app/PurchaseOrder/page.tsx`** (NEW)
- Full procurement dashboard UI following established patterns
- Features:
  - All PRs visible to all users (no role-based filtering)
  - Stat cards: Total, Pending, Processing, Canvassing, PO, Approved
  - Status filter buttons
  - Search by PR number, entity, or office section
  - Sortable columns (Office/Section, Date, Total Cost)
  - Skeleton loading state
  - Pagination
  - View button with `ViewPRModal` integration

### 3. Data Flow for BAC Resolution

```
User clicks "Resolution" button
        ↓
ResolutionModal opens
        ↓
CanvassResolutionDetailsPanel loads
        ↓
Fetches currentUser from localStorage → extracts division_id
        ↓
User fills resolution form (Resolution No, Mode, etc.)
        ↓
Click "Submit Resolution"
        ↓
saveToDatabase() → bac_resolution table (with division_id)
        ↓
Insert remark "Bac Resolution Submitted" → remarks table (with user_id)
        ↓
Update PR status → status_id: 8 ("Canvassing (Releasing)")
        ↓
Close modal, refresh list
```

### 4. Key Technical Patterns

#### LocalStorage User Data Structure
```typescript
// Stored at login (app/page.tsx)
{
  id: number,
  fullname: string,
  username: string,
  role_id: number,
  division_id: number,
  divisions: { division_name: string },
  roles: { role_name: string }
}
```

#### Ref Pattern for Stale Closures
Used in `CanvassResolutionDetailsPanel` to ensure callbacks access latest state:
```typescript
const resolutionNoRef = useRef(resolutionNo);
useEffect(() => { resolutionNoRef.current = resolutionNo; }, [resolutionNo]);
// Use resolutionNoRef.current in callbacks
```

#### Modal-to-Child Communication
```typescript
// Parent (ResolutionModal)
const [submitFn, setSubmitFn] = useState<(() => Promise<boolean | undefined>) | null>(null);
<Child onSubmit={setSubmitFn} />

// Child (CanvassResolutionDetailsPanel)
useEffect(() => {
  onSubmit?.(handleSave);
}, [onSubmit, handleSave]);
```

#### Button Assignment / Visibility Pattern
Action buttons are shown or hidden based on the current user's role, the PR status, and sometimes the user's division.

Common examples:
- `View`: visible to all users
- `Create PR`: hidden for BAC and Division Head roles
- `Process`: shown only when the PR is in the correct workflow status for that page
- `Resolution`: shown in Canvass for PRs eligible for BAC resolution
- `Budget Process`: shown only for Budget users when status_id = 4
- `Submit`: shown to the PR owner/end user for pending PRs
- `Cancel`: shown only to admins

Implementation pattern:
```typescript
const canShowResolutionButton = currentUser?.role_id === BAC_ROLE_ID && pr.status_id === 7;
const canShowBudgetButton = currentUser?.role_id === BUDGET_ROLE_ID && pr.status_id === 4;
```

This same approach is used throughout Procurement, Canvass, and Purchase Order pages so each button is tied to the correct user group and workflow state.

### 5. Database Schema (Relevant Tables)

**`bac_resolution`**
- `id`, `session_id`, `resolution_no`, `prepared_by`
- `resolved_at`, `notes`, `mode`
- `division_id` ← populated from currentUser
- `whereas_1`, `whereas_2`, `whereas_3`
- `now_therefore_text`, `resolved_at_place`
- `mode_top` ← **NEW (April 22, 2026)**: Shown in document title as procurement mode

**`remarks`**
- `id`, `remark`, `created_at`
- `user_id` ← populated from currentUser
- `pr_id`, `status_flag_id`
- `prform_id`, `po_id`

**`purchase_requests`**
- Status IDs relevant to workflow:
  - 6: "Canvassing (Reception)"
  - 7: "BAC Resolution"
  - 8: "Canvassing (Releasing)" ← After resolution submission
  - 10: "Abstract of Awards"

### 6. Known Issues & Notes

1. **Division ID Persistence**: Previously had issues saving `division_id` to `bac_resolution` table. Current implementation reads directly from localStorage (simplified from DB lookup approach).

2. **Status Flow**: Resolution submission sets PR status to 8 ("Canvassing (Releasing)") not 2 ("Bac Resolution Submitted") - confirm if this is correct with product owner.

3. **ViewPRModal**: Used across Procurement, Canvass, and PurchaseOrder pages for viewing PR details.

4. **Editable Excel-like mode**: The current ResolutionTableModal is a preview-style document, not a true spreadsheet editor yet. If full Excel-like editing is required before export, that needs a separate grid-based implementation.

5. **Bold Text Feature**: Use `**text**` syntax in Whereas and Now Therefore fields to render bold text in preview and PDF.

6. **PDF Generation**: Uses browser print-to-PDF feature with styled HTML document.

### 7. File Locations

**New Files:**
- `components/CanvassingModals/ResolutionModal.tsx` (RENAMED)
- `components/CanvassingModals/ResolutionTableModal.tsx` (NEW)
- `app/PurchaseOrder/page.tsx`

**Modified Files:**
- `components/CanvassingModals/ResolutionModal.tsx` (renamed + enhanced)
- `components/Canvassing/CanvassResolutionDetailsPanel.tsx`
- `components/Canvassing/CanvassProcessModal.tsx`
- `app/Procurement/Canvass/page.tsx`
- `types/tables.ts` (added mode_top to BacResolution type)

### 8. Dependencies

- Supabase client: `@/utils/supabase/client`
- Icons: `react-icons/ri`
- Types: `@/types/tables`
- Shared components: `Viewprmodal`, `PRModalComponent`, etc.
- Excel export library: `xlsx-js-style`

---

## For New Developer

### To Run the Project:
1. Ensure Supabase environment variables are configured
2. `npm install` (if dependencies missing)
3. `npm run dev`

### Key Areas to Review:
1. BAC Resolution flow - test end-to-end submission
2. Verify division_id is saving correctly in database
3. Check status transitions match business requirements
4. Review PurchaseOrder page for completeness

### Testing Checklist:
- [ ] Create PR → Submit → Process → Resolution → Verify status changes
- [ ] Check `bac_resolution.division_id` is populated
- [ ] Check `bac_resolution.mode_top` is populated (NEW)
- [ ] Check `remarks.user_id` is populated
- [ ] Verify View button works on all pages
- [ ] Test search/filter/sort on PurchaseOrder page
- [ ] Test ResolutionModal Form/Preview tabs
- [ ] Test bold text feature: type `**word**` in Whereas/Now Therefore fields
- [ ] Test Download PDF button generates proper document
- [ ] Verify Mode field appears in document title

---

## Complete App Folder Structure

### Dashboard Folder

**`app/Dashboard/layout.tsx`**
- Shared sidebar layout for Dashboard and all child pages
- Emerald-themed sidebar with navigation buttons:
  - Dashboard
  - Procurement
  - Purchase Order
  - Budget
  - Procurement Logs
- Displays current user info (avatar, name, role, division)
- Sign out button with confirmation modal
- Active route highlighting using `usePathname`
- Width: 320px sidebar + flexible content area

**`app/Dashboard/page.tsx`**
- Main dashboard/overview page for the application
- Shows PR summary with stat cards (Total, Pending, Processing, Canvassing, Approved, Rejected)
- Displays user's division PRs only (unless admin)
- Features:
  - Search by PR number, entity, or office section
  - Status filter buttons
  - Sortable data table (PR Number, Office/Section, Description, Date, Status, Total Cost)
  - Skeleton loading state
  - Pagination (10 items per page)
  - Status badges with color coding
- Uses `AnalyticsDashboard` component for analytics view

---

### Procurement Folder

**`app/Procurement/layout.tsx`**
- Identical to Dashboard layout (same sidebar, same navigation)
- Shared across all Procurement sub-pages
- All procurement-related pages inherit this layout

**`app/Procurement/page.tsx`**
- Main Purchase Request (PR) management page
- **Role-based visibility**:
  - Admin/BAC/PARPO/Budget: See all PRs
  - End users: Only see their division's PRs
- **Key Features**:
  - "Create PR" button (hidden for BAC and Division Head roles)
  - Tabs: Purchase Request | Canvass | Abstract of Awards
  - Status filter buttons with counts
  - Search functionality
  - Sortable columns with direction indicators
  - **Action buttons per row** (role-dependent):
    - View: Available to all
    - Process: For status workflow progression
    - Resolution: New button for BAC Resolution step
    - Submit: For pending PRs (end users)
    - Budget Process: For Budget role when status_id = 4
    - Cancel: Available to admins
  - Process modals: `ProcessPRModal`, `BACProcessModal`, `PARPOProcessModal`, `BudgetProcessModal`
  - Status flag badges (end users only)
- **Stats**: 6 stat cards showing counts by status
- **Pagination**: 10 items per page with navigation

**`app/Procurement/Canvass/page.tsx`**
- Canvassing workflow management page
- **Visible to**: All users (role-based filtering applies)
- **Key Features**:
  - Tabs: Purchase Request | Canvass | Abstract of Awards (Canvass active)
  - Same table structure as Procurement page
  - **Process Button**: Opens `CanvassProcessModal` for reception/collection/aaa workflow
  - **Resolution Button**: Opens standalone `ResolutionModal` (NEW)
    - Appears for PRs in appropriate status
    - Separate from Process modal flow
  - **ViewCanvass Integration**: View canvassing details per PR
- Status progression:
  - 6: Canvassing (Reception) → Reception modal
  - 9: Canvassing (Collection) → Collection modal
  - 10: Abstract of Awards → AAA modal
- Uses `CanvassProcessModal`, `ResolutionModal`, `ViewCanvass` components

**`app/Procurement/Abstract/page.tsx`**
- Abstract of Awards (AAA) management page
- **Filters**: Only shows PRs with `status_id = 10` (Abstract of Awards)
- **Key Features**:
  - Tabs: Purchase Request | Canvass | Abstract of Awards (Abstract active)
  - Simplified table (no process buttons, view only)
  - View button opens `ViewCanvass` modal
  - Search and sort functionality
  - Pagination
- This is a read-only view for awarded contracts

---

### PurchaseOrder Folder

**`app/PurchaseOrder/page.tsx`**
- Purchase Order overview page (NEW)
- **Visible to**: All users (no role-based filtering)
- **Key Features**:
  - Shows ALL purchase requests regardless of division
  - Stat cards: Total, Pending, Processing, Canvassing, PO, Approved
  - Single action: "View" button with `ViewPRModal`
  - Same search/filter/sort/pagination as other pages
  - No "Create PR" button (read-only view)
- Status filters include: PO, Delivery (additional statuses relevant to PO stage)

---

### Other App Folders

**`app/Budget/`** (Referenced but not detailed here)
- Budget management interface
- Accessed via sidebar navigation

**`app/Logs/`** (Referenced but not detailed here)
- Procurement logs/history view
- Accessed via sidebar navigation

**`app/page.tsx`** (Root Login Page)
- User authentication/login screen
- Fetches users from Supabase `users` table
- Validates credentials against stored password
- On success: stores `currentUser` object to localStorage
- Redirects to `/Dashboard` on successful login

**`app/analytics/analytics.tsx`**
- Analytics dashboard component
- Used by Dashboard page for data visualization
- Shows charts/statistics for procurement metrics

---

## Components Folder Structure (Key Components)

### Canvassing Components

**`components/CanvassingModals/ResolutionModal.tsx`** (RENAMED + ENHANCED)
- **MOVED** from `components/Canvassing/` to `components/CanvassingModals/`
- Standalone modal for BAC Resolution submission
- **NEW**: Split-pane Form/Preview layout
- **NEW**: Mode field, bold text support, PDF generation
- **NEW**: Live preview updates as you type
- Props: `prId`, `prNo`, `onClose`, `onSubmitted`
- Wraps `CanvassResolutionDetailsPanel`
- Handles submission and status update to 8

**`components/CanvassingModals/ResolutionPDF.tsx`** (NEW)
- PDF generation component for resolution documents
- Complete formatted document with signatures
- Props: All resolution data fields
- Usage: `generateResolutionPDF(props)` opens print dialog

**`components/CanvassingModals/ResolutionTableModal.tsx`** (NEW)
- Excel/spreadsheet export component
- Props: PR data, resolution data, whereas clauses, etc.

**`components/Canvassing/CanvassResolutionDetailsPanel.tsx`**
- Form component for resolution details
- Fields: Resolution No, Mode of Procurement, Prepared By, Resolved At, Notes
- New fields: Whereas clauses, Now Therefore text, Resolved At Place
- **NEW**: Mode (mode_top) field - stored in database and shown in document title
- Props: `prId`, `prNo`, `canCompleteWorkflow`, `onWorkflowComplete`, `onSubmit`, `hideActions`, `onDataChange`
- Uses ref pattern for state access in callbacks
- **NEW**: `onDataChange` callback for live preview updates

**`components/Canvassing/CanvassProcessModal.tsx`**
- Multi-step process modal for canvassing workflow
- Steps: reception → collect → aaa
- Each step renders different modals based on status
- Props: `open`, `onClose`, `prId`, `prNo`, `initialStep`, `onProcessed`

**`components/Canvassing/CanvassingReceptionModal.tsx`**
- Form for canvass reception step
- Collects BAC number, date, notes, attachments
- Validates required fields
- Updates PR status to BAC Resolution (7) on submit

**`components/CanvassUsers/ViewCanvass.tsx`**
- Read-only view of canvassing data
- Shows session info, resolution details, quotation data
- Props: `open`, `onClose`, `prData`

### PR Components

**`components/PRModalComponent.tsx`**
- Modal for creating new Purchase Requests
- Multi-step form with validation
- Auto-fills office_section from currentUser's division
- Saves to `purchase_requests` table

**`components/Viewprmodal.tsx`**
- Read-only PR detail viewer
- Shows full PR information including items table
- Print-friendly view with PDF styling
- Used across: Procurement, Canvass, PurchaseOrder pages

**`components/ProcessPRModal.tsx`**
- Processing workflow for division head approval
- Moves PR from Pending → Processing

**`components/BACProcessModal.tsx`**
- BAC processing workflow
- Validates PR info before sending to Budget

**`components/PARPOProcessModal.tsx`**
- PARPO approval workflow
- Final approval before canvassing

**`components/BudgetProcessModal.tsx`**
- Budget review and processing
- Updates PR status after budget review

### Shared Components

**`components/SignOutModal.tsx`**
- Confirmation modal for logout
- Clears localStorage and redirects to login

---

## Status Workflow Reference

| Status ID | Name | Stage | Notes |
|-----------|------|-------|-------|
| 1 | Pending | Initial | Created by end user |
| 2 | Processing (Division Head) | Processing | After submission |
| 3 | Processing (BAC) | Processing | After division head |
| 4 | Processing (Budget) | Processing | After BAC |
| 5 | Processing (PARPO) | Processing | After Budget |
| 6 | Canvassing (Reception) | Canvass | After PARPO approval |
| 7 | BAC Resolution | Resolution | After reception |
| 8 | Canvassing (Releasing) | Resolution | **After resolution submit** |
| 9 | Canvassing (Collection) | Canvass | After releasing |
| 10 | Abstract of Awards | AAA | After collection |
| 11 | PO (Creation) | PO | After AAA |
| 12 | PO (Allocation) | PO | Allocation step |
| 13 | ORS (Creation) | Accounting | Financial processing |
| 14 | ORS (Processing) | Accounting | Financial processing |
| 15 | PO (Accounting) | PO | Accounting review |
| 16 | PO (PARPO) | PO | PARPO review |
| 17 | PO (Serving) | PO | Serving step |
| 18-24 | Delivery stages | Delivery | Various delivery states |
| 27 | Cancelled | Terminal | Cancelled PRs |

---

## Design System

### Colors
- **Primary**: Emerald (emerald-600, emerald-700)
- **Sidebar**: Emerald-900 background
- **Pending**: Amber
- **Processing**: Blue
- **Canvassing**: Violet
- **BAC**: Purple
- **AAA**: Rose
- **PO**: Teal
- **Approved**: Emerald/Green
- **Delivery**: Cyan
- **Rejected**: Red

### Typography
- **Font**: Sora (Google Fonts)
- **Mono**: JetBrains Mono (for numbers/PR codes)

### Common Patterns
- Rounded corners: `rounded-2xl` for cards, `rounded-xl` for buttons
- Shadows: `shadow-sm` for cards, hover effects with `hover:shadow-md`
- Border colors: `border-gray-100` or `border-gray-200`
- Padding: `p-6` for containers, `px-5 py-3.5` for table cells

---

Last Updated: April 22, 2026
