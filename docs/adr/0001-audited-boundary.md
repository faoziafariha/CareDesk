# ADR 0001: Route all patient access through audited callables

Status: accepted.

Context: ordinary Firestore client reads do not trigger read events. Allowing direct patient reads while claiming every read is audited would be inaccurate. Field decryption and AI keys also belong on a trusted server.

Decision: deny all direct Firestore and Storage access. Every clinical action enters the authenticated, App Check-protected `clinic` callable, validates with Zod, checks current server role and patient ownership, and writes an audit event. Mutations use one batch/transaction for success events where possible. Storage access uses server validation and a short-lived signed URL.

Consequences: more callable latency and cost; no offline patient reads or live Firestore listeners; Admin SDK authorization requires careful tests. Rules tests assert a closed client perimeter; policy unit tests and future callable integration tests cover legitimate access. Audited URL issuance does not prove the subsequent file was downloaded; the bearer URL can be shared during its 60-second lifetime.

Alternative rejected: direct role-based Firestore reads plus write triggers. That design is useful for many apps but cannot satisfy application-level auditing of every patient read.
