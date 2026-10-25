// EP07 fixture helper: run a real `vite build` in a child process with a controlled environment.
// Shared by test.mjs and demo.mjs. Not part of the video.
import {spawnSync} from 'node:child_process';
import path from 'node:path';

export const HERE = path.dirname(new URL(import.meta.url).pathname);
export const VITE_BIN = path.join(HERE, 'node_modules', 'vite', 'bin', 'vite.js');

/** Build into `outDir`. `env` is merged over the parent env; pass VITE_API_BASE_URL to override .env.development. */
export const build = ({outDir, env = {}, mode = 'development'}) => {
  const r = spawnSync(process.execPath, [VITE_BIN, 'build', '--mode', mode, '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], {
    cwd: HERE, env: {...process.env, ...env}, encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`vite build failed (${r.status}): ${r.stderr || r.stdout}`);
  return {outDir: path.resolve(HERE, outDir), mode, envOverride: env};
};
