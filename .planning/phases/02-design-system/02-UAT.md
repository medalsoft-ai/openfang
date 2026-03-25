---
status: diagnosed
phase: 02-dual-editor
source: .planning/phases/02-design-system/02-PLAN.md
created: "2026-03-25T07:00:00Z"
updated: "2026-03-25T07:00:00Z"
---

# Phase 02 UAT — Chat Editor Design Consistency

## Current Test

testing complete — issue identified and diagnosed

## Tests

### 1. Chat Editor Tab Visual Consistency
**expected:** Chat Editor should match the violet/white soft UI design used in the rest of Hands page

**result:** issue

**reported:** "Hand详情中的chat tab没有符合当前页面的设计规范和配色" (Chat tab in Hand details doesn't match current page design specs and color scheme)

**severity:** cosmetic

## Summary

total: 1
passed: 0
issues: 1
pending: 0

## Gaps

```yaml
truth: "Chat Editor uses consistent violet/white soft UI theme matching Hands page"
status: failed
reason: "User reported: Chat tab doesn't match current page design specs and color scheme"
severity: cosmetic
test: 1
root_cause: "ChatEditor.tsx uses CSS variables (var(--card), var(--primary), var(--border)) which render as neon cyan cyber theme, while Hands.tsx uses explicit Tailwind classes with violet/white soft UI scheme"
artifacts:
  - path: "crates/openfang-webui/src/components/flow/ChatEditor.tsx"
    issue: "Uses CSS variable colors instead of matching Hands page Tailwind classes"
  - path: "crates/openfang-webui/src/pages/Hands.tsx"
    reference: "Shows correct violet/white color scheme"
missing:
  - "Update ChatEditor.tsx to use violet/white color scheme"
  - "Change bg-[var(--card)] to bg-white"
  - "Change text-[var(--primary)] to text-violet-500"
  - "Change border-[var(--border)] to border-gray-200 or border-violet-100"
  - "Update message bubbles to use violet accents instead of CSS variables"
  - "Update OperationPreviewCard to use violet scheme instead of amber primary"
```

## Design Reference

### Current Hands.tsx Color Scheme:
| Element | Classes |
|---------|---------|
| Background | `bg-white`, `bg-white/50` |
| Primary Accent | `text-violet-500`, `bg-violet-100` |
| Borders | `border-gray-100`, `border-violet-200` |
| Text Primary | `text-gray-700` |
| Text Secondary | `text-gray-500` |
| Success | `text-emerald-500`, `bg-emerald-50` |

### ChatEditor.tsx Current (Incorrect):
| Element | Current | Should Be |
|---------|---------|-----------|
| Container bg | `bg-[var(--card)]` | `bg-white` |
| Primary text | `text-[var(--primary)]` | `text-violet-600` |
| Borders | `border-[var(--border)]` | `border-gray-200` |
| User message bg | `bg-[var(--primary)]` | `bg-violet-500` |
| Assistant bg | `bg-[var(--muted)]` | `bg-gray-100` |

## Fix Plan

### File: ChatEditor.tsx

Update color scheme to match Hands.tsx:

1. **Container** (line 145): `bg-[var(--card)]` → `bg-white`
2. **Header border** (line 147): `border-[var(--border)]` → `border-gray-200`
3. **Primary icon** (line 149): `text-[var(--primary)]` → `text-violet-500`
4. **Muted text** (line 152, 176, etc.): `text-[var(--muted-foreground)]` → `text-gray-500`
5. **Input border** (line 193-194): `border-[var(--border)]` → `border-gray-300`
6. **Input focus** (line 194): `focus:ring-[var(--primary)]` → `focus:ring-violet-500`
7. **User message bg** (line 265): `bg-[var(--primary)]` → `bg-violet-500`
8. **Assistant message bg** (line 266): `bg-[var(--muted)]` → `bg-gray-100`
9. **OperationPreviewCard border** (line 327): `border-[var(--primary)]/20` → `border-violet-200`
10. **OperationPreviewCard bg** (line 327): `bg-[var(--primary)]/5` → `bg-violet-50`

This will make the Chat tab visually consistent with the violet/white soft UI theme used throughout the Hands page.
