# Verification and review

`npm test` exercises encryption integrity, per-record AAD, role policies, validation, identifier redaction, provider fallback and telemetry failure. `npm run test:rules` starts Firestore/Storage emulators and tests SDK denials for all four roles and unauthenticated reads. `npm run typecheck` compiles UI and Functions. `npm run build` produces the Hosting bundle.

Rules tests are intentionally negative because all authorized access passes through Functions. They do **not** prove that the callable enforces its full authorization matrix; policy unit tests cover the extracted predicates only. Full callable integration tests are tracked P1 debt.

Before publishing a full authenticated demo, perform in staging:

1. Sign in separately as all four roles; verify the architecture matrix, including direct callable attempts with another patient's IDs.
2. Invoke without Auth and without App Check; expect rejection. Set a valid token with an obsolete role; server should use the current role.
3. Open/list a patient as authorized; verify success audit events and record IDs. Attempt note access as frontdesk; verify denial audit.
4. Save a note and sign; attempt another write and race save/sign from two tabs. Signed encounters must remain locked.
5. Break primary provider credentials to exercise fallback. Break both; draft fails without saving a note. Metrics must contain attempts but no clinical text.
6. Upload a fictional PDF. Reject bad magic, oversized payload and forbidden role. Issue a download link, then verify it expires after 60 seconds.
7. Change a role as admin. Verify self-role changes fail, target refresh is revoked, and current role is used server-side.
8. Run 61 ordinary operations or seven drafts in a minute and observe resource-exhausted responses.
9. Check mobile layout, keyboard navigation, readable errors and screen reader labels. The modal still needs focus trapping before a production accessibility claim.

CI executes automated checks; the staging procedure remains manual. No claim of end-to-end or clinical validation is made.
