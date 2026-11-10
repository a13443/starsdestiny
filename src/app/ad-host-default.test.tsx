/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://starsdestiny.apps.tossmini.com/" }
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import App from './App';
import { APP_NAME } from './brand';
import { AD_GROUP_ID_LIVE } from '../platform';
import type { Sdk } from '../platform';

// 주입한 host 없이 App의 "진짜 기본 경로(location.hostname)"가 실제 서비스 주소에서 실제 ID를 고르는지 확인해요.
beforeEach(() => cleanup());
describe('기본 경로: location.hostname', () => {
  it('jsdom 주소가 실제로 바뀌었어요(이 테스트의 전제)', () => { expect(window.location.hostname).toBe(`${APP_NAME}.apps.tossmini.com`); });
  it('host를 주입하지 않아도 실제 서비스 주소에서는 실제 ID로 광고를 미리 불러와요', async () => {
    const ids: string[] = [], store = new Map<string, string>([['profile:v1', JSON.stringify({ y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: '', mm: '', region: '', city: '' })]]);
    const sdk = { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async () => {} },
      loadFullScreenAd: Object.assign((p: { options: { adGroupId: string } }) => { ids.push(p.options.adGroupId); return () => {}; }, { isSupported: () => true }),
      showFullScreenAd: Object.assign(() => () => {}, { isSupported: () => true }), Share: { createLink: async () => 'x', sendMessage: async () => {} }, Analytics: { log: async () => {} },
      graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk;
    render(<App sdk={sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); await act(async () => { await Promise.resolve(); });
    expect(ids[0]).toBe(AD_GROUP_ID_LIVE);
  });
});
