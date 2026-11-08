# Verification record

Verified on November 5, 2026 in the supplied Windows workspace.

- React TypeScript compilation: passed.
- Firebase Functions TypeScript compilation: passed.
- Vite production build: passed; bundled JS approximately 460 KB before gzip with the pharmacy-led network screens.
- Vitest unit/workflow/fixture tests: 16 passed across five files, including registration draft restoration, demo code lifecycle, approval/count transitions, consent revocation, prescription/intervention separation, fictional record linkage and cross-patient note access denial.
- Firestore and Storage emulator rules tests: 5 passed. Expected permission-denied messages are assertions of denied access, not test failures.
- Source formatted with Prettier.
- Browser checks passed on the running E: project at the default embedded-browser viewport: network layout, pharmacy form persistence after leaving/reopening the page, code generation/verification, registration receipt, admin approval counts and patient consent revocation. A synthetic Maple Demo Pharmacy registration was created and approved during QA; Alex's original sharing preference was restored after the revocation test.
- Browser screenshot saved as `CareDesk-network-preview.png` alongside the source ZIP.

Local verification used Node 24.18.0 and Java 20.0.2 with Firebase CLI 14. Production Functions and CI target Node 22; CI selects Java 21. Firebase CLI warned that Java below 21 will lose support in its next major release.

Not verified: every responsive breakpoint, full callable integration against Auth/Functions, provider calls using real keys, deployed App Check, IAM-based signed download URLs, or a live Firebase deployment. The new care-network module is demo-only: its production backend, SMS/email and external integrations are not implemented. No GitHub push was made. See CARE_NETWORK.md for scope and remaining production work.

The source contains no real patient information or server API keys. Demo role switching is a simulation and is labeled as such. Security controls in source are not a certification or HIPAA compliance claim.

Primary Firebase references consulted:

- [Callable Functions and authentication context](https://firebase.google.com/docs/functions/callable)
- [App Check enforcement for Functions](https://firebase.google.com/docs/app-check/cloud-functions)
- [Testing Firestore rules with emulators](https://firebase.google.com/docs/firestore/security/test-rules-emulator)

## Vercel-ready release — November 8, 2026

- Frontend TypeScript: passed.
- Firebase Functions TypeScript: passed.
- Exact Vercel build command (npm run build:vercel): passed. Output dist; bundled JavaScript about 520 KB before gzip. A nonfatal chunk-size warning remains.
- Unit/workflow tests: 19 passed across six files.
- Firestore/Storage emulator rules tests: 5 passed. Total automated tests: 24.
- The new tests cover fixture migration, goal ownership, appointment transitions, timeline consent scope and CSV formula neutralization. The pharmacy count test now derives its baseline from fixtures.
- Vercel configuration, Node 22 package/lock metadata and source-only release packaging added.

No live Vercel deployment, GitHub push or browser QA of the newest care-planning tabs was performed for this release. Earlier browser checks above apply to the prior network screens. Real provider/SMS integrations remain unconfigured; the public Vercel build is always the synthetic browser demo.
