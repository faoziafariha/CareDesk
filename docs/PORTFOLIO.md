# Presenting CareDesk honestly

## Suggested repository description

Synthetic clinic workspace with React/Vite, TypeScript, Firebase callables, audited access, AES-GCM contact fields and an OpenRouter/OpenAI note-drafting gateway.

## CV bullet — use after you can explain and demonstrate it

Built CareDesk, a synthetic clinic app using React, Vite, TypeScript and Firebase, with server-enforced roles, audited patient access, encrypted contact fields, clinician-reviewed AI note drafts with provider fallback, and automated unit/security-rules checks.

Do not claim HIPAA compliance, production healthcare deployment or operational experience you do not have. Distinguish the browser demo from the deployed authenticated backend. Add the live URL only after you have tested it.

## Three-minute walkthrough

- 0:00: Explain the patient/encounter/note model and the synthetic-only boundary.
- 0:30: Open a patient, add an encounter, draft/review/save a note and sign it.
- 1:15: Show frontdesk restrictions and patient own-record scope.
- 1:45: Show audit events and explain why read auditing uses callables rather than write triggers.
- 2:15: Open the router code: timeout, fallback, prompt-free telemetry and nullable cost.
- 2:45: Show test results and TECHDEBT. Explain one pragmatic tradeoff and what you would ship next.

## Be ready to explain

Why Admin SDK bypasses rules; why a hidden button is not authorization; why GCM needs a fresh nonce and authenticated record context; why regex redaction is insufficient for PHI; why a failed response does not always mean a mutation did not happen; why an attempt success rate is not a request success rate; why current claims are checked instead of trusting a stale role token.

The supplied attachment summarized your CV but did not include a separate full CV. Tailor naming and your final application to your actual history.
