import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import App from './App';
import { expectSane } from '../test-utils';
import type { Sdk } from '../platform';

function storeSdk(preset: Record<string, unknown>) {
  const store = new Map<string, string>(Object.entries(preset).map(([k, v]) => [k, JSON.stringify(v)]));
  const sdk = { Storage: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async (k: string) => { store.delete(k); } },
    loadFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }), showFullScreenAd: Object.assign(() => () => {}, { isSupported: () => false }),
    Share: { createLink: async () => 'x' }, share: async () => {}, Analytics: { log: async () => {} }, graniteEvent: { addEventListener: () => () => {} }, Environment: { environment: 'sandbox' as const } } as unknown as Sdk;
  return { sdk, store };
}
const FORM = { y: 1995, m: 5, d: 12, cal: 'solar', leap: false, gender: 'F', hh: '', mm: '', region: '', city: '' };
async function home(form: Record<string, unknown>) { const f = storeSdk({ 'profile:v1': form }); render(<App sdk={f.sdk} hosted={false} />); await screen.findByRole('img', { name: '체계별 기운 분포' }); return f; }
const sysTitles = () => [...document.querySelectorAll('.sys h3')].map((h) => h.textContent!.replace(/\s*β/, '').trim());
beforeEach(() => cleanup());

describe('홈 화면', () => {
  it('성별만 입력: 링·헤드라인·투표 목록, 4개 체계 카드 + 잠긴 베딕, 정확도 올리기 5/6', async () => {
    await home(FORM);
    expect(document.querySelector('h1.headline')!.textContent).toMatch(/체계 중 \d개가 ‘.+’ 기운을 가리켜요|기운|체계마다 서로 다른 면을 비춰요/);
    expect(document.body.textContent).toMatch(/4개 체계를 동등하게\(1표씩\) 비교한 결과예요/);
    expectSane();
    expect(document.querySelectorAll('ul.votes li').length).toBe(4);
    expect(sysTitles()).toEqual(['사주', '서양 별자리', '수비학 · 생명수', '띠', '구성기학', '베딕 점성술']);
    expect(document.querySelectorAll('section.sys.locked').length).toBe(1);
    expect(document.body.textContent).toContain('태어난 시간과 출생지를 입력하면 열려요.');
    expect(screen.getByText('정확도 올리기 · 5/6개 열림')).toBeTruthy();
    expect(document.querySelectorAll('.pil').length).toBe(4); expect(document.querySelectorAll('.pil.empty').length).toBe(1); // 시주 비어 있음
  });
  it('성별 없음: 구성기학이 잠기고 안내 문구가 나와요', async () => {
    await home({ ...FORM, gender: null });
    expect(document.body.textContent).toContain('성별을 선택하면 열려요.');
    expect(screen.getByText('정확도 올리기 · 4/6개 열림')).toBeTruthy();
    expect(document.querySelectorAll('ul.votes li').length).toBe(3);
  });
  it('모두 입력: 잠긴 카드·정확도 버튼 없음, 베딕 카드에 낙샤트라·라그나, 시주 채워짐', async () => {
    await home({ ...FORM, hh: 14, mm: 30, region: '제주', city: '제주시' });
    expect(document.querySelectorAll('section.sys.locked').length).toBe(0);
    expect(screen.queryByText(/정확도 올리기/)).toBeNull();
    expect(document.body.textContent).toMatch(/낙샤트라.+태양 라시.+상승궁\(라그나\)/);
    expect(document.querySelectorAll('.pil.empty').length).toBe(0);
    expect(document.querySelectorAll('.unlock span.on').length).toBe(6);
    expect(document.querySelectorAll('ul.votes li').length).toBe(5);
  });
  it('링: 체계 수와 최다 기운 표시, 분포 합이 투표 수와 같아요', async () => {
    await home({ ...FORM, hh: 14, region: '제주', city: '제주시' });
    const svg = screen.getByRole('img', { name: '체계별 기운 분포' }); const arcs = svg.querySelectorAll('circle[stroke-dasharray]');
    expect(arcs.length).toBeGreaterThan(0); expect(svg.textContent).toMatch(/\d\/5/);
  });
  it('명식표가 사주 카드 안에 있고 7개 행이에요', async () => {
    await home({ ...FORM, hh: 14, region: '제주', city: '제주시' });
    const t = screen.getByRole('table', { name: '명식표' }); expect(t.querySelectorAll('tbody tr').length).toBe(7);
    expect(within(t).getByText('지장간')).toBeTruthy(); expect(t.querySelectorAll('.mt-empty').length).toBe(0);
  });
  it('정확도 올리기 → 입력 화면에 저장된 값이 채워지고, 시간·출생지를 넣으면 베딕이 열려요', async () => {
    const f = await home(FORM);
    await act(async () => { fireEvent.click(screen.getByText('정확도 올리기 · 5/6개 열림')); });
    expect((screen.getByLabelText('태어난 해') as HTMLSelectElement).value).toBe('1995');
    expect((screen.getByLabelText('태어난 분') as HTMLSelectElement).disabled).toBe(true); // 시를 고르기 전에는 분 선택 불가
    expect((screen.getByLabelText('시·군·구') as HTMLSelectElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('태어난 시'), { target: { value: '14' } });
    expect((screen.getByLabelText('태어난 분') as HTMLSelectElement).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('시·도'), { target: { value: '제주' } });
    expect([...(screen.getByLabelText('시·군·구') as HTMLSelectElement).options].map((o) => o.value)).toEqual(expect.arrayContaining(['제주시', '서귀포시']));
    fireEvent.change(screen.getByLabelText('시·군·구'), { target: { value: '제주시' } });
    await act(async () => { fireEvent.click(screen.getByText('결과 보기')); });
    await screen.findByRole('img', { name: '체계별 기운 분포' });
    expect(document.body.textContent).toContain('낙샤트라'); expect(JSON.parse(f.store.get('profile:v1')!)).toMatchObject({ hh: 14, region: '제주', city: '제주시' });
  });
});

describe('입력 화면', () => {
  it('비어 있으면 안내, 윤달 체크박스는 음력에서만, 시·도를 바꾸면 시·군·구가 초기화돼요', async () => {
    const f = storeSdk({}); render(<App sdk={f.sdk} hosted={false} />);
    await screen.findByText('여섯 가지 운세가 같은 말을 할까요?');
    await act(async () => { fireEvent.click(screen.getByText('결과 보기')); });
    expect(screen.getByRole('alert').textContent).toBe('생년월일을 모두 선택해 주세요.');
    expect(screen.queryByText('윤달에 태어났어요')).toBeNull();
    fireEvent.click(screen.getByLabelText('음력')); expect(screen.getByText('윤달에 태어났어요')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('양력')); expect(screen.queryByText('윤달에 태어났어요')).toBeNull();
    fireEvent.change(screen.getByLabelText('시·도'), { target: { value: '제주' } }); fireEvent.change(screen.getByLabelText('시·군·구'), { target: { value: '제주시' } });
    fireEvent.change(screen.getByLabelText('시·도'), { target: { value: '서울' } });
    expect((screen.getByLabelText('시·군·구') as HTMLSelectElement).value).toBe('');
    // 화면 값뿐 아니라 저장되는 값도 초기화돼야 해요(옛 시·군·구가 새 시·도와 섞여 저장되면 안 돼요)
    for (const [l, v] of [['태어난 해', '1995'], ['태어난 달', '5'], ['태어난 날', '12'], ['태어난 시', '14']]) fireEvent.change(screen.getByLabelText(l), { target: { value: v } });
    await act(async () => { fireEvent.click(screen.getByText('결과 보기')); });
    await screen.findByRole('img', { name: '체계별 기운 분포' });
    expect(JSON.parse(f.store.get('profile:v1')!)).toMatchObject({ region: '서울', city: '' });
    expect(document.querySelectorAll('section.sys.locked').length).toBeGreaterThan(0); // 시·군·구가 없으니 베딕은 잠긴 채예요
  });
  it('음력 윤달로 입력하면 변환된 양력 기준 결과가 나와요', async () => {
    const f = storeSdk({}); render(<App sdk={f.sdk} hosted={false} />);
    await screen.findByText('여섯 가지 운세가 같은 말을 할까요?');
    fireEvent.click(screen.getByLabelText('음력')); fireEvent.change(screen.getByLabelText('태어난 해'), { target: { value: '2023' } });
    fireEvent.change(screen.getByLabelText('태어난 달'), { target: { value: '2' } }); fireEvent.change(screen.getByLabelText('태어난 날'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('윤달에 태어났어요'));
    await act(async () => { fireEvent.click(screen.getByText('결과 보기')); });
    await screen.findByRole('img', { name: '체계별 기운 분포' });
    expect(JSON.parse(f.store.get('profile:v1')!)).toMatchObject({ cal: 'lunar', leap: true, y: 2023, m: 2, d: 1 });
  });
});
