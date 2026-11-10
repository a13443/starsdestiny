import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import App from './App';
import { expectSane, menuButton } from '../test-utils';
import type { Sdk } from '../platform';

function make(form: Form) {
  const store = new Map<string, string>([['profile:v1', JSON.stringify(form)]]);
  const sdk = { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async () => {} },
    loadFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }), showFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }),
    Share: { createLink: async () => 'x' }, share: async () => {}, Analytics: { log: async () => {} }, graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk;
  return { sdk, store };
}
type Form = Record<string, unknown>;
const FULL: Form = { y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: 14, mm: 30, region: '제주', city: '제주시' };
const DISCLAIMERS = ['금융상품 선택이나 투자 판단의 근거로 쓰지 마세요', '의료·법률·투자 같은 중요한 판단의 근거로 쓰지 마세요'];
const withoutDisclaimers = () => DISCLAIMERS.reduce((t, d) => t.replace(d, ''), document.body.textContent!);
const BANNED_UI = /금융|부동산|건설|업종|재테크|종목|투자|이혼|파산|반드시|무조건/;
beforeEach(() => cleanup());

async function matchResult(form: Form = FULL, partner: Record<string, string> = { 해: '1993', 달: '8', 날: '3' }, extra?: () => void) {
  const f = make(form); render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' });
  await act(async () => { fireEvent.click(menuButton('궁합 보기 · 무료')); });
  const LABEL: Record<string, string> = { 해: '상대가 태어난 해', 달: '상대가 태어난 달', 날: '상대가 태어난 날', 시: '태어난 시', 시도: '시·도', 시군구: '시·군·구' };
  for (const [k, v] of Object.entries(partner)) fireEvent.change(screen.getByLabelText(LABEL[k]), { target: { value: v } });
  extra?.();
  await act(async () => { fireEvent.click(screen.getByText('궁합 결과 보기')); });
  await screen.findByText('두 사람의 데이터'); return f;
}

describe('궁합 상세', () => {
  it('데이터 비교 표가 서술보다 먼저 나와요: 나/상대 열, 사주·일간·띠·별자리·생명수', async () => {
    await matchResult();
    const t = screen.getByRole('table', { name: '두 사람의 데이터' });
    expect([...t.querySelectorAll('thead th')].map((x) => x.textContent)).toEqual(['', '나', '상대']);
    const labels = [...t.querySelectorAll('tbody th')].map((x) => x.textContent);
    expect(labels).toEqual(expect.arrayContaining(['연주', '월주', '일주', '시주', '일간', '일지', '띠', '오행 분포', '별자리', '생명수', '본명성', '베딕 달']));
    const row = (l: string) => [...t.querySelectorAll('tbody tr')].find((r) => r.querySelector('th')!.textContent === l)!.querySelectorAll('td');
    expect(row('일주')[0].textContent).toContain('癸卯'); expect(row('일간')[0].textContent).toMatch(/계癸 · 물\(물결\)/); expect(row('일간')[1].textContent).toMatch(/병丙 · 불\(불꽃\)/);
    expect(row('띠')[0].textContent).toBe('돼지띠'); expect(row('별자리')[0].textContent).toContain('황소자리'); expect(row('오행 분포')[0].textContent).toMatch(/나무 \d · 불 \d · 흙 \d · 쇠 \d · 물 \d/);
    // 순서: 데이터 표 → 한눈에 → 장면 → 항목별 → 함께 잘 지내는 법 → 읽기 전에
    const heads = [...document.querySelectorAll('h2')].map((h) => h.textContent);
    expect(heads).toEqual(['두 사람의 데이터', '한눈에 보기', '이런 장면에서 이렇게 나타나요', '항목별로 자세히', '함께 잘 지내는 법', '읽기 전에 알아 두세요']);
  });
  it('종합: 판정·집계, 잘 맞는 점/조심할 점 요약, 장면 5개, 항목별 카드(근거 + 좋은 점/조심할 점)', async () => {
    await matchResult(FULL, { 해: '1993', 달: '8', 날: '3', 시: '9', 시도: '서울', 시군구: '중구' }, () => { fireEvent.click(screen.getByLabelText('남')); });
    const sum = screen.getByLabelText('종합');
    // 집계는 세 곳(판정 막대의 이름, 범례, 첫 문단)에 나오고 서로 같은 값이어야 해요
    const bar = within(sum).getByRole('img', { name: /^잘 맞음 \d+개, 무난 \d+개, 긴장 \d+개$/ }); const [g, o, tn] = bar.getAttribute('aria-label')!.match(/\d+/g)!.map(Number);
    expect(sum.querySelector('.verdictLegend')!.textContent).toBe(`잘 맞음 ${g}무난 ${o}긴장 ${tn}`); expect(sum.textContent).toContain(`${g + o + tn}가지 기준 중 잘 맞음 ${g}개, 무난 ${o}개, 긴장 ${tn}개예요`);
    expect(bar.querySelectorAll('i').length).toBe([g, o, tn].filter((n) => n > 0).length);
    const paras = [...sum.querySelectorAll('p.para')].map((p) => p.textContent!); expect([3, 4]).toContain(paras.length); // 사주 기준 2줄 + 단순화한 체계 참고 줄(있을 때만)
    expect(paras[1]).toMatch(/^사주 기준으로/); expect(paras[2]).toMatch(/^사주 기준으로/);
    if (paras.length === 4) expect(paras[3]).toMatch(/^서양 별자리·구성기학처럼 이 앱이 단순하게 옮긴 체계는 참고로만 봐 주세요\./);
    const scenes = ['처음 만났을 때', '일상을 함께 보낼 때', '의견이 갈릴 때', '서로 힘들 때', '오래 함께하려면'];
    for (const t of scenes) expect(screen.getByLabelText(t).querySelector('p.para')!.textContent!.length).toBeGreaterThan(40);
    const cards = ['일간 · 성향과 기질', '일지 · 일상과 친밀감', '월지 · 환경과 가치관', '오행 균형 · 서로 채워 주는 기운', '서양 별자리 · 원소 궁합', '구성기학 · 본명성', '수비학 · 두 사람의 관계수', '베딕 점성술 · 달 별자리'];
    for (const c of cards) { const el = screen.getByLabelText(c); expect(el.querySelectorAll('p.para').length).toBeGreaterThanOrEqual(2); expect(el.querySelector('.strong')!.textContent!.length).toBeGreaterThan(5); }
    expect(screen.getByLabelText(/^띠 · 돼지띠와/).querySelectorAll('p.para').length).toBeGreaterThanOrEqual(2);
    const ilgan = screen.getByLabelText('일간 · 성향과 기질'); expect(within(ilgan).getByText('잘 맞는 점')).toBeTruthy(); expect(within(ilgan).getByText('조심할 점')).toBeTruthy(); expect(ilgan.textContent).toMatch(/십성으로 보면/);
    // 화면 전체 글자 수에는 표·안내·면책이 섞여 있어서 서술만 따로 재요: 서술 영역(장면·항목별·종합) 글자 수
    const narr = ['article[aria-label="종합"]', ...scenes.map((t) => `article[aria-label="${t}"]`), ...cards.map((c) => `article[aria-label="${c}"]`)].map((q) => document.querySelector(q)?.textContent?.length ?? 0).reduce((a, b) => a + b, 0);
    expect(narr).toBeGreaterThan(3500); // 엔진 400쌍 측정 최소 약 3,860자(띠 카드 제외)
  });
  it('유의사항: 천간충 학파 차이, 배우자성 연구 결과, 해·파·원진 미반영, 앱의 단순화 해석', async () => {
    await matchResult();
    const notes = screen.getByText('읽기 전에 알아 두세요').closest('h2')!.nextElementSibling!.textContent!;
    expect(notes).toMatch(/천간충은 학파에 따라/); expect(notes).toMatch(/학술 연구/); expect(notes).toMatch(/해·파·원진은 반영하지 않아요/); expect(notes).toMatch(/단순하게 옮긴 해석/);
  });
  it('입력이 적으면(상대: 생년월일만) 본명성·베딕 행과 항목이 줄거나 “필요” 표시가 나와요', async () => {
    await matchResult({ ...FULL, gender: null, hh: '', mm: '', region: '', city: '' });
    const t = screen.getByRole('table', { name: '두 사람의 데이터' });
    expect(t.textContent).toContain('성별 필요'); expect(t.textContent).toContain('시간·출생지 필요'); expect(t.textContent).toContain('모름'); // 시주 모름
    expect(screen.queryByLabelText('구성기학 · 본명성')).toBeNull(); expect(screen.queryByLabelText('베딕 점성술 · 달 별자리')).toBeNull();
    expect(screen.getByLabelText('수비학 · 두 사람의 관계수')).toBeTruthy(); expectSane();
  });
  it('상대 정보를 넣을수록 항목이 늘어요: 성별만 → 구성기학, 시간+출생지까지 → 베딕', async () => {
    await matchResult(FULL, { 해: '1993', 달: '8', 날: '3' }, () => { fireEvent.click(screen.getByLabelText('남')); });
    expect(screen.getByLabelText('구성기학 · 본명성')).toBeTruthy(); expect(screen.queryByLabelText('베딕 점성술 · 달 별자리')).toBeNull();
    cleanup();
    await matchResult(FULL, { 해: '1993', 달: '8', 날: '3', 시: '9', 시도: '서울', 시군구: '중구' }, () => { fireEvent.click(screen.getByLabelText('남')); });
    expect(screen.getByLabelText('베딕 점성술 · 달 별자리')).toBeTruthy();
  });
  it('깨진 문장·정책 표현 없음(모든 요소 검사)', async () => {
    await matchResult(); expectSane();
    expect(withoutDisclaimers()).not.toMatch(BANNED_UI);
  });
});

describe('대운 상세', () => {
  async function destiny(form: Form = FULL) {
    const f = make(form); render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' });
    await act(async () => { fireEvent.click(menuButton('나의 총운 · 운명풀이 · 광고 보고 열기')); }); await screen.findByText('10년 대운, 자세히'); return f;
  }
  it('현재 대운만 펼쳐 있고, 펼친 카드에 긴 서술·분야별·잘 풀리는 점·조심할 점·팁이 있어요', async () => {
    await destiny();
    const items = document.querySelectorAll('ul.timeline > li'); expect(items.length).toBe(9);
    const open = document.querySelectorAll('ul.timeline > li details[open]'); expect(open.length).toBe(1);
    const body = open[0].querySelector('.dwBody')!;
    expect(body.querySelectorAll('p.para').length).toBeGreaterThanOrEqual(6);
    expect(body.textContent!.length).toBeGreaterThan(900);
    for (const h of ['분야별로 보면', '잘 풀리는 점', '조심할 점', '이 시기를 이렇게 보내 보세요']) expect(within(body as HTMLElement).getByText(h)).toBeTruthy();
    expect([...body.querySelectorAll('.kv2 dt')].map((d) => d.textContent)).toEqual(['재물', '직업', '사업', '연애·관계', '학업', '컨디션']);
    expect(body.querySelectorAll('ul.tips li').length).toBe(3); expect(body.querySelector('p.strong')!.textContent).toMatch(/대운 · ‘.+’ 흐름/);
    expect(body.textContent).toMatch(/지금 \d{4}년은 이 대운의 \d+년 차예요/);
  });
  it('다른 대운도 펼치면 읽을 수 있고, 전환(이전/다음 대운) 서술이 있어요', async () => {
    await destiny();
    const items = [...document.querySelectorAll('ul.timeline > li')];
    for (const li of [items[0], items[4], items[8]]) {
      const d = li.querySelector('details')!; d.setAttribute('open', ''); // 사용자가 펼침
      const t = li.querySelector('.dwBody')!.textContent!; expect(t.length).toBeGreaterThan(800);
      expect(t).toMatch(/이 대운은 (앞선 .+ 대운\(‘.+’\)에서 이어져요|인생의 첫 대운이에요)/);
    }
    expect(items[0].textContent).toMatch(/인생의 첫 대운이에요/); expect(items[8].textContent).toMatch(/마지막으로 계산된 대운/);
    expect(items[4].textContent).toMatch(/로 넘어가요|으로 넘어가요/);
  });
  it('성별이 없으면 대운 상세 대신 잠금 카드, 나머지 총운은 그대로예요', async () => {
    await destiny({ ...FULL, gender: null });
    expect(document.querySelectorAll('ul.timeline').length).toBe(0); expect(document.body.textContent).toContain('성별을 선택하면 열려요. 대운의 순행·역행 방향이');
    expect(screen.getByText('분야별 풀이, 자세히')).toBeTruthy(); expectSane();
  });
  it('깨진 문장·정책 표현 없음(펼친 카드 포함)', async () => {
    await destiny(); document.querySelectorAll('details').forEach((d) => d.setAttribute('open', '')); expectSane();
    expect(withoutDisclaimers()).not.toMatch(BANNED_UI);
  });
});
