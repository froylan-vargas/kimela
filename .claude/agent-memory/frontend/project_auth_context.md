---
name: Auth implementation context
description: Auth is not yet implemented on frontend or backend. Backend uses a mock CurrentUser decorator returning a hardcoded userId. Auth module needs to be built from scratch on both sides.
type: project
---

Auth module is fully implemented on the frontend (as of 2026-04-07). Backend still uses a hardcoded mock user decorator.

Frontend auth includes: `AuthContext`, `apiClient` with `authApi`, `useAuth`/`useRequireAuth`/`useRequireRole` hooks, `RoleGuard` component, login/forgot-password/confirm-email/reset-password pages. Tests exist for all of these (73 tests passing).

**Why:** KIM-8 branch is the feature branch where auth is being implemented.

**How to apply:** Auth frontend is production-ready. Backend needs to implement the actual JWT + httpOnly cookie endpoints before the feature is complete end-to-end.
