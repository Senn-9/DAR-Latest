# EXHIBIT A: Description of the Technology

## DAR Procurement and Monitoring System

---

## I. System Overview

The **DAR Procurement and Monitoring System** is a comprehensive, web-based digital solution designed to streamline and optimize procurement operations and budget management for the Department of Agrarian Reform. The system facilitates end-to-end procurement workflows, from purchase request creation through delivery and payment processing, with robust role-based access control and real-time monitoring capabilities.

The system is architected to support multiple operational roles including administrators, division heads, BAC (Bids and Awards Committee) personnel, PARPO (Procurement, Accounting, and Related Financial Processes) staff, and end-users, ensuring appropriate access levels and task-specific functionalities across the organization.

---

## II. User Roles and Permissions

### Admin (role_id = 1)
The Admin role serves as the super admin with comprehensive system control and oversight across all divisions and operational modules. Admin acts as system administrator and does not create procurement requests.

**System Oversight and Configuration:**
- Full access to all modules and settings
- Manage user accounts (create, update, delete)
- Assign roles to users across all divisions
- Manage divisions and departments
- Monitor overall system activity and audit logs
- View analytics and reports from all divisions
- Access User Management module
- Delete Purchase Requests
- Manage budget allocation and utilization

**Procurement Operations:**
- View and process all procurement activities across divisions
- Process and move PRs through all workflow stages
- Access all procurement modules (Canvass, BAC Resolution, Abstract of Awards, PO, Delivery, Payment)
- View BAC processing capabilities
- View PARPO processing capabilities
- Track all delivery and payment processing
- Cannot create or submit Purchase Requests (reserved for End Users)

**Data Management:**
- Access all divisional data
- View reports from all divisions
- Monitor all procurement stages and payment workflows

### Division Head
Division Heads are responsible for managing procurement operations within their assigned divisions and overseeing the complete procurement workflow for their division.

**Division Management:**
- View division-specific dashboard and metrics
- Create and submit Purchase Requests (PRs) for their division
- Process and move PRs through workflow stages (only pending/submitted status)
- Cannot directly create canvassing or BAC resolutions (limited to early PR stages)
- Monitor PR status and progression
- View division budget allocation and utilization
- View division-specific analytics and reports

**Division Data Access:**
- View only data from their assigned division
- See all procurement stages for their division
- Access remarks and timeline information

### BAC (Bids and Awards Committee) Personnel
The BAC personnel manage the competitive procurement process and award decisions across the organization.

**Procurement Process Management:**
- Process PRs when status is "Processing (BAC)" (status_id = 3)
- Create and manage BAC resolutions
- Assign canvassers for quotation collection
- Review and verify canvassing submissions
- Document award recommendations
- Prepare abstract of awards
- Track RFQ (Request for Quotation) assignments
- Record procurement decisions and recommendations

**Data Access:**
- View all procurement operations across all divisions
- Access canvassing and BAC resolution modules
- View quotation and supplier information
- Cannot edit or delete PRs
- Cannot access Budget or Accounting-specific functions

### PARPO (Procurement, Accounting, and Related Financial Processes) Personnel (role_id = 5)
PARPO personnel manage post-procurement approval and payment processing authorization.

**Procurement Approval:**
- Process PRs when status is "Processing (PARPO)" (status_id = 5)
- Monitor PARPO stage of procurement workflow
- Handle PARPO approval and signature stages

**Payment Processing:**
- View payment processing stages
- Access payment documentation and DVs
- Track payment status for their approved transactions

**Data Access:**
- View all procurement operations across divisions
- Access payment-related information
- Cannot access accounting or cash processing details

### Budget Role
Budget personnel manage budget allocation and utilization tracking for all divisions.

**Budget Management:**
- Create and edit budget allocations for all divisions
- Track budget utilization in real-time
- Monitor ORS (Obligation Request Slip) obligated amounts
- Generate budget vs. spend reports
- Manage fiscal year budgets
- View budget status and utilization percentages

**Data Access:**
- View budget data across all divisions
- Access Budget module
- Limited access to PR details (can only view, not edit)
- Cannot create or process PRs
- Cannot access procurement workflow stages directly

**Budget Restrictions:**
- Budget role is excluded from PR creation, editing, and deletion
- Can view PRs but cannot process them through procurement stages

### Supply Role
Supply personnel manage delivery receipt and tracking for procurement operations.

**Delivery Management:**
- Create and manage delivery records
- Process delivery receipts and acknowledgments
- Track delivery status and timelines
- Record DR (Delivery Receipt) information
- Verify delivery against PO details
- Monitor delivery by supplier and PO
- Manage delivery completion

**Data Access:**
- View all delivery information across all divisions
- Access delivery module and processing capabilities
- View related PO and procurement information

**Supply Restrictions:**
- Cannot create or process PRs
- Limited to delivery management functions only

### Accounting Role (role_id = 9)
Accounting personnel handle payment accounting reviews and financial processing.

**Payment Accounting:**
- Process payments during "Accounting Review" stage
- Review and verify accounting entries
- Process payments for "Forward to Cash" stage
- Handle "Forward to Accounting for Tax processing" stage
- Manage payment documentation for accounting purposes
- View Disbursement Voucher information
- Access payment module and processing capabilities

**Financial Oversight:**
- Verify amounts and fund coding
- Process accounting-related payment stages
- View payment status and history
- Generate accounting-related reports

**Accounting Restrictions:**
- Cannot create or delete PRs
- Limited to payment accounting stages
- Cannot handle cash processing or release

### Cash Role
Cash personnel manage cash processing and payment release.

**Cash Processing:**
- Handle "Cash for Release" stage (status_id = 33)
- Process final payment releases
- Manage cash payment documentation
- View payment status for cash-related transactions
- Handle final step of payment workflow

**Data Access:**
- View payment information related to cash processing
- Access payment module
- Limited access to delivery and accounting stages

**Cash Restrictions:**
- Cannot create or process PRs
- Limited to final cash processing and payment release
- Cannot access budget or supply functions

### End Users / Regular Staff
End users can create and track their own Purchase Requests and monitor procurement progress.

**Purchase Request Management:**
- Create and submit Purchase Requests (PRs) - only in pending status
- View and edit only their own PRs (status_id = 1)
- Cannot process PRs beyond submission stage
- View assigned PR status and history

**Data Access:**
- View PRs from their assigned division only
- Track delivery progress for their POs
- Access remarks and timeline information
- Cannot access Budget, Supply, Accounting, or Cash functions

**End User Restrictions:**
- Can only see division-level data
- Cannot approve or process PRs
- Cannot delete or permanently modify submissions
- Submit button only available for their own pending PRs

---

## III. Core Functionalities

### A. Purchase Request Management
- Create and submit purchase requests with itemized details
- Assign cost codes and fund allocation
- Track PR status through approval workflows
- View PR history and modifications
- Generate PR documents and reports

### B. Budget Management
- Track budget allocation by division and fiscal year
- Monitor budget utilization in real-time
- Generate budget vs. spend reports
- Alert when budget thresholds are approached
- Manage fiscal year budgets

### C. Procurement Process Management
- **Canvassing Management:**
  - Create canvassing sessions
  - Assign canvassers by PR and division
  - Track quotation collection deadlines
  - Record supplier information and pricing
  - Identify winning bids

- **BAC Resolution Process:**
  - Generate BAC resolutions for procurement actions
  - Document recommendations and decisions
  - Track resolution status and approvals

- **Abstract of Awards:**
  - Prepare abstract of awards documents
  - Document procurement results
  - Generate AAA reports

### D. Purchase Order Management
- Generate purchase orders from approved PRs
- Track PO status and supplier information
- Manage PO items and quantities
- View PO timeline and milestones
- Generate PO documents

### E. Delivery and Receipt Management
- Create delivery records and track delivery status
- Record DR (Delivery Receipt) information
- Track expected vs. actual delivery dates
- Manage delivery by supplier and PO
- Monitor delivery completion

### F. Payment Processing
- Create and manage Disbursement Vouchers (DVs)
- Track payment status through multiple approval stages:
  - Voucher completion
  - Accounting review
  - PARPO approval
  - Cash processing
  - PARPO signature
  - Tax processing
  - Final payment
- Record payment mode (MDS Check, Commercial Check, ADA, Others)
- Manage payment documentation and compliance

### G. Real-Time Monitoring and Analytics
- Dashboard with key procurement metrics
- Active PR tracking by status
- Procurement pipeline visualization
- Budget utilization analytics
- Delivery performance monitoring
- Payment processing timeline tracking

### H. Reporting and Documentation
- Generate comprehensive procurement reports
- Create summary reports by division and fiscal year
- Export and print documents in PDF format for analysis and records
- Generate audit trails and activity logs
- Create payment and delivery reports
- Generate status reports by category

---

## IV. Security Measures

### A. Authentication and Authorization
- Secure login with bcryptjs password hashing
- Role-based access control (RBAC)
- Division-level data isolation and access restrictions
- Session management with secure token handling
- User activity logging for audit trails

### B. Data Validation & Sanitization
- Server-side validation for all form inputs
- Input sanitization to prevent injection attacks
- Type safety through TypeScript implementation
- Validation of numeric fields and date ranges
- Prevention of unauthorized data modification

### C. Database Security
- Supabase PostgreSQL with row-level security
- Role-based access at database level
- Secure connection protocols (SSL/TLS)
- Encrypted sensitive data fields
- Regular database backups

### D. Audit Logs
- Track all user login activities
- Record modifications to procurement records
- Log payment status changes
- Document PR approvals and rejections
- Maintain complete change history
- Provide audit trail for compliance purposes

### E. Data Privacy
- GDPR and local privacy compliance measures
- Encrypted transmission of sensitive data
- Secure storage of user credentials
- Limited PII (Personally Identifiable Information) collection
- Data retention policies

---

## V. Technical Specifications

| Specification | Details |
|---|---|
| **Frontend Framework** | Next.js 16.1.6 (React 19.2.3) |
| **Backend** | Supabase backend services (PostgreSQL, Auth, Storage) with client-side integration |
| **Database** | PostgreSQL (via Supabase) |
| **Authentication** | Supabase Auth with bcryptjs |
| **UI Library** | React Icons, React DOM, Tailwind CSS |
| **Styling** | Tailwind CSS 4 with PostCSS |
| **Data Export** | PDF generation and spreadsheet attachment support (.xlsx/.xls) |
| **Version Control** | Git (GitHub) |
| **UI/UX Tools** | Figma |
| **Device Compatibility** | Desktop and Mobile |
| **Deployment** | Vercel or self-hosted |
| **Language** | TypeScript / JavaScript |

### A. Frontend Architecture
- **Framework:** Next.js with App Router
- **UI Components:** React with custom component library
- **Responsive Design:** Tailwind CSS for mobile and desktop optimization
- **Data Handling:** React hooks for state management (useState, useEffect, useMemo)
- **Data Export:** HTML2Canvas and jsPDF for PDF generation; spreadsheet files (.xlsx/.xls) are supported as attachments in applicable workflows

### B. Backend Architecture
- **Backend Services:** Supabase-managed backend (PostgreSQL, Auth, Storage)
- **Database Integration:** Supabase client SDK with real-time capabilities
- **Authentication:** Supabase authentication with role-based access enforcement in-app and via DB policies
- **Data Access:** Row-Level Security (RLS) policies at database level
- **API Layer Status:** No dedicated custom Next.js API route layer is currently implemented

### C. Responsive Design and Accessibility
- Optimized UI for different screen sizes (desktop, tablet, mobile)
- Supports modern web browsers:
  - Google Chrome (latest)
  - Mozilla Firefox (latest)
  - Microsoft Edge (latest)
  - Safari (latest)
- Compatible with devices running:
  - Windows 10/11
  - macOS (latest versions)
  - Linux (Ubuntu/Debian)
  - Android (9+)
  - iOS (14+)

### D. Performance Considerations
- Server-side rendering for improved initial load time
- Automatic code splitting for optimal bundle size
- Lazy loading of components and data
- Efficient database queries with indexing
- Caching strategies for frequently accessed data

---

## VI. Benefits

- **Streamlined Procurement:** Reduced paperwork and manual processes through digital workflows
- **Improved Transparency:** Real-time visibility into procurement status and budget utilization
- **Enhanced Accountability:** Complete audit trails and activity logs for compliance
- **Better Budget Control:** Monitor spend and utilization across divisions and fiscal years
- **Faster Processing:** Automated workflows reduce procurement cycle time
- **Data-Driven Decisions:** Comprehensive analytics and reporting for strategic planning
- **Improved Supplier Management:** Centralized canvassing and quotation tracking
- **Payment Efficiency:** Streamlined payment processing with multiple approval stages
- **Scalable Solution:** Easily accommodates multiple divisions and organizational growth
- **Division-Level Autonomy:** Separate budget and procurement management per division

---

## VII. Module Architecture

### Dashboard Module
- Real-time overview of active procurement activities
- Key metrics and KPIs visualization
- Status distribution by category
- Quick access to frequently used functions
- Analytics and trend analysis

### Procurement Module
- **Purchase Request (PR):** Create, track, and manage purchase requests
- **Canvassing:** Manage supplier quotation collection and comparison
- **BAC Resolution:** Document competitive procurement processes
- **Abstract of Awards:** Generate award documentation
- **Purchase Order (PO):** Generate and track purchase orders

### Delivery Module
- Delivery receipt tracking
- Expected vs. actual delivery monitoring
- DR (Delivery Receipt) management
- Delivery status by supplier and PO
- Delivery performance analytics

### Payment Module
- Disbursement Voucher (DV) creation and management
- Payment mode documentation
- Multi-stage approval workflows
- Payment status tracking
- Payment completion reporting

### Budget Module
- Division budget allocation management
- Budget utilization tracking
- Fiscal year budget planning
- Budget variance analysis
- Budget vs. actual spend reporting

### User Management Module
- User account creation and management
- Role assignment and authorization
- Division-level user grouping
- Password management with bcrypt hashing
- User activity audit logs

### Analytics & Reporting Module
- Summary reports by division and fiscal year
- Procurement performance metrics
- Budget utilization reports
- Payment processing analytics
- Export functionality (PDF) and spreadsheet attachment support where required

---

## VIII. Data Models

### Core Entities
- **Users:** System users with roles and divisions
- **Divisions:** Organizational divisions with budget allocation
- **Purchase Requests (PR):** Itemized procurement requests
- **PR Items:** Line items within purchase requests
- **Canvassing Sessions:** Quotation collection processes
- **Canvassing Entries:** Supplier quotations and pricing
- **BAC Resolutions:** Procurement decision documentation
- **Purchase Orders (PO):** Authorized procurement orders
- **Deliveries:** Receipt and acceptance of goods/services
- **Disbursement Vouchers (DV):** Payment documentation
- **Budget Records:** Budget allocation and utilization tracking

---

## IX. Integration Points

- **Supabase:** Database, authentication, and real-time data synchronization
- **File Storage:** Supabase Storage integration for document attachments
- **Google Sheets Templates:** Direct template links are used in selected procurement workflows
- **PDF Generation:** Document generation for procurement records

---

## X. Compliance and Standards

- **Procurement Regulations:** Compliant with Philippine Procurement Law (RA 9184)
- **Audit Requirements:** Comprehensive logging and audit trail capabilities
- **Financial Controls:** Multiple approval stages and fund validation
- **Data Security:** Industry-standard encryption and secure practices
- **Accessibility:** WCAG 2.1 compliance for inclusive access

---

## XI. Technical Infrastructure

### Hosting and Deployment
- **Platform:** Deployment platform is to be finalized (current options: Vercel or self-hosted Node.js environment)
- **Database Hosting:** Supabase Cloud (PostgreSQL)
- **Storage:** Cloud-based file storage
- **CDN:** Depends on selected hosting provider

### Development Workflow
- **Version Control:** Git/GitHub for code management
- **Continuous Integration:** Build and deployment pipeline
- **Environment Management:** Development, staging, and production environments
- **Monitoring:** Real-time system monitoring and error tracking

---

## XII. Training and Support

### Initial Training
- System orientation for administrators and super admins
- Module-specific training for division heads and BAC personnel
- Payment processing training for PARPO staff
- Basic operations training for end users

### Documentation
- Comprehensive user manual for all roles
- Administrator guide for system configuration
- Technical documentation for developers
- API documentation for integrations

### Ongoing Support
- Technical assistance for system issues
- Help desk support for user queries
- Regular system updates and maintenance
- Performance optimization and tuning

---

## XIII. Future Enhancement Opportunities

- Mobile application for procurement on-the-go
- Advanced analytics and business intelligence dashboards
- Supplier portal for quote submission
- Automated invoice matching and reconciliation
- Integration with accounting systems
- Workflow automation and business rules engine
- Email notifications and alerts
- Digital signature integration
- Blockchain-based verification (optional)

---

**Date Prepared:** May 2026  
**Version:** 1.0  
**System:** DAR Procurement and Monitoring System (Website DAR)
