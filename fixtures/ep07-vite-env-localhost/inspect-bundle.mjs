// EP07 fixture: built-value inspection. Greps dist/assets/*.js for embedded http(s) URLs
// and checks that the literal `import.meta.env` expression did not survive the build.
//
//   node inspect-bundle.mjs [distDir]   -> writes built-value-inspection.json next to this file
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const URL_RE = /https?:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s"'`<>)]*)?/g;

export const inspectDist = (distDir) => {
  const root = path.resolve(distDir);
  const assets = path.join(root, 'assets');
  const files = fs.existsSync(assets) ? fs.readdirSync(assets).filter((f) => f.endsWith('.js')).sort() : [];
  const report = files.map((f) => {
    const full = path.join(assets, f);
    const src = fs.readFileSync(full, 'utf8');
    return {
      file: path.relative(root, full),
      bytes: src.length,
      sha256: crypto.createHash('sha256').update(src).digest('hex'),
      embeddedUrls: [...new Set(src.match(URL_RE) ?? [])],
      containsLiteralImportMetaEnv: src.includes('import.meta.env'),
    };
  });
  return {
    distDir: root,
    inspectedAt: new Date().toISOString(),
    files: report,
    embeddedUrls: [...new Set(report.flatMap((r) => r.embeddedUrls))],
    distHash: crypto.createHash('sha256').update(report.map((r) => `${r.file}:${r.sha256}`).join('\n')).digest('hex'),
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = path.dirname(new URL(import.meta.url).pathname);
  const dist = process.argv[2] ?? path.join(here, 'dist');
  const out = inspectDist(dist);
  fs.writeFileSync(path.join(here, 'built-value-inspection.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({files: out.files.map((f) => f.file), embeddedUrls: out.embeddedUrls, containsLiteralImportMetaEnv: out.files.some((f) => f.containsLiteralImportMetaEnv)}, null, 2));
}
