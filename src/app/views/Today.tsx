import { Button } from '@toss/tds-mobile';
import { useMemo } from 'react';
import { COLOR_HEX, dayReading, type Profile } from '../domain';
import { MOOD_LABEL, type Mood } from '../diary';
import { AiRow, Chip, Disclaimer, HowNote, Reasons, Section, Stars, VoteChips } from '../ui';
import { EL_KO } from './Home';
import { Icon, TodayBars, catIcon } from '../visual';

/** 오늘의 운세풀이. 종합 운은 잠금 전에도 보이고(헤더), 나머지는 광고 게이트가 열린 뒤에만 보여줘요. */
export function TodayView({ profile, unlocked, mood, onMood, onDiary }: { profile: Profile; unlocked: boolean; mood?: Mood | null; onMood?: (m: Mood, level: number) => void; onDiary?: () => void }) {
  const { R, cats } = useMemo(() => dayReading(profile), [profile]);
  const L = R.lucky, bestIdx = R.hours.list.indexOf(R.hours.best);
  return (
    <section>
      <AiRow />
      <div className="hero2 todayHero">
        <p className="heroKicker"><span>오늘의 별</span><span className="pillarHanja" aria-hidden="true">{R.pillar}</span></p>
        <h1 className="h1 heroH1">{R.date.m}월 {R.date.d}일 · {R.pillarKo}일</h1>
        <div className="tags heroTags">
          <span className="tag">음력 {R.cal.lunar.leap ? '윤' : ''}{R.cal.lunar.month}월 {R.cal.lunar.day}일</span>
          {R.cal.sonOps && <span className="tag open">손 없는 날</span>}
          <span className="tag">다음 절기 {R.cal.next.name} {R.cal.next.m}/{R.cal.next.d}</span>
        </div>
        <article className="cat heroCat" aria-label="종합 운">
          <div className="catHead"><strong>종합 운 <span className="lvl">{R.overallLabel}</span></strong><Stars n={R.overall} /></div>
          <p className="note">내 일간 기준 {R.tg}, {R.tgTheme} 날이에요.</p>
        </article>
      </div>
      {unlocked && (
        <>
          <Section title="오늘의 5가지 운"><TodayBars cats={cats} /></Section>
          <HowNote kind="reading" />
          <Section title="5가지 운, 자세히">
            {cats.map((c) => (
              <article key={c.key} className="cat" aria-label={c.label}>
                <div className="catHead"><strong><span className="catIco"><Icon name={catIcon(c.key)} size={18} /></span>{c.label} <span className="lvl">{c.levelLabel}</span></strong><Stars n={c.level} /></div>
                <p className="strong">{c.summary}</p>
                <VoteChips votes={c.votes} />
                <p className="sub">{c.consensus.text}</p>
                <h3 className="h3">체계별 근거</h3>
                {c.items.length ? <Reasons items={c.items} /> : <ul className="why"><li><b aria-hidden="true">·</b><span>크게 기우는 신호가 없는 평범한 흐름이에요.</span></li></ul>}
                <h3 className="h3">오늘 이렇게 보내 보세요</h3>
                {c.today.map((t, i) => <p key={i} className="para">{t}</p>)}
                <h3 className="h3">실천 팁</h3>
                <ul className="tips">{c.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </article>
            ))}
          </Section>
          <Section title="시간대 흐름">
            <article className="cat">
              <p className="note">사주의 12시진(2시간 단위)으로 본 오늘의 전체 흐름이에요. 가장 높은 시간대는 <b>{R.hours.best.ko}시({R.hours.best.range})</b>예요.</p>
              <div className="hours" role="img" aria-label={`시간대별 흐름: ${R.hours.list.map((x) => `${x.ko}시 ${x.level}점`).join(', ')}`}>
                {R.hours.list.map((x, i) => <i key={x.ko} className={i === bestIdx ? 'best' : ''} style={{ height: `${x.level * 20}%` }} title={`${x.ko}시 ${x.range}`} />)}
              </div>
              <div className="hours-l" aria-hidden="true">{R.hours.list.map((x) => <span key={x.ko}>{x.ko}</span>)}</div>
            </article>
          </Section>
          <Section title="오늘의 행운">
            <article className="cat">
              <p className="note">{L.why} 오늘 채워줄 기운은 <Chip el={L.element} label={L.elementKo || EL_KO[L.element]} />이에요.</p>
              <dl className="kv">
                <dt>행운의 색</dt>
                <dd>{L.colors.map((n) => <span key={n} className="colorItem"><span className="swatch" style={{ background: COLOR_HEX[n] }} />{n}{n === L.color ? ' ★' : ''}</span>)}</dd>
                <dt>행운의 물건</dt><dd>{L.items.join(' · ')}</dd>
                <dt>행운의 코디</dt><dd>{L.outfit}</dd>
                <dt>행운의 방위</dt><dd>{L.dir}</dd>
                <dt>오행 숫자</dt><dd>{L.nums.join(', ')} (전통 하도수)</dd>
                <dt>좋은 시간대</dt><dd>{L.hour}</dd>
              </dl>
            </article>
          </Section>
          {R.notes.length > 0 && <article className="cat"><p className="note">{R.notes.map((n, i) => <span key={i}>{n}<br /></span>)}</p></article>}
          <Section title="오늘의 기준">
            <article className="cat"><dl className="kv">{R.materials.map((m, i) => <><dt key={`t${i}`}>{m.sys}</dt><dd key={`d${i}`}>{m.text}</dd></>)}</dl></article>
          </Section>
          {onMood && (
            <Section title="오늘 하루는 어땠어요?">
              <article className="cat" aria-label="하루 기록">
                <p className="note">저녁에 기록해 두면 풀이가 실제 하루와 얼마나 비슷했는지 볼 수 있어요.</p>
                <div className="moods" role="group" aria-label="오늘 하루 느낌">
                  {(['good', 'ok', 'bad'] as Mood[]).map((m) => (
                    <Button key={m} display="block" size="large" variant={mood === m ? 'fill' : 'weak'} aria-pressed={mood === m} onClick={() => onMood(m, R.overall)}>{MOOD_LABEL[m]}</Button>
                  ))}
                </div>
              </article>
              {onDiary && <div className="gap" />}
              {onDiary && <Button display="block" size="large" variant="weak" onClick={onDiary}>운세 일기 보기</Button>}
            </Section>
          )}
          <p className="note">별 개수는 체계별 투표로 계산해요. 사주를 중심으로 2표, 보조 체계는 1표씩이에요. 풀이 규칙은 이 앱의 해석이고, 같은 입력과 같은 날이면 항상 같은 결과가 나와요.</p>
        </>
      )}
      <Disclaimer />
    </section>
  );
}
