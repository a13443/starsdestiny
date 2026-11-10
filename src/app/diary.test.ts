import { describe, it, expect } from 'vitest';
import { createKV } from '../platform';
import { dayReading, kstToday, toProfile, EMPTY_FORM } from './domain';
import { DIARY_KEY, MAX_SAVED_DAYS, loadDiary, matches, recent, recordMood, sanitizeDiary, summarize, trimDiary, type Diary } from './diary';

const mem = () => createKV(null, null);
const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);

describe('운세 일기 규칙', () => {
  it('일치 판정: 4~5점=좋았어요, 3점=비슷했어요, 1~2점=힘들었어요', () => {
    for (const [lv, mood, ok] of [[5, 'good', true], [4, 'good', true], [3, 'good', false], [3, 'ok', true], [4, 'ok', false], [2, 'bad', true], [1, 'bad', true], [3, 'bad', false], [5, 'bad', false], [1, 'good', false]] as const)
      expect(matches({ level: lv, mood }), `${lv}점 ${mood}`).toBe(ok);
  });
  it('최근 14일: 최신순, 일치 개수 집계', () => {
    const d: Diary = {}; for (let i = 0; i < 20; i++) d[day(i)] = { level: 4, mood: i % 2 ? 'good' : 'bad' };
    const s = summarize(d); expect(s.count).toBe(14); expect(s.list[0].date).toBe(day(19)); expect(s.list.at(-1)!.date).toBe(day(6));
    expect(s.matched).toBe(7); expect(summarize({}).count).toBe(0);
    expect(recent(d, 3).map((x) => x.date)).toEqual([day(19), day(18), day(17)]);
  });
  it('저장은 최대 60일: 오래된 기록부터 잘려요', () => {
    const d: Diary = {}; for (let i = 0; i < 75; i++) d[day(i)] = { level: 3, mood: 'ok' };
    const t = trimDiary(d); const keys = Object.keys(t).sort(); expect(keys.length).toBe(MAX_SAVED_DAYS); expect(keys[0]).toBe(day(15)); expect(keys.at(-1)).toBe(day(74));
  });
  it('깨진 저장값은 항목 단위로 걸러요(날짜 형식, mood, level 범위, 형식 오류)', () => {
    const raw = { '2026-01-01': { mood: 'good', level: 5 }, '2026-1-2': { mood: 'good', level: 5 }, '2026-01-03': { mood: 'great', level: 5 }, '2026-01-04': { mood: 'ok', level: 9 }, '2026-01-05': { mood: 'ok', level: '3' }, '2026-01-06': null, '2026-01-07': { mood: 'bad', level: 2.4 }, x: 1 };
    expect(sanitizeDiary(raw)).toEqual({ '2026-01-01': { mood: 'good', level: 5 }, '2026-01-07': { mood: 'bad', level: 2 } });
    for (const bad of [null, undefined, 'x', 3, []]) expect(sanitizeDiary(bad)).toEqual({});
  });
});

describe('운세 일기 저장', () => {
  it('기록하고 불러오기, 같은 날 다시 기록하면 덮어써요', async () => {
    const kv = mem(); expect(await loadDiary(kv)).toEqual({});
    await recordMood(kv, '2026-11-06', 'good', 4); expect(await loadDiary(kv)).toEqual({ '2026-11-06': { mood: 'good', level: 4 } });
    const next = await recordMood(kv, '2026-11-06', 'bad', 4); expect(next).toEqual({ '2026-11-06': { mood: 'bad', level: 4 } });
    await recordMood(kv, '2026-11-07', 'ok', 3); expect(Object.keys(await loadDiary(kv)).sort()).toEqual(['2026-11-06', '2026-11-07']);
  });
  it('저장소가 하나의 키(diary:v1)만 써서 브릿지 호출이 늘지 않아요', async () => {
    const keys: string[] = [];
    const kv = createKV({ Storage: { getItem: async (k) => { keys.push('get:' + k); return null; }, setItem: async (k) => { keys.push('set:' + k); }, removeItem: async () => {} } });
    await recordMood(kv, '2026-11-06', 'ok', 3);
    expect(new Set(keys.map((k) => k.split(':').slice(1).join(':')))).toEqual(new Set([DIARY_KEY])); expect(keys.filter((k) => k.startsWith('set:')).length).toBe(1);
  });
  it('61일째를 기록하면 가장 오래된 날이 빠져요', async () => {
    const kv = mem(); for (let i = 0; i < MAX_SAVED_DAYS + 1; i++) await recordMood(kv, day(i), 'ok', 3);
    const d = await loadDiary(kv); expect(Object.keys(d).length).toBe(MAX_SAVED_DAYS); expect(d[day(0)]).toBeUndefined(); expect(d[day(MAX_SAVED_DAYS)]).toBeDefined();
  });
  it('저장소에 깨진 값이 있어도 불러오기가 죽지 않아요', async () => {
    const kv = mem(); await kv.set(DIARY_KEY, '{bad json'); expect(await loadDiary(kv)).toEqual({});
    await kv.set(DIARY_KEY, JSON.stringify({ '2026-11-06': { mood: 'zzz', level: 3 } })); expect(await loadDiary(kv)).toEqual({});
  });
});

describe('일기 날짜는 한국 시각(KST) 기준이고 오늘 화면의 날짜와 항상 같아요', () => {
  const p = toProfile({ ...EMPTY_FORM, y: 1995, m: 5, d: 12, gender: 'F' });
  const ymd = (R: { date: { y: number; m: number; d: number } }) => `${R.date.y}-${String(R.date.m).padStart(2, '0')}-${String(R.date.d).padStart(2, '0')}`;
  it('KST 자정 경계(23:59:59 ↔ 00:00:00)와 새해 경계에서 키가 바뀌어요', () => {
    for (const [iso, want] of [['2026-11-06T14:59:59Z', '2026-11-06'], ['2026-11-06T15:00:00Z', '2026-11-07'], ['2026-11-06T03:00:00Z', '2026-11-06'], ['2026-12-31T14:59:59Z', '2026-12-31'], ['2026-12-31T15:00:00Z', '2027-01-01'], ['2028-02-28T15:00:00Z', '2028-02-29']] as const) {
      const now = new Date(iso); expect(kstToday(now), iso).toBe(want); expect(ymd(dayReading(p, now).R), `오늘 화면 ${iso}`).toBe(want);
    }
  });
  it('기기 시간대와 무관해요(UTC 날짜가 아니라 KST 날짜를 써요)', () => {
    const now = new Date('2026-11-06T20:00:00Z'); // UTC로는 11/6 저녁이지만 KST로는 11/7 05:00
    expect(kstToday(now)).toBe('2026-11-07'); expect(now.toISOString().slice(0, 10)).toBe('2026-11-06');
  });
});
