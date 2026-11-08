# Fictional clinic fixtures

`clinic.json` contains 12 invented adult patients, 24 encounters and 23 SOAP-style notes. Visits include preventive care, establishing care, symptom reviews, result discussions and follow-ups, with both open and signed encounters. Dates describe a fictional November 2026 clinic snapshot, not live activity. Phone numbers use the reserved 555-01xx fictional range, and street names are deliberately fictional.

Every seeded note explicitly identifies itself as a synthetic training record. These records are not medical advice or evidence of real patient care. The first Alex Morgan encounter is intentionally empty for the reviewer walkthrough.

Both browser demo and Firebase emulator seed use this file. Browser fixture version 2 adds missing IDs to existing local data without replacing user-created records or saved work. The emulator seed likewise creates missing documents without overwriting existing ones. Use **Reset demo** to restore the complete fixture state in the browser.

Audit and provider telemetry are not fabricated: those views populate only as the demo or real backend performs operations. Seeded clinical history is illustrative content, not operational activity.
