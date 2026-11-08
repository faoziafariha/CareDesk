import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { randomUUID } from "node:crypto";
import { operation } from "./schema";
import {
  encrypt,
  decrypt,
  canRead,
  canReadNotes,
  redact,
  type Role,
} from "./security";
import { routeDraft } from "./llm";
initializeApp();
const db = getFirestore();
const encryptionKey = defineSecret("FIELD_ENCRYPTION_KEY");
const openrouter = defineSecret("OPENROUTER_API_KEY");
const openai = defineSecret("OPENAI_API_KEY");
const requireAccess = (ok: boolean) => {
  if (!ok)
    throw new HttpsError(
      "permission-denied",
      "This role cannot perform that action.",
    );
};
const stamp = () => new Date().toISOString();
const roleList = ["admin", "clinician", "frontdesk", "patient"];
export const clinic = onCall(
  {
    region: "us-central1",
    maxInstances: 5,
    timeoutSeconds: 60,
    memory: "256MiB",
    enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true",
    secrets: [encryptionKey, openrouter, openai],
  },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Sign in first.");
    const uid = request.auth.uid;
    // Read current server-side role, so a stale ID token cannot retain revoked access.
    const account = await getAuth().getUser(uid);
    const role = account.customClaims?.role as Role;
    requireAccess(roleList.includes(role));
    const parsed = operation.safeParse(request.data);
    if (!parsed.success)
      throw new HttpsError("invalid-argument", "Invalid request fields.");
    const op = parsed.data;
    const patientId = "patientId" in op ? op.patientId : "";
    const audit = (outcome: string, extra: Record<string, unknown> = {}) =>
      db
        .collection("auditLogs")
        .add({
          actor: uid,
          action: op.action,
          patientId,
          outcome,
          createdAt: stamp(),
          source: request.app?.appId || "emulator",
          ...extra,
        });
    try {
      // Distributed per-user fixed window. No process-local counters.
      await db.runTransaction(async (tx) => {
        const ref = db.doc(`rateLimits/${uid}`);
        const snap = await tx.get(ref);
        const old = snap.data();
        const window = Math.floor(Date.now() / 60000);
        const count = old?.window === window ? old.count : 0;
        if (count >= 60)
          throw new HttpsError(
            "resource-exhausted",
            "Too many requests. Retry in a minute.",
          );
        tx.set(ref, {
          window,
          count: count + 1,
          expiresAt: new Date(Date.now() + 120000),
        });
      });
      const clinical = ["admin", "clinician"].includes(role);
      const staff = ["admin", "clinician", "frontdesk"].includes(role);
      const patientRef = patientId ? db.doc(`patients/${patientId}`) : null;
      const patientSnap = patientRef ? await patientRef.get() : null;
      const patient = patientSnap?.data();
      if (patientRef) {
        if (!patient)
          throw new HttpsError("not-found", "Patient record not found.");
        requireAccess(canRead(role, uid, patient.patientUid));
      }
      const encounterRef =
        "encounterId" in op
          ? patientRef!.collection("encounters").doc(op.encounterId)
          : null;
      if (encounterRef) {
        const snapshot = await encounterRef.get();
        if (!snapshot.exists)
          throw new HttpsError("not-found", "Encounter not found.");
      }
      let result: unknown;
      switch (op.action) {
        case "listPatients": {
          let q = db.collection("patients").orderBy("name").limit(50);
          if (!staff)
            q = db
              .collection("patients")
              .where("patientUid", "==", uid)
              .orderBy("name")
              .limit(50);
          const docs = await q.get();
          result = docs.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              name: v.name,
              dob: v.dob,
              phone: "Open record to view",
              address: "Open record to view",
              patientUid: v.patientUid,
            };
          });
          await audit("success", { recordIds: docs.docs.map((d) => d.id) });
          return result;
        }
        case "createPatient": {
          requireAccess(staff);
          if (op.patient.patientUid) requireAccess(role === "admin");
          if (op.patient.patientUid) {
            const linked = await getAuth().getUser(op.patient.patientUid);
            requireAccess(linked.customClaims?.role === "patient");
          }
          const ref = db.collection("patients").doc();
          const { phone, address, ...rest } = op.patient;
          const data = {
            ...rest,
            phone: encrypt(phone, encryptionKey.value(), `${ref.id}:phone`),
            address: encrypt(
              address,
              encryptionKey.value(),
              `${ref.id}:address`,
            ),
            createdAt: stamp(),
          };
          const batch = db.batch();
          batch.create(ref, data);
          batch.create(db.collection("auditLogs").doc(), {
            actor: uid,
            action: op.action,
            patientId: ref.id,
            outcome: "success",
            createdAt: stamp(),
            source: request.app?.appId || "emulator",
          });
          await batch.commit();
          return { id: ref.id, ...op.patient };
        }
        case "getPatient":
          result = {
            id: patientId,
            ...patient,
            phone: decrypt(
              patient!.phone,
              encryptionKey.value(),
              `${patientId}:phone`,
            ),
            address: decrypt(
              patient!.address,
              encryptionKey.value(),
              `${patientId}:address`,
            ),
          };
          break;
        case "listEncounters":
          result = (
            await patientRef!
              .collection("encounters")
              .orderBy("createdAt", "desc")
              .limit(50)
              .get()
          ).docs.map((d) => ({ id: d.id, patientId, ...d.data() }));
          break;
        case "createEncounter": {
          requireAccess(clinical);
          const ref = patientRef!.collection("encounters").doc();
          const data = {
            reason: op.reason,
            clinicianId: uid,
            status: "open",
            createdAt: stamp(),
          };
          const batch = db.batch();
          batch.create(ref, data);
          batch.create(db.collection("auditLogs").doc(), {
            actor: uid,
            action: op.action,
            patientId,
            outcome: "success",
            createdAt: stamp(),
            source: request.app?.appId || "emulator",
          });
          await batch.commit();
          return { id: ref.id, patientId, ...data };
        }
        case "listNotes":
          requireAccess(canReadNotes(role, uid, patient!.patientUid));
          result = (
            await encounterRef!
              .collection("notes")
              .orderBy("createdAt", "desc")
              .limit(50)
              .get()
          ).docs.map((d) => ({ id: d.id, ...d.data() }));
          break;
        case "saveNote":
        case "signEncounter": {
          requireAccess(clinical);
          await db.runTransaction(async (tx) => {
            const snapshot = await tx.get(encounterRef!);
            if (snapshot.data()?.status !== "open")
              throw new HttpsError(
                "failed-precondition",
                "Signed encounters are locked.",
              );
            if (op.action === "saveNote")
              tx.create(encounterRef!.collection("notes").doc(), {
                text: op.text,
                authorId: uid,
                createdAt: stamp(),
              });
            else {
              const notes = await tx.get(
                encounterRef!.collection("notes").limit(1),
              );
              if (notes.empty)
                throw new HttpsError(
                  "failed-precondition",
                  "Save a note before signing.",
                );
              tx.update(encounterRef!, {
                status: "signed",
                signedBy: uid,
                signedAt: stamp(),
              });
            }
            tx.create(db.collection("auditLogs").doc(), {
              actor: uid,
              action: op.action,
              patientId,
              outcome: "success",
              createdAt: stamp(),
              source: request.app?.appId || "emulator",
            });
          });
          return { ok: true };
        }
        case "draftNote": {
          requireAccess(clinical);
          requireAccess((await encounterRef!.get()).data()?.status === "open");
          // Separate AI budget: six requests/user/minute, including failures.
          await db.runTransaction(async (tx) => {
            const ref = db.doc(`rateLimits/ai_${uid}`);
            const snap = await tx.get(ref);
            const window = Math.floor(Date.now() / 60000);
            const count =
              snap.data()?.window === window ? snap.data()!.count : 0;
            if (count >= 6)
              throw new HttpsError(
                "resource-exhausted",
                "AI request limit reached.",
              );
            tx.set(ref, { window, count: count + 1 });
          });
          const scrubbed = redact(op.text, [
            patient!.name,
            ...String(patient!.name).split(" "),
            patient!.dob,
            decrypt(
              patient!.phone,
              encryptionKey.value(),
              `${patientId}:phone`,
            ),
            decrypt(
              patient!.address,
              encryptionKey.value(),
              `${patientId}:address`,
            ),
          ]);
          try {
            result = await routeDraft(
              scrubbed,
              [
                {
                  name: "openrouter",
                  url: "https://openrouter.ai/api/v1/chat/completions",
                  key: openrouter.value(),
                  model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
                },
                {
                  name: "openai",
                  url: "https://api.openai.com/v1/chat/completions",
                  key: openai.value(),
                  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
                },
              ],
              async (attempt) => {
                await db
                  .collection("llmRequests")
                  .add({ ...attempt, actor: uid, createdAt: stamp() });
              },
            );
          } catch {
            throw new HttpsError(
              "unavailable",
              "AI providers unavailable. Your note has not been saved.",
            );
          }
          break;
        }
        case "listAudit":
          requireAccess(role === "admin");
          result = (
            await db
              .collection("auditLogs")
              .orderBy("createdAt", "desc")
              .limit(100)
              .get()
          ).docs.map((d) => ({ id: d.id, ...d.data() }));
          break;
        case "listMetrics":
          requireAccess(role === "admin");
          result = (
            await db
              .collection("llmRequests")
              .orderBy("createdAt", "desc")
              .limit(100)
              .get()
          ).docs.map((d) => ({ id: d.id, ...d.data() }));
          break;
        case "setRole": {
          requireAccess(role === "admin");
          requireAccess(op.uid !== uid);
          const target = await getAuth().getUser(op.uid);
          await audit("started", { targetUid: op.uid, targetRole: op.role });
          await getAuth().setCustomUserClaims(op.uid, {
            ...target.customClaims,
            role: op.role,
          });
          await getAuth().revokeRefreshTokens(op.uid);
          await db
            .doc(`users/${op.uid}`)
            .set({ role: op.role, updatedAt: stamp() }, { merge: true });
          result = { ok: true };
          break;
        }
        case "listAttachments":
          requireAccess(canReadNotes(role, uid, patient!.patientUid));
          result = (
            await patientRef!
              .collection("attachments")
              .orderBy("createdAt", "desc")
              .limit(50)
              .get()
          ).docs.map((d) => ({
            id: d.id,
            name: d.data().name,
            createdAt: d.data().createdAt,
          }));
          break;
        case "uploadAttachment": {
          requireAccess(clinical);
          const bytes = Buffer.from(op.base64, "base64");
          if (
            bytes.length > 750000 ||
            bytes.subarray(0, 5).toString() !== "%PDF-"
          )
            throw new HttpsError(
              "invalid-argument",
              "A PDF smaller than 750 KB is required.",
            );
          const id = randomUUID();
          const path = `patients/${patientId}/${id}.pdf`;
          const file = getStorage().bucket().file(path);
          await audit("started", { attachmentId: id });
          await file.save(bytes, {
            resumable: false,
            contentType: "application/pdf",
            metadata: {
              cacheControl: "private, no-store",
              contentDisposition: `attachment; filename="${op.name}"`,
            },
          });
          try {
            const batch = db.batch();
            batch.create(patientRef!.collection("attachments").doc(id), {
              name: op.name,
              path,
              createdAt: stamp(),
              authorId: uid,
            });
            batch.create(db.collection("auditLogs").doc(), {
              actor: uid,
              action: op.action,
              patientId,
              outcome: "success",
              createdAt: stamp(),
              attachmentId: id,
              source: request.app?.appId || "emulator",
            });
            await batch.commit();
          } catch (e) {
            await file.delete().catch(() => {});
            throw e;
          }
          return { id };
        }
        case "getAttachment": {
          requireAccess(canReadNotes(role, uid, patient!.patientUid));
          const attachment = (
            await patientRef!
              .collection("attachments")
              .doc(op.attachmentId)
              .get()
          ).data();
          if (!attachment)
            throw new HttpsError("not-found", "Attachment not found.");
          const [url] = await getStorage()
            .bucket()
            .file(attachment.path)
            .getSignedUrl({
              action: "read",
              expires: Date.now() + 60000,
              responseDisposition: `attachment; filename="${attachment.name}"`,
            });
          result = { url };
          break;
        }
      }
      await audit("success");
      return result;
    } catch (error) {
      await audit(error instanceof HttpsError ? error.code : "internal");
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        "Request failed. No clinical details are included in errors.",
      );
    }
  },
);
