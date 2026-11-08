export type Role =
  "admin" | "clinician" | "frontdesk" | "patient" | "pharmacist";
export type Patient = {
  id: string;
  name: string;
  dob: string;
  phone: string;
  address: string;
  patientUid?: string;
  createdAt?: string;
};
export type Encounter = {
  id: string;
  patientId: string;
  reason: string;
  clinicianId: string;
  status: "open" | "signed";
  createdAt: string;
};
export type Note = {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
};
export type Audit = {
  id: string;
  actor: string;
  action: string;
  patientId: string;
  outcome: string;
  createdAt: string;
};
export type Metric = {
  id: string;
  provider: string;
  model: string;
  latencyMs: number;
  tokens: number;
  costUsd: number | null;
  status: string;
  createdAt: string;
};
export type Attachment = { id: string; name: string; createdAt: string };
export type User = { uid: string; role: Role; email: string };
export type Operation = { action: string; [key: string]: unknown };
