import { useMemo } from 'react';
import { dayReading, type Profile } from './domain';
import type { DayCat, El } from './types';
import { Stars } from './ui';

/* ───────── 아이콘 (외부 파일 없이 인라인 SVG, 장식이라 스크린 리더는 읽지 않아요) ───────── */
const PATHS: Record<string, string> = {
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4',
  calendar: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 4h15M8 3v4m8-4v4',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z',
  check: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 4h15M8 3v4m8-4v4m-6.5 8.5 2 2 4-4',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  pencil: 'M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1Zm9-13 4 4',
  share: 'M12 15V4m0 0L8 8m4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6',
  card: 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 3.2 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4L12 8.2Z',
  sliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6m-6 4v6',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v10m-2.6-7.5c0-1 1.1-1.7 2.6-1.7s2.6.7 2.6 1.8-1.1 1.5-2.6 1.8-2.6.7-2.6 1.8 1.1 1.8 2.6 1.8 2.6-.6 2.6-1.6',
  briefcase: 'M4 8h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm5 0V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18',
  book: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h10',
  pulse: 'M3 12h4l2.5-6 4 12 2.5-6H21',
};
export type IconName = keyof typeof PATHS;
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={PATHS[name]} /></svg>;
}
/** 오늘의 5가지 운 카테고리별 아이콘 */
export const CAT_ICON: Record<string, IconName> = { wealth: 'coin', love: 'heart', biz: 'briefcase', study: 'book', cond: 'pulse' };
export const catIcon = (key: string): IconName => CAT_ICON[key] ?? 'sun';

/* ───────── 오늘의 별(히어로) ───────── */
/** 홈 맨 위 카드. 오늘의 일진과 종합 운을 크게 보여줘요(오늘 풀이 화면 헤더와 같은 값이에요). */
export function TodayHero({ profile }: { profile: Profile }) {
  const { R } = useMemo(() => dayReading(profile), [profile]);
  return (
    <section className="hero2" aria-label="오늘 종합 운">
      <p className="heroKicker"><span>오늘의 별</span><span>{R.date.m}월 {R.date.d}일</span></p>
      <p className="heroTitleRow"><span className="pillarHanja" aria-hidden="true">{R.pillar}</span><span className="pillarKo">{R.pillarKo}일</span></p>
      <p className="heroRate"><Stars n={R.overall} /><b>{R.overallLabel}</b></p>
      <p className="heroLine">내 일간 기준 {R.tg}, {R.tgTheme} 날이에요.</p>
    </section>
  );
}

/* ───────── 오늘의 5가지 운 막대 ───────── */
/** 레벨(1~5)을 막대 길이로. 색만으로 구분하지 않도록 숫자와 라벨도 같이 보여줘요. */
export const barWidth = (level: number) => `${Math.max(1, Math.min(5, level)) * 20}%`;
export const barTone = (level: number) => (level >= 4 ? 'hi' : level === 3 ? 'mid' : 'lo');
export function TodayBars({ cats }: { cats: Pick<DayCat, 'key' | 'label' | 'level' | 'levelLabel'>[] }) {
  return (
    <article className="cat barsCard" aria-label="오늘의 5가지 운 한눈에">
      <ul className="fortuneBars" aria-label="카테고리별 운 막대">
        {cats.map((c) => (
          <li key={c.key} aria-label={`${c.label} ${c.levelLabel} 5점 만점에 ${c.level}점`}>
            <span className={`barIcon tone-${barTone(c.level)}`}><Icon name={catIcon(c.key)} size={18} /></span>
            <span className="barLabel">{c.label}</span>
            <span className="barTrack" aria-hidden="true"><i className={`tone-${barTone(c.level)}`} style={{ width: barWidth(c.level) }} /></span>
            <span className="barNum" aria-hidden="true">{c.level}<small>/5</small></span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ───────── 궁합 판정 막대와 두 사람 ───────── */
export const verdictWidths = (t: { good: number; ok: number; tense: number }) => {
  const total = t.good + t.ok + t.tense || 1;
  return { good: (t.good / total) * 100, ok: (t.ok / total) * 100, tense: (t.tense / total) * 100 };
};
export function VerdictBar({ tally }: { tally: { good: number; ok: number; tense: number } }) {
  const w = verdictWidths(tally);
  return (
    <div className="verdict">
      <div className="verdictBar" role="img" aria-label={`잘 맞음 ${tally.good}개, 무난 ${tally.ok}개, 긴장 ${tally.tense}개`}>
        {tally.good > 0 && <i className="vb-good" style={{ width: `${w.good}%` }} />}
        {tally.ok > 0 && <i className="vb-ok" style={{ width: `${w.ok}%` }} />}
        {tally.tense > 0 && <i className="vb-tense" style={{ width: `${w.tense}%` }} />}
      </div>
      <p className="verdictLegend" aria-hidden="true"><span className="lg-good">잘 맞음 {tally.good}</span><span className="lg-ok">무난 {tally.ok}</span><span className="lg-tense">긴장 {tally.tense}</span></p>
    </div>
  );
}
export function PairRow({ me, you, relation }: { me: { ko: string; hanja: string; element: El; elementName: string }; you: { ko: string; hanja: string; element: El; elementName: string }; relation: string }) {
  const tile = (who: string, d: typeof me) => (
    <span className="pairTile" style={{ ['--c' as string]: `var(--${d.element})` }}>
      <small>{who}</small><b aria-hidden="true">{d.hanja}</b><span>{d.ko} · {d.elementName}</span>
    </span>
  );
  return (
    <div className="pairRow" role="group" aria-label="두 사람의 일간">
      {tile('나', me)}<span className="pairLink" aria-hidden="true">⇄</span>{tile('상대', you)}
      <p className="pairRel">{relation}</p>
    </div>
  );
}
