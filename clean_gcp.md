# Clean GCP Resources for Qimela

This runbook deletes the GCP resources described in `docs/infra/gcp.md`.

Project assumptions:

- Project ID: `qimela`
- Region: `us-central1`
- Cloud Run services: `qimela-api`, `qimela-web`
- Cloud SQL instance: `qimela-a`
- Artifact Registry repository: `qimela`
- VPC: `qimela-vpc`
- Subnet: `qimela-subnet`
- Reserved private service range: `google-managed-services-qimela-vpc`
- Service account: `qimela-run@qimela.iam.gserviceaccount.com`
- Scheduler job: `qimela-pgboss-trigger`
- Custom domains: `qimela.com`, `api.qimela.com`

These commands are destructive. Export the project and region first:

```bash
export PROJECT_ID=qimela
export REGION=us-central1

gcloud config set project "${PROJECT_ID}"
```

## Option A: Delete the Whole Project

Use this if the `qimela` GCP project contains only Qimela resources. This is the simplest and most complete cleanup.

```bash
gcloud projects delete "${PROJECT_ID}"
```

Confirm the deletion when prompted. Project deletion also removes Cloud Run services, Cloud SQL, Artifact Registry images, secrets, Scheduler jobs, VPC resources, IAM bindings, logs, and build history owned by the project.

## Option B: Delete Resources Manually

Use this if the project contains other resources that must be kept.

### 1. Inspect Current Resources

```bash
gcloud run services list --region="${REGION}"
gcloud sql instances list
gcloud artifacts repositories list --location="${REGION}"
gcloud scheduler jobs list --location="${REGION}"
gcloud secrets list
gcloud compute networks list
gcloud builds triggers list --region="${REGION}"
```

### 2. Remove Custom Domain Mappings

Delete Cloud Run domain mappings before deleting the services.

```bash
gcloud run domain-mappings delete \
  --domain=qimela.com \
  --region="${REGION}"

gcloud beta run domain-mappings delete \
  --domain=api.qimela.com \
  --region="${REGION}"
```

Also remove the DNS records for `qimela.com` and `api.qimela.com` from the domain registrar or DNS provider.

### 3. Stop Scheduled Triggers

```bash
gcloud scheduler jobs delete qimela-pgboss-trigger \
  --location="${REGION}"
```

### 4. Delete Cloud Run Services

```bash
gcloud run services delete qimela-web \
  --region="${REGION}"

gcloud run services delete qimela-api \
  --region="${REGION}"
```

### 5. Delete Cloud Build Triggers

The setup guide names two possible triggers: `qimela-api-deploy` and `qimela-web-deploy`.

```bash
gcloud builds triggers delete qimela-api-deploy \
  --region="${REGION}"

gcloud builds triggers delete qimela-web-deploy \
  --region="${REGION}"
```

If trigger names differ, list them and delete the Qimela-related trigger IDs:

```bash
gcloud builds triggers list --region="${REGION}"
gcloud builds triggers delete <TRIGGER_ID_OR_NAME> --region="${REGION}"
```

### 6. Delete Artifact Registry Images and Repository

Deleting the repository removes both `api` and `web` images.

```bash
gcloud artifacts repositories delete qimela \
  --location="${REGION}"
```

### 7. Delete Cloud SQL

The Cloud SQL instance was created with deletion protection. Disable it first.

```bash
gcloud sql instances patch qimela-a \
  --no-deletion-protection

gcloud sql instances delete qimela-a
```

If you need a final backup before deletion, export the database first.

### 8. Delete Secrets

The deployment docs reference these secrets:

```bash
for SECRET in \
  DATABASE_URL \
  JWT_PRIVATE_KEY \
  JWT_PUBLIC_KEY \
  RESEND_API_KEY \
  CORS_ORIGIN \
  FRONTEND_URL \
  SCHEDULER_SECRET \
  REQUIRE_EMAIL_VERIFICATION \
  IMAGEKIT_PUBLIC_KEY \
  IMAGEKIT_PRIVATE_KEY \
  IMAGEKIT_URL_ENDPOINT
do
  gcloud secrets delete "${SECRET}" --quiet
done
```

### 9. Delete Service Account

```bash
gcloud iam service-accounts delete \
  "qimela-run@${PROJECT_ID}.iam.gserviceaccount.com"
```

Project-level IAM bindings attached to this service account are removed with the service account. If you keep the project, review any remaining Qimela-specific IAM bindings:

```bash
gcloud projects get-iam-policy "${PROJECT_ID}" \
  --flatten="bindings[].members" \
  --filter="bindings.members:qimela OR bindings.members:cloudbuild" \
  --format="table(bindings.role, bindings.members)"
```

### 10. Delete VPC Peering and Networking

Delete the Private Service Access peering before deleting the reserved range and VPC.

```bash
gcloud services vpc-peerings delete \
  --service=servicenetworking.googleapis.com \
  --network=qimela-vpc

gcloud compute addresses delete google-managed-services-qimela-vpc \
  --global

gcloud compute networks subnets delete qimela-subnet \
  --region="${REGION}"

gcloud compute networks delete qimela-vpc
```

### 11. Optional: Disable APIs

Only disable APIs if nothing else in the project uses them.

```bash
gcloud services disable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com
```

## Verification

Run these checks after cleanup:

```bash
gcloud run services list --region="${REGION}"
gcloud sql instances list
gcloud artifacts repositories list --location="${REGION}"
gcloud scheduler jobs list --location="${REGION}"
gcloud secrets list
gcloud compute networks list --filter="name:qimela-vpc"
gcloud builds triggers list --region="${REGION}"
```

For a complete cleanup, these commands should show no Qimela resources. If you deleted the whole project, verify its lifecycle state:

```bash
gcloud projects describe "${PROJECT_ID}"
```
