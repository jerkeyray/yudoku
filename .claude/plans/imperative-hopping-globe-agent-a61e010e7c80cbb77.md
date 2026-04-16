# Light Mode Implementation Plan for Yudoku

## Overview

Add light mode support to the dashboard/app pages while keeping the landing page, navbar, and sign-in page permanently dark. The CSS variable system and next-themes are already in place; the work is (1) unblocking theme switching and (2) replacing hardcoded dark colors with theme tokens across ~20 dashboard files.

---

## Phase 1: Enable Theme Switching (2 files)

### Step 1.1 — Remove forcedTheme from Providers.tsx

**File:** `components/Providers.tsx`

Remove `forcedTheme="dark"` and optionally enable `enableSystem`. This is the single change that unblocks everything.

```
- forcedTheme="dark"
- enableSystem={false}
+ enableSystem
```

Keep `defaultTheme="dark"` so first-time visitors get dark mode.

### Step 1.2 — Fix flash-of-wrong-theme in root layout

**File:** `app/layout.tsx`

The `<html>` and `<body>` tags have `className="bg-black"` which causes a white flash when the class switches. Replace with the CSS variable token:

```
- <html lang="en" suppressHydrationWarning className="bg-black">
-   <body className={`${inter.className} bg-black`} suppressHydrationWarning>
+ <html lang="en" suppressHydrationWarning>
+   <body className={`${inter.className}`} suppressHydrationWarning>
```

The `globals.css` already applies `bg-background text-foreground` to `body` via `@layer base`, so this is safe to remove.

---

## Phase 2: Add Theme Toggle to Dashboard Sidebar (2 files)

### Step 2.1 — Create a simple sidebar toggle component

**File:** `components/ui/theme-toggle.tsx` (new file)

Create a compact icon-button toggle (Sun/Moon) that calls `useTheme().setTheme()`. Unlike the existing `ModeToggle` dropdown, this should be a single-click toggle between light and dark (no dropdown, no system option). When collapsed, show just the icon; when expanded, show icon + label.

Props: `isCollapsed: boolean`

### Step 2.2 — Wire toggle into DashboardSidebar

**File:** `components/DashboardSidebar.tsx`

Add the new `ThemeToggle` component in the bottom section, between the "Why Yudoku" link and the profile dropdown. Pass `isCollapsed` through.

---

## Phase 3: Refactor Dashboard Layout (1 file)

### Step 3.1 — Replace hardcoded colors in layout-client.tsx

**File:** `app/home/layout-client.tsx`

This is the main dashboard shell — sidebar wrapper and content area. Five instances of `bg-black` need replacing:

| Line | Current | Replacement |
|------|---------|-------------|
| 42 | `bg-black` | `bg-background` |
| 46 | `bg-black` | `bg-background` |
| 63 | `text-white` | `text-foreground` |
| 81 | `bg-black` | `bg-background` |
| 85 | `bg-black` | `bg-background` |

---

## Phase 4: Refactor Dashboard Pages (8 files)

Each dashboard page wraps content in `<div className="min-h-screen bg-black text-white">`. Replace with `bg-background text-foreground` throughout. Also replace `text-zinc-*`/`text-neutral-*` with semantic tokens.

### Token mapping reference:
- `bg-black` / `bg-zinc-900` → `bg-background`
- `bg-zinc-900/40` / `bg-zinc-900/50` / `bg-zinc-900/30` → `bg-card` or `bg-muted`
- `text-white` → `text-foreground`
- `text-zinc-100` / `text-zinc-200` → `text-foreground`
- `text-zinc-400` / `text-zinc-500` / `text-neutral-400` / `text-neutral-500` → `text-muted-foreground`
- `text-zinc-600` / `text-neutral-600` → `text-muted-foreground` (or a dimmer variant)
- `border-zinc-800` / `border-white/5` / `border-white/10` → `border-border`
- `bg-white/5` / `bg-white/10` (hovers) → `hover:bg-accent`
- `bg-zinc-800` (skeleton) → `bg-muted`
- `hover:bg-white/5` → `hover:bg-accent`

### Step 4.1 — `app/home/bookmarks/page.tsx`
Replace ~15 hardcoded color classes (bg-black, text-white, bg-zinc-900/50, border-zinc-800, bg-zinc-800, text-zinc-400, text-zinc-600, text-gray-400).

### Step 4.2 — `app/home/mycourses/page.tsx`
Replace bg-black, text-white, bg-zinc-900/40, border-zinc-800, text-zinc-400, text-zinc-200, hover:bg-white/5, hover:text-white, border-zinc-800, text-zinc-600.

### Step 4.3 — `app/home/moments/page.tsx`
Replace bg-black, text-white, text-zinc-400, text-zinc-600, bg-zinc-900/40, border-zinc-800, text-zinc-200, text-zinc-500, hover:bg-white/5.

### Step 4.4 — `app/home/profile/ProfileClient.tsx`
Replace bg-black, text-white, bg-zinc-900/50, bg-zinc-900/30, border-zinc-800, border-zinc-800/50, text-zinc-500, text-zinc-400, text-zinc-300, text-zinc-600, text-zinc-200, ring-zinc-800, bg-zinc-900, bg-zinc-800, bg-white (buttons), text-black (buttons).

Note: The "Resume Learning" button uses `bg-white text-black` — this should become `bg-primary text-primary-foreground` or remain as-is if it's intentional contrast.

### Step 4.5 — `app/home/courses/create/CreateCourseClient.tsx`
Replace bg-black, text-white, text-neutral-400, hover:bg-white/5, bg-[#0F0F0F], bg-[#0A0A0A], border-white/10, border-white/15, text-neutral-200, text-neutral-600, text-neutral-500, bg-white/text-black (submit button).

### Step 4.6 — `app/home/courses/[id]/loading.tsx`
Replace bg-black, text-white, bg-zinc-900, bg-zinc-800, border-zinc-800.

### Step 4.7 — `app/why-yudoku/page.tsx`
Replace bg-black, text-neutral-200, text-white, bg-white/10.

### Step 4.8 — `app/home/HomeClient.tsx`
This file is ALREADY mostly using theme tokens (bg-background, text-foreground, text-muted-foreground, etc.). Only a few hardcoded values remain:
- Line 206: `bg-white/[0.04]`, `border-white/[0.08]`, etc. — these translucent overlays need to become theme-aware (e.g., `bg-foreground/[0.04]`)
- Line 264: `border-white/5` → `border-border`
- Line 295: `text-white` → `text-foreground`
- Line 299: `text-neutral-500` → `text-muted-foreground`
- Line 327: `hover:bg-white/5` → `hover:bg-accent`

---

## Phase 5: Refactor Dashboard Components (6 files)

### Step 5.1 — `components/DashboardSidebar.tsx`
The heaviest refactor. Replace throughout:
- `text-white` → `text-foreground`
- `text-neutral-400` → `text-muted-foreground`
- `text-neutral-200` → `text-foreground`
- `bg-white/10` → `bg-accent`
- `bg-white/5` / `hover:bg-white/5` → `hover:bg-accent`
- `bg-[#0A0A0A]` (dropdown) → `bg-popover`
- `border-white/10` → `border-border`
- `ring-white/10` → `ring-border`
- `bg-neutral-800` → `bg-muted`

### Step 5.2 — `components/VideoCard.tsx`
Replace border-zinc-800, bg-zinc-900/50, bg-zinc-900, bg-zinc-800/50, text-white, text-zinc-500, text-zinc-200, border-zinc-800, text-gray-400, bg-black/40, bg-black/60, bg-black/80, hover:bg-white/5.

Note: Some of these (like bg-black/80 on duration badge overlay) may be fine to keep since they're always on top of a thumbnail image.

### Step 5.3 — `components/CourseCard.tsx`
Replace border-zinc-900, bg-zinc-900/20, border-zinc-800, bg-zinc-900/40, text-zinc-100, text-zinc-500, text-zinc-400, text-zinc-200, bg-white/5, hover:bg-white/5.

### Step 5.4 — `components/StreakDisplay.tsx`
Replace bg-[#0D1016], border-white/5, text-neutral-500, text-white, text-neutral-300, text-neutral-600.

### Step 5.5 — `components/MobileNav.tsx`
Replace bg-zinc-900, text-white, border-zinc-700, border-zinc-800, hover:bg-zinc-800.

### Step 5.6 — `components/LoadingScreen.tsx`
Replace bg-black/90, bg-neutral-900/50, text-white, text-white/80, text-neutral-400.

### Step 5.7 — `components/ActivityHeatmap.tsx`
Replace bg-zinc-900 → bg-muted.

---

## Phase 6: Refactor Course Player Components (3 files)

### Step 6.1 — `app/home/courses/[id]/CoursePlayer.tsx`
Replace bg-black (video container — may keep for video background), text-white, text-neutral-500, text-neutral-400, border-white/10, bg-white/5, bg-white/10, border-white/20, border-white/30.

Note: The video player container `bg-black` at line 63 should likely stay black since it's behind the video iframe.

### Step 6.2 — `app/home/courses/[id]/CourseSidebar.tsx`
Replace text-white, text-neutral-400, text-neutral-500, border-white/5, border-white/10, bg-white/10, hover:bg-white/5.

### Step 6.3 — `app/home/courses/[id]/ChaptersSidebar.tsx`
Replace text-white, text-neutral-400, text-neutral-500, border-white/5, border-white/10, bg-white/10, hover:bg-white/5, text-white/80.

---

## Phase 7: UI Primitives Check (2 files)

### Step 7.1 — `components/ui/dialog.tsx`
Already uses `bg-background` — no changes needed. The `bg-black/50` overlay is fine (dimming overlay should always be dark).

### Step 7.2 — `components/ui/sheet.tsx`
Already uses `bg-background` — no changes needed. The `bg-black/50` overlay is fine.

---

## Phase 8: Landing Page Strategy (0 changes)

The landing page (`components/LandingPage.tsx`, `components/Navbar.tsx`, `app/sign-in/[[...sign-in]]/page.tsx`, `app/page.tsx`) uses hardcoded hex colors and Tailwind dark color classes. Since they don't use CSS variable tokens, they will NOT be affected by theme changes.

However, there is one concern: when `next-themes` sets the `class="light"` on `<html>`, the `body` gets light `bg-background`. The landing page component sets its own `bg-black` etc., so it will paint over the body background. This should work correctly without any special handling.

**Validation needed:** After implementation, verify the landing page renders correctly in both theme states. If there's any flash of white background before the landing page component mounts, consider adding `forcedTheme="dark"` specifically for the landing page layout. This can be done with a nested ThemeProvider in the landing page route.

---

## Implementation Order & Dependencies

1. **Phase 1** (Providers + layout) — must be first; unblocks everything
2. **Phase 2** (Toggle component + sidebar) — can happen immediately after Phase 1
3. **Phases 3-6** (Color refactoring) — can be done in any order; no dependencies between files. Recommend doing them in order of visibility:
   - Phase 3 (layout shell) first — fixes the overall frame
   - Phase 5.1 (DashboardSidebar) — the sidebar is always visible
   - Phase 5.5 (MobileNav) — mobile sidebar
   - Phase 4 (pages) — individual page content
   - Phase 5 (remaining components) — shared components
   - Phase 6 (course player) — the most complex page
4. **Phase 7** — verification only, likely no changes
5. **Phase 8** — verification only

## Risks and Edge Cases

1. **Translucent overlays:** Classes like `bg-white/5` work in dark mode but will be invisible in light mode. These need to become `bg-foreground/5` or `bg-accent` depending on context.

2. **Video player container:** The `bg-black` behind the YouTube iframe at `CoursePlayer.tsx:63` should stay black — this is a media container, not UI chrome.

3. **Skeleton loaders:** The bookmarks and loading pages use `bg-zinc-800`/`bg-zinc-900` for skeleton placeholders. These should become `bg-muted`.

4. **Button contrast:** Some buttons use explicit `bg-white text-black` for CTA styling (ProfileClient, CreateCourseClient). These should become `bg-primary text-primary-foreground` to work in both themes.

5. **Landing page flash:** If there's a brief flash of light background on the landing page before it mounts, a nested `<ThemeProvider forcedTheme="dark">` wrapper on the landing route will fix it.

6. **Persistent theme preference:** next-themes stores the preference in localStorage by default. This already works out of the box.
