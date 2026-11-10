export interface VoteItem { v: number; text: string; sys?: string }
export interface Vote { sys: string; v: number; items?: VoteItem[] }
export interface YearCat {
  key: string; label: string; level: number; levelLabel: string; summary: string;
  phases: { label: string; level: number }[]; series: number[]; votes: Vote[]; consensus: { text: string };
  paragraphs: string[]; tips: string[]; signals: { v: number; text: string; sys: string }[];
}
export interface YearReading {
  year: number; pillar: string; pillarKo: string; tg: string; head: string; cats: YearCat[];
  samjae: { stage: string; years: string[] } | null;
  personalYear: { py: number; keyPy: string; keyPm: string; keyPd: string } | null;
  dasha: { maha: { ko: string; years: number; theme: string } } | null;
  months: { solarMonth: number; pillar: string; tg: string; key: string; level: number }[];
}
export interface DaewoonItem { ganzhi: string; ko: string; tg: string; group: string; theme: string; startAge: number; endAge: number; startYear: number; endYear: number; current: boolean }
export interface DestinyField { key: string; label: string; paragraphs: string[]; tips: string[]; strong: string[] }
export interface DestinyReading {
  top: string; second: string; fields: DestinyField[]; daewoon: { list: DaewoonItem[]; forward: boolean } | null;
  current: DaewoonItem | null; affinity: { sys: string; key: string; fields: string[] }[];
}
export interface TaekilItem { y: number; m: number; d: number; score: number; pillar: string; tg: string; sonOps: boolean; lunar: { month: number; leap: boolean; day: number }; rx: boolean; why: string[]; caution: string[] }
export interface MatchRow { sys: string; level: 'good' | 'ok' | 'tense' | 'info'; text: string }
export interface MatchResult { rows: MatchRow[]; tally: { good: number; ok: number; tense: number }; total: number; LEVEL: Record<string, string> }

export type El = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export interface Votes { list: { sys: string; el: El }[]; tally: Record<El, number>; top: [El, number]; total: number }
export interface Pillar { hanja: string; ko: string; ganEl: El; zhiEl: El }
export interface ProfileView {
  saju: { pillars: Record<'time' | 'day' | 'month' | 'year', Pillar | null>; hasTime: boolean; uncertain: boolean; count: Record<El, number>; dayMaster: { hanja: string; ko: string; line: string }; element: El };
  west: { idx: number; name: string; wEl: string; element: El; line: string; cusp: boolean };
  num: { n: number; line: string };
  animal: { name: string; hanja: string; element: El; line: string };
  nine: { name: string; element: El; line: string } | null;
  vedic: { element: El; moon: { name: string; line: string }; nakshatra: { name: string; pada: number }; sun: { name: string; idx: number }; lagna: { name: string } } | null;
  tier: { time: boolean; place: boolean; vedic: boolean };
}
export interface MyeongsikCol {
  key: string; label: string; empty?: boolean; gm?: boolean;
  gan?: { hanja: string; ko: string; el: El; tg: string }; zhi?: { hanja: string; ko: string; el: El; tg: string };
  jijanggan?: { hanja: string; ko: string; el: El; tg: string }[]; unseong?: string; unseongSame?: string;
}
export interface MyeongsikView {
  cols: MyeongsikCol[]; gongmang: { hanja: string; ko: string }[]; gongmangWhere: string[];
  jeolib: { name: string; m: number; d: number; h: number; mi: number } | null; dayMaster: { hanja: string; ko: string };
}

export interface DestinyBase { top: string; ranked: [string, number][] }

export interface DayCat {
  key: string; label: string; level: number; levelLabel: string; summary: string;
  votes: Vote[]; consensus: { text: string }; items: { v: number; text: string; sys?: string }[]; today: string[]; tips: string[];
}
export interface HourSlot { ko: string; range: string; level: number }
export interface Lucky { element: El; elementKo: string; why: string; color: string; colors: string[]; dir: string; nums: number[]; items: string[]; outfit: string; hour: string }
export interface DayReading {
  date: { y: number; m: number; d: number }; pillar: string; pillarKo: string; tg: string; tgTheme: string; overall: number; overallLabel: string;
  cal: { lunar: { month: number; leap: boolean; day: number }; sonOps: boolean; next: { name: string; m: number; d: number } };
  hours: { list: HourSlot[]; best: HourSlot }; lucky: Lucky; notes: string[]; materials: { sys: string; text: string }[];
}

export interface PersonCard {
  label: string; pillars: { label: string; hanja: string | null; ko: string | null }[];
  dayMaster: { ko: string; hanja: string; element: El; elementName: string }; dayBranch: { ko: string; hanja: string };
  animal: string; west: { name: string; element: string }; num: number; nine: string | null; vedicMoon: string | null; count: Record<El, number>; hasTime: boolean;
}
export interface MatchSection { key: string; title: string; level: 'good' | 'ok' | 'tense' | 'info'; headline: string; paragraphs: string[]; good: string[]; watch: string[] }
export interface MatchDetailResult {
  people: PersonCard[]; verdict: { style: 'many' | 'mixed' | 'few'; headline: string; tally: { good: number; ok: number; tense: number }; total: number };
  summary: string[]; strengths: { title: string; text: string }[]; cautions: { title: string; text: string }[];
  scenes: { title: string; text: string }[]; sections: MatchSection[]; tips: string[]; notes: string[]; LEVEL: Record<string, string>;
}
export interface DaewoonDetailItem {
  ganzhi: string; ko: string; startAge: number; endAge: number; startYear: number; endYear: number; current: boolean;
  group: string; tg: string; zhiTg: string; stageName: string; ganEl: El; zhiEl: El; summary: string;
  paragraphs: string[]; fields: { key: string; label: string; text: string }[]; good: string[]; watch: string[]; tips: string[];
  progress: { yearIn: number; left: number; total: number } | null;
}
export interface DaewoonDetailResult { forward: boolean | null; items: DaewoonDetailItem[]; current: string | null }
