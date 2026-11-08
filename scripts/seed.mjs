// Deliberately refuses production. Bootstrap production roles with the separate script.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { randomBytes, createCipheriv } from "node:crypto";
import { readFileSync } from "node:fs";
if (
  !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !process.env.FIRESTORE_EMULATOR_HOST
)
  throw new Error(
    "Set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 and FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 first.",
  );
const secret = readFileSync("functions/.secret.local", "utf8")
  .match(/^FIELD_ENCRYPTION_KEY=(.+)$/m)?.[1]
  ?.trim();
if (!secret || Buffer.from(secret, "base64").length !== 32)
  throw new Error(
    "Create functions/.secret.local with FIELD_ENCRYPTION_KEY (32-byte base64).",
  );
initializeApp({ projectId: "demo-caredesk" });
const auth = getAuth();
const db = getFirestore();
for (const role of ["admin", "clinician", "frontdesk", "patient"]) {
  const uid = `demo-${role}`;
  try {
    await auth.createUser({
      uid,
      email: `${role}@caredesk.example`,
      password: "DemoOnly!2026",
    });
  } catch (e) {
    if (e.code !== "auth/uid-already-exists") throw e;
  }
  await auth.setCustomUserClaims(uid, { role });
  await db.doc(`users/${uid}`).set({ role });
}
function encrypt(value, context) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", Buffer.from(secret, "base64"), iv);
  c.setAAD(Buffer.from(context));
  return {
    v: 1,
    iv: iv.toString("base64"),
    data: Buffer.concat([c.update(value, "utf8"), c.final()]).toString(
      "base64",
    ),
    tag: c.getAuthTag().toString("base64"),
  };
}
const fixtures = JSON.parse(
  readFileSync(new URL("../fixtures/clinic.json", import.meta.url), "utf8"),
);
// Only add missing documents: rerunning the seed never unlocks a signed visit
// or replaces work saved during an emulator session.
async function addMissing(ref, data) {
  try {
    await ref.create(data);
  } catch (error) {
    if (error.code !== 6 && error.code !== "already-exists") throw error;
  }
}
for (const patient of fixtures.patients) {
  const { id, phone, address, ...rest } = patient;
  await addMissing(db.doc(`patients/${id}`), {
    ...rest,
    phone: encrypt(phone, `${id}:phone`),
    address: encrypt(address, `${id}:address`),
  });
}
for (const encounter of fixtures.encounters) {
  const { id, patientId, ...rest } = encounter;
  await addMissing(db.doc(`patients/${patientId}/encounters/${id}`), rest);
}
for (const note of fixtures.notes) {
  const { id, encounterId, ...rest } = note;
  const encounter = fixtures.encounters.find((e) => e.id === encounterId);
  await addMissing(
    db.doc(
      `patients/${encounter.patientId}/encounters/${encounterId}/notes/${id}`,
    ),
    rest,
  );
}
console.log(
  `Seeded ${fixtures.patients.length} fictional patients, ${fixtures.encounters.length} encounters, ${fixtures.notes.length} notes and four emulator accounts. Password: DemoOnly!2026`,
);
