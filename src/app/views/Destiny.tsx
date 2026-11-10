import { useMemo } from 'react';
import { daewoonDetailOf, destinyBase, destinyReading, kstYear, viewOf, type Profile } from '../domain';
import type { El } from '../types';
import { AffChips, AiRow, Chip, Disclaimer, HowNote, LockedCard, Section } from '../ui';

const GROUP_COL: Record<string, El> = { 비겁: 'metal', 식상: 'fire', 재성: 'earth', 관성: 'water', 인성: 'wood' };

export function DestinyView({ profile }: { profile: Profile }) {
  const D = useMemo(() => destinyReading(profile, kstYear()), [profile]);
  const base = useMemo(() => destinyBase(profile), [profile]);
  const DW = useMemo(() => daewoonDetailOf(profile, kstYear()), [profile]);
  const s = viewOf(profile).saju;
  return (
    <section>
      <AiRow />
      <h1 className="h1">{s.dayMaster.ko}{s.dayMaster.hanja} 일간 · {base.top} 중심</h1>
      <p className="lead">{s.dayMaster.line}</p>
      <p className="sub">내 사주에서 가장 두드러진 기운은 ‘{D.top}’, 그다음은 ‘{D.second}’이에요.</p>
      <Section title="십성 분포">
        <p className="note">일간을 뺀 7글자(시간 미입력이면 5글자)의 관계예요.</p>
        <div className="bar" aria-hidden="true">{base.ranked.filter((x) => x[1] > 0).map((x) => <i key={x[0]} style={{ background: `var(--${GROUP_COL[x[0]]})`, flex: x[1] }} />)}</div>
        <div className="legend">{base.ranked.map((x) => <span key={x[0]}><b>{x[0]}</b> {x[1]}</span>)}</div>
      </Section>
      <HowNote kind="destiny" />
      <Section title="10년 대운, 자세히">
        {DW ? (
          <>
            <p className="note">10년마다 바뀌는 큰 흐름이에요. 지금 지나는 대운은 펼쳐져 있고, 다른 대운도 눌러서 읽을 수 있어요. 대운은 {DW.forward ? '순행' : '역행'}으로 계산돼요.</p>
            <ul className="timeline" aria-label="10년 단위 대운 목록">
              {DW.items.map((x) => (
                <li key={x.ganzhi + x.startAge} aria-current={x.current ? 'true' : undefined} className={x.current ? 'cur' : ''}>
                  <details open={x.current}>
                    <summary>
                      <span className="gz" style={{ color: `var(--${GROUP_COL[x.group]})` }}>{x.ganzhi}</span>
                      <span className="age">{x.startAge}~{x.endAge}세 · {x.startYear}~{x.endYear}</span>
                      <Chip el={GROUP_COL[x.group]} label={`${x.group}${x.current ? ' · 지금' : ''}`} />
                    </summary>
                    <div className="dwBody">
                      <p className="strong">{x.stageName} · {x.ko} 대운 · ‘{x.tg}’ 흐름</p>
                      {x.paragraphs.map((t, i) => <p key={i} className="para">{t}</p>)}
                      <h3 className="h3">분야별로 보면</h3>
                      <dl className="kv2">{x.fields.map((f) => <div key={f.key}><dt>{f.label}</dt><dd>{f.text}</dd></div>)}</dl>
                      <h3 className="h3">잘 풀리는 점</h3>
                      <ul className="why">{x.good.map((t, i) => <li key={i} className="pos"><b aria-hidden="true">＋</b><span><span className="sr">잘 풀리는 점: </span>{t}</span></li>)}</ul>
                      <h3 className="h3">조심할 점</h3>
                      <ul className="why">{x.watch.map((t, i) => <li key={i} className="neg"><b aria-hidden="true">－</b><span><span className="sr">조심할 점: </span>{t}</span></li>)}</ul>
                      <h3 className="h3">이 시기를 이렇게 보내 보세요</h3>
                      <ul className="tips">{x.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </>
        ) : <LockedCard title="대운" why="성별을 선택하면 열려요. 대운의 순행·역행 방향이 성별과 태어난 해에 따라 달라서 필요해요." />}
      </Section>
      <Section title="분야별 풀이, 자세히">
        {D.fields.map((f) => (
          <article key={f.key} className="cat" aria-label={f.label}>
            <div className="catHead"><strong>{f.label}</strong></div>
            <AffChips strong={f.strong} affinity={D.affinity} />
            {f.paragraphs.map((t, i) => <p key={i} className="para">{t}</p>)}
            <ul className="tips">{f.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </article>
        ))}
      </Section>
      <p className="note">풀이는 일간과 대운·세운의 관계를 바탕으로 한 경향이에요. 확정된 미래가 아니라 나를 돌아보는 참고로만 봐주세요.</p>
      <Disclaimer />
    </section>
  );
}
