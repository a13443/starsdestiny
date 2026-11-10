import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';
import { expectSane, menuButton } from '../test-utils';

beforeEach(() => { cleanup(); localStorage.clear(); });
function fillBirth(y: number, m: number, d: number) {
  fireEvent.change(screen.getByLabelText('태어난 해'), { target: { value: String(y) } });
  fireEvent.change(screen.getByLabelText('태어난 달'), { target: { value: String(m) } });
  fireEvent.change(screen.getByLabelText('태어난 날'), { target: { value: String(d) } });
}

describe('앱 흐름(일반 브라우저 = 개발 모드)', () => {
  it('입력 → 홈 → 광고 게이트 → 오늘의 운세풀이(5개 분야) → 같은 날 재방문은 열린 상태', async () => {
    const { unmount } = render(<App />);
    await screen.findByText('여섯 가지 운세가 같은 말을 할까요?');
    fillBirth(1995, 5, 12);
    fireEvent.click(screen.getByText('결과 보기'));
    await screen.findByRole('img', { name: '체계별 기운 분포' });
    expect(screen.getByText(/아래 풀이는 사주를 중심으로 하고/)).toBeTruthy();
    expect(document.querySelector('.aibadge')?.textContent).toBe('AI 작성 문구 포함');
    fireEvent.click(menuButton('오늘의 운세풀이 · 광고 보고 열기'));
    await screen.findByText('5가지 운, 자세히');
    expect(document.querySelectorAll('article.cat[aria-label$="운"]').length).toBeGreaterThanOrEqual(6); // 종합 운 + 5개 분야
    expect(screen.getByLabelText('종합 운')).toBeTruthy();
    expectSane();
    expect(document.body.textContent).toMatch(/재물운|연애운|사업운|학업운|컨디션운/);
    expect(document.body.textContent).toMatch(/★/);
    unmount();
    // 재방문: 저장된 프로필과 오늘의 잠금 해제 상태가 유지돼요.
    render(<App />);
    await screen.findByRole('img', { name: '체계별 기운 분포' });
    expect(menuButton('오늘의 운세풀이 · 열림')).toBeTruthy();
  });

  it('존재하지 않는 음력 날짜는 화면이 죽지 않고 안내 문구를 보여줘요', async () => {
    render(<App />);
    await screen.findByText('여섯 가지 운세가 같은 말을 할까요?');
    fireEvent.click(screen.getByLabelText('음력'));
    // 음력 30일이 없는 달을 찾을 때까지 월을 바꿔 가며 시도
    const monthSel = screen.getByLabelText('태어난 달') as HTMLSelectElement, daySel = screen.getByLabelText('태어난 날') as HTMLSelectElement;
    fireEvent.change(screen.getByLabelText('태어난 해'), { target: { value: '2023' } });
    let shown = false;
    for (let m = 1; m <= 12 && !shown; m++) {
      fireEvent.change(monthSel, { target: { value: String(m) } }); fireEvent.change(daySel, { target: { value: '30' } });
      fireEvent.click(screen.getByText('결과 보기'));
      await waitFor(() => {}, { timeout: 50 }).catch(() => {});
      shown = !!document.querySelector('[role="alert"]');
      if (!shown && screen.queryByRole('img', { name: '체계별 기운 분포' })) break;
    }
    expect(shown).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('존재하지 않는 음력 날짜');
    expect(screen.getByText('결과 보기')).toBeTruthy(); // 입력 화면 유지
  });
});
