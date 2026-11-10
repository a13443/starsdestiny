// 실제 브라우저(Playwright)에서 레이아웃을 재는 검사. jsdom은 레이아웃을 계산하지 않아서 이런 문제를 못 잡아요.
// 사용법: 앱을 빌드하고 `npx vite preview --port 4173`로 띄운 뒤 `node scripts/layout-check.cjs`
// Playwright가 프로젝트 의존성에 없어서 경로를 환경변수로 받아요: PLAYWRIGHT_PATH=/path/to/node_modules/playwright
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const URL_BASE = process.env.APP_URL || 'http://127.0.0.1:4173/';
const fails = []; const ok = (cond, msg) => { if (!cond) fails.push(msg); console.log((cond ? 'ok   ' : 'FAIL ') + msg); };
(async () => {
  const b = await chromium.launch();
  for (const [w, label] of [[390, '390px'], [320, '320px(좁은 폰)']]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 800 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL_BASE, { waitUntil: 'networkidle' });
    await p.selectOption('select[aria-label="태어난 해"]', '1995'); await p.selectOption('select[aria-label="태어난 달"]', '5'); await p.selectOption('select[aria-label="태어난 날"]', '12');
    await p.getByText('여', { exact: true }).click(); await p.getByText('결과 보기').click(); await p.waitForSelector('svg.ring'); await p.waitForTimeout(900);
    const measure = (sel) => p.evaluate((s) => [...document.querySelectorAll(s)].map((el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, h: r.height }; }), sel);
    // 1) 홈: 히어로가 있고 가로로 넘치지 않음, 메뉴 카드끼리 겹치지 않음
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `[${label}] 홈 가로 넘침 없음`);
    const hero = (await measure('.hero2'))[0]; ok(hero && hero.h > 100 && hero.right <= w + 1, `[${label}] 홈 히어로 높이 ${Math.round(hero ? hero.h : 0)}px`);
    const cards = await measure('ul.menuList > li'); let overlap = 0; for (let i = 1; i < cards.length; i++) overlap += Math.max(0, cards[i - 1].bottom - cards[i].top);
    ok(cards.length === 9 && overlap <= 0.5, `[${label}] 메뉴 카드 ${cards.length}개, 겹침 합 ${overlap.toFixed(1)}px`);
    ok(cards.every((c) => c.h >= 64), `[${label}] 메뉴 카드 최소 높이 64px 이상(가장 작은 ${Math.round(Math.min(...cards.map((c) => c.h)))}px)`);
    // 2) 오늘 풀이: 막대 목록이 자식 행을 감싸는지(이번에 겪은 .bars 높이 고정 같은 붕괴 방지)
    await p.getByRole('button', { name: '오늘의 운세풀이 · 광고 보고 열기' }).click(); await p.waitForTimeout(1500);
    const ul = (await measure('ul.fortuneBars'))[0], rows = await measure('ul.fortuneBars > li'), card = (await measure('article.barsCard'))[0];
    const need = rows.reduce((s, r) => s + r.h, 0) + 12 * (rows.length - 1);
    ok(rows.length === 5 && ul && ul.h >= need - 2, `[${label}] 막대 목록 높이 ${Math.round(ul ? ul.h : 0)}px ≥ 행 합계 ${Math.round(need)}px`);
    ok(card && ul && card.h >= ul.h && rows.every((r) => r.bottom <= card.bottom + 0.5), `[${label}] 막대 카드가 모든 행을 감쌈`);
    ok(rows.every((r, i) => i === 0 || r.top >= rows[i - 1].bottom - 0.5), `[${label}] 막대 행끼리 겹침 없음`);
    const trackFill = await p.evaluate(() => [...document.querySelectorAll('ul.fortuneBars .barTrack')].map((t) => ({ w: t.getBoundingClientRect().width, f: t.querySelector('i').getBoundingClientRect().width })));
    ok(trackFill.every((t) => t.w > 60 && t.f > 0 && t.f <= t.w + 0.5), `[${label}] 막대 트랙 폭 ${Math.round(Math.min(...trackFill.map((t) => t.w)))}px 이상, 채움이 트랙을 넘지 않음`);
    // 3) 오늘 히어로가 다음 제목과 겹치지 않음
    const h2s = await p.evaluate(() => [...document.querySelectorAll('h2')].map((h) => { const r = h.getBoundingClientRect(); return { t: h.textContent, top: r.top + scrollY, bottom: r.bottom + scrollY }; }));
    const todayHero = (await measure('.todayHero'))[0]; ok(todayHero && h2s.every((h) => h.bottom <= todayHero.top || h.top >= todayHero.bottom), `[${label}] 오늘 히어로와 제목이 겹치지 않음`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `[${label}] 오늘 화면 가로 넘침 없음`);
    ok(errs.length === 0, `[${label}] 콘솔 오류 없음 ${JSON.stringify(errs)}`);
    await p.close();
  }
  await b.close(); console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
