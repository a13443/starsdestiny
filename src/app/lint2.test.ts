import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// 접는 카드(details)는 눌러서 펼칠 수 있다는 시각 단서(화살표)가 있어야 해요. CSS에서 확인해요.
describe('화면 CSS 규칙', () => {
  const css = readFileSync('src/index.css', 'utf8');
  it('대운 타임라인의 summary에는 펼침 표시(::after)와 열린 상태 회전이 있어요', () => {
    expect(css).toMatch(/\.timeline summary::after\s*\{[^}]*border-right/);
    expect(css).toMatch(/\.timeline details\[open\]\s*>\s*summary::after\s*\{[^}]*rotate\(-135deg\)/);
  });
});
