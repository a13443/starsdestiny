import { Border } from '@toss/tds-mobile';
import { Seg } from '../Seg';
import { useMemo, useState } from 'react';
import { yearReading, kstYear, type Profile } from '../domain';
import { AiRow, Disclaimer, HowNote, Section, Stars, VoteChips } from '../ui';

export function NewYearView({ profile }: { profile: Profile }) {
  const base = useMemo(() => kstYear(), []);
  const [year, setYear] = useState(base);
  const [tab, setTab] = useState(0);
  const Y = useMemo(() => yearReading(profile, year), [profile, year]);
  const c = Y.cats[Math.min(tab, Y.cats.length - 1)];
  const best = Y.months.reduce((a, b) => (b.level > a.level ? b : a), Y.months[0]);
  return (
    <section>
      <AiRow />
      <h1 className="h1">{Y.year}년 {Y.pillarKo}년({Y.pillar})</h1>
      <Seg value={String(year)} onChange={(v) => { setYear(Number(v)); setTab(0); }} items={[{ value: String(base), label: `올해 ${base}년` }, { value: String(base + 1), label: `내년 ${base + 1}년` }]} />
      <p className="lead">내 일간 기준 {Y.tg}의 해예요. {Y.head}</p>
      <ul className="facts">
        {Y.samjae && <li>삼재: {Y.samjae.stage}</li>}
        {Y.personalYear && <li>수비학 개인년: {Y.personalYear.keyPy}</li>}
        {Y.dasha && <li>베딕 대운: {Y.dasha.maha.ko} {Y.dasha.maha.years}년 · {Y.dasha.maha.theme}</li>}
      </ul>
      <HowNote kind="reading" />
      <Section title="5가지 운, 시기별로 자세히">
        <p className="note">체계 칩은 그 분야에 대한 체계별 표예요(＋ 좋은 방향, － 조심, · 중립). 연초는 2~5월, 연중은 6~9월, 연말은 10월부터 다음 해 1월까지예요. 절기월 기준이라 달력과 한두 주 차이가 날 수 있어요.</p>
        <Seg value={String(tab)} onChange={(v) => setTab(Number(v))} items={Y.cats.map((x, i) => ({ value: String(i), label: x.label.replace('운', '') }))} />
        <article className="cat" aria-label={c.label}>
          <div className="catHead"><strong>{c.label}</strong><span><Stars n={c.level} /> {c.levelLabel}</span></div>
          <p className="strong">{c.summary}</p>
          <ul className="phases">{c.phases.map((p) => <li key={p.label}><span>{p.label}</span><Stars n={p.level} /></li>)}</ul>
          <VoteChips votes={c.votes} />
          {c.paragraphs.map((t, i) => <p key={i} className="para">{t}</p>)}
          <h3 className="h3">실천 팁</h3>
          <ul className="tips">{c.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </article>
      </Section>
      <Section title="월별 흐름">
        <p className="note">전체 운의 월별 흐름이에요. 별이 가장 높은 달에 배경색이 있어요.</p>
        <ul className="months">{Y.months.map((m) => <li key={m.solarMonth} className={m.solarMonth === best.solarMonth ? 'now' : ''}><span>{m.solarMonth}월 · {m.pillar} {m.tg}</span><span className="sub">{m.key}</span><Stars n={m.level} /></li>)}</ul>
      </Section>
      <Border variant="height16" />
      <p className="note">신년 기준은 입춘이에요. 음력 설을 새해로 보는 풀이와는 며칠 차이가 날 수 있어요. 토정비결의 144괘 풀이가 아니라 6개 체계의 투표를 겹친 연운이에요.</p>
      <Disclaimer />
    </section>
  );
}
