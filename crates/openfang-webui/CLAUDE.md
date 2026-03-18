# OpenFang WebUI — Agent Instructions

## Naming Convention (Hand vs SOP)

**CRITICAL RULE:**

| Context | Display Text | Code |
|---------|-------------|------|
| User-facing UI | **SOP** | `t('sop.title')` or hardcoded `"SOP"` |
| Internal code | **Hand** | Types, variables, filenames, API calls |

### Rule
用户看得见的地方显示 **SOP**，内部逻辑代码保持 **Hand**

### Examples
- ✅ Sidebar badge text: `SOP`
- ✅ Toast message: `"SOP activated"`
- ✅ Page title: `SOP — Standard Operating Procedures`
- ✅ Type import: `import type { Hand } from '@/api/types'`
- ✅ Variable name: `const hand = hands[0]`
- ✅ API call: `api.getActiveHands()`
- ✅ Filename: `Hands.tsx` (keep as-is)
- ✅ Route path: `/hands` (keep as-is)

### Files with User-Facing SOP Text
- `src/components/layout/Layout.tsx` - Sidebar "SOP" badge and section title
- `src/pages/Hands.tsx` - Toast messages and page headings
- `src/i18n/locales/*.json` - Translation keys for all languages

---

## Build Commands

```bash
# Install dependencies
pnpm install

# Dev server
pnpm dev

# Production build
pnpm build

# Type check
pnpm type-check
```

## Tech Stack
- React 18 + TypeScript
- Tailwind CSS
- Framer Motion (animations)
- TanStack Query (data fetching)
- React Router (routing)
- i18next (internationalization)
- Lucide React (icons)
