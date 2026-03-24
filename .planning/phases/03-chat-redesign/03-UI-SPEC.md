# UI-SPEC.md — Chat Page Redesign

**Phase:** 03 — Chat Redesign
**Status:** Draft
**Date:** 2026-03-24
**Designer:** Claude (UI Researcher)

---

## 1. Design System Overview

### 1.1 Design Philosophy

**Claymorphism Design System** — Soft 3D, chunky, playful, rounded.

The Layout component establishes a **Claymorphism** visual language with:
- Soft shadows and layered depth
- Purple/violet accent color (#8B5CF6)
- White surfaces with subtle gradients
- Rounded corners (xl to 2xl)
- Smooth micro-interactions

The Chat page must align with this established visual language while preserving all existing functionality.

### 1.2 Key Design Principles

1. **Consistency with Layout**: Match sidebar's claymorphic style
2. **Functionality Preservation**: ALL existing Chat features remain
3. **Visual Hierarchy**: Clear distinction between user/AI messages
4. **Accessibility**: WCAG AA+ contrast, visible focus states
5. **Responsive**: Work seamlessly from mobile to desktop

---

## 2. Color System

### 2.1 Primary Palette (from Layout)

| Role | Light Mode | Dark Mode | CSS Variable |
|------|------------|-----------|--------------|
| **Primary Accent** | `#8B5CF6` (violet-500) | `#A78BFA` (violet-400) | `--color-primary` |
| **Primary Dark** | `#7C3AED` (violet-600) | `#8B5CF6` (violet-500) | `--color-primary-dark` |
| **Background** | Gradient: white → purple-50/50 → violet-100/30 | `#0D1117` | `--soft-bg` |
| **Surface** | `#FFFFFF` | `#161B22` | `--soft-surface` |
| **Surface Hover** | `#F5F3FF` (violet-50) | `#21262D` | `--soft-surface-hover` |

### 2.2 Message Bubble Colors

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **User Message BG** | `#F3E8FF` (purple-100) | `#4C1D95` (purple-900) |
| **User Message Text** | `#6B21A8` (purple-800) | `#E9D5FF` (purple-200) |
| **AI Message BG** | `#FFFFFF` | `#161B22` |
| **AI Message Text** | `#1F2937` (gray-800) | `#E5E7EB` (gray-200) |
| **Message Border** | `#E9D5FF` (purple-200) | `#374151` (gray-700) |

### 2.3 Semantic Colors

| State | Color | Usage |
|-------|-------|-------|
| **Success** | `#22C55E` (green-500) | Tool success, copy confirmation |
| **Error** | `#EF4444` (red-500) | Error messages, failed operations |
| **Warning** | `#F59E0B` (amber-500) | Warnings, caution states |
| **Info** | `#3B82F6` (blue-500) | Informational states |
| **Streaming** | `#8B5CF6` (violet-500) | Typing indicator, loading states |

### 2.4 Text Colors

| Role | Light Mode | Dark Mode |
|------|------------|-----------|
| **Primary Text** | `#111827` (gray-900) | `#F9FAFB` (gray-50) |
| **Secondary Text** | `#6B7280` (gray-500) | `#9CA3AF` (gray-400) |
| **Muted Text** | `#9CA3AF` (gray-400) | `#6B7280` (gray-500) |
| **Placeholder** | `#D1D5DB` (gray-300) | `#4B5563` (gray-600) |

---

## 3. Typography System

### 3.1 Font Stack

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 Type Scale

| Level | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| **Page Title** | 20px | 1.3 | 600 | Chat header agent name |
| **Section Title** | 16px | 1.4 | 600 | Session titles, tool headers |
| **Body** | 15px | 1.6 | 400 | Message content |
| **Body Small** | 13px | 1.5 | 400 | Metadata, timestamps |
| **Caption** | 12px | 1.4 | 500 | Labels, hints |
| **Code** | 13px | 1.5 | 400 | Code blocks, inline code |

### 3.3 Message Typography

- **User Messages**: 15px, line-height 1.6, weight 400
- **AI Messages**: 15px, line-height 1.6, weight 400
- **Code Blocks**: 13px, JetBrains Mono, line-height 1.5
- **Timestamps**: 11px, gray-400, uppercase tracking-wide

---

## 4. Spacing System

### 4.1 Base Spacing Scale (8-point grid)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps, icon padding |
| `space-2` | 8px | Inline spacing, small gaps |
| `space-3` | 12px | Component internal padding |
| `space-4` | 16px | Standard padding |
| `space-5` | 20px | Card padding |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Major section breaks |
| `space-12` | 48px | Hero spacing |

### 4.2 Layout Spacing

| Element | Value |
|---------|-------|
| **Page padding** | 16px (mobile), 24px (desktop) |
| **Message gap** | 16px between messages |
| **Message padding** | 16px horizontal, 12px vertical |
| **Avatar size** | 32px × 32px |
| **Avatar gap** | 12px from message bubble |
| **Input area padding** | 16px |
| **Max content width** | 768px (message area) |

---

## 5. Component Specifications

### 5.1 Message Bubbles

#### User Message

```tsx
// Container
<div className="
  max-w-[85%] ml-auto
  bg-gradient-to-br from-violet-100 to-purple-100
  border border-violet-200
  rounded-2xl rounded-tr-sm
  px-4 py-3
  shadow-[0_2px_8px_rgba(139,92,246,0.1)]
">

// Text styling
<p className="text-gray-800 text-[15px] leading-relaxed">
```

#### AI Message

```tsx
// Container
<div className="
  max-w-[85%]
  bg-white
  border border-purple-100
  rounded-2xl rounded-tl-sm
  px-4 py-3
  shadow-[0_2px_8px_rgba(139,92,246,0.08)]
">

// Text styling
<p className="text-gray-800 text-[15px] leading-relaxed">
```

### 5.2 Message Avatar

```tsx
// User Avatar (simpler, smaller)
<div className="
  w-8 h-8 rounded-full
  bg-gradient-to-br from-violet-500 to-purple-600
  flex items-center justify-center
  shadow-[0_2px_8px_rgba(139,92,246,0.3)]
">
  <User className="w-4 h-4 text-white" />
</div>

// AI Avatar (more prominent)
<div className="
  w-8 h-8 rounded-full
  bg-gradient-to-br from-violet-500 to-purple-600
  flex items-center justify-center
  shadow-[0_2px_8px_rgba(139,92,246,0.3)]
  border-2 border-white
">
  <Bot className="w-4 h-4 text-white" />
</div>
```

### 5.3 Chat Input Area

**Already implemented in ChatInput.tsx — maintain current claymorphism style:**

```tsx
// Input container
<div className="
  relative flex flex-col rounded-2xl
  bg-white/90 backdrop-blur-sm
  border-2 border-purple-100
  shadow-[0_4px_16px_rgba(139,92,246,0.1)]
  focus-within:border-violet-300
  focus-within:shadow-[0_4px_20px_rgba(139,92,246,0.2)]
  transition-all duration-200
">

// Send button
<button className="
  flex items-center justify-center w-10 h-10 rounded-xl
  bg-gradient-to-br from-violet-500 to-purple-600
  text-white
  shadow-[0_4px_12px_rgba(139,92,246,0.35)]
">
```

### 5.4 Tool Call Cards

```tsx
// Tool card container
<div className="
  bg-white/80 backdrop-blur-sm
  border border-purple-100
  rounded-xl
  overflow-hidden
  shadow-[0_2px_8px_rgba(139,92,246,0.08)]
">

// Header
<div className="
  flex items-center gap-2 px-3 py-2
  bg-violet-50/50
  border-b border-purple-100
">
  <Wrench className="w-4 h-4 text-violet-500" />
  <span className="text-sm font-medium text-violet-700">
    {tool.name}
  </span>
</div>

// Content
<div className="p-3 text-sm text-gray-700 font-mono bg-gray-50/50">
```

### 5.5 Session Sidebar

```tsx
// Session item
<button className="
  w-full text-left px-3 py-2.5 rounded-xl
  transition-all duration-200
  hover:bg-violet-50
  data-[active=true]:bg-violet-100
  data-[active=true]:shadow-[inset_0_1px_2px_rgba(139,92,246,0.1)]
">

// Session title
<span className="
  block text-sm font-medium
  text-gray-700
  data-[active=true]:text-violet-800
  truncate
">

// Session timestamp
<span className="
  block text-xs text-gray-400 mt-0.5
">
```

### 5.6 Header Bar

```tsx
// Header container
<header className="
  flex items-center justify-between
  px-4 py-3
  bg-white/80 backdrop-blur-xl
  border-b border-purple-100
  sticky top-0 z-10
">

// Agent selector
<button className="
  flex items-center gap-2 px-3 py-1.5
  rounded-xl bg-violet-50
  hover:bg-violet-100
  transition-colors
">
  <Bot className="w-4 h-4 text-violet-600" />
  <span className="text-sm font-medium text-violet-700">
    {agentName}
  </span>
  <ChevronDown className="w-3.5 h-3.5 text-violet-400" />
</button>
```

### 5.7 Empty State

```tsx
// Container
<div className="
  flex flex-col items-center justify-center
  h-full py-20
  text-center
">
  // Icon
  <div className="
    w-16 h-16 rounded-2xl
    bg-gradient-to-br from-violet-100 to-purple-100
    flex items-center justify-center
    mb-4
    shadow-[0_4px_12px_rgba(139,92,246,0.15)]
  ">
    <Sparkles className="w-8 h-8 text-violet-500" />
  </div>

  // Title
  <h3 className="text-lg font-semibold text-gray-800 mb-2">
    {t('chat.startConversation')}
  </h3>

  // Subtitle
  <p className="text-sm text-gray-500 max-w-xs">
    {t('chat.noMessages')}
  </p>
</div>
```

---

## 6. Animation & Transitions

### 6.1 Message Animations

```tsx
// Message entry animation
const messageVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
};

// Stagger children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};
```

### 6.2 Typing Indicator

```tsx
// Bouncing dots
const dotVariants = {
  animate: {
    y: [0, -4, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Stagger delay for each dot: 0s, 0.15s, 0.3s
```

### 6.3 Hover Effects

| Element | Effect | Duration | Easing |
|---------|--------|----------|--------|
| Message bubble | scale: 1.01 | 200ms | ease-out |
| Send button | scale: 1.05 | 150ms | spring |
| Session item | bg: violet-50 | 150ms | ease |
| Tool card | shadow increase | 200ms | ease |
| Icon buttons | scale: 1.1 | 150ms | ease |

### 6.4 Page Transitions

Use existing `pageTransition` from `lib/animations.ts`:

```tsx
const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2 },
  },
};
```

---

## 7. Layout Specifications

### 7.1 Overall Structure

```
┌─────────────────────────────────────────────────────────┐
│  Header (sticky)                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Agent Selector    [New Chat] [Settings]         │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Message List (scrollable)                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │     ┌─────────────┐                             │   │
│  │     │ User Msg    │  ← Right aligned            │   │
│  │     └─────────────┘                             │   │
│  │  ┌─────────────┐                                │   │
│  │  │ AI Msg      │  ← Left aligned                │   │
│  │  └─────────────┘                                │   │
│  │     ┌─────────────┐                             │   │
│  │     │ User Msg    │                             │   │
│  │     └─────────────┘                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Input Area (fixed at bottom)                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Text Input                            ] [Send] │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Responsive Breakpoints

| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| **Mobile** | < 640px | Full width messages, compact header, hide session sidebar |
| **Tablet** | 640-1024px | 85% message width, show session sidebar |
| **Desktop** | > 1024px | 768px max message width, full session sidebar |

### 7.3 Z-Index Layers

| Layer | Z-Index | Elements |
|-------|---------|----------|
| **Background** | -10 | Gradient orbs |
| **Base** | 0 | Message list |
| **Sticky** | 10 | Header |
| **Overlay** | 20 | Modals, dropdowns |
| **Floating** | 30 | Tooltips, toasts |

---

## 8. Shadow System

### 8.1 Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(139,92,246,0.05)` | Subtle depth |
| `shadow-md` | `0 2px 8px rgba(139,92,246,0.08)` | Cards, messages |
| `shadow-lg` | `0 4px 16px rgba(139,92,246,0.1)` | Input area |
| `shadow-xl` | `0 8px 24px rgba(139,92,246,0.15)` | Modals, dropdowns |
| `shadow-inset` | `inset 0 2px 4px rgba(139,92,246,0.1)` | Active states |

### 8.2 Combined Shadows (Claymorphism)

```css
/* Standard card shadow */
shadow-[0_2px_8px_rgba(139,92,246,0.08)]

/* Active/pressed state */
shadow-[inset_0_2px_4px_rgba(139,92,246,0.1)]

/* Floating element */
shadow-[0_4px_12px_rgba(139,92,246,0.15),0_2px_4px_rgba(139,92,246,0.1)]

/* Button hover */
shadow-[0_4px_12px_rgba(139,92,246,0.35)]
```

---

## 9. Border Radius System

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Small elements, tags |
| `rounded-md` | 6px | Buttons, inputs |
| `rounded-lg` | 8px | Cards, containers |
| `rounded-xl` | 12px | Large cards, modals |
| `rounded-2xl` | 16px | Message bubbles |
| `rounded-full` | 9999px | Avatars, pills |

### 9.1 Message Bubble Radius

- **User messages**: `rounded-2xl rounded-tr-sm` (speech bubble effect)
- **AI messages**: `rounded-2xl rounded-tl-sm` (speech bubble effect)

---

## 10. Copywriting

### 10.1 Primary CTA Labels

| Action | Label | Translation Key |
|--------|-------|-----------------|
| Send message | "Send" | `chat.send` |
| New chat | "New Chat" | `chat.newChat` |
| Copy message | "Copy" | `chat.copy` |
| Retry failed | "Retry" | `chat.retry` |
| Stop generating | "Cancel" | `common.cancel` |

### 10.2 Empty State Copy

```
Title: "Start a conversation"
Subtitle: "Select an agent and send a message to begin"
Icon: Sparkles
```

### 10.3 Error State Copy

```
Title: "Failed to send"
Action: "Retry"
Icon: AlertCircle (red)
```

### 10.4 Loading States

```
Placeholder: "Type a message..."
Streaming: "Thinking..."
Connecting: "Connecting..."
Offline: "Offline"
```

### 10.5 Tool Call Labels

```
Running: "Running {toolName}..."
Completed: "Completed {toolName}"
Failed: "Failed: {toolName}"
Expand: "Show details"
Collapse: "Hide details"
```

---

## 11. Component Inventory

### 11.1 Existing Components (Preserve)

| Component | Location | Status |
|-----------|----------|--------|
| ChatInput | `components/chat/ChatInput.tsx` | Keep as-is (already claymorphic) |
| MessageList | Inline in Chat.tsx | Restyle needed |
| ToolCard | Inline in Chat.tsx | Restyle needed |
| SessionSidebar | Inline in Chat.tsx | Restyle needed |
| AgentSelector | Inline in Chat.tsx | Restyle needed |
| TypingIndicator | Inline in Chat.tsx | Restyle needed |
| WelcomeScreen | Inline in Chat.tsx | Restyle needed |

### 11.2 New/Modified Components Needed

| Component | Changes Required |
|-----------|------------------|
| MessageBubble | Apply claymorphism styling, new color scheme |
| MessageAvatar | Match Layout's avatar style |
| SessionListItem | Match Layout's nav item style |
| ToolCallCard | Apply claymorphism card style |
| EmptyState | Apply claymorphism empty state |
| ErrorState | Apply claymorphism error styling |

---

## 12. Accessibility Requirements

### 12.1 Focus States

```css
/* Visible focus ring */
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px white, 0 0 0 4px var(--color-primary);
}
```

### 12.2 Reduced Motion

```tsx
// Respect prefers-reduced-motion
const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const variants = prefersReducedMotion
  ? reducedMotionVariants
  : messageVariants;
```

### 12.3 ARIA Labels

```tsx
// Send button
<button aria-label={t('chat.send')}>

// Copy button
<button aria-label={t('chat.copy')}>

// Agent selector
<button aria-label={t('chat.selectAgent')}>
```

### 12.4 Color Contrast

- All text must meet WCAG AA (4.5:1 for normal text)
- Message text on colored backgrounds must be readable
- Interactive elements must have visible focus states

---

## 13. Implementation Checklist

### 13.1 Visual Updates

- [ ] Update message bubble colors (user: violet-100, AI: white)
- [ ] Apply claymorphism shadows to all cards
- [ ] Update avatar styling to match Layout
- [ ] Restyle session sidebar items
- [ ] Update tool call cards
- [ ] Apply claymorphism to empty/error states
- [ ] Update header styling
- [ ] Ensure all borders use purple-100/violet-200

### 13.2 Animation Updates

- [ ] Add spring animations to message entry
- [ ] Update typing indicator styling
- [ ] Add hover effects to interactive elements
- [ ] Ensure smooth transitions (150-300ms)

### 13.3 Functionality Preservation

- [ ] Message sending/receiving works
- [ ] WebSocket connection maintained
- [ ] Tool calls display correctly
- [ ] Session switching works
- [ ] Agent selection works
- [ ] Copy/retry actions work
- [ ] File attachment UI preserved
- [ ] Image/audio rendering preserved
- [ ] Fullscreen canvas preserved

### 13.4 Responsive Behavior

- [ ] Mobile layout (< 640px) works
- [ ] Tablet layout (640-1024px) works
- [ ] Desktop layout (> 1024px) works
- [ ] Session sidebar collapses on mobile

---

## 14. Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Chat.tsx` | Major restyling of all UI elements |
| `src/components/chat/ChatInput.tsx` | Minor tweaks if needed (already aligned) |
| `src/i18n/locales/*.json` | Add any new translation keys |

---

## 15. Design References

### 15.1 Source of Truth

- **Layout Component**: `src/components/layout/Layout.tsx`
- **Design Tokens**: `src/index.css` (CSS variables)
- **Animation Library**: `src/lib/animations.ts`

### 15.2 Key Patterns from Layout

1. **NavItemButton** — Use as reference for interactive elements
2. **ThemeToggle** — Use shadow and border patterns
3. **LanguageSwitcher** — Use dropdown styling
4. **Background** — Gradient from-white via-purple-50/50 to-violet-100/30

---

## 16. Anti-Patterns (Do NOT Use)

- ❌ Dark mode styling (not in Layout spec)
- ❌ Emojis as icons (use Lucide icons)
- ❌ Hard-coded colors (use CSS variables)
- ❌ Instant state changes (always use transitions)
- ❌ Missing cursor:pointer on clickable elements
- ❌ Layout-shifting hovers (avoid large scale transforms)
- ❌ Low contrast text (maintain 4.5:1 minimum)
- ❌ Invisible focus states

---

## 17. Summary

This UI-SPEC.md provides a complete design contract for redesigning the Chat page to align with the Layout component's Claymorphism design system. Key aspects:

1. **Colors**: Purple/violet accent (#8B5CF6), white surfaces, soft gradients
2. **Typography**: Inter font, 15px body text, clear hierarchy
3. **Spacing**: 8-point grid, generous padding
4. **Shadows**: Soft violet-tinted shadows for depth
5. **Animations**: Spring physics, smooth transitions
6. **Components**: Message bubbles, avatars, input, tool cards
7. **Accessibility**: WCAG AA+, visible focus, reduced motion support

**All existing functionality must be preserved.** This is a pure visual redesign.
