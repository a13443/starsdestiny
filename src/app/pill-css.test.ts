import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// 알약 색은 TDS Badge가 인라인 스타일(var(--t…BadgeBackground))로 박아 두고 그 변수가 없는 환경에서는 투명해져요.
// 인라인보다 우선하려면 !important가 필요해서, 상태별 색 규칙과 !important가 모두 있는지 CSS 파일로 확인해요.
describe('알약 색 CSS', () => {
  const css = readFileSync('src/index.css', 'utf8');
  const rule = (cls: string) => css.match(new RegExp(`\\.${cls}\\s+\\[data-tds-mobile-component="Badge"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  const colors: Record<string, [string, string]> = { 'pill-locked': ['#fdf0d5', '#8a5a00'], 'pill-open': ['#dff3e6', '#17703f'], 'pill-free': ['#e5e8eb', '#4e5968'], 'pill-busy': ['#e1ecfe', '#1b64da'] };
  for (const [cls, [bg, fg]] of Object.entries(colors)) {
    it(`${cls}: 배경 ${bg}, 글자 ${fg}, 둘 다 !important`, () => {
      const r = rule(cls); expect(r, '규칙이 없어요').not.toBe('');
      expect(r).toMatch(new RegExp(`background-color:\\s*${bg}\\s*!important`)); expect(r).toMatch(new RegExp(`color:\\s*${fg}\\s*!important`));
    });
  }
  it('네 상태의 배경색이 모두 달라요(구분이 되어야 해서)', () => {
    const bgs = Object.keys(colors).map((c) => rule(c).match(/background-color:\s*(#[0-9a-f]{6})/)![1]); expect(new Set(bgs).size).toBe(4);
  });
  it('알약 모양(둥근 모서리·여백)은 공통 규칙에 있어요', () => { expect(css).toMatch(/\.pill \[data-tds-mobile-component="Badge"\]\s*\{[^}]*border-radius:\s*999px/); });
});
