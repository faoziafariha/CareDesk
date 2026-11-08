# Deploy CareDesk

## Option A — reviewer-friendly static demo

```sh
npm ci
npm run build
```

Deploy `dist/` to Firebase Hosting (or any static host). Leave `VITE_MODE` unset or `demo`. This has no backend, authentication or API usage; the banner states browser-local demo mode. For Firebase Hosting, sign in with `npx firebase login`, select a project with `npx firebase use --add`, then run `npx firebase deploy --only hosting`. Never publish a demo as if it were a protected clinical system.

## Option B — full Firebase stack

1. Create a dedicated Firebase project, enable billing for Functions, and choose Firestore and Storage locations. Enable Email/Password in Auth. Configure spending alerts and provider budgets. Use Node 22 locally.
2. Run `npx firebase login` and `npx firebase use --add`. Pick the dedicated project. Do not use the emulator-only `demo-caredesk` project ID for deployment.
3. Register a web app. Copy `.env.example` to `.env.local`, set `VITE_MODE=firebase`, `VITE_USE_EMULATORS=false`, and fill all Firebase web configuration fields. These identify the app and are not server credentials.
4. Register reCAPTCHA v3 in Firebase App Check, authorize your Hosting domain, and set `VITE_RECAPTCHA_SITE_KEY`. App Check enforcement is enabled for deployed callables. Never enable emulator mode in a production bundle.
5. Generate a random encryption key locally using `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Store it with `npx firebase functions:secrets:set FIELD_ENCRYPTION_KEY`. Do not commit the value. Back up the key securely: losing it makes encrypted fields unreadable. Key rotation is not yet implemented.
6. Set `OPENROUTER_API_KEY` and `OPENAI_API_KEY` via `npx firebase functions:secrets:set NAME`. Both secrets must exist for deployment; an empty/disabled provider is skipped at runtime. Do not put them in Vite variables. Configure restricted-budget API keys. To override model defaults, copy `functions/.env.example` to `functions/.env` and confirm the chosen models with the provider.
7. Run `npm run typecheck`, `npm test`, `npm run test:rules`, then `npm run deploy`. This builds the UI and Functions and deploys rules, indexes, functions and Hosting. Wait for the index to finish building before testing patient sign-in.
8. Create initial users in the Firebase Auth console. For the first administrator only, obtain local Application Default Credentials (`gcloud auth application-default login`) and run `node scripts/bootstrap-admin.mjs YOUR_PROJECT_ID AUTH_UID`. This is a privileged operator bootstrap, not a public endpoint. Keep credentials outside the repository. Subsequent roles can be assigned in the admin audit page.
9. Create synthetic patients through the UI. To let a patient account view a record, assign that Auth user the patient role, then create its record as admin with the linked UID. No production seed script is provided.
10. Exercise each role in staging following TESTING.md, including App Check rejection, signing races and signed file expiry. Verify the Functions runtime service account can sign download URLs (`iam.serviceAccounts.signBlob` on the signing account); grant the narrow service-account permission only if needed, rather than broad project roles.

## GitHub

From this folder, initialize Git, review `git status` for secrets, then push to a repository you own. Include the lockfile. Never commit `.env.local`, `functions/.env`, `.secret.local`, service-account JSON or downloaded patient documents.

CI runs builds, unit tests and emulator rules tests on pushes and PRs. Deployment is a separate explicit workflow. To enable it, create a protected GitHub `firebase` environment with required reviewers, configure the `FIREBASE_PROJECT_ID` repository variable and the `FIREBASE_SERVICE_ACCOUNT` environment secret (JSON service account with only the deployment permissions your project requires). Add Firebase web values as GitHub environment variables matching `.env.example`; add `VITE_RECAPTCHA_SITE_KEY` too. Production server secrets must already exist in Firebase Secret Manager. Prefer OIDC/Workload Identity Federation over a long-lived key for a real team; tracked debt explains this tradeoff.

The workflow supports a demo-only Hosting preview channel and a full manual production deploy. Previews build in demo mode and cannot reach your patient backend. Full deploys use Firebase mode. Automatic production deploys on every main merge are deliberately deferred until staging integration tests and environment protections are in place.

## Troubleshooting

- Permission denied in Firebase mode: check current custom claims, patient linkage and sign out/in. Client-selected role controls exist only in demo mode.
- App Check errors: confirm site key/domain and production configuration. Do not disable enforcement to make a production demo work.
- Decryption errors after changing the key: restore the original key. Re-encrypting requires an explicit versioned migration.
- Empty metrics: local template drafts do not call providers. Check provider budgets/keys and model availability in full mode.
- PDF download signing failure: verify staging service-account signing permission. Local emulators generally cannot sign URLs with user credentials.
