# DAR Procurement System - Comprehensive Guide

## What is this website?

This is an **Integrated Government Procurement Management System** for the **Department of Agrarian Reform (DAR)**. It's a digital platform that automates and tracks the complete procurement lifecycle—from initial purchase requests through final payment and auditing. This system ensures transparency, compliance with government procurement rules, and proper budget management.

---

## Key Stakeholders and Their Roles

The system supports multiple user roles, each with specific permissions and responsibilities:

| Role ID | Role Name | System Access & Responsibilities |
|---------|-----------|----------------------------------|
| **1** | **Admin** | Full system access; manage users, divisions, budgets; override workflows; hard delete records; view all transactions across divisions |
| **2** | **Division Head** | Approve PRs from their division (Status 1→2); view division-specific requests; submit remarks |
| **3** | **BAC (Bids & Awards Committee)** | Process PRs (Status 3); create canvass sessions; assign canvassers; prepare BAC resolutions and AAA documents; manage supplier evaluations |
| **4** | **Budget Office** | Review PRs for budget availability (Status 4); allocate funds to POs (Status 12); create and process ORS documents (Status 13-14); manage division budgets |
| **5** | **PARPO (Procurement Office)** | Review and approve PRs (Status 5); approve POs (Status 16); sign payment documents (Status 32, 34); coordinate procurement compliance |
| **6** | **Canvasser** | Assigned to canvass sessions; release RFQs to suppliers (Status 8); collect quotations (Status 9); enter supplier quotes; manage quotation numbers |
| **7** | **PPMP Point Person** | Coordinate canvassing activities; manage canvasser assignments; track RFQ deadlines; oversee quotation collection |
| **8** | **Supply / Warehouse** | Create POs (Status 11); serve POs to suppliers (Status 17); log deliveries (Status 18-19); prepare IAR documents (Status 20-21); prepare LOA documents (Status 22) |
| **9** | **Accounting / PCAO** | Review POs for completeness (Status 15); prepare and verify DV documents (Status 29-30); process accounting entries; manage tax processing (Status 35) |
| **10** | **Division User** | Create purchase requests; view own division's PRs and POs; submit remarks; track request status |
| **11** | **Inspector** | Sign and verify IAR documents (Status 21); conduct physical inspections; confirm quality and quantity of delivered items |
| **12** | **Cash Section** | Process final payments (Status 36); prepare checks or electronic transfers; record payment completion timestamps |

### Role-Based Workflow Permissions

- **Admin**: Can process any status, view all data, manage system settings
- **Budget**: Can process Status 4, 12, 13, 14 (Budget and ORS phases)
- **BAC**: Can process Status 3, 6-10 (BAC and Canvassing phases)
- **PARPO**: Can process Status 5, 16, 32, 34 (PARPO approval points)
- **Supply**: Can process Status 11, 17-22, 25 (PO creation and Delivery phases)
- **Accounting**: Can process Status 15, 29, 30, 35 (Accounting and Payment phases)
- **Division Users**: Can create PRs and submit for approval (Status 1)
- **Division Heads**: Can approve PRs from Status 1 to Status 2

### Special Access Rules

- **STOD Division**: Requires PCAO signature for certain documents
- **PPMP Point Person**: Can assign canvassers and manage canvass sessions
- **Canvassers**: Receive assignments, manage quotations, track supplier responses
- **Inspectors**: External role for IAR verification and quality control

---

## The Complete Procurement Process

### **PHASE 1: PURCHASE REQUEST (PR)** - Status IDs 1-10

This phase handles the creation, approval, and canvassing of purchase requests.

#### Status 1: Pending
- End users create purchase request with:
  - Item descriptions, quantities, and estimated costs
  - Entity name, fund cluster, office/section
  - Responsibility code and purpose
  - Budget number and PAP code
  - Project proposal file (if applicable)
- Request awaits division head approval

#### Status 2: Processing (Division Head)
- Division head reviews and approves the PR
- Verifies legitimacy and necessity of request
- Signs and forwards to BAC

#### Status 3: Processing (BAC)
- BAC assigns official PR number
- Certifies inclusion in Annual Procurement Plan (APP)
- Verifies procurement compliance
- Routes to budget office

#### Status 4: Processing (Budget)
- Budget officer verifies fund availability
- Earmarks budget allocation
- Records financial commitment
- Approves for PARPO review

#### Status 5: Processing (PARPO)
- PARPO II reviews all documentation
- Verifies government procurement procedure compliance
- Authorizes canvassing preparation

#### Status 6: Canvassing (Reception)
- PR received by canvassing team
- Canvass session created with BAC number
- Canvassers assigned to divisions

#### Status 7: BAC Resolution
- BAC prepares resolution document
- Documents procurement decision
- Requires BAC member signatures

#### Status 8: Canvassing (Releasing)
- Request for Quotation (RFQ) released to suppliers
- Canvassers distribute quotation forms
- Deadline set for submission

#### Status 9: Canvassing (Collection)
- Canvassers collect filled quotation forms
- Supplier quotes entered into system
- Price comparison prepared

#### Status 10: Abstract of Awards (AAA)
- BAC prepares Abstract of Awards document
- Lists all suppliers and quotations
- Highlights winning supplier
- BAC members sign document
- Ready for PO creation

---

### **PHASE 2: PURCHASE ORDER (PO)** - Status IDs 11-17

This phase creates the formal Purchase Order and processes required approvals.

#### Status 11: PO (Creation)
- Supply office creates Purchase Order from approved PR
- Includes:
  - Supplier details (name, address, TIN)
  - Item descriptions, quantities, unit prices
  - Delivery place, delivery term, delivery date
  - Payment terms and procurement mode
  - Fund cluster and office/section
- PO number assigned

#### Status 12: PO (Allocation)
- Budget office allocates specific funds
- Links PO to budget account
- Verifies total amount against available budget
- Routes to ORS creation

#### Status 13: ORS (Creation)
- Budget prepares **Obligation Request Slip (ORS)**
- Documents financial commitment
- Assigns ORS number and date
- Includes:
  - Entity name, fund cluster
  - Responsibility center, particulars
  - MFO/PAP, UACS code
  - Obligation/payable/payment amounts
  - Prepared by and certified by details

#### Status 14: ORS (Processing)
- ORS document reviewed and verified
- Budget officer certifies availability of funds
- Approved by designated authority
- Routes to accounting

#### Status 15: PO (Accounting)
- Accounting reviews PO for completeness:
  - All signatures present
  - Calculations match ORS
  - Supporting documents attached
- **If incomplete**: Return for corrections
- **If complete**: Accountant signs approval

#### Status 16: PO (PARPO)
- PARPO II conducts final review
- Verifies procurement compliance
- Signs and approves Purchase Order
- Authorizes serving to supplier

#### Status 17: PO (Serving)
- Supply serves PO to supplier
- Delivery instructions provided
- Copies prepared for COA submission
- System awaits delivery notification

---

### **PHASE 3: DELIVERY** - Status IDs 18-25, 28

This phase tracks delivery receipt, inspection, and acceptance of goods.

#### Status 18: Delivery (Waiting)
- Delivery record created in system
- Delivery number assigned
- Expected delivery date set
- Supply awaits supplier delivery
- Status flag can be set for tracking

#### Status 19: Delivery (Received)
- Supplier delivers items with documents:
  - Delivery Receipt (DR) number
  - Statement of Account (SOA) number
  - Invoice
- Supply records:
  - Actual delivery date
  - DR/SOA numbers
  - Initial notes

#### Status 20: Delivery (IAR)
- Supply prepares **Inspection and Acceptance Report (IAR)**
- IAR document includes:
  - IAR number, PO number
  - Invoice number and date
  - Requisitioning office
  - Responsibility center
  - Item details from PO
- Can be generated from template (Excel)

#### Status 21: Delivery (IAR Processing)
- Inspector reviews and signs IAR
- Physical inspection conducted:
  - Quantity verification
  - Quality assessment
  - Condition check
- Inspection and receipt timestamps recorded
- Inspector and supply officer names documented
- Missing items/units noted if applicable

#### Status 22: Delivery (LOA)
- Supply prepares **Letter of Acceptance (LOA)**
- LOA document includes:
  - LOA number, PO number
  - Invoice details
  - Acceptance date
  - Accepted by name and title
- Formally accepts delivery from supplier

#### Status 25: Delivery (Division Chief)
- Division Chief reviews and signs acceptance
- Confirms items received meet requirements
- Authorizes payment processing
- Routes to payment phase

#### Status 28: Payment Pending
- Delivery phase completed
- All acceptance documents signed
- Ready for payment processing
- Awaiting voucher preparation

---

### **PHASE 4: PAYMENT** - Status IDs 29-30, 32-37

This phase handles payment processing, voucher verification, and completion.

#### Status 29: Voucher Verification
- Accounting prepares **Disbursement Voucher (DV)**
- DV document includes:
  - DV number and date
  - Fund cluster, ORS number
  - Payee details (name, TIN, address)
  - Particulars and responsibility center
  - MFO/PAP and amount due
  - Mode of payment (MDS check, commercial check, ADA, others)
  - Accounting entries (UACS codes, debits, credits)
- Verification checklist:
  - All signatures present
  - Amounts match ORS
  - Supporting documents complete
- **If incomplete**: Return for corrections
- **If complete**: Proceed to accounting review
- Voucher completion timestamp recorded

#### Status 30: Accounting Review
- Accountant reviews DV completeness:
  - Section A: Certified expenses/cash advance
  - Section C: Cash available, subject to authority, proper certification
  - Section D: Approved for payment
  - Section E: Receipt of payment details
- Accountant signs certification
- JEV (Journal Entry Voucher) prepared if needed
- Accounting completion timestamp recorded
- Routes to PARPO for approval

#### Status 32: PARPO Approval
- PARPO II reviews for procurement compliance
- Signs approval section
- PARPO approval completion timestamp recorded
- Routes to cash processing

#### Status 33: Completed (PR Phase)
- **Note**: This status appears in PR workflow
- Indicates PR has completed its lifecycle
- Associated PO may continue through delivery/payment

#### Status 34: PARPO Office Signature
- Additional PARPO office signature obtained
- Final procurement compliance verification
- Cash processing completion timestamp recorded
- Routes to tax processing if applicable

#### Status 35: Accounting — Tax
- Tax withholding processed if applicable
- Tax documents prepared
- Tax processing completion timestamp recorded
- Routes to final payment

#### Status 36: Payment Completed
- Payment authorized and processed
- Check prepared or electronic transfer initiated
- Payment mode recorded (check, LLDAP, ADA)
- Payment completion timestamp recorded
- Supplier notified of payment
- Documents prepared for COA submission

#### Status 37: Cancelled
- Payment cancelled (rare)
- Reason documented
- Requires admin intervention

---

## Critical Decision Points & Pathways

### Early Stage: Amount Threshold
- **Below 10k**: May use expedited process
- **Above 10k**: Full standard procurement process with BAC review

### Document Completeness Check (Step 19 & 32)
- **Missing Documents** → Return for correction (affects timeline)
- **Complete** → Continue to next phase

### Division Type (Step 15)
- **STOD**: Requires PCAO signature
- **Other Divisions**: Requires PPMP Point Person signature

### Payment Classification (Step 35)
- **Check**: Traditional payment method
- **LLDAP**: Electronic payment system

---

## Complete System Status Reference

### Purchase Request (PR) Statuses

| Status ID | Status Name | Phase | Description |
| 1 | Pending | PR Creation | Awaiting division head approval |
| 2 | Processing (Division Head) | PR Approval | Division head reviewing |
| 3 | Processing (BAC) | PR Approval | BAC processing and numbering |
| 4 | Processing (Budget) | PR Approval | Budget verification |
| 5 | Processing (PARPO) | PR Approval | PARPO review |
| 6 | Canvassing (Reception) | Canvassing | Canvass session created |
| 7 | BAC Resolution | Canvassing | BAC resolution preparation |
| 8 | Canvassing (Releasing) | Canvassing | RFQ released to suppliers |
| 9 | Canvassing (Collection) | Canvassing | Collecting quotations |
| 10 | Abstract of Awards | Canvassing | AAA document prepared |
| 11 | PO (Creation) | PO Phase | Purchase order created |
| 12 | PO (Allocation) | PO Phase | Budget allocation |
| 13 | ORS (Creation) | PO Phase | ORS document prepared |
| 14 | ORS (Processing) | PO Phase | ORS approval |
| 15 | PO (Accounting) | PO Phase | Accounting review |
| 16 | PO (PARPO) | PO Phase | PARPO approval |
| 17 | PO (Serving) | PO Phase | PO served to supplier |
| 18 | Delivery (Waiting) | Delivery | Awaiting delivery |
| 19 | Delivery (Received) | Delivery | Items received |
| 20 | Delivery (IAR) | Delivery | IAR preparation |
| 21 | Delivery (IAR Processing) | Delivery | Inspector review |
| 22 | Delivery (LOA) | Delivery | LOA preparation |
| 25 | Delivery (Division Chief) | Delivery | Division chief approval |
| 26 | Payment (cancelled) | Payment | Payment cancelled |
| 27 | Cancelled | Any | Request cancelled |
| 28 | Payment Pending | Delivery → Payment | Ready for payment |
| 29 | Voucher Verification | Payment | DV preparation |
| 30 | Accounting Review | Payment | Accountant review |
| 32 | PARPO Approval | Payment | PARPO payment approval |
| 33 | Completed (PR Phase) | Completion | PR lifecycle complete |
| 34 | PARPO Office Signature | Payment | Additional PARPO signature |
| 35 | Accounting — Tax | Payment | Tax processing |
| 36 | Payment Completed | Payment | Payment issued |
| 37 | Cancelled | Any | Cancelled |

---

## Key Features of the System

### 📋 Dashboard
- Real-time overview of all procurement activities
- Status indicators for each purchase
- Color-coded by phase and completion percentage
- Shows key metrics (total commitments, pending approvals, etc.)

### 🔍 Search & Filter
- Find specific purchase requests by PR number
- Filter by department, supplier, budget account, status
- Search by item description or keywords
- Date range filtering for historical queries

### 📄 Procurement Module
- Create and manage purchase requests
- Track full workflow of each PR
- Upload supporting documents and project proposals
- View approval status and current location in workflow
- Add remarks and timeline notes
- View supplier information and quotations

### 💰 Budget Management
- Monitor available budget allocations
- View committed vs. actual spending
- Track remaining budget per account
- Generate budget utilization reports
- Prevent overspending through system controls

### 📊 Reporting & Analytics
- Dashboard with procurement metrics
- Trend analysis of spending patterns
- Supplier performance reports
- Summary reports by division, budget, or time period
- Generate PDF/Excel reports for presentations
- Historical audit trail for compliance

### 👥 User Management (Admin Only)
- Add, edit, or deactivate user accounts
- Assign roles and permissions
- Configure division assignments
- View user activity logs
- Manage authentication and access levels

### 🔐 Role-Based Access Control
- Different users see only information relevant to their role
- Workflow respects approval chains
- Prevents unauthorized modifications
- Audit trail of who approved what and when

---

## Why This System Matters

✅ **Legal Compliance**
- Follows Philippine Government Procurement Reform Act (GPRA)
- Meets Commission on Audit (COA) requirements
- Maintains official audit trail for government audits

✅ **Transparency**
- Every stakeholder can see status of their purchases
- Complete visibility of approvals and decisions
- Prevents favoritism in supplier selection

✅ **Efficiency**
- Faster than manual paper routing
- Reduces processing time from weeks to days
- Automated notifications keep workflow moving
- Reduces bottlenecks and delays

✅ **Accuracy**
- Prevents calculation errors through system validation
- Ensures amounts match across all documents
- Automatic cross-referencing of ORS and DV

✅ **Cost Control**
- Budget enforcement prevents overspending
- Competitive bidding through canvassing
- Reduces procurement costs through comparison shopping
- Audit trail prevents fraud or unauthorized spending

✅ **Accountability**
- Records who approved each step
- Timestamps show when actions occurred
- Complete history for audits and investigations
- System prevents unauthorized approval bypassing

---

## Technical Architecture

### Frontend
- **Framework**: Next.js 15+ with React 19 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom utility classes
- **Icons**: React Icons (Remix Icon set)
- **State Management**: React hooks (useState, useEffect, useMemo)
- **Routing**: Next.js App Router with dynamic routes

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom authentication with localStorage
- **API**: Supabase client-side queries
- **Real-time**: Supabase real-time subscriptions (optional)

### Key Tables
- `purchase_requests` - PR header data
- `purchase_request_items` - PR line items
- `purchase_orders` - PO header data
- `purchase_order_items` - PO line items
- `deliveries` - Delivery tracking
- `canvass_sessions` - Canvassing sessions
- `canvass_entries` - Supplier quotations
- `canvasser_assignments` - Canvasser assignments
- `bac_resolution_prs` - BAC resolution links
- `aaa_documents` - Abstract of Awards
- `ors_entries` - Obligation Request Slips
- `iar_documents` - Inspection & Acceptance Reports
- `loa_documents` - Letters of Acceptance
- `dv_documents` - Disbursement Vouchers
- `contract_documents` - Service contracts
- `remarks` - Timeline remarks and notes
- `users` - User accounts and roles
- `divisions` - Organizational divisions
- `division_budgets` - Budget allocations
- `status` - Status definitions
- `status_flag` - Status flags for tracking

### Document Generation
- **PDF**: Custom HTML builders with inline styles
  - `ContractPrintBuilder.ts` - Service contracts
  - `sharedBuildPO` - Purchase orders
  - `buildIARPrintHtml` - IAR documents
  - `buildDVPrintHtml` - Disbursement vouchers
  - `buildORSPrintHtml` - ORS documents
- **Excel**: XLSX template generation for IAR
- **Print**: iframe-based printing with `printWithIframe`

### Key Features
- **Role-based access control**: Admin, Budget, BAC, PARPO, Accounting, Supply, Division users
- **Multi-phase workflow**: PR → PO → Delivery → Payment
- **Document tracking**: Complete audit trail with timestamps
- **Budget management**: Real-time budget utilization tracking
- **Canvassing system**: Multi-supplier quote comparison
- **Delivery tracking**: IAR, LOA, DV document generation
- **Payment processing**: Multi-step voucher verification
- **Remarks timeline**: Phase-based commenting system
- **Hard delete**: Cascade deletion for admin cleanup

### Security
- **Authentication**: Username/password with role verification
- **Session management**: localStorage-based user sessions
- **Access control**: Role-based UI and action restrictions
- **Data validation**: Client-side and database constraints
- **Audit trail**: User ID and timestamp tracking on all actions

---

## Process Statistics

- **Total Status IDs**: 37 distinct workflow states
- **Main Phases**: 4 (PR, PO, Delivery, Payment)
- **Departments Involved**: 8+ (End Users, Division Heads, BAC, Budget, PARPO, Supply, Accounting, Cash)
- **Document Types**: 10+ (PR, PO, ORS, BAC Resolution, AAA, IAR, LOA, DV, Contract, Remarks)
- **User Roles**: 9+ (Admin, Budget, BAC, PARPO, Accounting, Supply, Division, PPMP, Canvasser)
- **Critical Decision Points**: Multiple (Budget availability, Document completeness, Inspection results)
- **Average Timeline**: 2-6 weeks from request to payment (varies by complexity and procurement mode)

---

## Database Schema Highlights

### Cascade Relationships
- **PR Deletion**: Removes PR items, POs, PO items, deliveries, delivery docs, canvass sessions, canvass entries, canvasser assignments, AAA docs, ORS entries, BAC links, proposals, remarks
- **PO Deletion**: Removes PO items, deliveries, IAR/LOA/DV documents, contract documents, remarks

### Key Foreign Keys
- `purchase_orders.pr_id` → `purchase_requests.id`
- `purchase_order_items.po_id` → `purchase_orders.id`
- `deliveries.po_id` → `purchase_orders.id`
- `iar_documents.delivery_id` → `deliveries.id`
- `loa_documents.delivery_id` → `deliveries.id`
- `dv_documents.delivery_id` → `deliveries.id`
- `contract_documents.po_id` → `purchase_orders.id`
- `canvass_sessions.pr_id` → `purchase_requests.id`
- `ors_entries.pr_id` → `purchase_requests.id`

### Recent Enhancements
- **Contract documents**: Full contract generation with inline text-indent paragraphs
- **Payment timestamps**: Granular tracking of payment phase completion
- **PPMP point person**: Role-based canvasser assignment
- **Hard delete**: Admin cascade deletion with preview
- **Contract toggle**: Dynamic tab in PO view when contract exists
