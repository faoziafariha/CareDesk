# Deploy CareDesk on Vercel

This deployment serves the complete synthetic browser demo. No environment variables, Firebase project, SMS service or LLM keys are required. Network data is stored per visitor in localStorage and is not shared across devices. OTP is simulated. Vercel does not deploy this repository's separate Firebase Functions backend.

## GitHub

Extract the ZIP. Upload the **contents of the caredesk folder** so package.json, vercel.json, src and fixtures are at your repository root. Include package-lock.json. Exclude node_modules, dist, work, credentials and local environment files; .gitignore handles those.

For a new empty repository, run inside caredesk, replacing the URL with your own:

```sh
git init
git add .
git commit -m "Build CareDesk clinic and pharmacy demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

If your project already has Git history, retain its history and remote; commit and push the updated files instead of initializing again.

## Vercel

1. Choose **Add New → Project** and import your GitHub repository.
2. Framework preset: **Vite**.
3. Root directory: the folder containing package.json. Use the repository root if you uploaded the folder contents. If you uploaded the outer folder, select caredesk.
4. Node.js version: **22.x**.
5. The included vercel.json sets install command **npm ci**, build command **npm run build:vercel**, and output directory **dist**.
6. Add **no environment variables** for the demo. Click **Deploy**.

build:vercel forces synthetic demo mode so local Firebase configuration cannot accidentally change the public portfolio. It typechecks and builds only the frontend. The configuration includes SPA fallback rewrites and security response headers.

## Local check

With Node 22 installed:

```sh
npm ci
npm test
npm run build:vercel
```

Use npm run dev for local interactive development. Existing browser records upgrade with missing fixture IDs while preserving approvals, saved work and consent choices. A new deployment domain starts fresh because localStorage belongs to each origin.

## Latest demo contents

12 fictional patient profiles, 8 pharmacy fixtures, 51 patient updates, 26 prescription records, 26 interventions, 24 care tasks and 24 appointments. Your own saved entries are additional. Care coordination includes task status changes, visit requests/confirmation/cancellation, search, status filters and a combined timeline with CSV export. Generated CSV cells neutralize spreadsheet formula prefixes.

Health scores are not calculated and refill adherence remains unknown. No external pharmacy sync, email/SMS delivery, real prescription, calendar invitation or production care-network backend is connected. Never enter real patient data. The original Firebase clinic deployment is documented separately in DEPLOYMENT.md.

Configuration follows [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and [vercel.json reference](https://vercel.com/docs/project-configuration/vercel-json).
