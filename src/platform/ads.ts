import type { Sdk } from './sdk';

export type AdOutcome = 'rewarded' | 'dismissed' | 'failed' | 'unsupported';
export interface AdGate {
  /** 광고를 미리 불러와요. 이미 준비됐거나 로딩 중이면 같은 결과를 돌려줘요. */
  preload(): Promise<boolean>;
  isReady(): boolean;
  /** 미리 불러온 광고를 보여줘요. 공식 체크리스트상 재생 시점에 실시간 로딩을 하지 않으므로, 준비 전이면 'failed'예요. */
  show(): Promise<AdOutcome>;
  dispose(): void;
}
export interface AdGateOptions {
  loadTimeoutMs?: number;
  /** 보상 없이 닫힘 이벤트가 온 뒤, 늦게 올 수 있는 보상 이벤트를 기다리는 시간(ms). 공식 순서는 보상 → 닫힘이지만 순서가 뒤바뀌는 경우에 대비해요. */
  rewardGraceMs?: number;
  /** 보상·닫힘 어느 쪽도 안 올 때 포기하는 시간(ms). 카드가 영원히 잠기지 않게 하는 안전장치예요. */
  showWatchdogMs?: number;
  /** 닫힘 이벤트가 안 오는 경우에도 다음 광고를 불러오는 시간(ms) */
  reloadFallbackMs?: number;
  /** 광고 이벤트를 그대로 알려줘요(QR 테스트 진단용). */
  onTrace?: (line: string) => void;
}

/**
 * 광고 게이트. 공식 순서는 show → impression → (시청 완료) → userEarnedReward → dismissed예요.
 * - 보상은 userEarnedReward가 오는 순간 확정해요(dismissed를 기다리지 않아요).
 *   공식 FAQ에 "Android 토스 앱 5.255.0에서는 dismissed 이벤트가 발생하지 않는다"고 돼 있어서, 닫힘에만 의존하면 그 환경에서는 영원히 안 열려요.
 * - dismissed만으로는 보상을 주지 않아요(공식 규칙). 다만 보상이 닫힘보다 늦게 올 수 있어 짧게 기다려요.
 */
export function createAdGate(sdk: Pick<Sdk, 'loadFullScreenAd' | 'showFullScreenAd'> | null, adGroupId: string, opts: AdGateOptions = {}): AdGate {
  const timeoutMs = opts.loadTimeoutMs ?? 10000, graceMs = opts.rewardGraceMs ?? 1500, watchdogMs = opts.showWatchdogMs ?? 90000, reloadMs = opts.reloadFallbackMs ?? 4000;
  const trace = (s: string) => { try { opts.onTrace?.(s); } catch { /* 진단 출력 실패는 무시 */ } };
  let ready = false, loading: Promise<boolean> | null = null, cleanupLoad: (() => void) | null = null, cleanupShow: (() => void) | null = null, disposed = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const clear = (t: ReturnType<typeof setTimeout> | null) => { if (t) { clearTimeout(t); timers.delete(t); } };
  const supported = () => !!sdk && sdk.loadFullScreenAd.isSupported() && sdk.showFullScreenAd.isSupported();

  function preload(): Promise<boolean> {
    if (!sdk || !supported() || disposed) return Promise.resolve(false);
    if (ready) return Promise.resolve(true);
    if (loading) return loading;
    loading = new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (ok: boolean) => { if (done) return; done = true; clearTimeout(timer); ready = ok; loading = null; trace(ok ? 'load: loaded' : 'load: 실패/시간초과'); resolve(ok); };
      const timer = setTimeout(() => finish(false), timeoutMs);
      try {
        trace('load: 요청');
        cleanupLoad = sdk.loadFullScreenAd({ options: { adGroupId }, onEvent: (e) => { if (e.type === 'loaded') finish(true); }, onError: (err) => { trace(`load: onError ${String(err)}`); finish(false); } });
      } catch { finish(false); }
    });
    return loading;
  }

  function show(): Promise<AdOutcome> {
    if (!sdk || !supported()) return Promise.resolve('unsupported');
    if (!ready) { trace('show: 광고가 아직 준비되지 않았어요'); return Promise.resolve('failed'); }
    ready = false;
    return new Promise<AdOutcome>((resolve) => {
      let rewarded = false, done = false, graceTimer: ReturnType<typeof setTimeout> | null = null, reloadTimer: ReturnType<typeof setTimeout> | null = null, dogTimer: ReturnType<typeof setTimeout> | null = null;
      const reload = () => { clear(reloadTimer); reloadTimer = null; if (!disposed) void preload(); };
      const finish = (r: AdOutcome) => {
        if (done) return; done = true; clear(graceTimer); clear(dogTimer); trace(`결과: ${r}`); resolve(r);
        if (r === 'dismissed' || r === 'failed') { cleanupShow?.(); cleanupShow = null; reload(); }
        else if (!reloadTimer) reloadTimer = later(reload, reloadMs); // 보상 직후: 닫힘이 오면 그때, 안 오면 reloadMs 뒤에 다음 광고를 불러와요
      };
      dogTimer = later(() => { trace('show: 90초 동안 보상·닫힘 이벤트가 없어 포기'); finish('dismissed'); }, watchdogMs);
      try {
        cleanupShow = sdk.showFullScreenAd({
          options: { adGroupId },
          onEvent: (e) => {
            trace(`show: ${e.type}${e.type === 'userEarnedReward' && e.data ? `(${e.data.unitType}×${e.data.unitAmount})` : ''}`);
            if (e.type === 'userEarnedReward') { rewarded = true; clear(graceTimer); finish('rewarded'); }
            else if (e.type === 'dismissed') {
              if (done) { cleanupShow?.(); cleanupShow = null; reload(); return; } // 보상 뒤 닫힘: 다음 광고를 바로 불러와요
              if (rewarded) finish('rewarded'); else graceTimer = later(() => finish('dismissed'), graceMs);
            } else if (e.type === 'failedToShow') finish('failed');
          },
          onError: (err) => { trace(`show: onError ${String(err)}`); finish('failed'); },
        });
      } catch { finish('failed'); }
    });
  }

  return { preload, isReady: () => ready, show, dispose() { disposed = true; timers.forEach(clearTimeout); timers.clear(); cleanupLoad?.(); cleanupShow?.(); } };
}
