import { describe, it, expect, vi } from 'vitest';
import { createAdGate, createKV, createTracker, createShareLink, deepLink, shareMessage, onBack, getJSON, setJSON } from './index';
import type { Sdk } from './index';

type Handlers = { onEvent: (e: any) => void; onError: (e: Error) => void };
function fakeAds(opts: { supported?: boolean } = {}) {
  const sup = opts.supported ?? true;
  const calls = { load: 0, show: 0 }; const h: { load?: Handlers; show?: Handlers } = {};
  const load: any = vi.fn((p: Handlers) => { calls.load++; h.load = p; return () => {}; }); load.isSupported = () => sup;
  const show: any = vi.fn((p: Handlers) => { calls.show++; h.show = p; return () => {}; }); show.isSupported = () => sup;
  return { sdk: { loadFullScreenAd: load, showFullScreenAd: show } as Pick<Sdk, 'loadFullScreenAd' | 'showFullScreenAd'>, calls, h };
}

describe('광고 게이트', () => {
  it('SDK가 없거나 미지원이면 unsupported, 로드는 false', async () => {
    expect(await createAdGate(null, 'g').show()).toBe('unsupported');
    const f = fakeAds({ supported: false }); const g = createAdGate(f.sdk, 'g');
    expect(await g.preload()).toBe(false); expect(await g.show()).toBe('unsupported'); expect(f.calls.load).toBe(0);
  });
  it('준비 전에 show하면 실시간 로딩하지 않고 failed(공식 체크리스트: 재생 시점 로딩 금지)', async () => {
    const f = fakeAds(); const g = createAdGate(f.sdk, 'g');
    expect(await g.show()).toBe('failed'); expect(f.calls.load).toBe(0); expect(f.calls.show).toBe(0);
  });
  it('preload는 중복 호출해도 한 번만 로드하고, loaded 이벤트에 ready', async () => {
    const f = fakeAds(); const g = createAdGate(f.sdk, 'g');
    const a = g.preload(), b = g.preload(); expect(f.calls.load).toBe(1);
    f.h.load!.onEvent({ type: 'loaded' }); expect(await a).toBe(true); expect(await b).toBe(true); expect(g.isReady()).toBe(true);
    expect(await g.preload()).toBe(true); expect(f.calls.load).toBe(1);
  });
  it('보상 이벤트 후 dismissed → rewarded, 끝나면 다음 광고를 다시 로드', async () => {
    const f = fakeAds(); const g = createAdGate(f.sdk, 'g');
    const p = g.preload(); f.h.load!.onEvent({ type: 'loaded' }); await p;
    const r = g.show(); expect(g.isReady()).toBe(false);
    f.h.show!.onEvent({ type: 'show' }); f.h.show!.onEvent({ type: 'userEarnedReward', data: { unitType: 'x', unitAmount: 1 } }); f.h.show!.onEvent({ type: 'dismissed' });
    expect(await r).toBe('rewarded'); expect(f.calls.load).toBe(2);
  });
  it('보상 없이 닫으면 dismissed(잠금 해제하지 않음)', async () => {
    const f = fakeAds(); const g = createAdGate(f.sdk, 'g'); const p = g.preload(); f.h.load!.onEvent({ type: 'loaded' }); await p;
    const r = g.show(); f.h.show!.onEvent({ type: 'dismissed' }); expect(await r).toBe('dismissed');
  });
  it('failedToShow·onError는 failed, 로드 오류와 타임아웃은 false', async () => {
    let f = fakeAds(); let g = createAdGate(f.sdk, 'g'); let p = g.preload(); f.h.load!.onEvent({ type: 'loaded' }); await p;
    let r = g.show(); f.h.show!.onEvent({ type: 'failedToShow' }); expect(await r).toBe('failed');
    f = fakeAds(); g = createAdGate(f.sdk, 'g'); p = g.preload(); f.h.load!.onError(new Error('x')); expect(await p).toBe(false);
    vi.useFakeTimers(); f = fakeAds(); g = createAdGate(f.sdk, 'g', { loadTimeoutMs: 50 }); p = g.preload(); vi.advanceTimersByTime(60); expect(await p).toBe(false); vi.useRealTimers();
  });
  it('이벤트가 중복으로 와도 한 번만 결과를 내요', async () => {
    const f = fakeAds(); const g = createAdGate(f.sdk, 'g'); const p = g.preload(); f.h.load!.onEvent({ type: 'loaded' }); await p;
    const r = g.show(); f.h.show!.onEvent({ type: 'userEarnedReward', data: { unitType: 'x', unitAmount: 1 } }); f.h.show!.onEvent({ type: 'dismissed' }); f.h.show!.onEvent({ type: 'failedToShow' });
    expect(await r).toBe('rewarded');
  });
});

describe('저장소', () => {
  it('토스 안에서는 SDK Storage를 쓰고, 실패해도 메모리로 계속 동작', async () => {
    const m = new Map<string, string>();
    const sdk = { Storage: { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v); }, removeItem: async (k: string) => { m.delete(k); } } };
    const kv = createKV(sdk); await setJSON(kv, 'a', { x: 1 }); expect(m.get('a')).toBe('{"x":1}'); expect(await getJSON(kv, 'a', null)).toEqual({ x: 1 });
    await kv.remove('a'); expect(await kv.get('a')).toBeNull();
    const bad = createKV({ Storage: { getItem: async () => { throw new Error('x'); }, setItem: async () => { throw new Error('x'); }, removeItem: async () => { throw new Error('x'); } } });
    await bad.set('k', 'v'); expect(await bad.get('k')).toBe('v');
  });
  it('일반 브라우저에서는 웹 저장소, 없으면 메모리. 깨진 JSON은 기본값', async () => {
    const store: Record<string, string> = {};
    const kv = createKV(null, { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } });
    await kv.set('p', '{bad'); expect(await getJSON(kv, 'p', { d: 1 })).toEqual({ d: 1 });
    const mem = createKV(null, null); await mem.set('z', '1'); expect(await mem.get('z')).toBe('1');
  });
});

describe('공유·분석·뒤로가기', () => {
  it('공유 링크는 intoss:// 스킴이고 SDK가 없으면 null', async () => {
    expect(deepLink('app', '/x')).toBe('intoss://app/x'); expect(deepLink('app')).toBe('intoss://app/');
    const create = vi.fn(async (p: { path: string }) => 'https://link/' + encodeURIComponent(p.path));
    const share = { Share: { createLink: create, sendMessage: async () => {} } };
    expect(await createShareLink(share, 'app', '/home')).toContain(encodeURIComponent('intoss://app/home'));
    expect(create.mock.calls[0][0].path.startsWith('intoss://')).toBe(true);
    expect(await createShareLink(null, 'app')).toBeNull();
    expect(await createShareLink({ Share: { createLink: async () => { throw new Error('x'); }, sendMessage: async () => {} } }, 'app')).toBeNull();
  });
  it('메시지 공유는 Share.sendMessage를 쓰고 결과 코드를 돌려줘요', async () => {
    expect(await shareMessage(null, 'hi')).toBe('unsupported');
    const send = vi.fn(async () => {});
    expect(await shareMessage({ Share: { createLink: async () => 'x', sendMessage: send } }, 'hi')).toBe('shared');
    expect(send).toHaveBeenCalledWith({ message: 'hi' });
    expect(await shareMessage({ Share: { createLink: async () => 'x', sendMessage: async () => { throw new Error('x'); } } }, 'hi')).toBe('failed');
  });
  it('분석: SDK 없으면 디버그만, 있으면 event로 기록, 실패해도 던지지 않음', async () => {
    const dbg = vi.fn(); createTracker(null, dbg).track('app_open'); expect(dbg).toHaveBeenCalled();
    const log = vi.fn(async () => {}); createTracker({ Analytics: { log } }).track('view_today', { n: 1 });
    expect(log).toHaveBeenCalledWith({ log_name: 'view_today', log_type: 'event', params: { n: 1 } });
    expect(() => createTracker({ Analytics: { log: async () => { throw new Error('x'); } } }).track('app_open')).not.toThrow();
  });
  it('뒤로가기: SDK 없으면 no-op, 있으면 backEvent 구독/해제', () => {
    expect(onBack(null, () => {})()).toBeUndefined();
    const off = vi.fn(); const add = vi.fn((_e: 'backEvent' | 'homeEvent', _a: { onEvent: () => void }) => off); const un = onBack({ graniteEvent: { addEventListener: add } }, () => {});
    expect(add.mock.calls[0][0]).toBe('backEvent'); un(); expect(off).toHaveBeenCalled();
  });
});
