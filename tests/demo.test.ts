import { beforeAll, beforeEach, it, expect, vi } from "vitest";
import type { User } from "../src/types";
const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) || null,
  setItem: (k: string, v: string) => memory.set(k, v),
});
let demo: typeof import("../src/demo");
const user = (role: User["role"]): User => ({
  uid: `demo-${role}`,
  role,
  email: `${role}@example.test`,
});
beforeAll(async () => {
  demo = await import("../src/demo");
});
beforeEach(() => demo.resetDemo());
it("runs the reviewer note workflow and locks signed encounters", async () => {
  const u = user("clinician");
  const draft = await demo.demoCall(u, {
    action: "draftNote",
    patientId: "p-1001",
    text: "Fictional wellness visit",
  });
  expect(draft.provider).toBe("local template");
  await demo.demoCall(u, {
    action: "saveNote",
    patientId: "p-1001",
    encounterId: "e-1001",
    text: draft.text,
  });
  await demo.demoCall(u, {
    action: "signEncounter",
    patientId: "p-1001",
    encounterId: "e-1001",
  });
  await expect(
    demo.demoCall(u, {
      action: "saveNote",
      patientId: "p-1001",
      encounterId: "e-1001",
      text: "late edit",
    }),
  ).rejects.toThrow();
  const notes = await demo.demoCall(u, {
    action: "listNotes",
    patientId: "p-1001",
    encounterId: "e-1001",
  });
  expect(notes).toHaveLength(1);
  const events = await demo.demoCall(user("admin"), { action: "listAudit" });
  expect(events.some((e: { action: string }) => e.action === "saveNote")).toBe(
    true,
  );
});
it("limits patient scope and rejects frontdesk note reads", async () => {
  const records = await demo.demoCall(user("patient"), {
    action: "listPatients",
  });
  expect(records.map((p: { id: string }) => p.id)).toEqual(["p-1001"]);
  await expect(
    demo.demoCall(user("patient"), {
      action: "getPatient",
      patientId: "p-1002",
    }),
  ).rejects.toThrow();
  await expect(demo.demoCall(user('patient'),{action:'listNotes',patientId:'p-1001',encounterId:'e-2002'})).rejects.toThrow();
  await expect(
    demo.demoCall(user("frontdesk"), {
      action: "listNotes",
      patientId: "p-1001",
      encounterId: "e-1001",
    }),
  ).rejects.toThrow();
});
