import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export type Role = "admin" | "clinician" | "frontdesk" | "patient";
export function canRead(role: Role, uid: string, patientUid?: string) {
  return (
    ["admin", "clinician", "frontdesk"].includes(role) ||
    (role === "patient" && uid === patientUid)
  );
}
export function canReadNotes(role: Role, uid: string, patientUid?: string) {
  return (
    ["admin", "clinician"].includes(role) ||
    (role === "patient" && uid === patientUid)
  );
}
function keyOf(key: string) {
  const b = Buffer.from(key, "base64");
  if (b.length !== 32) throw new Error("Encryption key must be 32 bytes");
  return b;
}
export function encrypt(value: string, key: string, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyOf(key), iv);
  cipher.setAAD(Buffer.from(context));
  const bytes = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: bytes.toString("base64"),
  };
}
export function decrypt(
  value: ReturnType<typeof encrypt>,
  key: string,
  context: string,
) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyOf(key),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
// Best effort only: not a de-identification guarantee. Never use real PHI in this demo.
export function redact(text: string, identifiers: string[]) {
  let output = text;
  for (const [i, value] of identifiers
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .entries()) {
    output = output.split(value).join(`[REDACTED_${i}]`);
  }
  return output
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[EMAIL]")
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, "[NUMBER]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[ID]");
}
