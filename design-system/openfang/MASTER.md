# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** OpenFang
**Generated:** 2026-03-24 14:25:37
**Category:** Analytics Dashboard

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#171717` | `--color-primary` |
| Secondary | `#404040` | `--color-secondary` |
| CTA/Accent | `#D4AF37` | `--color-cta` |
| Background | `#FFFFFF` | `--color-background` |
| Text | `#171717` | `--color-text` |

**Color Notes:** Minimal black + accent gold

### Typography

- **Heading Font:** Fira Code
- **Body Font:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise
- **Google Fonts:** [Fira Code + Fira Sans](https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700|Fira+Sans:wght@300;400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Layout Separation (No Border Lines)

**Core Principle:** Use elevation, background contrast, and whitespace instead of visible border lines.

### Method 1: Shadow Elevation (Recommended for Sidebar/Float)

```css
/* Sidebar - floating with shadow */
.sidebar {
  background: #FFFFFF;
  box-shadow: var(--shadow-lg);  /* Creates separation without border */
  z-index: 20;
}

/* Chat input area - top shadow to show it floats above content */
.chat-input-area {
  background: #FFFFFF;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05);  /* Shadow on top edge */
}
```

### Method 2: Background Contrast

```css
/* Layout with natural separation via background colors */
.layout {
  background: #F5F5F7;  /* Light gray for outer frame */
}

.sidebar {
  background: #FFFFFF;  /* White - contrasts with gray */
  /* No border needed! */
}

.main-content {
  background: #FFFFFF;  /* White */
  margin: 16px;
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}
```

### Method 3: Whitespace + Card Style (Bento Grid)

```css
/* Use gap and cards instead of borders */
.container {
  display: grid;
  gap: 20px;          /* Space creates separation */
  padding: 20px;
  background: #F5F5F7;  /* Page background */
}

.section-card {
  background: #FFFFFF;
  border-radius: 20px;  /* 16-24px rounded corners */
  padding: 24px;
  /* No border! Separation comes from gap + shadow */
  box-shadow: var(--shadow-md);
}
```

### Method 4: Claymorphism (Double Shadow)

```css
/* For a softer, modern look */
.clay-section {
  background: #FFFFFF;
  border-radius: 24px;
  box-shadow:
    8px 8px 16px rgba(0,0,0,0.08),     /* Outer shadow */
    -8px -8px 16px rgba(255,255,255,0.8);  /* Inner highlight */
}
```

### Applied to OpenFang Layout

```tsx
// Layout.tsx - No more border-r or border-t!
<div className="flex h-screen bg-[#F5F5F7]">
  {/* Sidebar - floating with shadow */}
  <aside className="w-64 bg-white shadow-lg z-20">
    {/* Sidebar content */}
  </aside>

  {/* Main area - nested structure with spacing */}
  <main className="flex-1 flex flex-col p-4">
    {/* Chat area card */}
    <div className="flex-1 bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Messages */}
    </div>

    {/* Input area - floating above with top shadow */}
    <div className="mt-4 bg-white rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-4">
      {/* Input */}
    </div>
  </main>
</div>
```

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #D4AF37;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #171717;
  border: 2px solid #171717;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #171717;
  outline: none;
  box-shadow: 0 0 0 3px #17171720;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Data-Dense Dashboard

**Keywords:** Multiple charts/widgets, data tables, KPI cards, minimal padding, grid layout, space-efficient, maximum data visibility

**Best For:** Business intelligence dashboards, financial analytics, enterprise reporting, operational dashboards, data warehousing

**Key Effects:** Hover tooltips, chart zoom on click, row highlighting on hover, smooth filter animations, data loading spinners

### Page Pattern

**Pattern Name:** Minimal Single Column

- **Conversion Strategy:** Single CTA focus. Large typography. Lots of whitespace. No nav clutter. Mobile-first.
- **CTA Placement:** Center, large CTA button
- **Section Order:** 1. Hero headline, 2. Short description, 3. Benefit bullets (3 max), 4. CTA, 5. Footer

---

## Anti-Patterns (Do NOT Use)

- ❌ Ornate design
- ❌ No filtering

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
