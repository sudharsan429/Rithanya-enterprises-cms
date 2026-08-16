# Rithanya Enterprises CMS - Project Flow & Architecture Reference

This document serves as an overarching guide for AI agents and future developers to reference the architecture, domain logic, and primary workflows for the Rithanya Enterprises CMS (Canteen Management System).

## 1. System Overview
The CMS is a full-stack web application designed for tracking daily production, inventory movement, point-of-sale billing, and reporting for a company operating multiple Production Units (PUs) and Canteens.

- **Frontend**: React (Vite-based), using React Router for navigation and Context API for global state management (`AuthContext`, `SocketContext`). Styling follows a "Simple and Clean" aesthetic using Vanilla CSS with utility-class patterns.
- **Backend**: Node.js with Express for RESTful API routing, backed by MongoDB for data persistence. Incorporates Socket.io for real-time status updates (e.g., instant transfer notifications, low-stock alerts).
- **Architecture**: Domain-driven structure with logic isolated in Controllers (`server/controllers`). Middleware handles JWT-based authentication and role-based authorization.

## 2. Core Entities (Models)

The application translates physical inventory actions into traceable segments, heavily relying on **Batch-Level Tracking** via `dailyStockId`.

| Entity | Description |
|---|---|
| **User** | System actors with Roles (`superadmin`, `admin`, `prod_manager`, `salesperson`). Bound to `assignedCanteen` or `assignedProductionUnit`. |
| **Category / Product** | Master records. Products include metadata like `uom`, `price`, and `lowStockThreshold`. |
| **ProductionUnit / Canteen** | Physical locations identifying where goods originate and reside. |
| **Stock** | **Real-time Inventory Truth**. Tracks `quantity`, `damagedQuantity`, `soldQty`, and `transferQty`. Tied to a specific `productId`, `locationId`, and notably, a `dailyStockId` (Batch). |
| **DailyStock** | **Production Log**. Tracks batch-specific output. Carries an `isLocked` flag (calculated) when stock has moved beyond the PU. |
| **Transfer** | Handles movement between locations (PU-to-PU, PU-to-Canteen, Canteen-to-Canteen). Tracks items from initiation (`pending`) to acceptance (`completed`). |
| **Transaction** | **Immutable Audit Ledger**. Every stock manipulation (`Transfer_In/Out`, `Sale`, `Adjustment`, `Return`) MUST log an entry here for historical reconciliation. |
| **Sale** | POS record of customer billing. Decrements `quantity` from Canteen `Stock` and updates originating `DailyStock.soldQty`. |
| **Return** | Reverse workflow for `damage`, `unsold`, or `expired` items. |

## 3. The Interactive Workflows (Operational Lifecycle)

### A. Production (Inflow)
1. **Trigger**: Production managers record manufactured quantities at `[Frontend] /daily-stock/new`.
2. **Action**: The API creates/updates a `DailyStock` record and increments the PU's `Stock` for each product.
3. **Auditing**: A `Transaction` of type `Adjustment` is logged for each item.
4. **Locking**: Once any product from a `DailyStock` batch is transferred out, the entry becomes **Locked** (`isLocked: true`) and cannot be edited or deleted to preserve ledger integrity.

### B. Transferring (Movement)
1. **Trigger**: PU dispatches stock to Canteens, or inter-canteen rebalancing.
2. **Action (Initiate)**: User selects products at `[Frontend] /transfers/new`. System verifies available stock at source.
3. **Action (Accept)**: Destination managers verify receipts at `[Frontend] /accept-transfers`.
4. **Result (On Acceptance)**:
   - **Source Stock**: Decrements `quantity`.
   - **Destination Stock**: Increments `quantity` (accepted) and `damagedQuantity` (damaged).
   - **DailyStock**: Tracks `transferQty` and `damagedQty` back to the original production record.
   - **Audit**: Two `Transaction` entries: `Transfer_Out` (Source) and `Transfer_In` (Destination).
   - **Real-time**: Emit `TRANSFER_COMPLETED` and `stock:low-alert` if thresholds are breached.

### C. Selling (Point of Sale)
1. **Trigger**: Customer purchase at Canteen processed via `[Frontend] /billing`.
2. **Bill Generation**: Resetting sequence at **3 AM daily** (`RE-CANTEEN-001`).
3. **Result**:
   - `Sale` document created.
   - Canteen `Stock` decremented (`quantity`) and `soldQty` incremented.
   - Originating `DailyStock.soldQty` updated for production-to-sales analysis.
   - `Transaction` type `Sale` logged.

### D. Returns (Reverse Logistics)
The system handles three distinct return types with different stock impacts:
- **Damage**: Auto-approved. Deducts from Canteen Stock and increments **Damaged** bucket at the target Production Unit.
- **Unsold**: Processed with a `pending` status. Requires Admin/Manager approval to move back into **Usable** stock at the PU. 
- **Expiry**: Deducts from Canteen Stock (Usable then Damaged) and increments **Damaged** bucket at the PU.

## 4. Technical Nuances & Architectural Rules

### Mandatory For All System Modifications:
1. **Auditing Rule**: Never use `findOneAndUpdate` on `Stock` without a corresponding `Transaction` creation. The ledger must always match raw stock totals.
2. **Batch Persistence**: Always propagate `dailyStockId` through the pipeline (DailyStock -> Stock -> Transfer -> Sale/Return). This is the key to accurate reporting.
3. **Role-Based Isolation (Data Query Hardening)**:
   - `req.user` in `middleware/authMiddleware.js` dictates query scope.
   - Controllers must filter by `assignedCanteen` or `assignedProductionUnit` for non-admin users.
4. **"Simple and Clean" Aesthetic Standards**:
   - Rounded corners (`2xl`), soft shadows (`sm`), Inter/Outfit typography.
   - Maintain consistency using `<ManagementTable />` and `<CustomSelect />` (via `react-select`).
5. **Real-time Sync**:
   - Use `req.app.get('socketio').emit(...)` to broadcast updates.
   - Handled events: `STOCK_UPDATED`, `SALE_CREATED`, `TRANSFER_COMPLETED`, `stock:low-alert`.

## 5. Reporting & Analytics Architecture
- **Unified Location Picker**: Uses `GET /api/reports/locations` to bridge PU and Canteen data for filtering.
- **Terminology Mapping**:
  - **Canteen View**: "Received" vs. "Sold".
  - **Production View**: "Produced" vs. "Transferred" (as "Actual Sale").
- **Cost Analysis**: Tracks `costPrice` at time of production vs. `price` at time of sale to calculate gross margins within `reportController.js`.
