import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { demoCall } from "./demo";
import type { User, Operation } from "./types";
export const demo = import.meta.env.VITE_MODE !== "firebase";
const emulators = import.meta.env.VITE_USE_EMULATORS === "true";
const app = demo
  ? null
  : initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
if (app && !emulators)
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
const auth = app ? getAuth(app) : null;
const functions = app ? getFunctions(app, "us-central1") : null;
if (auth && functions && emulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth!, email, password);
export const logout = () => signOut(auth!);
export function watchUser(cb: (u: User | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, async (u) => {
    if (!u) return cb(null);
    const token = await u.getIdTokenResult(true);
    cb({
      uid: u.uid,
      email: u.email || "",
      role: (token.claims.role as User["role"]) || "patient",
    });
  });
}
export async function call<T = any>(user: User, op: Operation): Promise<T> {
  if (demo) return demoCall(user, op);
  return (await httpsCallable<Operation, T>(functions!, "clinic")(op)).data;
}
