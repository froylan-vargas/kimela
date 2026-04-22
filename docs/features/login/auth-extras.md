# Auth Extras — Email Confirmation & Password Recovery

## Overview

This plan adds two features to Qimela's existing JWT/cookie authentication:

1. **Email confirmation** — Verify the user owns the email they registered with before granting full access.
2. **Password recovery** — Let users reset a forgotten password via a time-limited email link.

Both features require a **transactional email provider**. Recommendations are included at the end.

---

## 1. Email Confirmation

### 1a. User Flow

```
Register → auto-login (restricted)
    ↓
Email with confirmation link → https://qimela.app/confirm-email?token=<TOKEN>
    ↓
User clicks link → API verifies token → emailVerifiedAt = now()
    ↓
Full access granted
```

**Key decisions:**

- Users **can log in immediately** after registration but are in a **restricted state** (can see the dashboard, but cannot create or join qimelas) until they verify their email.
- The confirmation link expires in **24 hours**.
- Users can **request a new confirmation email** from a banner shown on every page while unverified.

### 1b. Schema Changes

**File:** `apps/api/prisma/schema.prisma`

```prisma
model User {
  # ... existing fields ...
  emailVerifiedAt  DateTime? @map("email_verified_at")   # NEW — null = unverified
}

model EmailVerificationToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique @map("token_hash")          # SHA-256 hash (never store raw)
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("email_verification_tokens")
}
```

Migration: `npx prisma migrate dev --name add_email_verification`

### 1c. Backend — Domain Layer

**New files in `auth/domain/`:**

```
auth/domain/
├── email-verification-token.repository.ts   # Interface + entity
└── errors/
    ├── email-not-verified.error.ts
    └── invalid-verification-token.error.ts
```

**`email-verification-token.repository.ts`**

```ts
export const EMAIL_VERIFICATION_TOKEN_REPOSITORY = Symbol('EMAIL_VERIFICATION_TOKEN_REPOSITORY');

export interface EmailVerificationTokenProps {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class EmailVerificationTokenEntity {
  // ... same pattern as RefreshTokenEntity
  isValid(): boolean {
    return !this.usedAt && this.expiresAt > new Date();
  }
}

export interface EmailVerificationTokenRepository {
  findByHash(tokenHash: string): Promise<EmailVerificationTokenEntity | null>;
  create(token: EmailVerificationTokenEntity): Promise<void>;
  markUsed(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>; // cleanup old tokens
}
```

### 1d. Backend — Application Layer

**New use cases:**

```
auth/application/use-cases/
├── send-verification-email.use-case.ts
└── confirm-email.use-case.ts
```

**New service:**

```
auth/application/services/
└── email.service.ts   # Abstraction over the email provider
```

---

**`send-verification-email.use-case.ts`**

```ts
@Injectable()
export class SendVerificationEmailUseCase {
  constructor(
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(user: UserEntity): Promise<void> {
    // 1. Delete any existing tokens for this user (prevent spam)
    await this.tokenRepo.deleteByUserId(user.id);

    // 2. Generate a random token (uuid v4)
    const rawToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 3. Save hashed token with 24h expiry
    await this.tokenRepo.create(
      new EmailVerificationTokenEntity({
        id: uuidv4(),
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
      }),
    );

    // 4. Send email with link containing the RAW token
    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${rawToken}`;
    await this.emailService.sendVerificationEmail(user.email, user.name, confirmUrl);
  }
}
```

---

**`confirm-email.use-case.ts`**

```ts
@Injectable()
export class ConfirmEmailUseCase {
  constructor(
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(rawToken: string): Promise<void> {
    // 1. Hash the incoming token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 2. Look up by hash
    const tokenEntity = await this.tokenRepo.findByHash(tokenHash);
    if (!tokenEntity || !tokenEntity.isValid()) {
      throw new InvalidVerificationTokenError();
    }

    // 3. Mark token as used
    await this.tokenRepo.markUsed(tokenEntity.id);

    // 4. Set emailVerifiedAt on user
    await this.userRepo.verifyEmail(tokenEntity.userId);
  }
}
```

> **Note:** `UserRepository` needs a new method: `verifyEmail(userId: string): Promise<void>`

---

**`email.service.ts`** — Provider abstraction

```ts
export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface EmailService {
  sendVerificationEmail(to: string, name: string, confirmUrl: string): Promise<void>;
  sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void>;
}
```

The concrete implementation (`ResendEmailService`, `PostmarkEmailService`, etc.) lives in the `infrastructure/` layer and is injected via the module.

### 1e. Backend — API Endpoints

Add to `AuthController`:

| Method | Path                        | Guard       | Body / Query               | Description                 |
| ------ | --------------------------- | ----------- | -------------------------- | --------------------------- |
| POST   | `/auth/confirm-email`       | `@Public()` | `{ token: string }`        | Verify email with token     |
| POST   | `/auth/resend-verification` | JWT         | —                          | Resend confirmation email   |

**Rate limit** both endpoints: 3 requests per minute.

### 1f. Backend — Registration Flow Update

In `register-user.use-case.ts`, after creating the user:

```ts
// After: return this.userRepository.create(entity);
const user = await this.userRepository.create(entity);
await this.sendVerificationEmailUseCase.execute(user);
return user;
```

### 1g. Backend — Restriction Guard (Optional)

If you want to block unverified users from certain actions:

```ts
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Debes verificar tu correo electrónico');
    }
    return true;
  }
}
```

Apply to routes that require verified email (create qimela, subscribe, etc.).

> **Important:** The JWT payload needs `emailVerifiedAt` added so the guard can check without a DB call. Or, add it to the `/auth/me` response and check on the frontend.

### 1h. Frontend — Confirm Email Page

**New route:** `apps/web/src/app/(auth)/confirm-email/page.tsx`

```
User clicks link → /confirm-email?token=ABC123
  ↓
Page calls POST /auth/confirm-email { token }
  ↓
Success → "¡Correo verificado!" + redirect to /dashboard
Error   → "El enlace ha expirado o no es válido" + link to resend
```

### 1i. Frontend — Verification Banner

In `(app)/layout.tsx`, if `user.emailVerifiedAt === null`:

```tsx
<div className={styles.verificationBanner}>
  <p>Verifica tu correo electrónico para acceder a todas las funciones.</p>
  <button onClick={handleResend}>Reenviar correo</button>
</div>
```

---

## 2. Password Recovery

### 2a. User Flow

```
Login page → "¿Olvidaste tu contraseña?" link
    ↓
/forgot-password → enter email → POST /auth/forgot-password
    ↓
Email with reset link → https://qimela.app/reset-password?token=<TOKEN>
    ↓
/reset-password → enter new password + confirm → POST /auth/reset-password
    ↓
Success → redirect to /login with success message
```

**Key decisions:**

- Reset link expires in **1 hour** (shorter than verification — more security-sensitive).
- After successful reset, **all refresh tokens for the user are revoked** (forced re-login on all devices).
- The endpoint **does not reveal whether the email exists.** It always returns 200 with a generic "If an account exists, we've sent you an email" message.

### 2b. Schema Changes

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid())
  tokenHash String    @unique @map("token_hash")
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  @@map("password_reset_tokens")
}
```

Migration: `npx prisma migrate dev --name add_password_reset_tokens`

### 2c. Backend — Domain Layer

**New files:**

```
auth/domain/
├── password-reset-token.repository.ts   # Interface + entity (same pattern)
└── errors/
    └── invalid-reset-token.error.ts
```

### 2d. Backend — Application Layer

**New use cases:**

```
auth/application/use-cases/
├── request-password-reset.use-case.ts
└── reset-password.use-case.ts
```

**New DTOs:**

```
auth/application/dtos/
├── forgot-password.dto.ts    # { email: string }
└── reset-password.dto.ts     # { token: string, password: string }
```

---

**`request-password-reset.use-case.ts`**

```ts
@Injectable()
export class RequestPasswordResetUseCase {
  async execute(email: string): Promise<void> {
    // 1. Find user by email
    const user = await this.userRepo.findByEmail(email);

    // 2. If no user → silently return (don't leak existence)
    if (!user) return;

    // 3. Delete existing reset tokens for this user
    await this.resetTokenRepo.deleteByUserId(user.id);

    // 4. Generate token, hash it, store with 1h expiry
    const rawToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.resetTokenRepo.create(/* ... expiresAt: 1 hour ... */);

    // 5. Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await this.emailService.sendPasswordResetEmail(user.email, user.name, resetUrl);
  }
}
```

---

**`reset-password.use-case.ts`**

```ts
@Injectable()
export class ResetPasswordUseCase {
  async execute(rawToken: string, newPassword: string): Promise<void> {
    // 1. Hash token, look up
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenEntity = await this.resetTokenRepo.findByHash(tokenHash);

    if (!tokenEntity || !tokenEntity.isValid()) {
      throw new InvalidResetTokenError();
    }

    // 2. Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // 3. Update user's password
    await this.userRepo.updatePassword(tokenEntity.userId, passwordHash);

    // 4. Mark token as used
    await this.resetTokenRepo.markUsed(tokenEntity.id);

    // 5. Revoke ALL refresh tokens for this user (force re-login everywhere)
    await this.refreshTokenRepo.revokeAllByUserId(tokenEntity.userId);
  }
}
```

> **Note:** `UserRepository` needs: `updatePassword(userId: string, passwordHash: string): Promise<void>`
>
> `RefreshTokenRepository` needs: `revokeAllByUserId(userId: string): Promise<void>`

### 2e. Backend — API Endpoints

Add to `AuthController`:

| Method | Path                     | Guard       | Body                                  | Response                            |
| ------ | ------------------------ | ----------- | ------------------------------------- | ----------------------------------- |
| POST   | `/auth/forgot-password`  | `@Public()` | `{ email: string }`                   | Always 200: generic message         |
| POST   | `/auth/reset-password`   | `@Public()` | `{ token: string, password: string }` | 200 on success, 400 on invalid/expired |

**Rate limit:** `forgot-password` → 3 requests per minute. `reset-password` → 5 per minute.

**`reset-password.dto.ts`** validation — same password rules as register:

```ts
export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message: 'password must contain uppercase, lowercase, a number, and a special character',
  })
  password!: string;
}
```

### 2f. Frontend — Forgot Password Page

**New route:** `apps/web/src/app/(auth)/forgot-password/page.tsx`

- Single field: email
- Submit → POST `/auth/forgot-password`
- Always show: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."
- Link back to login

### 2g. Frontend — Reset Password Page

**New route:** `apps/web/src/app/(auth)/reset-password/page.tsx`

- Fields: new password + confirm password
- Token read from `?token=` query param
- Submit → POST `/auth/reset-password`
- Same client-side password validation as register (complexity rules)
- Success → "¡Contraseña restablecida!" + redirect to `/login`
- Error → "El enlace ha expirado o no es válido"

### 2h. Frontend — Login Page Update

Add link below the sign-in button:

```tsx
<Link href="/forgot-password" className={styles.forgotLink}>
  ¿Olvidaste tu contraseña?
</Link>
```

---

## 3. Email Module Architecture

Following the hexagonal pattern, the email service is an abstraction:

```
auth/
├── application/
│   └── services/
│       └── email.service.ts             # Interface (port)
└── infrastructure/
    └── email/
        ├── resend-email.service.ts       # Concrete implementation
        └── email.infrastructure.module.ts
```

**Module wiring:**

```ts
@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      useClass: ResendEmailService, // swap for PostmarkEmailService, etc.
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailInfrastructureModule {}
```

### 3a. Email Templates

Templates are built with **React Email** and located at:

```
apps/api/src/modules/auth/infrastructure/email/templates/
├── verification-email.tsx
└── password-reset-email.tsx
```

**Dependencies:**

```bash
pnpm --filter @qimela/api add @react-email/components @react-email/render
```

Both email types need:

| Email          | Subject                             | Body essentials                                                     |
| -------------- | ----------------------------------- | ------------------------------------------------------------------- |
| Verification   | "Confirma tu correo — Qimela"       | Greeting, CTA button, expiry note (24h)                             |
| Password reset | "Restablece tu contraseña — Qimela" | Greeting, CTA button, expiry note (1h), "if you didn't request this..." |

**Template example (`verification-email.tsx`):**

```tsx
import { Button, Html, Text, Heading } from '@react-email/components';
import { render } from '@react-email/render';

interface VerificationEmailProps {
  name: string;
  confirmUrl: string;
}

export function VerificationEmail({ name, confirmUrl }: VerificationEmailProps) {
  return (
    <Html>
      <Heading>¡Hola {name}!</Heading>
      <Text>Confirma tu correo electrónico para acceder a todas las funciones de Qimela.</Text>
      <Button href={confirmUrl}>Confirmar correo</Button>
      <Text>Este enlace expira en 24 horas.</Text>
    </Html>
  );
}

export const renderVerificationEmail = (props: VerificationEmailProps) =>
  render(<VerificationEmail {...props} />);
```

In `ResendEmailService`, replace the inline HTML string:

```ts
import { renderVerificationEmail } from './templates/verification-email';

async sendVerificationEmail(to: string, name: string, confirmUrl: string): Promise<void> {
  await this.resend.emails.send({
    from: 'Qimela <noreply@qimela.app>',
    to,
    subject: 'Confirma tu correo — Qimela',
    html: await renderVerificationEmail({ name, confirmUrl }),
  });
}
```

**Development note:** Until a sending domain is configured in Resend, all emails are delivered to `froylan.vargas.gomez@gmail.com` regardless of the `to` address. Update the `to` field in `ResendEmailService` for dev:

```ts
to: process.env.NODE_ENV === 'production' ? to : 'froylan.vargas.gomez@gmail.com',
```

### 3b. Async Email Sending

Emails are sent asynchronously via **pg-boss** to avoid blocking the HTTP response. pg-boss uses the existing Postgres DB as a job queue — no additional infrastructure required.

```
Request → Use case → boss.send('send-verification', { ... }) → Return response immediately
                          ↓
              pg-boss worker (inside NestJS) → ResendEmailService.send()
```

See `docs/cloud-provider.md` for pg-boss setup and configuration.

---

## 4. Email Provider — Resend

Qimela uses **Resend** as the email provider. Free tier: 3,000 emails/month — more than enough for early stage.

```bash
pnpm --filter @qimela/api add resend
```

```ts
import { Resend } from 'resend';

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  async sendVerificationEmail(to: string, name: string, confirmUrl: string): Promise<void> {
    await this.resend.emails.send({
      from: 'Qimela <noreply@qimela.app>',
      to,
      subject: 'Confirma tu correo — Qimela',
      html: `
        <h2>¡Hola ${name}!</h2>
        <p>Confirma tu correo electrónico haciendo clic en el siguiente enlace:</p>
        <a href="${confirmUrl}" style="...">Confirmar correo</a>
        <p>Este enlace expira en 24 horas.</p>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
    await this.resend.emails.send({
      from: 'Qimela <noreply@qimela.app>',
      to,
      subject: 'Restablece tu contraseña — Qimela',
      html: `
        <h2>¡Hola ${name}!</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña:</p>
        <a href="${resetUrl}" style="...">Restablecer contraseña</a>
        <p>Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
      `,
    });
  }
}
```

---

## 5. New Environment Variables

```env
# Email provider
RESEND_API_KEY=re_xxxxxxxxxxxx
FRONTEND_URL=https://qimela.app        # used to build confirmation/reset links

# For development
FRONTEND_URL=http://localhost:3001
```

---

## 6. Security Considerations

| Concern                        | Mitigation                                                       |
| ------------------------------ | ---------------------------------------------------------------- |
| Token leakage                  | Store only SHA-256 hash in DB. Raw token only in URL/email.       |
| Brute force on token endpoint  | Rate limit (3 req/min). UUIDs have 122 bits of entropy.          |
| User enumeration via reset     | Always return generic success message on forgot-password.        |
| Old tokens lingering           | Delete previous tokens before creating new one.                  |
| Compromised password           | Revoke all refresh tokens on password reset.                     |
| Replay attack                  | Mark token as used (`usedAt`) — single-use only.                 |
| Link interception              | Use HTTPS in production. Token expires (1h reset, 24h verify).  |

---

## 7. Implementation Order

### Phase 1 — Infrastructure

1. Choose email provider (Resend recommended)
2. Set up sending domain and DNS records (SPF, DKIM, DMARC)
3. Create `EmailService` interface and concrete implementation
4. Add `EmailInfrastructureModule` to `AuthModule`

### Phase 2 — Email Confirmation

1. Prisma migration: `emailVerifiedAt` on User, `EmailVerificationToken` model
2. Domain: entity, repository interface, error classes
3. Infrastructure: Prisma repository implementation
4. Use cases: `SendVerificationEmailUseCase`, `ConfirmEmailUseCase`
5. Update `RegisterUserUseCase` to send verification email
6. Controller endpoints: `POST /auth/confirm-email`, `POST /auth/resend-verification`
7. Frontend: `/confirm-email` page, verification banner in `(app)/layout.tsx`
8. Optional: `EmailVerifiedGuard` for restricted routes
9. Update middleware to allow `/confirm-email` without auth
10. Tests

### Phase 3 — Password Recovery

1. Prisma migration: `PasswordResetToken` model
2. Domain: entity, repository interface, error classes
3. Infrastructure: Prisma repository implementation
4. Use cases: `RequestPasswordResetUseCase`, `ResetPasswordUseCase`
5. Controller endpoints: `POST /auth/forgot-password`, `POST /auth/reset-password`
6. Frontend: `/forgot-password` page, `/reset-password` page
7. Update login page with "¿Olvidaste tu contraseña?" link
8. Update middleware to allow new routes without auth
9. Add `updatePassword` and `revokeAllByUserId` to repositories
10. Tests

### Phase 4 — Hardening

1. Add email delivery monitoring/logging
2. Add email bounce/complaint handling via Resend webhooks
3. Consider adding email change flow (re-verify on email update)

---

## 8. File Structure Summary (New Files)

```
apps/api/src/modules/auth/
├── application/
│   ├── dtos/
│   │   ├── confirm-email.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   └── reset-password.dto.ts
│   ├── services/
│   │   └── email.service.ts                   # Interface (port)
│   └── use-cases/
│       ├── send-verification-email.use-case.ts
│       ├── confirm-email.use-case.ts
│       ├── request-password-reset.use-case.ts
│       └── reset-password.use-case.ts
├── domain/
│   ├── email-verification-token.repository.ts
│   ├── password-reset-token.repository.ts
│   └── errors/
│       ├── email-not-verified.error.ts
│       ├── invalid-verification-token.error.ts
│       └── invalid-reset-token.error.ts
└── infrastructure/
    ├── email/
    │   ├── resend-email.service.ts             # Concrete implementation
    │   └── email.infrastructure.module.ts
    └── persistence/
        ├── prisma-email-verification-token.repository.ts
        └── prisma-password-reset-token.repository.ts

apps/web/src/app/(auth)/
├── confirm-email/
│   ├── page.tsx
│   └── page.module.scss
├── forgot-password/
│   ├── page.tsx
│   └── page.module.scss
└── reset-password/
    ├── page.tsx
    └── page.module.scss
```
