import { Seg } from '../Seg';
import { useMemo, useState } from 'react';
import { TAEKIL_CATS, taekilList, weekdayKo, type Profile } from '../domain';
import { AiRow, Disclaimer, Stars } from '../ui';

export function TaekilView({ profile }: { profile: Profile }) {
  const [cat, setCat] = useState(TAEKIL_CATS[0]);
  const list = useMemo(() => taekilList(profile, new Date(), 45), [profile]);
  const items = list[cat] ?? [];
  return (
    <section>
      <AiRow />
      <h1 className="h1">택일</h1>
      <p className="lead">앞으로 45일 안에서 내 일간과 잘 맞는 날을 골랐어요.</p>
      <Seg value={cat} onChange={setCat} items={TAEKIL_CATS.map((c) => ({ value: c, label: c }))} />
      {items.length === 0 && <p className="sub">조건에 맞는 날이 없어요.</p>}
      {items.map((t) => (
        <article key={`${t.y}-${t.m}-${t.d}`} className="cat tk">
          <div className="catHead">
            <strong className="date">{t.m}월 {t.d}일 ({weekdayKo(t.y, t.m, t.d)})</strong>
            <span><Stars n={t.score} />{t.sonOps ? ' · 손 없는 날' : ''}</span>
          </div>
          <p className="sub">음력 {t.lunar.leap ? '윤' : ''}{t.lunar.month}월 {t.lunar.day}일 · 일진 {t.pillar} · {t.tg}</p>
          <ul className="why">{t.why.map((w, i) => <li key={i} className="pos"><b aria-hidden="true">＋</b><span>{w}</span></li>)}{t.caution.map((w, i) => <li key={`c${i}`} className="neg"><b aria-hidden="true">－</b><span>{w}</span></li>)}</ul>
        </article>
      ))}
      <p className="note">전통 택일은 건제12신 같은 더 많은 기준을 함께 보는데, 이 앱은 손 없는 날과 일간·일지 관계, 수성 역행만 쓰는 간이 규칙이에요. 중요한 일정은 가족·전문가와 함께 정해 주세요.</p>
      <Disclaimer />
    </section>
  );
}
