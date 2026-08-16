# SKILL: Rithanya Enterprise CMS Agent
---
name: rithanya-cms-agent
description: Project intelligence for Rithanya Enterprise CMS - specialized in MERN stack, batch-level inventory tracking, and "Simple and Clean" UI design.
---

## Project Overview
A Production Management & Canteen Billing system.
- **Frontend**: React (Vite) + Vanilla CSS (designed like Tailwind).
- **Backend**: Node.js + Express + MongoDB + Socket.io.
- **Ports**: Server: **5000**, Client: **5173** (default Vite).

## Flow Analysis (Tracing Features)
1. **Frontend Route**: `client/src/App.jsx` maps URL to Page components.
2. **State Management**: Context API (`AuthContext`, `SocketContext`).
3. **API Requests**: `client/src/api/axios.js` (base configuration). Frontend calls are relative to `/api`.
4. **Backend Flow**: `server/index.js` -> `server/routes/` -> `server/controllers/` -> `server/models/`.
5. **Batch Tracking**: `dailyStockId` is the primary key for product lifecycle. It must be propagated from `DailyStock` through `Stock`, `Transfer`, `Sale`, and `Return`.

## Implementation Rules (Inventory Integrity)
1. **Auditing**: Every `Stock` modification must be paired with a `Transaction` ledger entry.
2. **Locking**: `DailyStock` entries must be treated as **Locked** (`isLocked`) if any related stock has been transferred.
3. **Role Sensitivity**: Always filter data based on `user.role` & `user.assignedProductionUnit` / `user.assignedCanteen`.
4. **Design**: Adhere to `rounded-2xl`, `shadow-sm`, and `Inter/Outfit` typography. Use `<ManagementTable />` and `<CustomSelect />` components.

## Real-time Awareness
- Catch `STOCK_UPDATED`, `SALE_CREATED`, and `TRANSFER_COMPLETED` for live dashboard updates.
- Monitor `stock:low-alert` for critical inventory triggers.

## Common Commands
- **Frontend**: `npm run dev` (Port 5173 / Default Vite)
- **Backend**: `npm run dev` (Port 5000)
- **Database**: Local or Managed MongoDB.
