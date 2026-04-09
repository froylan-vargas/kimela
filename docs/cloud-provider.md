# Cloud Provider Setup — Fly.io

## Stack

- **API:** NestJS on Fly.io (free tier, 3 shared VMs)
- **Database:** Fly Postgres (self-managed, free tier)
- **Queue:** pg-boss (runs inside the API, uses the same Postgres)
- **Email:** Resend (external API)
- **Networking:** Fly private network (6PN) — DB nunca expuesto a internet

---

## 1. Requisitos previos

```bash
# Instalar Fly CLI
brew install flyctl

# Login
flyctl auth login
```

---

## 2. Crear la app de la API

```bash
cd apps/api

flyctl launch \
  --name qimela-api \
  --region mia \        # Miami — más cercano a México
  --no-deploy           # no deployar aún, primero configurar
```

Esto genera un `fly.toml` en `apps/api/`. Revísalo y ajusta:

```toml
app = 'qimela-api'
primary_region = 'mia'

[build]
  dockerfile = '../../apps/api/Dockerfile'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'suspend'   # suspend en lugar de apagar (wake-up ~100ms)
  auto_start_machines = true
  min_machines_running = 1         # siempre 1 activa en producción
  max_machines = 3                 # límite free tier

  [http_service.concurrency]
    type = 'requests'
    soft_limit = 25
    hard_limit = 50

[[vm]]
  size = 'shared-cpu-1x'
  memory = '256mb'
```

> `auto_stop_machines = 'suspend'` es clave — la VM se congela en memoria y despierta en ~100ms, no hace cold start completo.

---

## 3. Crear Postgres

```bash
flyctl postgres create \
  --name qimela-db \
  --region mia \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 1          # 1GB — más que suficiente para 1000 usuarios
```

Fly crea una app separada `qimela-db` con Postgres. El DB **solo es accesible dentro de la red privada de Fly** (6PN) — nunca expuesto a internet por defecto.

### Conectar la API al DB

```bash
flyctl postgres attach qimela-db --app qimela-api
```

Esto inyecta automáticamente `DATABASE_URL` como secret en `qimela-api` con la URL privada interna:

```
postgres://qimela_api:<password>@qimela-db.flycast:5432/qimela_api
```

El hostname `qimela-db.flycast` solo resuelve dentro de la red privada de Fly. Desde fuera no existe.

---

## 4. Configurar pg-boss en Postgres

pg-boss crea su propio schema `pgboss` en tu DB automáticamente al iniciar. No necesitas migraciones manuales para pg-boss — solo asegúrate de que el usuario de la DB tenga permisos.

### Verificar permisos

Conéctate al DB desde tu máquina via proxy:

```bash
flyctl proxy 5432 -a qimela-db
```

En otra terminal:

```bash
psql postgres://qimela_api:<password>@localhost:5432/qimela_api
```

Verifica permisos:

```sql
-- El usuario debe tener estos permisos (attach los da automáticamente)
\du qimela_api

-- Si necesitas darlos manualmente:
GRANT CREATE ON DATABASE qimela_api TO qimela_api;
```

### Configurar pg-boss en NestJS

```bash
pnpm --filter @qimela/api add pg-boss
pnpm --filter @qimela/api add -D @types/pg-boss
```

Crea `apps/api/src/modules/shared/pg-boss/pg-boss.module.ts`:

```ts
import { Module, Global, OnModuleInit, Injectable } from '@nestjs/common';
import PgBoss from 'pg-boss';

export const PG_BOSS = Symbol('PG_BOSS');

@Global()
@Module({
  providers: [
    {
      provide: PG_BOSS,
      useFactory: async () => {
        const boss = new PgBoss({
          connectionString: process.env.DATABASE_URL,
          deleteAfterDays: 7,
          archiveFailedAfterDays: 30,
          monitorStateIntervalSeconds: 30,
        });
        await boss.start();
        return boss;
      },
    },
  ],
  exports: [PG_BOSS],
})
export class PgBossModule {}
```

Importa `PgBossModule` en `AppModule`. Cualquier use case que necesite encolar jobs inyecta `@Inject(PG_BOSS) private readonly boss: PgBoss`.

---

## 5. Variables de entorno

```bash
# Agregar secrets a Fly (no van en fly.toml)
flyctl secrets set \
  JWT_PRIVATE_KEY="$(cat private.pem)" \
  JWT_PUBLIC_KEY="$(cat public.pem)" \
  JWT_REFRESH_SECRET="tu-secret-minimo-32-chars" \
  RESEND_API_KEY="re_xxxxxxxxxxxx" \
  FRONTEND_URL="https://qimela.app" \
  NODE_ENV="production" \
  --app qimela-api
```

> `DATABASE_URL` ya fue inyectada por `flyctl postgres attach`.

Verifica todos los secrets:

```bash
flyctl secrets list --app qimela-api
```

---

## 6. Primer deploy

```bash
cd /ruta/al/monorepo

flyctl deploy \
  --config apps/api/fly.toml \
  --dockerfile apps/api/Dockerfile \
  --app qimela-api
```

Verifica que levantó:

```bash
flyctl status --app qimela-api
flyctl logs --app qimela-api
```

Prueba el endpoint de salud:

```bash
curl https://qimela-api.fly.dev/auth/me
# Debe retornar 401 (correcto — no hay token)
```

---

## 7. Auto-scaling para el Mundial

Durante los partidos habrá picos de tráfico. La configuración del `fly.toml` ya maneja esto, pero ajusta los límites:

### Antes del Mundial (activar scaling agresivo)

```bash
flyctl scale count 1 --app qimela-api   # baseline: 1 VM activa
```

Cuando empiece la fase de grupos, baja el `soft_limit` para que escale antes:

```toml
[http_service.concurrency]
  type = 'requests'
  soft_limit = 15    # escala más rápido ante picos
  hard_limit = 35
```

```bash
flyctl deploy --config apps/api/fly.toml --app qimela-api
```

### Durante partidos (escala manual preventiva)

30 minutos antes de un partido importante, puedes pre-escalar:

```bash
flyctl scale count 2 --app qimela-api   # levanta 2 VMs proactivamente
```

Después del partido:

```bash
flyctl scale count 1 --app qimela-api   # vuelve a 1
```

### Monitorear en tiempo real

```bash
flyctl status --app qimela-api          # ver VMs activas
flyctl logs --app qimela-api            # logs en vivo
```

---

## 8. Upgrade a 512MB (cuándo y cómo)

### Señales de que necesitas más memoria

- Logs muestran `OOMKilled` o `process exited with code 137`
- Latencia alta sostenida (>500ms) sin picos de tráfico
- `flyctl status` muestra reinicios frecuentes

### Cómo hacer el upgrade

```bash
# Upgrade a 512MB — ~$2/mes por VM adicional respecto al free tier
flyctl scale memory 512 --app qimela-api
```

O edita `fly.toml`:

```toml
[[vm]]
  size = 'shared-cpu-1x'
  memory = '512mb'
```

```bash
flyctl deploy --config apps/api/fly.toml --app qimela-api
```

> Las 3 VMs del free tier cambian a 512MB. El costo sube de $0 a ~$6/mes total (3 × $2). Sigue siendo muy barato.

### Upgrade de Postgres

Si el DB crece más de 1GB o ves queries lentas:

```bash
# Ver uso actual
flyctl postgres db-size qimela-db

# Ampliar volumen
flyctl volumes extend <volume-id> --size-gb 5 --app qimela-db
```

---

## 9. Conectarse al DB en producción (debugging)

```bash
# Proxy local al DB de producción
flyctl proxy 5432 -a qimela-db

# En otra terminal
psql postgres://qimela_api:<password>@localhost:5432/qimela_api

# Ver jobs de pg-boss
SELECT id, name, state, createdon, completedon
FROM pgboss.job
ORDER BY createdon DESC
LIMIT 20;

# Ver jobs fallidos
SELECT * FROM pgboss.job WHERE state = 'failed' LIMIT 10;
```

---

## 10. Resumen de costos

| Componente | Free tier | Si haces upgrade |
|---|---|---|
| API (3 VMs 256MB) | $0 | $6/mes (512MB) |
| Postgres (1GB) | $0 | $0 (hasta 3GB) |
| Networking / SSL | $0 | $0 |
| **Total** | **$0** | **~$6/mes** |

Resend: 3,000 emails/mes gratis — más que suficiente para el Mundial.
