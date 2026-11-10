import * as E from '../engine/index.mjs';
import type { DaewoonDetailResult, DayCat, MatchDetailResult, DayReading, DestinyBase, DestinyReading, MatchResult, MyeongsikView, ProfileView, TaekilItem, Votes, YearReading } from './types';

export type Gender = 'M' | 'F';
/** 성별·시간·출생지는 선택 사항이에요(입력할수록 열리는 체계가 늘어요). 예전에 저장된 값(성별 필수)과도 호환돼요. */
export interface BirthForm {
  y: number | ''; m: number | ''; d: number | ''; cal: 'solar' | 'lunar'; leap?: boolean; gender: Gender | null;
  hh?: number | ''; mm?: number | ''; region?: string; city?: string;
}
export type Profile = ReturnType<typeof E.profile>;
export const EMPTY_FORM: BirthForm = { y: '', m: '', d: '', cal: 'solar', leap: false, gender: null, hh: '', mm: '', region: '', city: '' };

/** 프로토타입의 toInput 규칙과 같아요: 필수 확인, 음력·윤달, 존재하지 않는 날짜, 미래 날짜, 선택 입력 처리 */
export function toProfile(f: BirthForm, now: number = Date.now()): Profile {
  if (!f.y || !f.m || !f.d) throw new Error('생년월일을 모두 선택해 주세요.');
  let y = Number(f.y), m = Number(f.m), d = Number(f.d);
  if (f.cal === 'lunar') {
    const s = E.lunarToSolar(y, m, d, !!f.leap);
    if (!s) throw new Error('존재하지 않는 음력 날짜예요. 일이나 윤달 여부를 확인해 주세요.');
    y = s.y; m = s.m; d = s.d;
  } else if (new Date(Date.UTC(y, m - 1, d)).getUTCMonth() !== m - 1) throw new Error('존재하지 않는 날짜예요.');
  if (Date.UTC(y, m - 1, d) > now) throw new Error('미래 날짜는 계산할 수 없어요.');
  let h: number | null = null, mi = 0;
  if (f.hh !== undefined && f.hh !== '' && f.hh !== null) { h = Number(f.hh); mi = f.mm ? Number(f.mm) : 0; }
  const place = f.region && f.city ? `${f.region}|${f.city}` : null;
  return E.profile({ y, m, d, h, mi, gender: f.gender || null, place });
}
const pad = (n: number) => String(n).padStart(2, '0');
/** 한국 시각 기준 오늘 날짜(YYYY-MM-DD). 잠금 해제는 하루 단위로 유지돼요. */
export function kstToday(now: Date = new Date()): string { const k = E.kstDate(now); return `${k.y}-${pad(k.m)}-${pad(k.d)}`; }

export function daysIn(y: number | '', m: number | '', cal: 'solar' | 'lunar'): number { if (cal === 'lunar') return 30; if (!m) return 31; return new Date(y ? Number(y) : 2000, Number(m), 0).getDate(); }
export const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const kstYear = (now: Date = new Date()): number => E.kstDate(now).y;
export const yearReading = (p: Profile, year: number) => E.yearNarrative(p, year) as unknown as YearReading;
export const destinyReading = (p: Profile, year: number) => E.destinyNarrative(p, year) as unknown as DestinyReading;
export const taekilList = (p: Profile, now: Date, days = 45) => E.taekil(p, now, days) as unknown as Record<string, TaekilItem[]>;
export const TAEKIL_CATS = E.TAEKIL_CATS as string[];
export const matchProfiles = (a: Profile, b: Profile) => E.match(a, b) as unknown as MatchResult;
const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const weekdayKo = (y: number, m: number, d: number): string => WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

export const viewOf = (p: Profile) => p as unknown as ProfileView;
export const votesOf = (p: Profile) => E.votes(p) as unknown as Votes;
export const myeongsikOf = (p: Profile) => E.myeongsik(p) as unknown as MyeongsikView;
export const REGIONS = E.REGIONS as string[];
export const placeNames = (region: string) => E.placeNames(region) as string[];
export const destinyBase = (p: Profile) => E.destiny(p) as unknown as DestinyBase;

export function dayReading(p: Profile, now: Date = new Date()) {
  const R = E.dailyReading(p, now) as unknown as DayReading;
  const cats = E.dailyNarrative(p, R) as unknown as DayCat[];
  return { R, cats };
}
export const COLOR_HEX: Record<string, string> = { 초록: '#2E9E5B', 연두: '#8CC63F', 청록: '#1AA39A', 빨강: '#E0443E', 주황: '#F28C28', 코랄: '#FF7F6B', 베이지: '#D9C3A0', 노랑: '#F2C230', 황토: '#B98B4A', 흰색: '#F5F5F5', 은색: '#C0C6CE', 회색: '#8A929C', 검정: '#1E2128', 남색: '#1F3A6E', '짙은 파랑': '#1B3F8F' };

export const matchDetailOf = (a: Profile, b: Profile) => E.matchDetail(a, b) as unknown as MatchDetailResult;
export const daewoonDetailOf = (p: Profile, year: number) => E.daewoonDetail(p, year) as unknown as DaewoonDetailResult | null;
