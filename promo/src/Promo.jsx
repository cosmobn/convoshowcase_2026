import { useMemo } from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

const NAVY = '#1E2859';
const NAVY_2 = '#273565';
const YELLOW = '#FCD00F';
const INK_SOFT = '#D5DDF3';
// Dark glass keeps labels readable where the glowing path passes behind them.
const labelGlass = { border: '1.5px solid #FFFFFF1A', borderRadius: 18, background: '#1C2553E0', boxShadow: '0 10px 26px #0710303D', padding: '10px 18px' };
const FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
// Background positions of each level in assets/character-levels-smiling.webp, as in styles.css.
const LEVEL_POSITIONS = [4.254144, 22.624309, 42.348066, 60.027624, 79.309392, 97.81768];
const SCENES = [
  { id: 'question', from: 0, duration: 105 },
  { id: 'fields', from: 105, duration: 125 },
  { id: 'future', from: 230, duration: 125 },
  { id: 'levels', from: 355, duration: 215 },
  { id: 'end', from: 570, duration: 150 },
];
export const PROMO_FRAMES = 720;

const glass = {
  border: '1.5px solid #FFFFFF26',
  background: 'linear-gradient(135deg, #FFFFFF1C, #FFFFFF06)',
  boxShadow: 'inset 0 1px 0 #FFFFFF2B, 0 12px 32px #0710302E',
  backdropFilter: 'blur(14px)',
};

function useLayout() {
  const { width, height, fps } = useVideoConfig();
  return { width, height, fps, vertical: height > width };
}

/** The site's staggered blur-in, driven by a spring. */
function Rise({ delay = 0, y = 36, blur = 14, children, style }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return <div style={{ opacity: p, filter: `blur(${(1 - p) * blur}px)`, transform: `translateY(${(1 - p) * y}px)`, ...style }}>{children}</div>;
}

function Pill({ children, size = 24 }) {
  return (
    <div style={{ ...glass, display: 'inline-flex', alignItems: 'center', gap: size * .6, borderRadius: 999, padding: `${size * .55}px ${size * 1.1}px`, color: '#E4E9FA', fontSize: size, fontWeight: 700, letterSpacing: size * .14 }}>
      <span style={{ width: size * .4, height: size * .4, borderRadius: '50%', background: YELLOW, boxShadow: `0 0 0 ${size * .25}px #FCD00F22` }} />
      {children}
    </div>
  );
}

function Character({ level, height, style }) {
  const width = height / 2;
  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', clipPath: 'inset(0 1%)', filter: 'drop-shadow(0 18px 18px #06103566)', ...style }}>
      <Img src={staticFile('character-levels-smiling.webp')} style={{ position: 'absolute', top: 0, left: -5 * width * LEVEL_POSITIONS[level] / 100, width: width * 6, height, maxWidth: 'none' }} />
    </div>
  );
}

function Backdrop() {
  const frame = useCurrentFrame();
  const { width, height } = useLayout();
  const stars = useMemo(() => Array.from({ length: 150 }, (_, i) => ({
    x: random(`x${i}`), y: random(`y${i}`), size: 1.5 + random(`r${i}`) * 2.5,
    gold: random(`g${i}`) > .88, speed: .15 + random(`s${i}`) * .6, phase: random(`p${i}`) * 6,
  })), []);
  const ring = Math.max(width, height) * .9;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 78% 28%, #FCD00F1A, transparent 45%), radial-gradient(ellipse at 12% 88%, #6C7FD030, transparent 50%), linear-gradient(140deg, ${NAVY}, ${NAVY_2} 60%, #1A2350)`, overflow: 'hidden' }}>
      {[1, .72].map((scale, i) => (
        <div key={i} style={{ position: 'absolute', left: width * .78 - ring * scale / 2, top: height * .3 - ring * scale / 2, width: ring * scale, height: ring * scale, borderRadius: '50%', border: `2px dashed ${i ? '#FCD00F14' : '#FFFFFF0C'}`, transform: `rotate(${frame * (i ? -.12 : .08)}deg)` }} />
      ))}
      {stars.map((star, i) => (
        <div key={i} style={{ position: 'absolute', left: (star.x * width + frame * star.speed) % width, top: star.y * height, width: star.size, height: star.size, borderRadius: '50%', background: star.gold ? YELLOW : '#FFFFFF', opacity: .2 + .45 * (.5 + .5 * Math.sin(frame / 12 + star.phase)) }} />
      ))}
    </AbsoluteFill>
  );
}

/** Each scene settles in, then blurs out like the site's transitions. */
function Scene({ duration, children }) {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 8], [0, 1], CLAMP);
  const exit = interpolate(frame, [duration - 14, duration], [1, 0], CLAMP);
  return <AbsoluteFill style={{ opacity: Math.min(enter, exit), filter: `blur(${(1 - exit) * 18}px)`, transform: `scale(${1 + (1 - exit) * .04})`, fontFamily: FONT, color: '#FFFFFF' }}>{children}</AbsoluteFill>;
}

function Heading({ kicker, title, size, top }) {
  return (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <Rise delay={2}><Pill>{kicker}</Pill></Rise>
      <Rise delay={8} y={44} blur={16}><div style={{ marginTop: size * .4, fontSize: size, fontWeight: 800, letterSpacing: -size * .035, lineHeight: 1.05 }}>{title}</div></Rise>
    </div>
  );
}

function QuestionScene() {
  const frame = useCurrentFrame();
  const { fps, vertical } = useLayout();
  const size = vertical ? 150 : 150;
  const pop = spring({ frame: frame - 46, fps, config: { damping: 9, stiffness: 140 } });
  let word = 0;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <Rise delay={4}><Pill size={vertical ? 28 : 24}>YOUR FUTURE STARTS WITH A QUESTION</Pill></Rise>
      <div style={{ marginTop: 56, fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: -size * .035 }}>
        {[['What', 'do', 'you'], ['want', 'to', 'be']].map((line, row) => (
          <div key={row} style={{ display: 'flex', justifyContent: 'center', gap: size * .26 }}>
            {line.map(text => <Rise key={text} delay={12 + word++ * 5} y={56} blur={20}>{text}</Rise>)}
            {row === 1 && <span style={{ display: 'inline-block', marginLeft: -size * .26, color: YELLOW, transform: `scale(${pop}) rotate(${(1 - pop) * -30}deg)`, textShadow: '0 0 40px #FCD00F66' }}>?</span>}
          </div>
        ))}
      </div>
      <Rise delay={62}><div style={{ marginTop: 56, maxWidth: 860, color: INK_SOFT, fontSize: vertical ? 42 : 38, lineHeight: 1.45 }}>Find a career that feels like you.</div></Rise>
    </AbsoluteFill>
  );
}

const FIELDS = [
  { title: 'IT', copy: 'Build, connect and protect the digital world.', image: 'field-it-smiling.png' },
  { title: 'Creative', copy: 'Bring ideas to life through design and media.', image: 'field-creative-smiling.png' },
  { title: 'Business', copy: 'The people and decisions behind organisations.', image: 'field-business-smiling.png' },
];

function FieldsScene() {
  const frame = useCurrentFrame();
  const { fps, vertical } = useLayout();
  const cardWidth = vertical ? 310 : 440;
  const cardHeight = vertical ? 660 : 600;
  const chosen = spring({ frame: frame - 82, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <Heading kicker="CHOOSE YOUR DIRECTION" title={vertical ? <>Which world<br />interests you?</> : 'Which world interests you?'} size={vertical ? 96 : 84} top={vertical ? 300 : 90} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: vertical ? 780 : 360, display: 'flex', justifyContent: 'center', gap: vertical ? 26 : 48, perspective: 1600 }}>
        {FIELDS.map((field, i) => {
          const p = spring({ frame: frame - 18 - i * 9, fps, config: { damping: 16, stiffness: 90 } });
          const float = Math.sin((frame + i * 20) / 18) * 6;
          const pick = i === 0 ? chosen : 0;
          return (
            <div key={field.title} style={{ ...glass, position: 'relative', width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 40, opacity: Math.min(1, p * 1.4) * (1 - chosen * (i ? .45 : 0)), transform: `translateY(${(1 - p) * 240 + float}px) rotateY(${(1 - p) * (i - 1) * -38}deg) rotateX(${(1 - p) * 24}deg) scale(${1 + pick * .06})`, borderColor: pick ? `rgba(252, 208, 15, ${.3 + pick * .6})` : '#FFFFFF26', boxShadow: pick ? `0 0 ${60 * pick}px #FCD00F55, inset 0 1px 0 #FFFFFF2B` : glass.boxShadow }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, #FCD00F1F, transparent 60%)' }} />
              <Img src={staticFile(field.image)} style={{ position: 'absolute', left: 0, right: 0, top: 24, width: '100%', height: '68%', objectFit: 'contain', objectPosition: 'bottom' }} />
              <div style={{ position: 'absolute', left: 30, right: 30, bottom: 34 }}>
                <div style={{ fontSize: vertical ? 50 : 54, fontWeight: 800, letterSpacing: -1.5 }}>{field.title}</div>
                <div style={{ marginTop: 10, color: INK_SOFT, fontSize: vertical ? 22 : 24, lineHeight: 1.4 }}>{field.copy}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function FutureScene() {
  const frame = useCurrentFrame();
  const { fps, width, vertical } = useLayout();
  const stageWidth = vertical ? 960 : 1300;
  const stageHeight = vertical ? 980 : 700;
  const studentHeight = vertical ? 520 : 450;
  const futureHeight = vertical ? 660 : 560;
  const start = { x: stageWidth * .2, y: stageHeight - 70 };
  const goal = { x: stageWidth * .76, y: stageHeight - 190 };
  const control = { x: stageWidth * .48, y: stageHeight + 10 };
  const draw = interpolate(frame, [26, 62], [0, 1], CLAMP);
  const eased = 1 - (1 - draw) ** 3;
  const point = t => ({ x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * goal.x, y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * goal.y });
  const orb = point(eased);
  const arrive = spring({ frame: frame - 54, fps, config: { damping: 12, stiffness: 110 } });
  return (
    <AbsoluteFill>
      <Heading kicker="MEET YOUR FUTURE" title="Meet your future self." size={vertical ? 96 : 84} top={vertical ? 230 : 70} />
      <div style={{ position: 'absolute', left: (width - stageWidth) / 2, top: vertical ? 560 : 290, width: stageWidth, height: stageHeight }}>
        <svg width={stageWidth} height={stageHeight + 40} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <ellipse cx={start.x} cy={start.y} rx={110} ry={26} fill="#FFFFFF0D" stroke="#FFFFFF22" strokeWidth={2} />
          <ellipse cx={goal.x} cy={goal.y} rx={150 * (1 + arrive * .08)} ry={34} fill={`rgba(252, 208, 15, ${.08 + arrive * .14})`} stroke="#FCD00F66" strokeWidth={2} />
          <path d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${goal.x} ${goal.y}`} fill="none" stroke="#FCD00F" strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - eased} style={{ filter: 'drop-shadow(0 0 10px #FCD00FAA)' }} />
          {draw > 0 && draw < 1 && <circle cx={orb.x} cy={orb.y} r={16} fill="#FFF1A8" style={{ filter: 'drop-shadow(0 0 22px #FCD00F)' }} />}
        </svg>
        {[0, 1].map(i => (
          <div key={i} style={{ position: 'absolute', left: goal.x - futureHeight * .45, top: goal.y - futureHeight * .55 - futureHeight * .135, width: futureHeight * .9, height: futureHeight * .27, borderRadius: '50%', border: '3px solid #FCD00F', opacity: arrive * .35, transform: `rotate(${(i ? -16 : 12) + Math.sin(frame / 30 + i) * 6}deg)` }} />
        ))}
        <Rise delay={8} y={60} blur={18} style={{ position: 'absolute', left: start.x - studentHeight / 4, top: start.y - studentHeight + 8 }}><Character level={0} height={studentHeight} /></Rise>
        <div style={{ position: 'absolute', left: goal.x - futureHeight / 4, top: goal.y - futureHeight + 8, opacity: arrive, filter: `blur(${(1 - arrive) * 16}px)`, transform: `translateY(${(1 - arrive) * 60}px) scale(${.9 + arrive * .1})`, transformOrigin: 'bottom center' }}><Character level={5} height={futureHeight} /></div>
        <Rise delay={12} style={{ ...labelGlass, position: 'absolute', left: start.x - 130, width: 260, top: start.y + 40, textAlign: 'center' }}>
          <div style={{ color: '#98A7CF', fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>THE START</div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>You, today</div>
        </Rise>
        <Rise delay={66} style={{ ...labelGlass, position: 'absolute', left: goal.x - 220, width: 440, top: goal.y + 56, textAlign: 'center', borderColor: '#FCD00F55' }}>
          <div style={{ color: '#E4CE68', fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>LEADERSHIP</div>
          <div style={{ color: YELLOW, fontSize: 36, fontWeight: 800, lineHeight: 1.2 }}>Chief Information<br />Security Officer</div>
        </Rise>
      </div>
    </AbsoluteFill>
  );
}

const LEVELS = [
  ['THE START', 'You, today'], ['ENTRY', 'Associate Security Analyst'], ['MID-CAREER', 'Cyber Risk Analyst'],
  ['SENIOR', 'Security Engineer'], ['SENIOR', 'Cyber Risk Manager'], ['LEADERSHIP', 'CISO'],
];

function LevelsScene() {
  const frame = useCurrentFrame();
  const { fps, width, height, vertical } = useLayout();
  const characterHeight = vertical ? 300 : 290;
  const first = vertical ? { x: 120, y: 1690 } : { x: 220, y: 930 };
  const last = vertical ? { x: width - 120, y: 860 } : { x: width - 220, y: 560 };
  const points = LEVELS.map((_, i) => ({ x: first.x + (last.x - first.x) * i / 5, y: first.y + (last.y - first.y) * i / 5 }));
  const stepFrames = 22;
  const draw = interpolate(frame, [24, 24 + stepFrames * 5], [0, 1], CLAMP);
  const reached = Math.min(5, Math.floor(draw * 5 + .001));
  const polyline = points.map(({ x, y }) => `${x},${y}`).join(' ');
  return (
    <AbsoluteFill>
      <Heading kicker="YOUR JOURNEY" title={<>Your future.<br /><span style={{ color: YELLOW }}>One level at a time.</span></>} size={vertical ? 100 : 76} top={vertical ? 200 : 60} />
      <div style={{ position: 'absolute', left: vertical ? 80 : 110, top: vertical ? 640 : 360, opacity: interpolate(frame, [20, 34], [0, 1], CLAMP) }}>
        <div style={{ color: '#98A7CF', fontSize: 24, fontWeight: 700, letterSpacing: 4 }}>LEVEL</div>
        <div style={{ color: YELLOW, fontSize: vertical ? 150 : 120, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{String(reached + 1).padStart(2, '0')}</div>
      </div>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <polyline points={polyline} fill="none" stroke="#FFFFFF1F" strokeWidth={4} strokeDasharray="10 14" />
        <polyline points={polyline} fill="none" stroke="#FCD00F" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: 'drop-shadow(0 0 10px #FCD00FAA)' }} />
        {points.map(({ x, y }, i) => <ellipse key={i} cx={x} cy={y} rx={70} ry={16} fill={i <= reached && draw > 0 ? '#FCD00F26' : '#FFFFFF0A'} stroke={i <= reached && draw > 0 ? '#FCD00F88' : '#FFFFFF1F'} strokeWidth={2} />)}
      </svg>
      {points.map(({ x, y }, i) => {
        const p = spring({ frame: frame - 18 - i * stepFrames, fps, config: { damping: 13, stiffness: 120 } });
        const current = i === reached;
        return (
          <div key={i} style={{ position: 'absolute', left: x - 100, top: y - characterHeight + 6, width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: p, filter: `blur(${(1 - p) * 14}px)`, transform: `translateY(${(1 - p) * 70}px)` }}>
            <Character level={i} height={characterHeight} style={{ transform: `translateY(${current ? -10 : 0}px)` }} />
            <div style={{ ...labelGlass, marginTop: 26, textAlign: 'center', ...(current && { borderColor: '#FCD00F66' }) }}>
              <div style={{ color: current ? YELLOW : '#B7C3E6', fontSize: 17, fontWeight: 700, letterSpacing: 2.5 }}>{LEVELS[i][0]}</div>
              <div style={{ marginTop: 3, color: '#FFFFFF', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{LEVELS[i][1]}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function EndScene() {
  const frame = useCurrentFrame();
  const { vertical } = useLayout();
  const glow = .5 + .5 * Math.sin(frame / 7);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <Rise delay={2} y={50}>
        <div style={{ width: 150, height: 150, borderRadius: 40, background: YELLOW, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px #FCD00F44' }}>
          <svg width={84} height={84} viewBox="0 0 24 24" fill="none"><path d="M12 21s6-6.7 6-12a6 6 0 1 0-12 0c0 5.3 6 12 6 12Z" fill={NAVY} /><circle cx="12" cy="9" r="2" fill={YELLOW} /></svg>
        </div>
      </Rise>
      <Rise delay={10} y={44} blur={18}><div style={{ marginTop: 50, fontSize: vertical ? 92 : 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>COSMO Career{vertical ? <br /> : ' '}Pathways</div></Rise>
      <Rise delay={18}><div style={{ marginTop: 28, color: INK_SOFT, fontSize: vertical ? 40 : 38 }}>From where you are, to where you want to be.</div></Rise>
      <Rise delay={28} y={30}>
        <div style={{ marginTop: 64, display: 'inline-flex', alignItems: 'center', gap: 18, borderRadius: 999, padding: '30px 54px', background: YELLOW, color: NAVY, fontSize: 40, fontWeight: 800, boxShadow: `0 0 ${30 + glow * 40}px #FCD00F${glow > .5 ? '88' : '55'}` }}>
          Find my future
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
        </div>
      </Rise>
      <Rise delay={38}><div style={{ marginTop: 50, color: '#AFBDDF', fontSize: 28, letterSpacing: .5 }}>abi437.github.io/cosmo-career-pathways</div></Rise>
      <Rise delay={44} style={{ marginTop: 34 }}><Pill size={22}>GRADUATION PROJECT</Pill></Rise>
    </AbsoluteFill>
  );
}

const SCENE_COMPONENTS = { question: QuestionScene, fields: FieldsScene, future: FutureScene, levels: LevelsScene, end: EndScene };

export function Promo() {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <Backdrop />
      {SCENES.map(({ id, from, duration }) => {
        const Component = SCENE_COMPONENTS[id];
        return <Sequence key={id} from={from} durationInFrames={duration}><Scene duration={duration}><Component /></Scene></Sequence>;
      })}
    </AbsoluteFill>
  );
}
