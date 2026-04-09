# Navbar / Header — Implementation Plan

## 1. Overview

Build a sticky, frosted-glass header for the Qimela dashboard. The header has three zones:

- **Left** — logo (trophy icon that in future will be the qimela logo, the logo will include the app name so don't use text)
- **Center** — a pill-shaped qimela selector button that opens a dropdown listing the user's qimelas in two sections: "Participando" (subscriber) and "Creadas" (creator)
- **Right** — bell icon + user avatar with initials

Selecting a qimela updates a React Context that is consumed by the page's main content area, which renders only the qimela name and description for now.

The dropdown data comes from the real API (`GET /qimelas`) fetched with a custom `useQimelas` hook backed by TanStack Query. No mock data.

---

## 2. Component Tree

```
src/
  app/
    layout.tsx                    ← wrap children in <QimelaProvider>
    page.tsx                      ← consume QimelaContext, render name + description
  components/
    Header/
      Header.tsx                  ← <header> root, composes Logo + QimelaSelector + UserProfile
      Header.module.scss
      Logo.tsx                    ← trophy icon + "Qimela" text
      Logo.module.scss
      QimelaSelector/
        QimelaSelector.tsx        ← pill button + renders <QimelaDropdown> when open
        QimelaSelector.module.scss
        QimelaDropdown.tsx        ← positioned dropdown with two sections + divider
        QimelaDropdown.module.scss
      UserProfile.tsx             ← bell icon + avatar
      UserProfile.module.scss
  context/
    QimelaContext.tsx             ← context + provider + useQimelaContext hook
  hooks/
    useQimelas.ts                 ← TanStack Query fetch hook
  types/
    qimela.ts                     ← shared TypeScript interfaces
```

### Props interfaces

```ts
// src/types/qimela.ts

export type QimelaRole = "CREATOR" | "SUBSCRIBER";
export type QimelaStatus = "ACTIVE" | "INACTIVE" | string;

export interface Qimela {
  id: string;
  name: string;
  description: string;
  sport: string;
  status: QimelaStatus;
  role: QimelaRole;
  creatorId: string;
}

export interface QimelasMeta {
  total: number;
  page: number;
  limit: number;
}

export interface QimelasResponse {
  data: Qimela[];
  meta: QimelasMeta;
}
```

```ts
// Header.tsx
interface HeaderProps {} // no props — reads everything from context/hooks internally

// Logo.tsx
interface LogoProps {} // no props

// QimelaSelector.tsx
interface QimelaSelectorProps {} // no props — reads from QimelaContext + useQimelas

// QimelaDropdown.tsx
interface QimelaDropdownProps {
  subscriberQimelas: Qimela[];
  creatorQimelas: Qimela[];
  selectedId: string | null;
  onSelect: (qimela: Qimela) => void;
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
| `src/components/Header/QimelaSelector/QimelaSelector.module.scss` | Pill button, hover state with yellow border and glow |
| `src/components/Header/QimelaSelector/QimelaDropdown.module.scss` | Dropdown panel, section titles, divider, item hover  |
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

**QimelaSelector.module.scss — pill trigger button**

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

**QimelaDropdown.module.scss**

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
pnpm --filter @qimela/web add @tanstack/react-query
```

### `src/hooks/useQimelas.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import type { QimelasResponse } from "@/types/qimela";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchQimelas(): Promise<QimelasResponse> {
  const res = await fetch(`${API_URL}/qimelas`);
  if (!res.ok) throw new Error(`Failed to fetch qimelas: ${res.status}`);
  return res.json();
}

export function useQimelas() {
  return useQuery<QimelasResponse, Error>({
    queryKey: ["qimelas"],
    queryFn: fetchQimelas,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Return shape (from useQuery):
// {
//   data: QimelasResponse | undefined
//   isLoading: boolean
//   isError: boolean
//   error: Error | null
// }
```

### Where the fetch is called

`useQimelas` is called inside `QimelaSelector.tsx`. That component reads `data.data`, splits by role, and passes both arrays down to `QimelaDropdown`. The hook result also drives loading and error UI inside the selector pill (e.g. "Loading..." text while fetching, a subtle error state if the request fails).

The fetch must NOT be called in `page.tsx` or `layout.tsx`. Data ownership lives in the selector — the selected qimela object is lifted into context from there.

---

## 5. State — QimelaContext

### `src/context/QimelaContext.tsx`

```ts
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Qimela } from '@/types/qimela';

interface QimelaContextValue {
  selectedQimela: Qimela | null;
  setSelectedQimela: (qimela: Qimela) => void;
}

const QimelaContext = createContext<QimelaContextValue | null>(null);

export function QimelaProvider({
  children,
  initialQimela,
}: {
  children: ReactNode;
  initialQimela?: Qimela | null;
}) {
  const [selectedQimela, setSelectedQimela] = useState<Qimela | null>(
    initialQimela ?? null,
  );

  return (
    <QimelaContext.Provider value={{ selectedQimela, setSelectedQimela }}>
      {children}
    </QimelaContext.Provider>
  );
}

export function useQimelaContext(): QimelaContextValue {
  const ctx = useContext(QimelaContext);
  if (!ctx) throw new Error('useQimelaContext must be used inside QimelaProvider');
  return ctx;
}
```

### Default selection logic

`QimelaSelector` calls `useQimelas()`. Once data loads, it derives:

```ts
const subscriberQimelas = data.data.filter((k) => k.role === "SUBSCRIBER");
const creatorQimelas = data.data.filter((k) => k.role === "CREATOR");
const defaultQimela = subscriberQimelas.at(-1) ?? null; // last SUBSCRIBER item
```

A `useEffect` inside `QimelaSelector` sets the default once:

```ts
useEffect(() => {
  if (!selectedQimela && defaultQimela) {
    setSelectedQimela(defaultQimela);
  }
}, [defaultQimela]); // run only when data first arrives
```

`QimelaProvider` wraps the whole app in `layout.tsx` with no `initialQimela` (starts as `null`). The selector hydrates it after the first fetch.

---

## 6. Dropdown Behavior

### Open / close toggle

`QimelaSelector` owns an `isOpen: boolean` local state (via `useState`). The pill button toggles it on click.

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

### Selecting a qimela

`QimelaDropdown` receives an `onSelect: (qimela: Qimela) => void` prop. On item click:

1. Call `setSelectedQimela(qimela)` (from context).
2. Call `onClose()` (from the dropdown prop) to set `isOpen = false` in the parent.

The pill button shows:

- "Loading..." (`isLoading === true`)
- The selected qimela's `name` once available
- "Select a qimela" if data is loaded but nothing is selected yet

---

## 7. Main Content — `page.tsx`

`page.tsx` becomes a Client Component (`'use client'`) so it can read from context:

```tsx
"use client";

import { useQimelaContext } from "@/context/QimelaContext";
import styles from "./page.module.scss";

export default function Home() {
  const { selectedQimela } = useQimelaContext();

  return (
    <main className={styles.dashboard}>
      {selectedQimela ? (
        <section className={styles.headerSection}>
          <h1>{selectedQimela.name}</h1>
          <p>{selectedQimela.description}</p>
        </section>
      ) : (
        <p className={styles.empty}>Select a qimela to get started.</p>
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

1. **`apps/web/src/types/qimela.ts`** — create; defines `Qimela`, `QimelaRole`, `QimelasResponse`, `QimelasMeta`. No dependencies.

2. **`apps/web/src/styles/_variables.scss`** — replace current content with the full token set from section 3a.

3. **`apps/web/src/styles/globals.scss`** — update body defaults to use new token variable names; add `overflow-x: hidden` and `min-height: 100vh` to body.

4. **`apps/web/src/app/layout.tsx`** — add `<link>` tags for Outfit font from Google Fonts and the Phosphor Icons CDN script in `<head>`. Wrap `{children}` with `<QueryClientProvider>` (TanStack Query) and `<QimelaProvider>`. Mark the layout with `'use client'` only if needed — prefer keeping it a Server Component by moving providers into a separate `src/components/Providers.tsx` Client Component.

5. **`apps/web/src/context/QimelaContext.tsx`** — create context, provider, and `useQimelaContext` hook (section 5).

6. **`apps/web/src/hooks/useQimelas.ts`** — create the TanStack Query hook (section 4). No UI dependency.

7. **`apps/web/src/components/Header/Logo.tsx` + `Logo.module.scss`** — static component, no data, easiest to build and test in isolation.

8. **`apps/web/src/components/Header/UserProfile.tsx` + `UserProfile.module.scss`** — static for now, hardcode initials `"FV"`.

9. **`apps/web/src/components/Header/QimelaSelector/QimelaDropdown.tsx` + `QimelaDropdown.module.scss`** — pure presentational; receives all data via props. Build and verify the two-section layout with static data before wiring it up.

10. **`apps/web/src/components/Header/QimelaSelector/QimelaSelector.tsx` + `QimelaSelector.module.scss`** — wire `useQimelas`, `useQimelaContext`, open/close state, click-outside, Escape key, and default-selection `useEffect`.

11. **`apps/web/src/components/Header/Header.tsx` + `Header.module.scss`** — compose Logo + QimelaSelector + UserProfile inside the sticky `<header>` element.

12. **`apps/web/src/app/layout.tsx`** (update) — import and render `<Header />` above `{children}`.

13. **`apps/web/src/app/page.tsx` + `page.module.scss`** — convert to Client Component, consume `useQimelaContext`, render qimela name and description.

14. **Tests** — write tests after each component is stable (see below).

### Test files to create

| Test file                                                      | What to cover                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/Header/QimelaSelector/QimelaDropdown.test.tsx` | Renders subscriber section, creator section, divider; calls `onSelect` and `onClose` on item click; highlights selected item                                 |
| `src/components/Header/QimelaSelector/QimelaSelector.test.tsx` | Opens dropdown on pill click; closes on Escape; closes on outside click; sets default to last SUBSCRIBER qimela via mocked `useQimelas`; shows loading state |
| `src/hooks/useQimelas.test.ts`                                 | Calls correct URL; returns parsed data; throws on non-OK response                                                                                            |
| `src/app/page.test.tsx`                                        | Shows qimela name and description when context has a selected qimela; shows fallback when context is empty                                                   |

Test setup: wrap each render in a `QueryClientProvider` with a fresh `QueryClient` and `QimelaProvider`. Use `vi.fn()` to mock `fetch` in hook tests.

---

## 9. Out of Scope

The following items from the mockup are explicitly NOT part of this task:

- **Leaderboard card** — the ranking list, player avatars, and points display
- **Matches card** — upcoming matches, score prediction inputs, and the "Save predictions" button
- **Background decoration shapes** — the blurred gradient blobs behind the content
- **Authentication** — login, session management, real user initials from a session, auth-gated routes
- **Bell notifications** — the notification panel or badge count on the bell icon
- **Pagination / filtering of qimelas** — the `meta` object from `GET /qimelas` is fetched but not used to paginate
- **Creating a new qimela** — no UI flow for qimela creation
- **Qimela detail page** — clicking a qimela only updates context; no navigation to a dedicated route
- **Error boundary** — global error UI for failed fetches beyond a local error state in the selector
