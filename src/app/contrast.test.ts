import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// 가시성 기준: WCAG 2.x 대비. 본문 글자 4.5 이상, 큰 글자·아이콘·그래픽 3.0 이상.
const lum = (hex: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const css = readFileSync('src/index.css', 'utf8');
const mix = (fg: string, bg: string, a: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * a + parseInt(bg.slice(i, i + 2), 16) * (1 - a)).toString(16).padStart(2, '0')).join('');

// [설명, 글자/그래픽 색, 배경 색, 최소 대비]. CSS에 이 색이 실제로 쓰였는지도 같이 확인해서 테스트와 CSS가 어긋나지 않게 해요.
const PAIRS: [string, string, string, number][] = [
  ['별(밝은 바탕)', '#a86400', '#ffffff', 3],
  ['히어로 흰 글자/쪽빛', '#ffffff', '#1b2d6b', 4.5], ['히어로 흰 글자/남색', '#ffffff', '#101a45', 4.5],
  ['히어로 금색/쪽빛', '#f3d58a', '#1b2d6b', 4.5], ['히어로 금색/남색', '#f3d58a', '#101a45', 4.5],
  ['막대 금(hi)/트랙', '#b26a00', '#e5e8eb', 3], ['막대 파랑(mid)/트랙', '#1b64da', '#e5e8eb', 3], ['막대 회색(lo)/트랙', '#6b7684', '#e5e8eb', 3],
  ['알약 광고', '#8a5a00', '#fdf0d5', 4.5], ['알약 열림', '#17703f', '#dff3e6', 4.5], ['알약 무료', '#4e5968', '#e5e8eb', 4.5], ['알약 준비중', '#1b64da', '#e1ecfe', 4.5],
  ['아이콘 gold', '#8a5a00', '#fdf0d5', 3], ['아이콘 blue', '#1b64da', '#e1ecfe', 3], ['아이콘 indigo', '#3a3fa6', '#e6e8fb', 3], ['아이콘 green', '#17703f', '#dff3e6', 3],
  ['아이콘 coral', '#a8321f', '#fde4e1', 3], ['아이콘 teal', '#0b6760', '#d9f2f0', 3], ['아이콘 slate', '#4e5968', '#e5e8eb', 3], ['아이콘 violet', '#6232b0', '#eee6fb', 3],
  ['판정 잘 맞음 글자/흰 바탕', '#17703f', '#ffffff', 4.5], ['판정 무난 글자/흰 바탕', '#4e5968', '#ffffff', 4.5], ['판정 긴장 글자/흰 바탕', '#a8321f', '#ffffff', 4.5],
  ['판정 막대 잘 맞음/흰 바탕', '#17703f', '#ffffff', 3], ['판정 막대 긴장/흰 바탕', '#c0392b', '#ffffff', 3], ['판정 막대 무난/흰 바탕', '#8b95a1', '#ffffff', 3],
  ['보조 글자 .note', '#6b7684', '#ffffff', 4.5],
  ['히어로 종합운 카드 안 흰 글자(흰 8% 덮은 쪽빛)', '#ffffff', mix('#ffffff', '#1b2d6b', 0.08), 4.5],
  ['히어로 태그 금색(금 22% 덮은 쪽빛)', '#f3d58a', mix('#f3d58a', '#1b2d6b', 0.22), 4.5],
];

describe('색 대비(가시성)', () => {
  for (const [name, fg, bg, min] of PAIRS) {
    it(`${name}: ${fg} / ${bg} ≥ ${min}`, () => { expect(ratio(fg, bg), `${ratio(fg, bg).toFixed(2)}`).toBeGreaterThanOrEqual(min); });
  }
  it('테스트가 확인한 색이 CSS에 실제로 쓰이고 있어요(둘이 어긋나면 알려줘요)', () => {
    const must = ['#a86400', '#1b2d6b', '#101a45', '#f3d58a', '#b26a00', '#8a5a00', '#fdf0d5', '#17703f', '#dff3e6', '#4e5968', '#e5e8eb', '#1b64da', '#e1ecfe', '#3a3fa6', '#a8321f', '#0b6760', '#6232b0', '#c0392b', '#8b95a1'];
    for (const c of must) expect(css.toLowerCase(), c).toContain(c);
  });
  it('옛 별 색(#d69a2d, 흰 바탕 대비 2.46)은 .stars에 더 이상 쓰이지 않아요', () => {
    expect(css).not.toMatch(/\.stars\s*\{[^}]*#d69a2d/); expect(ratio('#d69a2d', '#ffffff')).toBeLessThan(3);
  });
});

describe('움직임과 클래스 이름', () => {
  it('움직임 줄이기 설정에서 히어로·막대 애니메이션을 끄는 규칙이 있어요', () => {
    const m = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([^}]*(?:\}[^}]*)?)\}/); expect(m, '규칙 없음').toBeTruthy();
    for (const sel of ['.hero2', '.barTrack i', '.verdictBar i']) expect(m![0]).toContain(sel); expect(m![0]).toContain('animation: none');
  });
  it('애니메이션은 transform·opacity만 써요(레이아웃을 흔들지 않게)', () => {
    for (const name of ['barGrow', 'heroIn']) { const k = css.match(new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\}\\s*\\}`))?.[1] ?? ''; expect(k, name).toMatch(/transform|opacity/); expect(k, name).not.toMatch(/width|height|top|left|margin/); }
  });
  it('같은 클래스 이름을 서로 다른 레이아웃으로 두 번 정의하지 않아요(.bars 충돌 재발 방지)', () => {
    // 최상위 단일 클래스 규칙(.name { … })만 모아서, 같은 이름이 display를 서로 다르게 정의하면 실패
    const defs = new Map<string, Set<string>>();
    for (const m of css.matchAll(/(?:^|\n)\.([A-Za-z][\w-]*)\s*\{([^}]*)\}/g)) { const d = m[2].match(/display:\s*([\w-]+)/)?.[1]; if (d) (defs.get(m[1]) ?? defs.set(m[1], new Set()).get(m[1])!).add(d); }
    const clash = [...defs].filter(([, v]) => v.size > 1).map(([k, v]) => `${k}: ${[...v].join(' vs ')}`);
    expect(clash, clash.join(' | ')).toEqual([]);
    // 십성 분포(.bars)와 새 운 막대(.fortuneBars)는 서로 다른 이름이에요
    expect(css).toMatch(/\.fortuneBars\s*\{/); expect(css).toMatch(/\n\.bars\s*\{[^}]*display:\s*flex/);
  });
});
