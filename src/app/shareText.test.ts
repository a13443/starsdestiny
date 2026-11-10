import { describe, it, expect } from 'vitest';
import { APP_TITLE } from './brand';
import { matchDetailOf, toProfile, viewOf, votesOf, EMPTY_FORM, type BirthForm } from './domain';
import { matchShareText, resultShareText } from './shareText';

const FORM: BirthForm = { ...EMPTY_FORM, y: 1995, m: 5, d: 12, gender: 'F', hh: 14, mm: 30, region: '제주', city: '제주시' };
const PARTNER: BirthForm = { ...EMPTY_FORM, y: 1993, m: 8, d: 3, gender: 'M', hh: 9, mm: 0, region: '서울', city: '중구' };

describe('공유 문구', () => {
  it('내 결과: 일간·별자리·띠·생명수·기운 요약·면책·링크, 개인정보는 없어요', () => {
    const p = toProfile(FORM), t = resultShareText(viewOf(p), votesOf(p), 'https://toss.example/abc');
    expect(t.split('\n')).toHaveLength(5); expect(t).toContain(`${APP_TITLE} 결과`); expect(t).toMatch(/황소자리 · 돼지띠 · 계癸 일간 · 생명수 5/); expect(t).toMatch(/체계 중 \d개가 ‘.+’ 기운을 가리켜요|기운|체계마다/);
    expect(t).toContain('(재미로 보는 운세)'); expect(t.endsWith('https://toss.example/abc')).toBe(true);
    // 개인정보: 생년월일(연·월·일 숫자 조합), 시간, 출생지, 성별 표현이 없어야 해요
    expect(t).not.toMatch(/1995|0?5월|12일|14시|제주|서울|여성|남성|\b여\b|\b남\b/);
  });
  it('링크를 못 만들면(null) 링크 줄만 빠져요', () => {
    const p = toProfile(FORM), t = resultShareText(viewOf(p), votesOf(p), null); expect(t.split('\n')).toHaveLength(4); expect(t).not.toMatch(/https?:|intoss:/);
  });
  it('궁합: 상대의 정보를 넣지 않고 집계만 담아요', () => {
    const me = toProfile(FORM), you = toProfile(PARTNER), R = matchDetailOf(me, you), t = matchShareText(R, 'https://toss.example/m');
    expect(t).toMatch(/^별사주 궁합\n/); expect(t).toMatch(/\d+가지 기준 중 잘 맞음 \d+ · 무난 \d+ · 긴장 \d+/); expect(t).toContain('(재미로 보는 운세)');
    const y = viewOf(you), m = viewOf(me);
    for (const secret of [y.west.name, `${y.animal.name}띠`, `${y.saju.dayMaster.ko}${y.saju.dayMaster.hanja}`, y.nine?.name ?? 'ZZZ', '1993', '8월', '3일', '서울', '중구', m.west.name, `${m.animal.name}띠`]) expect(t, `노출: ${secret}`).not.toContain(secret);
  });
});
