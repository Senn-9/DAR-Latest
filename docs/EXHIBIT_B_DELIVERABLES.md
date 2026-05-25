# EXHIBIT B: Deliverables of the Technology

Platform Delivery

The DAR Procurement and Monitoring System ("DAR-PMAS") is a fully web-based application accessible through direct URL links for modern web and mobile browsers.

To ensure streamlined distribution and access across offices and divisions under the Department, the system will be made available through:

- Direct URL links for the website (responsive web app).
- Hosted deployment (Vercel).

Account Creation Guidelines

Administrator accounts (system administrators / `Admin` role) are provisioned and managed by the designated IT administrator or project administrator. The `Admin` role corresponds to system-wide administrative privileges (role_id = 1) and should be tightly controlled.

Division-level accounts and role assignments (Division Head, BAC, PARPO, Budget, Supply, Accounting, Cash) are requested via the `Admin` account or through the designated division manager workflow. Recommended process:

- Requests for an `Admin` account must be submitted to the hosting/IT unit and require approval from the project owner.
- Division Heads: requested by the division manager and approved by `Admin`.
- Specialized roles (BAC, PARPO, Budget, Supply, Accounting, Cash): assigned by `Admin` or Division Head depending on internal policy.
- End users / regular staff: account requests routed via Division Head or HR delegate.

The process ensures controlled access and proper delegation of account management responsibilities throughout the organization.

User Manual

A detailed User Manual will be provided to guide all user roles including:

- `Admin` (system administrator)
- `Division Head`
- `BAC` (Bids and Awards Committee)
- `PARPO` (Procurement/Accounting)
- `Budget` role
- `Supply` role
- `Accounting` role
- `Cash` role
- End users / staff

The manual will include:

- Introduction to the system and architecture
- Features overview and role-based capabilities
- Get started and login instructions
- Step-by-step guides for common workflows:
  - Creating, editing and submitting Purchase Requests (PR)
  - Processing PRs through Division Head → BAC → Budget/PARPO → PO → Delivery → Payment
  - Creating canvassing sessions and uploading supplier quotations
  - Preparing BAC resolutions and Abstract of Awards
  - Generating Purchase Orders and tracking POs
  - Recording deliveries and creating Delivery Receipts (DR)
  - Creating Disbursement Vouchers (DV) and payment processing
  - Budget allocation and ORS/obligation tracking
  - User management and role assignment
  - Exporting reports to PDF and Excel (XLSX)
  - Uploading and managing document attachments (PDFs, images)
  - Viewing audit logs and activity history

The manual will be written for non-technical users and include screenshots, navigation tips, and quick troubleshooting guidance.

Digital-Only Deployment

Because Website DAR is delivered as a web application, all deliverables are digital-only. No physical media (CDs, printed manuals, installers) are required. All operations, updates, maintenance and access are provided online via the hosted URL endpoints.

Remote Maintenance and Support

All updates, bug fixes, and system enhancements will be managed remotely by the development and operations team. Remote support details:

- Software updates and patching performed centrally and deployed to Staging then Production.
- Bug triage and fixes provided through an agreed issue-tracking channel (e.g., GitHub issues, JIRA).
- Regular backups and database export routines (frequency and retention to be agreed).
- Monitoring and alerting for uptime and errors (recommended: Sentry / monitoring service).
- Response and support SLAs to be defined in the support contract — typical options:
  - Critical issues (production outage): response within 2 hours, remediation plan within 4–8 hours.
  - High priority (major function broken): response within 4 business hours.
  - Medium/Low priority: response within 1–2 business days.

Support includes remote troubleshooting, emergency fixes, and scheduled maintenance windows. On-site support can be arranged by agreement but is not included in standard remote support.

---

If you'd like, I can now:

- Generate the User Manual skeleton `docs/USER_MANUAL.md` with the step-by-step guides listed above, or
- Produce an `Account Provisioning` appendix with approval templates and role mapping to the `types/tables.ts` role IDs.

Which should I do next?

Support, Fees, and Branding Restrictions

- Post-Training Support Fee: After the completion of on-the-job training, the Provider will supply maintenance and remote support services at the rate of PHP 300.00 per hour. Billing and invoicing shall be performed monthly and supported by a time log and brief activity summary for each support event.

- Support Scope: Remote bug fixes, security patches, minor feature adjustments, and operational guidance are included. Major enhancements or scope changes will be treated as separate change requests and priced accordingly.

- Branding and Attribution Restrictions: The Receiver shall not modify or remove any existing branding or attribution embedded in the application. Specifically:
  - The logos of `Naga College Foundation` (school logo) and `College of Computer Studies` (college/department logo) must not be altered, removed, or replaced in any production or mirrored instance of the website.
  - The application metadata that credits the development team interns (Khana Coralde, Jayvee Kenn Villote, Pamela Mae Cado, Jethan Barcenas, Jentzen Totanes, and John Christian Benavidez) must remain intact and visible within the application footer or metadata files as delivered.
  - The logos and interns' metadata shall not be removed from the Technology. Any modification or removal of these logos or metadata requires prior written agreement between the Host Industry and the Academic Partner and shall be documented as an amendment to this Exhibit.

---


