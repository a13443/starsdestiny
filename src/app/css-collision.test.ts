import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// 새 시각 컴포넌트(visual.tsx)가 쓰는 클래스는 "v2 시각 개선" 블록에만 정의돼야 해요.
// 옛 블록에도 같은 이름이 있으면(예: 십성 분포의 .bars) 옛 규칙(height: 44px 등)이 새 컴포넌트에 섞여 레이아웃이 무너져요.
// 이 문제는 jsdom이 레이아웃을 계산하지 않아서 렌더 테스트로는 못 잡고, 정의 위치를 정적으로 검사해야 해요.
const css = readFileSync('src/index.css', 'utf8');
const marker = css.indexOf('v2 시각 개선');
const old = css.slice(0, marker), added = css.slice(marker);
const defs = (t: string) => new Set([...t.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
const used = (file: string) => {
  const src = readFileSync(file, 'utf8'); const out = new Set<string>();
  for (const m of src.matchAll(/className="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => out.add(c));
  for (const m of src.matchAll(/className=\{`([^`]+)`\}/g)) m[1].replace(/\$\{[^}]*\}/g, ' ').split(/[^\w-]+/).filter(Boolean).forEach((c) => out.add(c));
  return out;
};
// 의도적으로 옛 규칙과 함께 쓰는 공용 클래스(색·크기만 덮어써요)
const SHARED = new Set(['stars', 'cat', 'ico', 'tags', 'tag', 'open', 'h1', 'lvl', 'catHead', 'note', 'strong', 'menuCard', 'menuIcon', 'pill']);
// 스타일 없이 구조·구분용으로만 붙이는 클래스(테스트·화면 구분용). 정의가 없어도 되지만, 오타는 계속 잡히도록 이름으로 명시해요.
const STRUCTURAL = new Set(['barsCard', 'verdict']);

describe('CSS 클래스 이름 충돌 방지', () => {
  it('새 블록이 있고 옛 블록 뒤에 와요', () => { expect(marker).toBeGreaterThan(1000); expect(old.length).toBeGreaterThan(added.length / 3); });
  it('visual.tsx의 클래스는 공용 클래스를 빼면 옛 CSS 블록에 정의돼 있지 않아요', () => {
    const oldDefs = defs(old); const clash = [...used('src/app/visual.tsx')].filter((c) => !SHARED.has(c) && oldDefs.has(c));
    expect(clash, `옛 규칙과 겹치는 클래스: ${clash.join(', ')}`).toEqual([]);
  });
  it('visual.tsx가 쓰는 비공용 클래스는 모두 새 블록에 정의돼 있어요(정의 없는 클래스 방지)', () => {
    const addDefs = defs(added); const used2 = [...used('src/app/visual.tsx')].filter((c) => !SHARED.has(c) && !/^(tone|lg|vb|pillar)/.test(c) || addDefs.has(c));
    const missing = [...used('src/app/visual.tsx')].filter((c) => !SHARED.has(c) && !STRUCTURAL.has(c) && !addDefs.has(c) && !/^tone-/.test(c));
    expect(missing, `새 블록에 정의가 없는 클래스: ${missing.join(', ')}`).toEqual([]); expect(used2.length).toBeGreaterThan(10);
  });
  it('옛 십성 분포의 .bars 규칙은 그대로 있고, 새 운 막대는 다른 이름(.fortuneBars)이에요', () => {
    expect(old).toMatch(/\.bars\s*\{[^}]*height:\s*44px/); expect(defs(added).has('bars')).toBe(false); expect(defs(added).has('fortuneBars')).toBe(true);
    expect(readFileSync('src/app/visual.tsx', 'utf8')).toContain('className="fortuneBars"'); expect(readFileSync('src/app/visual.tsx', 'utf8')).not.toMatch(/className="bars"/);
  });
});
