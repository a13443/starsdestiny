import { describe, it, expect } from 'vitest';
import { expectSane } from './test-utils';

describe('깨진 문장 검사기 자체 검증', () => {
  const mount = (html: string) => { document.body.innerHTML = html; };
  it('정상 문장과 요소 경계(요. 다음 요소가 이로 시작)는 통과', () => {
    mount('<p>흐름이에요.</p><h2>이 조합으로 더 보기</h2><p>좋아요. 이 시기에는 쉬어요.</p>');
    expect(() => expectSane()).not.toThrow();
  });
  it('원래 버그 패턴(완성된 문장 뒤에 조사가 붙음)을 잡아요', () => {
    mount('<p class="sub">4개 체계 중 1개(사주)가 좋은 방향을 가리키고, 나머지는 특별한 신호가 없어요.가 같은 방향이에요.</p>');
    expect(() => expectSane()).toThrow(/조사가 문장 부호 뒤에 붙음/);
  });
  it('빈 값·템플릿 잔여를 잡아요', () => {
    for (const bad of ['<p>점수는 undefined예요</p>', '<p>NaN점</p>', '<li>[object Object]</li>', '<p>{name}님</p>', '<p>‘’ 기운</p>']) { mount(bad); expect(() => expectSane(), bad).toThrow(); }
  });
});
