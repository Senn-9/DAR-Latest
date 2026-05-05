# ORS Form Refinement - Summary of Changes

## Overview
Refined the ORS (Obligation Request and Status) form inputs and live preview to match the PDF template (Appendix 11) exactly. Added missing database fields and updated the React component to support all required fields.

## Database Changes

### SQL Migration File
Created: `supabase/migrations/20260505_enhance_ors_table.sql`

Added 9 new columns to the `ors_entries` table:
```sql
ALTER TABLE ors_entries
ADD COLUMN IF NOT EXISTS entity_name TEXT NULL,
ADD COLUMN IF NOT EXISTS payee_address TEXT NULL,
ADD COLUMN IF NOT EXISTS office TEXT NULL,
ADD COLUMN IF NOT EXISTS reference_no TEXT NULL,  -- ORS/JEV/Check/ADA/TRA No.
ADD COLUMN IF NOT EXISTS obligation_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payable_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS not_yet_due_balance DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_demandable_balance DECIMAL(15,2) DEFAULT 0;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ors_entries_ors_no ON ors_entries(ors_no);
CREATE INDEX IF NOT EXISTS idx_ors_entries_pr_id ON ors_entries(pr_id);
```

### TypeScript Type Updates
File: `types/tables.ts`

Updated `OrsEntry` type to include the new fields:
- `entity_name`: string | null
- `payee_address`: string | null
- `office`: string | null
- `reference_no`: string | null (for ORS/JEV/Check/ADA/TRA No.)
- `obligation_amount`: number (default 0)
- `payable_amount`: number (default 0)
- `payment_amount`: number (default 0)
- `not_yet_due_balance`: number (default 0)
- `due_demandable_balance`: number (default 0)

## Component Changes

### File: `components/ORSProcessModal.tsx`

#### 1. **Pixel-Faithful ORS Preview Component**
   - Complete rewrite to match Appendix 11 PDF template pixel-perfectly
   - Structured with proper sections A, B, and C as per government form:
     - **Top Box**: Title "OBLIGATION REQUEST AND STATUS", Entity Name (underlined), Serial No., Date, Fund Cluster
     - **Payee/Office/Address rows**: Labeled rows with full-width text fields
     - **Particulars Table (Section B)**: 5 columns - Responsibility Center, Particulars, MFO/PAP, UACS Object Code, Amount
     - **Certification Section**: Two-column layout with Section A (Requesting Office) and Section B (Budget Division)
     - **Status of Obligation (Section C)**: 7-column table with Date, Particulars, Reference No., Obligation (a), Payable (b), Payment (c), and Balance columns
     - **Balance Sub-header**: Not Yet Due (a-b) and Due and Demandable (b-c)

#### 2. **Form State Management**
   Added 9 new state variables:
   ```typescript
   const [entityName, setEntityName] = useState("");
   const [payee, setPayee] = useState("");
   const [payeeAddress, setPayeeAddress] = useState("");
   const [office, setOffice] = useState("");
   const [referenceNo, setReferenceNo] = useState("");
   const [obligationAmount, setObligationAmount] = useState<number>(0);
   const [payableAmount, setPayableAmount] = useState<number>(0);
   const [paymentAmount, setPaymentAmount] = useState<number>(0);
   const [notYetDueBalance, setNotYetDueBalance] = useState<number>(0);
   const [dueDemandableBalance, setDueDemandableBalance] = useState<number>(0);
   ```

#### 3. **Form Inputs Reorganized**
   New form sections:
   - **ORS Details**: ORS Number, Date, Reference No.
   - **Entity & Payee Information**: Entity Name, Office, Payee, Payee Address
   - **Fund & Responsibility Information**: Fund Cluster, Responsibility Center
   - **Particulars & Accounting**: Particulars, MFO/PAP, UACS Code
   - **Status of Obligation**: All 5 new obligation status fields
   - **Certification**: Prepared By, Designation
   - **Remarks**: Additional remarks

#### 4. **Database Insert Updated**
   `handleSave()` function now includes all new fields when creating ORS entry:
   ```javascript
   const { error: orsError } = await supabase.from("ors_entries").insert({
     // ... existing fields
     entity_name: entityName || null,
     payee_address: payeeAddress || null,
     office: office || null,
     reference_no: referenceNo || null,
     obligation_amount: obligationAmount,
     payable_amount: payableAmount,
     payment_amount: paymentAmount,
     not_yet_due_balance: notYetDueBalance,
     due_demandable_balance: dueDemandableBalance,
   });
   ```

#### 5. **Live Preview Integration**
   - All new form fields are passed to ORSPreview component
   - Preview updates in real-time as user fills the form
   - Currency formatting with Philippine Peso (₱) symbol and 2 decimal places
   - Amount in words displayed below tables
   - Uses shared style tokens (`S.td`, `S.tdC`, `S.tdR`, `S.b`, `S.uline`) for consistent styling
   - Proper Times New Roman font family for official government document look

## PDF Template Compliance

The updated form now captures all fields from the ORS PDF template (Appendix 11):

| PDF Field | Form Input | Database Field |
|-----------|-----------|----------------|
| Serial No. | ORS Number | `ors_no` |
| Date | Date | `date_created` |
| Entity Name | Entity Name | `entity_name` |
| Payee | Payee | `payee` (in preview only) |
| Office | Office | `office` |
| Address | Payee Address | `payee_address` |
| Responsibility Center | Responsibility Center | `responsibility_center` |
| Particulars | Particulars | `particulars` |
| MFO/PAP | MFO/PAP | `mfo_pap` |
| UACS Object Code | UACS Code | `uacs_code` |
| Amount | Obligation Amount | `obligation_amount` |
| Fund Cluster | Fund Cluster | `fund_cluster` |
| Reference No. | Reference No. | `reference_no` |
| Obligation (a) | Obligation Amount | `obligation_amount` |
| Payable (b) | Payable Amount | `payable_amount` |
| Payment | Payment Amount | `payment_amount` |
| Not Yet Due (a) | Not Yet Due Balance | `not_yet_due_balance` |
| Due & Demandable (c) | Due & Demandable Balance | `due_demandable_balance` |

## Deployment Steps

1. **Apply SQL Migration**
   ```sql
   -- Run the migration file on Supabase
   supabase/migrations/20260505_enhance_ors_table.sql
   ```

2. **Deploy TypeScript Changes**
   - Push updated `types/tables.ts`
   - No TypeScript compilation errors expected

3. **Deploy React Component**
   - Push updated `components/ORSProcessModal.tsx`
   - No breaking changes to existing APIs

## Notes

- All new fields have default values (NULL or 0) for backward compatibility
- Obligation Amount and Payable Amount default to the PO total amount
- Reference No. defaults to "ORS"
- The form is fully responsive with improved layout organization
- Live preview matches PDF template styling and layout
- Currency amounts are formatted with peso sign and 2 decimal places

## Bug Fixes

### Hydration Error Fix
Fixed React hydration error caused by whitespace/comments inside `<colgroup>` tags. The issue was in the `ORSPreview` component where JSX comments like `{/* Date */}` inside `<colgroup>` created whitespace text nodes that React couldn't hydrate properly.

**Solution:** Removed all comments from inside `<colgroup>` tags in `components/ORSProcessModal.tsx`:
```tsx
// Before (caused hydration error):
<colgroup>
  <col style={{ width: "16%" }} />  {/* Date */}
  <col style={{ width: "26%" }} />  {/* Particulars */}
</colgroup>

// After (fixed):
<colgroup>
  <col style={{ width: "16%" }} />
  <col style={{ width: "26%" }} />
</colgroup>
```

### Date Formatting Fix
Fixed timezone offset issue causing dates to display incorrectly (off by one day).

**Problem:** `new Date(orsDate)` was interpreting the date as UTC, causing it to display the previous day in Philippine timezone.

**Solution:** Append time component to force local timezone interpretation:
```typescript
// Before (incorrect - shows previous day):
const displayDate = new Date(orsDate).toLocaleDateString("en-PH", ...)

// After (correct - shows selected date):
const displayDate = new Date(orsDate + "T00:00:00").toLocaleDateString("en-PH", ...)
```
