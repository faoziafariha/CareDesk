import { beforeEach, it, expect, vi } from "vitest";
import {
  initialNetwork,
  updateNetwork,
  canAccessNetwork,
  issueDemoCode,
  checkDemoCode,
  readDraft,
  writeDraft,
  saveNetwork,
  readNetwork,
  type RegistrationDraft,
} from "../src/network/store";
import type { User } from "../src/types";
const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) || null,
  setItem: (k: string, v: string) => memory.set(k, v),
});
const user = (role: User["role"]): User => ({
  uid: `demo-${role}`,
  role,
  email: `${role}@example.test`,
});
beforeEach(() => memory.clear());
const draft: RegistrationDraft = {
  name: "Maple Demo Pharmacy",
  contact: "Robin Example",
  email: "care@maple.example",
  phone: "+1 202-555-0155",
  address: "5 Fictional Walk",
  license: "DEMO-PH-2000",
};
it("restores registration field values after a form remount and keeps portal drafts separate", () => {
  writeDraft("registration:demo-pharmacist", draft);
  expect(
    readDraft("registration:demo-pharmacist", { ...draft, name: "" }),
  ).toEqual(draft);
  expect(
    readDraft("registration:demo-admin", { ...draft, name: "" }).name,
  ).toBe("");
  expect(readDraft("missing-challenge", null)).toBeNull();
});
it("rejects wrong, expired, over-attempted and changed-phone codes, and enforces resend cooldown", () => {
  const challenge = issueDemoCode(draft.phone, null, 1000);
  expect(() => checkDemoCode(challenge, "000000", draft.phone, 2000)).toThrow(
    "Incorrect",
  );
  expect(() =>
    checkDemoCode(challenge, challenge.code, "+1 202-555-0199", 2000),
  ).toThrow("current phone");
  expect(() =>
    checkDemoCode(challenge, challenge.code, draft.phone, challenge.expiresAt),
  ).toThrow("expired");
  expect(() =>
    checkDemoCode(
      { ...challenge, attempts: 5 },
      challenge.code,
      draft.phone,
      2000,
    ),
  ).toThrow("limit");
  expect(() => issueDemoCode(draft.phone, challenge, 2000)).toThrow("resend");
  expect(
    checkDemoCode(challenge, challenge.code, draft.phone, 2000).verified,
  ).toBe(true);
});
it("adds a pending pharmacy with reference and updates active counts only after admin approval", () => {
  const initial = initialNetwork();
  const c = issueDemoCode(draft.phone, null);
  const challenge = checkDemoCode(c, c.code, draft.phone);
  const pending = updateNetwork(initial, user("pharmacist"), {
    type: "register",
    draft,
    challenge,
  });
  expect(pending.pharmacies).toHaveLength(initial.pharmacies.length + 1);
  expect(pending.pharmacies[0].status).toBe("pending");
  expect(pending.pharmacies[0].reference).toMatch(/^CD-/);
  expect(pending.pharmacies.filter((p) => p.status === "active")).toHaveLength(
    initial.pharmacies.filter(p=>p.status === "active").length,
  );
  expect(() =>
    updateNetwork(pending, user("pharmacist"), {
      type: "approve",
      pharmacyId: pending.pharmacies[0].id,
    }),
  ).toThrow();
  const approved = updateNetwork(pending, user("admin"), {
    type: "approve",
    pharmacyId: pending.pharmacies[0].id,
  });
  expect(approved.pharmacies.filter((p) => p.status === "active")).toHaveLength(
    initial.pharmacies.filter(p=>p.status === "active").length + 1,
  );
  expect(() =>
    updateNetwork(approved, user("admin"), {
      type: "approve",
      pharmacyId: pending.pharmacies[0].id,
    }),
  ).toThrow();
  expect(() =>
    updateNetwork(pending, user("admin"), {
      type: "register",
      draft,
      challenge,
    }),
  ).toThrow("already registered");
  saveNetwork(approved);
  expect(readNetwork().pharmacies).toEqual(approved.pharmacies);
});
it("revokes pharmacy access immediately and keeps physician prescriptions separate from interventions", () => {
  const original = initialNetwork();
  expect(canAccessNetwork(original, user("pharmacist"), "p-1001")).toBe(true);
  expect(canAccessNetwork(original, user("pharmacist"), "p-1003")).toBe(false);
  expect(canAccessNetwork(original, user("patient"), "p-1002")).toBe(false);
  expect(canAccessNetwork(original, user("admin"), "p-1001")).toBe(false);
  const intervention = updateNetwork(original, user("pharmacist"), {
    type: "intervene",
    patientId: "p-1001",
    category: "Patient education",
    note: "Synthetic follow-up.",
  });
  expect(intervention.prescriptions).toEqual(original.prescriptions);
  expect(() =>
    updateNetwork(original, user("pharmacist"), {
      type: "prescribe",
      patientId: "p-1001",
      medication: "X",
      instructions: "Y",
    }),
  ).toThrow();
  const revoked = updateNetwork(intervention, user("patient"), {
    type: "consent",
    patientId: "p-1001",
    provider: true,
    pharmacy: false,
  });
  expect(canAccessNetwork(revoked, user("pharmacist"), "p-1001")).toBe(false);
  expect(canAccessNetwork(revoked, user("clinician"), "p-1001")).toBe(true);
  expect(() =>
    updateNetwork(revoked, user("pharmacist"), {
      type: "intervene",
      patientId: "p-1001",
      category: "Follow-up",
      note: "Blocked",
    }),
  ).toThrow();
});
it("allows patient reports and doctor prescriptions only in their scoped portal", () => {
  const initial = initialNetwork();
  const report = updateNetwork(initial, user("patient"), {
    type: "report",
    patientId: "p-1001",
    kind: "Wellbeing",
    value: "Feeling well",
    note: "",
  });
  expect(report.reports).toHaveLength(initial.reports.length + 1);
  expect(() =>
    updateNetwork(initial, user("patient"), {
      type: "report",
      patientId: "p-1002",
      kind: "X",
      value: "Y",
      note: "",
    }),
  ).toThrow();
  const prescription = updateNetwork(initial, user("clinician"), {
    type: "prescribe",
    patientId: "p-1001",
    medication: "Demo medication C",
    instructions: "Training only",
  });
  expect(prescription.prescriptions[0].prescriber).toBe("demo-clinician");
});
