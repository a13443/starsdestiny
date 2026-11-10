import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import App from './App';
import { MenuCard, MenuList, STATUS_LABEL } from './menu';
import { TodayHero } from './visual';
import { AppProvider } from './AppProvider';
import { dayReading, toProfile } from './domain';
import { menuButton } from '../test-utils';
import type { Sdk } from '../platform';

function make(adMode: 'fail' | 'hold' = 'fail') {
  const store = new Map<string, string>([['profile:v1', JSON.stringify({ y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: '', mm: '', region: '', city: '' })]]);
  let holdCb: (() => void) | null = null;
  const sdk = { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async () => {} },
    loadFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }), showFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }),
    Share: { createLink: async () => 'x', sendMessage: async () => {} }, Analytics: { log: async () => {} }, graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk;
  void adMode; void holdCb;
  return { sdk, store };
}
const P = toProfile({ y: 1995, m: 5, d: 12, cal: 'solar', gender: 'F' } as never);
const wrap = (ui: React.ReactElement) => render(<AppProvider hosted={false}>{ui}</AppProvider>);
beforeEach(() => cleanup());
async function home() { const f = make(); render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); return f; }

describe('오늘의 별(히어로)', () => {
  it('오늘 화면 헤더와 같은 값을 보여줘요: 일진(한글·한자), 별점, 라벨, 한 줄 설명', () => {
    wrap(<TodayHero profile={P} />);
    const { R } = dayReading(P); const card = screen.getByLabelText('오늘 종합 운');
    expect(card.textContent).toContain(`${R.pillarKo}일`); expect(card.textContent).toContain(R.pillar); expect(R.pillar).toMatch(/^[\u4e00-\u9fff]{2}$/);
    expect(within(card).getByRole('img').getAttribute('aria-label')).toBe(`5점 만점에 ${R.overall}점`); expect(card.textContent).toContain(R.overallLabel);
    expect(card.textContent).toContain(`내 일간 기준 ${R.tg}, ${R.tgTheme} 날이에요.`); expect(card.textContent).toContain(`${R.date.m}월 ${R.date.d}일`);
  });
  it('한자 일진은 장식이라 스크린 리더는 한글 일진만 읽어요(aria-hidden)', () => {
    wrap(<TodayHero profile={P} />); const { R } = dayReading(P); const el = [...document.querySelectorAll('.pillarHanja')][0];
    expect(el.textContent).toBe(R.pillar); expect(el.getAttribute('aria-hidden')).toBe('true');
  });
  it('홈에서는 맨 위(AI 안내 다음, 기운 링보다 앞)에 나와요', async () => {
    await home();
    const hero = screen.getByLabelText('오늘 종합 운'), ring = screen.getByRole('img', { name: '체계별 기운 분포' }), menu = screen.getByRole('list', { name: '더 보기 메뉴' });
    expect(hero.compareDocumentPosition(ring) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); expect(hero.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelectorAll('[aria-label="오늘 종합 운"]').length).toBe(1);
  });
});

describe('메뉴 카드(홈)', () => {
  it('항목 9개: 제목·설명·알약이 프로토타입과 같은 구성이에요', async () => {
    await home();
    const list = screen.getByRole('list', { name: '더 보기 메뉴' }); expect(list.querySelectorAll(':scope > li').length).toBe(9);
    const rows: [string, string, string | null][] = [
      ['오늘의 운세풀이 · 광고 보고 열기', '오늘의 5가지 운 · 시간대 흐름 · 오행 포인트', '광고 보고 열기'],
      ['신년운 · 광고 보고 열기', '올해와 내년의 시기별 흐름 · 월별 · 삼재', '광고 보고 열기'], // 설명은 연도가 앞에 붙은 문장의 뒷부분
      ['나의 총운 · 운명풀이 · 광고 보고 열기', '타고난 구조 · 10년 대운 · 분야별 풀이', '광고 보고 열기'],
      ['택일 · 광고 보고 열기', '이사 · 결혼 · 개업 · 계약 · 여행 좋은 날', '광고 보고 열기'],
      ['궁합 보기 · 무료', '두 사람의 사주·별자리·띠·구성기학·수비학', '무료'],
      ['운세 일기 · 무료', '오늘 풀이가 실제 하루와 맞았는지 기록해요', '무료'],
      ['내 결과 공유하기 · 무료', '결과 요약과 링크를 친구에게 보내요', '무료'],
      ['공유 카드 보기 · 무료', '카드로 보여드려요. 화면을 캡처해서 공유해요', '무료'],
      ['정보 수정', '생년월일·성별·시간·출생지를 바꿔요', null],
    ];
    for (const [name, desc, pill] of rows) {
      const b = within(list).getByRole('button', { name }); expect(b.textContent, name).toContain(desc);
      const d = b.getAttribute('aria-describedby')!; expect(document.getElementById(d)!.textContent!.endsWith(desc), `${name} 설명 연결`).toBe(true);
      if (pill) expect(within(b).getByText(pill), name).toBeTruthy(); else expect(b.textContent).not.toMatch(/무료|광고 보고 열기|열림/);
    }
  });
  it('신년운은 제목이 한 줄(신년운)이고 올해와 내년은 설명 앞에 보여요, 접근성 이름에는 연도가 없어요(이름이 해마다 안 바뀌게)', async () => {
    await home(); const b = menuButton('신년운 · 광고 보고 열기'); const desc = document.getElementById(b.getAttribute('aria-describedby')!)!.textContent!;
    expect(desc).toMatch(/^\d{4}년과 \d{4}년 · 올해와 내년의 시기별 흐름 · 월별 · 삼재$/); const y = Number(desc.slice(0, 4)); expect(desc.startsWith(`${y}년과 ${y + 1}년`)).toBe(true); // 내년은 올해+1
    expect(b.getAttribute('aria-label')).toBe('신년운 · 광고 보고 열기'); expect(b.textContent).not.toMatch(/신년운 · \d{4}/);
  });
  it('광고를 못 보여줘서 열린 항목은 알약이 “열림”으로 바뀌어요', async () => {
    await home(); await act(async () => { fireEvent.click(menuButton('택일 · 광고 보고 열기')); });
    await screen.findByText('앞으로 45일 · 좋은 날'.slice(0, 0) || /택일/, undefined, { timeout: 4000 }).catch(() => {});
    // 홈으로 돌아와 상태 확인
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '내 결과로 돌아가기' })); });
    const b = await screen.findByRole('button', { name: '택일 · 열림' }); expect(within(b).getByText('열림')).toBeTruthy();
    expect(screen.getByRole('button', { name: '신년운 · 광고 보고 열기' })).toBeTruthy(); // 안 연 항목은 그대로
  });
});

describe('MenuCard 동작', () => {
  it('클릭과 키보드(Enter·Space)로 각각 정확히 한 번씩만 실행돼요(광고가 두 번 뜨면 안 돼요), 다른 키는 무시', () => {
    const fn = vi.fn(); wrap(<MenuList label="t"><MenuCard title="궁합 보기" desc="설명" status="free" onClick={fn} /></MenuList>);
    const b = screen.getByRole('button', { name: '궁합 보기 · 무료' }); expect(b.getAttribute('tabindex')).toBe('0');
    const times = (act: () => void) => { const before = fn.mock.calls.length; act(); return fn.mock.calls.length - before; };
    expect(times(() => fireEvent.click(b))).toBe(1); expect(times(() => fireEvent.keyDown(b, { key: 'Enter' }))).toBe(1); expect(times(() => fireEvent.keyDown(b, { key: ' ' }))).toBe(1);
    expect(times(() => fireEvent.keyUp(b, { key: ' ' }))).toBe(0); expect(times(() => fireEvent.keyDown(b, { key: 'a' }))).toBe(0); expect(times(() => fireEvent.keyDown(b, { key: 'Tab' }))).toBe(0);
  });
  it('준비 중(busy)에는 눌러도 반응하지 않고(광고 중복 방지), 이름과 알약이 준비 중으로 바뀌고 aria-disabled예요', () => {
    const fn = vi.fn(); wrap(<MenuList label="t"><MenuCard title="오늘의 운세풀이" desc="설명" status="busy" onClick={fn} /></MenuList>);
    const b = screen.getByRole('button', { name: '오늘의 운세풀이 · 준비 중' }); expect(b.getAttribute('aria-disabled')).toBe('true'); expect(within(b).getByText('준비 중')).toBeTruthy();
    fireEvent.click(b); fireEvent.keyDown(b, { key: 'Enter' }); fireEvent.keyDown(b, { key: ' ' }); expect(fn).not.toHaveBeenCalled();
  });
  it('busyLabel을 주면 그 문구로 바뀌어요(공유는 “공유 준비 중”)', () => {
    wrap(<MenuList label="t"><MenuCard title="내 결과 공유하기" desc="d" status="busy" busyLabel="공유 준비 중" onClick={() => {}} /></MenuList>);
    expect(screen.getByRole('button', { name: '내 결과 공유하기 · 공유 준비 중' })).toBeTruthy();
  });
  it('none은 알약 없이 화살표만, 이름은 제목 그대로예요', () => {
    wrap(<MenuList label="t"><MenuCard title="정보 수정" desc="d" status="none" onClick={() => {}} /></MenuList>);
    const b = screen.getByRole('button', { name: '정보 수정' }); expect(b.textContent).not.toMatch(/무료|열림|광고|준비/);
  });
  it('상태 문구 상수가 화면 문구와 같아요', () => { expect(STATUS_LABEL).toEqual({ locked: '광고 보고 열기', open: '열림', free: '무료', busy: '준비 중' }); });
});

describe('이어서 보기(하단 메뉴)도 같은 카드예요', () => {
  it('오늘 화면 아래에 카드 목록이 나오고 현재 화면 항목은 빠져요', async () => {
    await home(); await act(async () => { fireEvent.click(menuButton('오늘의 운세풀이 · 광고 보고 열기')); });
    const list = await screen.findByRole('list', { name: '이어서 볼 메뉴' }); const names = within(list).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['신년운 · 광고 보고 열기', '나의 총운 · 운명풀이 · 광고 보고 열기', '택일 · 광고 보고 열기', '궁합 보기 · 무료', '내 결과로 돌아가기']);
  });
});
