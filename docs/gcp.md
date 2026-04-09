# GCP Deployment Guide — Qimela

## Architecture

```
Browser
  │
  ▼
Cloud Run: qimela-web (Next.js)   ← public HTTPS
  │ internal HTTP
  ▼
Cloud Run: qimela-api (NestJS)    ← internal only (no public ingress)
  │ Private IP via Direct VPC Egress
  ▼
Cloud SQL: PostgreSQL (f1-micro)  ← private IP only, no public IP
```

All services run in `us-central1`. The API is never exposed publicly — only the web frontend calls it via VPC-internal HTTP.

---

## Estimated Monthly Cost

| Component                        | Cost     |
| -------------------------------- | -------- |
| Cloud SQL f1-micro + 10GB HDD    | ~$10.00  |
| Cloud Run API + Web (scale-to-0) | ~$0.50   |
| VPC / Networking                 | ~$0.50   |
| Secret Manager                   | ~$0.06   |
| Artifact Registry                | ~$0.10   |
| **Total**                        | **~$11** |

---

## Prerequisites

```bash
# Install gcloud CLI
brew install --cask google-cloud-sdk

# Login and set project
gcloud auth login
gcloud projects create qimela --name="Qimela"
gcloud config set project qimela

# Link billing account (required for Cloud SQL)
gcloud billing accounts list
gcloud billing projects link qimela --billing-account=<BILLING_ACCOUNT_ID>
```

---

## 1. Enable Required APIs

```zsh
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com
```

---

## 2. VPC Network

```bash
# Create a custom VPC (no auto-subnets)
gcloud compute networks create qimela-vpc \
  --subnet-mode=custom

# Create a subnet in us-central1 with Private Google Access
gcloud compute networks subnets create qimela-subnet \
  --network=qimela-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24 \
  --enable-private-ip-google-access

# Reserve a range for Private Service Access (required by Cloud SQL private IP)
gcloud compute addresses create google-managed-services-qimela-vpc \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=qimela-vpc

# Create the peering connection to Google services
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-qimela-vpc \
  --network=qimela-vpc
```

---

## 3. Cloud SQL (PostgreSQL)

### 3a. Create the instance

```bash
gcloud sql instances create qimela-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --edition=ENTERPRISE \
  --region=us-central1 \
  --storage-type=HDD \
  --storage-size=10GB \
  --no-storage-auto-increase \
  --availability-type=ZONAL \
  --no-assign-ip \
  --network=qimela-vpc \
  --backup \
  --backup-start-time=04:00 \
  --retained-backups-count=7 \
  --deletion-protection
```

> `--no-assign-ip` disables the public IP. The instance is only reachable via its Private IP inside `qimela-vpc`.

### 3b. Get the Private IP

```bash
gcloud sql instances describe qimela-db --format="value(ipAddresses[0].ipAddress)"
# Save this — you will use it in DATABASE_URL
# Example: 10.100.0.3
```

### 3c. Create DB user and database

```bash
# Create the application user
gcloud sql users create qimela_app --instance=qimela-db --password=<STRONG_PASSWORD>

# Create the database
gcloud sql databases create qimela --instance=qimela-db
```

---

## 4. Secret Manager

```bash
# DATABASE_URL — connection_limit=3 is critical for f1-micro
echo -n "postgresql://qimela_app:<PASSWORD>@<PRIVATE_IP>:5432/qimela?connection_limit=3&pool_timeout=20" | gcloud secrets versions add DATABASE_URL --data-file=-

echo -n "<your-jwt-secret>" | gcloud secrets create JWT_SECRET --data-file=-

echo -n "<your-jwt-refresh-secret>" | gcloud secrets versions add JWT_REFRESH_SECRET --data-file=-

echo -n "<your-resend-api-key>" | gcloud secrets create RESEND_API_KEY --data-file=-

echo -n "https://qimela-web-<HASH>-uc.a.run.app" | gcloud secrets create CORS_ORIGIN --data-file=-

echo -n "https://qimela.com" | gcloud secrets create FRONTEND_URL --data-file=-
```

> Update `CORS_ORIGIN` after the web Cloud Run URL is known (step 7b).

---

## 5. Artifact Registry

```bash
gcloud artifacts repositories create qimela \
  --repository-format=docker \
  --location=us-central1 \
  --description="Qimela container images"

# Authenticate Docker to push images
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Images will be pushed as:

- `us-central1-docker.pkg.dev/qimela/qimela/api:TAG`
- `us-central1-docker.pkg.dev/qimela/qimela/web:TAG`

---

## 6. Service Account

```bash
# Create a dedicated SA for Cloud Run services
gcloud iam service-accounts create qimela-run \
  --display-name="Qimela Cloud Run SA"

# Allow it to read secrets
gcloud projects add-iam-policy-binding qimela \
  --member="serviceAccount:qimela-run@qimela.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Allow Cloud Build to deploy Cloud Run and push images
gcloud projects add-iam-policy-binding qimela \
  --member="serviceAccount:$(gcloud projects describe qimela --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding qimela \
  --member="serviceAccount:$(gcloud projects describe qimela --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding qimela \
  --member="serviceAccount:$(gcloud projects describe qimela --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

---

## 7. Code Changes

### 7a. Add `/health` endpoint to the API

Cloud Run uses HTTP health checks for liveness/readiness probes.

Create `apps/api/src/health.controller.ts`:

```typescript
import { Controller, Get } from "@nestjs/common";
import { Public } from "./modules/auth/presentation/decorators/public.decorator";

@Controller()
export class HealthController {
  @Public()
  @Get("health")
  health() {
    return { status: "ok" };
  }
}
```

Register it in `apps/api/src/app.module.ts`:

```typescript
import { HealthController } from "./health.controller";

@Module({
  // ...existing imports
  controllers: [HealthController],
})
export class AppModule {}
```

### 7b. Add `/jobs/trigger` endpoint for Cloud Scheduler

Cloud Run scales to zero, which pauses pgboss. Cloud Scheduler hits this endpoint every 10 minutes to wake the instance and let pgboss poll pending jobs.

Create `apps/api/src/modules/jobs/jobs.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import { Public } from "../auth/presentation/decorators/public.decorator";

@Controller("jobs")
export class JobsController {
  @Public()
  @Post("trigger")
  trigger(@Headers("x-cloudscheduler-jobname") jobName: string) {
    // Only accept requests from Cloud Scheduler
    if (!jobName) throw new UnauthorizedException();
    // pgboss is already polling via monitorIntervalSeconds=30
    // Hitting this endpoint simply keeps the instance alive
    return { triggered: true };
  }
}
```

Create `apps/api/src/modules/jobs/jobs.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";

@Module({ controllers: [JobsController] })
export class JobsModule {}
```

Add `JobsModule` to `app.module.ts` imports.

### 7c. Prisma singleton (already correct)

`PrismaService` is `@Injectable()` in a `@Module()` — NestJS injects it as a singleton automatically. No changes needed.

### 7d. `connection_limit` in DATABASE_URL

The `connection_limit=3` is set in the secret (step 4). Prisma picks it up from `DATABASE_URL` automatically via the `PrismaPg` adapter already in use.

---

## 8. Cloud Run — API

```bash
gcloud run deploy qimela-api \
  --image=us-central1-docker.pkg.dev/qimela/qimela/api:latest \
  --region=us-central1 \
  --platform=managed \
  --no-allow-unauthenticated \
  --service-account=qimela-run@qimela.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=80 \
  --memory=512Mi \
  --cpu=1 \
  --network=qimela-vpc \
  --subnet=qimela-subnet \
  --vpc-egress=private-ranges-only \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,RESEND_API_KEY=RESEND_API_KEY:latest,CORS_ORIGIN=CORS_ORIGIN:latest,FRONTEND_URL=FRONTEND_URL:latest" \
  --set-env-vars="NODE_ENV=production" \
  --port=3000 \
  --health-check-http-path=/health
```

> `--no-allow-unauthenticated` means only internal traffic (from the web service and Cloud Scheduler) can reach the API. The web frontend calls it via its internal URL.

Get the API internal URL:

```bash
gcloud run services describe qimela-api \
  --region=us-central1 \
  --format="value(status.url)"
# Example: https://qimela-api-abc123-uc.a.run.app
```

---

## 9. Cloud Run — Web

```bash
gcloud run deploy qimela-web \
  --image=us-central1-docker.pkg.dev/qimela/qimela/web:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=qimela-run@qimela.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=80 \
  --memory=512Mi \
  --cpu=1 \
  --set-env-vars="NODE_ENV=production,API_INTERNAL_URL=https://qimela-api-<HASH>-uc.a.run.app,NEXT_PUBLIC_API_URL=https://qimela-api-<HASH>-uc.a.run.app" \
  --port=3000
```

> Replace `<HASH>` with the actual URL from step 8.

After the web service is deployed, update the `CORS_ORIGIN` secret:

```bash
gcloud run services describe qimela-web \
  --region=us-central1 \
  --format="value(status.url)"
# Example: https://qimela-web-xyz789-uc.a.run.app

echo -n "https://qimela-web-xyz789-uc.a.run.app" \
  | gcloud secrets versions add CORS_ORIGIN --data-file=-

# Redeploy the API to pick up the new secret version
gcloud run services update qimela-api \
  --region=us-central1 \
  --update-secrets="CORS_ORIGIN=CORS_ORIGIN:latest"
```

---

## 10. Cloud Scheduler — pgboss trigger

```bash
# Get the API service URL for the scheduler
API_URL=$(gcloud run services describe qimela-api \
  --region=us-central1 \
  --format="value(status.url)")

# Create a Cloud Scheduler job that hits /jobs/trigger every 10 minutes
gcloud scheduler jobs create http qimela-pgboss-trigger \
  --location=us-central1 \
  --schedule="*/10 * * * *" \
  --uri="${API_URL}/jobs/trigger" \
  --http-method=POST \
  --oidc-service-account-email=qimela-run@qimela.iam.gserviceaccount.com \
  --headers="x-cloudscheduler-jobname=pgboss-trigger" \
  --attempt-deadline=30s
```

The `--oidc-service-account-email` makes Cloud Scheduler authenticate itself so the API (with `--no-allow-unauthenticated`) accepts the request.

---

## 11. Cloud Build CI/CD

Create `cloudbuild.yaml` at the monorepo root:

```yaml
# cloudbuild.yaml
substitutions:
  _REGION: us-central1
  _REPO: us-central1-docker.pkg.dev/${PROJECT_ID}/qimela

options:
  logging: CLOUD_LOGGING_ONLY

steps:
  # ── API ──────────────────────────────────────────────────────────────
  - name: 'gcr.io/cloud-builders/docker'
    id: build-api
    args:
      - build
      - -f
      - apps/api/Dockerfile
      - -t
      - ${_REPO}/api:${SHORT_SHA}
      - -t
      - ${_REPO}/api:latest
      - .

  - name: 'gcr.io/cloud-builders/docker'
    id: push-api
    waitFor: [build-api]
    args: [push, --all-tags, ${_REPO}/api]

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: deploy-api
    waitFor: [push-api]
    entrypoint: gcloud
    args:
      - run
      - deploy
      - qimela-api
      - --image=${_REPO}/api:${SHORT_SHA}
      - --region=${_REGION}
      - --platform=managed

  # ── Web ──────────────────────────────────────────────────────────────
  - name: 'gcr.io/cloud-builders/docker'
    id: build-web
    args:
      - build
      - -f
      - apps/web/Dockerfile
      - -t
      - ${_REPO}/web:${SHORT_SHA}
      - -t
      - ${_REPO}/web:latest
      - .

  - name: 'gcr.io/cloud-builders/docker'
    id: push-web
    waitFor: [build-web]
    args: [push, --all-tags, ${_REPO}/web]

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: deploy-web
    waitFor: [push-web]
    entrypoint: gcloud
    args:
      - run
      - deploy
      - qimela-web
      - --image=${_REPO}/web:${SHORT_SHA}
      - --region=${_REGION}
      - --platform=managed
```

Create the Cloud Build triggers (one per app, filtered by path):

```bash
# API trigger — fires only when apps/api/** or packages/** changes
gcloud builds triggers create github \
  --repo-name=qimela \
  --repo-owner=<YOUR_GITHUB_USER> \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --included-files="apps/api/**,packages/**,pnpm-lock.yaml" \
  --name=qimela-api-deploy \
  --region=us-central1

# Web trigger — fires only when apps/web/** or packages/** changes
gcloud builds triggers create github \
  --repo-name=qimela \
  --repo-owner=<YOUR_GITHUB_USER> \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --included-files="apps/web/**,packages/**,pnpm-lock.yaml" \
  --name=qimela-web-deploy \
  --region=us-central1
```

---

## 12. First Manual Deploy

Build and push images from your local machine (one-time bootstrap before CI is set up):

```bash
# From monorepo root
PROJECT_ID=qimela
REPO=us-central1-docker.pkg.dev/${PROJECT_ID}/qimela

# API
docker build -f apps/api/Dockerfile -t ${REPO}/api:latest .
docker push ${REPO}/api:latest

# Web
docker build -f apps/web/Dockerfile -t ${REPO}/web:latest .
docker push ${REPO}/web:latest
```

Then run the `gcloud run deploy` commands from steps 8 and 9.

---

## 13. Local Development with Cloud SQL Auth Proxy

To connect to the production DB from your machine without whitelisting your IP:

```bash
# Install the proxy
brew install cloud-sql-proxy

# Start it (runs in background, listens on 127.0.0.1:5433)
cloud-sql-proxy qimela:us-central1:qimela-db --port=5433 &

# Use a local .env with the proxy URL
DATABASE_URL="postgresql://qimela_app:<PASSWORD>@127.0.0.1:5433/qimela?connection_limit=3"
```

---

## 14. Custom Domain (Optional)

```bash
# Map your domain to the web service
gcloud run domain-mappings create \
  --service=qimela-web \
  --domain=qimela.com \
  --region=us-central1

# Get the DNS records to add in your registrar
gcloud run domain-mappings describe \
  --domain=qimela.com \
  --region=us-central1
```

---

## Troubleshooting

```bash
# View API logs
gcloud run services logs read qimela-api --region=us-central1 --limit=50

# View web logs
gcloud run services logs read qimela-web --region=us-central1 --limit=50

# List Cloud SQL connections (check active connections vs limit=3)
gcloud sql operations list --instance=qimela-db --limit=5

# Manually trigger pgboss scheduler
gcloud scheduler jobs run qimela-pgboss-trigger --location=us-central1

# Check secret versions
gcloud secrets versions list DATABASE_URL
```
