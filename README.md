# Japan 365 - Purchase Module

A procurement management system for tracking suppliers, purchase orders, goods receipts, and supplier invoices. Built with React, TypeScript, and Supabase.

## Features

### Dashboard
- Overview of key procurement metrics (total suppliers, active POs, pending GRNs, unpaid invoices)
- Quick navigation to any module
- Recent purchase orders list
- Overdue invoice alerts

### Suppliers
- Full supplier directory with contact details, tax IDs, and payment terms
- Add, edit, and deactivate supplier records
- Search and filter by status

### Purchase Orders
- Create purchase orders with multiple line items
- Automatic calculation of subtotal, tax, shipping, and total
- Status workflow: Draft > Pending Approval > Approved > Partially Received > Received > Closed
- Track received quantities per line item

### Goods Receipts
- Record goods received against purchase orders
- Partial and complete receipt support
- Links to originating PO and supplier
- GRN numbering auto-generated

### Invoices
- Track supplier invoices with payment status
- Status options: Unpaid, Partially Paid, Paid, Overdue
- Link invoices to purchase orders
- Record partial payments

### Reports
- Procurement analytics and insights
- Access restricted to admin and manager roles

## Role-Based Access Control

The application enforces three user roles with different permission levels:

| Role | View | Create / Edit | Delete |
|------|------|---------------|--------|
| Admin | All pages | All records | All records |
| Manager | All pages | All records | No deletion |
| Staff | All pages (except Reports) | Read-only | No deletion |

New accounts created through the login page default to the Staff role. Only an admin can promote a user to a higher role by updating their profile in the database.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Database Security:** RLS policies with role-based enforcement via a SECURITY DEFINER function

## Demo Accounts

The system comes with three pre-seeded accounts for testing different roles:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@japan365.com | Admin2026! |
| Manager | manager@japan365.com | Manager2026! |
| Staff | staff@japan365.com | Staff2026! |

Click any account in the demo accounts panel on the login page to auto-fill the credentials.

## Database Schema

### Tables

1. **profiles** - User profiles linked to Supabase Auth, storing full name and role
2. **suppliers** - Vendor directory with contact info, tax IDs, and payment terms
3. **purchase_orders** - PO headers with supplier, dates, totals, and status
4. **purchase_order_items** - Line items for each purchase order
5. **goods_receipts** - GRN headers linked to POs and suppliers
6. **goods_receipt_items** - Individual received items per GRN
7. **purchase_invoices** - Supplier invoices with payment tracking

### Security

All tables have Row Level Security enabled. A SECURITY DEFINER function (`user_role()`) reads the current user's role from the profiles table and enforces it in RLS policies. This ensures:

- All authenticated users can read data
- Only admin and manager roles can insert and update records
- Only admin role can delete records
- Reports page access is restricted to admin and manager roles

## Project Structure

```
src/
  components/
    layout/
      Sidebar.tsx        - Navigation sidebar with role-based menu filtering
      TopBar.tsx         - Top bar with page title, search, and notifications
    ui/
      Badge.tsx          - Status badge component
      Button.tsx         - Reusable button component
      DataTable.tsx      - Generic table with sorting
      Input.tsx          - Form input and select components
      Modal.tsx          - Dialog/modal component
      States.tsx         - Empty and loading state components
  lib/
    auth.tsx             - Auth context provider with session management
    supabase.ts          - Supabase client singleton
    utils.ts             - Shared utility functions (formatting, etc.)
  pages/
    Dashboard.tsx        - Procurement overview dashboard
    Suppliers.tsx        - Supplier directory CRUD
    PurchaseOrders.tsx   - Purchase order management
    GoodsReceipts.tsx    - Goods receipt note management
    Invoices.tsx         - Supplier invoice tracking
    Reports.tsx          - Analytics (admin/manager only)
    LoginPage.tsx        - Sign in page with demo accounts
  types/
    index.ts             - TypeScript interfaces for all data models
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open the application in your browser at the URL shown in the terminal

### Available Scripts

| Script | Description |
|--------|-------------|
| npm run dev | Start the Vite development server |
| npm run build | Build the production bundle |
| npm run preview | Preview the production build locally |
| npm run lint | Run ESLint checks |
| npm run typecheck | Run TypeScript type checking |

## Contributors

### Samin Osman (1042) — Database Design
Designed the full PostgreSQL schema in Supabase, including all seven tables (profiles, suppliers, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, purchase_invoices), their relationships, and constraints. Implemented Row Level Security policies on every table with role-based enforcement via a SECURITY DEFINER function. Created database views for dashboard metrics, performance indexes, and automated triggers for PO status updates and overdue invoice syncing.

### Robiul Hassan (1043) — Backend Development
Built the Supabase backend layer: auth context with session management, auto-numbering RPC functions for PO, GRN, supplier, and invoice codes, and client-side data access utilities. Integrated role-based access control so admins can delete, managers can create/edit, and staff has read-only access. Set up the Supabase client singleton and wrote the server-side logic for payment recording and invoice status transitions.

### Mahafujul Alam (1066) — Frontend Development
Developed the complete React user interface: dashboard with KPI cards and recent activity, supplier directory, purchase order creation with multi-line items and live total calculation, goods receipt tracking, invoice management with payment recording, and the analytics reports page with the monthly spend chart. Designed the responsive layout, navigation sidebar, user dropdown, notification panel, print/PDF export system, and the settings page with password change and permission controls.
