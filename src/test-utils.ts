import { expect } from 'vitest';

export const BROKEN_JOSA = /[.!?](가|이|은|는|을|를|의|도|만)(\s|$)/;
export const BROKEN_VALUE = /undefined|NaN|\[object|\bnull\b|\{[a-zA-Z]+\}|\(\)|‘’|“”/;

/** 깨진 문장·빈 값 검사. textContent는 인접 요소를 공백 없이 이어 붙이므로, 문장이 담기는 요소를 하나씩 검사해요. */
export function expectSane(root: ParentNode = document.body) {
  // 문장은 한 요소 안에서 깨지므로 요소별로 검사해요. 다른 문장 요소를 품은 컨테이너(li 안에 p가 있는 경우 등)는 자식이 따로 검사되므로 건너뛰어요.
  const SENT = 'p, li, h1, h2, h3, td, dd, dt, summary, button, label';
  const nodes = [...root.querySelectorAll(SENT)].filter((n) => !n.querySelector(SENT.replace(', label', '')));
  expect(nodes.length).toBeGreaterThan(0);
  for (const n of nodes) {
    const t = n.textContent ?? '';
    expect(BROKEN_VALUE.test(t), `빈 값/템플릿 잔여: "${t.slice(0, 80)}"`).toBe(false);
    expect(BROKEN_JOSA.test(t), `조사가 문장 부호 뒤에 붙음: "${t.slice(0, 120)}"`).toBe(false);
  }
}

import { screen as _screen } from '@testing-library/react';
/** 메뉴 카드는 role=button + aria-label(`제목 · 상태`)이라 이름으로 찾고, 그 외는 글자로 찾아요. */
export const pressable = (t: string | RegExp): HTMLElement => _screen.queryByRole('button', { name: t }) ?? _screen.getByText(t);
export const menuButton = (name: string | RegExp): HTMLElement => _screen.getByRole('button', { name });
