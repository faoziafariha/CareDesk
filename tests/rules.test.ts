import { beforeAll, afterAll, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-caredesk",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: readFileSync("storage.rules", "utf8"),
    },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "patients/p1"), {
      patientUid: "patient-a",
    });
    await setDoc(doc(c.firestore(), "patients/p1/encounters/e1/notes/n1"), {
      text: "fiction",
    });
    await uploadBytes(
      ref(c.storage(), "patients/p1/test.pdf"),
      new TextEncoder().encode("%PDF-test"),
      { contentType: "application/pdf" },
    );
  });
});
afterAll(async () => {
  await env?.cleanup();
});
for (const role of ["admin", "clinician", "frontdesk", "patient"])
  it(`${role} cannot bypass audited callable using SDK`, async () => {
    const c = env.authenticatedContext(
      role === "patient" ? "patient-a" : role,
      { role },
    );
    await assertFails(getDoc(doc(c.firestore(), "patients/p1")));
    await assertFails(
      getDoc(doc(c.firestore(), "patients/p1/encounters/e1/notes/n1")),
    );
    await assertFails(
      setDoc(doc(c.firestore(), "auditLogs/forged"), { actor: "fake" }),
    );
    await assertFails(
      uploadBytes(
        ref(c.storage(), "patients/p1/evil.pdf"),
        new Uint8Array([1]),
      ),
    );
    await assertFails(getBytes(ref(c.storage(), "patients/p1/test.pdf")));
  });
it("denies unauthenticated access", async () => {
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "patients/p1")),
  );
});
