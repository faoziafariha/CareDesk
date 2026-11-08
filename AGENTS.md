# CareDesk engineering conventions

- Synthetic records only. Do not add real patient data to fixtures, logs, prompts or screenshots.
- Authorize every operation in Functions. Admin SDK bypasses Firestore and Storage rules.
- Patient reads require durable audit logging before a response is returned. Mutations and their success events belong in one transaction or batch where possible.
- Never add browser provider keys, direct patient collection reads, or client-controlled roles.
- Keep the demo honestly labeled. Templates are not LLM calls; local role switching is not authentication.
- Signed encounters are immutable. Add amendments as a separate future design, never silently edit.
- Run npm run typecheck, npm test, npm run build, and npm run test:rules. Describe checks that could not run.
- Document architectural tradeoffs and unfinished controls in docs/TECHDEBT.md.
