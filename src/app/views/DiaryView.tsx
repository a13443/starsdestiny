import { Button } from '@toss/tds-mobile';
import { MOOD_LABEL, SHOWN_DAYS, summarize, type Diary } from '../diary';
import { AiRow, Disclaimer, Section, Stars } from '../ui';

const fmt = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;

/** 운세 일기: 기록한 날의 종합 운과 실제 느낌을 나란히 보여줘요(무료). */
export function DiaryView({ diary, onGoToday }: { diary: Diary; onGoToday: () => void }) {
  const s = summarize(diary);
  return (
    <section>
      <AiRow />
      <h1 className="h1">운세 일기</h1>
      <p className="lead">기록한 날과 그날의 종합 운을 나란히 보여드려요.</p>
      {s.count ? (
        <>
          <article className="cat" aria-label="요약">
            <strong>최근 {s.count}일 중 {s.matched}일이 풀이와 비슷했어요</strong>
            <p className="note">종합 4~5점인 날에 “좋았어요”, 3점인 날에 “비슷했어요”, 1~2점인 날에 “힘들었어요”를 고르면 비슷한 것으로 세요. 사람은 일반적인 문장도 자기 이야기처럼 느끼는 경향(바넘 효과)이 있어서, 숫자로 확인해 보는 게 도움이 돼요. 최근 {SHOWN_DAYS}일까지만 보여드려요.</p>
          </article>
          <Section title="기록">
            {s.list.map(({ date, entry }) => (
              <article key={date} className="cat" aria-label={fmt(date)}>
                <div className="catHead"><strong>{fmt(date)}</strong><Stars n={entry.level} /></div>
                <p className="note">실제 느낌: {MOOD_LABEL[entry.mood]}</p>
              </article>
            ))}
          </Section>
        </>
      ) : (
        <article className="cat" aria-label="기록 없음">
          <strong>아직 기록이 없어요</strong>
          <p className="note">오늘의 운세풀이 맨 아래에서 하루를 기록할 수 있어요.</p>
          <Button display="block" size="large" onClick={onGoToday}>오늘의 운세풀이로</Button>
        </article>
      )}
      <Disclaimer />
    </section>
  );
}
