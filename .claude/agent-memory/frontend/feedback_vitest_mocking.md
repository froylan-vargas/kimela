---
name: Vitest mocking patterns for Next.js
description: Key gotchas when mocking next/navigation and context in Vitest tests for this project
type: feedback
---

Several patterns that work reliably in this codebase:

**1. Never reference outer `vi.fn()` variables inside `vi.mock()` factory** — Vitest hoists `vi.mock()` to the top, so variables declared with `const`/`let` aren't initialized yet. Use `vi.fn()` inline inside the factory, then import the mock and configure it in `beforeEach`.

**2. `useSearchParams` from `next/navigation` can't be `vi.mocked(...).mockReturnValue()`** — because the mock factory returns a plain function, not a `vi.fn()`. Instead, declare a module-level `mockGetSearchParam = vi.fn()` and have the factory call `useSearchParams: () => ({ get: mockGetSearchParam })`. Then call `mockGetSearchParam.mockReturnValue(...)` per test.

**3. Fake timers with async resolution** — `vi.useFakeTimers({ shouldAdvanceTime: true })` from the start of the test allows `findByText` (which uses MutationObserver) to still work while giving control over `setTimeout`. Plain `vi.useFakeTimers()` breaks `waitFor` / `findBy*` polling. Switching to fake timers *after* async resolution also doesn't work since the `setTimeout` was already registered with real timers.

**Why:** Learned through test failures on the auth test suite (KIM-8).

**How to apply:** Apply these patterns in any new test file that mocks `next/navigation` or needs fake timer control alongside async state changes.
