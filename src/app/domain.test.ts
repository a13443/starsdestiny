import { describe, it, expect } from 'vitest';
import { EMPTY_FORM, daysIn, toProfile, viewOf, votesOf, type BirthForm } from './domain';

const base: BirthForm = { ...EMPTY_FORM, y: 1995, m: 5, d: 12 };
const NOW = Date.UTC(2026, 10, 6);

describe('입력 규칙(프로토타입 toInput과 동일)', () => {
  it('필수 입력, 존재하지 않는 양력 날짜, 미래 날짜를 거부해요', () => {
    expect(() => toProfile(EMPTY_FORM, NOW)).toThrow('생년월일을 모두 선택해 주세요.');
    expect(() => toProfile({ ...base, y: 2023, m: 2, d: 30 }, NOW)).toThrow('존재하지 않는 날짜예요.');
    expect(() => toProfile({ ...base, y: 2026, m: 12, d: 31 }, NOW)).toThrow('미래 날짜는 계산할 수 없어요.');
    expect(() => toProfile({ ...base, y: 2026, m: 11, d: 6 }, NOW)).not.toThrow(); // 오늘은 허용
  });
  it('음력: 윤달 변환, 없는 윤달은 안내', () => {
    const p = toProfile({ ...base, y: 2023, m: 2, d: 1, cal: 'lunar', leap: true }, NOW) as unknown as { input: { m: number; d: number } };
    expect([p.input.m, p.input.d]).toEqual([3, 22]); // 2023 윤2월 1일 = 양력 3/22
    expect(() => toProfile({ ...base, y: 2023, m: 3, d: 1, cal: 'lunar', leap: true }, NOW)).toThrow('존재하지 않는 음력 날짜예요');
  });
  it('입력한 만큼 체계가 열려요(성별 → 구성기학, 시간+출생지 → 베딕)', () => {
    const open = (f: BirthForm) => { const P = viewOf(toProfile(f, NOW)); return { nine: !!P.nine, vedic: !!P.vedic, votes: votesOf(toProfile(f, NOW)).total }; };
    expect(open(base)).toEqual({ nine: false, vedic: false, votes: 3 });
    expect(open({ ...base, gender: 'F' })).toEqual({ nine: true, vedic: false, votes: 4 });
    expect(open({ ...base, gender: 'F', hh: 14, mm: 30, region: '제주', city: '제주시' })).toEqual({ nine: true, vedic: true, votes: 5 });
    expect(open({ ...base, gender: null, hh: 14, region: '제주', city: '제주시' })).toEqual({ nine: false, vedic: true, votes: 4 }); // 성별 없이도 베딕은 열려요
    expect(open({ ...base, hh: 14 })).toEqual({ nine: false, vedic: false, votes: 3 }); // 시간만으로는 베딕이 안 열려요(출생지 필요)
  });
  it('시각은 시만 넣으면 0분, 시를 비우면 시간 모름', () => {
    const t = (f: BirthForm) => viewOf(toProfile(f, NOW)).saju.hasTime;
    expect(t({ ...base, hh: 9 })).toBe(true); expect(t({ ...base, hh: 0 })).toBe(true); expect(t({ ...base, hh: '' })).toBe(false); expect(t(base)).toBe(false);
  });
  it('날짜 수: 양력은 달·윤년에 맞고 음력은 30까지', () => {
    expect([daysIn(2024, 2, 'solar'), daysIn(2023, 2, 'solar'), daysIn(2023, 4, 'solar'), daysIn('', 2, 'solar'), daysIn('', '', 'solar'), daysIn(2023, 2, 'lunar')]).toEqual([29, 28, 30, 29, 31, 30]);
  });
});
