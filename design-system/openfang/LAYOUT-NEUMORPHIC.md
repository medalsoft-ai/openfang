# Layout & Sidebar - Neumorphic Design System

> Neumorphic design for OpenFang Layout and Sidebar components
> WebView2 compatible implementation

## Design Principles

### Core Neumorphic Rules
1. **Single Background**: All elements share the same background color
2. **Dual Shadows**: Light shadow (top-left) + Dark shadow (bottom-right) for raised effects
3. **No Borders**: Shadows define depth, not borders
4. **Pressed State**: Inverted shadows (inner shadow) for pressed/active states
5. **Consistent Radius**: Rounded corners throughout (12-20px)

### WebView2 Compatibility
- Use standard CSS box-shadow (no backdrop-filter for shadows)
- Add webkit prefixes for critical properties
- Test GPU acceleration compatibility
- Fallback for any experimental features

---

## Color Palette (Neumorphic)

### Light Mode
```css
--neu-bg: #E8EEF1;           /* Main background - soft gray-blue */
--neu-surface: #E8EEF1;      /* Same as bg for seamless look */
--neu-light: #FFFFFF;        /* Light shadow color */
--neu-dark: #B8C4CC;         /* Dark shadow color */
--neu-text: #2D3748;         /* Primary text */
--neu-text-muted: #718096;    /* Secondary text */
```

### Dark Mode
```css
--neu-bg: #1E2530;           /* Darker surface */
--neu-surface: #1E2530;
--neu-light: #283040;        /* Lighter than bg */
--neu-dark: #151B24;         /* Darker than bg */
--neu-text: #E2E8F0;
--neu-text-muted: #A0AEC0;
```

### Accent Colors (Preserved from Original)
```css
--neu-primary: #E11D48;      /* Rose accent */
--neu-success: #10B981;      /* Green for active states */
--neu-warning: #F59E0B;      /* Yellow for warnings */
```

---

## Shadow System

### Neumorphic Shadows
```css
/* Raised element (default) */
--neu-shadow-raised: 6px 6px 12px var(--neu-dark), -6px -6px 12px var(--neu-light);

/* Pressed element (active/selected) */
--neu-shadow-pressed: inset 4px 4px 8px var(--neu-dark), inset -4px -4px 8px var(--neu-light);

/* Subtle raised (cards, buttons) */
--neu-shadow-subtle: 3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light);

/* Hover state (slightly more raised) */
--neu-shadow-hover: 8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light);

/* Inset (input fields) */
--neu-shadow-inset: inset 2px 2px 4px var(--neu-dark), inset -2px -2px 4px var(--neu-light);
```

---

## Component Specifications

### Sidebar (Main Navigation)
- **Width**: 80px (icon-only, compact)
- **Background**: var(--neu-surface)
- **Shadow**: var(--neu-shadow-raised) on outer edge
- **Nav Items**:
  - Default: Flat, raised slightly
  - Active: Pressed/inset shadow
  - Hover: Slightly more raised
- **Logo**: Raised button effect with primary color icon

### SopSidebar (SOP List)
- **Width**: 340px
- **Background**: var(--neu-surface)
- **Search Input**: Inset shadow (pressed effect)
- **Group Headers**: Raised card effect
- **List Items**: Subtle raised, pressed on active
- **Footer**: Subtle raised stats container

### Cards (Used in Sidebar)
- **Border Radius**: 16px
- **Padding**: 16-20px
- **Shadow**: var(--neu-shadow-subtle)
- **Active State**: var(--neu-shadow-pressed)

---

## Layout Container

### Main Layout
```css
.layout-container {
  display: flex;
  height: 100vh;
  background: var(--neu-bg);
  overflow: hidden;
}

.sidebar {
  background: var(--neu-surface);
  box-shadow: var(--neu-shadow-raised);
  /* WebView2 safe - no backdrop-filter */
}

.main-content {
  flex: 1;
  background: var(--neu-bg);
  /* Inner shadow for depth */
}
```

### Neumorphic Cards
```css
.neu-card {
  background: var(--neu-surface);
  border-radius: 16px;
  box-shadow: var(--neu-shadow-subtle);
  transition: box-shadow 0.2s ease;
}

.neu-card:hover {
  box-shadow: var(--neu-shadow-hover);
}

.neu-card-pressed {
  box-shadow: var(--neu-shadow-pressed);
}
```

---

## Animation Guidelines

### Transitions
- **Duration**: 200-300ms
- **Easing**: ease-out
- **Properties**: box-shadow, transform

### Press Effect
```css
.neu-pressable {
  transition: box-shadow 0.2s ease, transform 0.1s ease;
}

.neu-pressable:active {
  box-shadow: var(--neu-shadow-pressed);
  transform: scale(0.98);
}
```

---

## WebView2 Specific Considerations

### DO:
- Use standard CSS box-shadow (widely supported)
- Add webkit prefixes for webkit-specific properties
- Use CSS custom properties for theming
- Test on actual WebView2 environment

### DON'T:
- Use backdrop-filter (inconsistent in WebView2)
- Use complex CSS filters
- Rely on modern CSS features without fallbacks
- Use experimental CSS properties without prefix

### Fallbacks:
```css
/* If webkit-backdrop-filter fails */
@supports not (-webkit-backdrop-filter: blur(10px)) {
  .glass-neu {
    background: var(--neu-surface);
    box-shadow: var(--neu-shadow-subtle);
  }
}
```

---

## Responsive Behavior

### Mobile (< 768px)
- Sidebar collapses to icon-only (48px)
- SopSidebar becomes full-width drawer
- Touch-friendly tap targets (44px minimum)

### Tablet (768px - 1024px)
- Sidebar remains icon-only
- SopSidebar 280px

### Desktop (> 1024px)
- Full layout as designed
- SopSidebar 340px

---

## Implementation Checklist

- [ ] Add neumorphic CSS variables to index.css
- [ ] Create neumorphic utility classes
- [ ] Update Sidebar.tsx with neumorphic styles
- [ ] Update SopSidebar.tsx with neumorphic styles
- [ ] Test in WebView2 environment
- [ ] Verify dark mode support
- [ ] Check accessibility (focus states, contrast)
