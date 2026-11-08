import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Public portfolio deploys are always the synthetic browser demo.
const cwd = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, VITE_MODE: 'demo', VITE_USE_EMULATORS: 'false' };
for (const args of [['node_modules/typescript/bin/tsc', '--noEmit'], ['node_modules/vite/bin/vite.js', 'build']]) {
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
