// Bundles the fonts so a render looks the same on any machine (Windows, macOS, Linux, CI).
// Inter: SIL Open Font License 1.1. DejaVu Sans Mono: Bitstream Vera / DejaVu license (free to redistribute).
import {continueRender, delayRender, staticFile} from 'remotion';

const FILES: {family: string; file: string; weight: string}[] = [
  {family: 'InterBundled', file: 'Inter-Regular.otf', weight: '400'},
  {family: 'InterBundled', file: 'Inter-Medium.otf', weight: '500'},
  {family: 'InterBundled', file: 'Inter-SemiBold.otf', weight: '600'},
  {family: 'InterBundled', file: 'Inter-Bold.otf', weight: '700'},
  {family: 'InterBundled', file: 'Inter-ExtraBold.otf', weight: '800'},
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
