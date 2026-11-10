import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAdGate } from './ads';
import type { Sdk } from './sdk';

type ShowEvt = { type: string; data?: { unitType: string; unitAmount: number } };
/** 광고가 지원되는 가짜 SDK. 테스트가 show 이벤트를 원하는 순서로 쏴요. */
function fake() {
  const loads: string[] = []; let showCb: ((e: ShowEvt) => void) | null = null, loadCb: ((e: { type: 'loaded' }) => void) | null = null; let shows = 0;
  const sdk = {
    loadFullScreenAd: Object.assign((p: { options?: { adGroupId: string }; onEvent: (e: { type: 'loaded' }) => void }) => { loads.push(p.options!.adGroupId); loadCb = p.onEvent; return () => {}; }, { isSupported: () => true }),
    showFullScreenAd: Object.assign((p: { onEvent: (e: ShowEvt) => void }) => { shows++; showCb = p.onEvent; return () => {}; }, { isSupported: () => true }),
  } as unknown as Pick<Sdk, 'loadFullScreenAd' | 'showFullScreenAd'>;
  return { sdk, loads, shows: () => shows, loaded: () => loadCb?.({ type: 'loaded' }), emit: (e: ShowEvt) => showCb?.(e) };
}
const R: ShowEvt = { type: 'userEarnedReward', data: { unitType: '열람권', unitAmount: 1 } };
const ready = async (f: ReturnType<typeof fake>, opts = {}) => { const g = createAdGate(f.sdk, 'X', opts); const p = g.preload(); f.loaded(); await p; return g; };
beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());

describe('광고 게이트: 보상 이벤트 기준', () => {
  it('보상 이벤트가 오면 닫힘 이벤트를 기다리지 않고 바로 rewarded예요(Android 5.255.0은 dismissed가 안 와요)', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); f.emit({ type: 'show' }); f.emit({ type: 'impression' }); f.emit(R);
    await expect(p).resolves.toBe('rewarded');
  });
  it('보상 → 닫힘(공식 순서)이면 rewarded이고 다음 광고는 닫힘 직후 한 번만 불러와요', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); f.emit(R); await expect(p).resolves.toBe('rewarded'); expect(f.loads.length).toBe(1);
    f.emit({ type: 'dismissed' }); expect(f.loads.length).toBe(2); await vi.advanceTimersByTimeAsync(10000); expect(f.loads.length).toBe(2); // 폴백 타이머가 한 번 더 부르지 않아요
  });
  it('닫힘이 안 오면 4초 뒤에 다음 광고를 불러와요', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); f.emit(R); await p; expect(f.loads.length).toBe(1);
    await vi.advanceTimersByTimeAsync(3900); expect(f.loads.length).toBe(1); await vi.advanceTimersByTimeAsync(200); expect(f.loads.length).toBe(2);
  });
  it('닫힘이 보상보다 먼저 와도 1.5초 안에 보상이 오면 rewarded예요(방어)', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); f.emit({ type: 'dismissed' }); await vi.advanceTimersByTimeAsync(1000); f.emit(R);
    await expect(p).resolves.toBe('rewarded');
  });
  it('닫힘만 오고 1.5초가 지나면 dismissed(보상 없음)이고, 다음 광고를 불러와요', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); f.emit({ type: 'show' }); f.emit({ type: 'dismissed' });
    await vi.advanceTimersByTimeAsync(1400); let settled = false; void p.then(() => { settled = true; }); await Promise.resolve(); expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(200); await expect(p).resolves.toBe('dismissed'); expect(f.loads.length).toBe(2);
  });
  it('이벤트가 하나도 안 오면 90초 뒤 포기해서 카드가 영원히 잠기지 않아요', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); f.emit({ type: 'show' }); await vi.advanceTimersByTimeAsync(89000); let done = false; void p.then(() => { done = true; }); await Promise.resolve(); expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2000); await expect(p).resolves.toBe('dismissed');
  });
  it('failedToShow는 failed예요(사용자가 막히지 않게 앱이 열어줘요)', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); f.emit({ type: 'failedToShow' }); await expect(p).resolves.toBe('failed');
  });
  it('보상을 받은 뒤 닫힘이 또 와도 결과는 한 번만 나와요', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); const r: string[] = []; void p.then((x) => r.push(x)); f.emit(R); f.emit(R); f.emit({ type: 'dismissed' }); await vi.advanceTimersByTimeAsync(5000); expect(r).toEqual(['rewarded']);
  });
  it('준비 전에 show하면 failed, 지원 안 하면 unsupported예요', async () => {
    const f = fake(); const g = createAdGate(f.sdk, 'X'); await expect(g.show()).resolves.toBe('failed'); await expect(createAdGate(null, 'X').show()).resolves.toBe('unsupported');
  });
  it('이벤트를 순서대로 알려줘요(QR 테스트 진단용)', async () => {
    const f = fake(); const lines: string[] = []; const g = await ready(f, { onTrace: (s: string) => lines.push(s) }); const p = g.show(); f.emit({ type: 'requested' }); f.emit({ type: 'show' }); f.emit(R); await p;
    expect(lines).toEqual(['load: 요청', 'load: loaded', 'show: requested', 'show: show', 'show: userEarnedReward(열람권×1)', '결과: rewarded']);
  });
  it('dispose하면 남은 타이머를 모두 정리해요(언마운트 뒤 불러오기 없음)', async () => {
    const f = fake(); const g = await ready(f); const p = g.show(); f.emit(R); await p; g.dispose(); await vi.advanceTimersByTimeAsync(10000); expect(f.loads.length).toBe(1);
  });
});
