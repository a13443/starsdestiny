import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import App from './App';
import { expectSane, menuButton } from '../test-utils';
import { AppProvider } from './AppProvider';
import { TodayView } from './views/Today';
import { toProfile } from './domain';
import type { Sdk } from '../platform';

type H = { load?: { onEvent: (e: unknown) => void }; show?: { onEvent: (e: unknown) => void } };
function make(form: Record<string, unknown>, adSupported = false) {
  const store = new Map<string, string>([['profile:v1', JSON.stringify(form)]]); const h: H = {};
  const load = Object.assign((p: H['load']) => { h.load = p; return () => {}; }, { isSupported: () => adSupported });
  const show = Object.assign((p: H['show']) => { h.show = p; return () => {}; }, { isSupported: () => adSupported });
  const sdk = { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async () => {} }, loadFullScreenAd: load, showFullScreenAd: show,
    Share: { createLink: async () => 'x' }, share: async () => {}, Analytics: { log: async () => {} }, graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk;
  return { sdk, store, h };
}
const FORM = { y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: 14, mm: 30, region: '제주', city: '제주시' };
beforeEach(() => cleanup());
async function openToday(f = make(FORM)) { render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); await act(async () => { fireEvent.click(menuButton(/^오늘의 운세풀이 · /)); }); await screen.findByText('5가지 운, 자세히'); return f; }

describe('오늘의 운세풀이(프로토타입 수준)', () => {
  it('헤더: 날짜·일진, 음력/절기 태그, 종합 운(일간 설명)', async () => {
    await openToday();
    expect(document.querySelector('h1')!.textContent).toMatch(/^\d+월 \d+일 · .+일$/);
    expect([...document.querySelectorAll('.tags .tag')].map((t) => t.textContent).join('|')).toMatch(/음력 \d+월 \d+일.*다음 절기 .+ \d+\/\d+/);
    const total = screen.getByLabelText('종합 운'); expect(total.textContent).toMatch(/내 일간 기준 .+ 날이에요\./); expect(within(total).getByRole('img').getAttribute('aria-label')).toMatch(/5점 만점에 [1-5]점/);
  });
  it('분야 카드 5개: 요약·체계 칩·합의 문장·체계별 근거·하루 제안·실천 팁', async () => {
    await openToday();
    const cats = [...document.querySelectorAll('article.cat')].filter((a) => /^(재물운|연애운|사업운|학업운|컨디션운)$/.test(a.getAttribute('aria-label') ?? ''));
    expect(cats.length).toBe(5);
    for (const c of cats) {
      expect(c.querySelector('.strong')!.textContent!.length).toBeGreaterThan(10);
      expect(c.querySelectorAll('.vchips .vc').length).toBe(6); expect(c.querySelectorAll('.vc.core').length).toBe(1);
      expect(c.querySelector('p.sub')!.textContent).toMatch(/체계|신호/);
      expect(c.querySelectorAll('ul.why li').length).toBeGreaterThan(0);
      const fallback = c.textContent!.includes('크게 기우는 신호가 없는 평범한 흐름이에요.');
      if (!fallback) expect(c.querySelectorAll('ul.why li em.sy').length, `${c.getAttribute('aria-label')}: 실제 근거에는 체계 이름이 붙어요`).toBeGreaterThan(0);
      expect(c.querySelectorAll('p.para').length).toBeGreaterThan(0);
      expect(c.querySelectorAll('ul.tips li').length).toBeGreaterThan(0);
      for (const h of ['체계별 근거', '오늘 이렇게 보내 보세요', '실천 팁']) expect(within(c as HTMLElement).getByText(h)).toBeTruthy();
    }
  });
  it('체계별 근거: 5개 분야 중 실제 근거(체계 이름 + 좋은/조심 신호)가 있는 카드가 대부분이에요', async () => {
    await openToday();
    const withReasons = [...document.querySelectorAll('article.cat ul.why')].filter((u) => u.querySelector('em.sy') && u.querySelector('li.pos, li.neg'));
    expect(withReasons.length).toBeGreaterThanOrEqual(3);
  });
  it('화면 컴포넌트: unlocked=false면 종합 운만 보이고 상세는 안 보여요(게이트 방어)', () => {
    render(<AppProvider hosted={false}><TodayView profile={toProfile({ y: 1995, m: 5, d: 12, cal: 'solar', gender: 'F' })} unlocked={false} /></AppProvider>);
    expect(screen.getByLabelText('종합 운')).toBeTruthy();
    for (const t of ['5가지 운, 자세히', '시간대 흐름', '오늘의 행운', '오늘의 기준']) expect(screen.queryByText(t), t).toBeNull();
    expect(document.querySelectorAll('.vchips').length).toBe(0);
  });
  it('시간대 흐름: 12시진 막대, 최고점 1개 강조, 최고 시간대 안내', async () => {
    await openToday();
    expect(document.querySelectorAll('.hours i').length).toBe(12); expect(document.querySelectorAll('.hours i.best').length).toBe(1);
    expect(document.querySelectorAll('.hours-l span').length).toBe(12);
    expect(document.body.textContent).toMatch(/가장 높은 시간대는 .+시\(\d+~\d+시\)예요/);
    for (const i of document.querySelectorAll<HTMLElement>('.hours i')) expect(parseInt(i.style.height)).toBeGreaterThanOrEqual(20);
  });
  it('오늘의 행운: 색(대표 ★)·물건·코디·방위·오행 숫자·좋은 시간대, “행운의 숫자” 표현 없음', async () => {
    await openToday();
    const kv = [...document.querySelectorAll('dl.kv dt')].map((d) => d.textContent);
    for (const k of ['행운의 색', '행운의 물건', '행운의 코디', '행운의 방위', '오행 숫자', '좋은 시간대']) expect(kv).toContain(k);
    expect(document.querySelectorAll('.colorItem .swatch').length).toBeGreaterThanOrEqual(2); expect(document.body.textContent).toContain('★');
    expect(document.body.textContent).toContain('(전통 하도수)'); expect(document.body.textContent).not.toContain('행운의 숫자');
  });
  it('오늘의 기준: 체계별 계산 근거(사주 포함)가 표로 나와요', async () => {
    await openToday(); const sec = screen.getByText('오늘의 기준').closest('h2')!.nextElementSibling as HTMLElement;
    const dts = [...sec.querySelectorAll('dt')].map((d) => d.textContent); expect(dts).toContain('사주'); expect(dts.length).toBeGreaterThanOrEqual(4);
  });
  it('정책·문장 검사: 깨진 문장 없음, 업종·금융 표현 없음, 이어서 보기 3개', async () => {
    await openToday(); expectSane();
    const t = document.body.textContent!.replace('금융상품 선택이나 투자 판단의 근거로 쓰지 마세요', '').replace('의료·법률·투자 같은 중요한 판단의 근거로 쓰지 마세요', '');
    expect(t).not.toMatch(/금융|부동산|건설|업종|재테크|종목/);
    expect(screen.getAllByRole('button', { name: /^(신년운|나의 총운 · 운명풀이|택일) · / }).length).toBe(3);
  });
  it('잠금 전(게이트)에는 종합 운만 보이고 상세는 안 보여요: 보상 없이 닫으면 홈에 머물러요', async () => {
    const f = make(FORM, true); render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' });
    await act(async () => { f.h.load!.onEvent({ type: 'loaded' }); });
    await act(async () => { fireEvent.click(menuButton('오늘의 운세풀이 · 광고 보고 열기')); });
    await act(async () => { f.h.show!.onEvent({ type: 'dismissed' }); });
    expect(screen.queryByText('5가지 운, 자세히')).toBeNull(); expect(screen.queryByLabelText('종합 운')).toBeNull();
    expect(await screen.findByText('광고를 끝까지 보지 않아 열지 못했어요. 다시 눌러 끝까지 봐 주세요.', undefined, { timeout: 4000 })).toBeTruthy(); // 닫힘 뒤 1.5초 유예 후, 눌린 카드 안에 나와요
  });
});
