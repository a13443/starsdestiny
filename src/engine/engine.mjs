// 겹쳐보기 엔진 v0.1 — 사주 · 서양 별자리 · 수비학 · 띠 · 구성기학 · 베딕(시간+장소 필요)
// 의존성: lunar-javascript (MIT), astronomy-engine (MIT)
import LJ from 'lunar-javascript';
import * as Astro from 'astronomy-engine';
import { placeInfo } from './places.mjs';

const { Solar, Lunar } = LJ;

/* ───────── 공통 상수 ───────── */
export const EL = {
  fire:  { ko: '불꽃', cn: '화', color: 'fire' },
  water: { ko: '물결', cn: '수', color: 'water' },
  wood:  { ko: '성장', cn: '목', color: 'wood' },
  metal: { ko: '결단', cn: '금', color: 'metal' },
  earth: { ko: '안정', cn: '토', color: 'earth' },
};
const GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }; // 상생
const OVR = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }; // 상극

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const GAN_KO = ['갑','을','병','정','무','기','경','신','임','계'];
const GAN_EL = ['wood','wood','fire','fire','earth','earth','metal','metal','water','water'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ZHI_KO = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const ZHI_EL = ['water','earth','wood','wood','earth','fire','fire','earth','metal','metal','earth','water'];
const ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];
const ANIMAL_LINE = [
  '눈치 빠르고 기회를 잘 잡는 타입', '묵묵히 끝까지 해내는 뚝심형', '용감하고 주도적인 승부사', '부드럽고 센스 있는 조율가',
  '스케일 크고 자존감 높은 리더형', '신중하고 통찰력 있는 관찰자', '활동적이고 자유로운 에너지', '온화하고 감성이 풍부한 타입',
  '재치 있고 임기응변이 강한 타입', '꼼꼼하고 표현이 분명한 타입', '의리 있고 정직한 신뢰형', '너그럽고 낙천적인 복덩이형',
];

const GZ60 = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);

const DAYMASTER_LINE = [
  '곧게 뻗는 큰 나무 — 시작을 두려워하지 않는 리더형',
  '바람에 휘어도 꺾이지 않는 덩굴 — 유연하게 길을 찾는 적응형',
  '한낮의 태양 — 밝고 숨김없는 분위기 메이커',
  '어둠을 밝히는 촛불 — 섬세하고 집중력 깊은 타입',
  '넓고 묵직한 산 — 중심을 잡아주는 안정형',
  '곡식을 키우는 논밭 — 사람을 품고 돌보는 실속형',
  '단단한 바위와 쇳덩이 — 결단이 빠르고 의리 있는 타입',
  '다듬어진 보석 — 예민하고 기준이 높은 완벽주의형',
  '넓은 강과 바다 — 스케일 크고 자유로운 탐험형',
  '이슬과 봄비 — 직관이 깊고 조용히 스며드는 타입',
];

const SIGNS = ['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','궁수자리','염소자리','물병자리','물고기자리'];
const SIGN_EL = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];
const W2E = { fire: 'fire', earth: 'earth', air: 'wood', water: 'water' }; // 서양 4원소 → 앱 공통 기운 (앱 자체 매핑)
const W_EL_KO = { fire: '불', earth: '흙', air: '공기', water: '물' };
const SIGN_LINE = [
  '먼저 뛰어드는 개척자', '느려도 끝까지 가는 안정 추구형', '호기심 많은 소통가', '정 많고 보호 본능이 강한 타입',
  '무대 체질의 당당한 타입', '디테일을 챙기는 분석가', '균형과 조화를 찾는 중재자', '깊이 몰입하는 승부사',
  '자유를 사랑하는 모험가', '계획대로 쌓아가는 노력가', '독특한 시선의 아이디어 뱅크', '감수성 풍부한 몽상가',
];

const LIFEPATH_LINE = {
  1: '개척 — 스스로 길을 여는 사람', 2: '협력 — 사람 사이를 잇는 사람', 3: '표현 — 생각을 말과 작품으로 푸는 사람',
  4: '안정 — 기초를 단단히 쌓는 사람', 5: '자유 — 변화 속에서 살아나는 사람', 6: '책임 — 돌보고 책임지는 사람',
  7: '탐구 — 혼자 깊이 파고드는 사람', 8: '성취 — 현실에서 결과를 만드는 사람', 9: '포용 — 넓게 품고 나누는 사람',
  11: '직관(마스터 수) — 영감이 예민한 사람', 22: '설계(마스터 수) — 큰 그림을 현실로 짓는 사람', 33: '헌신(마스터 수) — 돌봄과 가르침의 사람',
};

const NINE = [
  null,
  { name: '일백수성', el: 'water', line: '깊이 생각하고 지혜롭게 흐르는 타입' },
  { name: '이흑토성', el: 'earth', line: '받아주고 천천히 키워내는 타입' },
  { name: '삼벽목성', el: 'wood',  line: '활력 있게 시작하는 도전형' },
  { name: '사록목성', el: 'wood',  line: '신뢰와 인연을 넓혀가는 타입' },
  { name: '오황토성', el: 'earth', line: '중심에서 흐름을 이끄는 타입' },
  { name: '육백금성', el: 'metal', line: '원칙과 품격을 지키는 타입' },
  { name: '칠적금성', el: 'metal', line: '즐거움과 말솜씨로 끄는 타입' },
  { name: '팔백토성', el: 'earth', line: '끈기 있게 변화를 만드는 타입' },
  { name: '구자화성', el: 'fire',  line: '열정과 통찰이 큰 타입' },
];

const RASHI_KO = ['양자리(메샤)','황소자리(브리샤바)','쌍둥이자리(미투나)','게자리(카르카)','사자자리(심하)','처녀자리(칸야)','천칭자리(툴라)','전갈자리(브리스치카)','궁수자리(다누)','염소자리(마카라)','물병자리(쿰바)','물고기자리(미나)'];
const NAKSHATRA = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const MOON_LINE = {
  fire: '감정이 빨리 붙고 행동으로 터지는 마음의 결',
  earth: '감정이 차분하고 현실 감각이 앞서는 마음의 결',
  air: '감정을 말과 생각으로 풀어내는 마음의 결',
  water: '감정이 깊고 분위기에 민감한 마음의 결',
};


/* ───────── 시간 유틸 ───────── */
const norm = (x) => ((x % 360) + 360) % 360;
const rad = (x) => (x * Math.PI) / 180;
const deg = (x) => (x * 180) / Math.PI;

function tzOffsetMs(utcMs, tz) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(utcMs));
  const g = (t) => Number(p.find((x) => x.type === t).value);
  const asUTC = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return asUTC - Math.floor(utcMs / 1000) * 1000;
}
/** 현지 시계(년월일시분) → UTC ms. 해당 지역의 역사적 서머타임까지 Intl(IANA)에 맡긴다. */
export function localToUTC(y, m, d, h, mi, tz = 'Asia/Seoul') {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const o1 = tzOffsetMs(guess, tz);
  const o2 = tzOffsetMs(guess - o1, tz);
  return guess - o2;
}
export const beijingParts = (utcMs) => {
  const b = new Date(utcMs + 8 * 3600e3);
  return [b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate(), b.getUTCHours(), b.getUTCMinutes(), 0];
};

/** 음력 입력 → 양력 {y,m,d} (leap=true면 윤달) */
export function lunarToSolar(y, m, d, leap = false) {
  try {
    const s = Lunar.fromYmd(y, leap ? -m : m, d).getSolar();
    // 존재하지 않는 음력(예: 윤달이 없는 해, 29일까지인 달의 30일)은 라이브러리가 조용히 밀어버리므로 되돌려 확인
    const back = s.getLunar();
    const ok = back.getYear() === y && Math.abs(back.getMonth()) === m && back.getDay() === d && (back.getMonth() < 0) === !!leap;
    return ok ? { y: s.getYear(), m: s.getMonth(), d: s.getDay() } : null;
  } catch (e) { return null; }
}

/* ───────── 사주 ───────── */
const pillarObj = (s) => {
  const gi = GAN.indexOf(s[0]), zi = ZHI.indexOf(s[1]);
  return { hanja: s, ko: GAN_KO[gi] + ZHI_KO[zi], ganEl: GAN_EL[gi], zhiEl: ZHI_EL[zi], gi, zi };
};

function pillarsAt({ y, m, d, h, mi, tz }) {
  const utc = localToUTC(y, m, d, h, mi, tz);
  const ecAbs = Solar.fromYmdHms(...beijingParts(utc)).getLunar().getEightChar(); // 절기(연·월 경계)는 절대시각 기준
  const ecLoc = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();    // 일·시 경계는 현지 시계 기준
  return { year: ecAbs.getYear(), month: ecAbs.getMonth(), day: ecLoc.getDay(), time: ecLoc.getTime() };
}

export function saju({ y, m, d, h = null, mi = 0, tz = 'Asia/Seoul' }) {
  const hasTime = h !== null && h !== undefined;
  const P = pillarsAt({ y, m, d, h: hasTime ? h : 12, mi: hasTime ? mi : 0, tz });
  // 시간 미입력일 때 절기 당일 출생이면 연·월주가 시각에 따라 달라질 수 있다
  let uncertain = false;
  if (!hasTime) {
    const a = pillarsAt({ y, m, d, h: 0, mi: 0, tz }), b = pillarsAt({ y, m, d, h: 23, mi: 59, tz });
    uncertain = a.year !== b.year || a.month !== b.month;
  }
  const pillars = { year: pillarObj(P.year), month: pillarObj(P.month), day: pillarObj(P.day), time: hasTime ? pillarObj(P.time) : null };
  const list = Object.values(pillars).filter(Boolean);
  const count = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  list.forEach((p) => { count[p.ganEl]++; count[p.zhiEl]++; });
  const dm = pillars.day.gi;
  return {
    pillars, hasTime, uncertain, count,
    dayMaster: { hanja: GAN[dm], ko: GAN_KO[dm], el: GAN_EL[dm], line: DAYMASTER_LINE[dm] },
    dayBranch: pillars.day.zi,
    yearZhiIdx: pillars.year.zi,
    yearPillarHanja: P.year,
    element: GAN_EL[dm],
  };
}

/* ───────── 서양 별자리(태양궁) — 태양 황경으로 정확 계산 ───────── */
export function westernSun({ y, m, d, h = null, mi = 0, tz = 'Asia/Seoul' }) {
  const hasTime = h !== null && h !== undefined;
  const utc = localToUTC(y, m, d, hasTime ? h : 12, hasTime ? mi : 0, tz);
  const lon = Astro.SunPosition(Astro.MakeTime(new Date(utc))).elon;
  const idx = Math.floor(norm(lon) / 30);
  const within = norm(lon) - idx * 30;
  // 경계 ±0.7° 이내(≈ 하루 내외)면 시각에 따라 바뀔 수 있음
  const cusp = !hasTime && (within < 0.7 || within > 29.3);
  return { idx, name: SIGNS[idx], wEl: SIGN_EL[idx], wElKo: W2E[SIGN_EL[idx]] && W_EL_KO[SIGN_EL[idx]], element: W2E[SIGN_EL[idx]], line: SIGN_LINE[idx], cusp };
}

/* ───────── 수비학(생명수) ───────── */
export function lifePath(y, m, d) {
  let n = String(y) + String(m) + String(d);
  n = n.split('').reduce((a, c) => a + Number(c), 0);
  while (n > 9 && ![11, 22, 33].includes(n)) n = String(n).split('').reduce((a, c) => a + Number(c), 0);
  return { n, line: LIFEPATH_LINE[n] };
}

/* ───────── 띠 · 구성기학 (입춘 기준 연도) ───────── */
function adjustedYear(y, yearPillarHanja) {
  return [y, y - 1].find((Y) => GZ60[(((Y - 4) % 60) + 60) % 60] === yearPillarHanja) ?? y;
}
export function animalSign(yearZhiIdx) {
  return { idx: yearZhiIdx, name: ANIMAL[yearZhiIdx], el: ZHI_EL[yearZhiIdx], hanja: ZHI[yearZhiIdx], line: ANIMAL_LINE[yearZhiIdx], element: ZHI_EL[yearZhiIdx] };
}
export function nineStar(adjYear, gender) {
  if (gender !== 'M' && gender !== 'F') return null;
  let s = String(adjYear).split('').reduce((a, c) => a + Number(c), 0);
  while (s > 9) s = String(s).split('').reduce((a, c) => a + Number(c), 0);
  let n = gender === 'M' ? 11 - s : 4 + s;
  while (n > 9) n -= 9;
  const star = NINE[n];
  return { n, name: star.name, el: star.el, line: star.line, element: star.el, adjYear };
}

/* ───────── 베딕(시간+장소 필요) ───────── */
export const ayanamsaLahiri = (utcMs) => {
  const jy = 2000 + (utcMs - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
  return 23.8531 + 0.013969 * (jy - 2000); // 선형 근사 (±50년 범위에서 편차는 작을 것으로 추정)
};
export function ascendantTropical(utcMs, latDeg, lonDeg) {
  const t = Astro.MakeTime(new Date(utcMs));
  const eps = rad(Astro.e_tilt(t).tobl);
  const ramc = rad(norm(Astro.SiderealTime(t) * 15 + lonDeg));
  const phi = rad(latDeg);
  return norm(deg(Math.atan2(Math.cos(ramc), -(Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(ramc)))));
}
export function vedic({ y, m, d, h, mi = 0, tz = 'Asia/Seoul', lat, lon }) {
  const utc = localToUTC(y, m, d, h, mi, tz);
  const t = Astro.MakeTime(new Date(utc));
  const ay = ayanamsaLahiri(utc);
  const moon = norm(Astro.EclipticGeoMoon(t).lon - ay);
  const sun = norm(Astro.SunPosition(t).elon - ay);
  const ascT = ascendantTropical(utc, lat, lon);
  const asc = norm(ascT - ay);
  const rIdx = Math.floor(moon / 30), nIdx = Math.floor(moon / (360 / 27));
  const pada = Math.floor((moon % (360 / 27)) / ((360 / 27) / 4)) + 1;
  return {
    ayanamsa: ay,
    moon: { idx: rIdx, name: RASHI_KO[rIdx], el: SIGN_EL[rIdx], element: W2E[SIGN_EL[rIdx]], line: MOON_LINE[SIGN_EL[rIdx]], deg: moon - rIdx * 30, lon: moon },
    nakshatra: { idx: nIdx, name: NAKSHATRA[nIdx], pada },
    sun: { idx: Math.floor(sun / 30), name: RASHI_KO[Math.floor(sun / 30)] },
    lagna: { idx: Math.floor(asc / 30), name: RASHI_KO[Math.floor(asc / 30)] },
    ascTropical: ascT,
    element: W2E[SIGN_EL[rIdx]],
  };
}

/* ───────── 통합 프로필 ───────── */
export function profile(input) {
  // input: {y,m,d,h?,mi?,gender?,place?}
  const place = placeInfo(input.place);
  const tz = place ? place[2] : 'Asia/Seoul';
  const base = { y: input.y, m: input.m, d: input.d, h: input.h ?? null, mi: input.mi ?? 0, tz };
  const s = saju(base);
  const adj = adjustedYear(input.y, s.yearPillarHanja);
  const out = {
    input, tz, gender: input.gender || null, birthUTC: localToUTC(input.y, input.m, input.d, s.hasTime ? input.h : 12, s.hasTime ? (input.mi ?? 0) : 0, tz),
    tier: { time: s.hasTime, place: !!place, vedic: s.hasTime && !!place },
    saju: s,
    west: westernSun(base),
    num: lifePath(input.y, input.m, input.d),
    animal: animalSign(s.yearZhiIdx),
    nine: nineStar(adj, input.gender),
    vedic: null,
  };
  if (s.hasTime && place) out.vedic = vedic({ ...base, lat: place[0], lon: place[1] });
  return out;
}

/** 체계별 '기운' 투표 → 교차 일치도 */
export function votes(p) {
  const v = [
    { sys: '사주 일간', el: p.saju.element },
    { sys: '서양 별자리', el: p.west.element },
    { sys: '띠', el: p.animal.element },
  ];
  if (p.nine) v.push({ sys: '구성기학', el: p.nine.element });
  if (p.vedic) v.push({ sys: '베딕 달', el: p.vedic.element });
  const tally = { fire: 0, water: 0, wood: 0, metal: 0, earth: 0 };
  v.forEach((x) => tally[x.el]++);
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return { list: v, tally, top: top[0], total: v.length };
}

/* ───────── 오늘의 한 줄 (오늘 일진 ↔ 내 일간) ───────── */
const DAILY = {
  peer: '나와 같은 기운이 오는 날이에요. 내 페이스를 지키기 좋고, 남과 비교하는 건 잠시 내려놔요.',
  output: '표현하고 싶은 기운이 올라오는 날이에요. 미뤄둔 말이나 아이디어를 꺼내보기 좋아요.',
  wealth: '실속을 챙기기 좋은 날이에요. 돈, 시간 정리 같은 현실적인 일에 힘이 실려요.',
  power: '책임과 평가가 따라오는 날이에요. 할 일 목록을 가볍게 줄이면 한결 편해요.',
  resource: '배움과 도움이 들어오는 날이에요. 조언을 구하거나 새로 읽고 배우기 좋아요.',
};
export function relation(me, other) {
  if (me === other) return 'peer';
  if (GEN[me] === other) return 'output';
  if (OVR[me] === other) return 'wealth';
  if (OVR[other] === me) return 'power';
  return 'resource'; // GEN[other] === me
}
export function today(p, now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600e3);
  const dg = Solar.fromYmdHms(kst.getUTCFullYear(), kst.getUTCMonth() + 1, kst.getUTCDate(), 12, 0, 0).getLunar().getDayInGanZhi();
  const gi = GAN.indexOf(dg[0]);
  const rel = relation(p.saju.element, GAN_EL[gi]);
  return { pillar: dg, ko: GAN_KO[gi] + ZHI_KO[ZHI.indexOf(dg[1])], rel, line: DAILY[rel] };
}

/* ───────── 궁합 ───────── */
const LEVEL = { good: '잘 맞음', ok: '무난', tense: '긴장', info: '참고' };
const SIX_HE = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
const SAN_HE = [[8,0,4],[11,3,7],[2,6,10],[5,9,1]];
const inPair = (pairs, a, b) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const branchRel = (a, b) => {
  if (inPair(SIX_HE, a, b)) return 'good';
  if (SAN_HE.some((g) => g.includes(a) && g.includes(b)) && a !== b) return 'good';
  if ((a - b + 12) % 12 === 6) return 'tense';
  return 'ok';
};
const elemRel = (a, b) => {
  if (a === b) return 'peer';
  if (GEN[a] === b || GEN[b] === a) return 'sheng';
  return 'ke'; // OVR
};
const reduceNum = (n) => { while (n > 9) n = String(n).split('').reduce((s, c) => s + Number(c), 0); return n; };

export function match(a, b) {
  const rows = [];
  // 사주 일간 오행
  const r1 = elemRel(a.saju.element, b.saju.element);
  rows.push({ sys: '사주 · 일간', level: r1 === 'sheng' ? 'good' : r1 === 'peer' ? 'ok' : 'tense',
    text: r1 === 'sheng' ? '한쪽이 다른 쪽을 살려주는 기운이라 서로 힘이 돼요.' : r1 === 'peer' ? '결이 닮아서 편하지만, 자극은 적을 수 있어요.' : '서로 부딪히는 기운이라 말투와 속도 조절이 필요해요.' });
  // 사주 일지
  const bd = branchRel(a.saju.dayBranch, b.saju.dayBranch);
  rows.push({ sys: '사주 · 일지', level: bd,
    text: bd === 'good' ? '일지가 합을 이루는 조합이에요. 같이 있으면 편안한 쪽이에요.' : bd === 'tense' ? '일지가 정반대에 놓여요. 생활 리듬이 다를 수 있어요.' : '일지 사이에 특별한 합이나 충은 없어요.' });
  // 서양 별자리 원소
  const wa = a.west.wEl, wb = b.west.wEl;
  const wGood = (wa === 'fire' && wb === 'air') || (wa === 'air' && wb === 'fire') || (wa === 'earth' && wb === 'water') || (wa === 'water' && wb === 'earth');
  const wl = wa === wb ? 'ok' : wGood ? 'good' : 'tense';
  rows.push({ sys: '서양 별자리', level: wl,
    text: wa === wb ? '같은 원소라 통하는 게 많아요.' : wGood ? '원소 궁합이 잘 맞아요. (불–공기, 흙–물)' : '원소가 달라서 서로를 신기해하거나 답답해할 수 있어요.' });
  // 띠
  const ar = branchRel(a.animal.idx, b.animal.idx);
  rows.push({ sys: '띠', level: ar,
    text: ar === 'good' ? '삼합이나 육합으로 이어지는 띠 조합이에요.' : ar === 'tense' ? '띠가 서로 충하는 위치예요. 의견 충돌에 유의해요.' : '띠 사이에 특별한 합이나 충은 없어요.' });
  // 구성기학
  if (a.nine && b.nine) {
    const r = elemRel(a.nine.element, b.nine.element);
    rows.push({ sys: '구성기학', level: r === 'sheng' ? 'good' : r === 'peer' ? 'ok' : 'tense',
      text: r === 'sheng' ? '본명성 오행이 서로를 살려줘요.' : r === 'peer' ? '본명성 오행이 같아서 닮은 점이 많아요.' : '본명성 오행이 맞부딪히는 관계예요.' });
  }
  // 수비학: 두 수를 합친 관계수 (점수 집계 제외)
  const rn = reduceNum(a.num.n + b.num.n);
  rows.push({ sys: '수비학', level: 'info', text: `두 사람의 숫자를 더해 줄인 관계수 ${rn} · ${LIFEPATH_LINE[rn]}` });
  const t = { good: 0, ok: 0, tense: 0 };
  rows.forEach((r) => { if (t[r.level] !== undefined) t[r.level]++; });
  return { rows, tally: t, total: t.good + t.ok + t.tense, LEVEL };
}

export { GAN, GAN_KO, ZHI, ZHI_KO, GAN_EL, ZHI_EL, SIGNS, SIGN_EL, RASHI_KO, NAKSHATRA, GZ60, W_EL_KO, W2E, GEN, OVR, ANIMAL, LIFEPATH_LINE };
