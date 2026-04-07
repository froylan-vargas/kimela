---
name: Frontend auth implementation
description: Auth system fully implemented on frontend; route groups restructured; middleware added
type: project
---

Frontend auth system implemented on branch `feature/KIM-8`.

Key decisions and structure:
- `src/types/auth.ts` — `AuthUser` and `AuthRole` types
- `src/lib/apiClient.ts` — `apiFetch` with `credentials: 'include'`, `ApiError` class, 401 auto-refresh + redirect, `authApi` object
- `src/context/AuthContext.tsx` — `AuthProvider` and `AuthContextValue` (exported), calls `GET /auth/me` on mount
- `src/hooks/useAuth.ts` — `useAuth`, `useRequireAuth`, `useRequireRole`
- `src/middleware.ts` — edge middleware protects all routes except login/register
- `src/components/auth/RoleGuard.tsx` — role-based render guard component
- Route groups: `(auth)/login`, `(auth)/register` (no Header); `(app)/` (protected, has Header)
- Root `layout.tsx` no longer renders Header — `(app)/layout.tsx` does
- `providers.tsx` wraps with `AuthProvider` inside `QueryClientProvider`
- `Header.tsx` and `UserProfile.tsx` use real user from `useAuth()`, derive initials from name, have logout button
- All fetch calls go through `apiFetch` (useKimelas updated)

Email verification + password recovery also implemented:
- `(auth)/confirm-email` — auto-confirms token from `?token=` on mount; shows resend button if authenticated
- `(auth)/forgot-password` — always shows generic success message to avoid email enumeration
- `(auth)/reset-password` — validates password complexity (uppercase, lowercase, digit, special char), redirects to `/login` after 2s
- `(app)/layout.tsx` — shows verification banner when `user.emailVerifiedAt === null`
- `AuthUser` now includes `emailVerifiedAt: string | null`
- `authApi` extended with `confirmEmail`, `resendVerification`, `forgotPassword`, `resetPassword`
- Middleware now also excludes `confirm-email`, `forgot-password`, `reset-password`

SCSS path quirk: SCSS files inside `src/app/(app)/` must use `../../styles/variables` (2 levels up), NOT 3 levels — the `(app)` route group is treated as transparent by the SCSS resolver. Files inside `(auth)/login/` etc. correctly use `../../../styles/variables` (3 levels up).

**Why:** KIM-8 auth feature. Backend JWT RS256 + httpOnly cookies.

**How to apply:** When adding new API calls, use `apiFetch` from `@/lib/apiClient`. Pages under `(app)/` are auto-protected. Pages under `(auth)/` skip the header and are excluded from middleware.
