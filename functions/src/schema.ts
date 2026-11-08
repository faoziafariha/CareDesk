import { z } from "zod";
const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
const patientId = { patientId: id };
const encounter = { ...patientId, encounterId: id };
export const operation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("listPatients") }),
  z.object({
    action: z.literal("createPatient"),
    patient: z.object({
      name: z.string().trim().min(2).max(100),
      dob: z.iso
        .date()
        .refine(
          (v) => v <= new Date().toISOString().slice(0, 10),
          "Future birth date",
        ),
      phone: z.string().trim().min(3).max(40),
      address: z.string().trim().min(2).max(200),
      patientUid: id.optional(),
    }),
  }),
  ...(["getPatient", "listEncounters", "listAttachments"] as const).map(
    (action) => z.object({ action: z.literal(action), ...patientId }),
  ),
  z.object({
    action: z.literal("createEncounter"),
    ...patientId,
    reason: z.string().trim().min(2).max(200),
  }),
  ...(["listNotes", "signEncounter"] as const).map((action) =>
    z.object({ action: z.literal(action), ...encounter }),
  ),
  ...(["saveNote", "draftNote"] as const).map((action) =>
    z.object({
      action: z.literal(action),
      ...encounter,
      text: z.string().trim().min(1).max(8000),
    }),
  ),
  ...(["listAudit", "listMetrics"] as const).map((action) =>
    z.object({ action: z.literal(action) }),
  ),
  z.object({
    action: z.literal("setRole"),
    uid: id,
    role: z.enum(["admin", "clinician", "frontdesk", "patient"]),
  }),
  z.object({
    action: z.literal("uploadAttachment"),
    ...patientId,
    name: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[\w .()-]+\.pdf$/i),
    base64: z
      .string()
      .max(1000000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  }),
  z.object({
    action: z.literal("getAttachment"),
    ...patientId,
    attachmentId: id,
  }),
]);
