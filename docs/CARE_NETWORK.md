# Pharmacy-led care network prototype

The public [MediCentrix website](https://medicentrix.com/) and the user's workflow/bug notes informed this original CareDesk interface. The public reference describes patient access to health information and pharmacy-led care; its authenticated registration/admin portals were not accessible for inspection. No MediCentrix source, logo, or proprietary portal UI was copied, and this project is not affiliated with it.

## Delivery scope

The new network is a **browser-local, synthetic-data prototype**, available only in demo mode. The original Firebase clinic backend remains separate. Network role switching, OTP verification, consent and event history demonstrate workflows; they do not establish production authentication, encryption, clinical access control or SMS delivery. All network data is in localStorage. Do not enter real information.

## Screens

- **Care network:** patient/doctor/pharmacy journey, role-specific counts and an original responsive dashboard.
- **Pharmacy registration:** pharmacist or super admin enters organization details; draft survives tab switches, page changes and reloads. A visibly labeled demo verification code expires in ten minutes, can be resent after thirty seconds and permits five attempts. Changing the phone invalidates the challenge. Successful submission shows a unique receipt, adds one pending registration and retains the directory entry. Duplicate email/license submissions are rejected.
- **Super admin review:** approve/reject pending registrations; derive total/active/pending counts directly from saved state. The confirmation explicitly says no email/SMS was sent. Admin network activity records actual prototype actions rather than fabricated history.
- **Care coordination:** patients record fictional self-reports; doctors add prescription records; pharmacists document and resolve interventions. A pharmacy cannot edit a doctor's prescription. New prescription entries are not sent to a dispenser and are not electronic prescriptions.
- **Consent & privacy:** the example patient controls provider and Northstar pharmacy sharing. Revocation hides records and blocks future simulated actions, including in another open tab via the storage event.

The example pharmacy identity is fixed to Northstar (`ph-1001`). Registration does not switch an actor into the newly registered organization. A multi-organization identity and membership model is required for production onboarding.

Health scores are not calculated. Medication adherence is unknown because there is no dispensing history. BestRx, FHIR, wearable data, insurance/billing, remote monitoring, legal BAAs and external notifications are not integrated. No clinical effectiveness or regulatory compliance is claimed.

## Reproduce the reported defects and check the prototype behavior

1. Select **Pharmacy** in View as. Open Pharmacy registration and enter fictional organization details.
2. Switch browser tabs and return. Reload the page and reopen registration: each saved field remains.
3. Generate a code. The UI explains that no SMS is sent and displays the local demo code, destination, expiry and resend timer. An incorrect or expired code gives a specific error.
4. Submit the correct code. A receipt and pending status appear. Total registered increases by one; active does not increase yet.
5. Switch to **Super admin**, open Pharmacy registration and approve that entry. Active increases by one and pending decreases by one. The directory retains the receipt and verified contact details entered in the simulation.
6. Select **Patient**, add a self-report, and revoke pharmacy sharing. Switch to Pharmacy: Alex's record is absent. Re-enable sharing as Patient, then add an intervention as Pharmacy.
7. Select Doctor and inspect the prescription. The intervention did not change it.

## Implementation

- `src/network/store.ts`: typed domain state, validation, draft persistence, demo challenge lifecycle and role/consent action checks.
- `src/network/CareNetwork.tsx`: dashboard, registration, directory, care record and privacy screens.
- `src/network/network.css`: responsive network design.
- `tests/network.test.ts`: draft restoration, code lifecycle, duplicate registration, counts, approval permissions, prescription separation and revocation behavior.

## Next steps for a deployed production workflow

Move every network operation to authenticated, audited Functions and Firestore transactions; introduce tenant memberships and per-patient/per-provider consent; encrypt sensitive data according to a reviewed threat model; replace browser verification with a server-controlled SMS provider or Firebase Phone Auth; enforce server-side code expiry/attempts/quotas; implement delivery callbacks and a transactional notification outbox; validate pharmacy credentials; implement genuine consent/legal agreement handling with counsel; add staging browser/integration tests and data retention rules. Do not expose this local prototype as a secure real-data portal.

## Expanded dataset and workflow update

The browser fixture set now includes 8 pharmacies, 51 patient reports, 26 prescription records, 26 interventions, 12 coordination profiles, 24 care tasks and 24 appointments. Care coordination adds care overview, care plans, appointments and care timeline tabs; the original three record tabs remain available. Visitors can track task status, request/schedule visits, confirm/complete/cancel permitted appointments and export a filtered fictional timeline. Administrators can search and filter pharmacy registrations. Browser fixture revision 2 adds missing records without replacing saved consent or registration decisions. These features remain browser-local simulations; appointments do not send invitations and task completion is not a health score.
