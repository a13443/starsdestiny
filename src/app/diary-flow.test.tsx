import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import App from './App';
import { DIARY_KEY } from './diary';
import { kstToday } from './domain';
import { expectSane, pressable } from '../test-utils';
import { AppProvider } from './AppProvider';
import { TodayView } from './views/Today';
import { toProfile } from './domain';
import type { Sdk } from '../platform';

function make(preset: Record<string, unknown> = {}) {
  const store = new Map<string, string>(Object.entries(preset).map(([k, v]) => [k, JSON.stringify(v)])); const events: { log_name: string; params: Record<string, unknown> }[] = [];
  const sdk = { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async (k: string) => { store.delete(k); } },
    loadFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }), showFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }),
    Share: { createLink: async () => 'x', sendMessage: async () => {} }, Analytics: { log: async (p: { log_name: string; params: Record<string, unknown> }) => { events.push(p); } },
    graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk;
  return { sdk, store, events };
}
const PROFILE = { y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: '', mm: '', region: '', city: '' };
const click = (t: string | RegExp) => act(async () => { fireEvent.click(pressable(t)); });
const stored = (f: { store: Map<string, string> }) => JSON.parse(f.store.get(DIARY_KEY) ?? '{}');
beforeEach(() => cleanup());
async function home(f = make({ 'profile:v1': PROFILE })) { render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); return f; }
async function today(f = make({ 'profile:v1': PROFILE })) { await home(f); await click(/^오늘의 운세풀이 · /); await screen.findByText('오늘 하루는 어땠어요?'); return f; }

describe('운세 일기', () => {
  it('오늘 화면에 기록 버튼 3개와 일기 이동이 있고, 누르면 오늘 날짜로 저장돼요', async () => {
    const f = await today(); const group = screen.getByRole('group', { name: '오늘 하루 느낌' });
    const btns = within(group).getAllByRole('button'); expect(btns.map((b) => b.textContent)).toEqual(['기대보다 좋았어요', '비슷했어요', '기대보다 힘들었어요']);
    expect(btns.every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true); expect(screen.getByText('운세 일기 보기')).toBeTruthy();
    await click('기대보다 좋았어요');
    const d = stored(f); expect(Object.keys(d)).toEqual([kstToday()]); expect(d[kstToday()].mood).toBe('good'); expect(d[kstToday()].level).toBeGreaterThanOrEqual(1); expect(d[kstToday()].level).toBeLessThanOrEqual(5);
    expect(within(group).getByText('기대보다 좋았어요').closest('button')!.getAttribute('aria-pressed')).toBe('true');
    expect(f.events.some((e) => e.log_name === 'diary_record' && e.params.mood === 'good')).toBe(true);
  });
  it('같은 날 다시 누르면 바뀐 느낌으로 덮어써요(하루 한 건)', async () => {
    const f = await today(); await click('기대보다 좋았어요'); await click('기대보다 힘들었어요');
    const d = stored(f); expect(Object.keys(d).length).toBe(1); expect(d[kstToday()].mood).toBe('bad');
    const g = screen.getByRole('group', { name: '오늘 하루 느낌' }); expect(within(g).getByText('기대보다 힘들었어요').closest('button')!.getAttribute('aria-pressed')).toBe('true'); expect(within(g).getByText('기대보다 좋았어요').closest('button')!.getAttribute('aria-pressed')).toBe('false');
  });
  it('일기 화면: 기록 없으면 안내 + 오늘로 이동, 있으면 요약과 날짜별 목록', async () => {
    const f = await home(); await click('운세 일기 · 무료'); expect(await screen.findByText('아직 기록이 없어요')).toBeTruthy(); expect(f.events.some((e) => e.log_name === 'view_diary')).toBe(true);
    await click('오늘의 운세풀이로'); await screen.findByText('오늘 하루는 어땠어요?'); await click('비슷했어요'); await click('운세 일기 보기');
    await screen.findByText('기록'); const sum = screen.getByLabelText('요약'); expect(sum.textContent).toMatch(/최근 1일 중 [01]일이 풀이와 비슷했어요/); expect(sum.textContent).toContain('바넘 효과');
    const e = screen.getByLabelText(new RegExp(`^${Number(kstToday().slice(5, 7))}월 ${Number(kstToday().slice(8, 10))}일$`)); expect(e.textContent).toContain('실제 느낌: 비슷했어요'); expect(within(e).getByRole('img').getAttribute('aria-label')).toMatch(/5점 만점에 [1-5]점/); expectSane();
  });
  it('여러 날 기록: 최근 14일만 최신순으로, 일치 개수 집계', async () => {
    const d: Record<string, { mood: string; level: number }> = {};
    for (let i = 0; i < 20; i++) d[new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10)] = { level: 4, mood: i % 2 ? 'good' : 'bad' };
    const f = make({ 'profile:v1': PROFILE, [DIARY_KEY]: d }); await home(f); await click('운세 일기 · 무료'); await screen.findByText('기록');
    const sum = screen.getByLabelText('요약'); expect(sum.textContent).toMatch(/최근 14일 중 7일이 풀이와 비슷했어요/);
    const entries = [...document.querySelectorAll('article.cat')].filter((a) => /^\d+월 \d+일$/.test(a.getAttribute('aria-label') ?? ''));
    expect(entries.length).toBe(14); expect(entries[0].getAttribute('aria-label')).toBe('10월 20일'); expect(entries.at(-1)!.getAttribute('aria-label')).toBe('10월 7일');
  });
  it('재방문: 저장된 일기가 유지되고 오늘 버튼 선택 상태도 복원돼요', async () => {
    const f = make({ 'profile:v1': PROFILE, [DIARY_KEY]: { [kstToday()]: { mood: 'ok', level: 3 } } });
    await today(f); const g = screen.getByRole('group', { name: '오늘 하루 느낌' }); expect(within(g).getByText('비슷했어요').closest('button')!.getAttribute('aria-pressed')).toBe('true');
  });
  it('깨진 저장값이 있어도 앱이 죽지 않고, 정상 항목만 보여줘요', async () => {
    const f = make({ 'profile:v1': PROFILE, [DIARY_KEY]: { '2026-10-01': { mood: 'good', level: 5 }, '2026-10-02': { mood: 'zzz', level: 5 }, '이상한키': 1 } });
    await home(f); await click('운세 일기 · 무료'); await screen.findByText('기록'); expect(screen.getByLabelText('요약').textContent).toMatch(/최근 1일/); expectSane();
  });
  it('화면 컴포넌트: 잠겨 있으면(unlocked=false) 종합 운만 보이고 기록 버튼은 onMood가 있어도 안 나와요', () => {
    const prof = toProfile({ y: 1995, m: 5, d: 12, cal: 'solar', gender: 'F' });
    render(<AppProvider hosted={false}><TodayView profile={prof} unlocked={false} mood={null} onMood={() => {}} onDiary={() => {}} /></AppProvider>);
    expect(screen.getByLabelText('종합 운')).toBeTruthy(); expect(screen.queryByText('오늘 하루는 어땠어요?')).toBeNull(); expect(screen.queryByRole('group', { name: '오늘 하루 느낌' })).toBeNull(); expect(screen.queryByText('운세 일기 보기')).toBeNull();
  });
  it('화면 컴포넌트: 열려 있어도 onMood를 안 넘기면 기록 영역이 없고, 넘기면 3개 버튼이 눌리면 level과 함께 콜백돼요', async () => {
    const prof = toProfile({ y: 1995, m: 5, d: 12, cal: 'solar', gender: 'F' });
    const { unmount } = render(<AppProvider hosted={false}><TodayView profile={prof} unlocked /></AppProvider>);
    expect(screen.queryByText('오늘 하루는 어땠어요?')).toBeNull(); unmount();
    const calls: [string, number][] = [];
    render(<AppProvider hosted={false}><TodayView profile={prof} unlocked mood="ok" onMood={(m, l) => calls.push([m, l])} /></AppProvider>);
    const g = screen.getByRole('group', { name: '오늘 하루 느낌' });
    expect(within(g).getByText('비슷했어요').closest('button')!.getAttribute('aria-pressed')).toBe('true'); expect(within(g).getByText('기대보다 좋았어요').closest('button')!.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { fireEvent.click(within(g).getByText('기대보다 힘들었어요')); });
    expect(calls.length).toBe(1); expect(calls[0][0]).toBe('bad'); expect(calls[0][1]).toBeGreaterThanOrEqual(1); expect(calls[0][1]).toBeLessThanOrEqual(5);
    expect(screen.queryByText('운세 일기 보기')).toBeNull(); // onDiary를 안 넘기면 이동 버튼도 없어요
  });
  it('일기 기록은 오늘 운세풀이가 열려 있을 때만 가능해요(잠긴 상태에서는 기록 버튼이 없어요)', async () => {
    await home(); expect(screen.queryByText('오늘 하루는 어땠어요?')).toBeNull(); expect(screen.queryByRole('group', { name: '오늘 하루 느낌' })).toBeNull();
  });
});
