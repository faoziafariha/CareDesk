# CareDesk — Vercel-ready release

Packaged November 8, 2026.

## Included in this update

- Original React/Vite/TypeScript clinic workspace and separate Firebase backend source.
- Expanded pharmacy-led browser demo: 12 patient profiles, 8 pharmacies, 51 patient updates, 26 prescription records, 26 interventions, 24 care tasks and 24 appointments.
- Care overview, care plans and task status tracking, visit requests/confirmation/completion/cancellation, record search, pharmacy directory filters and timeline CSV export.
- Fixture migration preserves saved entries, approval decisions and revoked consent.
- Vercel configuration, deterministic demo build, Node 22 metadata and a deployment guide in docs/VERCEL.md.

The new network workflows are local browser simulations. OTP is visible demo verification; no SMS, email, external prescriptions, calendar invitations or clinical sync are sent. Visitor data is not shared across devices. Only fictional records are allowed.

## Deploy

Upload the contents of this caredesk folder to GitHub, then import the repository into Vercel. Select Vite, Node 22, build command npm run build:vercel, output dist. No environment variables are needed.

See docs/VERIFICATION.md for executed checks and remaining limits. No GitHub push or live deployment was performed as part of packaging this release.
