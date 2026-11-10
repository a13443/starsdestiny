import { Button } from '@toss/tds-mobile';
import { useState } from 'react';
import { BirthFields } from '../BirthFields';
import { EMPTY_FORM, matchDetailOf, toProfile, type BirthForm, type Profile } from '../domain';
import type { El, MatchDetailResult, MatchSection, PersonCard } from '../types';
import { AiRow, Disclaimer, Section } from '../ui';
import { PairRow, VerdictBar } from '../visual';

const EL_ORDER: El[] = ['wood', 'fire', 'earth', 'metal', 'water'];
const EL_NAME: Record<El, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };

/** 두 사람의 데이터를 항목별로 나란히 보여줘요. 시간을 모르면 시주 칸은 '모름'으로 둬요. */
function PeopleTable({ people }: { people: PersonCard[] }) {
  const [me, you] = people;
  const row = (label: string, a: string, b: string) => <tr key={label}><th scope="row">{label}</th><td>{a}</td><td>{b}</td></tr>;
  const pil = (p: PersonCard, i: number) => (p.pillars[i].hanja ? `${p.pillars[i].hanja} (${p.pillars[i].ko})` : '모름');
  const cnt = (p: PersonCard) => EL_ORDER.map((k) => `${EL_NAME[k]} ${p.count[k]}`).join(' · ');
  return (
    <table className="pt" aria-label="두 사람의 데이터">
      <thead><tr><th scope="col" /><th scope="col">나</th><th scope="col">상대</th></tr></thead>
      <tbody>
        {row('연주', pil(me, 3), pil(you, 3))}
        {row('월주', pil(me, 2), pil(you, 2))}
        {row('일주', pil(me, 1), pil(you, 1))}
        {row('시주', pil(me, 0), pil(you, 0))}
        {row('일간', `${me.dayMaster.ko}${me.dayMaster.hanja} · ${me.dayMaster.elementName}`, `${you.dayMaster.ko}${you.dayMaster.hanja} · ${you.dayMaster.elementName}`)}
        {row('일지', `${me.dayBranch.ko}${me.dayBranch.hanja}`, `${you.dayBranch.ko}${you.dayBranch.hanja}`)}
        {row('띠', me.animal, you.animal)}
        {row('오행 분포', cnt(me), cnt(you))}
        {row('별자리', `${me.west.name} · ${me.west.element}`, `${you.west.name} · ${you.west.element}`)}
        {row('생명수', String(me.num), String(you.num))}
        {row('본명성', me.nine ?? '성별 필요', you.nine ?? '성별 필요')}
        {row('베딕 달', me.vedicMoon ?? '시간·출생지 필요', you.vedicMoon ?? '시간·출생지 필요')}
      </tbody>
    </table>
  );
}

function SectionCard({ s, label }: { s: MatchSection; label: string }) {
  return (
    <article className="cat" aria-label={s.title}>
      <div className="catHead"><strong>{s.title}</strong><span className={`lv ${s.level}`}>{label}</span></div>
      <p className="strong">{s.headline}</p>
      {s.paragraphs.map((t, i) => <p key={i} className="para">{t}</p>)}
      {s.good.length > 0 && <><h3 className="h3">잘 맞는 점</h3><ul className="why">{s.good.map((t, i) => <li key={i} className="pos"><b aria-hidden="true">＋</b><span><span className="sr">잘 맞는 점: </span>{t}</span></li>)}</ul></>}
      {s.watch.length > 0 && <><h3 className="h3">조심할 점</h3><ul className="why">{s.watch.map((t, i) => <li key={i} className="neg"><b aria-hidden="true">－</b><span><span className="sr">조심할 점: </span>{t}</span></li>)}</ul></>}
    </article>
  );
}

export function MatchResultView({ R, onBack, onShare, sharing, notice }: { R: MatchDetailResult; onBack: () => void; onShare?: () => void; sharing?: boolean; notice?: string }) {
  return (
    <>
      <p className="lead">두 사람의 데이터를 먼저 비교하고, 항목별로 왜 잘 맞고 왜 조심해야 하는지 풀어 드려요.</p>
      <Section title="두 사람의 데이터"><PeopleTable people={R.people} /></Section>
      <Section title="한눈에 보기">
        <article className="cat" aria-label="종합">
          <PairRow me={R.people[0].dayMaster} you={R.people[1].dayMaster} relation={R.sections[0].headline} />
          <div className="catHead"><strong>{R.verdict.headline}</strong></div>
          <VerdictBar tally={R.verdict.tally} />
          {R.summary.map((t, i) => <p key={i} className="para">{t}</p>)}
          {R.strengths.length > 0 && <><h3 className="h3">잘 맞는 점 한눈에</h3><ul className="why">{R.strengths.map((x) => <li key={x.title} className="pos"><b aria-hidden="true">＋</b><span><strong>{x.title.split(' · ')[0]}</strong> {x.text}</span></li>)}</ul></>}
          {R.cautions.length > 0 && <><h3 className="h3">조심할 점 한눈에</h3><ul className="why">{R.cautions.map((x) => <li key={x.title} className="neg"><b aria-hidden="true">－</b><span><strong>{x.title.split(' · ')[0]}</strong> {x.text}</span></li>)}</ul></>}
        </article>
      </Section>
      <Section title="이런 장면에서 이렇게 나타나요">
        {R.scenes.map((x) => <article key={x.title} className="cat" aria-label={x.title}><strong>{x.title}</strong><p className="para">{x.text}</p></article>)}
      </Section>
      <Section title="항목별로 자세히">
        {R.sections.map((s) => <SectionCard key={s.key} s={s} label={R.LEVEL[s.level]} />)}
      </Section>
      <Section title="함께 잘 지내는 법">
        <ul className="tips">{R.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </Section>
      <div className="gap" />
      {onShare && <><Button display="block" size="large" loading={sharing} onClick={onShare}>궁합 결과 공유하기</Button><p className="note">공유 문구에는 두 사람의 집계만 담고, 상대의 생년월일·별자리·띠 같은 정보는 넣지 않아요.</p>{notice && <p className="msg" role="status">{notice}</p>}<div className="gap" /></>}
      <Button display="block" size="large" variant="weak" onClick={onBack}>다시 입력</Button>
      <Section title="읽기 전에 알아 두세요">
        <ul className="tips">{R.notes.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </Section>
    </>
  );
}

export function MatchView({ me, onShare, sharing, notice }: { me: Profile; onShare?: (R: MatchDetailResult) => void; sharing?: boolean; notice?: string }) {
  const [f, setF] = useState<BirthForm>(EMPTY_FORM);
  const [res, setRes] = useState<MatchDetailResult | null>(null);
  const [err, setErr] = useState('');
  const run = () => {
    try { setRes(matchDetailOf(me, toProfile(f))); setErr(''); }
    catch (e) { setErr((e as Error).message); setRes(null); }
  };
  return (
    <section>
      <AiRow />
      <h1 className="h1">궁합 보기</h1>
      {!res ? (
        <>
          <p className="lead">상대의 생년월일과 성별을 알려주세요. 시간과 출생지, 성별을 넣을수록 비교 항목이 늘어나요. 입력한 정보는 저장하지 않아요.</p>
          <BirthFields value={f} onChange={(p) => setF((x) => ({ ...x, ...p }))} advanced who="상대가 " />
          <div className="gap" />
          <Button display="full" size="xlarge" onClick={run}>궁합 결과 보기</Button>
          {err && <p className="msg" role="alert">{err}</p>}
        </>
      ) : <MatchResultView R={res} onBack={() => setRes(null)} onShare={onShare ? () => onShare(res) : undefined} sharing={sharing} notice={notice} />}
      <p className="note">궁합은 두 사람의 기운을 견주어 보는 재미 요소예요. 관계의 좋고 나쁨을 판단하는 근거로 쓰지 마세요.</p>
      <Disclaimer />
    </section>
  );
}
