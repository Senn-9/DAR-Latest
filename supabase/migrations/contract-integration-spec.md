# Contract for Catering Services — Integration Spec
## Feature: Conditional Contract Document in `CreatePOModal`

---

## 1. Overview

When a Purchase Order involves a contract (e.g., catering services), users should be able to attach and fill out a **Contract for Services** document alongside the PO. This spec covers:

- The **database schema** addition needed to persist contract data
- The **checkbox trigger** in the PO creation form
- The **document/tab toggle UI** modelled after the PO ↔ ORS toggle in `ViewPOModal`
- The **field-wiring logic** (yellow = constant/editable default, purple = pulled from PO form, orange = manual input)
- The **editable live preview** for the contract document
- **Print/PDF** support for the contract

---

## 2. Database: New Table `contract_documents`

Based on `tables.ts`, add the following table to the public schema. It links 1-to-1 with a `purchase_orders` row.

```ts
// Add to tables.ts

export type ContractDocument = {
  id: number;
  po_id: number;                      // FK → purchase_orders.id
  po_no: string | null;               // mirrors purchase_orders.po_no

  // --- FIRST PARTY (purple: from PO form) ---
  first_party_agency: string | null;  // e.g. "DEPARTMENT OF AGRARIAN REFORM"
  first_party_rep: string | null;     // e.g. "RICARDO C. GARCIA" (official_name in PO)
  first_party_office: string | null;  // e.g. "Doña Dolores Bldg., Triangulo, Naga City..."
  first_party_city: string | null;    // e.g. "Naga City"

  // --- SECOND PARTY (purple: from PO form supplier) ---
  second_party_name: string | null;   // supplier name from PO
  second_party_rep: string | null;    // supplier contact / conforme signatory
  second_party_address: string | null;// supplier address from PO

  // --- CONTRACT BODY (orange: manual input) ---
  consideration_amount: number | null;   // amount in numbers
  consideration_amount_words: string | null; // auto-generated from amount, editable
  service_description: string | null;    // what is being delivered/provided
  delivery_location: string | null;      // where services are rendered
  payment_condition: string | null;      // when FIRST PARTY pays SECOND PARTY

  // --- JOB ORDER (orange: manual input) ---
  job_order_description: string | null;  // e.g. "MEALS (AM SNACKS AND LUNCH)"
  scheduled_days: string | null;         // "within ___ scheduled days"
  liquidated_damages_rate: string | null;// default "1/10th of 1%", editable

  // --- DATES (yellow: constant defaults, editable) ---
  contract_date: string | null;          // ISO date — contract signing date
  commencement_date: string | null;      // ISO date — when contract starts
  commencement_location: string | null;  // where contract commences

  // --- WITNESSES ---
  witness_one: string | null;
  witness_two: string | null;

  // --- META ---
  created_by: number | null;
  created_at: string;                    // ISO timestamp
  updated_at: string | null;
};

// Add to Database type map:
// contract_documents: { Row: ContractDocument };
```

### SQL Migration (Supabase)

```sql
create table public.contract_documents (
  id                          serial primary key,
  po_id                       integer not null references public.purchase_orders(id) on delete cascade,
  po_no                       text,

  -- First party (from PO)
  first_party_agency          text,
  first_party_rep             text,
  first_party_office          text,
  first_party_city            text,

  -- Second party (from PO supplier fields)
  second_party_name           text,
  second_party_rep            text,
  second_party_address        text,

  -- Contract body (manual)
  consideration_amount        numeric,
  consideration_amount_words  text,
  service_description         text,
  delivery_location           text,
  payment_condition           text,

  -- Job order (manual)
  job_order_description       text,
  scheduled_days              text,
  liquidated_damages_rate     text default '1/10th of 1%',

  -- Dates (editable defaults)
  contract_date               date,
  commencement_date           date,
  commencement_location       text,

  -- Witnesses
  witness_one                 text,
  witness_two                 text,

  -- Meta
  created_by                  integer references public.users(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz
);
```

> **Note:** No new column is needed on `purchase_orders` itself. The contract's existence is implied by the presence of a `contract_documents` row for a given `po_id`. The UI checkbox in `CreatePOModal` is a local state flag that controls whether the contract block is saved at PO creation time.

---

## 3. Field Colour Map (from contract image)

| Colour | Meaning | Source |
|--------|---------|--------|
| 🟡 Yellow | Constant placeholder — shown as default, user can still edit before saving | Hard-coded default string in component state |
| 🟣 Purple | Pulled from PO form inputs — wired directly, read-only in contract preview but changes when PO form changes | `poForm` state values |
| 🟠 Orange | Manual input — user must type these in the contract form panel | Dedicated contract state fields |

### Field-by-field mapping

| Contract Field | Colour | Wired To |
|----------------|--------|---------|
| "DEPARTMENT OF AGRARIAN REFORM" | 🟣 Purple | `officialName` or `officeSection` in PO form → `first_party_agency` |
| "RICARDO C. GARCIA" (First Party rep) | 🟣 Purple | `officialName` in PO form → `first_party_rep` |
| Office address line | 🟡 Yellow | Default `"Doña Dolores Bldg., Triangulo, Naga City, Camarines Sur"`, editable → `first_party_office` |
| "Naga City" (city of First Party) | 🟣 Purple | Derived from `deliveryPlace` or `officeSection` → `first_party_city` |
| Supplier name ("PENDONG'S CAFÉ") | 🟣 Purple | `supplier` in PO form → `second_party_name` |
| Supplier rep ("JINKY ARCILLA") | 🟠 Orange | Manual input → `second_party_rep` |
| Consideration amount (₱ number) | 🟣 Purple | `grandTotal` computed from PO items → `consideration_amount` |
| Consideration amount in words | 🟡 Yellow | Auto-generated from `grandTotal` via `toWords()`, editable → `consideration_amount_words` |
| Service description block | 🟠 Orange | Manual textarea → `service_description` |
| Delivery location | 🟠 Orange | Manual textarea → `delivery_location` |
| Payment condition text | 🟠 Orange | Manual textarea → `payment_condition` |
| Job order description ("MEALS…") | 🟠 Orange | Manual input → `job_order_description` |
| Scheduled days count | 🟠 Orange | Manual number input → `scheduled_days` |
| Liquidated damages rate | 🟡 Yellow | Default `"1/10th of 1%"`, editable → `liquidated_damages_rate` |
| Contract date ("March 12, 2026") | 🟠 Orange | Date input → `contract_date` |
| Commencement date | 🟠 Orange | Date input → `commencement_date` |
| Commencement location | 🟣 Purple | `supplier` or `address` (supplier location) → `commencement_location` |
| "12th day of March, 2026" (signing date) | 🟠 Orange | Derived from `contract_date` (day/month/year split), editable → `contract_date` |
| First Party signatory label | 🟣 Purple | `officialName` → displayed below signature line |
| Second Party signatory label | 🟣 Purple | `second_party_rep` (from orange input above) |
| Witness One | 🟠 Orange | Manual → `witness_one` |
| Witness Two | 🟠 Orange | Manual → `witness_two` |

---

## 4. UI Changes in `CreatePOModal`

### 4.1 — Checkbox in PO Form Panel

Add a checkbox near the bottom of the left-side form panel (before the footer buttons), inside its own card:

```tsx
{/* Contract Toggle — in form panel, before footer */}
<div className="mx-8 mb-4 p-4 rounded-lg border border-dashed border-amber-400 bg-amber-50">
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={includesContract}
      onChange={(e) => setIncludesContract(e.target.checked)}
      className="w-4 h-4 accent-amber-500 cursor-pointer"
    />
    <span className="text-sm font-semibold text-amber-800">
      This PO involves a Contract for Services
    </span>
  </label>
  {includesContract && (
    <p className="mt-1 ml-7 text-xs text-amber-700">
      A contract document tab will appear in the preview panel. Fill in the contract fields before saving.
    </p>
  )}
</div>
```

**State to add in `CreatePOModal`:**

```tsx
const [includesContract, setIncludesContract] = useState(false);

// Contract document fields state
const [contractFields, setContractFields] = useState<ContractFormState>({
  firstPartyOffice: "Doña Dolores Bldg., Triangulo, Naga City, Camarines Sur",
  secondPartyRep: "",
  serviceDescription: "",
  deliveryLocation: "",
  paymentCondition: "",
  jobOrderDescription: "",
  scheduledDays: "",
  liquidatedDamagesRate: "1/10th of 1%",
  contractDate: "",
  commencementDate: "",
  witnessOne: "",
  witnessTwo: "",
  considerationAmountWords: "", // auto-filled but editable
});

// Keep considerationAmountWords in sync with grand total (but allow manual override)
const [amountWordsOverridden, setAmountWordsOverridden] = useState(false);
useEffect(() => {
  if (!amountWordsOverridden) {
    setContractFields(prev => ({
      ...prev,
      considerationAmountWords: toWords(grandTotal),
    }));
  }
}, [grandTotal, amountWordsOverridden]);
```

### 4.2 — Tab Toggle in the Preview Panel (upper-right)

Mirroring the PO ↔ ORS toggle in `ViewPOModal`, add a segmented toggle in the preview panel header. This toggle **only appears** when `includesContract === true`.

Replace the current preview header block:

```tsx
{/* Current header in preview panel */}
<div className="flex items-center justify-between mb-4">
  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
  <button ...>Total Row: Visible/Hidden</button>
</div>
```

With:

```tsx
<div className="flex items-center justify-between mb-4">
  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">LIVE PREVIEW</h3>
  <div className="flex items-center gap-2">
    {/* Only show toggle when contract checkbox is checked */}
    {includesContract && (
      <div className="flex rounded-lg border border-gray-300 overflow-hidden text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setActivePreviewTab("po")}
          className={`px-3 py-1 transition-colors ${
            activePreviewTab === "po"
              ? "bg-emerald-700 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          Purchase Order
        </button>
        <button
          type="button"
          onClick={() => setActivePreviewTab("contract")}
          className={`px-3 py-1 transition-colors ${
            activePreviewTab === "contract"
              ? "bg-amber-600 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          Contract
        </button>
      </div>
    )}
    {/* Existing Total Row toggle — only on PO tab */}
    {activePreviewTab === "po" && (
      <button
        type="button"
        onClick={() => setHideTotalRow((v) => !v)}
        className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
          hideTotalRow
            ? "bg-emerald-100 border-emerald-400 text-emerald-700"
            : "bg-gray-100 border-gray-300 text-gray-500"
        }`}
      >
        {hideTotalRow ? "Total Row: Hidden" : "Total Row: Visible"}
      </button>
    )}
  </div>
</div>
```

**New state:**

```tsx
const [activePreviewTab, setActivePreviewTab] = useState<"po" | "contract">("po");

// Reset tab to "po" when contract is unchecked
useEffect(() => {
  if (!includesContract) setActivePreviewTab("po");
}, [includesContract]);
```

### 4.3 — Conditional Preview Rendering

In the preview panel body, wrap the existing `<POEditablePreview>` and add the new `<ContractEditablePreview>`:

```tsx
<div className="bg-white rounded-lg shadow-lg p-4 text-black">
  {activePreviewTab === "po" ? (
    <POEditablePreview
      {/* ...existing props... */}
    />
  ) : (
    <ContractEditablePreview
      // Purple: wired from PO form state
      firstPartyAgency={officeSection || "DEPARTMENT OF AGRARIAN REFORM"}
      firstPartyRep={officialName}
      firstPartyCity={deliveryPlace || ""}
      secondPartyName={supplier}
      considerationAmount={grandTotal}
      commencementLocation={address}

      // All contract fields state (orange + yellow)
      fields={contractFields}
      setFields={setContractFields}
      onAmountWordsManualEdit={() => setAmountWordsOverridden(true)}
    />
  )}
</div>
```

---

## 5. `ContractEditablePreview` Component

Create a new component (can live in the same file or in a separate `ContractEditablePreview.tsx`). It renders the contract document with the same editable-textarea approach used in `POEditablePreview`.

### Structure

The component renders the full contract text as a printable document with inline `<textarea>` elements for editable fields, matching the style constants (`editableInputCls`, `autoResize`) already defined in `CreatePOModal`.

```tsx
type ContractFormState = {
  firstPartyOffice: string;
  secondPartyRep: string;
  serviceDescription: string;
  deliveryLocation: string;
  paymentCondition: string;
  jobOrderDescription: string;
  scheduledDays: string;
  liquidatedDamagesRate: string;
  contractDate: string;        // ISO date string "YYYY-MM-DD"
  commencementDate: string;    // ISO date string
  witnessOne: string;
  witnessTwo: string;
  considerationAmountWords: string;
};

type ContractEditablePreviewProps = {
  // Purple: from PO
  firstPartyAgency: string;
  firstPartyRep: string;
  firstPartyCity: string;
  secondPartyName: string;
  considerationAmount: number;
  commencementLocation: string;
  // Form state
  fields: ContractFormState;
  setFields: (f: ContractFormState) => void;
  onAmountWordsManualEdit: () => void;
};
```

### Document Layout

The preview renders in Times New Roman (matching government document style), structured as:

```
CONTRACT FOR [SERVICE TYPE]         ← body text, rendered from serviceDescription
                                       (constant label "CONTRACT FOR" is editable)

KNOW ALL MEN BY THESE PRESENTS:    ← constant, editable

  This contract, executed by and between [firstPartyAgency — PURPLE]
  Provincial Office, represented by [firstPartyRep — PURPLE]
  with office address at [firstPartyOffice — YELLOW textarea]
  [firstPartyCity — PURPLE], hereinafter referred to as the party of the FIRST PART;
  and [secondPartyName — PURPLE], represented by [secondPartyRep — ORANGE textarea]
  a Filipino, of legal age and a resident of [secondPartyCity derived from address — ORANGE]
  hereinafter referred to as the party of the SECOND PART.

              W I T N E S S E T H    ← constant, editable

  That for and in consideration of the sum of [considerationAmount — PURPLE, formatted ₱]
  ([considerationAmountWords — YELLOW auto-generated, editable textarea])
  which the FIRST PARTY agreed to pay unto the SECOND PARTY, the SECOND PARTY
  agrees to deliver/provide the [serviceDescription — ORANGE textarea]

  That the FIRST PARTY shall pay the full amount to the SECOND PARTY when
  [paymentCondition — ORANGE textarea]

  That the SECOND PARTY agrees to finish the JOB ORDER within [scheduledDays — ORANGE]
  scheduled days counted from the day the contract for the [jobOrderDescription — ORANGE]
  [contractDate — ORANGE date] has been issued by the FIRST PARTY; and should the SECOND
  PARTY fail to finish the job within the said period, the SECOND PARTY shall indemnify
  the sum of [liquidatedDamagesRate — YELLOW editable] for every day of delay of
  liquidated damages.

  That this Contract shall commence on [commencementDate — ORANGE date]
  at [commencementLocation — PURPLE].

  IN WITNESS WHEREOF, the parties signed this contract on the [day from contractDate]
  day of [month from contractDate], [year from contractDate].

[firstPartyAgency]                        [secondPartyName]
________________________________          ________________________________
[firstPartyRep — PURPLE]                  [secondPartyRep — ORANGE]
(Signature of the FIRST PARTY)            (Signature of the SECOND PARTY)

                    WITNESSES:
________________________________          ________________________________
[witnessOne — ORANGE]                     [witnessTwo — ORANGE]
```

### Editable Body Text

All **non-highlighted body text** (boilerplate legal language) should be rendered as `<textarea>` elements with the existing `editableInputCls` class and `autoResize` handler. Group them by paragraph for logical editing. This ensures users can correct typos or localise wording before saving or printing.

Suggested grouping:
- `contractTitle` — "CONTRACT FOR CATERING SERVICES"  
- `preamble` — "This contract, executed by and between…" (intro paragraph, splits around injected fields)
- `witnessethIntro` — "That for and in consideration of the sum of…"
- `paymentClause` — "That the FIRST PARTY shall pay the full amount…"
- `jobOrderClause` — "That the SECOND PARTY agrees to finish the JOB ORDER…"
- `commencementClause` — "That this Contract shall commence on…"
- `inWitnessClause` — "IN WITNESS WHEREOF…"

Store these in `contractFields` state as additional keys so they persist and can be included in the saved record (store as `particulars` JSON blob or individual text columns — see DB note below).

---

## 6. Saving Contract Data

### On `handleSubmit` in `CreatePOModal`

After the PO is created (i.e., after `onCreate()` resolves and you have the new `po_id`), conditionally insert the contract document:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  try {
    // 1. Create the PO (existing logic)
    await onCreate(poHeader, items);
    // onCreate should return or expose the new po_id.
    // If it doesn't yet, update it to return { id } from the insert.

    // 2. If contract checkbox is checked, insert contract document
    if (includesContract && newPoId) {
      const supabase = createClient();
      await supabase.from("contract_documents").insert({
        po_id: newPoId,
        po_no: poNo,
        first_party_agency: officeSection || "DEPARTMENT OF AGRARIAN REFORM",
        first_party_rep: officialName,
        first_party_office: contractFields.firstPartyOffice,
        first_party_city: deliveryPlace,
        second_party_name: supplier,
        second_party_rep: contractFields.secondPartyRep,
        second_party_address: address,
        consideration_amount: grandTotal,
        consideration_amount_words: contractFields.considerationAmountWords,
        service_description: contractFields.serviceDescription,
        delivery_location: contractFields.deliveryLocation,
        payment_condition: contractFields.paymentCondition,
        job_order_description: contractFields.jobOrderDescription,
        scheduled_days: contractFields.scheduledDays,
        liquidated_damages_rate: contractFields.liquidatedDamagesRate,
        contract_date: contractFields.contractDate || null,
        commencement_date: contractFields.commencementDate || null,
        commencement_location: address,
        witness_one: contractFields.witnessOne,
        witness_two: contractFields.witnessTwo,
        created_by: currentUserId,
      });
    }
    // Show success, close modal...
  } catch (err) {
    // Show error...
  } finally {
    setSaving(false);
  }
};
```

> **Note:** The `onCreate` prop currently returns `Promise<void>`. It should be updated to return `Promise<{ id: number }>` or the `CreatePOModal` should do its own Supabase insert instead of delegating, so the new `po_id` is available for the contract insert.

---

## 7. PDF/Print Support for the Contract

Add a `buildContractPrintHtml()` utility (in `utils/print/ContractPrintBuilder.ts`) that mirrors `POPrintBuilder` and `ORSPrintBuilder`. It accepts all contract fields and returns an HTML string with print styles for A4/Letter.

In the contract preview panel, add a PDF button (same pattern as the existing PDF button):

```tsx
{activePreviewTab === "contract" && includesContract && (
  <button
    type="button"
    onClick={() => downloadContractPDF({ ...contractFields, ...purpleFields })}
    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg"
  >
    <RiFilePdf2Line size={16} /> Contract PDF
  </button>
)}
```

---

## 8. `ViewPOModal` Extension (Future Phase)

When viewing an existing PO that has a `contract_documents` row, the `ViewPOModal` should:

1. Detect the contract (`useEffect` fetching `contract_documents` by `po_id`)
2. Add a third tab **"Contract"** to the existing PO / ORS toggle
3. Render a read-only `ContractPreview` (same layout as `ContractEditablePreview` but with `readonlyCls` inputs)
4. Provide a **Download PDF** button for the contract

This mirrors the exact pattern used for ORS in `ViewPOModal`.

---

## 9. Summary Checklist

- [ ] Add `contract_documents` table to Supabase (run SQL migration)
- [ ] Add `ContractDocument` type to `tables.ts`
- [ ] Add `includesContract` checkbox to `CreatePOModal` form panel
- [ ] Add `activePreviewTab` state + tab toggle UI (upper-right of preview panel)
- [ ] Create `ContractFormState` type and initialize state in `CreatePOModal`
- [ ] Wire purple fields (officialName → firstPartyRep, supplier → secondPartyName, grandTotal → considerationAmount, etc.)
- [ ] Auto-generate `considerationAmountWords` from `grandTotal` via `toWords()`, allow override
- [ ] Build `ContractEditablePreview` component with editable body text and inline orange/yellow inputs
- [ ] On form submit: insert `contract_documents` row using new `po_id`
- [ ] Update `onCreate` prop type to return `{ id: number }` so `po_id` is accessible
- [ ] Create `ContractPrintBuilder.ts` for PDF/print output
- [ ] Add Contract PDF button in preview panel when `activePreviewTab === "contract"`
- [ ] (Future) Extend `ViewPOModal` with a third "Contract" tab for read-only viewing
