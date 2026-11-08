import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import {
  encrypt,
  decrypt,
  redact,
  canRead,
  canReadNotes,
} from "../functions/src/security";
import { operation } from "../functions/src/schema";
describe("encryption", () => {
  const key = randomBytes(32).toString("base64");
  it("round trips with unique nonces", () => {
    const a = encrypt("555-0100", key, "p1:phone");
    const b = encrypt("555-0100", key, "p1:phone");
    expect(a.iv).not.toBe(b.iv);
    expect(decrypt(a, key, "p1:phone")).toBe("555-0100");
  });
  it("rejects tampering and moving ciphertext to another patient", () => {
    const a = encrypt("secret", key, "p1:phone");
    expect(() => decrypt(a, key, "p2:phone")).toThrow();
    expect(() =>
      decrypt(
        { ...a, tag: randomBytes(16).toString("base64") },
        key,
        "p1:phone",
      ),
    ).toThrow();
  });
});
describe("authorization policy", () => {
  it("blocks frontdesk notes and cross-patient access", () => {
    expect(canRead("frontdesk", "u", "p")).toBe(true);
    expect(canReadNotes("frontdesk", "u", "p")).toBe(false);
    expect(canReadNotes("patient", "u", "p")).toBe(false);
    expect(canReadNotes("patient", "u", "u")).toBe(true);
    expect(canRead("patient", "u", undefined)).toBe(false);
  });
});
describe("request validation", () => {
  it("rejects traversal, excessive note length and malformed uploads", () => {
    expect(
      operation.safeParse({ action: "getPatient", patientId: "../users/x" })
        .success,
    ).toBe(false);
    expect(
      operation.safeParse({
        action: "saveNote",
        patientId: "p",
        encounterId: "e",
        text: "a".repeat(8001),
      }).success,
    ).toBe(false);
    expect(
      operation.safeParse({
        action: "uploadAttachment",
        patientId: "p",
        name: "evil.html",
        base64: "aaaa",
      }).success,
    ).toBe(false);
  });
  it("redacts known identifiers, phones and email", () => {
    const s = redact("Alex Morgan alex@example.com 202-555-0142", [
      "Alex Morgan",
    ]);
    expect(s).not.toContain("Alex Morgan");
    expect(s).not.toContain("alex@example.com");
    expect(s).not.toContain("202-555-0142");
  });
});
