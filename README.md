# Japan 365 - Purchase Module

A procurement management system for tracking suppliers, purchase orders, goods receipts, and supplier invoices. Built with React, TypeScript, and Supabase.

## Features

### Dashboard
- Overview of key procurement metrics (total suppliers, active POs, pending GRNs, unpaid invoices)
- Quick navigation to any module
- Recent purchase orders list
- Overdue invoice alerts
- Search bar that filters across modules

### Suppliers
- Full supplier directory with contact details, tax IDs, and payment terms
- Add, edit, and deactivate supplier records
- Search and filter by status
- Auto-generated supplier codes

### Purchase Orders
- Create purchase orders with multiple line items
- Automatic calculation of subtotal, tax, shipping, and total
- Status workflow: Draft > Pending Approval > Approved > Partially Received > Received > Closed
- Track received quantities per line item
- Print and export purchase orders

### Goods Receipts
- Record goods received against purchase orders
- Partial and complete receipt support
- Links to originating PO and supplier
- GRN numbering auto-generated
- Automatic PO status updates when goods are received
- Quantity validation to prevent over-receiving

### Invoices
- Track supplier invoices with payment status
- Status options: Unpaid, Partially Paid, Paid, Overdue
- Link invoices to purchase orders
- Record partial payments
- Overdue invoice detection and alerts

### Reports
- Procurement analytics and insights
- Monthly spend tracking and charts
- Supplier performance breakdown
- Access restricted to admin and manager roles

### Profile
- View account information, avatar, and role badge
- Edit full name
- Change password with confirmation
- View account activity stats (PO count, invoice count, supplier count, total spend)
- View role and permissions table

### Settings
- Manage notification preferences (pending approvals, overdue invoices, weekly summary, new suppliers)
- Manage display preferences (compact tables, GRN column visibility, auto-refresh)
- View system information

### Authentication and Security
- Email and password login with Supabase Auth
- Three demo accounts for testing different roles
- New account registration from the login page
- Password change from the Profile page
- Session persistence across page reloads

### Notifications
- Real-time notification panel in the top bar
- Pending PO approval alerts
- Overdue invoice alerts
- Mark all as read functionality

### Print and Export
- Print purchase orders and goods receipts
- Export data tables to CSV
- Print preview modal with formatted output

## Role-Based Access Control

The application enforces three user roles with different permission levels:

| Role | View | Create / Edit | Delete |
|------|------|---------------|--------|
| Admin | All pages | All records | All records |
| Manager | All pages | All records | No deletion |
| Staff | All pages (except Reports) | Read-only | No deletion |

New accounts created through the login page default to the Staff role. Only an admin can promote a user to a higher role by updating their profile in the database.

## Tech Stack

- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS
- Icons: Lucide React
- Backend: Supabase (PostgreSQL, Auth, Row Level Security)
- Database Security: RLS policies with role-based enforcement via a SECURITY DEFINER function

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

1. profiles - User profiles linked to Supabase Auth, storing full name and role
2. suppliers - Vendor directory with contact info, tax IDs, and payment terms
3. purchase_orders - PO headers with supplier, dates, totals, and status
4. purchase_order_items - Line items for each purchase order
5. goods_receipts - GRN headers linked to POs and suppliers
6. goods_receipt_items - Individual received items per GRN
7. purchase_invoices - Supplier invoices with payment tracking

### Security

All tables have Row Level Security enabled. A SECURITY DEFINER function (user_role()) reads the current user's role from the profiles table and enforces it in RLS policies. This ensures:

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
      TopBar.tsx         - Top bar with page title, search, notifications, and user dropdown
    print/
      PrintModal.tsx     - Print preview modal for POs and GRNs
    ui/
      Badge.tsx          - Status badge component
      Button.tsx         - Reusable button component
      DataTable.tsx      - Generic table with sorting and CSV export
      Input.tsx          - Form input, select, and textarea components
      Modal.tsx          - Dialog/modal component
      States.tsx         - Empty, loading, and error state components
  lib/
    auth.tsx             - Auth context provider with session management
    exportUtils.ts       - CSV export utility functions
    supabase.ts          - Supabase client singleton
    utils.ts             - Shared utility functions (formatting, code generation)
  pages/
    Dashboard.tsx        - Procurement overview dashboard with KPI cards
    Suppliers.tsx        - Supplier directory CRUD
    PurchaseOrders.tsx   - Purchase order management with line items
    GoodsReceipts.tsx    - Goods receipt note management
    Invoices.tsx         - Supplier invoice tracking with payment recording
    Reports.tsx          - Analytics page (admin/manager only)
    Profile.tsx          - User profile, password change, and activity stats
    Settings.tsx         - Notification and display preferences
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

### Samin Osman (1042) - Database Design
- Designed the PostgreSQL schema with seven tables (profiles, suppliers, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, purchase_invoices)
- Defined table relationships, foreign keys, and constraints
- Implemented Row Level Security policies on every table
- Created the SECURITY DEFINER user_role() function for role-based access enforcement
- Built database views for dashboard metric aggregation
- Added performance indexes for frequently queried columns
- Created automated triggers for PO status updates and overdue invoice syncing
- Set up auto-numbering RPC functions for PO, GRN, supplier, and invoice codes

### Robiul Hassan (1043) - Backend & Application Development
- Architected and implemented the application's core backend and data-access architecture
- Built the authentication system with session management and `onAuthStateChange` handling
- Implemented role-based access control and protected application flows
- Set up and configured the Supabase client singleton and application integration
- Developed the complete client-side data-access layer for suppliers, purchase orders, goods receipts, invoices, profiles, and related operations
- Implemented CRUD operations and business logic across the core procurement modules
- Integrated auto-numbering RPC functions for generating sequential PO, GRN, supplier, and invoice codes
- Implemented purchase order creation, item management, and status handling logic
- Developed goods receipt processing, including received-quantity tracking and PO item updates
- Implemented GRN deletion logic with automatic quantity restoration to associated PO items
- Developed invoice payment recording and invoice status transition logic
- Integrated dashboard and analytics data with the application's backend services
- Connected frontend components with Supabase queries, RPC functions, and database operations
- Handled application-level validation, error states, loading states, and data synchronization across modules
- Coordinated backend integration between the database architecture and frontend workflows

### Mahafujul Alam (1066) - Frontend Development
- Developed the dashboard with KPI cards and recent activity lists
- Built the supplier directory with search, filter, and CRUD operations
- Created the purchase order form with multi-line items and live total calculation
- Developed goods receipt tracking with quantity validation and PO status updates
- Built invoice management with payment recording and overdue detection
- Created the analytics reports page with monthly spend charts
- Designed the responsive layout with collapsible sidebar and navigation
- Implemented the user dropdown with profile and settings navigation
- Built the notification panel with pending PO and overdue invoice alerts
- Created the print and PDF export system for POs and GRNs
- Developed the profile page with password change and activity stats
- Designed the settings page with notification and display preferences
- Built reusable UI components (Button, Input, Modal, DataTable, Badge, States)
- Implemented the login page with demo account quick-fill
