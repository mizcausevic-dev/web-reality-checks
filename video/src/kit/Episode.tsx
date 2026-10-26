import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bg, Caption, EndCard, EpisodeTag, SimTag} from './Primitives';
import {prog} from './anim';
import {applyPalette} from './theme';

export type SceneProps = {t: number; T: number; dur: number};
export type SceneDef = {id: string; start: number; end: number; sim?: string | null};
export type Cue = {start: number; end: number; text: string};
export type Timeline = {
  n: number;
  palette?: string; // theme palette name; omitted means the original look
  series?: string; // series name shown in the tag and hero; defaults to Web Reality Checks
  title: string;
  tag?: string; // optional tag text replacing the episode number (launch videos)
  kicker?: string; // optional hero/thumbnail kicker replacing "Episode NN"
  endCard?: {site: string; seconds: number}; // baked end card over the last `seconds` (end screen elements go on top in Studio)
  thumb?: {number: string; label: string; color?: 'red' | 'cyan' | 'amber' | 'green'}; // big-number thumbnail and hero
  audio?: string | null; // path under public/, e.g. "ep01/narration.mp3"
  duration: number; // seconds
  scenes: SceneDef[];
  captions: Cue[];
};

export const makeEpisode = (tl: Timeline, scenes: Record<string, React.FC<SceneProps>>, defaultSim: string | null = 'SIMULATED LOCAL FIXTURE'): React.FC => {
  const Comp: React.FC = () => {
    applyPalette(tl.palette);
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const T = frame / fps;
    const cue = tl.captions.find((c) => T >= c.start && T < c.end);
    const cueO = cue ? Math.min(prog(T, cue.start, cue.start + 0.2), 1 - prog(T, cue.end - 0.15, cue.end)) : 0;
    const cur = tl.scenes.find((s) => T >= s.start && T < s.end);
    const ec = tl.endCard;
    const ecO = ec ? prog(T, tl.duration - ec.seconds, tl.duration - ec.seconds + 0.5) : 0;
    const sim = ecO > 0 ? null : cur ? (cur.sim === undefined ? defaultSim : cur.sim) : null;
    return (
      <Bg>
        {tl.scenes.map((s) => {
          const S = scenes[s.id];
          if (!S) return null;
          const from = Math.round(s.start * fps);
          const dur = Math.max(1, Math.round((s.end - s.start) * fps));
          return (
            <Sequence key={s.id} from={from} durationInFrames={dur} layout="none">
              <SceneWrap start={s.start} end={s.end}>
                <S t={T - s.start} T={T} dur={s.end - s.start} />
              </SceneWrap>
            </Sequence>
          );
        })}
        {ec && ecO > 0 && <EndCard o={ecO} site={ec.site} />}
        <EpisodeTag n={tl.n} title={tl.title} label={tl.tag} series={tl.series} />
        {sim && <SimTag label={sim} />}
        {cue && <Caption text={cue.text} o={cueO} />}
        {tl.audio && <Audio src={staticFile(tl.audio)} />}
      </Bg>
    );
  };
  return Comp;
};

// Inside a <Sequence>, useCurrentFrame() is sequence-local, so fades are computed on local time.
const SceneWrap: React.FC<{start: number; end: number; children: React.ReactNode}> = ({start, end, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dur = end - start;
  const o = Math.min(prog(t, 0, 0.3), 1 - prog(t, dur - 0.3, dur));
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const framesFor = (tl: Timeline, fps = 30) => Math.round(tl.duration * fps);
