import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { APP_NAME, APP_TITLE } from './brand';

describe('앱 이름', () => {
  it('앱 이름은 별사주예요(콘솔의 앱 이름과 같게 맞출 것). 이름이 바뀌면 이 값과 일부 테스트 문구(정규식)를 같이 바꿔요', () => {
    expect(APP_TITLE).toBe('별사주');
    expect(APP_TITLE).not.toMatch(/겹쳐보기/);
  });

  it('appName은 콘솔 설정 파일과 같아야 해요(어긋나면 공유 링크가 안 열려요)', () => {
    const cfg = readFileSync('apps-in-toss.config.ts', 'utf8');
    const m = cfg.match(/appName:\s*'([^']+)'/);
    expect(m, 'config에서 appName을 못 찾음').toBeTruthy();
    expect(m![1]).toBe(APP_NAME);
    expect(APP_NAME).toMatch(/^[a-z][a-z0-9-]*$/); // 소문자·숫자·하이픈(제가 확인한 형식이 아니라 안전한 쪽으로 제한한 거예요)
  });
});
