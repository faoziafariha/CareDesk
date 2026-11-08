import networkFixtures from "../../fixtures/network.json";
import { z } from "zod";
import type { Role, User } from "../types";

export type Pharmacy = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  license: string;
  contact: string;
  status: "pending" | "active" | "rejected";
  createdAt: string;
  reference: string;
};
export type Consent = {
  patientId: string;
  pharmacy: boolean;
  provider: boolean;
  updatedAt: string;
};
export type Report = {
  id: string;
  patientId: string;
  kind: string;
  value: string;
  note: string;
  createdAt: string;
};
export type Prescription = {
  id: string;
  patientId: string;
  medication: string;
  instructions: string;
  prescriber: string;
  createdAt: string;
};
export type Intervention = {
  id: string;
  patientId: string;
  category: string;
  note: string;
  status: "open" | "resolved";
  author: string;
  createdAt: string;
};
export type NetworkEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
};
export type CareProfile = {
  patientId: string;
  careFocus: string;
  preferredContact: string;
  language: string;
  careCoordinator: string;
  careNote: string;
  enrolledAt: string;
  recordSource: string;
};
export type CareGoal = {
  id: string;
  patientId: string;
  title: string;
  description: string;
  status: "planned" | "in-progress" | "completed";
  dueDate: string;
  createdAt: string;
  author: string;
};
export type Appointment = {
  id: string;
  patientId: string;
  title: string;
  mode: "Video" | "Telephone" | "In person";
  scheduledAt: string;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  note: string;
  createdAt: string;
  author: string;
};
export type NetworkState = {
  version: 1;
  fixtureRevision: number;
  profiles: CareProfile[];
  goals: CareGoal[];
  appointments: Appointment[];
  pharmacies: Pharmacy[];
  consents: Consent[];
  reports: Report[];
  prescriptions: Prescription[];
  interventions: Intervention[];
  events: NetworkEvent[];
};
export const NETWORK_KEY = "caredesk-network-v1";
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
export function initialNetwork(): NetworkState {
  return structuredClone(networkFixtures) as NetworkState;
}
export function upgradeNetwork(saved: NetworkState): NetworkState {
  if ((saved.fixtureRevision || 1) >= 2) return saved;
  const fresh = initialNetwork();
  const next = structuredClone(saved);
  for (const collection of [
    "pharmacies",
    "reports",
    "prescriptions",
    "interventions",
    "goals",
    "appointments",
  ] as const) {
    const rows = next[collection] || [];
    const ids = new Set(rows.map((row) => row.id));
    (next[collection] as { id: string }[]) = [
      ...rows,
      ...fresh[collection].filter((row) => !ids.has(row.id)),
    ];
  }
  const consentIds = new Set(next.consents.map((c) => c.patientId));
  next.consents.push(
    ...fresh.consents.filter((c) => !consentIds.has(c.patientId)),
  );
  next.profiles = fresh.profiles;
  next.fixtureRevision = 2;
  return next;
}
export function readNetwork(): NetworkState {
  try {
    const saved = JSON.parse(localStorage.getItem(NETWORK_KEY) || "null");
    if (saved?.version === 1 && Array.isArray(saved.pharmacies)) {
      const upgraded = upgradeNetwork(saved);
      if (upgraded !== saved) saveNetwork(upgraded);
      return upgraded;
    }
  } catch {
    /* Recover from invalid demo storage. */
  }
  return initialNetwork();
}
export function saveNetwork(state: NetworkState) {
  localStorage.setItem(NETWORK_KEY, JSON.stringify(state));
}
export function readDraft<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return fallback === null ? (parsed as T) : { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
export function writeDraft(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
export function canAccessNetwork(
  state: NetworkState,
  user: User,
  patientId: string,
) {
  if (user.role === "patient")
    return user.uid === "demo-patient" && patientId === "p-1001";
  const consent = state.consents.find((c) => c.patientId === patientId);
  if (user.role === "clinician") return consent?.provider === true;
  if (user.role === "pharmacist")
    return (
      consent?.pharmacy === true &&
      state.pharmacies.some((p) => p.id === "ph-1001" && p.status === "active")
    );
  return false; // Network administrators manage organizations, not clinical decisions.
}
const pharmacyForm = z.object({
  name: z.string().trim().min(3).max(120),
  contact: z.string().trim().min(2).max(100),
  email: z.email().max(160),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d ()-]{10,22}$/, "Use a phone number with country code."),
  address: z.string().trim().min(5).max(200),
  license: z.string().trim().min(3).max(60),
});
export type RegistrationDraft = z.infer<typeof pharmacyForm>;
export function validateRegistration(input: RegistrationDraft) {
  const parsed = pharmacyForm.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return parsed.data;
}
export type Challenge = {
  code: string;
  phone: string;
  expiresAt: number;
  resendAt: number;
  attempts: number;
  verified: boolean;
};
export function issueDemoCode(
  phone: string,
  previous: Challenge | null,
  time = Date.now(),
): Challenge {
  if (previous && previous.resendAt > time)
    throw new Error(
      "Wait for the resend timer before requesting another code.",
    );
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  return {
    code: String(100000 + (random % 900000)),
    phone,
    expiresAt: time + 10 * 60 * 1000,
    resendAt: time + 30 * 1000,
    attempts: 0,
    verified: false,
  };
}
export function checkDemoCode(
  challenge: Challenge | null,
  code: string,
  phone: string,
  time = Date.now(),
): Challenge {
  if (!challenge || challenge.phone !== phone)
    throw new Error("Request a code for the current phone number.");
  if (challenge.expiresAt <= time)
    throw new Error("Code expired. Request a new code.");
  if (challenge.attempts >= 5)
    throw new Error(
      "Attempt limit reached. Request a new code after the cooldown.",
    );
  if (challenge.code !== code.trim())
    throw new Error("Incorrect code. Check the demo code shown below.");
  return { ...challenge, verified: true };
}
export type NetworkAction =
  | { type: "register"; draft: RegistrationDraft; challenge: Challenge }
  | { type: "approve" | "reject"; pharmacyId: string }
  | { type: "consent"; patientId: string; pharmacy: boolean; provider: boolean }
  | {
      type: "report";
      patientId: string;
      kind: string;
      value: string;
      note: string;
    }
  | {
      type: "prescribe";
      patientId: string;
      medication: string;
      instructions: string;
    }
  | { type: "intervene"; patientId: string; category: string; note: string }
  | { type: "resolve"; patientId: string; interventionId: string }
  | {
      type: "addGoal";
      patientId: string;
      title: string;
      description: string;
      dueDate: string;
    }
  | {
      type: "setGoalStatus";
      patientId: string;
      goalId: string;
      status: CareGoal["status"];
    }
  | {
      type: "bookAppointment";
      patientId: string;
      title: string;
      mode: Appointment["mode"];
      scheduledAt: string;
      note: string;
    }
  | {
      type: "setAppointmentStatus";
      patientId: string;
      appointmentId: string;
      status: Appointment["status"];
    };
export function updateNetwork(
  state: NetworkState,
  user: User,
  action: NetworkAction,
): NetworkState {
  const next = structuredClone(state);
  const allow = (ok: boolean) => {
    if (!ok)
      throw new Error(
        "This portal cannot perform that action, or patient consent is missing.",
      );
  };
  const text = (value: string, max = 2000) =>
    z.string().trim().min(1).max(max).parse(value);
  let target = "";
  if (action.type === "register") {
    allow(["admin", "pharmacist"].includes(user.role));
    const draft = validateRegistration(action.draft);
    allow(
      action.challenge.verified &&
        action.challenge.phone === draft.phone &&
        action.challenge.expiresAt > Date.now(),
    );
    if (
      next.pharmacies.some(
        (p) =>
          p.license.toLowerCase() === draft.license.toLowerCase() ||
          p.email.toLowerCase() === draft.email.toLowerCase(),
      )
    )
      throw new Error(
        "A pharmacy with this license or email is already registered.",
      );
    const pharmacyId = id();
    target = pharmacyId;
    next.pharmacies.unshift({
      ...draft,
      id: pharmacyId,
      status: "pending",
      createdAt: now(),
      reference: `CD-${pharmacyId.slice(0, 8).toUpperCase()}`,
    });
  } else if (action.type === "approve" || action.type === "reject") {
    allow(user.role === "admin");
    const pharmacy = next.pharmacies.find((p) => p.id === action.pharmacyId);
    if (!pharmacy) throw new Error("Registration not found.");
    allow(pharmacy.status === "pending");
    pharmacy.status = action.type === "approve" ? "active" : "rejected";
    target = pharmacy.id;
  } else if (action.type === "consent") {
    allow(
      user.role === "patient" &&
        user.uid === "demo-patient" &&
        action.patientId === "p-1001",
    );
    target = action.patientId;
    next.consents = next.consents.filter(
      (c) => c.patientId !== action.patientId,
    );
    next.consents.push({
      patientId: target,
      pharmacy: action.pharmacy,
      provider: action.provider,
      updatedAt: now(),
    });
  } else if (action.type === "report") {
    allow(
      user.role === "patient" && canAccessNetwork(next, user, action.patientId),
    );
    target = action.patientId;
    next.reports.unshift({
      id: id(),
      patientId: target,
      kind: text(action.kind, 60),
      value: text(action.value, 100),
      note: action.note.trim().slice(0, 1000),
      createdAt: now(),
    });
  } else if (action.type === "prescribe") {
    allow(
      user.role === "clinician" &&
        canAccessNetwork(next, user, action.patientId),
    );
    target = action.patientId;
    next.prescriptions.unshift({
      id: id(),
      patientId: target,
      medication: text(action.medication, 120),
      instructions: text(action.instructions),
      prescriber: user.uid,
      createdAt: now(),
    });
  } else if (action.type === "intervene") {
    allow(
      user.role === "pharmacist" &&
        canAccessNetwork(next, user, action.patientId),
    );
    target = action.patientId;
    next.interventions.unshift({
      id: id(),
      patientId: target,
      category: text(action.category, 80),
      note: text(action.note),
      status: "open",
      author: user.uid,
      createdAt: now(),
    });
  } else if (action.type === "resolve") {
    allow(
      user.role === "pharmacist" &&
        canAccessNetwork(next, user, action.patientId),
    );
    target = action.patientId;
    const item = next.interventions.find(
      (i) => i.id === action.interventionId && i.patientId === target,
    );
    if (!item) throw new Error("Intervention not found.");
    item.status = "resolved";
  }
  if (
    [
      "addGoal",
      "setGoalStatus",
      "bookAppointment",
      "setAppointmentStatus",
    ].includes(action.type)
  ) {
    if (!("patientId" in action)) throw new Error("Patient required.");
    allow(canAccessNetwork(next, user, action.patientId));
    target = action.patientId;
    if (action.type === "addGoal") {
      const dueDate = z.iso.date().parse(action.dueDate);
      next.goals.unshift({
        id: id(),
        patientId: target,
        title: text(action.title, 120),
        description: text(action.description, 1000),
        dueDate,
        status: "planned",
        author: user.uid,
        createdAt: now(),
      });
    } else if (action.type === "setGoalStatus") {
      const goal = next.goals.find(
        (g) => g.id === action.goalId && g.patientId === target,
      );
      if (!goal) throw new Error("Care goal not found.");
      goal.status = z
        .enum(["planned", "in-progress", "completed"])
        .parse(action.status);
    } else if (action.type === "bookAppointment") {
      const scheduledAt = z.iso.datetime().parse(action.scheduledAt);
      if (new Date(scheduledAt).getTime() <= Date.now())
        throw new Error("Choose a future appointment time.");
      next.appointments.unshift({
        id: id(),
        patientId: target,
        title: text(action.title, 120),
        mode: z.enum(["Video", "Telephone", "In person"]).parse(action.mode),
        scheduledAt,
        note: action.note.trim().slice(0, 1000),
        status: user.role === "patient" ? "requested" : "scheduled",
        author: user.uid,
        createdAt: now(),
      });
    } else if (action.type === "setAppointmentStatus") {
      const appointment = next.appointments.find(
        (a) => a.id === action.appointmentId && a.patientId === target,
      );
      if (!appointment) throw new Error("Appointment not found.");
      allow(
        appointment.status === "requested" ||
          appointment.status === "scheduled",
      );
      const status = z
        .enum(["scheduled", "completed", "cancelled"])
        .parse(action.status);
      allow(user.role !== "patient" || status === "cancelled");
      appointment.status = status;
    }
  }
  next.events.unshift({
    id: id(),
    actor: user.uid,
    action: action.type,
    target,
    createdAt: now(),
  });
  return next;
}
