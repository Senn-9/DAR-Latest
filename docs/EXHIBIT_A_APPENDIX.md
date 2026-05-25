# EXHIBIT A — Appendix: Simple Technology Format

1. Technology Identification
   1.1. System Name: DAR Procurement and Monitoring System (Website DAR)
   1.2. Classification: Government procurement web application (internal/organizational)
   1.3. Version: 1.0 — May 2026

2. Functional Specifications
   2.1. Core Capabilities: Purchase Request creation and tracking; Budget allocation and utilization; Procurement workflows (Canvassing, BAC resolution, Abstract of Awards); Purchase Order generation; Delivery receipt and tracking; Disbursement Voucher/payment processing; Role-based access and audit logging; Reporting and PDF export.
   2.2. Specialized Modules:
     - Canvassing — supplier quotation collection and comparison
     - BAC Resolution — award decision documentation and resolutions
     - Abstract of Awards — award summaries and documentation
     - Purchase Order (PO) — PO generation and tracking
     - Delivery — delivery receipt, verification, and tracking
     - Payment / DV — Disbursement Voucher creation and multi-stage payment processing
     - Budget Management — allocation, utilization tracking, and reporting
     - User Management — account, role, and division administration
     - Analytics / Dashboard — procurement metrics, reports, and monitoring

3. Technical Specifications
   3.3. System Requirements:
     - Client: Modern web browser (Chrome, Firefox, Edge, Safari — latest stable releases).
     - Frontend: Next.js (app router) with React; TypeScript; Tailwind CSS.
     - Backend: Supabase (PostgreSQL, Auth, Storage) — hosted Supabase project or self-hosted Postgres with equivalent services.
     - Server (if self-hosted): Node.js 18+ runtime, recommended 2+ vCPUs and 2+ GB RAM, SSD storage for attachments; HTTPS/TLS required.
     - Storage: Supabase Storage or equivalent object storage for attachments and generated PDFs.
     - Other: TLS, persistent database backups, SSL certificate, and a hosting platform (Vercel recommended or self-hosted Node environment).

(Concise summary suitable for inclusion in a contract Exhibit.)
