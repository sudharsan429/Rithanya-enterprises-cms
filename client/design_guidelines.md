# Rithanya Enterprises CMS - Design System Guidelines

This document outlines the "Simple and Clean" design system used throughout the Rithanya Enterprises CMS. Use these guidelines to maintain visual consistency across all modules.

## 1. Core Principles
- **Clarity over Complexity**: Prioritize readability and functional layout over decorative elements.
- **Modern Professionalism**: Use clean borders and subtle shadows rather than aggressive gradients or blurs.
- **Consistent Hierarchy**: Ensure headings, subtext, and labels have distinct, predictable styles.

## 2. Typography
- **Headings (Page Titles)**: `text-2xl font-bold text-slate-800 tracking-tight`
- **Subheadings**: `text-sm font-bold text-slate-800`
- **Secondary Labels**: `text-[10px] font-bold text-slate-400 uppercase tracking-widest`
- **Body Text**: `text-sm font-medium text-slate-600`
- **Avoid**: Never use `font-black` or `italic` for standard interface labels unless specifically requested (e.g., for stylistic brand accents).

## 3. Visual Components
- **Containers (Cards)**: 
  - Background: `bg-white`
  - Border: `border border-slate-200`
  - Corners: `rounded-2xl`
  - Padding: `p-6` or `p-8`
  - Shadow: `shadow-sm`
- **Interactive States**:
  - Hover: `hover:bg-slate-50` or `hover:border-blue-200`
  - Active: `active:scale-95 transition-all`
- **Forms**:
  - Inputs: `bg-slate-50 border-slate-100 rounded-xl px-4 py-2.5 text-xs font-semibold focus:bg-white focus:border-blue-500`
  - Selects: Always use the [CustomSelect](file:///e:/freelance-work/rithanya-enterprises-cms/client/src/components/CustomSelect.jsx#4-81) component with `rounded-xl`.

## 4. Color Palette
- **Primary**: Blue-600 (`#2563eb`) - for primary buttons and active indicators.
- **Dark**: Slate-900 (`#0f172a`) - for high-contrast actions and text.
- **Neutral**: Slate-100/200 - for borders and subtle backgrounds.
- **Backgrounds**: `bg-slate-50` for page backgrounds, `bg-white` for content cards.

## 5. Spacing
- **Vertical Spacing (Sections)**: `space-y-6`
- **Vertical Spacing (Form Groups)**: `space-y-4`
- **Card Grids**: `grid gap-6`

## 6. Icons
- Use `lucide-react` icons.
- Size: `w-4 h-4` for standard labels, `w-5 h-5` for primary headings.
- Color: `text-slate-400` for secondary, `text-blue-500` for primary status.
