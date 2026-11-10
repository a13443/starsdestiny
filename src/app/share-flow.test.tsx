import { describe, it, expect, beforeEach } from 'vitest';
import { APP_NAME, APP_TITLE } from './brand';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import { expectSane, pressable } from '../test-utils';
import type { Sdk } from '../platform';

type Opt = { createLink?: 'ok' | 'fail'; send?: 'ok' | 'fail' };
function make(preset: Record<string, unknown> = {}, o: Opt = {}) {
  const store = new Map<string, string>(Object.entries(preset).map(([k, v]) => [k, JSON.stringify(v)]));
  const calls: string[] = [], sent: string[] = [], links: { path: string }[] = [], events: { log_name: string; params: Record<string, unknown> }[] = [];
  const sdk = { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async () => {} },
    loadFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }), showFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }),
    Share: {
      createLink: async (p: { path: string }) => { calls.push('createLink'); links.push(p); if (o.createLink === 'fail') throw new Error('x'); return 'https://toss.example/s/abc'; },
      sendMessage: async (m: { message: string }) => { calls.push('sendMessage'); if (o.send === 'fail') throw new Error('x'); sent.push(m.message); },
    },
    Analytics: { log: async (p: { log_name: string; params: Record<string, unknown> }) => { events.push(p); } }, graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk;
  return { sdk, calls, sent, links, events, store };
}
const PROFILE = { y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: 14, mm: 30, region: '제주', city: '제주시' };
const click = (t: string | RegExp) => act(async () => { fireEvent.click(pressable(t)); });
async function home(f: ReturnType<typeof make>) { render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); }
const PRIVATE = /1995|0?5월|12일|14시|30분|제주|서울|여성|남성|1993|8월|\b여\b|\b남\b/;
beforeEach(() => cleanup());

describe('내 결과 공유', () => {
  it('링크를 만든 뒤 공유 시트로 문구를 보내요(순서: createLink → sendMessage)', async () => {
    const f = make({ 'profile:v1': PROFILE }); await home(f); await click('내 결과 공유하기');
    expect(f.calls).toEqual(['createLink', 'sendMessage']); expect(f.links).toEqual([{ path: `intoss://${APP_NAME}/` }]);
    expect(f.sent.length).toBe(1); const m = f.sent[0];
    expect(m).toContain(`${APP_TITLE} 결과`); expect(m).toMatch(/황소자리 · 돼지띠 · 계癸 일간/); expect(m).toContain('(재미로 보는 운세)'); expect(m.endsWith('https://toss.example/s/abc')).toBe(true);
    expect(m).not.toMatch(PRIVATE); expect(f.links[0].path).not.toMatch(/1995|제주|profile|birth/);
    expect(f.events.some((e) => e.log_name === 'share_click' && e.params.kind === 'result')).toBe(true); expect(f.events.some((e) => e.log_name === 'share_done' && e.params.link === 'yes')).toBe(true);
  });
  it('링크 생성이 실패해도 문구는 공유해요(링크 줄만 빠짐)', async () => {
    const f = make({ 'profile:v1': PROFILE }, { createLink: 'fail' }); await home(f); await click('내 결과 공유하기');
    expect(f.sent.length).toBe(1); expect(f.sent[0]).not.toMatch(/https?:|intoss:/); expect(f.sent[0]).toContain(`${APP_TITLE} 결과`); expect(f.events.some((e) => e.log_name === 'share_done' && e.params.link === 'no')).toBe(true);
  });
  it('공유 시트가 실패하면 안내 문구가 나오고 앱은 계속 동작해요', async () => {
    const f = make({ 'profile:v1': PROFILE }, { send: 'fail' }); await home(f); await click('내 결과 공유하기');
    expect((await screen.findAllByRole('status')).some((x) => x.textContent === '공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.')).toBe(true); expect(f.events.some((e) => e.log_name === 'share_done')).toBe(false);
    expect(screen.getByRole('img', { name: '체계별 기운 분포' })).toBeTruthy();
  });
  it('일반 브라우저(SDK 없음)에서는 토스 앱 안에서만 공유할 수 있다고 안내해요', async () => {
    const store = new Map<string, string>([['profile:v1', JSON.stringify(PROFILE)]]); localStorage.clear(); localStorage.setItem('profile:v1', store.get('profile:v1')!);
    render(<App sdk={null} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); await click('내 결과 공유하기');
    expect((await screen.findAllByRole('status')).some((x) => x.textContent === '토스 앱 안에서만 공유할 수 있어요.')).toBe(true);
  });
});

describe('궁합 결과 공유', () => {
  async function matchResult(f: ReturnType<typeof make>) {
    await home(f); await click('궁합 보기 · 무료');
    for (const [l, v] of [['상대가 태어난 해', '1993'], ['상대가 태어난 달', '8'], ['상대가 태어난 날', '3']]) fireEvent.change(screen.getByLabelText(l), { target: { value: v } });
    fireEvent.click(screen.getByLabelText('남')); await click('궁합 결과 보기'); await screen.findByText('두 사람의 데이터');
  }
  it('집계만 담아 공유하고, 상대·내 개인정보와 상대의 별자리·띠는 넣지 않아요', async () => {
    const f = make({ 'profile:v1': PROFILE }); await matchResult(f); await click('궁합 결과 공유하기');
    expect(f.calls).toEqual(['createLink', 'sendMessage']); const m = f.sent[0];
    expect(m).toMatch(/^별사주 궁합\n/); expect(m).toMatch(/\d+가지 기준 중 잘 맞음 \d+ · 무난 \d+ · 긴장 \d+/); expect(m).toContain('(재미로 보는 운세)');
    expect(m).not.toMatch(PRIVATE); for (const w of ['사자자리', '닭띠', '황소자리', '돼지띠', '병丙', '계癸']) expect(m, w).not.toContain(w);
    expect(f.events.some((e) => e.log_name === 'share_click' && e.params.kind === 'match')).toBe(true);
    expect(screen.getByText(/상대의 생년월일·별자리·띠 같은 정보는 넣지 않아요/)).toBeTruthy();
  });
});

describe('공유 카드 화면', () => {
  it('카드를 화면에서 보여 주고, 이미지 전송 불가와 캡처 안내를 정직하게 알려요. 개인정보는 없어요', async () => {
    const f = make({ 'profile:v1': PROFILE }); await home(f); await click('공유 카드 보기');
    const card = await screen.findByLabelText('공유 카드'); expect(screen.getByText(/이미지 파일은 토스 공유 기능으로 보낼 수 없어서/)).toBeTruthy(); expect(screen.getByText(/화면 캡처로 저장해 공유/)).toBeTruthy();
    expect(card.querySelector('svg.ring')).toBeTruthy(); expect(card.querySelectorAll('.scRows li').length).toBe(5); expect(card.textContent).toContain('재미로 보는 운세 · 기운은 이 앱의 해석 규칙이에요');
    expect(card.textContent).toMatch(/황소자리/); expect(card.textContent).not.toMatch(PRIVATE); expect(f.calls).toEqual([]); expectSane();
  });
  it('성별이 없고 시간·출생지가 없으면 카드의 체계 행도 줄어요(잠긴 체계는 비어 있는 값 없이)', async () => {
    const f = make({ 'profile:v1': { ...PROFILE, gender: null, hh: '', mm: '', region: '', city: '' } }); await home(f); await click('공유 카드 보기');
    const card = await screen.findByLabelText('공유 카드'); expect(card.querySelectorAll('.scRows li').length).toBe(3); expect(card.textContent).not.toMatch(/undefined|null/);
    for (const li of card.querySelectorAll('.scRows li')) expect(li.querySelector('b')!.textContent!.length).toBeGreaterThan(0);
  });
});
