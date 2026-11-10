import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import App from './App';
import type { Sdk } from '../platform';
import { expectSane, menuButton, pressable } from '../test-utils';

type H = { load?: { onEvent: (e: unknown) => void }; show?: { onEvent: (e: unknown) => void }; back?: () => void };
function makeSdk(preset: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(preset));
  const events: { log_name: string; params: Record<string, unknown> }[] = [];
  const h: H = {}; const counts = { load: 0, show: 0 };
  const load = Object.assign((p: H['load']) => { counts.load++; h.load = p; return () => {}; }, { isSupported: () => true });
  const show = Object.assign((p: H['show']) => { counts.show++; h.show = p; return () => {}; }, { isSupported: () => true });
  const sdk = {
    Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async (k: string) => { store.delete(k); } },
    loadFullScreenAd: load, showFullScreenAd: show,
    Share: { createLink: async () => 'x' }, share: async () => {},
    Analytics: { log: async (p: { log_name: string; params: Record<string, unknown> }) => { events.push(p); } },
    graniteEvent: { addEventListener: (_e: string, a: { onEvent: () => void }) => { h.back = a.onEvent; return () => { h.back = undefined; }; } },
    Environment: { environment: 'sandbox' as const },
  } as unknown as Sdk;
  return { sdk, store, events, h, counts };
}
const SAVED = { 'profile:v1': JSON.stringify({ y: 1995, m: 5, d: 12, gender: 'F', cal: 'solar' }) };
const ready = (h: H) => act(async () => { h.load!.onEvent({ type: 'loaded' }); });
const watch = (h: H, reward = true) => act(async () => { if (reward) h.show!.onEvent({ type: 'userEarnedReward', data: { unitType: 'x', unitAmount: 1 } }); h.show!.onEvent({ type: 'dismissed' }); });
const click = (text: string) => act(async () => { fireEvent.click(pressable(text)); });
const names = (ev: { log_name: string }[]) => ev.map((e) => e.log_name);
async function boot(preset = SAVED) {
  const f = makeSdk(preset); render(<App sdk={f.sdk} hosted={false} />);
  await screen.findByRole('img', { name: '체계별 기운 분포' }); await ready(f.h); return f;
}
beforeEach(() => cleanup());

describe('광고 게이트 흐름(가짜 SDK)', () => {
  it('홈 진입 시 광고를 미리 로딩하고, 보상 후 신년운이 열리며 오늘 하루 저장돼요', async () => {
    const f = await boot(); expect(f.counts.load).toBe(1); expect(f.counts.show).toBe(0);
    await click('신년운 · 광고 보고 열기'); expect(f.counts.show).toBe(1); await watch(f.h);
    await screen.findByText('5가지 운, 시기별로 자세히');
    expect([...f.store.keys()].some((k) => /^unlock:\d{4}-\d{2}-\d{2}:newyear$/.test(k))).toBe(true);
    expect(names(f.events)).toEqual(expect.arrayContaining(['app_open', 'gate_open', 'ad_rewarded', 'view_newyear']));
    expect(f.counts.load).toBe(2); // 재생 후 다음 광고를 다시 로드
  });
  it('보상 없이 닫으면 열리지 않고 안내 문구가 나와요', async () => {
    const f = await boot(); await click('택일 · 광고 보고 열기'); await watch(f.h, false);
    // 닫힘 뒤 1.5초 유예(보상이 늦게 올 수 있어서)가 지난 뒤, 눌린 카드 안에 이유가 나와요
    expect(await screen.findByText('광고를 끝까지 보지 않아 열지 못했어요. 다시 눌러 끝까지 봐 주세요.', undefined, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByText('앞으로 45일 안에서 내 일간과 잘 맞는 날을 골랐어요.')).toBeNull();
    expect([...f.store.keys()].some((k) => k.endsWith(':taekil'))).toBe(false);
    expect(f.events.find((e) => e.log_name === 'ad_failed')?.params.result).toBe('dismissed');
  });
  it('광고가 준비되지 않았으면 재생 시점에 로딩하지 않고, 사용자는 막히지 않아요', async () => {
    const f = makeSdk(SAVED); render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' });
    expect(f.counts.load).toBe(1); // loaded 이벤트를 보내지 않음 = 준비 전
    await click('나의 총운 · 운명풀이 · 광고 보고 열기');
    await screen.findByText('분야별 풀이, 자세히');
    expect(f.counts.load).toBe(1); expect(f.counts.show).toBe(0);
    expect(f.events.find((e) => e.log_name === 'ad_failed')?.params.result).toBe('failed');
  });
  it('이어서 보기: 잠긴 항목은 광고 후 화면 교체, 뒤로가기는 홈, 열린 항목은 광고 없이 이동', async () => {
    const f = await boot();
    await click('신년운 · 광고 보고 열기'); await watch(f.h); await screen.findByText('5가지 운, 시기별로 자세히');
    expect(menuButton('오늘의 운세풀이 · 광고 보고 열기')).toBeTruthy();
    expect(menuButton('궁합 보기 · 무료')).toBeTruthy();
    await ready(f.h); await click('나의 총운 · 운명풀이 · 광고 보고 열기'); await watch(f.h);
    await screen.findByText('분야별 풀이, 자세히');
    expect(menuButton('신년운 · 열림')).toBeTruthy(); // 이미 연 항목은 열림 표시
    await ready(f.h); // 광고가 준비돼 있어도 이미 연 항목은 광고를 보여주면 안 돼요
    const shows = f.counts.show; await click('신년운 · 열림'); await screen.findByText('5가지 운, 시기별로 자세히');
    expect(f.counts.show).toBe(shows); // 광고 없이 이동
    expect(f.h.back).toBeTypeOf('function');
    await act(async () => { f.h.back!(); }); // 교체 이동이라 스택이 [홈, 현재]예요 → 뒤로가기는 홈
    await screen.findByRole('img', { name: '체계별 기운 분포' }); expect(f.h.back).toBeUndefined(); // 첫 화면에서는 구독 해제(앱 종료 기본 동작)
  });
});

describe('화면 내용', () => {
  async function open(label: string) { const f = await boot(); await click(`${label} · 광고 보고 열기`); await watch(f.h); return f; }
  const sane = () => expectSane();
  const noPolicyWords = () => {
    sane();
    const t = document.body.textContent!.replace('금융상품 선택이나 투자 판단의 근거로 쓰지 마세요', '').replace('의료·법률·투자 같은 중요한 판단의 근거로 쓰지 마세요', '');
    expect(t).not.toMatch(/금융|부동산|건설|업종|재테크|행운의 숫자|종목/);
  };
  it('신년운: 5개 분야 탭 전환, 올해/내년, 월별 12개, AI 배지, 정책 표현 없음', async () => {
    await open('신년운'); await screen.findByText('5가지 운, 시기별로 자세히');
    expect(document.querySelectorAll('.aibadge').length).toBe(1);
    expect(document.querySelectorAll('ul.months li').length).toBe(12);
    expect(document.querySelectorAll('ul.months li.now').length).toBe(1); // 별이 가장 높은 달 강조
    expect(document.querySelector('.bars')).toBeNull(); // 프로토타입에 없는 요소를 넣지 않아요
    const first = document.querySelector('article.cat')!.getAttribute('aria-label');
    fireEvent.click(screen.getByLabelText('연애')); await act(async () => {});
    expect(document.querySelector('article.cat')!.getAttribute('aria-label')).not.toBe(first);
    const y = document.querySelector('h1')!.textContent; fireEvent.click(screen.getByLabelText(/^내년/)); await act(async () => {});
    expect(document.querySelector('h1')!.textContent).not.toBe(y);
    noPolicyWords();
  });
  it('총운·운명풀이: 헤드라인·십성 분포, 대운 9개(현재 대운만 펼침), 분야 6개(재물 라벨), 체계 강점 칩', async () => {
    await open('나의 총운 · 운명풀이'); await screen.findByText('분야별 풀이, 자세히');
    expect(document.querySelector('h1')!.textContent).toMatch(/일간 · .+ 중심/);
    expect(screen.getByText('십성 분포')).toBeTruthy(); expect(document.querySelectorAll('.bar i').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('ul.timeline > li').length).toBe(9);
    expect(document.querySelectorAll('ul.timeline > li[aria-current="true"]').length).toBe(1);
    expect(document.querySelectorAll('ul.timeline > li details[open]').length).toBe(1); // 현재 대운만 펼쳐 있어요
    expect(document.querySelectorAll('article.cat[aria-label]').length).toBeGreaterThanOrEqual(6);
    expect(screen.getByLabelText('재물')).toBeTruthy();
    expect(document.querySelectorAll('.vchips').length).toBe(6); noPolicyWords();
  });
  it('택일: 5개 카테고리, 카테고리마다 날짜 목록과 근거, 간이 규칙 안내', async () => {
    await open('택일'); await screen.findByText('앞으로 45일 안에서 내 일간과 잘 맞는 날을 골랐어요.');
    for (const c of ['이사', '결혼', '개업', '계약', '여행']) {
      fireEvent.click(screen.getByLabelText(c)); await act(async () => {});
      const n = document.querySelectorAll('article.tk').length; expect(n).toBeGreaterThan(0);
      expect(document.querySelector('article.tk .date')!.textContent).toMatch(/\d+월 \d+일 \([일월화수목금토]\)/);
      // 수성 역행은 그 분야에 규칙이 있어 주의 문구(－)가 있을 때만 보여야 해요(별 5개 날짜에 역행 표시만 붙는 모순 방지)
      for (const a of document.querySelectorAll('article.tk')) if (/수성 역행/.test(a.textContent!)) expect(a.querySelector('li.neg'), `${c}: ${a.textContent!.slice(0, 40)}`).not.toBeNull();
    }
    expect(document.body.textContent).toMatch(/간이 규칙/); noPolicyWords();
  });
  it('궁합: 날짜 없으면 안내 → 입력 → 상세 결과 → 다시 입력, 잘못된 음력은 안내, 상대 정보는 저장 안 함', async () => {
    const f = await boot(); await click('궁합 보기 · 무료'); await screen.findByText(/상대의 생년월일과 성별을 알려주세요/);
    fireEvent.click(screen.getByText('궁합 결과 보기'));
    expect((await screen.findByRole('alert')).textContent).toBe('생년월일을 모두 선택해 주세요.');
    for (const [l, v] of [['상대가 태어난 해', '1993'], ['상대가 태어난 달', '8'], ['상대가 태어난 날', '3']]) fireEvent.change(screen.getByLabelText(l), { target: { value: v } });
    fireEvent.click(screen.getByText('궁합 결과 보기')); await screen.findByText('두 사람의 데이터'); noPolicyWords();
    expect([...f.store.keys()].every((k) => !k.includes('partner'))).toBe(true);
    fireEvent.click(screen.getByText('다시 입력')); await screen.findByText('궁합 결과 보기');
    fireEvent.click(screen.getByLabelText('음력')); fireEvent.change(screen.getByLabelText('상대가 태어난 해'), { target: { value: '2023' } });
    let alerted = false;
    for (let m = 1; m <= 12 && !alerted; m++) { fireEvent.change(screen.getByLabelText('상대가 태어난 달'), { target: { value: String(m) } }); fireEvent.change(screen.getByLabelText('상대가 태어난 날'), { target: { value: '30' } }); fireEvent.click(screen.getByText('궁합 결과 보기')); alerted = !!document.querySelector('[role="alert"]'); if (!alerted) fireEvent.click(screen.getByText('다시 입력')); }
    expect(alerted).toBe(true); expect(within(document.body).getByRole('alert').textContent).toContain('존재하지 않는 음력 날짜');
  });
});
