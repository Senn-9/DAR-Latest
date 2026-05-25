# DAR-Latest Role Management Access

This document summarizes the access levels and CRUD permissions used in the DAR Procurement and Monitoring System (DAR-Latest). It is written for administrators and project documentation.

## 1. Access Levels

The system groups roles into access levels. Below are the levels and the roles that belong to each:

- **System Administrator Level:** Admin — full control over users, roles, divisions, and most operational modules.
- **Division Management Level:** Division Head —  manages purchase requests and division‑level processing.
- **Procurement Committee Level:** BAC (Bids & Awards Committee) — handles canvassing, BAC resolutions, and award-related workflows.
- **Canvasser Level:** Canvasser — handles RFQ release, quotation receipt, and canvass assignment workflows.
- **Finance and Support Level:** PARPO; Budget; Supply; Accounting; Cash — handles budget allocation, accounting, cash disbursements, delivery records, and payment workflows.
- **End User Level:** End User — creates and tracks only their own purchase requests (may be assigned PPMP duties by the division).

## 2. Role Summary

- **Admin**: system-wide administrative access; manages accounts, roles, divisions, reports, and system oversight.
- **Division Head**: manages division purchase requests and approval flow.
- **BAC**: handles canvassing, quotations, BAC resolution, and abstract of awards.
- **PARPO**: handles post-approval procurement and payment workflow stages.
- **Budget**: manages budget allocation and utilization tracking.
- **End User**: creates and submits purchase requests for their own division or office.
 - **End User**: creates and submits purchase requests for their own division or office. (Includes `PPMP Point Person` duties when assigned by the division.)
- **Canvasser**: receives released RFQs, manages canvass assignments, and submits or records quotations.
- **Supply**: manages delivery records and delivery receipts.
- **Accounting**: handles accounting review and payment processing.
- **Cash**: handles final payment release and completion.


## 3. CRUD by Role

Legend:
- **Yes** = full permission for that action within the role's scope.
- **No** = not allowed.
- **Limited** = allowed only in narrowly defined cases; see the per-role clarifications below for exact behavior.

Limited — Per-role Clarifications:
- **Division Head — Delete (Limited):** May delete Purchase Requests only when the PR status is `Draft`, the PR belongs to the Division Head's division, and there are no downstream records (no linked POs, canvass records, payments, or audit flags). Deletions are logged and may require Admin review.
- **PARPO — Create (Limited):** May create post‑award and payment‑stage records (for example, payment requests, vouchers, or post‑award adjustments). PARPO cannot create initial Purchase Requests on behalf of other users.
- **End User — Update (Limited):** Can update their own PRs while status is `Draft` or when a PR is explicitly returned for revision; once a PR is `Submitted` or advanced past approval checkpoints, edits are blocked.
- **Accounting — Create (Limited):** Can create accounting artifacts (vouchers, payment entries, journal records) only when a PR/PO has reached accounting/payment processing stage and required approvals are present; cannot create PRs/POs.
- **Cash — Create (Limited):** Can create payment release or disbursement records only after Accounting verification and completion of required approvals and supporting documents.

General: "Limited" permissions are enforced by ownership and workflow stage checks in the application; some limited actions require additional approvals or Admin override and are recorded in the audit logs.

### Admin
- **Access level:** System Administrator
- **Create:** Yes
- **Read:** Yes
- **Update:** Yes
- **Delete:** Yes
- **Notes:** Full oversight; can manage users, divisions, reports, and most records.

### Division Head
- **Access level:** Division Management
- **Create:** Yes
- **Read:** Yes
- **Update:** Yes
- **Delete:** Limited
- **Notes:** Can create and process division PRs; delete rights are limited by policy and workflow.

### BAC
- **Access level:** Procurement Committee
- **Create:** Yes
- **Read:** Yes
- **Update:** Yes
- **Delete:** No
- **Notes:** Creates and manages canvassing, BAC resolutions, and award-related documents.

### PARPO
- **Access level:** Finance and Support
- **Create:** Limited
- **Read:** Yes
- **Update:** Yes
- **Delete:** No
- **Notes:** Works on procurement and payment stages; mainly updates workflow records.

### Budget
- **Access level:** Finance and Support
- **Create:** Yes
- **Read:** Yes
- **Update:** Yes
- **Delete:** No
- **Notes:** Handles budget allocation and utilization records; does not delete PRs.

### End User
- **Access level:** End User
- **Create:** Yes
- **Read:** Yes
- **Update:** Limited
- **Delete:** No
- **Notes:** Can create and track their own PRs; edits are usually limited to pending or draft records only.

Additional note: End Users may be assigned `PPMP Point Person` duties by their division. In that case they can perform PPMP review/signing tasks described in the workflow while retaining the same CRUD limitations as other End Users.

### Canvasser
- **Access level:** Canvasser Level
- **Create:** Yes
- **Read:** Yes
- **Update:** Yes
- **Delete:** No
- **Notes:** Handles released canvass sheets, quotation submission, and canvasser assignment workflows.

### Supply
- **Access level:** Finance and Support
- **Create:** Yes
- **Read:** Yes
- **Update:** Yes
- **Delete:** No
- **Notes:** Creates and updates delivery records and receipt information.

### Accounting
- **Access level:** Finance and Support
- **Create:** Limited
- **Read:** Yes
- **Update:** Yes
- **Delete:** No
- **Notes:** Updates accounting and payment stages and reviews vouchers.

### Cash
- **Access level:** Finance and Support
- **Create:** Limited
- **Read:** Yes
- **Update:** Yes
- **Delete:** No
- **Notes:** Updates final payment release status and related records.



## 4. Functional Access by Role

### Admin
- Manage users and roles.
- View all divisions and all operational records.
- Process or review records across the system.
- Delete purchase requests when permitted by policy.

### Division Head
- Create and submit purchase requests for the division.
- Review and process division PRs.
- Monitor status and remarks for assigned records.

### BAC
- Create canvassing records.
- Enter or review supplier quotations.
- Prepare BAC resolutions and abstract of awards.

### PARPO
- Review PRs in PARPO stage.
- Continue or approve procurement workflows.
- Monitor post-award or payment-related processing.

### Budget
- Create and edit budget records.
- Monitor utilization, allocations, and budget reports.

### End User
- Create their own purchase requests.
- View their own submissions and status history.
- Edit only allowed draft or pending records.

### Canvasser
- Receive canvass assignments.
- Record or return quotations as assigned.
- Work under canvassing workflow controls.

### Supply
- Create delivery records.
- Update delivery receipts and delivery completion details.

### Accounting
- Review payment documentation.
- Update accounting stage records and payment status.

### Cash
- Complete final release of payment records.
- Update final payment completion status.


## 5. External / Outside-Party Handling

These are tasks that involve people or groups outside the core internal workflow, such as suppliers or external respondents.

### Supplier Quotations and RFQs
- **Handled externally:** suppliers receive RFQs and return quotations.
- **Roles involved:** Canvasser, BAC.
- **What they do:** release canvass sheets, receive quotations, compare supplier responses, and prepare award documents.

### Delivery Coordination
- **Handled externally:** suppliers or delivery providers deliver goods and supporting documents.
-- **Roles involved:** Supply, Division Head.
- **What they do:** coordinate deliveries, receive delivery records, and confirm that items match the PO.

### Purchase Order Serving and Supplier Follow-Up
- **Handled externally:** purchase orders may be served or communicated to suppliers.
-- **Roles involved:** Division Head, BAC.
- **What they do:** route documents, coordinate supplier communication, and support the procurement flow.

### Payment-Related Coordination
- **Handled externally:** payment details may be shared with suppliers, vendors, or service providers.
- **Roles involved:** PARPO, Accounting, Cash.
- **What they do:** review documentation, approve payment stages, and release final payment.

### Report or Document Requests Coming From Outside the System
- **Handled externally:** some requests may come from auditors, partner offices, or outside reviewers.
- **Roles involved:** Admin, Division Head, Budget.
- **What they do:** provide records, reports, and supporting documents when requested.

## 6. Notes

- Access can vary slightly depending on how the host organization configures roles and permissions.
- Some actions are controlled by workflow stage, not just by role.
- If a user does not see a button or menu item, it usually means the role does not have access to that action.
- The system is intended to keep admin, division, procurement, budget, and payment duties separated for control and accountability.

Prepared for DAR-Latest documentation.
