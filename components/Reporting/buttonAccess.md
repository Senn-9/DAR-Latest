# Button access list — Reporting & Dashboard (summary)

This file lists UI buttons found in the Reporting components and the Dashboard page that open or interact with the Summary Report, and the access rule for each.

- **Summary Report (header) — `Summary Report`**: opens `SummaryReportModal`.
	- Access: any authenticated user (page wrapped with `AuthGuard`).

- **SummaryReportModal — `Print`** (icon button, aria-label="Print report"):
	- Access: any authenticated user who can open the modal.

- **SummaryReportModal — `Close`** (icon button, title="Close"):
	- Access: any authenticated user who can open the modal.

- **Dashboard — `FY {year}`** (header button that opens year picker):
	- Access: any authenticated user.

- **Status filter pills** (buttons for All / Pending / Processing / ...):
	- Access: any authenticated user.

- **Table row — `Edit`** (per-row):
	- Condition: `form.source === 'pr' && form.status_id === 1` and user is an End User.
	- End User definition: NOT admin and NOT any special accounts: not Division Head, BAC, PARPO, Supply, Budget, Accounting, Cash. (See `isEndUser` logic in `app/Dashboard/page.tsx`.)
	- Access: End Users only, and only for PRs in Pending status.

- **Table row — `View`** (per-row):
	- Access: any authenticated user who can view the Dashboard.

- **Table row — `Process`** (per-row):
	- Access: all non-End-Users (i.e., admin, division head, BAC, PARPO, Supply, Budget, Accounting, Cash).

- **Year picker modal — Close (×) and year option buttons**:
	- Access: any authenticated user who opened the picker.

- **Details modal — `Close`** (footer button) and header ×:
	- Access: any authenticated user who opened the details modal.

- **Pagination controls (Prev, page numbers, Next)**:
	- Access: any authenticated user.

Notes:
- The Dashboard and Reporting UIs are protected by `AuthGuard`, so all buttons above require an authenticated session.
- Role checks use `currentUser.role_id` and `currentUser.roles.role_name` in places; some access is decided by boolean helpers like `isAdmin`, `isDivisionHead`, `isBACAccount`, `isPARPOAccount`, `isSupplyAccount`, `isBudgetAccount`, `isAccountingAccount`, and `isCashAccount`. See [app/Dashboard/page.tsx](app/Dashboard/page.tsx#L1-L20) for the exact logic.

If you want a repo-wide inventory (every `<button>` across the project) I'll expand the scan and add per-button file/line references.

---

## Procurement — buttons and access

Buttons found under `app/Procurement` with where they appear and the access rule applied:

- **Tabs** (Purchase Request, Canvass, Abstract of Awards, Purchase Order, Delivery, Payment): navigational buttons.
	- Access: any authenticated user. See [app/Procurement/page.tsx](app/Procurement/page.tsx).

- **Create PR** (`PRModalComponent`) — visible as the header "New PR" control (component):
	- Condition: shown when `!(isBACAccount || isDivisionHead)` (i.e., not BAC account and not Division Head).
	- Access: regular users and admins (see [app/Procurement/page.tsx](app/Procurement/page.tsx)).

- **Filters / Search / FY picker / Stat cards** (filter, search input, FY button, stat card buttons):
	- Access: any authenticated user. See [app/Procurement/page.tsx](app/Procurement/page.tsx) and [app/Procurement/Abstract/page.tsx](app/Procurement/Abstract/page.tsx).

- **Per-row actions (PR list)** — common buttons and rules (see [app/Procurement/page.tsx](app/Procurement/page.tsx)):
	- `View`: shown to most users (budget/accounting may have dedicated View logic). Access: authenticated users.
	- `Remarks`: all users — opens remarks modal.
	- `Delete`: Admin only (`isAdmin`).
	- `Budget Process`: shown to `isBudgetAccount` when `form.status_id === 4`.
	- `Process`: shown to `isAdmin` or `isDivisionHead` (limited to certain statuses) — used to advance PR status.
	- `Submit`: shown to regular end-users for their own PRs when `status_id === 1` and not special accounts.
	- `BAC Process`: shown to `isBACAccount` when `status_id === 3`.
	- `PARPO Process`: shown to `isPARPOAccount` when `status_id === 5`.

- **Abstract page specific** (see [app/Procurement/Abstract/page.tsx](app/Procurement/Abstract/page.tsx)):
	- `Awarding` / `Prepare Awarding` button: visible when `currentUser?.role_id === 3` (special role) and `status` conditions; opens `PrepareAbstractModal`.
	- `Submit` (abstract submission confirmation modal): visible to `role_id === 3` for non-completed items.

Notes:
- For exact conditional logic, see `app/Procurement/*` pages listed above — they compute booleans like `isAdmin`, `isDivisionHead`, `isBACAccount`, `isPARPOAccount`, `isBudgetAccount`, `isSupplyAccount`, `isAccountingAccount`, and `isEndUser` from `currentUser`.
- If you want, I can expand this into per-file, per-line references (exact line numbers for each button instance). Reply "expand" and I'll add file/line links for every button found in `app/Procurement`.