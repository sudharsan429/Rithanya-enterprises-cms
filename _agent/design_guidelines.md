# Rithanya Enterprises CMS - Design System Guidelines

This document outlines the "Simple and Clean" design system used throughout the Rithanya Enterprises CMS.

## 1. Core Principles
- **Clarity over Complexity**: Prioritize readability and functional layout.
- **Modern Professionalism**: Use clean borders and subtle shadows (`shadow-sm`).
- **Consistent Hierarchy**: Distinct styles for headings, labels, and body text.

## 2. Typography (Inter / Outfit / Roboto)
- **Headings**: `text-2xl font-bold text-slate-800 tracking-tight`
- **Subheadings**: `text-sm font-bold text-slate-800`
- **Utility Labels**: `text-[10px] font-bold text-slate-400 uppercase tracking-widest`
- **Body Text**: `text-sm font-medium text-slate-600`

## 3. Core Components & Patterns

### A. Management Table (`<ManagementTable />`)
All listing pages (Users, Products, Transfers) must use the standardized management table.
- **Header Selection**: Provide clear actions (Edit, Delete, View) in a fixed action column.
- **Badges**: Use encapsulated `<span>` with `px-2 py-1 rounded-full text-[10px] font-bold`.
  - **Success**: `bg-emerald-50 text-emerald-600 border border-emerald-100`
  - **Warning**: `bg-amber-50 text-amber-600 border border-amber-100`
  - **Error/Destructive**: `bg-rose-50 text-rose-600 border border-rose-100`

### B. Form Selection (`<CustomSelect />`)
Never use native HTML selects. Always use the `react-select` based `CustomSelect`.
- **Styling**: `rounded-xl border-slate-100 shadow-sm`.
- **Experience**: Must support searchable dropdowns for Products and Locations.

### C. Input Fields
- **Style**: `bg-slate-50 border-slate-100 rounded-xl px-4 py-2.5 text-xs font-semibold focus:bg-white focus:border-blue-500 transition-all`.

## 4. Real-time Status Indicators
- **Socket Feedback**: UI elements (like the Dashboard stats) should flash or update dynamically on `STOCK_UPDATED` or `SALE_CREATED`.
- **Low Stock Alerts**: Use persistent but non-intrusive notifications when `stock:low-alert` is received.

## 5. Layout & Spacing
- **Cards**: `bg-white rounded-2xl border border-slate-200 p-6 shadow-sm`.
- **Grid**: Use `grid gap-6` for responsive layouts.
- **Spacing**: `space-y-6` for vertical stacking in forms/sections.

## 6. Icons & Buttons
- **Icons**: `lucide-react` (size `w-4 h-4`).
- **Primary Button**: `bg-blue-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all`.
- **Secondary Button**: `bg-slate-100 text-slate-800 rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-slate-200`.
