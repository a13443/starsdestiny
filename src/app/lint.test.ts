import { describe, it, expect } from 'vitest';
// 이 파일은 Node 파일 API를 쓰는 소스 검사 테스트라 앱 타입 검사(tsconfig.app.json)에서 제외돼 있고, vitest로만 실행돼요.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk('src/app').filter((f) => f.endsWith('.tsx'));

describe('화면 코드 규칙(실제 화면에서 발견된 문제의 재발 방지)', () => {
  it('TDS Button의 color="light"·"dark"는 쓰지 않아요: weak 변형의 글자가 흰색이라 흰 페이지에서 보이지 않아요', () => {
    const bad = files.filter((f) => /color="(light|dark)"/.test(readFileSync(f, 'utf8')));
    expect(bad, `다음 파일에서 color="light|dark" 사용: ${bad.join(', ')}`).toEqual([]);
  });
  it('버튼은 TDS Button을 쓰고, 직접 만든 <button>은 두지 않아요(검수의 TDS 사용 기준)', () => {
    const bad = files.filter((f) => /<button[\s>]/.test(readFileSync(f, 'utf8')));
    expect(bad, `직접 만든 <button>: ${bad.join(', ')}`).toEqual([]);
  });
});
