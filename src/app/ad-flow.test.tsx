import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import { APP_NAME } from './brand';
import { AD_GROUP_ID_LIVE, AD_GROUP_ID_TEST } from '../platform';
import { menuButton } from '../test-utils';
import type { Sdk } from '../platform';
import { readFileSync, readdirSync } from 'node:fs';

type Call = { kind: 'load' | 'show'; id: string };
/** 광고가 지원되는 가짜 SDK. load는 바로 loaded를 알리고, show는 reward/dismiss를 테스트가 직접 쏴요. */
function make() {
  const store = new Map<string, string>([['profile:v1', JSON.stringify({ y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: '', mm: '', region: '', city: '' })]]);
  const calls: Call[] = [], events: { log_name: string; params: Record<string, unknown> }[] = []; let showCb: ((e: { type: string; data?: unknown }) => void) | null = null;
  const sdk = {
    Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async () => {} },
    loadFullScreenAd: Object.assign((p: { options: { adGroupId: string }; onEvent: (e: { type: 'loaded' }) => void }) => { calls.push({ kind: 'load', id: p.options.adGroupId }); queueMicrotask(() => p.onEvent({ type: 'loaded' })); return () => {}; }, { isSupported: () => true }),
    showFullScreenAd: Object.assign((p: { options: { adGroupId: string }; onEvent: (e: { type: string; data?: unknown }) => void }) => { calls.push({ kind: 'show', id: p.options.adGroupId }); showCb = p.onEvent; return () => {}; }, { isSupported: () => true }),
    Share: { createLink: async () => 'x', sendMessage: async () => {} }, Analytics: { log: async (p: { log_name: string; params: Record<string, unknown> }) => { events.push(p); } },
    graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const },
  } as unknown as Sdk;
  return { sdk, calls, events, fire: (e: { type: string; data?: unknown }) => act(async () => { showCb?.(e); }) };
}
const open = async (host: string) => { const f = make(); render(<App sdk={f.sdk} hosted={false} host={host} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); await act(async () => { await Promise.resolve(); }); return f; };
beforeEach(() => cleanup());

describe('광고 그룹 ID는 환경에 맞게 쓰여요', () => {
  it('실제 서비스 주소(apps): 미리 불러오기부터 보여주기까지 모두 실제 ID', async () => {
    const f = await open(`${APP_NAME}.apps.tossmini.com`);
    expect(f.calls[0]).toEqual({ kind: 'load', id: AD_GROUP_ID_LIVE });
    await act(async () => { fireEvent.click(menuButton('오늘의 운세풀이 · 광고 보고 열기')); });
    expect(f.calls.filter((c) => c.kind === 'show')).toEqual([{ kind: 'show', id: AD_GROUP_ID_LIVE }]);
    expect(f.events.some((e) => e.log_name === 'app_open' && e.params.ad_mode === 'live')).toBe(true);
  });
  it('실제 서비스 주소(web)에서도 실제 ID', async () => { const f = await open(`${APP_NAME}.web.tossmini.com`); expect(f.calls[0].id).toBe(AD_GROUP_ID_LIVE); });
  it('콘솔 QR 테스트·샌드박스·로컬에서는 어떤 호출에도 실제 ID가 쓰이지 않아요(정책: 실제 ID로 테스트 금지)', async () => {
    for (const host of [`${APP_NAME}.private-apps.tossmini.com`, `${APP_NAME}.private-web.tossmini.com`, 'localhost', '192.168.0.5', '']) {
      cleanup(); const f = await open(host);
      await act(async () => { fireEvent.click(menuButton('오늘의 운세풀이 · 광고 보고 열기')); }); await f.fire({ type: 'userEarnedReward', data: { unitType: '열람권', unitAmount: 1 } }); await f.fire({ type: 'dismissed' });
      expect(f.calls.length, host).toBeGreaterThan(2); expect(f.calls.every((c) => c.id === AD_GROUP_ID_TEST), `${host}: ${JSON.stringify(f.calls)}`).toBe(true);
      expect(f.events.some((e) => e.log_name === 'app_open' && e.params.ad_mode === 'test')).toBe(true);
    }
  });
});

describe('광고 흐름(실제 주소): 로드 → 노출 → 보상 → 열림 → 다음 로드', () => {
  it('보상 이벤트 후 닫으면 항목이 열리고 같은 ID로 다음 광고를 미리 불러와요', async () => {
    const f = await open(`${APP_NAME}.apps.tossmini.com`);
    await act(async () => { fireEvent.click(menuButton('택일 · 광고 보고 열기')); }); await f.fire({ type: 'userEarnedReward', data: { unitType: '열람권', unitAmount: 1 } }); await f.fire({ type: 'dismissed' });
    await screen.findByRole('button', { name: '내 결과로 돌아가기' });
    expect(f.calls.map((c) => c.kind)).toEqual(['load', 'show', 'load']); expect(f.calls.every((c) => c.id === AD_GROUP_ID_LIVE)).toBe(true);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '내 결과로 돌아가기' })); }); expect(await screen.findByRole('button', { name: '택일 · 열림' })).toBeTruthy();
  });
  it('보상 없이 닫으면(dismissed만) 열리지 않고, 눌린 카드 안에 이유가 보이며, 카드는 다시 눌려요', async () => {
    const f = await open(`${APP_NAME}.apps.tossmini.com`);
    await act(async () => { fireEvent.click(menuButton('택일 · 광고 보고 열기')); }); await f.fire({ type: 'dismissed' });
    expect(screen.getByRole('button', { name: /^택일 · 준비 중$/ })).toBeTruthy(); // 유예 1.5초 동안은 보류
    await act(async () => { await new Promise((r) => setTimeout(r, 1700)); });
    const card = screen.getByRole('button', { name: '택일 · 광고 보고 열기' }); expect(screen.queryByRole('button', { name: '택일 · 열림' })).toBeNull();
    const note = card.closest('li')!.querySelector('.menuNote'); expect(note, '메시지가 카드 안에 없어요').toBeTruthy(); expect(note!.textContent).toBe('광고를 끝까지 보지 않아 열지 못했어요. 다시 눌러 끝까지 봐 주세요.');
    expect(document.querySelectorAll('.menuNote').length).toBe(1); // 다른 카드에는 안 보여요
  });
  it('보상 이벤트만 오고 닫힘 이벤트가 안 와도 열려요(Android 토스 앱 5.255.0처럼 dismissed가 없는 환경)', async () => {
    const f = await open(`${APP_NAME}.apps.tossmini.com`);
    await act(async () => { fireEvent.click(menuButton('택일 · 광고 보고 열기')); }); await f.fire({ type: 'show' }); await f.fire({ type: 'impression' }); await f.fire({ type: 'userEarnedReward', data: { unitType: 'coin', unitAmount: 1 } });
    await screen.findByRole('button', { name: '내 결과로 돌아가기' }); // 택일 화면이 열려서 이어서 보기 메뉴가 보여요
    expect(document.querySelectorAll('.menuNote').length).toBe(0);
  });
  it('닫힘이 보상보다 먼저 와도 1.5초 안에 보상이 오면 열려요', async () => {
    const f = await open(`${APP_NAME}.apps.tossmini.com`);
    await act(async () => { fireEvent.click(menuButton('택일 · 광고 보고 열기')); }); await f.fire({ type: 'dismissed' }); await f.fire({ type: 'userEarnedReward', data: { unitType: 'coin', unitAmount: 1 } });
    await screen.findByRole('button', { name: '내 결과로 돌아가기' });
  });
  it('광고가 뜨지 못하면(failedToShow) 사용자가 막히지 않게 열려요', async () => {
    const f = await open(`${APP_NAME}.apps.tossmini.com`);
    await act(async () => { fireEvent.click(menuButton('택일 · 광고 보고 열기')); }); await f.fire({ type: 'failedToShow' });
    await screen.findByRole('button', { name: '내 결과로 돌아가기' });
  });
});

describe('QR 테스트 전용 광고 진단 줄', () => {
  it('콘솔 QR 테스트 주소에서만 보여요: 광고 그룹(테스트 ID)과 이벤트 순서가 찍혀요', async () => {
    const f = await open(`${APP_NAME}.private-apps.tossmini.com`);
    const box = screen.getByLabelText('광고 이벤트 진단(QR 테스트 전용)'); expect(box.textContent).toContain(AD_GROUP_ID_TEST); expect(box.textContent).not.toContain(AD_GROUP_ID_LIVE);
    expect([...box.querySelectorAll('ol li')].map((l) => l.textContent)).toEqual(['load: 요청', 'load: loaded']); // 이벤트는 한 줄씩 목록으로
    await act(async () => { fireEvent.click(menuButton('택일 · 광고 보고 열기')); }); await f.fire({ type: 'show' }); await f.fire({ type: 'userEarnedReward', data: { unitType: 'coin', unitAmount: 1 } });
    await screen.findByRole('button', { name: '내 결과로 돌아가기' });
    cleanup(); const g = await open(`${APP_NAME}.private-web.tossmini.com`); void g; expect(screen.getByLabelText('광고 이벤트 진단(QR 테스트 전용)').textContent).toContain('load: 요청');
    const after = [...screen.getByLabelText('광고 이벤트 진단(QR 테스트 전용)').querySelectorAll('ol li')].map((l) => l.textContent); expect(after.length).toBeGreaterThanOrEqual(2);
  });
  it('실제 서비스 주소·샌드박스·로컬·알 수 없는 주소에서는 진단 줄이 없어요(사용자에게 보이면 안 돼요)', async () => {
    for (const host of [`${APP_NAME}.apps.tossmini.com`, `${APP_NAME}.web.tossmini.com`, 'localhost', '192.168.0.5', '', `${APP_NAME}.private-apps.tossmini.com.evil.com`]) { cleanup(); await open(host); expect(screen.queryByLabelText('광고 이벤트 진단(QR 테스트 전용)'), host).toBeNull(); }
  });
});

describe('광고 정책 문구(공식 광고 정책)', () => {
  it('UI 문구에 “광고 클릭 → 보상” 같은 클릭 보상성 표현이 없어요', () => {
    const files = [...readdirSync('src/app').filter((f) => f.endsWith('.tsx') && !f.includes('.test.')).map((f) => `src/app/${f}`), ...readdirSync('src/app/views').map((f) => `src/app/views/${f}`)];
    const bad: string[] = [];
    for (const f of files) readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/광고[^\n]{0,14}클릭|클릭[^\n]{0,14}(보상|리워드|혜택|포인트)/.test(l)) bad.push(`${f}:${i + 1} ${l.trim().slice(0, 80)}`); });
    expect(bad).toEqual([]);
  });
  it('광고 CTA는 “광고 보고 열기”처럼 광고임을 먼저 알려요(공식 UX 원칙: 명확한 CTA)', async () => {
    const f = await open('localhost'); void f; for (const t of ['오늘의 운세풀이', '신년운', '나의 총운 · 운명풀이', '택일']) expect(menuButton(`${t} · 광고 보고 열기`).textContent).toContain('광고 보고 열기');
  });
});
