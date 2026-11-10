/**
 * 광고 그룹 ID 선택.
 * 공식 문서: 개발·테스트 단계에서는 반드시 테스트용 ID를 쓰고, 실제 ID로 테스트하면 정책 위반으로 불이익을 받을 수 있어요.
 * 그래서 "주소가 정확히 실제 서비스일 때만" 실제 ID를 쓰고, 그 외(콘솔 QR 테스트, 샌드박스, 로컬, 알 수 없는 주소)는 전부 테스트 ID를 써요.
 * 틀렸을 때의 피해가 더 작은 쪽(테스트 광고만 나가 수익이 0)을 기본값으로 둔 거예요.
 */
export const AD_GROUP_ID_LIVE = 'ait.v2.live.2f3beacd63df4412';
export const AD_GROUP_ID_TEST = 'ait-ad-test-rewarded-id'; // 공식 문서의 리워드 테스트 광고 ID

export type AdMode = 'live' | 'test';

/**
 * 실제 서비스 주소만 true예요(공식 문서 기준).
 * - SDK 3.x: https://<appName>.web.tossmini.com
 * - 2026-08-25 이후 업로드한 SDK 3.x 번들은 2.x 주소로 서비스돼요: https://<appName>.apps.tossmini.com
 * 콘솔 QR 테스트는 `private-web` / `private-apps`라서 여기에 해당하지 않아요.
 */
export function isProductionHost(hostname: string, appName: string): boolean {
  const h = hostname.toLowerCase(), a = appName.toLowerCase();
  return !!a && (h === `${a}.web.tossmini.com` || h === `${a}.apps.tossmini.com`);
}
export const adModeFor = (hostname: string, appName: string): AdMode => (isProductionHost(hostname, appName) ? 'live' : 'test');
export const adGroupIdFor = (hostname: string, appName: string): string => (adModeFor(hostname, appName) === 'live' ? AD_GROUP_ID_LIVE : AD_GROUP_ID_TEST);

/** 콘솔 QR 테스트 주소만 true예요(`<appName>.private-web|private-apps.tossmini.com`). 진단 줄을 이 주소에서만 보여줘요. */
export const isQrTestHost = (hostname: string, appName: string): boolean => {
  const h = hostname.toLowerCase(), a = appName.toLowerCase();
  return !!a && (h === `${a}.private-web.tossmini.com` || h === `${a}.private-apps.tossmini.com`);
};
