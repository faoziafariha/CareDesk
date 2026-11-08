import fixtures from "../fixtures/clinic.json";
import type {
  Patient,
  Encounter,
  Note,
  Audit,
  Metric,
  Attachment,
  User,
  Operation,
} from "./types";
const key = "caredesk-demo-v1";
const initial = () => ({
  patients: structuredClone(fixtures.patients) as Patient[],
  encounters: structuredClone(fixtures.encounters) as Encounter[],
  notes: structuredClone(fixtures.notes) as (Note & { encounterId: string })[],
  audit: [] as Audit[],
  metrics: [] as Metric[],
  attachments: [] as (Attachment & { patientId: string; url: string })[],
});
let state = (() => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || initial();
  } catch {
    return initial();
  }
})() as ReturnType<typeof initial>;
// Upgrade existing v1 browser demos by adding only missing fixture IDs.
// Preserve user-created records, edited demographics, notes and signed encounters.
const fixtureVersionKey = "caredesk-fixtures-version";
if (localStorage.getItem(fixtureVersionKey) !== "2") {
  const fresh = initial();
  for (const collection of ["patients", "encounters", "notes"] as const) {
    const existing = new Set(state[collection].map((record) => record.id));
    (state[collection] as { id: string }[]).push(
      ...fresh[collection].filter((record) => !existing.has(record.id)),
    );
  }
  localStorage.setItem(key, JSON.stringify(state));
  localStorage.setItem(fixtureVersionKey, "2");
}
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
export function resetDemo() {
  state = initial();
  localStorage.setItem(key, JSON.stringify(state));
}
export async function demoCall(user: User, op: Operation): Promise<any> {
  const p = state.patients.find((p) => p.id === op.patientId);
  const staff = ["admin", "clinician", "frontdesk"].includes(user.role);
  const clinical = ["admin", "clinician"].includes(user.role);
  const own = p?.patientUid === user.uid;
  const require = (ok: boolean) => {
    if (!ok) throw new Error("Your role does not have access to this action.");
  };
  const audit = () =>
    state.audit.unshift({
      id: id(),
      actor: user.uid,
      action: op.action,
      patientId: String(op.patientId || "â€”"),
      outcome: "success",
      createdAt: now(),
    });
  let result: unknown;
  switch (op.action) {
    case "listPatients":
      result = state.patients.filter((p) => staff || p.patientUid === user.uid);
      break;
    case "createPatient":
      require(staff);
      result = { ...(op.patient as Patient), id: id() };
      state.patients.push(result as Patient);
      break;
    case "getPatient":
      require(staff || own === true);
      result = p;
      break;
    case "listEncounters":
      require(staff || own === true);
      result = state.encounters.filter((e) => e.patientId === p?.id);
      break;
    case "createEncounter":
      require(clinical);
      result = {
        id: id(),
        patientId: p!.id,
        reason: String(op.reason),
        clinicianId: user.uid,
        status: "open",
        createdAt: now(),
      };
      state.encounters.unshift(result as Encounter);
      break;
    case "listNotes":
      require(clinical || own === true);
      require(state.encounters.some(e => e.id === op.encounterId && e.patientId === p?.id));
      result = state.notes.filter((n) => n.encounterId === op.encounterId);
      break;
    case "saveNote":
      require(clinical);
      require(
        state.encounters.some(
          (e) =>
            e.id === op.encounterId &&
            e.patientId === p?.id &&
            e.status === "open",
        ),
      );
      result = {
        id: id(),
        encounterId: String(op.encounterId),
        text: String(op.text),
        createdAt: now(),
        authorId: user.uid,
      };
      state.notes.push(result as Note & { encounterId: string });
      break;
    case "signEncounter":
      require(clinical);
      require(state.encounters.some(e => e.id === op.encounterId && e.patientId === p?.id && e.status === 'open'));
      require(state.notes.some(n => n.encounterId === op.encounterId));
      state.encounters = state.encounters.map((e) =>
        e.id === op.encounterId ? { ...e, status: "signed" } : e,
      );
      result = { ok: true };
      break;
    case "draftNote":
      require(clinical);
      result = {
        text: `Subjective\n${op.text}\n\nObjective\nNot documented.\n\nAssessment\nRequires clinician assessment.\n\nPlan\nRequires clinician review.`,
        provider: "local template",
      };
      break;
    case "listAudit":
      require(user.role === "admin");
      result = state.audit.slice(0, 100);
      break;
    case "listMetrics":
      require(user.role === "admin");
      result = state.metrics;
      break;
    case "setRole":
      require(user.role === "admin");
      throw new Error(
        "Role assignment requires Firebase mode. Demo roles are simulated.",
      );
    case "listAttachments":
      require(clinical || own === true);
      result = state.attachments.filter((a) => a.patientId === p?.id);
      break;
    case "uploadAttachment":
      require(clinical);
      result = {
        id: id(),
        patientId: p!.id,
        name: String(op.name),
        createdAt: now(),
        url: `data:application/pdf;base64,${op.base64}`,
      };
      state.attachments.push(result as (typeof state.attachments)[number]);
      break;
    case "getAttachment":
      require(clinical || own === true);
      result = {
        url: state.attachments.find(
          (a) => a.id === op.attachmentId && a.patientId === p?.id,
        )?.url,
      };
      break;
    default:
      throw new Error("Unknown operation");
  }
  audit();
  localStorage.setItem(key, JSON.stringify(state));
  return result;
}
