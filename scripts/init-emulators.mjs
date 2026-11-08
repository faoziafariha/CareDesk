import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
if (!existsSync("functions/.secret.local")) {
  writeFileSync(
    "functions/.secret.local",
    `FIELD_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\nOPENROUTER_API_KEY=\nOPENAI_API_KEY=\n`,
  );
  console.log(
    "Created ignored emulator-only encryption secret. Never use this key for production.",
  );
} else console.log("Kept existing emulator secret.");
