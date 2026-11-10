import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import { AppProvider } from './AppProvider';
import { CAT_ICON, Icon, PairRow, TodayBars, VerdictBar, barTone, barWidth, catIcon, verdictWidths } from './visual';
import { MenuCard, MENU_VIS, MenuList } from './menu';
import { dayReading, matchDetailOf, toProfile } from './domain';
import { menuButton } from '../test-utils';
import type { Sdk } from '../platform';

function make() {
  const store = new Map<string, string>([['profile:v1', JSON.stringify({ y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: '', mm: '', region: '', city: '' })]]);
  const sdk = { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async () => {} },
    loadFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }), showFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }),
    Share: { createLink: async () => 'x', sendMessage: async () => {} }, Analytics: { log: async () => {} }, graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk;
  return sdk;
}
const wrap = (ui: React.ReactElement) => render(<AppProvider hosted={false}>{ui}</AppProvider>);
const P = toProfile({ y: 1995, m: 5, d: 12, cal: 'solar', gender: 'F' } as never);
beforeEach(() => cleanup());
async function today() { render(<App sdk={make()} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); await act(async () => { fireEvent.click(menuButton('오늘의 운세풀이 · 광고 보고 열기')); }); await screen.findByLabelText('오늘의 5가지 운 한눈에'); }

describe('막대 규칙(레벨 → 길이·색)', () => {
  it('길이는 레벨×20%이고 1~5 밖의 값은 잘라요', () => {
    expect([1, 2, 3, 4, 5].map(barWidth)).toEqual(['20%', '40%', '60%', '80%', '100%']); expect(barWidth(0)).toBe('20%'); expect(barWidth(9)).toBe('100%'); expect(barWidth(-3)).toBe('20%');
  });
  it('4점 이상 hi, 3점 mid, 2점 이하 lo', () => { expect([5, 4, 3, 2, 1].map(barTone)).toEqual(['hi', 'hi', 'mid', 'lo', 'lo']); });
  it('판정 막대 비율은 개수 비율이고 합이 100이에요(전부 0이어도 NaN 없음)', () => {
    const w = verdictWidths({ good: 2, ok: 3, tense: 2 }); expect(w.good).toBeCloseTo(28.57, 1); expect(w.ok).toBeCloseTo(42.86, 1); expect(w.good + w.ok + w.tense).toBeCloseTo(100, 5);
    const z = verdictWidths({ good: 0, ok: 0, tense: 0 }); expect(Object.values(z).every((v) => Number.isFinite(v))).toBe(true);
  });
  it('카테고리 아이콘이 오늘 풀이의 5개 키와 모두 연결돼요(없는 키는 기본 아이콘)', () => {
    const { cats } = dayReading(P); for (const c of cats) expect(CAT_ICON[c.key], c.key).toBeTruthy(); expect(new Set(cats.map((c) => catIcon(c.key))).size).toBe(5); expect(catIcon('???')).toBe('sun');
  });
});

describe('오늘의 5가지 운 막대(화면)', () => {
  it('5개 행이 레벨 그대로 막대 길이·숫자·접근성 이름으로 나와요', () => {
    const { cats } = dayReading(P); wrap(<TodayBars cats={cats} />);
    const rows = screen.getAllByRole('listitem'); expect(rows.length).toBe(5);
    rows.forEach((li, i) => {
      const c = cats[i]; expect(li.getAttribute('aria-label')).toBe(`${c.label} ${c.levelLabel} 5점 만점에 ${c.level}점`);
      expect((li.querySelector('.barTrack i') as HTMLElement).style.width).toBe(barWidth(c.level)); expect(li.querySelector('.barTrack i')!.className).toContain(`tone-${barTone(c.level)}`);
      expect(li.querySelector('.barNum')!.textContent).toBe(`${c.level}/5`); expect(li.querySelector('svg.ico')).toBeTruthy();
      for (const dec of ['.barTrack', '.barNum']) expect(li.querySelector(dec)!.getAttribute('aria-hidden')).toBe('true');
    });
  });
  it('오늘 풀이를 열면 종합 운 아래 “오늘의 5가지 운”이 나오고, 잠겨 있을 땐 안 나와요', async () => {
    render(<App sdk={make()} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); expect(screen.queryByLabelText('오늘의 5가지 운 한눈에')).toBeNull();
    await act(async () => { fireEvent.click(menuButton('오늘의 운세풀이 · 광고 보고 열기')); }); const bars = await screen.findByLabelText('오늘의 5가지 운 한눈에');
    expect(screen.getByText('오늘의 5가지 운')).toBeTruthy(); expect(bars.querySelectorAll('li').length).toBe(5); expect(screen.getByLabelText('종합 운').compareDocumentPosition(bars) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('카테고리 상세 카드마다 아이콘이 있어요', async () => {
    await today(); for (const label of ['재물운', '연애운', '사업운', '학업운', '컨디션운']) expect(screen.getByLabelText(label).querySelector('.catIco svg.ico'), label).toBeTruthy();
  });
});

describe('궁합 판정 시각 요소', () => {
  it('판정 막대는 개수만큼 구간이 생기고 0개인 구간은 그리지 않아요', () => {
    wrap(<VerdictBar tally={{ good: 2, ok: 0, tense: 3 }} />); const bar = screen.getByRole('img', { name: '잘 맞음 2개, 무난 0개, 긴장 3개' });
    expect(bar.querySelectorAll('i').length).toBe(2); expect(bar.querySelector('.vb-ok')).toBeNull(); expect((bar.querySelector('.vb-good') as HTMLElement).style.width).toBe('40%'); expect((bar.querySelector('.vb-tense') as HTMLElement).style.width).toBe('60%');
  });
  it('두 사람 일간 타일은 한자는 장식(aria-hidden), 한글·오행은 읽혀요', () => {
    const R = matchDetailOf(P, toProfile({ y: 1993, m: 8, d: 3, cal: 'solar', gender: 'M' } as never));
    wrap(<PairRow me={R.people[0].dayMaster} you={R.people[1].dayMaster} relation={R.sections[0].headline} />);
    const g = screen.getByRole('group', { name: '두 사람의 일간' }); expect(g.textContent).toContain(R.people[0].dayMaster.ko); expect(g.textContent).toContain(R.sections[0].headline);
    expect([...g.querySelectorAll('.pairTile b')].every((b) => b.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});

describe('메뉴 아이콘', () => {
  it('9개 메뉴 키가 모두 아이콘과 색을 가져요', () => { expect(Object.keys(MENU_VIS).sort()).toEqual(['card', 'destiny', 'diary', 'edit', 'match', 'newyear', 'share', 'taekil', 'today']); });
  it('아이콘은 장식(aria-hidden)이라 카드의 접근성 이름을 바꾸지 않아요', () => {
    wrap(<MenuList label="t"><MenuCard title="궁합 보기" desc="d" status="free" vis={MENU_VIS.match} onClick={() => {}} /></MenuList>);
    const b = screen.getByRole('button', { name: '궁합 보기 · 무료' }); expect(b.querySelector('.menuIcon svg')!.getAttribute('aria-hidden')).toBe('true'); expect(b.querySelector('.menuIcon')!.className).toContain('tint-coral');
  });
  it('Icon은 모든 이름에서 path를 그려요', () => { for (const n of Object.values(CAT_ICON)) { const { container, unmount } = render(<Icon name={n} />); expect(container.querySelector('path')!.getAttribute('d')!.length).toBeGreaterThan(10); unmount(); } });
});
