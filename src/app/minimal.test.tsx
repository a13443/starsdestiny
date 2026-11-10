import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { AppProvider } from './AppProvider';
import { expectSane, menuButton } from '../test-utils';
import type { Sdk } from '../platform';

function makeSdk(form: Record<string, unknown>) {
  const store = new Map<string, string>([['profile:v1', JSON.stringify(form)]]);
  return { store, sdk: { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async () => {} },
    loadFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }), showFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }), // 광고 미지원 = 바로 열림
    Share: { createLink: async () => 'x' }, share: async () => {}, Analytics: { log: async () => {} }, graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk };
}
const BASE = { y: 1995, m: 5, d: 12, cal: 'solar', leap: false, hh: '', mm: '', region: '', city: '' };
const PRESETS: [string, Record<string, unknown>][] = [
  ['생년월일만(성별·시간·출생지 없음)', { ...BASE, gender: null }],
  ['성별만', { ...BASE, gender: 'F' }],
  ['시간+출생지(성별 없음)', { ...BASE, gender: null, hh: 14, mm: 30, region: '제주', city: '제주시' }],
  ['전부 입력', { ...BASE, gender: 'M', hh: 7, mm: 5, region: '서울', city: '강남구' }],
];
const ERR = '잠시 문제가 생겼어요';
beforeEach(() => cleanup());

describe('입력 조합별로 모든 화면이 크래시 없이 열려요', () => {
  for (const [label, form] of PRESETS) {
    it(label, async () => {
      const f = makeSdk(form); render(<App sdk={f.sdk} hosted={false} />);
      await screen.findByRole('img', { name: '체계별 기운 분포' }); expect(screen.queryByText(ERR)).toBeNull(); expectSane();
      for (const title of ['오늘의 운세풀이', '신년운', '나의 총운 · 운명풀이', '택일']) {
        await act(async () => { fireEvent.click(menuButton(new RegExp(`^${title} · (광고 보고 열기|열림)$`))); });
        await screen.findByText('이어서 보기');
        expect(screen.queryByText(ERR), `${title} 화면이 오류 화면이 됨`).toBeNull(); expectSane();
        await act(async () => { fireEvent.click(screen.getByText('내 결과로 돌아가기')); });
        await screen.findByRole('img', { name: '체계별 기운 분포' });
      }
      await act(async () => { fireEvent.click(menuButton('궁합 보기 · 무료')); });
      for (const [l, v] of [['상대가 태어난 해', '1993'], ['상대가 태어난 달', '8'], ['상대가 태어난 날', '3']]) fireEvent.change(screen.getByLabelText(l), { target: { value: v } });
      await act(async () => { fireEvent.click(screen.getByText('궁합 결과 보기')); });
      await screen.findByText('두 사람의 데이터'); expect(screen.queryByText(ERR)).toBeNull(); expectSane();
    });
  }
  it('성별이 없으면 총운의 대운은 잠금 카드, 있으면 타임라인이 나와요', async () => {
    for (const [form, locked] of [[PRESETS[0][1], true], [PRESETS[1][1], false]] as const) {
      cleanup(); const f = makeSdk(form); render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' });
      await act(async () => { fireEvent.click(menuButton('나의 총운 · 운명풀이 · 광고 보고 열기')); }); await screen.findByText('분야별 풀이, 자세히');
      expect(document.querySelectorAll('section.sys.locked').length).toBe(locked ? 1 : 0);
      expect(document.querySelectorAll('ul.timeline > li').length).toBe(locked ? 0 : 9);
      if (locked) expect(document.body.textContent).toContain('성별을 선택하면 열려요. 대운의 순행·역행 방향이');
    }
  });
});

describe('오류 경계', () => {
  const Boom = () => { throw new Error('테스트용 오류'); };
  it('화면이 예외를 던져도 흰 화면이 되지 않고, 버튼으로 복구해요', async () => {
    const origErr = console.error; console.error = () => {}; // 예상된 오류 로그 억제
    let resets = 0;
    try {
      const { rerender } = render(<AppProvider hosted={false}><ErrorBoundary resetKey="a" onReset={() => { resets++; }}><Boom /></ErrorBoundary></AppProvider>);
      expect(screen.getByRole('alert').textContent).toContain(ERR);
      expect(screen.getByText('처음 화면에서 다시 시도해 주세요.', { exact: false })).toBeTruthy();
      await act(async () => { fireEvent.click(screen.getByText('처음 화면으로')); }); expect(resets).toBe(1);
      rerender(<AppProvider hosted={false}><ErrorBoundary resetKey="b" onReset={() => {}}><p>정상 화면</p></ErrorBoundary></AppProvider>); // 화면이 바뀌면(resetKey) 다시 시도해요
      expect(screen.getByText('정상 화면')).toBeTruthy(); expect(screen.queryByRole('alert')).toBeNull();
    } finally { console.error = origErr; }
  });
});
