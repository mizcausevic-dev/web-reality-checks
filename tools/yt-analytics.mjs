#!/usr/bin/env node
// Read-only channel report from the YouTube Analytics API: per-video views, watch time, average view duration and
// percentage, likes, subscribers gained, plus channel traffic sources. Writes a JSON file; nothing is uploaded or edited.
// Usage: node tools/yt-analytics.mjs [--start 2026-01-01] [--end 2026-10-26] [--out analytics.json]
// Needs the user environment variables YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_ANALYTICS_REFRESH_TOKEN
// (create the last with: node tools/youtube-upload.mjs --auth --scope analytics --store-token). Values are never printed.
// The API has no thumbnail impressions or click-through rate; those stay in YouTube Studio.
import fs from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
for (const k of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_ANALYTICS_REFRESH_TOKEN']) if (!process.env[k]) { console.error(`BLOCKED: set environment variable ${k} first`); process.exit(1); }
const today = new Date().toISOString().slice(0, 10);
const start = arg('--start', '2026-01-01'), end = arg('--end', today), out = arg('--out', 'analytics.json');

const tok = await (await fetch('https://oauth2.googleapis.com/token', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({client_id: process.env.YOUTUBE_CLIENT_ID, client_secret: process.env.YOUTUBE_CLIENT_SECRET, refresh_token: process.env.YOUTUBE_ANALYTICS_REFRESH_TOKEN, grant_type: 'refresh_token'})})).json();
if (!tok.access_token) { console.error(`token refresh failed: ${tok.error ?? 'unknown'} ${tok.error_description ?? ''}`); process.exit(1); }

async function report(params) {
  const u = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  u.search = new URLSearchParams({ids: 'channel==MINE', startDate: start, endDate: end, ...params}).toString();
  const r = await fetch(u, {headers: {Authorization: `Bearer ${tok.access_token}`}});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`reports ${params.dimensions ?? 'totals'}: ${r.status} ${j.error?.message ?? ''}`.trim());
  const names = j.columnHeaders.map((c) => c.name);
  return (j.rows ?? []).map((row) => Object.fromEntries(row.map((v, i) => [names[i], v])));
}

const M = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,subscribersGained';
const videos = await report({dimensions: 'video', metrics: M, sort: '-views', maxResults: '200'});
const traffic = await report({dimensions: 'insightTrafficSourceType', metrics: 'views,estimatedMinutesWatched', sort: '-views'});
const totals = (await report({metrics: M}))[0] ?? {};
const doc = {start, end, fetched: new Date().toISOString(), note: 'YouTube Analytics API; no impressions or CTR (Studio only)', totals, videos, traffic};
fs.writeFileSync(out, JSON.stringify(doc, null, 2));
console.log(`analytics written to ${out}: ${videos.length} videos, ${traffic.length} traffic sources, ${totals.views ?? 0} views ${start} to ${end}`);
