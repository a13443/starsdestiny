import { describe, it, expect } from 'vitest';
import { AD_GROUP_ID_LIVE, AD_GROUP_ID_TEST, adGroupIdFor, adModeFor, isProductionHost, isQrTestHost } from './adGroup';

const APP = 'starsdestiny';
describe('광고 그룹 ID 상수', () => {
  it('실제 ID는 콘솔에서 발급받은 값이고, 테스트 ID는 공식 문서의 리워드 테스트 ID예요', () => {
    expect(AD_GROUP_ID_LIVE).toBe('ait.v2.live.2f3beacd63df4412'); expect(AD_GROUP_ID_TEST).toBe('ait-ad-test-rewarded-id'); expect(AD_GROUP_ID_LIVE).not.toBe(AD_GROUP_ID_TEST);
  });
});

describe('주소별 광고 모드: 실제 서비스 주소만 live, 나머지는 전부 test', () => {
  const live = [`${APP}.web.tossmini.com`, `${APP}.apps.tossmini.com`, `STARSDESTINY.APPS.TOSSMINI.COM`];
  const test = [
    `${APP}.private-web.tossmini.com`, `${APP}.private-apps.tossmini.com`, // 콘솔 QR 테스트
    'localhost', '127.0.0.1', '192.168.0.12', '[::1]', '', // 샌드박스·로컬·빈 값
    `${APP}.apps.tossmini.com.evil.com`, `evil.${APP}.apps.tossmini.com`, `${APP}.apps.tossmini.co`, `${APP}-x.apps.tossmini.com`, `x${APP}.web.tossmini.com`, // 위장
    'otherapp.apps.tossmini.com', 'otherapp.web.tossmini.com', `${APP}.apps.tossmini.com.`, `${APP}.tossmini.com`, 'tossmini.com', `${APP}.web.tossmini.com:8080`,
  ];
  for (const h of live) it(`live: ${h}`, () => { expect(isProductionHost(h, APP)).toBe(true); expect(adModeFor(h, APP)).toBe('live'); expect(adGroupIdFor(h, APP)).toBe(AD_GROUP_ID_LIVE); });
  for (const h of test) it(`test: "${h}"`, () => { expect(isProductionHost(h, APP)).toBe(false); expect(adModeFor(h, APP)).toBe('test'); expect(adGroupIdFor(h, APP)).toBe(AD_GROUP_ID_TEST); });
  it('appName이 비어 있으면 어떤 주소도 live가 아니에요', () => { for (const h of live) expect(isProductionHost(h, '')).toBe(false); expect(isProductionHost('.apps.tossmini.com', '')).toBe(false); });
  it('다른 앱 이름으로는 우리 주소가 live가 아니에요', () => { expect(isProductionHost(`${APP}.apps.tossmini.com`, 'other')).toBe(false); expect(isProductionHost('other.apps.tossmini.com', 'other')).toBe(true); });
});

describe('QR 테스트 주소 판정(진단 줄 표시 조건)', () => {
  it('private-web / private-apps만 QR 테스트예요', () => { for (const h of [`${APP}.private-web.tossmini.com`, `${APP}.private-apps.tossmini.com`, `${APP.toUpperCase()}.PRIVATE-APPS.TOSSMINI.COM`]) expect(isQrTestHost(h, APP), h).toBe(true); });
  it('실제 서비스·로컬·위장 주소는 QR 테스트가 아니에요', () => { for (const h of [`${APP}.apps.tossmini.com`, `${APP}.web.tossmini.com`, 'localhost', '', `${APP}.private-apps.tossmini.com.evil.com`, `x${APP}.private-web.tossmini.com`, 'other.private-apps.tossmini.com']) expect(isQrTestHost(h, APP), h).toBe(false); expect(isQrTestHost(`${APP}.private-apps.tossmini.com`, '')).toBe(false); });
  it('실제 서비스 주소와 QR 테스트 주소는 겹치지 않아요', () => { for (const h of [`${APP}.web.tossmini.com`, `${APP}.apps.tossmini.com`, `${APP}.private-web.tossmini.com`, `${APP}.private-apps.tossmini.com`]) expect(isProductionHost(h, APP) && isQrTestHost(h, APP), h).toBe(false); });
});
