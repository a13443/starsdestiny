import * as real from '@apps-in-toss/web-framework';

export type LogParam = string | number | boolean | null | undefined;
export type LogType = 'click' | 'debug' | 'error' | 'event' | 'impression' | 'info' | 'popup' | 'screen' | 'warn';
export interface AdEvent { type: string; data?: { unitType: string; unitAmount: number } }

/** 이 앱이 쓰는 SDK 표면만 좁혀 둔 계약이에요. 테스트에서는 가짜 SDK를 주입해요. */
export interface Sdk {
  Storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  loadFullScreenAd: ((p: { options?: { adGroupId: string }; onEvent: (e: { type: 'loaded' }) => void; onError: (e: Error) => void }) => () => void) & { isSupported: () => boolean };
  showFullScreenAd: ((p: { options?: { adGroupId: string }; onEvent: (e: AdEvent) => void; onError: (e: Error) => void }) => () => void) & { isSupported: () => boolean };
  Share: { createLink(p: { path: string; ogImageUrl?: string }): Promise<string>; sendMessage(m: { message: string }): Promise<void> };
  Analytics: { log(p: { log_name: string; log_type: LogType; params: Record<string, LogParam> }): Promise<void> };
  graniteEvent: { addEventListener(event: 'backEvent' | 'homeEvent', args: { onEvent: () => void; onError?: (e: Error) => void }): () => void };
  Environment: { readonly environment: 'toss' | 'sandbox' };
}

// 컴파일 타임 검증: 실제 SDK 타입이 위 계약을 만족하지 않으면 tsc가 실패해요.
export const _sdkCompat: Sdk = real;

/** 토스 앱(또는 샌드박스) 안이면 실제 SDK, 일반 브라우저면 null(개발용 대체 동작) */
export function getSdk(): Sdk | null {
  try {
    const env = real.Environment.environment;
    return env === 'toss' || env === 'sandbox' ? real : null;
  } catch {
    return null;
  }
}
