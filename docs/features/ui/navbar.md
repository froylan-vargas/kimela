# Navbar / Header — Implementation Plan

## 1. Overview

Build a sticky, frosted-glass header for the Kimela dashboard. The header has three zones:

- **Left** — logo (trophy icon that in future will be the kimela logo, the logo will include the app name so don't use text)
- **Center** — a pill-shaped kimela selector button that opens a dropdown listing the user's kimelas in two sections: "Participando" (subscriber) and "Creadas" (creator)
- **Right** — bell icon + user avatar with initials

Selecting a kimela updates a React Context that is consumed by the page's main content area, which renders only the kimela name and description for now.

The dropdown data comes from the real API (`GET /kimelas`) fetched with a custom `useKimelas` hook backed by TanStack Query. No mock data.

---

## 2. Component Tree

```
src/
  app/
    layout.tsx                    ← wrap children in <KimelaProvider>
    page.tsx                      ← consume KimelaContext, render name + description
  components/
    Header/
      Header.tsx                  ← <header> root, composes Logo + KimelaSelector + UserProfile
      Header.module.scss
      Logo.tsx                    ← trophy icon + "Kimela" text
      Logo.module.scss
      KimelaSelector/
        KimelaSelector.tsx        ← pill button + renders <KimelaDropdown> when open
        KimelaSelector.module.scss
        KimelaDropdown.tsx        ← positioned dropdown with two sections + divider
        KimelaDropdown.module.scss
      UserProfile.tsx             ← bell icon + avatar
      UserProfile.module.scss
  context/
    KimelaContext.tsx             ← context + provider + useKimelaContext hook
  hooks/
    useKimelas.ts                 ← TanStack Query fetch hook
  types/
    kimela.ts                     ← shared TypeScript interfaces
```

### Props interfaces

```ts
// src/types/kimela.ts

export type KimelaRole = "CREATOR" | "SUBSCRIBER";
export type KimelaStatus = "ACTIVE" | "INACTIVE" | string;

export interface Kimela {
  id: string;
  name: string;
  description: string;
  sport: string;
  status: KimelaStatus;
  role: KimelaRole;
  creatorId: string;
}

export interface KimelasMeta {
  total: number;
  page: number;
  limit: number;
}

export interface KimelasResponse {
  data: Kimela[];
  meta: KimelasMeta;
}
```

```ts
// Header.tsx
interface HeaderProps {} // no props — reads everything from context/hooks internally

// Logo.tsx
interface LogoProps {} // no props

// KimelaSelector.tsx
interface KimelaSelectorProps {} // no props — reads from KimelaContext + useKimelas

// KimelaDropdown.tsx
interface KimelaDropdownProps {
  subscriberKimelas: Kimela[];
  creatorKimelas: Kimela[];
  selectedId: string | null;
  onSelect: (kimela: Kimela) => void;
  onClose: () => void;
}

// UserProfile.tsx
interface UserProfileProps {
  initials: string; // e.g. "FV" — hardcoded for now, future: from auth context
}
```

---

## 3. SCSS / Styling Changes

### 3a. Update `src/styles/_variables.scss`

Replace the current placeholder variables and add the full design token set:

```scss
// ─── Brand colors ────────────────────────────────────────────────────────────
$color-primary: #ffd100;
$color-primary-hover: #e6bc00;
$color-primary-light: #fff9e5;

// ─── Surface / background ────────────────────────────────────────────────────
$color-bg: #fafafb;
$color-surface: rgba(255, 255, 255, 0.75);
$color-navbar-bg: rgba(255, 255, 255, 0.85);

// ─── Text ────────────────────────────────────────────────────────────────────
$color-text-main: #1a1a1a;
$color-text-secondary: #71717a;

// ─── Borders ─────────────────────────────────────────────────────────────────
$color-border: rgba(228, 228, 231, 0.8);

// ─── Border radius ───────────────────────────────────────────────────────────
$radius-lg: 24px;
$radius-md: 16px;
$radius-sm: 8px;
$radius-pill: 100px;

// ─── Spacing (keep existing names, update values to match design) ─────────────
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 32px;
$spacing-xl: 64px;

// ─── Typography ──────────────────────────────────────────────────────────────
$font-family-base: "Outfit", sans-serif;
$font-size-base: 16px;

// ─── Z-index ─────────────────────────────────────────────────────────────────
$z-navbar: 10;
$z-dropdown: 20;
```

### 3b. Update `src/styles/globals.scss`

Add the Google Fonts import (via `@import` or via `<link>` in `layout.tsx` — see section 8). Also update body defaults to use the new tokens:

```scss
@use "variables" as *;

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: $font-size-base;
  font-family: $font-family-base;
}

body {
  background-color: $color-bg;
  color: $color-text-main;
  line-height: 1.5;
  min-height: 100vh;
  overflow-x: hidden;
}
```

### 3c. New CSS Module files

| File                                                              | Purpose                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------- |
| `src/components/Header/Header.module.scss`                        | Sticky navbar shell, backdrop-filter, border-bottom  |
| `src/components/Header/Logo.module.scss`                          | Logo flex row, icon yellow color, mobile hide text   |
| `src/components/Header/KimelaSelector/KimelaSelector.module.scss` | Pill button, hover state with yellow border and glow |
| `src/components/Header/KimelaSelector/KimelaDropdown.module.scss` | Dropdown panel, section titles, divider, item hover  |
| `src/components/Header/UserProfile.module.scss`                   | Bell icon size/color, avatar circle                  |

Key CSS rules to implement:

**Header.module.scss**

```scss
.navbar {
  background: $color-navbar-bg;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid $color-border;
  padding: $spacing-md 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: $z-navbar;
}
```

**KimelaSelector.module.scss — pill trigger button**

```scss
.selectorPill {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.6);
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-pill;
  border: 1px solid $color-border;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: $color-primary;
    background: #fff;
    box-shadow: 0 4px 12px rgba(255, 209, 0, 0.15);
  }
}

.selectorLabel {
  font-size: 12px;
  color: $color-text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.selectorValue {
  font-weight: 600;
  font-size: $font-size-base;
}
```

**KimelaDropdown.module.scss**

```scss
.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 280px;
  background: #fff;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  z-index: $z-dropdown;
  overflow: hidden;
}

.sectionTitle {
  padding: 10px $spacing-md 6px;
  font-size: 11px;
  font-weight: 700;
  color: $color-text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.divider {
  height: 1px;
  background: $color-border;
  margin: $spacing-sm 0;
}

.item {
  display: block;
  width: 100%;
  padding: 10px $spacing-md;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-family: $font-family-base;
  font-size: 15px;
  font-weight: 500;
  color: $color-text-main;
  transition: background 0.15s ease;

  &:hover {
    background: $color-primary-light;
  }

  &.selected {
    font-weight: 700;
    color: $color-text-main;
    background: $color-primary-light;
  }
}
```

**UserProfile.module.scss**

```scss
.userProfile {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.bellIcon {
  font-size: 24px;
  color: $color-text-secondary;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: $color-text-main;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

---

## 4. Data Fetching

### Install TanStack Query

```bash
pnpm --filter @kimela/web add @tanstack/react-query
```

### `src/hooks/useKimelas.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import type { KimelasResponse } from "@/types/kimela";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchKimelas(): Promise<KimelasResponse> {
  const res = await fetch(`${API_URL}/kimelas`);
  if (!res.ok) throw new Error(`Failed to fetch kimelas: ${res.status}`);
  return res.json();
}

export function useKimelas() {
  return useQuery<KimelasResponse, Error>({
    queryKey: ["kimelas"],
    queryFn: fetchKimelas,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Return shape (from useQuery):
// {
//   data: KimelasResponse | undefined
//   isLoading: boolean
//   isError: boolean
//   error: Error | null
// }
```

### Where the fetch is called

`useKimelas` is called inside `KimelaSelector.tsx`. That component reads `data.data`, splits by role, and passes both arrays down to `KimelaDropdown`. The hook result also drives loading and error UI inside the selector pill (e.g. "Loading..." text while fetching, a subtle error state if the request fails).

The fetch must NOT be called in `page.tsx` or `layout.tsx`. Data ownership lives in the selector — the selected kimela object is lifted into context from there.

---

## 5. State — KimelaContext

### `src/context/KimelaContext.tsx`

```ts
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Kimela } from '@/types/kimela';

interface KimelaContextValue {
  selectedKimela: Kimela | null;
  setSelectedKimela: (kimela: Kimela) => void;
}

const KimelaContext = createContext<KimelaContextValue | null>(null);

export function KimelaProvider({
  children,
  initialKimela,
}: {
  children: ReactNode;
  initialKimela?: Kimela | null;
}) {
  const [selectedKimela, setSelectedKimela] = useState<Kimela | null>(
    initialKimela ?? null,
  );

  return (
    <KimelaContext.Provider value={{ selectedKimela, setSelectedKimela }}>
      {children}
    </KimelaContext.Provider>
  );
}

export function useKimelaContext(): KimelaContextValue {
  const ctx = useContext(KimelaContext);
  if (!ctx) throw new Error('useKimelaContext must be used inside KimelaProvider');
  return ctx;
}
```

### Default selection logic

`KimelaSelector` calls `useKimelas()`. Once data loads, it derives:

```ts
const subscriberKimelas = data.data.filter((k) => k.role === "SUBSCRIBER");
const creatorKimelas = data.data.filter((k) => k.role === "CREATOR");
const defaultKimela = subscriberKimelas.at(-1) ?? null; // last SUBSCRIBER item
```

A `useEffect` inside `KimelaSelector` sets the default once:

```ts
useEffect(() => {
  if (!selectedKimela && defaultKimela) {
    setSelectedKimela(defaultKimela);
  }
}, [defaultKimela]); // run only when data first arrives
```

`KimelaProvider` wraps the whole app in `layout.tsx` with no `initialKimela` (starts as `null`). The selector hydrates it after the first fetch.

---

## 6. Dropdown Behavior

### Open / close toggle

`KimelaSelector` owns an `isOpen: boolean` local state (via `useState`). The pill button toggles it on click.

### Click-outside to close

Attach a `mousedown` listener on `document` using a `useEffect`. Compare the event target against a `ref` attached to the selector's wrapper `<div>`. If the click is outside, set `isOpen` to `false`. Clean up the listener in the effect's return function.

```ts
const wrapperRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  function handleOutside(e: MouseEvent) {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }
  if (isOpen) document.addEventListener("mousedown", handleOutside);
  return () => document.removeEventListener("mousedown", handleOutside);
}, [isOpen]);
```

### Keyboard: Escape closes

Inside the same (or a separate) `useEffect`, listen for `keydown` on `document` and close if `e.key === 'Escape'`.

### Selecting a kimela

`KimelaDropdown` receives an `onSelect: (kimela: Kimela) => void` prop. On item click:

1. Call `setSelectedKimela(kimela)` (from context).
2. Call `onClose()` (from the dropdown prop) to set `isOpen = false` in the parent.

The pill button shows:

- "Loading..." (`isLoading === true`)
- The selected kimela's `name` once available
- "Select a kimela" if data is loaded but nothing is selected yet

---

## 7. Main Content — `page.tsx`

`page.tsx` becomes a Client Component (`'use client'`) so it can read from context:

```tsx
"use client";

import { useKimelaContext } from "@/context/KimelaContext";
import styles from "./page.module.scss";

export default function Home() {
  const { selectedKimela } = useKimelaContext();

  return (
    <main className={styles.dashboard}>
      {selectedKimela ? (
        <section className={styles.headerSection}>
          <h1>{selectedKimela.name}</h1>
          <p>{selectedKimela.description}</p>
        </section>
      ) : (
        <p className={styles.empty}>Select a kimela to get started.</p>
      )}
    </main>
  );
}
```

A new `src/app/page.module.scss` provides spacing that mirrors the mockup's `.dashboard` and `.header-section` rules:

```scss
.dashboard {
  padding: $spacing-lg 40px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.headerSection {
  margin-bottom: $spacing-sm;

  h1 {
    font-size: 32px;
    font-weight: 600;
    letter-spacing: -0.5px;
    margin-bottom: $spacing-sm;
  }

  p {
    color: $color-text-secondary;
    font-size: $font-size-base;
  }
}

.empty {
  color: $color-text-secondary;
  font-size: $font-size-base;
}
```

---

## 8. Implementation Order

Work through files in this order to keep the build green at each step:

1. **`apps/web/src/types/kimela.ts`** — create; defines `Kimela`, `KimelaRole`, `KimelasResponse`, `KimelasMeta`. No dependencies.

2. **`apps/web/src/styles/_variables.scss`** — replace current content with the full token set from section 3a.

3. **`apps/web/src/styles/globals.scss`** — update body defaults to use new token variable names; add `overflow-x: hidden` and `min-height: 100vh` to body.

4. **`apps/web/src/app/layout.tsx`** — add `<link>` tags for Outfit font from Google Fonts and the Phosphor Icons CDN script in `<head>`. Wrap `{children}` with `<QueryClientProvider>` (TanStack Query) and `<KimelaProvider>`. Mark the layout with `'use client'` only if needed — prefer keeping it a Server Component by moving providers into a separate `src/components/Providers.tsx` Client Component.

5. **`apps/web/src/context/KimelaContext.tsx`** — create context, provider, and `useKimelaContext` hook (section 5).

6. **`apps/web/src/hooks/useKimelas.ts`** — create the TanStack Query hook (section 4). No UI dependency.

7. **`apps/web/src/components/Header/Logo.tsx` + `Logo.module.scss`** — static component, no data, easiest to build and test in isolation.

8. **`apps/web/src/components/Header/UserProfile.tsx` + `UserProfile.module.scss`** — static for now, hardcode initials `"FV"`.

9. **`apps/web/src/components/Header/KimelaSelector/KimelaDropdown.tsx` + `KimelaDropdown.module.scss`** — pure presentational; receives all data via props. Build and verify the two-section layout with static data before wiring it up.

10. **`apps/web/src/components/Header/KimelaSelector/KimelaSelector.tsx` + `KimelaSelector.module.scss`** — wire `useKimelas`, `useKimelaContext`, open/close state, click-outside, Escape key, and default-selection `useEffect`.

11. **`apps/web/src/components/Header/Header.tsx` + `Header.module.scss`** — compose Logo + KimelaSelector + UserProfile inside the sticky `<header>` element.

12. **`apps/web/src/app/layout.tsx`** (update) — import and render `<Header />` above `{children}`.

13. **`apps/web/src/app/page.tsx` + `page.module.scss`** — convert to Client Component, consume `useKimelaContext`, render kimela name and description.

14. **Tests** — write tests after each component is stable (see below).

### Test files to create

| Test file                                                      | What to cover                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/Header/KimelaSelector/KimelaDropdown.test.tsx` | Renders subscriber section, creator section, divider; calls `onSelect` and `onClose` on item click; highlights selected item                                 |
| `src/components/Header/KimelaSelector/KimelaSelector.test.tsx` | Opens dropdown on pill click; closes on Escape; closes on outside click; sets default to last SUBSCRIBER kimela via mocked `useKimelas`; shows loading state |
| `src/hooks/useKimelas.test.ts`                                 | Calls correct URL; returns parsed data; throws on non-OK response                                                                                            |
| `src/app/page.test.tsx`                                        | Shows kimela name and description when context has a selected kimela; shows fallback when context is empty                                                   |

Test setup: wrap each render in a `QueryClientProvider` with a fresh `QueryClient` and `KimelaProvider`. Use `vi.fn()` to mock `fetch` in hook tests.

---

## 9. Out of Scope

The following items from the mockup are explicitly NOT part of this task:

- **Leaderboard card** — the ranking list, player avatars, and points display
- **Matches card** — upcoming matches, score prediction inputs, and the "Save predictions" button
- **Background decoration shapes** — the blurred gradient blobs behind the content
- **Authentication** — login, session management, real user initials from a session, auth-gated routes
- **Bell notifications** — the notification panel or badge count on the bell icon
- **Pagination / filtering of kimelas** — the `meta` object from `GET /kimelas` is fetched but not used to paginate
- **Creating a new kimela** — no UI flow for kimela creation
- **Kimela detail page** — clicking a kimela only updates context; no navigation to a dedicated route
- **Error boundary** — global error UI for failed fetches beyond a local error state in the selector
