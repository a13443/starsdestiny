import { getJSON, setJSON, type KV } from '../platform';

export type Mood = 'good' | 'ok' | 'bad';
export interface DiaryEntry { mood: Mood; level: number }
export type Diary = Record<string, DiaryEntry>;

export const DIARY_KEY = 'diary:v1';
export const MOOD_LABEL: Record<Mood, string> = { good: '기대보다 좋았어요', ok: '비슷했어요', bad: '기대보다 힘들었어요' };
export const MAX_SAVED_DAYS = 60;   // 저장은 최대 60일
export const SHOWN_DAYS = 14;       // 화면에는 최근 14일

const isMood = (m: unknown): m is Mood => m === 'good' || m === 'ok' || m === 'bad';
const isDate = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k);

/** 저장된 값이 깨져 있어도(수동 편집·옛 버전) 앱이 죽지 않게 항목 단위로 걸러요. */
export function sanitizeDiary(raw: unknown): Diary {
  const out: Diary = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const e = v as { mood?: unknown; level?: unknown } | null;
    if (!isDate(k) || !e || !isMood(e.mood) || typeof e.level !== 'number' || !(e.level >= 1 && e.level <= 5)) continue;
    out[k] = { mood: e.mood, level: Math.round(e.level) };
  }
  return out;
}

/** 오래된 기록부터 잘라 최대 일수를 지켜요. */
export function trimDiary(d: Diary, max = MAX_SAVED_DAYS): Diary {
  const keys = Object.keys(d).sort();
  return Object.fromEntries(keys.slice(Math.max(0, keys.length - max)).map((k) => [k, d[k]]));
}

/** 풀이와 실제 느낌이 비슷한지: 종합 4~5점=좋았어요, 3점=비슷했어요, 1~2점=힘들었어요 */
export const matches = (e: DiaryEntry) => (e.level >= 4 && e.mood === 'good') || (e.level === 3 && e.mood === 'ok') || (e.level <= 2 && e.mood === 'bad');

export function recent(d: Diary, n = SHOWN_DAYS): { date: string; entry: DiaryEntry }[] {
  return Object.keys(d).sort().reverse().slice(0, n).map((date) => ({ date, entry: d[date] }));
}
export function summarize(d: Diary, n = SHOWN_DAYS) {
  const list = recent(d, n);
  return { count: list.length, matched: list.filter((x) => matches(x.entry)).length, list };
}

export async function loadDiary(kv: KV): Promise<Diary> { return sanitizeDiary(await getJSON<unknown>(kv, DIARY_KEY, {})); }
/** 하루 한 건을 덮어써요(같은 날 다시 누르면 바뀐 느낌으로 갱신). 저장된 전체를 돌려줘요. */
export async function recordMood(kv: KV, date: string, mood: Mood, level: number): Promise<Diary> {
  const next = trimDiary({ ...(await loadDiary(kv)), [date]: { mood, level } });
  await setJSON(kv, DIARY_KEY, next);
  return next;
}
