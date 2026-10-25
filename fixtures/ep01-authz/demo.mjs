// Runs the exact scenario shown in the video and writes evidence.json (actual responses).
import fs from 'node:fs';
import {app, listen} from './server.mjs';
const port = await listen();
const base = `http://127.0.0.1:${port}`;
const log = [];
const call = async (label, p, headers = {}) => { const r = await fetch(base + p, {headers}); const body = await r.json(); log.push({label, request: `GET ${p}`, status: r.status, body}); return {r, body}; };
const c = (await fetch(base + '/login/alice')).headers.get('set-cookie').split(';')[0];
log.push({label: 'session', note: 'server-side session for Alice established via test harness; cookie is opaque'});
await call('unauthenticated', '/projects/p_1001');
await call('alice reads own (vulnerable endpoint)', '/vuln/projects/p_1001', {cookie: c});
await call('alice reads bob (vulnerable endpoint)', '/vuln/projects/p_2002', {cookie: c});
await call('alice reads own (corrected endpoint)', '/projects/p_1001', {cookie: c});
await call('alice reads bob (corrected endpoint)', '/projects/p_2002', {cookie: c});
await call('alice reads bob with spoofed client identity (corrected)', '/projects/p_2002?user=u_bob', {cookie: c, 'x-user-id': 'u_bob'});
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify({generatedAt: new Date().toISOString(), base: 'http://127.0.0.1:<ephemeral>', log}, null, 2));
console.table(log.map((l) => ({label: l.label, status: l.status ?? '-', project: l.body?.project?.id ?? l.body?.error ?? '-'})));
app.close();
