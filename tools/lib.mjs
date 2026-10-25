// Shared helpers for the tools. Works on Windows, macOS and Linux.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

export const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const isWin = process.platform === 'win32';

// npx is npx.cmd on Windows, which spawn only runs through a shell. Arguments here are fixed strings and
// paths we built, never user text, and each is quoted for the shell on Windows.
export function npx(args, opts = {}) {
  const q = (a) => (isWin && /[\s&()^|<>]/.test(a) ? `"${a}"` : a);
  return spawnSync(isWin ? 'npx.cmd' : 'npx', isWin ? args.map(q) : args, {...opts, shell: isWin});
}
