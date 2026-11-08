# CareDesk

**Deploy on Vercel:** follow [the deployment guide](docs/VERCEL.md). Included configuration: Vite, Node 22, build `npm run build:vercel`, output `dist`. No API keys are needed for the synthetic demo.

**Expanded care workspace:** profiles, care-task tracking, visit requests and scheduling, a searchable timeline with CSV export, and pharmacy directory filters. Fixtures include 12 patients, 8 pharmacies, 51 reports, 26 prescriptions, 26 interventions, 24 tasks and 24 appointments.

**New: pharmacy-led care network prototype.** In demo mode, explore patient reports, doctor prescriptions, pharmacist interventions, consent controls, and pharmacy registration with persistent drafts and super-admin review. These new screens use browser storage; SMS codes are explicitly simulated. See [care network scope and walkthrough](docs/CARE_NETWORK.md). The original authenticated Firebase clinic workflow remains separate.

A synthetic clinic workspace built with React, Vite, TypeScript, Node.js and Firebase. Designed as a small, reviewable full-stack portfolio project: patient records, encounter notes, clinician-reviewed AI drafts, access control and audit trails.

**Portfolio software. Synthetic data only. Not for clinical use. No claim of HIPAA compliance.**

## Try it in two minutes

Prerequisite: Node.js 22 (recommended; Functions deploys on Node 22).

```sh
npm install
npm run dev
```

Open the URL printed by Vite. No Firebase project or API key is needed for the default **browser demo**.

1. Open Alex Morgan. Open the wellness encounter.
2. Enter fictional observations, create a template draft, review and save it, then sign the encounter.
3. Switch to frontdesk: encounter metadata is visible, clinical notes are restricted.
4. Switch to patient: only Alex's linked record is visible.
5. Switch to admin: inspect the audit trail. AI operations is intentionally empty until real provider requests occur in Firebase mode.

The demo stores synthetic records in localStorage. Role switching is a simulation; it is not an authentication boundary. The local SOAP template makes **no LLM calls**. Reset demo clears this browser's records. The directory shows up to 50 records in Firebase mode; pagination is documented technical debt.

## What's implemented

| Area                      | Evidence                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| React / Vite / TypeScript | Responsive patient workspace, patient creation, encounters, immutable saved notes, signing, documents, admin views                                |
| Firebase                  | Auth email/password, custom claims, audited v2 callable, Firestore subcollections, Storage PDFs, Hosting and App Check                            |
| Security                  | Server authorization on every operation, current claims lookup, default-deny direct database/file access, Zod validation, distributed rate limits |
| Encryption                | Phone/address encrypted with AES-256-GCM, fresh IVs, authenticated record/field context, Secret Manager binding                                   |
| LLM routing               | OpenRouter primary, OpenAI fallback, 12-second provider timeouts, best-effort identifier redaction, prompt-free usage telemetry                   |
| Engineering               | Unit and rules tests, CI, gated deployment workflow, ADR, threat model, debt register, AI tool conventions                                        |

## Local Firebase mode

Install Java 21+ for emulators and use Node 22. Keep default demo mode for the simplest review.

```sh
node scripts/init-emulators.mjs
```

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_MODE=firebase
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=demo-caredesk.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-caredesk
VITE_FIREBASE_STORAGE_BUCKET=demo-caredesk.appspot.com
VITE_FIREBASE_APP_ID=demo-app
VITE_USE_EMULATORS=true
```

Start `npm run emulators`. In a second terminal, set these environment variables and run `npm run seed`:

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
npm run seed
```

On macOS/Linux: `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed`.

Restart `npm run dev` after changing Vite variables. Accounts: `admin@caredesk.example`, `clinician@caredesk.example`, `frontdesk@caredesk.example`, `patient@caredesk.example`; emulator-only password `DemoOnly!2026`.

The seed refuses to run without emulator variables. Keep `.secret.local` stable while using persisted emulator records or their encrypted fields will not decrypt. AI is unavailable until local provider secrets are supplied. Signed Storage URLs require real service-account signing capabilities; use the browser demo for local PDF review or test signed downloads in a staging Firebase project.

## Build and verify

```sh
npm run typecheck
npm test
npm run build
npm run test:rules
```

Rules tests prove **all** direct SDK paths are denied, including frontdesk note reads, patient own-record reads, forged audit writes and file access. Own-record access is deliberately a callable responsibility, rather than a Firestore rules exception. Unit tests cover that policy, encryption tampering, cross-record ciphertext swapping, validation and router failure behavior. See `docs/TESTING.md` for verification scope and staging checks.

## Deploy

See [deployment guide](docs/DEPLOYMENT.md). You can deploy the browser demo to static hosting immediately after `npm run build`, or configure a Firebase project for authenticated mode. The full backend requires project credentials, Secret Manager values and billing configuration; none are included in the repository.

## Engineering decisions

- [Architecture and data model](docs/ARCHITECTURE.md)
- [Threat model and limitations](docs/THREAT_MODEL.md)
- [Callable-only data access ADR](docs/adr/0001-audited-boundary.md)
- [Technical debt and priorities](docs/TECHDEBT.md)
- [Tests and review script](docs/TESTING.md)
- [Application and interview notes](docs/PORTFOLIO.md)

## AI-assisted development

This initial scaffold was produced with Codex from the supplied project brief. `AGENTS.md` records constraints for subsequent AI-assisted changes. Explicit design decisions in this version: deny direct patient reads to preserve audit coverage; preserve redaction placeholders instead of restoring identifiers in provider output; use a labeled local template rather than inventing provider metrics; report missing cost as unavailable rather than estimating it as zero. Do not claim personal authorship, production experience, or use of Cursor/Claude unless accurate. Review and understand the code before putting it on your CV.

## License

MIT; see LICENSE. No third-party clinic or employer affiliation is implied.
