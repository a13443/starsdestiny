// 겹쳐보기 운세 풀이 엔진 v0.2
// 규칙의 출처: 십성·합충형·신살·삼재·타라발라·다샤·손 없는 날은 대중적으로 쓰이는 표를 따랐고,
// 점수화(별 1~5)·카테고리 배분은 이 앱 자체의 해석 규칙이에요. (학파마다 다를 수 있어요)
import LJ from 'lunar-javascript';
import * as Astro from 'astronomy-engine';
import * as E from './engine.mjs';
import * as C from './cosmos.mjs';

const { Solar } = LJ;
const { GAN, GAN_KO, ZHI, ZHI_KO, GAN_EL, ZHI_EL, GEN, OVR, GZ60, SIGNS, SIGN_EL, EL, ANIMAL } = E;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// 한국어 조사: 마지막 한글 글자의 받침 유무로 선택
const hasBatchim = (w) => { const c = [...String(w)].reverse().find((ch) => /[가-힣]/.test(ch)); return c ? (c.charCodeAt(0) - 0xac00) % 28 !== 0 : false; };
export const gwa = (w) => (hasBatchim(w) ? '과' : '와');
export const iga = (w) => (hasBatchim(w) ? '이' : '가');
const zh = (i) => `${ZHI_KO[i]}(${ZHI[i]})`;
const norm360 = (x) => ((x % 360) + 360) % 360;
const KST = 9 * 3600e3;
const YEAR_MS = 365.25 * 86400000;

export const CATS = [
  { key: 'wealth', label: '재물운' },
  { key: 'love', label: '연애운' },
  { key: 'biz', label: '사업운' },
  { key: 'study', label: '학업운' },
  { key: 'cond', label: '컨디션운' }, // 의료 표현을 피하려고 '건강운' 대신 에너지·컨디션 관리로 표기
];
export const LEVEL_LABEL = { 1: '신중히', 2: '차분히', 3: '보통', 4: '좋음', 5: '아주 좋음' };

export const kstDate = (now) => { const k = new Date(now.getTime() + KST); return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate() }; };

/* ───────── 십성 ───────── */
export const TEN_GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
export const TG_GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
export function tenGod(dm, other) {
  const a = GAN_EL[dm], b = GAN_EL[other];
  const same = dm % 2 === other % 2;
  if (a === b) return same ? '비견' : '겁재';
  if (GEN[a] === b) return same ? '식신' : '상관';
  if (OVR[a] === b) return same ? '편재' : '정재';
  if (OVR[b] === a) return same ? '편관' : '정관';
  return same ? '편인' : '정인';
}
// 지지 본기(지장간의 중심 천간) 인덱스 — 巳午 등은 학파별 차이가 있어요
const ZHI_BONGI = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

// 이 앱의 해석 규칙: [재물, 사업, 학업, 컨디션]
const TG_EFFECT = {
  비견: [-1, 1, 0, 1], 겁재: [-1, 0, 0, 0], 식신: [1, 1, 1, 1], 상관: [1, 1, 1, -1], 편재: [1, 1, -1, 0],
  정재: [1, 0, -1, 1], 편관: [0, -1, 0, -1], 정관: [0, 1, 1, 0], 편인: [-1, 0, 1, 0], 정인: [0, 1, 1, 1],
};
const TG_LOVE = { M: { 편재: 1, 정재: 1, 겁재: -1 }, F: { 정관: 1, 편관: 1, 상관: -1 } };
const CAT_IDX = { wealth: 0, biz: 1, study: 2, cond: 3 };

const TG_REASON = {
  wealth: {
    비견: '나와 같은 기운이 들어와 돈이 새거나 나눠 쓰기 쉬운 흐름이에요.', 겁재: '경쟁과 지출 기운이 겹쳐 충동구매를 조심하면 좋아요.',
    식신: '표현한 만큼 결과가 따라와 수입 아이디어가 잘 나와요.', 상관: '재치와 말솜씨가 돈 이야기로 이어지기 좋아요.',
    편재: '활동 반경이 넓어져 새 수입 기회가 보여요.', 정재: '꾸준하고 실속 있는 재물 흐름이 들어와요.', 편인: '생각만 깊어지고 지출 결정은 미루기 쉬워요.',
  },
  biz: {
    비견: '동료·파트너와 손발이 잘 맞는 흐름이에요.', 식신: '아이디어가 결과물로 이어지기 좋아요.', 상관: '기획과 발표에서 존재감이 커져요.',
    편재: '영업과 거래처 확장에 힘이 실려요.', 편관: '압박과 평가가 따라와 일정을 넉넉히 잡는 게 좋아요.', 정관: '신뢰와 질서를 쌓기 좋아 협상·보고에 유리해요.',
    정인: '문서·계약 쪽에서 도움이 들어와요.',
  },
  study: {
    식신: '배운 걸 정리하고 표현하기 좋아요.', 상관: '창의적인 풀이와 발표가 잘돼요.', 편재: '바깥 일에 마음이 쏠려 책상 앞 집중이 흐트러지기 쉬워요.',
    정재: '일상 일정이 많아 공부 시간이 쪼개지기 쉬워요.', 정관: '규칙적인 학습과 시험 준비에 유리해요.', 편인: '깊이 파고드는 공부에 몰입이 잘돼요.',
    정인: '배움과 도움이 함께 들어오는 흐름이에요.',
  },
  cond: {
    비견: '내 페이스를 지키기 쉬워 컨디션이 안정돼요.', 식신: '마음이 느긋하고 먹고 쉬는 즐거움이 있는 흐름이에요.', 상관: '예민함이 올라가니 말과 수면 리듬을 챙겨요.',
    정재: '생활 리듬이 규칙적이라 몸이 편해요.', 편관: '긴장이 쌓이기 쉬우니 쉬는 시간을 미리 잡아요.', 정인: '마음이 편안하고 회복이 잘 되는 흐름이에요.',
  },
  love: {
    편재: '새로운 만남과 설렘이 열리기 쉬워요.', 정재: '안정적이고 다정한 관계 운이 들어와요.', 겁재: '비교와 경쟁 심리가 커져 감정이 흔들리기 쉬워요.',
    정관: '믿음직한 사람과 인연이 닿기 쉬워요.', 편관: '강한 끌림이 오지만 속도 조절이 필요해요.', 상관: '마음이 앞서 말이 거칠어질 수 있어요.',
  },
};
const TG_THEME = {
  비견: '내 페이스와 협업이 중심이 되는', 겁재: '경쟁과 지출에 신경 쓰게 되는', 식신: '표현과 결과물이 잘 나오는', 상관: '재치는 늘고 말은 앞서기 쉬운',
  편재: '활동 반경과 기회가 넓어지는', 정재: '꾸준한 실속을 챙기기 좋은', 편관: '책임과 압박이 따라오는', 정관: '신뢰와 질서를 쌓기 좋은',
  편인: '생각이 깊어지고 몰입하기 좋은', 정인: '도움과 배움이 들어오는',
};

/* ───────── 지지 관계 (육합·삼합·충·형) ───────── */
const HE6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const SAN_HE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]]; // 신자진 해묘미 인오술 사유축
const SAM_HYEONG = [[2, 5, 8], [1, 10, 7]]; // 인사신, 축술미
const ZA_HYEONG = [4, 6, 9, 11]; // 辰午酉亥 자형
export function branchTags(a, b) {
  const t = [];
  if (HE6.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) t.push('육합');
  else if (a !== b && SAN_HE.some((g) => g.includes(a) && g.includes(b))) t.push('삼합');
  if ((a - b + 12) % 12 === 6) t.push('충');
  if (a !== b && SAM_HYEONG.some((g) => g.includes(a) && g.includes(b))) t.push('형');
  else if ((a === 0 && b === 3) || (a === 3 && b === 0)) t.push('형');
  else if (a === b && ZA_HYEONG.includes(a)) t.push('자형');
  return t;
}
export const relScore = (tags) => (tags.some((x) => x === '육합' || x === '삼합') ? 1 : 0) - (tags.some((x) => x === '충' || x === '형' || x === '자형') ? 1 : 0);

/* ───────── 신살 (도화·역마·화개·천을귀인) ───────── */
const GROUP_OF = [0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1]; // 지지 → 삼합 그룹(0 신자진,1 해묘미,2 인오술,3 사유축)
const DOHWA = [9, 0, 3, 6];   // 酉 子 卯 午
const YEOKMA = [2, 5, 8, 11]; // 寅 巳 申 亥
const HWAGAE = [4, 7, 10, 1]; // 辰 未 戌 丑
const CHEON_EUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]]; // 일간 甲~癸 → 지지
const POS_KO = { year: '연지', month: '월지', day: '일지', time: '시지' };
export function sinsalOf(saju) {
  const P = saju.pillars;
  const zs = { year: P.year.zi, month: P.month.zi, day: P.day.zi, time: P.time ? P.time.zi : null };
  const out = [];
  const byGroup = (name, tbl) => {
    const targets = new Set(), where = new Set();
    for (const base of ['year', 'day']) {
      const t = tbl[GROUP_OF[zs[base]]]; targets.add(t);
      for (const pos of ['year', 'month', 'day', 'time']) if (pos !== base && zs[pos] === t) where.add(pos);
    }
    out.push({ key: name, targets: [...targets], where: [...where] });
  };
  byGroup('도화', DOHWA); byGroup('역마', YEOKMA); byGroup('화개', HWAGAE);
  const ct = CHEON_EUL[P.day.gi];
  out.push({ key: '천을귀인', targets: [...ct], where: ['year', 'month', 'day', 'time'].filter((pos) => zs[pos] !== null && ct.includes(zs[pos])) });
  return out.map((s) => ({ ...s, has: s.where.length > 0, whereKo: s.where.map((w) => POS_KO[w]) }));
}
const SINSAL_LINE = {
  도화: '매력과 인기의 기운(도화)이 있어요. 사람을 끄는 힘을 긍정적으로 쓰면 좋아요.',
  역마: '이동과 변화의 기운(역마)이 있어요. 새로운 환경과 출장·여행에서 활력을 얻어요.',
  화개: '예술·학문·사색의 기운(화개)이 있어요. 혼자 몰입하는 시간이 재능이 돼요.',
  천을귀인: '도움을 주는 귀인의 기운(천을귀인)이 있어요. 어려울 때 주변에 손을 내밀어 보세요.',
};
export { SINSAL_LINE };

/* ───────── 명식표(만세력): 십성 · 지장간 · 12운성 · 공망 · 절입 ───────── */
// 지장간(일반적으로 쓰는 표, 여기·중기·본기 순). 학파별 차이가 있어요. 마지막 글자가 본기예요.
export const JIJANGGAN = ['임계', '계신기', '무병갑', '갑을', '을계무', '무경병', '병기정', '정을기', '무임경', '경신', '신정무', '무갑임'];
export const UNSEONG = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
// 장생지: 양간은 寅申巳亥에서 순행, 음간은 子午卯酉에서 역행. 丙·戊는 寅, 丁·己는 酉(화토동궁)
const JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯
export function unseong(gan, zhi) {
  const st = JANGSAENG[gan];
  return UNSEONG[gan % 2 === 0 ? (zhi - st + 12) % 12 : (st - zhi + 12) % 12];
}
/** 공망: 일주가 속한 순(旬)에서 빠진 두 지지 */
export function gongmang(dayGan, dayZhi) {
  let idx = -1;
  for (let i = 0; i < 60; i++) if (i % 10 === dayGan && i % 12 === dayZhi) { idx = i; break; }
  const start = (idx - (idx % 10)) % 12;
  return [(start + 10) % 12, (start + 11) % 12];
}
function jieqiKstFull(js) {
  const sol = js.getSolar();
  const utc = Date.UTC(sol.getYear(), sol.getMonth() - 1, sol.getDay(), sol.getHour(), sol.getMinute(), sol.getSecond()) - 8 * 3600e3;
  const k = new Date(utc + KST);
  return { name: JQ_KO[js.getName()] || js.getName(), m: k.getUTCMonth() + 1, d: k.getUTCDate(), h: k.getUTCHours(), mi: k.getUTCMinutes() };
}
export function myeongsik(p) {
  const P = p.saju.pillars, dm = P.day.gi;
  const gm = gongmang(P.day.gi, P.day.zi);
  const col = (key, label, pl) => {
    if (!pl) return { key, label, empty: true };
    const jj = [...JIJANGGAN[pl.zi]].map((ch) => { const g = GAN_KO.indexOf(ch); return { hanja: GAN[g], ko: ch, el: GAN_EL[g], tg: tenGod(dm, g) }; });
    const isDay = key === 'day';
    return {
      key, label, gm: gm.includes(pl.zi),
      gan: { hanja: GAN[pl.gi], ko: GAN_KO[pl.gi], el: GAN_EL[pl.gi], tg: isDay ? '일간' : tenGod(dm, pl.gi) },
      zhi: { hanja: ZHI[pl.zi], ko: ZHI_KO[pl.zi], el: ZHI_EL[pl.zi], tg: tenGod(dm, ZHI_BONGI[pl.zi]) },
      jijanggan: jj, unseong: unseong(dm, pl.zi), unseongSame: unseong(pl.gi, pl.zi),
    };
  };
  const cols = [col('time', '시주', P.time), col('day', '일주', P.day), col('month', '월주', P.month), col('year', '연주', P.year)];
  let jeolib = null;
  if (p.birthUTC !== undefined) {
    try { jeolib = jieqiKstFull(Solar.fromYmdHms(...E.beijingParts(p.birthUTC)).getLunar().getPrevJieQi(true)); } catch (e) { jeolib = null; }
  }
  return { cols, gongmang: gm.map((z) => ({ hanja: ZHI[z], ko: ZHI_KO[z] })), gongmangWhere: cols.filter((c) => c.gm).map((c) => c.label), jeolib, dayMaster: { hanja: GAN[dm], ko: GAN_KO[dm] } };
}

/* ───────── 삼재 ───────── */
const SAMJAE = [[2, 3, 4], [5, 6, 7], [8, 9, 10], [11, 0, 1]]; // 신자진→인묘진, 해묘미→사오미, 인오술→신유술, 사유축→해자축
export function samjae(animalZhiIdx, year) {
  const g = GROUP_OF[animalZhiIdx];
  const yz = (((year - 4) % 12) + 12) % 12;
  const i = SAMJAE[g].indexOf(yz);
  return i < 0 ? null : { stage: ['들삼재', '눌삼재', '날삼재'][i], years: SAMJAE[g].map((z) => ZHI_KO[z] + '년') };
}

/* ───────── 한국 전통 달력 ───────── */
const JQ_KO = { 小寒: '소한', 大寒: '대한', 立春: '입춘', 雨水: '우수', 惊蛰: '경칩', 驚蟄: '경칩', 春分: '춘분', 清明: '청명', 谷雨: '곡우', 穀雨: '곡우', 立夏: '입하', 小满: '소만', 小滿: '소만', 芒种: '망종', 芒種: '망종', 夏至: '하지', 小暑: '소서', 大暑: '대서', 立秋: '입추', 处暑: '처서', 處暑: '처서', 白露: '백로', 秋分: '추분', 寒露: '한로', 霜降: '상강', 立冬: '입동', 小雪: '소설', 大雪: '대설', 冬至: '동지' };
export function isSonOps(y, m, d) { const day = Solar.fromYmd(y, m, d).getLunar().getDay(); return day % 10 === 9 || day % 10 === 0; }
function jieqiKst(js) { // 라이브러리의 절기 시각은 UTC+8 → 한국 날짜로
  const s = js.getSolar();
  const utc = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) - 8 * 3600e3;
  const k = new Date(utc + KST);
  return { name: JQ_KO[js.getName()] || js.getName(), m: k.getUTCMonth() + 1, d: k.getUTCDate() };
}
export function calendarInfo(y, m, d) {
  const lunar = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar();
  const lm = lunar.getMonth();
  return {
    lunar: { month: Math.abs(lm), leap: lm < 0, day: lunar.getDay() },
    sonOps: lunar.getDay() % 10 === 9 || lunar.getDay() % 10 === 0,
    prev: jieqiKst(lunar.getPrevJieQi(true)), next: jieqiKst(lunar.getNextJieQi(true)),
    pillar: lunar.getDayInGanZhi(),
  };
}

/* ───────── 천문: 달 · 역행 · 낙샤트라 ───────── */
const PHASES = ['신월(삭)', '초승달', '상현달', '차오르는 달', '보름달', '기우는 달', '하현달', '그믐달'];
export function isRetrograde(body, date) {
  const lon = (ms) => Astro.Ecliptic(Astro.GeoVector(body, Astro.MakeTime(new Date(ms)), true)).elon;
  const ms = date.getTime();
  const dl = ((lon(ms + 43200000) - lon(ms - 43200000) + 540) % 360) - 180;
  return dl < 0;
}
export function westernToday(date) {
  const t = Astro.MakeTime(date);
  const idx = Math.floor(norm360(Astro.EclipticGeoMoon(t).lon) / 30);
  const ph = Astro.MoonPhase(t);
  return {
    moonIdx: idx, moonSign: SIGNS[idx], moonEl: SIGN_EL[idx], phase: PHASES[Math.floor(((ph + 22.5) % 360) / 45)],
    mercuryRx: isRetrograde(Astro.Body.Mercury, date), venusRx: isRetrograde(Astro.Body.Venus, date),
  };
}
export const moonSidereal = (utcMs) => norm360(Astro.EclipticGeoMoon(Astro.MakeTime(new Date(utcMs))).lon - E.ayanamsaLahiri(utcMs));
const TARA = [null, ['Janma', '자신의 별', 0], ['Sampat', '풍요', 1], ['Vipat', '장애', -1], ['Kshema', '안녕', 1], ['Pratyari', '걸림돌', -1], ['Sadhaka', '성취', 1], ['Vadha', '소모', -1], ['Mitra', '우호', 1], ['Ati-Mitra', '큰 우호', 1]];
export function taraBala(birthNak, todayNak) {
  const count = ((todayNak - birthNak + 27) % 27) + 1;
  const n = ((count - 1) % 9) + 1;
  return { count, n, name: TARA[n][0], ko: TARA[n][1], good: TARA[n][2] };
}

/* ───────── 다샤 (빔쇼타리) ───────── */
const DASHA = [['Ketu', '케투', 7, '정리와 내려놓기, 내면 탐구'], ['Venus', '금성', 20, '사랑·즐거움·재물과 안락'], ['Sun', '태양', 6, '커리어·권위·존재감'],
  ['Moon', '달', 10, '감정·돌봄·마음의 안정'], ['Mars', '화성', 7, '에너지·도전·추진력'], ['Rahu', '라후', 18, '야망·변화·새로운 시도'],
  ['Jupiter', '목성', 16, '성장·확장·배움'], ['Saturn', '토성', 19, '인내·책임·꾸준함'], ['Mercury', '수성', 17, '지성·소통·사업 감각']];
export function dashaBalance(sidMoon) {
  const span = 360 / 27;
  const nIdx = Math.floor(sidMoon / span);
  const frac = (sidMoon - nIdx * span) / span;
  const lordIdx = nIdx % 9;
  const total = DASHA[lordIdx][2];
  return { nIdx, lordIdx, frac, total, remaining: total * (1 - frac), elapsed: total * frac };
}
export function mahadashas(birthUTC, sidMoon) {
  const b = dashaBalance(sidMoon);
  const out = [];
  let start = birthUTC - b.elapsed * YEAR_MS;
  for (let i = 0; i < 9; i++) {
    const li = (b.lordIdx + i) % 9;
    const end = start + DASHA[li][2] * YEAR_MS;
    out.push({ lordIdx: li, lord: DASHA[li][0], ko: DASHA[li][1], years: DASHA[li][2], theme: DASHA[li][3], start, end });
    start = end;
  }
  return out;
}
export function currentDasha(birthUTC, sidMoon, atMs) {
  const list = mahadashas(birthUTC, sidMoon);
  const maha = list.find((m) => atMs >= m.start && atMs < m.end) || list[list.length - 1];
  let s = maha.start, antar = null;
  for (let i = 0; i < 9; i++) {
    const li = (maha.lordIdx + i) % 9;
    const e = s + (maha.years * DASHA[li][2] / 120) * YEAR_MS;
    if (atMs >= s && atMs < e) { antar = { lordIdx: li, ko: DASHA[li][1], theme: DASHA[li][3], start: s, end: e }; break; }
    s = e;
  }
  return { maha, antar };
}

/* ───────── 수비학: 개인의 해·달·날 ───────── */
const ds = (n) => String(n).split('').reduce((a, c) => a + Number(c), 0);
const red9 = (n) => { while (n > 9) n = ds(n); return n; };
const PERSONAL_KEY = { 1: '시작과 주도', 2: '협력과 기다림', 3: '표현과 즐거움', 4: '기반과 정리', 5: '변화와 자유', 6: '돌봄과 책임', 7: '성찰과 공부', 8: '성과와 재물', 9: '마무리와 비움' };
const PERSONAL_CAT = { 1: 'biz', 2: 'love', 3: 'study', 4: 'wealth', 6: 'love', 7: 'study', 8: 'wealth' };
export function personalCycle(birthM, birthD, year, month, day) {
  const py = red9(ds(birthM) + ds(birthD) + ds(year));
  const pm = red9(py + ds(month));
  const pd = red9(pm + ds(day));
  return { py, pm, pd, keyPy: PERSONAL_KEY[py], keyPm: PERSONAL_KEY[pm], keyPd: PERSONAL_KEY[pd] };
}

/* ───────── 행운 (오행 기반) ───────── */
const ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
const LUCKY = {
  wood: { colors: ['초록', '연두', '청록'], dir: '동쪽', nums: [3, 8], items: ['작은 화분이나 식물', '나무 소재 펜·소품', '초록색 노트', '허브티', '면 소재 손수건', '대나무 텀블러'],
    outfits: ['초록 니트 + 베이지 팬츠, 포인트는 나무 소재 시계', '연두색 셔츠 + 연청 데님, 면 소재 에코백', '청록 가디건 + 흰 티, 우드 비즈 팔찌'] },
  fire: { colors: ['빨강', '주황', '코랄'], dir: '남쪽', nums: [2, 7], items: ['붉은 계열 립밤·립스틱', '향초나 따뜻한 조명', '따뜻한 음료 한 잔', '와인색 머플러', '주황색 포인트 소품', '핫팩 같은 온기 아이템'],
    outfits: ['코랄 블라우스 + 크림 슬랙스, 골드 귀걸이', '주황 포인트 스카프 + 블랙 재킷', '버건디 니트 + 아이보리 스커트, 따뜻한 톤 립'] },
  earth: { colors: ['베이지', '노랑', '황토'], dir: '중앙 (집이나 사무실 한가운데)', nums: [5, 10], items: ['도자기 머그잔', '베이지 톤 파우치', '꿀이나 곡물 간식', '가죽 키링', '정리용 바구니', '노란 포스트잇'],
    outfits: ['베이지 코트 + 갈색 로퍼, 가죽 소품', '머스터드 니트 + 아이보리 팬츠', '황토색 셔츠 + 연한 청바지, 도톰한 양말'] },
  metal: { colors: ['흰색', '은색', '회색'], dir: '서쪽', nums: [4, 9], items: ['은색 액세서리', '깔끔한 흰색 노트', '금속 텀블러', '정돈된 키링', '시계', '실버 펜'],
    outfits: ['화이트 셔츠 + 그레이 슬랙스, 실버 시계', '흰색 니트 + 연회색 스커트, 은색 목걸이', '그레이 재킷 + 화이트 팬츠, 메탈 프레임 안경'] },
  water: { colors: ['검정', '남색', '짙은 파랑'], dir: '북쪽', nums: [1, 6], items: ['물병과 충분한 물', '남색 파우치', '유리 소재 컵', '블랙 펜', '무선 이어폰', '짙은 색 다이어리'],
    outfits: ['네이비 재킷 + 흰 티, 블랙 스니커즈', '짙은 청바지 + 검정 니트, 유리 소재 액세서리', '남색 원피스 + 블랙 가디건, 은은한 진주 포인트'] },
};
export { LUCKY };
const HOUR_BY_EL = { wood: '인·묘시(03~07시)', fire: '사·오시(09~13시)', earth: '진·미시 등 환절기 시간대(07~09시, 13~15시)', metal: '신·유시(15~19시)', water: '해·자시(21~01시)' };
export function luckyElement(count, todayGanEl, todayZhiEl) {
  const min = Math.min(...ORDER.map((k) => count[k]));
  const cands = ORDER.filter((k) => count[k] === min);
  const score = (k) => (k === todayGanEl ? 2 : 0) + (k === todayZhiEl ? 1 : 0) + (GEN[todayGanEl] === k ? 0.5 : 0);
  let best = cands[0];
  for (const k of cands) if (score(k) > score(best)) best = k;
  return { element: best, min, why: score(best) >= 1 ? '내 사주에서 가장 적은 기운이고, 오늘 일진이 힘을 실어줘요.' : '내 사주에서 가장 적은 기운이라 오늘 채워주면 균형이 잡혀요.' };
}

/* ───────── 오늘의 시간대 흐름 (12시진) ───────── */
const HOURS = [['자', 0, '23~01시'], ['축', 2, '01~03시'], ['인', 4, '03~05시'], ['묘', 6, '05~07시'], ['진', 8, '07~09시'], ['사', 10, '09~11시'],
  ['오', 12, '11~13시'], ['미', 14, '13~15시'], ['신', 16, '15~17시'], ['유', 18, '17~19시'], ['술', 20, '19~21시'], ['해', 22, '21~23시']];
function effectSum(tg, gender) {
  const e = TG_EFFECT[tg];
  return e[0] + e[1] + e[2] + e[3] + ((TG_LOVE[gender || ''] || {})[tg] || 0);
}
export function hourFlow(p, y, m, d) {
  const dm = p.saju.pillars.day.gi, myZ = p.saju.pillars.day.zi;
  const list = HOURS.map(([ko, h, range]) => {
    const tp = Solar.fromYmdHms(y, m, d, h, 0, 0).getLunar().getEightChar().getTime();
    const gi = GAN.indexOf(tp[0]), zi = ZHI.indexOf(tp[1]);
    const tg = tenGod(dm, gi);
    const s = effectSum(tg, p.gender) + relScore(branchTags(zi, myZ));
    return { ko, range, pillar: tp, tg, score: s, level: clamp(3 + Math.round(s / 2), 1, 5) };
  });
  let best = list[0];
  for (const x of list) if (x.score > best.score) best = x;
  return { list, best };
}

/* ───────── 체계 투표 ─────────
   각 체계는 분야(재물·연애·사업·학업·컨디션)마다 +1(좋은 방향) / 0 / -1(조심) 한 표를 던져요.
   한 체계 안에서 여러 신호가 나오면 합계의 부호가 그 체계의 한 표예요. 사주는 신호가 가장 촘촘해서 2표로 세요. */
export const SYSTEMS = ['사주', '서양', '띠', '수비학', '베딕', '구성기학'];
export const SYS_LABEL = { 사주: '사주', 서양: '서양 별자리', 띠: '띠', 수비학: '수비학', 베딕: '베딕', 구성기학: '구성기학' };
const SYS_WEIGHT = { 사주: 2, 서양: 1, 띠: 1, 수비학: 1, 베딕: 1, 구성기학: 1 };
export const activeSystems = (p) => ['사주', '서양', '띠', '수비학'].concat(p.vedic ? ['베딕'] : [], p.nine ? ['구성기학'] : []);
export const levelFromScore = (sc) => 3 + (sc >= 4 ? 2 : sc >= 2 ? 1 : sc <= -4 ? -2 : sc <= -2 ? -1 : 0);
const eunneun = (w) => (hasBatchim(w) ? '은' : '는');
export function consensus(votes) {
  const lab = (x) => SYS_LABEL[x.sys];
  const pos = votes.filter((x) => x.v > 0), neg = votes.filter((x) => x.v < 0), neu = votes.filter((x) => x.v === 0), n = votes.length;
  const names = (a) => a.map(lab).join('·');
  const eun = (a) => names(a) + eunneun(lab(a[a.length - 1]));
  let text;
  if (!pos.length && !neg.length) text = '어느 체계도 크게 기울지 않는 평범한 흐름이에요.';
  else if (pos.length && !neg.length) text = pos.length === n ? `모든 체계(${n}개)가 좋은 방향을 가리켜요.` : `${n}개 체계 중 ${pos.length}개(${names(pos)})${iga(lab(pos[pos.length - 1]))} 좋은 방향을 가리키고, 나머지는 특별한 신호가 없어요.`;
  else if (neg.length && !pos.length) text = neg.length === n ? `모든 체계(${n}개)가 조심하라는 방향을 가리켜요.` : `${n}개 체계 중 ${neg.length}개(${names(neg)})${iga(lab(neg[neg.length - 1]))} 조심 신호를 보내고, 나머지는 특별한 신호가 없어요.`;
  else text = `${eun(pos)} 좋은 방향, ${eun(neg)} 조심 신호예요. 체계마다 보는 면이 달라 엇갈리는 흐름이에요.`;
  return { text, pos: pos.length, neg: neg.length, neu: neu.length, n, agree: Math.max(pos.length, neg.length), posNames: pos.map(lab), negNames: neg.map(lab) };
}
function summarize(signals, p) {
  const active = activeSystems(p);
  return CATS.map((c) => {
    const votes = active.map((sys) => { const mine = signals.filter((x) => x.cat === c.key && x.sys === sys); return { sys, v: Math.sign(mine.reduce((a, x) => a + x.v, 0)), texts: mine.map((x) => x.text), items: mine.map((x) => ({ v: x.v, text: x.text })) }; });
    const score = votes.reduce((a, x) => a + SYS_WEIGHT[x.sys] * x.v, 0);
    const level = levelFromScore(score);
    const all = signals.filter((x) => x.cat === c.key && active.includes(x.sys));
    const reasons = all.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3).map((x) => ({ v: x.v, text: x.text, sys: x.sys }));
    return { key: c.key, label: c.label, level, levelLabel: LEVEL_LABEL[level], score, votes, consensus: consensus(votes), reasons, signals: all.map((x) => ({ v: x.v, text: x.text, sys: x.sys })) };
  });
}
function kiStars(y, m, d) {
  const ec = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
  const yp = ec.getYear();
  const adj = [y, y - 1].find((Y) => GZ60[(((Y - 4) % 60) + 60) % 60] === yp) ?? y;
  const yearStar = E.nineStar(adj, 'M').n;
  const k = (ZHI.indexOf(ec.getMonth()[1]) - 2 + 12) % 12;
  return { adjYear: adj, yearStar, monthStar: C.monthStar(yearStar, k), k };
}
function kiSignals(p, period, starN) {
  const mine = p.nine.n, rel = C.elRel(p.nine.element, C.NINE_EL[starN]);
  const me = C.NINE_NAME[mine], star = C.NINE_NAME[starN];
  const body = {
    resource: `내 본명성 ${me}을 생해주는 관계라 도움과 회복의 기운이 들어와요.`,
    output: `내 본명성 ${me}이 중심 별을 생해주는 관계라 베풀고 노력한 만큼 성과가 따라오지만 기운을 많이 쓰게 돼요.`,
    wealth: `내 본명성 ${me}이 중심 별을 극하는 관계라 주도권은 내게 있지만 욕심과 무리를 조심하는 편이 좋아요.`,
    power: `중심 별이 내 본명성 ${me}을 극하는 관계라 압박과 부담이 커질 수 있어 무리하지 않는 게 좋아요.`,
    peer: `내 본명성 ${me}과 같은 오행이라 닮은 기운 속에서 안정적으로 흘러가요.`,
  }[rel];
  return Object.entries(C.KI_EFFECT[rel]).map(([cat, v]) => ({ cat, v, text: `${period} 구성기학의 중심 별은 ${star}이에요. ${body}` }));
}
// 서양·베딕의 느린 행성(목성·토성)과 역행 신호를 한 시점에서 계산
function slowPlanetSignals(p, date) {
  const out = [];
  const baseSign = p.vedic ? Math.floor(p.vedic.ascTropical / 30) : p.west.idx;
  const jh = C.houseFrom(C.signOf(C.tropicalLon(C.BODY.Jupiter, date)), baseSign), sh = C.houseFrom(C.signOf(C.tropicalLon(C.BODY.Saturn, date)), baseSign);
  for (const [cat, v] of Object.entries(C.JUP_W[jh] || {})) out.push({ cat, v, sys: '서양', text: `목성이 내 ${jh}번째 하우스(${C.HOUSE_AREA[jh]})를 지나며 그 분야를 키워 줘요.` });
  for (const [cat, v] of Object.entries(C.SAT_W[sh] || {})) out.push({ cat, v, sys: '서양', text: `토성이 내 ${sh}번째 하우스(${C.HOUSE_AREA[sh]})를 지나며 그 분야에 책임과 제약을 더해요.` });
  if (isRetrograde(C.BODY.Mercury, date)) out.push({ cat: 'biz', v: -1, sys: '서양', text: '수성이 역행 중이라 계약·소통은 한 번 더 확인하면 좋아요. (서양 점성술 전통 해석)' });
  if (isRetrograde(C.BODY.Venus, date)) out.push({ cat: 'love', v: -1, sys: '서양', text: '금성이 역행 중이라 연애·소비 결정은 서두르지 않는 게 좋아요. (서양 점성술 전통 해석)' });
  if (p.vedic) {
    const mj = C.houseFrom(C.signOf(C.siderealLon(C.BODY.Jupiter, date)), p.vedic.moon.idx), ms = C.houseFrom(C.signOf(C.siderealLon(C.BODY.Saturn, date)), p.vedic.moon.idx);
    for (const [cat, v] of Object.entries(C.JUP_V[mj] || {})) out.push({ cat, v, sys: '베딕', text: `베딕 기준으로 목성이 내 달 별자리에서 ${mj}번째 길한 자리를 지나 ${C.HOUSE_AREA[mj]} 쪽에 도움이 돼요.` });
    const sv = C.saturnVedic(ms);
    const stext = [12, 1, 2].includes(ms) ? `토성이 내 달 별자리에서 ${ms}번째 자리에 있어 사데사티(약 7년 반 주기) 구간이에요. 마음의 부담이 커지기 쉬우니 무리하지 않는 게 좋아요.`
      : [4, 8].includes(ms) ? `토성이 내 달 별자리에서 ${ms}번째 자리에 있어 몸과 마음의 리듬을 챙기는 구간이에요.` : `토성이 내 달 별자리에서 ${ms}번째 길한 자리에 있어 노력한 만큼 성과로 이어져요.`;
    for (const [cat, v] of Object.entries(sv)) out.push({ cat, v, sys: '베딕', text: stext });
  }
  return out;
}

/* ───────── 오늘의 운세풀이 ───────── */
export function dailyReading(p, now = new Date()) {
  const { y, m, d } = kstDate(now);
  const noon = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
  const cal = calendarInfo(y, m, d);
  const gi = GAN.indexOf(cal.pillar[0]), zi = ZHI.indexOf(cal.pillar[1]);
  const dm = p.saju.pillars.day.gi, myDayZ = p.saju.pillars.day.zi, myYearZ = p.saju.pillars.year.zi;
  const tg = tenGod(dm, gi);
  const sig = [];
  const add = (cat, v, text, sys) => sig.push({ cat, v, text, sys });
  // 사주
  const eff = TG_EFFECT[tg];
  Object.entries(CAT_IDX).forEach(([cat, i]) => { if (eff[i] !== 0) add(cat, eff[i], TG_REASON[cat][tg] || TG_THEME[tg], '사주'); });
  const lv = (TG_LOVE[p.gender || ''] || {})[tg];
  if (lv) add('love', lv, TG_REASON.love[tg], '사주');
  const t1 = branchTags(zi, myDayZ), s1 = relScore(t1);
  if (s1 > 0) add('love', 1, `오늘 일지 ${zh(zi)}${gwa(ZHI_KO[zi])} 내 일지 ${zh(myDayZ)}${iga(ZHI_KO[myDayZ])} ${t1.join('·')}으로 이어져 마음이 편하고 관계가 부드러워요.`, '사주');
  if (s1 < 0) add('love', -1, `오늘 일지 ${zh(zi)}${gwa(ZHI_KO[zi])} 내 일지 ${zh(myDayZ)}${iga(ZHI_KO[myDayZ])} ${t1.join('·')}으로 부딪혀 감정 기복이 생기기 쉬워요.`, '사주');
  const ss = sinsalOf(p.saju);
  const hit = (key) => ss.find((x) => x.key === key).targets.includes(zi);
  if (hit('도화')) add('love', 1, '오늘은 내 도화 기운이 켜지는 날이라 매력이 올라가요.', '사주');
  if (hit('천을귀인')) { add('biz', 1, '오늘은 천을귀인이 드는 날이라 도움을 받기 좋아요.', '사주'); add('study', 1, '귀인의 도움으로 막힌 공부도 풀리기 쉬워요.', '사주'); }
  if (hit('화개')) add('study', 1, '화개 기운이 들어 사색과 창작에 집중하기 좋아요.', '사주');
  const dayNotes = [];
  if (hit('역마')) dayNotes.push('역마 기운이 드는 날 — 이동과 변화가 많아질 수 있어요.');
  // 띠
  const t2 = branchTags(zi, myYearZ), s2 = relScore(t2);
  if (s2 > 0) add('wealth', 1, `오늘 일지 ${zh(zi)}${gwa(ZHI_KO[zi])} 내 ${ANIMAL[myYearZ]}띠가 ${t2.join('·')}으로 이어져 주변 도움을 받기 좋아요.`, '띠');
  if (s2 < 0) add('biz', -1, `오늘 일지 ${zh(zi)}${gwa(ZHI_KO[zi])} 내 ${ANIMAL[myYearZ]}띠가 ${t2.join('·')}으로 부딪혀 의견 충돌에 유의하면 좋아요.`, '띠');
  // 서양
  const W = westernToday(noon);
  const sunEl = p.west.wEl, moonEl = W.moonEl;
  const harmony = sunEl === moonEl || (sunEl === 'fire' && moonEl === 'air') || (sunEl === 'air' && moonEl === 'fire') || (sunEl === 'earth' && moonEl === 'water') || (sunEl === 'water' && moonEl === 'earth');
  if (harmony) add('love', 1, `오늘 달이 ${W.moonSign}에 있어 내 ${p.west.name}${gwa(p.west.name)} 원소 결이 잘 맞아요.`, '서양');
  else add('cond', -1, `오늘 달이 ${W.moonSign}에 있어 내 ${p.west.name}${gwa(p.west.name)} 감정의 결이 조금 엇갈려요.`, '서양');
  if (W.mercuryRx) add('biz', -1, '수성이 역행 중이라 계약·소통은 한 번 더 확인하면 좋아요. (서양 점성술 전통 해석)', '서양');
  if (W.venusRx) add('love', -1, '금성이 역행 중이라 연애·소비 결정은 서두르지 않는 게 좋아요. (서양 점성술 전통 해석)', '서양');
  // 베딕
  let tara = null, todayNak = null, chandraH = null;
  if (p.vedic) {
    const ms = moonSidereal(noon.getTime());
    todayNak = Math.floor(ms / (360 / 27));
    tara = taraBala(p.vedic.nakshatra.idx, todayNak);
    if (tara.good > 0) { add('cond', 1, `오늘 달의 낙샤트라가 내 출생 별 기준 ‘${tara.ko}’ 구간(${tara.name})이라 마음이 안정적이에요.`, '베딕'); add('biz', 1, `베딕 타라발라가 ‘${tara.ko}’ 구간이라 새 일을 시작하기 좋은 편이에요.`, '베딕'); }
    if (tara.good < 0) { add('cond', -1, `오늘 달의 낙샤트라가 내 출생 별 기준 ‘${tara.ko}’ 구간(${tara.name})이라 무리하지 않는 게 좋아요.`, '베딕'); add('biz', -1, `베딕 타라발라가 ‘${tara.ko}’ 구간이라 큰 결정은 한 번 더 살펴보세요.`, '베딕'); }
    chandraH = C.houseFrom(Math.floor(ms / 30), p.vedic.moon.idx);
    if (C.CHANDRA_GOOD.includes(chandraH)) add('cond', 1, `오늘 달이 내 출생 달에서 ${chandraH}번째 자리(찬드라발라 길)라 마음의 결이 편안해요.`, '베딕');
    if (C.CHANDRA_BAD.includes(chandraH)) add('cond', -1, `오늘 달이 내 출생 달에서 ${chandraH}번째 자리(찬드라발라 흉)라 마음이 예민해지기 쉬워요.`, '베딕');
  }
  // 수비학
  const per = personalCycle(p.input.m, p.input.d, y, m, d);
  if (PERSONAL_CAT[per.pd]) add(PERSONAL_CAT[per.pd], 1, `수비학 개인의 날 ${per.pd} — ${per.keyPd}에 힘이 실려요.`, '수비학');
  // 구성기학 (이번 달 중심 별 ↔ 내 본명성)
  const ks = kiStars(y, m, d);
  if (p.nine) kiSignals(p, '이번 달', ks.monthStar).forEach((x) => add(x.cat, x.v, x.text, '구성기학'));

  const cats = summarize(sig, p);
  const overall = Math.round(cats.reduce((a, c) => a + c.level, 0) / cats.length);
  const hours = hourFlow(p, y, m, d);
  const lk = luckyElement(p.saju.count, GAN_EL[gi], ZHI_EL[zi]);
  const L = LUCKY[lk.element];
  const doy = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
  const lucky = {
    element: lk.element, elementKo: EL[lk.element].ko, why: lk.why,
    color: L.colors[doy % L.colors.length], colors: L.colors, dir: L.dir, nums: L.nums,
    items: [L.items[doy % 6], L.items[(doy + 3) % 6]], outfit: L.outfits[doy % 3], hour: HOUR_BY_EL[lk.element],
  };
  const materials = [
    { sys: '사주', text: `오늘은 ${cal.pillar}(${GAN_KO[gi]}${ZHI_KO[zi]})일이에요. 내 일간 기준 천간은 ${tg}, ${TG_THEME[tg]} 날이에요.` },
    { sys: '사주 · 지지', text: `오늘 일지와 내 일지: ${t1.length ? t1.join('·') : '특별한 합·충 없음'} / 내 띠: ${t2.length ? t2.join('·') : '특별한 합·충 없음'}` },
    { sys: '서양 별자리', text: `오늘 달은 ${W.moonSign}, ${W.phase}이에요.${W.mercuryRx ? ' 수성 역행 중.' : ''}${W.venusRx ? ' 금성 역행 중.' : ''}` },
    { sys: '베딕', text: tara ? `오늘 달의 낙샤트라는 ${E.NAKSHATRA[todayNak]}, 내 출생 별 기준 타라발라는 ‘${tara.ko}’ 구간(${tara.name}), 달 기준 ${chandraH}번째 자리예요.` : '시간과 출생지를 입력하면 타라발라가 열려요.' },
    { sys: '수비학', text: `개인의 날 ${per.pd}(${per.keyPd}) · 이번 달 ${per.pm} · 올해 ${per.py}` },
    { sys: '구성기학', text: p.nine ? `이번 달 중심 별은 ${C.NINE_NAME[ks.monthStar]}, 올해는 ${C.NINE_NAME[ks.yearStar]}이에요. 내 본명성은 ${C.NINE_NAME[p.nine.n]}이에요.` : '성별을 선택하면 구성기학이 열려요.' },
    { sys: '한국 전통', text: `음력 ${cal.lunar.leap ? '윤' : ''}${cal.lunar.month}월 ${cal.lunar.day}일${cal.sonOps ? ' · 손 없는 날' : ''} · 다음 절기 ${cal.next.name}(${cal.next.m}/${cal.next.d})` },
  ];
  return { date: { y, m, d }, cal, pillar: cal.pillar, pillarKo: GAN_KO[gi] + ZHI_KO[zi], tg, tgTheme: TG_THEME[tg], cats, overall, overallLabel: LEVEL_LABEL[overall],
    hours, lucky, materials, notes: dayNotes, western: W, tara, personal: per, ki: ks, active: activeSystems(p) };
}

/* ───────── 신년운 · 월운 ───────── */
const YEAR_HEAD = {
  비견: '나를 믿고 내 방식으로 밀고 가는 해예요. 협업과 경쟁이 함께 열려요.', 겁재: '경쟁과 지출이 늘기 쉬운 해예요. 지키는 돈과 새는 돈을 구분해 보세요.',
  식신: '표현과 결과물이 열리는 해예요. 배우고 만든 것이 눈에 보이기 시작해요.', 상관: '재능이 튀어나오는 해예요. 말과 글의 힘이 크니 표현 수위만 조절해요.',
  편재: '활동 반경과 기회가 넓어지는 해예요. 새 수입원과 인맥을 시험해 보세요.', 정재: '꾸준한 실속을 쌓는 해예요. 저축과 루틴이 보답받아요.',
  편관: '책임과 도전이 커지는 해예요. 부담을 나눠 지면 성장으로 바뀌어요.', 정관: '신뢰와 질서가 쌓이는 해예요. 조직 안에서 평가가 좋아져요.',
  편인: '생각이 깊어지고 전문성을 파는 해예요. 혼자 몰입하는 시간이 큰 힘이 돼요.', 정인: '배움과 도움이 들어오는 해예요. 자격, 학업, 귀인에게서 힘을 얻어요.',
};
const MONTH_KEY = { 비견: '내 페이스, 협업', 겁재: '경쟁, 지출 주의', 식신: '표현, 결과물', 상관: '재치, 말 조심', 편재: '활동, 새 수입', 정재: '꾸준한 실속', 편관: '책임, 압박', 정관: '신뢰, 평가', 편인: '몰입, 공부', 정인: '도움, 배움' };
export function yearPillar(Y) { return GZ60[(((Y - 4) % 60) + 60) % 60]; }
export function monthPillars(Y) {
  const out = [];
  for (let k = 0; k < 12; k++) {
    const mm = ((1 + k) % 12) + 1; // 2월부터
    const yy = mm === 1 ? Y + 1 : Y;
    const bz = Solar.fromYmdHms(yy, mm, 20, 12, 0, 0).getLunar().getEightChar().getMonth();
    out.push({ solarMonth: mm, pillar: bz });
  }
  return out;
}
const modeOf = (arr) => { const c = {}; arr.forEach((x) => { c[x] = (c[x] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
/** 월별로 6개 체계가 투표한 결과. 월 15일(절기월 중간) 기준으로 천체를 계산해요. */
export function monthVotes(p, Y) {
  const dm = p.saju.pillars.day.gi, myDayZ = p.saju.pillars.day.zi, myYearZ = p.saju.pillars.year.zi;
  const yStar = E.nineStar(Y, 'M').n;
  return monthPillars(Y).map((mp, k) => {
    const g = GAN.indexOf(mp.pillar[0]), z = ZHI.indexOf(mp.pillar[1]);
    const tg = tenGod(dm, g), eff = TG_EFFECT[tg];
    const mm = mp.solarMonth, yy = mm === 1 ? Y + 1 : Y;
    const date = new Date(Date.UTC(yy, mm - 1, 15, 3, 0, 0));
    const sig = [];
    const add = (cat, v, text, sys) => sig.push({ cat, v, text, sys });
    Object.entries(CAT_IDX).forEach(([cat, i]) => { if (eff[i] !== 0) add(cat, eff[i], TG_REASON[cat][tg] || TG_THEME[tg], '사주'); });
    const lv = (TG_LOVE[p.gender || ''] || {})[tg];
    if (lv) add('love', lv, TG_REASON.love[tg], '사주');
    const rel1 = relScore(branchTags(z, myDayZ)), rel2 = relScore(branchTags(z, myYearZ));
    if (rel1 > 0) add('love', 1, '내 일지와 합이 들어와 마음이 편해지고 인연이 닿기 쉬운 달이에요.', '사주');
    if (rel1 < 0) add('love', -1, '내 일지와 충·형이 걸려 감정 기복이 생기기 쉬운 달이에요.', '사주');
    if (rel2 > 0) add('wealth', 1, '내 띠와 합이 들어와 주변의 도움이 닿기 쉬운 달이에요.', '띠');
    if (rel2 < 0) add('biz', -1, '내 띠와 충·형이 걸려 일정과 거래에 변동이 생기기 쉬운 달이에요.', '띠');
    const per = personalCycle(p.input.m, p.input.d, yy, mm, 1);
    if (PERSONAL_CAT[per.pm]) add(PERSONAL_CAT[per.pm], 1, `수비학 개인의 달 ${per.pm} — ${per.keyPm}에 힘이 실려요.`, '수비학');
    slowPlanetSignals(p, date).forEach((x) => add(x.cat, x.v, x.text, x.sys));
    if (p.nine) kiSignals(p, `${mm}월`, C.monthStar(yStar, k)).forEach((x) => add(x.cat, x.v, x.text, '구성기학'));
    const cats = summarize(sig, p);
    const lvl = Object.fromEntries(cats.map((c) => [c.key, c.level]));
    return { solarMonth: mm, pillar: mp.pillar, tg, group: TG_GROUP[tg], signals: sig, cats, lv: lvl, level: Math.round(cats.reduce((a, c) => a + c.level, 0) / cats.length), star: p.nine ? C.monthStar(yStar, k) : null };
  });
}
export function yearlyReading(p, Y) {
  const dm = p.saju.pillars.day.gi, myDayZ = p.saju.pillars.day.zi, myYearZ = p.saju.pillars.year.zi;
  const yp = yearPillar(Y), gi = GAN.indexOf(yp[0]), zi = ZHI.indexOf(yp[1]);
  const tg = tenGod(dm, gi);
  const sig = [];
  const add = (cat, v, text, sys) => sig.push({ cat, v, text, sys });
  const eff = TG_EFFECT[tg];
  Object.entries(CAT_IDX).forEach(([cat, i]) => { if (eff[i] !== 0) add(cat, eff[i], TG_REASON[cat][tg] || TG_THEME[tg], '사주'); });
  const lv = (TG_LOVE[p.gender || ''] || {})[tg];
  if (lv) add('love', lv, TG_REASON.love[tg], '사주');
  const t1 = branchTags(zi, myDayZ), s1 = relScore(t1);
  if (s1 > 0) add('love', 1, `올해 ${zh(zi)}${gwa(ZHI_KO[zi])} 내 일지 ${zh(myDayZ)}${iga(ZHI_KO[myDayZ])} ${t1.join('·')}으로 이어져 관계가 부드러운 편이에요.`, '사주');
  if (s1 < 0) add('love', -1, `올해 ${zh(zi)}${gwa(ZHI_KO[zi])} 내 일지 ${zh(myDayZ)}${iga(ZHI_KO[myDayZ])} ${t1.join('·')}으로 부딪혀 관계에서 속도 조절이 필요해요.`, '사주');
  const t2 = branchTags(zi, myYearZ), s2 = relScore(t2);
  if (s2 > 0) add('wealth', 1, `올해 ${zh(zi)}${gwa(ZHI_KO[zi])} 내 ${ANIMAL[myYearZ]}띠가 ${t2.join('·')}으로 이어져 주변의 도움이 커져요.`, '띠');
  if (s2 < 0) add('biz', -1, `올해 ${zh(zi)}${gwa(ZHI_KO[zi])} 내 ${ANIMAL[myYearZ]}띠가 ${t2.join('·')}으로 부딪혀 조직·거래에서 변동이 있을 수 있어요.`, '띠');
  const sj = samjae(myYearZ, Y);
  if (sj) { add('cond', -1, `올해는 ${sj.stage} 해예요. 무리한 일정은 줄이고 점검하는 해로 쓰면 좋아요.`, '띠'); add('biz', -1, `${sj.stage} 기간이라 큰 확장은 한 번 더 점검하면 좋아요.`, '띠'); }
  const per = personalCycle(p.input.m, p.input.d, Y, 1, 1);
  if (PERSONAL_CAT[per.py]) add(PERSONAL_CAT[per.py], 1, `수비학 개인 연수 ${per.py} — ${per.keyPy}에 힘이 실려요.`, '수비학');
  // 서양·베딕: 12개월 신호의 합으로 연간 한 표
  const months = monthVotes(p, Y);
  for (const sys of ['서양', '베딕']) {
    if (sys === '베딕' && !p.vedic) continue;
    for (const c of CATS) {
      const ms = months.flatMap((m) => m.signals.filter((x) => x.sys === sys && x.cat === c.key));
      const sum = ms.reduce((a, x) => a + x.v, 0);
      if (sum !== 0) { const sign = Math.sign(sum); add(c.key, sign, modeOf(ms.filter((x) => Math.sign(x.v) === sign).map((x) => x.text)), sys); }
    }
  }
  const yStar = E.nineStar(Y, 'M').n;
  if (p.nine) kiSignals(p, '올해', yStar).forEach((x) => add(x.cat, x.v, x.text, '구성기학'));

  let dasha = null;
  if (p.vedic) {
    const mid = Date.UTC(Y, 6, 1);
    const cd = currentDasha(p.birthUTC, p.vedic.moon.lon, mid);
    dasha = { maha: cd.maha, antar: cd.antar };
  }
  return { year: Y, pillar: yp, pillarKo: GAN_KO[gi] + ZHI_KO[zi], tg, head: YEAR_HEAD[tg], cats: summarize(sig, p), samjae: sj, personalYear: per, dasha, yearStar: yStar,
    months: months.map((m) => ({ solarMonth: m.solarMonth, pillar: m.pillar, tg: m.tg, key: MONTH_KEY[m.tg], level: m.level })), monthDetail: months };
}

/* ───────── 대운 · 총운(운명풀이) ───────── */
const DW_THEME = {
  비겁: '자기 힘으로 서는 10년 — 독립과 협업, 경쟁이 함께 커져요.', 식상: '표현과 재능이 열리는 10년 — 만들고 말하고 보여주는 일이 잘 풀려요.',
  재성: '현실과 재물을 다지는 10년 — 활동 반경과 수입 구조가 커져요.', 관성: '책임과 위치가 올라가는 10년 — 조직과 규율 속에서 성장해요.',
  인성: '배움과 보호를 받는 10년 — 공부, 자격, 귀인의 도움이 커져요.',
};
export function daewoon(p, nowYear) {
  if (p.gender !== 'M' && p.gender !== 'F') return null;
  const ec = Solar.fromYmdHms(...E.beijingParts(p.birthUTC)).getLunar().getEightChar();
  const yun = ec.getYun(p.gender === 'M' ? 1 : 0);
  const dm = p.saju.pillars.day.gi;
  const list = yun.getDaYun(10).filter((x) => x.getGanZhi()).map((x) => {
    const gz = x.getGanZhi(), g = GAN.indexOf(gz[0]);
    const tg = tenGod(dm, g);
    return { ganzhi: gz, ko: GAN_KO[g] + ZHI_KO[ZHI.indexOf(gz[1])], ganEl: GAN_EL[g], zhiEl: ZHI_EL[ZHI.indexOf(gz[1])], tg, group: TG_GROUP[tg], theme: DW_THEME[TG_GROUP[tg]],
      startAge: x.getStartAge(), endAge: x.getEndAge(), startYear: x.getStartYear(), endYear: x.getEndYear(), current: nowYear >= x.getStartYear() && nowYear <= x.getEndYear() };
  });
  return { list, forward: yun.isForward ? yun.isForward() : null };
}
const DESTINY = {
  wealth: { 비겁: '내 힘으로 버는 타입이에요. 동업·보증·빌려주는 돈은 신중하게, 고정 저축을 먼저 떼어두면 안정돼요.', 식상: '재능을 돈으로 바꾸는 타입이에요. 기술·콘텐츠로 수입을 키우되 지출 기록을 같이 두면 좋아요.',
    재성: '현실 감각이 좋은 타입이에요. 수입과 지출 관리에 관심을 가져도 좋지만 욕심낸 확장은 점검해요.', 관성: '안정적인 소득과 제도권 수단이 잘 맞는 타입이에요. 큰 변동보다 원칙 있는 적립이 어울려요.',
    인성: '아는 만큼 지키는 타입이에요. 공부하고 확신이 선 뒤 움직이면 좋고, 결정을 미루는 습관은 주의해요.' },
  biz: { 비겁: '독립심이 강해 내 사업과 잘 맞아요. 파트너와 지분·역할을 문서로 정해두면 좋아요.', 식상: '아이디어와 표현력이 무기예요. 상품·서비스 기획, 콘텐츠, 교육형 사업에서 빛나요.',
    재성: '시장 감각과 실행력이 좋아요. 영업·유통·거래 중심 사업이 잘 맞고 현금 흐름 관리가 핵심이에요.', 관성: '체계와 신뢰로 키우는 사업이에요. 규정과 품질이 중요한 분야에서 강점이 있어요.',
    인성: '전문성과 신뢰로 승부해요. 자격·교육·컨설팅처럼 아는 것을 파는 사업에 어울려요.' },
  job: { 비겁: '주도권이 있는 역할과 전문직·프리랜서형이 잘 맞아요.', 식상: '기획, 창작, 교육, 서비스처럼 표현이 곧 성과인 일이 잘 맞아요.',
    재성: '영업, 유통, 운영, 기획처럼 현실 성과가 숫자로 보이는 일이 잘 맞아요.', 관성: '조직과 제도 안에서 책임을 맡는 일, 공공·관리·법규 분야가 잘 맞아요.',
    인성: '연구, 교육, 문서·심사 분야처럼 지식과 신뢰가 쌓이는 일이 잘 맞아요.' },
  study: { 비겁: '스스로 정한 방식이 잘 통해요. 스터디는 경쟁이 자극이 될 때만 도움이 돼요.', 식상: '말하고 정리하며 배울 때 오래 남아요. 요약·발표형 공부가 잘 맞아요.',
    재성: '목표가 분명할 때 속도가 붙어요. 자격증처럼 쓰임이 분명한 공부가 잘 맞아요.', 관성: '계획표와 마감이 있을 때 힘이 나요. 시험 준비에 강한 타입이에요.',
    인성: '깊이 파고드는 공부가 강점이에요. 자료를 충분히 모은 뒤 정리하면 효율이 높아요.' },
  love: { 비겁: '대등한 관계를 원해요. 서로의 영역을 존중하는 연인이 편해요.', 식상: '표현이 풍부한 편이에요. 말이 앞서 오해가 생길 땐 한 템포 쉬어가요.',
    재성: '관계에도 현실감이 있어요. 챙기는 마음이 크니 상대의 속도도 살펴요.', 관성: '책임감 있게 관계를 이어가요. 규칙과 기대가 많아지면 숨 쉴 틈을 만들어요.',
    인성: '정서적 안정과 배려를 중요하게 봐요. 의존과 기대가 커지지 않게 균형을 잡아요.' },
  cond: { 비겁: '에너지는 좋은 편이에요. 무리해서 버티는 습관은 줄이고 규칙적인 휴식을 잡아요.', 식상: '생각과 표현에 에너지를 많이 써요. 수면과 식사 리듬이 곧 컨디션이에요.',
    재성: '바쁜 일정에 몸이 따라가요. 일과 일 사이 짧은 회복 시간을 넣어요.', 관성: '긴장이 쌓이기 쉬운 편이에요. 스트레칭·산책 같은 해소 루틴이 효과적이에요.',
    인성: '마음이 편해야 몸도 편해요. 혼자 쉬는 시간과 규칙적인 생활이 도움이 돼요.' },
};
export const DESTINY_FIELDS = [['wealth', '재물'], ['biz', '사업'], ['job', '직업'], ['study', '학업'], ['love', '연애·관계'], ['cond', '컨디션 관리']];
const LACK = { wood: '성장과 시작의 기운이 적어요. 초록색·식물·산책이 균형을 도와요.', fire: '열정과 표현의 기운이 적어요. 활동적인 일과 따뜻한 색이 균형을 도와요.',
  earth: '안정과 중심의 기운이 적어요. 루틴과 정리, 베이지·황색이 균형을 도와요.', metal: '결단과 정리의 기운이 적어요. 선택 기준을 정하고 흰색·금속 소품이 균형을 도와요.',
  water: '유연함과 휴식의 기운이 적어요. 충분한 휴식과 남색·검정 계열이 균형을 도와요.' };
const EXCESS = { wood: '성장 기운이 넘쳐요. 벌여놓은 일을 마무리하는 게 포인트예요.', fire: '열정이 넘쳐요. 속도를 늦추고 쉬는 시간을 잡아주세요.',
  earth: '안정 기운이 넘쳐요. 변화를 작게라도 시도해 보세요.', metal: '원칙 기운이 강해요. 유연하게 받아들이는 연습이 도움이 돼요.', water: '생각과 감정의 기운이 많아요. 몸을 움직이는 활동이 균형을 도와요.' };
export function destiny(p) {
  const dm = p.saju.pillars.day.gi;
  const P = p.saju.pillars;
  const g = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const stems = [P.year.gi, P.month.gi, P.time ? P.time.gi : null].filter((x) => x !== null);
  stems.forEach((s) => { g[TG_GROUP[tenGod(dm, s)]]++; });
  [P.year.zi, P.month.zi, P.day.zi, P.time ? P.time.zi : null].filter((x) => x !== null).forEach((z) => { g[TG_GROUP[tenGod(dm, ZHI_BONGI[z])]]++; });
  const ranked = Object.entries(g).sort((a, b) => b[1] - a[1]);
  const top = ranked[0][0];
  const fields = DESTINY_FIELDS.map(([k, label]) => ({ key: k, label, text: DESTINY[k][top] }));
  const count = p.saju.count;
  const lacks = ORDER.filter((k) => count[k] === 0).map((k) => ({ el: k, text: LACK[k] }));
  const excess = ORDER.filter((k) => count[k] >= 4).map((k) => ({ el: k, text: EXCESS[k] }));
  const ss = sinsalOf(p.saju).filter((s) => s.has).map((s) => ({ key: s.key, where: s.whereKo.join('·'), text: SINSAL_LINE[s.key] }));
  return { groups: g, ranked, top, fields, lacks, excess, sinsal: ss };
}

/* ───────── 택일 ───────── */
export const TAEKIL_CATS = ['이사', '결혼', '개업', '계약', '여행'];
const TK = {
  이사: { good: ['식신', '정재', '정인', '비견'], bad: ['편관', '겁재', '상관'], son: 2 },
  결혼: { good: ['정관', '정재', '정인', '식신'], bad: ['편관', '겁재', '상관', '편인'], son: 1 },
  개업: { good: ['식신', '정재', '편재', '정관'], bad: ['겁재', '편관'], son: 1 },
  계약: { good: ['정관', '정재', '정인'], bad: ['상관', '겁재', '편관'], son: 0, mercury: -2 },
  여행: { good: ['식신', '편재', '비견', '정인'], bad: ['편관'], son: 0, mercury: -1, yeokma: 1 },
};
export function taekil(p, now = new Date(), days = 45) {
  const start = kstDate(now);
  const dm = p.saju.pillars.day.gi, myZ = p.saju.pillars.day.zi;
  const ss = sinsalOf(p.saju);
  const out = Object.fromEntries(TAEKIL_CATS.map((c) => [c, []]));
  for (let i = 0; i < days; i++) {
    const t = new Date(Date.UTC(start.y, start.m - 1, start.d + i));
    const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate();
    const cal = calendarInfo(y, m, d);
    const gi = GAN.indexOf(cal.pillar[0]), zi = ZHI.indexOf(cal.pillar[1]);
    const tg = tenGod(dm, gi);
    const rel = relScore(branchTags(zi, myZ));
    const rx = isRetrograde(Astro.Body.Mercury, new Date(Date.UTC(y, m - 1, d, 3, 0, 0)));
    const yeokma = ss.find((s) => s.key === '역마').targets.includes(zi);
    for (const c of TAEKIL_CATS) {
      const r = TK[c];
      let s = (r.good.includes(tg) ? 2 : 0) - (r.bad.includes(tg) ? 2 : 0) + (cal.sonOps ? r.son : 0) + (rel > 0 ? 1 : 0) - (rel < 0 ? 2 : 0);
      if (rx && r.mercury) s += r.mercury;
      if (yeokma && r.yeokma) s += r.yeokma;
      if (s >= 2) {
        const why = [`내 일간 기준 ${tg}, ${TG_THEME[tg]} 날이에요.`];
        if (cal.sonOps && r.son > 0) why.push('손 없는 날이라 전통적으로 좋게 봐요.');
        if (rel > 0) why.push('일진이 내 일지와 합을 이뤄 마음이 편한 날이에요.');
        if (yeokma && r.yeokma) why.push('역마 기운이 드는 날이라 이동하기에 어울려요.');
        const caution = [];
        if (rx && r.mercury) caution.push('수성 역행 중이라 서류와 일정은 꼼꼼히 확인하세요.');
        out[c].push({ y, m, d, score: s, pillar: cal.pillar, tg, sonOps: cal.sonOps, lunar: cal.lunar, rx, why, caution });
      }
    }
  }
  for (const c of TAEKIL_CATS) out[c] = out[c].sort((a, b) => b.score - a.score || (a.y - b.y) || (a.m - b.m) || (a.d - b.d)).slice(0, 3).sort((a, b) => (a.y - b.y) || (a.m - b.m) || (a.d - b.d));
  return out;
}

export { ORDER as ELEMENT_ORDER };

export { TG_EFFECT, TG_LOVE, TG_THEME, TG_REASON, PERSONAL_CAT, PERSONAL_KEY, effectSum, HOURS, ZHI_BONGI };
