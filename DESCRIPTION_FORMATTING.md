# Description Formatting Features — PR & PO

This document explains how bold, center alignment, and multi-line (newline) formatting are implemented and integrated across the Purchase Request (PR) and Purchase Order (PO) flows.

---

## Overview

Each line item description in both PR and PO supports three formatting options:

| Feature | Trigger | Stored As |
|---|---|---|
| **Bold** | `B` toggle button | `isBold` (PR) / `bold_description` (PO) |
| **Center align** | `≡` toggle button | `isCenter` (PR) / `center_description` (PO) |
| **Multi-line** | Enter key in textarea | `\n` characters in the description string |

All three are purely client-side/session-level UI flags — they are **not** persisted to the database. They apply during the current editing session and carry through to the live preview and printed output.

---

## How Each Feature Works

### Bold (`B` button)

- Clicking `B` toggles a boolean flag on the item (`isBold` for PR, `bold_description` for PO).
- The flag applies `font-weight: bold` to:
  - The form-side textarea input
  - The live preview description cell
  - The printed HTML `<td>` via inline `font-weight:bold` style

### Center Align (`≡` button)

- Clicking `≡` toggles a boolean flag (`isCenter` for PR, `center_description` for PO).
- The flag changes `text-align` from `left` → `center` across:
  - The form-side textarea
  - The live preview description cell (`textAlign` style)
  - The printed HTML `<td>` via inline `text-align:center` style

### Multi-line (Enter / newlines)

- The form-side description field is a `<textarea>` (resizable), allowing `Enter` to insert `\n`.
- The live preview also uses a `<textarea>` (auto-resizing via `onInput`) — newlines are preserved naturally.
- The read-only preview pane uses `white-space: pre-wrap` on the description `<td>`, so `\n` chars in the text render as line breaks.
- The print builder outputs the description string with `white-space:pre-wrap` on the `<td>`, so `\n` characters in the escaped text render as line breaks when printed.
- **Note:** `escapeHtml()` (in `printUtils.ts`) does NOT escape `\n`, so newlines pass through unchanged to the print output.

---

## Integration by File

### Purchase Request

#### `components/PRModalComponent.tsx` — Create PR

- **Type:** `ItemDataType` includes `isBold?: boolean` and `isCenter?: boolean`.
- **`emptyItem()`** initialises both flags to `false`.
- **`toggleItemFlag(index, flag)`** — toggles `isBold` or `isCenter` on an item in state.
- **Form side (left panel):** Each item card has:
  - A label row with `B` and `≡` toggle buttons (active = emerald, inactive = gray).
  - A `<textarea rows={3} style={{ resize: "vertical" }}>` for the description — reflects `font-bold` and `text-center` Tailwind classes from the flags.
- **Live preview (`PREditablePreview` component):**
  - Description `<td>` applies `textAlign: item.isCenter ? "center" : "left"`.
  - Inside the td, mini `B`/`≡` buttons (5×4px) let the user toggle directly in the preview.
  - `<textarea>` inside applies `fontWeight: item.isBold ? 'bold' : 'normal'` and uses `editableInputCenterCls` vs `editableInputCls` based on `isCenter`.
  - Auto-resizes on input via `onInput={autoResize}`.
- **Print (`downloadPDF` → `buildPRPrintHtml`):**
  - Items are mapped to `PRPrintItem[]` with `isBold` and `isCenter` forwarded.
  - `PRPrintBuilder.ts` applies `white-space:pre-wrap`, `text-align:center/left`, and `font-weight:bold` inline on the description `<td>`.

#### `components/EditPRModal.tsx` — Edit PR

- Same `ItemDataType`, `emptyItem()`, and `toggleItemFlag` as Create PR.
- **Form side:** Same `B`/`≡` buttons and `<textarea rows={3}>` for description.
- **Read-only preview (`PRPreview` component):**
  - Description `<td>` applies `textAlign`, `fontWeight`, and `whiteSpace: "pre-wrap"`.
- **Print:** Same mapping to `PRPrintItem[]` with flags forwarded.

#### `utils/print/PRPrintBuilder.ts`

- `PRPrintItem` interface has `isBold?: boolean` and `isCenter?: boolean`.
- Description `<td>` style:
  ```
  white-space:pre-wrap;
  text-align:${item.isCenter ? 'center' : 'left'};
  font-size:8pt;
  padding:1px 4px;
  [font-weight:bold if isBold]
  ```
- Description value is `escapeHtml(item.description)` — safe for HTML, preserves `\n`.

---

### Purchase Order

#### `components/PO/CreatePOModal.tsx` — Create PO

- **Type:** `POItemWithBold = PurchaseOrderItemRow & { bold_description?: boolean; center_description?: boolean }`.
- **`addItem()`** initialises both flags to `false`.
- **`updateItem(idx, patch)`** accepts any `Partial<POItemWithBold>` patch — toggles are done inline via `updateItem(index, { bold_description: !item.bold_description })`.
- **Form side (left panel):** Each item card has:
  - A label row with `B` and `≡` toggle buttons.
  - A `<textarea rows={3} style={{ resize: "vertical" }}>` for the description — reflects `font-bold`/`text-center` from the flags.
- **Live preview (`POEditablePreview` component):**
  - Description `<td>` applies `textAlign: item.center_description ? "center" : "left"`.
  - Mini `B`/`≡` buttons inside the td (5×4px).
  - `<textarea>` applies `fontWeight: item.bold_description ? 'bold' : 'normal'` and `editableInputCenterCls`/`editableInputCls` based on `center_description`.
  - Auto-resizes via `onInput={autoResize}`.
- **Static preview (`POPreview` component):**
  - Description `<td>` applies `textAlign`, `fontWeight`, and `whiteSpace: "pre-wrap"`.
  - Renders `{item.description ?? ""}` as plain text (not raw HTML), so `\n` + `pre-wrap` gives correct line breaks.
- **Local print builder (`buildPurchaseOrderPrintHtml` inside this file):**
  - Description `<td>` applies `white-space:pre-wrap`, `text-align:center/left`, and `font-weight:bold` inline.
- **Shared print (`downloadPDF` → `sharedBuildPO` from `POPrintBuilder.ts`):**
  - `bold_description` and `center_description` are forwarded directly (they're part of `POItemWithBold` which satisfies `POPrintItem`).

#### `utils/print/POPrintBuilder.ts`

- `POPrintItem` interface has `bold_description?: boolean` and `center_description?: boolean`.
- Description `<td>` style:
  ```
  white-space:pre-wrap;
  text-align:${item.center_description ? 'center' : 'left'};
  [font-weight:bold if bold_description]
  ```
- Description value is `item?.description ?? ""` — rendered as raw HTML (no escaping), so any `\n` chars render with `pre-wrap`.

---

## Data Flow Summary

```
User types in textarea (Enter = \n stored in state)
  │
  ├─► Form-side textarea reflects formatting (bold class, center class)
  │
  ├─► Live Preview (PREditablePreview / POEditablePreview)
  │     ├─ textarea auto-resizes, shows \n natively
  │     └─ <td> textAlign / fontWeight from flags
  │
  ├─► Read-only Preview (PRPreview / POPreview)
  │     └─ <td> whiteSpace:pre-wrap + textAlign + fontWeight
  │
  └─► Print Builder HTML output
        └─ <td style="white-space:pre-wrap; text-align:…; [font-weight:bold]">
              escapeHtml(description)   ← \n preserved, renders as line break
           </td>
```

---

## Naming Conventions

| Concept | PR field name | PO field name |
|---|---|---|
| Bold toggle | `isBold` | `bold_description` |
| Center toggle | `isCenter` | `center_description` |
| Description text | `description` (string) | `description` (string \| null) |

The PR uses different names because `ItemDataType` is a local type, while PO uses `POItemWithBold` which extends the shared `PurchaseOrderItemRow` DB row type — so a distinct namespace (`bold_description`, `center_description`) avoids collisions with existing DB column names.
