# Technical debt

The new pharmacy-led care-network screens are a synthetic browser prototype. Their production backend, SMS/email delivery, tenant identities, consent enforcement and external integrations remain unimplemented; see [CARE_NETWORK.md](CARE_NETWORK.md). The original clinic Firebase backend is separate.

Priorities describe follow-up engineering, not capabilities already delivered.

| Priority           | Item                                                                    | Reason / next step                                                                                                  |
| ------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P0 before real use | Operational compliance, tenant/care-team isolation, MFA, release policy | Synthetic-only project; obtain independent security/legal review                                                    |
| P1                 | Callable integration tests against Auth/Functions emulators and staging | Unit policy tests + direct SDK rules tests do not prove complete callable wiring                                    |
| P1                 | Versioned encryption keys and migration                                 | Current v1 cipher format has no key-ID lookup or rotation tooling                                                   |
| P1                 | Malware scanning and upload quarantine                                  | PDF signature validation is insufficient for untrusted real files                                                   |
| P1                 | Distributed operation idempotency                                       | Retry after network loss can duplicate notes/encounters; file and role changes span services                        |
| P1                 | Staging signed URL test                                                 | Local Storage rules tests do not validate IAM signing or URL expiration                                             |
| P1                 | Role-change reconciliation / outbox                                     | Auth claim and Firestore mirror updates are not atomic; started event aids investigation                            |
| P1                 | API spend hard limits                                                   | Provider budgets, daily quota and account creation controls beyond per-minute throttles                             |
| P2                 | Cursor pagination and indexed audit filters                             | Current patient/encounter/note lists cap at 50; audit/metrics cap at 100; filtering is local to loaded audit events |
| P2                 | Stronger de-identification and structured output validation             | Best-effort patterns are not safe for real PHI; no semantic diagnosis verification                                  |
| P2                 | Amendments, demographic corrections, retention/deletion                 | Append-only notes are simple and auditable; lifecycle operations require explicit design                            |
| P2                 | OIDC deployments, preview teardown, dependency review                   | Manual protected workflow uses a service-account environment secret initially                                       |
| P2                 | Server test coverage and UI accessibility automation                    | Add race, denial-audit, real App Check, keyboard focus trap and browser workflow tests                              |
| P3                 | Rate-limit TTL, query index exemptions, aggregate metrics               | Avoid unbounded logs/counters and expensive growing operational queries                                             |
| P3                 | Bundle splitting and local fonts                                        | Firebase increases bundle weight; external fonts require network access                                             |

Shipping decision: keep one typed callable with a discriminated operation schema for this small app. Split operations into modules when scope grows. Demo and Firebase adapters intentionally differ in security; local demo cannot establish production security properties.
