// Runs the exact scenario shown in the video and writes evidence.json (actual responses).
// Loopback only. Valid session + valid CSRF token on every member request, so a CSRF failure can never
// be mistaken for the authorization result.
import fs from 'node:fs';
import {createApp, announcementCount, hasPermission, listAnnouncements, PUBLISH, CSRF_HEADER} from './server.mjs';
import {makeClient} from './client.mjs';

const fx = createApp();
const srv = await fx.listen();
const base = `http://127.0.0.1:${srv.port}`;
const {db} = fx;
const log = [];
const rec = (label, method, path, r, extra = {}) => log.push({label, request: `${method} ${path}`, status: r.status, body: r.body, announcementsAfter: announcementCount(db), ...extra});

const member = makeClient(base);
const admin = makeClient(base);
await member.login('member');
await admin.login('admin');
const payload = {title: 'Maintenance window', body: 'Synthetic announcement.'};

const state0 = {announcements: announcementCount(db), memberHasPublishPermission: hasPermission(db, 'u_member', PUBLISH), adminHasPublishPermission: hasPermission(db, 'u_admin', PUBLISH)};

// 1. the member's page: no publish button (both versions)
const mp = await member.get('/app');
const ap = await admin.get('/app');
const ui = {memberSeesPublishButton: mp.text.includes('data-testid="publish-button"'), adminSeesPublishButton: ap.text.includes('data-testid="publish-button"'), memberPageMarker: mp.text.includes('data-testid="read-only"') ? 'read-only' : 'other'};
const mpv = await member.get('/vuln/app');
ui.memberSeesPublishButtonOnFlawedVersionPage = mpv.text.includes('data-testid="publish-button"');

const memberToken = await member.csrf();
const adminToken = await admin.csrf();

// 2-3. controlled test against the FLAWED endpoint: member session + member's valid CSRF token
rec('member publishes (flawed endpoint)', 'POST', '/vuln/announcements', await member.post('/vuln/announcements', payload, {headers: {[CSRF_HEADER]: memberToken}}), {session: 'member, valid', csrf: 'valid'});

// 5-7. SAME request against the corrected endpoint
const before = announcementCount(db);
rec('member publishes (corrected endpoint)', 'POST', '/announcements', await member.post('/announcements', payload, {headers: {[CSRF_HEADER]: memberToken}}), {session: 'member, valid', csrf: 'valid', countBefore: before});
// forged role claims change nothing
rec('member publishes with role=admin claims (corrected)', 'POST', '/announcements', await member.post('/announcements', {...payload, role: 'admin', permissions: [PUBLISH]}, {headers: {[CSRF_HEADER]: memberToken, 'x-role': 'admin'}}), {session: 'member, valid', csrf: 'valid'});
// CSRF failure is a different answer
rec('member publishes with bad CSRF token (corrected)', 'POST', '/announcements', await member.post('/announcements', payload, {headers: {[CSRF_HEADER]: 'forged'}}), {session: 'member, valid', csrf: 'invalid'});
// unauthenticated
rec('unauthenticated publish (corrected)', 'POST', '/announcements', await makeClient(base).post('/announcements', payload), {session: 'none'});
rec('unauthenticated publish (flawed)', 'POST', '/vuln/announcements', await makeClient(base).post('/vuln/announcements', payload), {session: 'none'});

// 8. administrator on the corrected endpoint
rec('administrator publishes (corrected endpoint)', 'POST', '/announcements', await admin.post('/announcements', {title: 'Admin notice', body: 'Synthetic announcement.'}, {headers: {[CSRF_HEADER]: adminToken}}), {session: 'admin, valid', csrf: 'valid'});

const evidence = {
  generatedAt: new Date().toISOString(),
  base: 'http://127.0.0.1:<ephemeral>',
  scope: 'function-level permission check (may this role perform this action at all?); not object ownership',
  csrfLibrary: 'csrf-csrf 3.1.0 (same pin as EP03), double-submit token bound to the server-side session id',
  initialState: state0,
  ui,
  log,
  finalAnnouncements: listAnnouncements(db),
  summary: {
    flawedMemberStatus: log[0].status,
    correctedMemberStatus: log[1].status,
    correctedMemberErrorCode: log[1].body.code,
    announcementCountBeforeCorrectedMemberRequest: before,
    announcementCountAfterCorrectedMemberRequest: log[1].announcementsAfter,
    forgedRoleStatus: log[2].status,
    badCsrfStatus: log[3].status,
    badCsrfErrorCode: log[3].body.code,
    unauthenticatedCorrectedStatus: log[4].status,
    unauthenticatedFlawedStatus: log[5].status,
    adminCorrectedStatus: log[6].status,
    announcementCountFinal: announcementCount(db),
  },
};
fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.table(log.map((l) => ({label: l.label, status: l.status, code: l.body?.code ?? (l.body?.published ? 'published' : '-'), announcementsAfter: l.announcementsAfter})));
console.log(JSON.stringify({initialState: state0, ui, summary: evidence.summary}, null, 2));
srv.close();
