import type { Sdk, LogParam } from './sdk';

export type EventName = 'app_open' | 'profile_submit' | 'view_result' | 'gate_open' | 'ad_rewarded' | 'ad_failed' | 'view_today' | 'view_newyear' | 'view_destiny' | 'view_taekil' | 'view_match' | 'view_diary' | 'diary_record' | 'share_click' | 'share_done';
export interface Tracker { track(name: EventName, params?: Record<string, LogParam>): void }

/** 분석 로그는 부가 기능이라 실패해도 앱 동작에 영향을 주지 않아요. 개인정보(생년월일 등)는 절대 넣지 않아요. */
export function createTracker(sdk: Pick<Sdk, 'Analytics'> | null, debug: (msg: string) => void = () => {}): Tracker {
  return {
    track(name, params = {}) {
      if (!sdk) { debug(`[analytics:dev] ${name} ${JSON.stringify(params)}`); return; }
      // log_type은 SDK 타입상 click·event·impression·screen 등으로 제한돼요. 사용자 행동 기록은 'event'를 써요.
      void sdk.Analytics.log({ log_name: name, log_type: 'event', params }).catch(() => {});
    },
  };
}
