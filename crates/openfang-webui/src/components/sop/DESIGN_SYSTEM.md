# SOP Components Design System

## Overview
This document describes the **claymorphism** design system used for the SOP (Standard Operating Procedures) page components, aligned with the Chat and Layout pages.

## Design Style: Claymorphism

### Key Characteristics
- **Soft 3D appearance** with chunky, playful, rounded elements
- **Violet/Purple primary colors** (#8B5CF6)
- **White cards** with subtle shadows and borders
- **Smooth animations** using framer-motion

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #8B5CF6 | Violet - CTAs, active states, highlights |
| Primary Dark | #7C3AED | Purple - gradients, emphasis |
| Success | #10B981 | Emerald - Active/running status |
| Warning | #F59E0B | Amber - Alerts, requirements not met |
| Destructive | #EF4444 | Red - Deactivate, errors |
| Background | #F9FAFB | Light gray - page background |
| Card | #FFFFFF | White - card backgrounds |
| Text Primary | #111827 | Gray-900 - headings |
| Text Secondary | #6B7280 | Gray-500 - descriptions |
| Text Muted | #9CA3AF | Gray-400 - timestamps, hints |

### Typography
- **Headings**: font-semibold, text-gray-800 dark:text-gray-100
- **Body**: text-sm, text-gray-700 dark:text-gray-300
- **Muted**: text-xs, text-gray-400

## Component Styles

### Sidebar (SopSidebar)
- **Width**: w-72 (288px)
- **Style**: Rounded-2xl with shadow and border
- **Header**: Section title with count badge
- **Groups**: Collapsible category sections with icons
- **Items**: Hand cards with avatar, name, description, active indicator

### Detail Panel (SopDetail)
- **Layout**: Centered max-w-2xl content
- **Cards**: Stacked rounded-2xl cards with subtle shadows
- **Header Card**: Icon, title, description, action buttons
- **Status Card**: Active status with instance info
- **Requirements Card**: Checklist with satisfied/unsatisfied states
- **Info Cards**: Category, tools, AI model configuration

### Bento Grid Layout
Following the Chat page pattern:
```
┌─────────────┬─────────────────────────────┐
│             │                             │
│  Sidebar    │      Detail Panel          │
│  (Groups)   │      (Cards Stack)         │
│             │                             │
└─────────────┴─────────────────────────────┘
```

## Animation Guidelines

### Transitions
- **Micro-interactions**: 150-200ms
- **Hover effects**: scale 1.02-1.05, 200ms
- **Tap effects**: scale 0.98, 150ms
- **Card entrance**: opacity + y translation, 300ms

### Motion
- Use framer-motion for React components
- Prefer `scale` and `opacity` for performance
- Respect `prefers-reduced-motion`
- Use spring animations for navigation indicators

## Shadows

### Card Shadows
```css
/* Standard card */
shadow-[0_4px_20px_rgba(139,92,246,0.06)]
border border-white/50

/* Elevated card */
shadow-[0_8px_32px_rgba(139,92,246,0.08)]

/* Button shadow */
shadow-lg shadow-violet-500/25
```

### Active Indicators
- Pulsing emerald dot for active status
- Violet highlight for selected items
- Gradient backgrounds for primary actions

## File Structure
```
components/sop/
├── SopPage.tsx      - Main container with bento grid layout
├── SopSidebar.tsx   - Grouped navigation with collapsible categories
├── SopDetail.tsx    - Detail view with stacked cards
└── index.ts         - Exports
```

## Component States

### Hand Item States
| State | Background | Border | Icon |
|-------|------------|--------|------|
| Default | bg-white/50 | border-transparent | gray |
| Hover | bg-white | border-transparent + shadow | gray |
| Selected | bg-violet-100 | border-violet-200 | violet gradient |
| Active | + emerald dot | - | - |

### Button States
| State | Style |
|-------|-------|
| Primary Default | Gradient violet-purple, shadow |
| Primary Hover | Brighter shadow |
| Primary Disabled | opacity-50, cursor-not-allowed |
| Destructive | Gradient red-rose |

## Dark Mode Support
- Use `dark:` variants for all color changes
- Maintain proper contrast ratios
- Test both light and dark modes
