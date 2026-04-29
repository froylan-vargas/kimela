# Feature - Creator can share the qimela link so users can subscribe.

Can you imagine and think on a way a user can share a link to subscribe to the qimela, if it possible I don't want to share the qimelaid in the links, but if needed you can do.

What is the flow when the user is not subscribed or logged in?
Which one he is logged in?
I assume a qimela card with a Subscribe button to the qimela will appear.

---

## Implementation Plan

### Decisions

- Share URL uses an opaque token (not the qimela UUID) to prevent ID enumeration.
- One token per qimela. The creator can revoke it and generate a new one.
- Tokens do not expire. The creator manually revokes the link to stop subscriptions.
- Token is generated using `crypto.randomBytes(32)` (cryptographically secure).
- **Subscription rule:** a user can subscribe as long as the invite link is active (not revoked) and the qimela is `UPCOMING`. Once the qimela is `ACTIVE` or beyond, subscriptions are closed regardless of invite link state.

### Backend

**1. Prisma — new `InviteToken` model**

- Fields: `token` (unique, random hex string), `qimelaId`, `revoked` (boolean), `createdAt`
- Relation: one-to-one with `qimela`

**2. New API endpoints**
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/qimelas/:id/invite` | Creator only | Generates invite token (or returns existing one) |
| `DELETE` | `/qimelas/:id/invite` | Creator only | Revokes current token |
| `GET` | `/invite/:token` | Public | Returns qimela public info (name, sport, creator) |
| `POST` | `/invite/:token/subscribe` | Required | Subscribes the authenticated user |

**3. Subscribe endpoint**

- `POST /invite/:token/subscribe` — authenticated, subscribes the current user to the qimela.
- Rejects with `410 Gone` if the token is revoked.
- Rejects with `422 Unprocessable Entity` if the qimela is not `UPCOMING`.
- Rejects with `409 Conflict` if the user is already subscribed.
- Rejects with `403 Forbidden` if the user is the creator (creator cannot subscribe to their own qimela).

### Frontend

**4. Public invite page — `/invite/[token]`**

- Outside the `(app)` auth group (no auth required to view).
- Fetches qimela public info and displays a qimela card.
- **Not logged in**: Subscribe button redirects to `/login?redirect=/invite/[token]`. After login, redirects back and auto-triggers subscribe.
- **Logged in**: Subscribe button calls `POST /invite/:token/subscribe`, then redirects to `/qimela/:id`.

**5. Share button on qimela detail page**

- Visible to the creator only.
- Calls `POST /qimelas/:id/invite` to get/create the token.
- Copies the invite URL to clipboard or shows it in a modal.
- UI only at this stage — no subscription rules implemented yet.

---

## Test Cases

### Backend (Jest) — 24 tests

#### `InviteTokenEntity`

| #   | Description                                                |
| --- | ---------------------------------------------------------- |
| 1   | `create()` returns an entity with `revoked` set to `false` |
| 2   | `create()` generates a 64-character lowercase hex token    |
| 3   | `create()` sets the provided `qimelaId` on the entity      |
| 4   | `isActive()` returns `true` when token is not revoked      |
| 5   | `isActive()` returns `false` when token is revoked         |

#### `GenerateInviteTokenUseCase`

| #   | Description                                                         |
| --- | ------------------------------------------------------------------- |
| 6   | Throws `NotFoundException` when qimela is not found                 |
| 7   | Throws `ForbiddenException` when requester is not the creator       |
| 8   | Returns the existing active token without calling `upsert`          |
| 9   | Creates a new token via `upsert` when no token exists               |
| 10  | Creates a new token via `upsert` when the existing token is revoked |

#### `RevokeInviteTokenUseCase`

| #   | Description                                                           |
| --- | --------------------------------------------------------------------- |
| 11  | Throws `NotFoundException` when qimela is not found                   |
| 12  | Throws `ForbiddenException` when requester is not the creator         |
| 13  | Throws `NotFoundException` when no invite token exists for the qimela |
| 14  | Throws `NotFoundException` when the invite token is already revoked   |
| 15  | Calls `revoke(tokenId)` on the repository on success                  |

#### `GetQimelaByInviteTokenUseCase`

| #   | Description                                                             |
| --- | ----------------------------------------------------------------------- |
| 16  | Throws `NotFoundException` when the token is not found                  |
| 17  | Throws `GoneException` (410) when the token is revoked                  |
| 18  | Returns `qimelaId`, `name`, `status`, `sport`, and `creator` on success |
| 19  | Throws `NotFoundException` when the qimela record no longer exists      |

#### `InviteController`

| #   | Description                                                                    |
| --- | ------------------------------------------------------------------------------ |
| 20  | `POST /qimelas/:id/invite` — calls use case with `{ qimelaId, requesterId }`   |
| 21  | `POST /qimelas/:id/invite` — returns the use case result                       |
| 22  | `DELETE /qimelas/:id/invite` — calls use case with `{ qimelaId, requesterId }` |
| 23  | `GET /invite/:token` — calls use case with the token param                     |
| 24  | `GET /invite/:token` — returns the use case result                             |

---

### Frontend (Vitest + RTL) — 15 tests

#### `/invite/[token]` page

| #   | Description                                                                                  |
| --- | -------------------------------------------------------------------------------------------- |
| 25  | Shows "Cargando..." while `getByToken` is pending                                            |
| 26  | Shows qimela name, sport name, and creator name after successful fetch                       |
| 27  | Shows status badge "Próxima" for `UPCOMING` status                                           |
| 28  | Shows "Enlace de invitación no válido." on generic API error                                 |
| 29  | Shows "Este enlace de invitación ha sido revocado." on `ApiError` with status 410            |
| 30  | Shows "Inicia sesión para suscribirte" button when user is not authenticated                 |
| 31  | Shows "Suscribirse" button when user is authenticated                                        |
| 32  | Clicking subscribe when not logged in calls `router.push("/login?redirect=/invite/[token]")` |

#### `/qimela/[id]` page — Share section

| #   | Description                                                                         |
| --- | ----------------------------------------------------------------------------------- |
| 33  | Share section is **not visible** when user is not the creator                       |
| 34  | Share section **is visible** when user is the creator                               |
| 35  | Clicking "Copiar enlace" calls `inviteApi.generate` with the qimela id              |
| 36  | After successful generate, copies the URL to clipboard and shows "¡Enlace copiado!" |
| 37  | After generate error, shows "No se pudo generar el enlace. Intenta de nuevo."       |
| 38  | Clicking "Revocar enlace" calls `inviteApi.revoke` with the qimela id               |
| 39  | After revoke 404 error, shows "No hay enlace activo para revocar."                  |
