// 겹쳐보기 천체·구성기학 규칙 모듈 v0.4
// 천체 위치: astronomy-engine (외부 역행·순행 전환 시점 자료와 0.01° 이내 일치 확인)
// 구성기학 연성·월성, 서양 하우스 의미, 베딕 gochar(목성·토성·달) 규칙은 출처를 확인한 일반 규칙이고,
// 분야(재물·연애·사업·학업·컨디션)로의 배분은 이 앱의 해석이에요.
import * as Astro from 'astronomy-engine';
import * as E from './engine.mjs';

const norm = (x) => ((x % 360) + 360) % 360;
export const BODY = Astro.Body;

/** 지구에서 본 황경(분점·춘분점 기준, 열대 황도) */
export function tropicalLon(body, date) {
  const t = Astro.MakeTime(date);
  const v = Astro.GeoVector(body, t, true);
  return norm(Astro.SphereFromVector(Astro.RotateVector(Astro.Rotation_EQJ_ECT(t), v)).lon);
}
export const siderealLon = (body, date) => norm(tropicalLon(body, date) - E.ayanamsaLahiri(date.getTime()));
export const signOf = (lon) => Math.floor(norm(lon) / 30);
/** 기준 별자리를 1번째로 센 하우스(전체 별자리 하우스) */
export const houseFrom = (planetSign, baseSign) => ((planetSign - baseSign + 12) % 12) + 1;

export const HOUSE_AREA = { 1: '자신·컨디션', 2: '돈·가치관', 3: '소통·학습', 4: '가정', 5: '연애·창작', 6: '일·건강', 7: '관계·파트너십', 8: '공동 자원', 9: '고등교육·먼 여행', 10: '커리어·평판', 11: '인맥·목표', 12: '휴식·마무리' };

// 서양: 목성은 머무는 하우스를 확장, 토성은 제약·책임. 분야 배분은 하우스 의미(1 자신, 2 돈, 3 소통·학습, 5 연애·창작, 6 일·건강, 7 관계, 9 고등교육, 10 커리어, 11 인맥·목표)를 따름
export const JUP_W = { 1: { cond: 1 }, 2: { wealth: 1 }, 3: { study: 1 }, 5: { love: 1 }, 7: { love: 1, biz: 1 }, 9: { study: 1 }, 10: { biz: 1 }, 11: { wealth: 1, biz: 1 } };
export const SAT_W = { 1: { cond: -1 }, 2: { wealth: -1 }, 5: { love: -1 }, 6: { cond: -1 }, 7: { love: -1 }, 10: { biz: -1 } };

// 베딕 gochar(달 별자리 기준): 목성 길한 자리 2·5·7·9·11 / 토성 사데사티 12·1·2, 힘든 자리 4·8, 길한 자리 3·6·11 / 달 강도(찬드라발라) 길 3·6·7·10·11
export const JUP_V = { 2: { wealth: 1 }, 5: { love: 1, study: 1 }, 7: { love: 1, biz: 1 }, 9: { study: 1 }, 11: { wealth: 1, biz: 1 } };
export function saturnVedic(h) {
  const r = {};
  if (h === 12 || h === 1 || h === 2) { r.cond = -1; if (h !== 1) r.wealth = -1; if (h === 1) r.biz = -1; }
  else if (h === 4 || h === 8) r.cond = -1;
  else if (h === 3 || h === 6 || h === 11) r.biz = 1;
  return r;
}
export const CHANDRA_GOOD = [3, 6, 7, 10, 11];
export const CHANDRA_BAD = [2, 4, 5, 8, 9, 12]; // 1번째는 출처마다 달라 제외

// 구성기학
export const NINE_EL = [null, 'water', 'earth', 'wood', 'wood', 'earth', 'metal', 'metal', 'earth', 'fire'];
export const NINE_NAME = ['', '일백수성', '이흑토성', '삼벽목성', '사록목성', '오황토성', '육백금성', '칠적금성', '팔백토성', '구자화성'];
/** 월성: 연성 1·4·7 → 2월(寅月)이 8, 3·6·9 → 5, 2·5·8 → 2에서 시작해 달마다 1씩 내려감. k=0은 2월(절기월) */
export function monthStar(yearStarN, k) {
  const start = [1, 4, 7].includes(yearStarN) ? 8 : [3, 6, 9].includes(yearStarN) ? 5 : 2;
  return ((((start - 1 - k) % 9) + 9) % 9) + 1;
}
/** 내 본명성 오행과 그 시기 중심 별 오행의 관계 → 십성 그룹 이름 */
export function elRel(me, other) {
  if (me === other) return 'peer';
  if (E.GEN[me] === other) return 'output';
  if (E.OVR[me] === other) return 'wealth';
  if (E.OVR[other] === me) return 'power';
  return 'resource';
}
// 구성기학 간이 해석: 상극은 흉(상극 관계를 흉으로 보는 전통)으로 읽고, 상생은 도움으로 읽음
export const KI_EFFECT = { resource: { cond: 1, study: 1 }, output: { biz: 1 }, wealth: { wealth: 1 }, power: { cond: -1, biz: -1 }, peer: { cond: 1 } };
