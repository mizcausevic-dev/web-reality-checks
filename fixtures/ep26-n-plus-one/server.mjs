// EP26 fixture: loopback-only article directory.
//   GET /login/:user          test-harness session (stores sid in SQLite; counted nowhere: outside the scope)
//   GET /vuln/articles        FLAWED: 1 list SELECT + 1 author SELECT per article  (N+1)
//   GET /articles             CORRECTED: one explicit joined SELECT
// Both return the SAME JSON body: {count, articles:[{id,title,published_on,author:{id,name,handle}}]} ORDER BY id.
// Header x-db-selects carries the SELECT count derived from the instrumentation (not from a constant).
import http from 'node:http';
import crypto from 'node:crypto';
import {createDb} from './db.mjs';

const USERS = {alice: 'u_alice', bob: 'u_bob'};

const toArticle = (id, title, published_on, authorId, authorName, authorHandle) => ({
  id, title, published_on, author: {id: authorId, name: authorName, handle: authorHandle},
});

/** FLAWED: list query, then one author query per article inside the loop. No caching, no batching. */
export const listArticlesFlawed = (db, {hiddenExtraQuery = false} = {}) => {
  db.exec('BEGIN');
  const listStmt = db.prepare('SELECT id, title, published_on, author_id FROM articles ORDER BY id');
  const authorStmt = db.prepare('SELECT id, name, handle FROM authors WHERE id = ?');
  const rows = listStmt.all();
  const articles = rows.map((r) => {
    const au = authorStmt.get(r.author_id); // <-- the per-item query
    return toArticle(r.id, r.title, r.published_on, au.id, au.name, au.handle);
  });
  if (hiddenExtraQuery) db.prepare('SELECT COUNT(*) AS n FROM articles').get(); // control only: one unnoticed extra statement
  db.exec('COMMIT');
  return articles;
};

/** CORRECTED: one explicit join. Same fields, same mapping, same ORDER BY. */
export const listArticlesJoined = (db, {hiddenExtraQuery = false} = {}) => {
  db.exec('BEGIN');
  const rows = db.prepare(`
    SELECT a.id AS article_id, a.title AS title, a.published_on AS published_on,
           u.id AS author_id, u.name AS author_name, u.handle AS author_handle
    FROM articles a
    JOIN authors u ON u.id = a.author_id
    ORDER BY a.id
  `).all();
  const articles = rows.map((r) => toArticle(r.article_id, r.title, r.published_on, r.author_id, r.author_name, r.author_handle));
  if (hiddenExtraQuery) db.prepare('SELECT COUNT(*) AS n FROM articles').get();
  db.exec('COMMIT');
  return articles;
};

export const createFixture = ({hiddenExtraQuery = false} = {}) => {
  const {raw, db} = createDb();
  const reports = []; // one counting report per article-list request
  const lastReport = () => reports[reports.length - 1];

  const userFor = (req) => {
    const sid = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie ?? '')?.[1];
    if (!sid) return null;
    // authentication SELECT: runs through the wrapper but outside the scope, so it is logged and NOT counted
    return db.prepare('SELECT user_id FROM sessions WHERE sid = ?').get(sid)?.user_id ?? null;
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const send = (status, body, headers = {}) => {
      res.writeHead(status, {'content-type': 'application/json', ...headers});
      res.end(body);
    };
    let m;
    if ((m = /^\/login\/(\w+)$/.exec(url.pathname))) {
      const uid = USERS[m[1]];
      if (!uid) return send(404, '{"error":"no such user"}');
      const sid = crypto.randomBytes(12).toString('hex');
      db.prepare('INSERT INTO sessions (sid, user_id) VALUES (?, ?)').run(sid, uid);
      return send(200, JSON.stringify({user: uid}), {'set-cookie': `sid=${sid}; HttpOnly; Path=/`});
    }
    if (url.pathname === '/articles' || url.pathname === '/vuln/articles') {
      if (req.method !== 'GET') return send(405, '{"error":"method"}');
      if (!userFor(req)) return send(401, '{"error":"unauthenticated"}');
      const flawed = url.pathname === '/vuln/articles';
      const {result, report} = db.scoped('article-list', () => (flawed ? listArticlesFlawed : listArticlesJoined)(db, {hiddenExtraQuery}));
      reports.push({endpoint: url.pathname, ...report});
      const body = JSON.stringify({count: result.length, articles: result});
      return send(200, body, {'x-db-selects': String(report.selectCount)});
    }
    return send(404, '{"error":"not found"}');
  });

  return {
    raw, db, reports, lastReport,
    listen: () => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port))),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
};
