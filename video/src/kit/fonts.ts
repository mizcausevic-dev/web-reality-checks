// Bundles the fonts so a render looks the same on any machine (Windows, macOS, Linux, CI).
// Inter, Big Shoulders Display, B612, B612 Mono: SIL Open Font License 1.1. DejaVu Sans Mono: Bitstream Vera / DejaVu license (free to redistribute).
import {continueRender, delayRender, staticFile} from 'remotion';

const FILES: {family: string; file: string; weight: string}[] = [
  {family: 'InterBundled', file: 'Inter-Regular.otf', weight: '400'},
  {family: 'InterBundled', file: 'Inter-Medium.otf', weight: '500'},
  {family: 'InterBundled', file: 'Inter-SemiBold.otf', weight: '600'},
  {family: 'InterBundled', file: 'Inter-Bold.otf', weight: '700'},
  {family: 'InterBundled', file: 'Inter-ExtraBold.otf', weight: '800'},
  {family: 'BigShouldersBundled', file: 'big-shoulders-display-latin-700-normal.woff2', weight: '700'},
  {family: 'BigShouldersBundled', file: 'big-shoulders-display-latin-800-normal.woff2', weight: '800'},
  {family: 'BigShouldersBundled', file: 'big-shoulders-display-latin-900-normal.woff2', weight: '900'},
  {family: 'B612Bundled', file: 'b612-latin-400-normal.woff2', weight: '400'},
  {family: 'B612Bundled', file: 'b612-latin-700-normal.woff2', weight: '700'},
  {family: 'B612MonoBundled', file: 'b612-mono-latin-400-normal.woff2', weight: '400'},
  {family: 'B612MonoBundled', file: 'b612-mono-latin-700-normal.woff2', weight: '700'},
  {family: 'DejaVuMonoBundled', file: 'DejaVuSansMono.ttf', weight: '400'},
  {family: 'DejaVuMonoBundled', file: 'DejaVuSansMono-Bold.ttf', weight: '700'},
];

let started = false;
export function loadBundledFonts(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('bundled fonts');
  Promise.all(
    FILES.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(`fonts/${f.file}`)})`, {weight: f.weight});
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('font load failed, using system fallbacks:', e);
      continueRender(handle);
    });
}
loadBundledFonts();
