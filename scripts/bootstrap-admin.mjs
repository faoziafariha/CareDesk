import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const [projectId, uid] = process.argv.slice(2);
if (!projectId || !uid)
  throw new Error(
    "Usage: node scripts/bootstrap-admin.mjs PROJECT_ID UID (requires local Application Default Credentials)",
  );
initializeApp({ projectId });
const auth = getAuth();
const user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, { ...user.customClaims, role: "admin" });
console.log("Admin claim assigned. Sign out and sign in again.");
