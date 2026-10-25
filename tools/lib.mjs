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

// A free TCP port chosen by the OS. Remotion serves its bundle on port 3000 by default, and another Remotion
// process on the same machine (a Studio, another render) can already own it, so every render asks for its own.
import net from 'node:net';
export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const {port} = s.address(); s.close(() => resolve(port)); });
  });
}
