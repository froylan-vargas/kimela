# Authentication Implementation Plan — Kimela

## Overview

Kimela currently has zero authentication. The `CurrentUser` decorator returns a hardcoded UUID and the `User` Prisma model has no credentials or role fields. This plan covers the full implementation across architecture, backend, and frontend.

**Two principal types:**

- **Participant/Creator (USER):** Self-registered. Can create kimelas and subscribe to them. The creator/participant distinction is kimela-scoped (via `Kimela.creatorId` and `Subscription`), not a system role.
- **Admin:** Platform operator. Creates leagues, updates event results, defines sport rules, manages all kimelas. Provisioned manually — never self-registered.

---

## 1. Architecture

### Authentication Strategy

**JWT (RS256) with httpOnly cookie transport and rotating refresh tokens.**

| Token         | Lifetime   | Cookie name     | Scope                |
| ------------- | ---------- | --------------- | -------------------- |
| Access token  | 15 minutes | `access_token`  | `Path=/`             |
| Refresh token | 7 days     | `refresh_token` | `Path=/auth/refresh` |

Rationale: Stateless access tokens avoid a shared session store. RS256 allows future services to verify tokens with only the public key. Refresh token rotation limits blast radius of theft.

### Authorization Model (RBAC)

```
UserRole: USER | ADMIN
```

Permission matrix:

| Action               | USER | ADMIN            |
| -------------------- | ---- | ---------------- |
| Register / Login     | Yes  | No (provisioned) |
| Create kimela        | Yes  | Yes              |
| Subscribe to kimela  | Yes  | No               |
| View own kimelas     | Yes  | Yes (all)        |
| Create league        | No   | Yes              |
| Update event results | No   | Yes              |
| Define sport rules   | No   | Yes              |
| Manage any kimela    | No   | Yes              |

### Token Storage Decision

|                   | httpOnly Cookie             | localStorage |
| ----------------- | --------------------------- | ------------ |
| XSS accessible    | No                          | Yes          |
| CSRF risk         | Yes (mitigated by SameSite) | No           |
| Server-controlled | Yes                         | No           |

**Decision: httpOnly cookies.** XSS is the more common attack vector. CSRF is fully mitigated by `SameSite=Strict`.

### Security

- **CSRF:** `SameSite=Strict` on all auth cookies. Cookie is never sent on cross-site requests.
- **Refresh token storage:** Store only SHA-256 hash in DB — raw token is never persisted.
- **Refresh token rotation:** Each use issues a new token and revokes the old. Reuse detection revokes the entire token family.
- **Brute force:** Rate limit `/auth/login` and `/auth/register` with `@nestjs/throttler` (5 attempts/minute).
- **Admin provisioning:** Registration endpoint always sets `role = USER`. Admins are created via a seed script.
- **CORS:** Must include `credentials: true` in `main.ts`.

---

## 2. Prisma Schema Changes

**File:** `apps/api/prisma/schema.prisma`

```prisma
enum UserRole {
  USER
  ADMIN
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  name         String
  role         UserRole  @default(USER)
  passwordHash String    @map("password_hash")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  kimelas       Kimela[]       @relation("KimelaCreator")
  subscriptions Subscription[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String    @id @default(uuid())
  tokenHash String    @unique @map("token_hash")
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  @@map("refresh_tokens")
}
```

Run migrations:

```bash
pnpm --filter @kimela/api db:migrate
# migration names: add_auth_fields_to_users, add_refresh_tokens
```

---

## 3. Backend Implementation

### 3a. New Dependencies

```bash
pnpm --filter @kimela/api add @nestjs/jwt @nestjs/passport @nestjs/throttler passport passport-local passport-jwt bcrypt cookie-parser
pnpm --filter @kimela/api add -D @types/passport-local @types/passport-jwt @types/bcrypt @types/cookie-parser
```

### 3b. File Structure

Follow the existing hexagonal pattern from `KimelaModule`:

```
apps/api/src/modules/
├── users/
│   ├── domain/
│   │   ├── user.entity.ts
│   │   ├── user-role.enum.ts
│   │   └── user.repository.ts
│   ├── application/
│   │   ├── dtos/user.dto.ts
│   │   └── mappers/user.mapper.ts
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── prisma-user.repository.ts
│   │   │   └── user-persistence.mapper.ts
│   │   └── users.infrastructure.module.ts
│   └── users.module.ts
└── auth/
    ├── domain/
    │   ├── errors/
    │   │   ├── invalid-credentials.error.ts
    │   │   └── email-already-exists.error.ts
    │   └── refresh-token.repository.ts
    ├── application/
    │   ├── dtos/
    │   │   ├── register.dto.ts
    │   │   ├── login.dto.ts
    │   │   └── auth-response.dto.ts
    │   └── use-cases/
    │       ├── register-user.use-case.ts
    │       ├── login-user.use-case.ts
    │       ├── refresh-token.use-case.ts
    │       └── logout-user.use-case.ts
    ├── infrastructure/
    │   ├── strategies/
    │   │   ├── local.strategy.ts
    │   │   └── jwt.strategy.ts
    │   ├── persistence/
    │   │   └── prisma-refresh-token.repository.ts
    │   └── auth.infrastructure.module.ts
    └── presentation/
        ├── decorators/
        │   ├── current-user.decorator.ts   # replaces mock in kimela/
        │   ├── roles.decorator.ts
        │   └── public.decorator.ts
        ├── guards/
        │   ├── jwt-auth.guard.ts
        │   ├── local-auth.guard.ts
        │   └── roles.guard.ts
        ├── auth.controller.ts
        └── auth.module.ts
```

> The mock `current-user.decorator.ts` in `kimela/presentation/decorators/` is removed. `KimelaController` updates its import to the real decorator.

### 3c. Domain Layer

**`users/domain/user-role.enum.ts`**

```ts
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}
```

**`users/domain/user.entity.ts`**

```ts
export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
```

**`users/domain/user.repository.ts`**

```ts
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(user: UserEntity): Promise<UserEntity>;
}
```

**`auth/domain/errors/`**

```ts
export class InvalidCredentialsError extends Error {}
export class EmailAlreadyExistsError extends Error {}
```

### 3d. DTOs

**`auth/application/dtos/register.dto.ts`**

```ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt limit
  password: string;
}
```

**`auth/application/dtos/login.dto.ts`**

```ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
```

**`auth/application/dtos/auth-response.dto.ts`**

```ts
export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
// Never expose passwordHash
```

### 3e. Use Cases

**`register-user.use-case.ts`**

```ts
// 1. findByEmail → throw EmailAlreadyExistsError if exists
// 2. bcrypt.hash(dto.password, 12)
// 3. new UserEntity({ ...dto, passwordHash, role: USER })
// 4. userRepository.create(entity)
// 5. sign tokens, set cookies, return AuthUserDto
```

**`login-user.use-case.ts`**

```ts
// 1. findByEmail → throw InvalidCredentialsError if not found
// 2. bcrypt.compare(password, user.passwordHash) → throw if false
// 3. sign tokens, set cookies, return AuthUserDto
```

**`refresh-token.use-case.ts`**

```ts
// 1. hash incoming refresh token
// 2. SELECT RefreshToken by hash
// 3. Check not revoked, not expired → throw if invalid
// 4. UPDATE: set revokedAt (invalidate old token)
// 5. INSERT new RefreshToken (rotation)
// 6. Sign new access JWT, issue new refresh cookie
```

**`logout-user.use-case.ts`**

```ts
// 1. hash incoming refresh token
// 2. UPDATE RefreshToken: set revokedAt = now()
// 3. Clear both cookies (Max-Age=0)
```

### 3f. Passport Strategies

**`jwt.strategy.ts`** — extracts token from cookie, not Authorization header:

```ts
super({
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req: Request) => req?.cookies?.access_token ?? null,
  ]),
  secretOrKey: process.env.JWT_PUBLIC_KEY,  // RS256 public key
  algorithms: ['RS256'],
});

async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
  return { id: payload.sub, email: payload.email, role: payload.role };
}
```

**`local.strategy.ts`** — used only for `POST /auth/login`:

```ts
super({ usernameField: 'email' });

async validate(email: string, password: string): Promise<UserEntity>
// delegates to LoginUseCase, throws UnauthorizedException on failure
```

### 3g. Guards and Decorators

**`jwt-auth.guard.ts`**

```ts
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

**`roles.guard.ts`**

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      "roles",
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;
    return requiredRoles.includes(
      context.switchToHttp().getRequest().user.role,
    );
  }
}
```

**`public.decorator.ts`** — opts out of global JwtAuthGuard:

```ts
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**`roles.decorator.ts`**

```ts
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

**`current-user.decorator.ts`**

```ts
export interface CurrentUserPayload {
  id: string;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext): CurrentUserPayload =>
    ctx.switchToHttp().getRequest().user,
);
```

### 3h. Auth Controller

**Endpoints:**

| Method | Path             | Guard                          | Description                         |
| ------ | ---------------- | ------------------------------ | ----------------------------------- |
| POST   | `/auth/register` | `@Public()`                    | Register new USER                   |
| POST   | `/auth/login`    | `@Public()` + `LocalAuthGuard` | Login, set cookies                  |
| POST   | `/auth/refresh`  | `@Public()`                    | Rotate tokens via refresh cookie    |
| POST   | `/auth/logout`   | `@Public()`                    | Revoke refresh token, clear cookies |
| GET    | `/auth/me`       | `JwtAuthGuard` (global)        | Return current user                 |

**Cookie settings for both tokens:**

```ts
res.cookie("access_token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // milliseconds
});
```

The `refresh_token` cookie uses `Path: '/auth/refresh'` and `maxAge: 7 * 24 * 60 * 60 * 1000`.

### 3i. Module Wiring

**`app.module.ts`** — register global guards:

```ts
@Module({
  imports: [PrismaModule, KimelaModule, UsersModule, AuthModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

**`main.ts`** — add cookie-parser and fix CORS:

```ts
import * as cookieParser from "cookie-parser";
app.use(cookieParser());
app.enableCors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
  credentials: true,
});
```

### 3j. Environment Variables

```env
JWT_PRIVATE_KEY=<RS256 private key>
JWT_PUBLIC_KEY=<RS256 public key>
JWT_REFRESH_SECRET=<min 32 chars>
```

---

## 4. Frontend Implementation

### 4a. What Already Exists

- `QueryClientProvider > KimelaProvider > children` — `AuthProvider` slots in between.
- `Header` hardcodes `UserProfile initials="FV"` — needs live auth state.
- API calls use plain `fetch` with no `credentials` option.
- No `middleware.ts`, no auth pages, no auth context exist.

### 4b. New Dependencies

None required. Auth state uses the existing TanStack Query + React Context pattern.

### 4c. File Structure

```
apps/web/src/
├── middleware.ts                          # NEW — Edge route guard
├── types/
│   └── auth.ts                            # NEW — AuthUser, AuthRole
├── lib/
│   └── apiClient.ts                       # NEW — fetch wrapper + authApi
├── context/
│   ├── KimelaContext.tsx                  # existing (unchanged)
│   └── AuthContext.tsx                    # NEW — AuthProvider + context
├── hooks/
│   ├── useKimelas.ts                      # existing (update to add credentials)
│   └── useAuth.ts                         # NEW — useAuth, useRequireAuth, useRequireRole
├── components/
│   ├── auth/
│   │   ├── RoleGuard.tsx                  # NEW
│   │   └── RoleGuard.test.tsx             # NEW
│   └── Header/
│       ├── Header.tsx                     # MODIFY — consume useAuth
│       └── UserProfile.tsx                # MODIFY — dynamic initials + logout button
└── app/
    ├── layout.tsx                         # MODIFY — move <Header> to (app) layout
    ├── providers.tsx                      # MODIFY — add AuthProvider
    ├── (auth)/                            # NEW — no header, no protection
    │   ├── layout.tsx
    │   ├── login/
    │   │   ├── page.tsx
    │   │   └── page.module.scss
    │   └── register/
    │       ├── page.tsx
    │       └── page.module.scss
    └── (app)/                             # NEW — protected, has header
        ├── layout.tsx
        └── page.tsx                       # MOVE existing page.tsx here
```

### 4d. Auth Types

**`types/auth.ts`**

```ts
export type AuthRole = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
}
```

### 4e. API Client

**`lib/apiClient.ts`** — every call includes `credentials: 'include'`:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T>
// throws ApiError on non-2xx

export const authApi = {
  me():             Promise<AuthUser>  // GET  /auth/me
  login(body):      Promise<AuthUser>  // POST /auth/login   { email, password }
  register(body):   Promise<AuthUser>  // POST /auth/register { name, email, password }
  logout():         Promise<void>      // POST /auth/logout
  refresh():        Promise<void>      // POST /auth/refresh
}
```

The browser automatically sends and receives httpOnly cookies. JavaScript never reads raw token values — this eliminates XSS token theft.

### 4f. Auth Context

**`context/AuthContext.tsx`**

```ts
interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

Behaviour on mount: call `GET /auth/me` with `credentials: 'include'`. If 200 → set user. If 401 → set `user = null` (normal logged-out state, do not throw).

**`hooks/useAuth.ts`**

```ts
export function useAuth(): AuthContextValue; // throws if outside AuthProvider
export function useRequireAuth(): AuthUser; // redirects to /login if not authenticated
export function useRequireRole(role: AuthRole): AuthUser; // redirects if wrong role
```

### 4g. Provider Order

**`app/providers.tsx`**

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    {" "}
    {/* wraps everything — fetches /auth/me on mount */}
    <KimelaProvider>{children}</KimelaProvider>
  </AuthProvider>
</QueryClientProvider>
```

`AuthProvider` must be inside `QueryClientProvider` to call `queryClient.clear()` on logout.

### 4h. Route Protection — Middleware

**`apps/web/src/middleware.ts`**

```ts
export function middleware(request: NextRequest): NextResponse;
// Check for access_token cookie existence.
// If absent → redirect to /login?redirect=<current-path>
// (Presence check only — cryptographic verification happens on the backend.)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|register).*)"],
};
```

`AuthContext` on the client performs the authoritative `/auth/me` check and redirects on 401.

### 4i. Route Group Layouts

**`(app)/layout.tsx`** — protected routes:

```tsx
"use client";
export default function AppLayout({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading]);

  if (isLoading || !user) return <LoadingSpinner />;
  return (
    <>
      <Header />
      {children}
    </>
  );
}
```

**`(auth)/layout.tsx`** — login/register pages (no header, no guard).

### 4j. Role-Based Rendering

**`components/auth/RoleGuard.tsx`**

```tsx
interface RoleGuardProps {
  allowed: AuthRole | AuthRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({
  allowed,
  fallback = null,
  children,
}: RoleGuardProps);
// Renders children if user.role is in `allowed`, otherwise renders fallback.
```

Usage:

```tsx
<RoleGuard allowed="ADMIN">
  <AdminPanel />
</RoleGuard>
```

This is a UI-only guard. API endpoints enforce their own authorization server-side.

### 4k. Login Page

**`app/(auth)/login/page.tsx`**

Fields: `email` (type=email), `password` (type=password, minLength=8).

Flow:

1. Submit → `authApi.login()`
2. Success → `router.push('/')` or `?redirect=` query param
3. 401 → inline error "Invalid email or password" (do not distinguish which field)
4. Network error → "Something went wrong, please try again"

### 4l. Register Page

**`app/(auth)/register/page.tsx`**

Fields: `name`, `email`, `password`, `confirmPassword`.

Client-side validation on submit: `password === confirmPassword`. On success → auto-login or redirect to `/login` with success message.

### 4m. Logout Flow

In `AuthContext.logout()`:

1. `authApi.logout()` — backend revokes refresh token, clears cookies via `Set-Cookie`
2. `user = null` in context
3. `queryClient.clear()` — clear all cached data
4. `router.push('/login')`

### 4n. Token Refresh on 401

`apiFetch` wrapper intercepts 401 responses:

1. Call `POST /auth/refresh` (with `credentials: 'include'`)
2. If success → retry original request once
3. If refresh fails → redirect to `/login`

---

## 5. Coordinates to Align Backend ↔ Frontend

| Decision                                | Impact                           |
| --------------------------------------- | -------------------------------- |
| Exact cookie name                       | Required in `middleware.ts`      |
| `/auth/me` response body shape          | Drives `AuthUser` type           |
| Error response body shape               | Drives `ApiError` parsing        |
| Short-lived + refresh, or long session? | Determines 401 retry logic       |
| CORS `Access-Control-Allow-Origin`      | Must match `NEXT_PUBLIC_API_URL` |

---

## 6. Implementation Order

### Phase 1 — Schema & Foundation

1. Add `UserRole` enum, `passwordHash`, `role` to `User` model
2. Add `RefreshToken` model
3. Run migrations
4. Install backend auth packages

### Phase 2 — Backend Auth Module

1. Build `UsersModule` (entity, repository interface, Prisma repo)
2. Build `RegisterUserUseCase` and `LoginUserUseCase`
3. Build `RefreshTokenUseCase` and `LogoutUseCase`
4. Build Passport strategies (`local`, `jwt`)
5. Build guards (`JwtAuthGuard`, `LocalAuthGuard`, `RolesGuard`) and decorators (`@Public`, `@Roles`, `@CurrentUser`)
6. Build `AuthController` with all endpoints
7. Register global guards in `AppModule`
8. Add `cookie-parser` and fix CORS in `main.ts`
9. Update `KimelaController` to use real `@CurrentUser` decorator
10. Add rate limiting to login/register
11. Write tests

### Phase 3 — Frontend Auth

1. `types/auth.ts`
2. `lib/apiClient.ts` with `authApi`
3. `context/AuthContext.tsx` + `hooks/useAuth.ts`
4. Add `AuthProvider` to `providers.tsx`
5. `middleware.ts`
6. Route group restructure: `(auth)/` and `(app)/` layouts
7. Login and register pages
8. `components/auth/RoleGuard.tsx`
9. Update `Header/UserProfile.tsx` with live auth state
10. Update all fetch calls to include `credentials: 'include'`
11. Tests for `useAuth`, `RoleGuard`, auth pages

### Phase 4 — Admin Routes

1. Create admin-only route group `(admin)/` with role guard layout
2. Wire admin-only controllers with `@Roles(UserRole.ADMIN)` on the backend
