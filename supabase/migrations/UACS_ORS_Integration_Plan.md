# UACS Table & ORS Modal Integration Plan

## Overview

This document covers four interconnected changes:

1. Create a `uacs_codes` database table seeded from the uploaded XLSB data
2. Wire the UACS input in `ORSProcessModal` to an autocomplete/suggestion UI that queries that table
3. Auto-populate the **Particulars** field (Section B of the ORS form) from the UACS description column whenever a code is selected
4. Refine **Section C (Status of Obligation)** in the live preview:
   - Remove the editable Payable Amount cell
   - Pre-fill the **ORS/JEV/Check/ADA/TRA No.** column with `orsNo`
   - Rename "Serial No." → "ORS No." in both `ORSPreview` and `ORSEditablePreview`

---

## 1. Database Table — `uacs_codes`

### Schema

```sql
create table public.uacs_codes (
  id          serial primary key,
  uacs_code   text not null unique,   -- e.g. "50203010 02"
  description text not null,          -- e.g. "Office Supplies Expenses"
  created_at  timestamptz default now()
);

-- Index for fast prefix / similarity search
create index uacs_codes_code_idx on public.uacs_codes using gin (uacs_code gin_trgm_ops);
create index uacs_codes_desc_idx on public.uacs_codes using gin (description gin_trgm_ops);
```

> Requires `pg_trgm` extension (already available in Supabase):
> `create extension if not exists pg_trgm;`

### TypeScript Type (add to `tables.ts`)

```ts
export type UacsCode = {
  id: number;
  uacs_code: string;
  description: string;
  created_at: string; // ISO timestamp
};
```

Add to the `Database` map:

```ts
uacs_codes: { Row: UacsCode };
```

### Seed Data (83 rows from XLSB)

All 80 code–description pairs extracted from `uacs.xlsb` (Sheet1, columns I & J, rows 5–84). A representative sample:

| uacs_code     | description                                      |
|---------------|--------------------------------------------------|
| 50101010 01   | Salaries and Wages - Regular                     |
| 50102010 01   | Personal Economic Relief Allowance (PERA)        |
| 50203010 02   | Office Supplies Expenses                         |
| 50203210 03   | Semi-Expendable Machinery - ICT Equipment        |
| 50213050 03   | Repair & Maintenance - ICT Equipment             |
| 50299990 99   | Other Maintenance and Operating Expenses         |
| …             | …                                                |

Run as a single `insert` migration or via Supabase Studio CSV import.

---

## 2. UACS Autocomplete in `ORSProcessModal`

### Behaviour

- As the user types in the UACS code input field, suggestions appear in a floating dropdown.
- Matching is done against **both** `uacs_code` and `description` columns using a Supabase `ilike` (or `%` wildcard) query with a small debounce (≈ 250 ms).
- Up to **8 suggestions** are shown; each row displays the code on the left and the description on the right.
- Selecting a suggestion:
  1. Sets `uacsCode` to the selected code.
  2. Sets `particulars` to the selected description (see §3 below).
  3. Closes the dropdown.
- The user can still free-type any value and choose not to pick a suggestion.

### New hook — `useUacsSearch`

Create `hooks/useUacsSearch.ts`:

```ts
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { UacsCode } from "@/utils/supabase/tables";

export function useUacsSearch(query: string) {
  const [results, setResults] = useState<UacsCode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("uacs_codes")
        .select("*")
        .or(`uacs_code.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(8);
      setResults(data ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
}
```

### New component — `UacsCombobox`

Create `components/UacsCombobox.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { useUacsSearch } from "@/hooks/useUacsSearch";
import type { UacsCode } from "@/utils/supabase/tables";

interface Props {
  value: string;
  onChange: (code: string, description: string) => void;
  inputClassName?: string;
}

export function UacsCombobox({ value, onChange, inputClassName }: Props) {
  const [open, setOpen] = useState(false);
  const { results, loading } = useUacsSearch(open ? value : "");
  const ref = useRef<HTMLDivElement>(null);

  const select = (row: UacsCode) => {
    onChange(row.uacs_code, row.description);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        className={inputClassName}
        value={value}
        onChange={(e) => { onChange(e.target.value, ""); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="UACS Object Code"
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) && (
        <div style={{
          position: "absolute", zIndex: 50, top: "100%", left: 0,
          background: "#fff", border: "1px solid #d1d5db", borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,.12)", minWidth: 340, maxHeight: 220,
          overflowY: "auto", fontSize: "8pt",
        }}>
          {loading && (
            <div style={{ padding: "6px 10px", color: "#6b7280" }}>Searching…</div>
          )}
          {results.map((r) => (
            <div
              key={r.id}
              onMouseDown={() => select(r)}
              style={{
                display: "flex", gap: 12, padding: "5px 10px", cursor: "pointer",
                borderBottom: "1px solid #f3f4f6",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ed")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <span style={{ fontWeight: 600, whiteSpace: "nowrap", color: "#92400e" }}>
                {r.uacs_code}
              </span>
              <span style={{ color: "#374151" }}>{r.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Wire into `ORSProcessModal`

In the left-panel form section that currently renders the UACS code `<input>`, replace it with:

```tsx
<UacsCombobox
  value={uacsCode}
  onChange={(code, desc) => {
    setUacsCode(code);
    if (desc) setParticulars(desc); // auto-fill particulars (§3)
  }}
  inputClassName={inputCls}
/>
```

The same replacement applies in `ORSEditablePreview` where `uacsCode` is rendered as an inline editable field inside the live preview table — swap the raw `<input>` for `<UacsCombobox>` with the same `onChange` handler.

---

## 3. Auto-populate Particulars from UACS Description

When a suggestion is selected, `onChange(code, description)` fires. The handler:

```ts
if (desc) setParticulars(desc);
```

- Only overwrites `particulars` when a suggestion is actively picked (not on every keystroke).
- The user can still manually edit `particulars` afterward; it remains a free-text field.
- In the live preview (`ORSEditablePreview`), `particulars` is already displayed in the Particulars column of the main table and echoed in Section C row — both update reactively since they share state.

---

## 4. Section C Refinements

### 4a. Remove Payable Amount cell

**In `ORSEditablePreview`** (live preview, `blankStatusSection === false` branch), delete the `<td>` that renders an editable `payableAmount` input:

```tsx
// DELETE this entire <td>:
<td style={{ ...S.tdR, borderTop: "none", borderBottom: "none", fontSize: "7.5pt" }}>
  <input type="number" step="0.01" value={payableAmount || ""}
    onChange={(e) => setPayableAmount(Number(e.target.value))}
    className={editableInputNumberCls} style={{ width: "90%" }} />
</td>
```

Replace with an empty read-only cell (to keep the column structure intact for the Payable header):

```tsx
<td style={{ ...S.tdR, borderTop: "none", borderBottom: "none", fontSize: "7.5pt" }}></td>
```

Do the same in `ORSPreview` (the print-only version) — already an empty display; no `payableAmount` is rendered there in the data row, so only verify it stays consistent.

Also remove the **Payable Amount** input from the left-panel form in `ORSProcessModal` (inside the "B. Amounts" section):

```tsx
// DELETE:
<div>
  <label className={labelCls}>Payable Amount</label>
  <input type="number" className={inputCls} placeholder="0.00"
    value={payableAmount || ""}
    onChange={(e) => setPayableAmount(Number(e.target.value))}
    step="0.01" />
</div>
```

> `payableAmount` state and its prop threading can be removed entirely from the component tree once the field is gone from both the form and the preview.

### 4b. Pre-fill ORS No. in the "ORS/JEV/Check/ADA/TRA No." column

In `ORSEditablePreview`, the `referenceNo` input currently renders in that cell. Change it so the field is **pre-filled with `orsNo`** on mount and whenever `orsNo` changes:

```tsx
// In ORSEditablePreview, add a useEffect:
useEffect(() => {
  if (orsNo && !referenceNo) setReferenceNo(orsNo);
}, [orsNo]);
```

Or, simpler — drive it directly from the parent's state: whenever `orsNo` changes, sync `referenceNo` to it (unless the user has manually overridden it). A controlled approach in `ORSProcessModal`:

```ts
// After setOrsNo:
const handleOrsNoChange = (v: string) => {
  setOrsNo(v);
  setReferenceNo(v); // keep in sync
};
```

Pass `handleOrsNoChange` as `setOrsNo` to `ORSEditablePreview`.

### 4c. Rename "Serial No." → "ORS No."

**In `ORSEditablePreview`** (around line 185–190 in the original file):

```tsx
// BEFORE:
<span style={S.b}>Serial No. :&nbsp;</span>

// AFTER:
<span style={S.b}>ORS No. :&nbsp;</span>
```

**In `ORSPreview`** (around line 638–640):

```tsx
// BEFORE:
<span style={S.b}>Serial No. : </span>

// AFTER:
<span style={S.b}>ORS No. : </span>
```

---

## 5. Prop / State Cleanup

After implementing the above, these items can be removed or simplified:

| Item | Action |
|------|--------|
| `payableAmount` state in `ORSProcessModal` | Remove |
| `payableAmount` / `setPayableAmount` props on `ORSEditablePreview` | Remove |
| `payableAmount` / `setPayableAmount` props on `ORSPreview` | Remove (already not rendered in data row) |
| `referenceNo` initial value | Default to `orsNo` on first load |

---

## 6. Migration Checklist

- [ ] Enable `pg_trgm` extension in Supabase (one-time, Dashboard → Extensions)
- [ ] Run `create table uacs_codes` migration
- [ ] Seed all 80 rows from `uacs.xlsb`
- [ ] Add `UacsCode` type to `tables.ts` and `Database` map
- [ ] Create `hooks/useUacsSearch.ts`
- [ ] Create `components/UacsCombobox.tsx`
- [ ] Replace UACS `<input>` in left-panel form with `<UacsCombobox>`
- [ ] Replace UACS `<input>` in `ORSEditablePreview` with `<UacsCombobox>`
- [ ] Add `onChange` handler that calls `setParticulars(desc)` on selection
- [ ] Remove Payable Amount `<td>` from `ORSEditablePreview` data row
- [ ] Remove Payable Amount `<input>` from left-panel "B. Amounts" section
- [ ] Sync `referenceNo` ← `orsNo` via `handleOrsNoChange`
- [ ] Rename "Serial No." → "ORS No." in both preview components
- [ ] Remove `payableAmount` prop threading end-to-end
- [ ] QA: pick a UACS code, confirm Particulars auto-fills, Section C ORS No. column shows `orsNo`, Serial/ORS label is correct
