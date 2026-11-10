// 겹쳐보기 상세 서술 엔진: 궁합(matchDetail)과 10년 대운(daewoonDetail)
// 규칙은 출처로 확인한 것만 써요(천간합·천간충·궁위·육합·삼합·충·형·오행 상생상극).
// 문구는 모두 이 앱의 해석이고, 매매 시점·업종 추천·질병·이혼 같은 단정적 표현은 쓰지 않아요.
import * as E from './engine.mjs';
import * as F from './fortune.mjs';
import { gcField } from './narrative.mjs';

const { GAN, GAN_KO, ZHI, ZHI_KO, ZHI_EL, GEN, OVR, LIFEPATH_LINE, W_EL_KO } = E;

/* ───────── 공통 도우미 ───────── */
const EL_NAME = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
const EL_KO = { wood: '성장', fire: '불꽃', earth: '안정', metal: '결단', water: '물결' };
const EL_TRAIT = {
  wood: '새로 시작하고 뻗어 나가는 힘', fire: '표현하고 열정을 내는 힘', earth: '중심을 잡고 받아 주는 힘',
  metal: '맺고 끊으며 정리하는 힘', water: '깊이 생각하고 유연하게 흐르는 힘',
};
const el = (k) => `${EL_NAME[k]}(${EL_KO[k]})`;
const lastHangul = (w) => [...String(w)].reverse().find((c) => /[가-힣]/.test(c));
const hasB = (w) => { const c = lastHangul(w); return c ? (c.charCodeAt(0) - 0xac00) % 28 !== 0 : false; };
const iga = (w) => (hasB(w) ? '이' : '가');
const eunneun = (w) => (hasB(w) ? '은' : '는');
const eulreul = (w) => (hasB(w) ? '을' : '를');
const gwawa = (w) => (hasB(w) ? '과' : '와');
const isRieul = (w) => { const c = lastHangul(w); return c ? (c.charCodeAt(0) - 0xac00) % 28 === 8 : false; };
const euro = (w) => (hasB(w) && !isRieul(w) ? '으로' : '로');
const LV = { good: '잘 맞음', ok: '무난', tense: '긴장', info: '참고' };

/** 나(a) 기준으로 상대(b) 오행과의 관계 방향 */
function elDir(ea, eb) {
  if (ea === eb) return 'peer';
  if (GEN[ea] === eb) return 'aGives'; // 내가 상대를 살림
  if (GEN[eb] === ea) return 'bGives'; // 상대가 나를 살림
  if (OVR[ea] === eb) return 'aOver'; // 내가 상대를 극함
  return 'bOver'; // 상대가 나를 극함
}
const levelOf = (score) => (score > 0 ? 'good' : score < 0 ? 'tense' : 'ok');

/* ───────── 십성: 상대가 내게 어떤 자리인지 ───────── */
const TG_REL = {
  비견: '나와 같은 결이라 말이 잘 통하는 동료 같은 사이예요. 편하지만 서로 양보 없이 맞서면 자존심 싸움이 되기 쉬워요.',
  겁재: '같은 기운인데 음양이 달라 서로의 승부욕을 자극하는 사이예요. 함께 성장하는 라이벌처럼 힘이 되기도 하지만, 역할과 비용의 기준은 미리 정해 두는 편이 좋아요.',
  식신: '내가 편안하게 표현하고 챙겨 주고 싶어지는 사이예요. 함께 있으면 여유가 생기고 내 재능이 자연스럽게 열려요.',
  상관: '내가 솔직하게 말하고 자극을 주고 싶어지는 사이예요. 재치와 솔직함이 매력이지만 직설이 상처가 되지 않게 말투를 살펴야 해요.',
  편재: '내가 더 넓게 챙기고 이끌고 싶어지는 사이예요. 새로운 경험을 함께하기 좋지만 한쪽이 끌고 가는 느낌이 들 수 있어요.',
  정재: '내가 차분하고 현실적으로 챙기고 싶어지는 사이예요. 생활 속 돌봄과 신뢰가 쌓이기 좋은 조합이에요.',
  편관: '내게 긴장감과 자극을 주는 사이예요. 나를 성장시키는 도전이 되기도 하지만 압박으로 느껴질 땐 거리를 조절해요.',
  정관: '내게 기준과 책임감을 일깨우는 사이예요. 믿음직하고 예의 있는 관계를 만들기 좋지만 기대가 커지면 답답할 수 있어요.',
  편인: '내게 영감과 새로운 시각을 주는 사이예요. 독특한 취향을 이해해 주지만 마음의 거리가 멀게 느껴질 때도 있어요.',
  정인: '내게 안정감과 배움을 주는 사이예요. 기대고 싶어지는 따뜻함이 있지만 지나치게 의존하지 않도록 균형을 잡아요.',
};
const SPOUSE_STAR = { M: ['편재', '정재'], F: ['편관', '정관'] };

/* ───────── 일간 오행 관계(방향 포함) ───────── */
function dirTexts(ea, eb) {
  const A = el(ea), B = el(eb);
  const peerNote = ['wood', 'fire', 'metal'].includes(ea)
    ? '한 명리 해설에서는 같은 오행이어도 나무·불·쇠처럼 뻗어 나가는 기운은 서로 자존심을 내세우기 쉽다고 봐요. 의견이 갈릴 땐 누가 맞는지보다 어떻게 맞출지를 먼저 이야기해 보세요.'
    : '한 명리 해설에서는 물·흙처럼 받아들이는 기운끼리는 서로 포용해서 비교적 무난하게 지낸다고 봐요. 편안함이 크니 변화를 주는 노력만 더해 주면 좋아요.';
  return {
    peer: {
      headline: '같은 오행이라 결이 닮은 관계예요',
      p: `두 사람의 일간 오행이 모두 ${A}이에요. 말하지 않아도 통하는 부분이 많아 편하지만, 닮은 만큼 약점도 겹쳐 보여서 서로의 단점이 더 크게 느껴질 수 있어요. ${peerNote}`,
      good: ['생각하는 방식과 속도가 비슷해 대화가 편해요.', '서로의 마음을 설명하지 않아도 이해받는다고 느끼기 쉬워요.'],
      watch: ['닮은 약점이 겹치면 같은 문제로 같이 흔들릴 수 있어요.', '자극이 적어 관계가 단조롭게 느껴질 수 있어요.'],
    },
    aGives: {
      headline: `내가 상대를 키워 주는 상생 관계예요`,
      p: `내 ${A}${iga(A)} 상대의 ${B}${eulreul(B)} 키워 주는 상생 관계예요. 내가 챙기고 북돋아 주는 쪽, 상대가 그 힘을 받아 자라는 쪽이라 상대는 내 곁에서 안정감을 느끼기 쉬워요. 다만 주는 쪽이 계속 지치지 않으려면 받는 쪽의 고마움 표현과 서로 주고받는 균형이 필요해요.`,
      good: ['내가 먼저 챙겨 줄 때 상대가 크게 힘을 얻어요.', '상대가 성장하는 모습이 관계의 보람이 돼요.'],
      watch: ['내가 주기만 하는 구조가 되면 어느 순간 지칠 수 있어요.', '상대가 당연하게 받는 습관이 생기지 않게 서로 표현해요.'],
    },
    bGives: {
      headline: `상대가 나를 키워 주는 상생 관계예요`,
      p: `상대의 ${B}${iga(B)} 내 ${A}${eulreul(A)} 키워 주는 상생 관계예요. 상대 곁에 있으면 힘이 나고 내가 가진 것이 자연스럽게 자라는 느낌을 받기 쉬워요. 다만 받는 쪽은 상대에게 기대는 정도가 커지지 않도록, 나도 챙기는 마음을 표현하며 균형을 맞춰 주세요.`,
      good: ['상대 곁에서 안정감과 응원을 받아요.', '내가 가진 재능과 의욕이 자연스럽게 커져요.'],
      watch: ['상대에게 기대는 정도가 커지면 상대가 부담을 느낄 수 있어요.', '받는 것에 익숙해지지 않게 고마움을 말로 표현해요.'],
    },
    aOver: {
      headline: '내 기운이 상대를 누르는 상극 관계예요',
      p: `내 ${A}${iga(A)} 상대의 ${B}${eulreul(B)} 누르는 상극 관계예요. 내가 의도하지 않아도 말과 속도가 상대에게는 압박으로 느껴질 수 있어요. 한편으로는 방향을 잡아 주고 자극을 주는 힘이기도 해서, 결정을 이끄는 쪽이 부드러운 말투와 선택권을 건네면 좋은 균형이 돼요.`,
      good: ['내가 방향을 잡아 주면 상대가 결단을 내리기 쉬워요.', '적당한 긴장이 서로를 단련시켜요.'],
      watch: ['내 말투가 단호하게 들려 상대가 위축될 수 있어요.', '결정을 내가 도맡지 않게 상대의 의견을 먼저 물어요.'],
    },
    bOver: {
      headline: '상대의 기운이 나를 누르는 상극 관계예요',
      p: `상대의 ${B}${iga(B)} 내 ${A}${eulreul(A)} 누르는 상극 관계예요. 내가 위축되거나 상대에게 맞춰야 한다고 느끼기 쉬워요. 하지만 이런 긴장은 서로를 단련시키는 힘이기도 해요. 내 의견을 짧고 분명하게 말하는 연습을 하면 관계가 훨씬 편해져요.`,
      good: ['상대 덕분에 내가 더 단단해지고 정리하는 힘이 생겨요.', '적당한 긴장이 게으름을 막아 줘요.'],
      watch: ['말하지 않고 참으면 서운함이 쌓여요.', '상대의 속도에 끌려가지 않게 내 페이스를 정해 두어요.'],
    },
  };
}

// 일간 오행 관계(방향)별로 실제 대화·결정 장면에서 어떻게 나타나는지
const DIR_SCENES = {
  peer: [
    '계획을 정할 때는 서로 말하지 않아도 비슷한 안을 떠올려서 의견이 빨리 모여요. 반대로 서로 다른 안이 나오면 물러서지 않아 팽팽해지기도 해요.',
    '힘든 일이 생기면 상대의 마음이 어떤지 설명을 듣지 않아도 알아채요. 다만 둘 다 같은 방식으로 지치기 쉬워서, 한 명이라도 기운을 내 줄 외부 도움을 찾아 두면 좋아요.',
  ],
  aGives: [
    '약속을 잡거나 일정을 챙길 때 내가 먼저 움직이는 경우가 많고, 상대는 그 덕분에 마음이 편해져요. 상대가 고마움을 표현해 주면 내 쪽의 힘도 다시 차올라요.',
    '상대가 고민을 털어놓을 때 내가 해결해 주고 싶어지기 쉬워요. 해결보다 먼저 들어주는 시간을 가지면 상대는 더 깊이 안정감을 느껴요.',
  ],
  bGives: [
    '일정이나 약속을 상대가 먼저 챙겨 주는 경우가 많아서 내가 편하게 따라갈 수 있어요. 그 편안함이 당연해지지 않도록 가끔은 내가 먼저 계획을 세워 보세요.',
    '내가 힘들 때 상대가 곁에서 흐름을 되살려 줘요. 상대가 지칠 때는 내가 같은 방식으로 돌려주는 시간을 만들어 주면 관계가 오래 균형을 유지해요.',
  ],
  aOver: [
    '의견이 갈릴 때 내가 정리하듯 결론을 내리면 상대는 말할 틈이 없다고 느낄 수 있어요. 결론 전에 상대의 이유를 먼저 한 번 물어 주세요.',
    '상대가 망설이는 순간 내가 방향을 잡아 주면 힘이 되기도 해요. 선택지를 두 개 정도 건네고 고르게 하면 눌린다는 느낌 없이 도움이 돼요.',
  ],
  bOver: [
    '의견이 갈릴 때 상대의 결론이 빨라서 내가 따라가는 느낌이 들 수 있어요. 마음에 걸리는 지점은 그 자리에서 짧게 말해 두면 쌓이지 않아요.',
    '상대가 방향을 잡아 주면 흔들릴 때 큰 도움이 돼요. 다만 모든 결정을 상대에게 맡기지 말고 내가 정하는 몫을 일부러 만들어 두세요.',
  ],
};
// 오행이 채워질 때 일상에서 어떤 도움이 되는지
const FILL_DAILY = {
  wood: '새로운 일을 시작할 때 망설임이 줄고, 한 걸음 먼저 움직이는 용기가 생겨요.',
  fire: '표현이 풍부해지고 분위기가 밝아져서 사소한 일에도 웃을 일이 늘어요.',
  earth: '마음의 중심이 잡히고, 의견이 갈릴 때 중재하는 힘이 생겨요.',
  metal: '미루던 일을 매듭짓고 선을 긋는 힘이 생겨서 생활이 정돈돼요.',
  water: '조급함이 가라앉고 상황을 한 번 더 생각해 보는 여유가 생겨요.',
};

const HAP_RESULT = ['흙', '쇠', '물', '나무', '불']; // 갑기합토 을경합금 병신합수 정임합목 무계합화
function pairName(ga, gb) { return `${GAN_KO[ga]}${GAN[ga]}${eunneun(GAN_KO[ga]) === '은' ? '과' : '와'} ${GAN_KO[gb]}${GAN[gb]}`; }

/* ───────── 지지 관계 ───────── */
function branchStory(tags, palace) {
  // palace: { name, domain, who:[한글 지지a, 지지b], what }
  const out = { p: [], good: [], watch: [] };
  const pair = `${palace.who[0]}${gwawa(palace.who[0])} ${palace.who[1]}`;
  if (tags.includes('육합')) {
    out.p.push(`${palace.name}가 육합이에요(${pair}). 서로 끌어당기는 조합이라 곁에 있으면 마음이 편안하고 맞춰 가기 쉬워요. ${palace.hap}`);
    out.good.push(palace.hapGood);
  }
  if (tags.includes('삼합')) {
    out.p.push(`${palace.name}가 같은 삼합 그룹이에요(${pair}). 목표와 분위기가 잘 맞아서 함께하면 힘이 커지는 팀 같은 관계예요. ${palace.sam}`);
    out.good.push(palace.samGood);
  }
  if (tags.includes('충')) {
    out.p.push(`${palace.name}가 서로 정반대에서 충을 이뤄요(${pair}). ${palace.chung}`);
    out.watch.push(palace.chungWatch);
  }
  if (tags.includes('형')) {
    out.p.push(`${palace.name}가 형을 이뤄요(${pair}). ${palace.hyeong}`);
    out.watch.push(palace.hyeongWatch);
  }
  if (tags.includes('자형')) {
    out.p.push(`${palace.name}가 같은 지지로 자형이에요(${pair}). ${palace.za}`);
    out.watch.push(palace.zaWatch);
  }
  if (!out.p.length) {
    out.p.push(`${palace.name} 사이에는 특별한 합이나 충이 없어요(${pair}). 큰 끌림도 큰 충돌도 없는 평탄한 조합이라, ${palace.none}`);
  }
  return out;
}
const PALACE = {
  day: {
    name: '일지', domain: '배우자 자리와 일상',
    hap: '생활 리듬과 애정 표현 방식이 자연스럽게 겹치는 편이에요.',
    hapGood: '같이 있는 시간이 편하고 일상의 호흡이 잘 맞아요.',
    sam: '함께 있을 때 서로의 장점이 더해져 일상에서도 든든한 파트너가 돼요.',
    samGood: '일상의 목표와 분위기가 비슷해 한 팀처럼 움직여요.',
    chung: '생활 리듬과 가치관이 다르게 움직여서 일상에서 자주 부딪힐 수 있어요. 대신 서로에게 없는 면을 보여 주는 자극이 되기도 해요. 연락 빈도, 집안일, 쉬는 방식처럼 일상의 약속을 구체적으로 정해 두면 훨씬 편해져요.',
    chungWatch: '생활 습관과 쉬는 방식의 차이가 반복해서 부딪힐 수 있어요. 일상의 규칙을 같이 정해 두세요.',
    hyeong: '서로 모르게 예민한 곳을 건드려서 작은 일이 오래 남을 수 있어요. 서운함을 쌓아 두지 말고 그날 가볍게 풀어 주세요.',
    hyeongWatch: '말투와 사소한 행동이 상대의 예민한 곳을 건드릴 수 있어요. 서운함은 바로 이야기해요.',
    za: '서로의 습관과 단점이 닮아서 거울을 보는 것처럼 답답해질 수 있어요. 닮은 부분을 웃음으로 넘기는 여유가 필요해요.',
    zaWatch: '닮은 단점이 서로에게 비쳐 답답함이 커질 수 있어요.',
    none: '관계의 온도는 두 사람이 만들어 가는 몫이 커요. 함께 하는 습관과 작은 이벤트가 큰 차이를 만들어요.',
  },
  month: {
    name: '월지', domain: '집안 환경과 사회적 환경',
    hap: '자라 온 환경이나 일에 대한 가치관이 비슷하게 흘러서 현실적인 이야기가 잘 통해요.',
    hapGood: '직업관과 생활 기준이 비슷해 현실 문제를 의논하기 편해요.',
    sam: '사회생활과 가족 관계를 바라보는 시선이 닮아서 서로의 환경을 이해하기 쉬워요.',
    samGood: '서로의 사회적 환경을 이해하고 지지해 줘요.',
    chung: '자란 환경과 일하는 방식, 가족을 대하는 기준이 달라서 현실적인 선택에서 의견이 갈릴 수 있어요. 어느 쪽이 맞는지 가르기보다 서로의 배경을 설명해 주는 대화가 도움이 돼요.',
    chungWatch: '직업관·가족 문제처럼 현실적인 선택에서 의견이 갈릴 수 있어요. 배경을 먼저 설명해 주세요.',
    hyeong: '서로의 환경에서 오는 기대와 눈치가 엇갈리기 쉬워요. 가족이나 직장 이야기는 판단보다 공감을 먼저 해 주세요.',
    hyeongWatch: '가족·직장 이야기에서 예민한 반응이 오갈 수 있어요.',
    za: '같은 환경에서 온 듯한 습관이 서로 닮아 있어요. 닮은 점이 장점도 단점도 되니 서로의 역할을 나눠 보세요.',
    zaWatch: '현실 문제에서 같은 방식으로 막힐 수 있어요.',
    none: '현실 문제는 두 사람이 이야기하며 기준을 만들어 가는 몫이 커요.',
  },
  year: {
    name: '연지(띠)', domain: '첫인상과 집안 분위기',
    hap: '처음 만났을 때의 인상과 집안 분위기가 편안하게 맞는 편이에요.',
    hapGood: '첫인상부터 호감이 가고 주변에서도 잘 어울린다는 말을 듣기 쉬워요.',
    sam: '같은 방향의 에너지를 가진 띠라서 함께 있으면 서로를 밀어 주는 힘이 있어요.',
    samGood: '같은 방향을 바라보며 서로를 밀어 주는 힘이 있어요.',
    chung: '서로 정반대 위치의 띠라 처음에는 끌려도 나중에 의견 차이가 도드라질 수 있어요. 다름을 매력으로 받아들이면 오히려 서로를 넓혀 주는 사이가 돼요.',
    chungWatch: '의견 충돌이 생길 때 상대를 바꾸려 하기보다 다름을 인정하는 대화가 필요해요.',
    hyeong: '서로 모르게 부담을 주고받기 쉬운 띠 조합이에요. 기대는 말로 확인하고 오해는 빨리 풀어 주세요.',
    hyeongWatch: '말하지 않은 기대가 서로에게 부담이 될 수 있어요.',
    za: '같은 띠끼리 닮은 점이 많아 편하지만 같은 약점이 반복돼요. 서로의 거울이 되어 주는 사이예요.',
    zaWatch: '닮은 약점이 반복되어 같이 지칠 수 있어요.',
    none: '띠만으로는 크게 끌리거나 부딪히는 면이 없어요. 사주의 다른 부분이 관계의 색을 더 크게 정해요.',
  },
};

/* ───────── 지지 관계 유형별: 시점별 모습 ───────── */
// 같은 관계라도 만난 지 얼마나 됐는지, 어떤 상황인지에 따라 다르게 나타나요. 자리(일지·월지·띠)마다 영역 어휘를 바꿔 써요.
const TIMELINE = {
  육합: (d) => [
    `처음 만났을 때는 ${d.area}에서 말이 잘 통하고 서로를 편하게 느끼기 쉬워요. 낯가림이 줄고 금방 가까워져요.`,
    `오래 만나면 ${d.area}에서 서로의 습관이 자연스럽게 겹쳐 가요. 같이 있는 것이 당연해지는 만큼 고마움을 말로 표현하는 습관이 필요해요.`,
    `갈등이 생겨도 풀리는 속도가 빠른 편이에요. 다만 편하다는 이유로 ${d.care}을 소홀히 하지 않는 게 중요해요.`,
  ],
  삼합: (d) => [
    `처음에는 ${d.area}에서 같은 방향을 보는 느낌이 들어 의기투합이 빨라요.`,
    `오래 만나면 ${d.area}에서 서로의 장점이 더해져 한 팀처럼 움직여요. 함께 목표를 세우면 혼자일 때보다 힘이 커져요.`,
    `갈등이 생겨도 큰 방향이 같아서 다시 모이기 쉬워요. 다만 같은 목표에만 몰두해 ${d.care}을 놓치지 않게 살펴보세요.`,
  ],
  충: (d) => [
    `처음에는 ${d.area}에서 서로 다른 모습이 신선하고 끌려서 호기심이 커요.`,
    `오래 만나면 ${d.area}의 차이가 점점 도드라져요. 처음엔 매력이던 점이 답답함으로 바뀌기도 하니, 다름을 설명하는 대화를 미루지 마세요.`,
    `갈등이 생기면 서로 정반대로 움직이려 해서 크게 부딪히기 쉬워요. 감정이 올라올 땐 잠깐 떨어져 숨을 돌린 뒤 ${d.care}부터 다시 맞춰 보세요.`,
    `이 충은 서로를 흔드는 힘이면서 시야를 넓혀 주는 힘이기도 해요. 상대의 방식 하나를 일부러 따라 해 보면 의외로 잘 맞는 부분이 생겨요.`,
  ],
  형: (d) => [
    `처음에는 ${d.area}에서 큰 문제 없이 지내다가, 가까워질수록 서로의 예민한 곳을 건드리는 일이 생겨요.`,
    `오래 만나면 말하지 않은 기대와 작은 서운함이 쌓여 ${d.area}에서 어색함이 생기기 쉬워요. 사소한 일도 그날 안에 가볍게 풀어 주세요.`,
    `갈등이 생기면 정면 충돌보다 마음속에 오래 남는 방식으로 나타나요. 시간이 지난 뒤 다시 꺼내기보다 그때그때 ${d.care}을 확인하는 편이 좋아요.`,
  ],
  자형: (d) => [
    `처음에는 ${d.area}에서 서로 닮은 점이 많아 편하고 통하는 느낌이 들어요.`,
    `오래 만나면 닮은 약점이 서로에게 비쳐 같은 문제로 반복해서 막힐 수 있어요. 내가 싫은 습관을 상대에게서 볼 때 상대를 탓하기보다 나를 돌아보는 계기로 삼아 보세요.`,
    `갈등이 생기면 서로의 단점이 거울처럼 커져 답답함이 깊어지기 쉬워요. 웃음으로 넘기는 여유와 ${d.care}을 의식적으로 챙기는 습관이 도움이 돼요.`,
  ],
  없음: (d) => [
    `처음에는 ${d.area}에서 뚜렷한 끌림이나 부딪힘 없이 평범하게 시작해요.`,
    `오래 만나면 ${d.area}의 모습이 두 사람이 어떻게 쌓아 가느냐에 따라 달라져요. 정해진 방향이 없는 만큼 함께 만드는 습관이 큰 차이를 만들어요.`,
    `갈등이 생겨도 이 부분이 원인이 되는 경우는 드물어요. 문제가 생기면 다른 항목에서 원인을 찾아보는 편이 정확해요.`,
  ],
};
const TIMELINE_AREA = {
  day: { area: '일상과 친밀감', care: '일상의 작은 배려' },
  month: { area: '현실 문제와 가치관', care: '서로의 환경에 대한 이해' },
  year: { area: '첫인상과 주변 분위기', care: '서로의 가족·주변에 대한 존중' },
};

/* ───────── 서양 별자리 원소 ───────── */
const W_PAIR = {
  'fire-fire': ['같은 불 원소라 열정과 속도가 닮았어요', '둘 다 불 원소라 에너지와 추진력이 닮았어요. 함께하면 분위기가 금방 달아오르고 도전도 즐거워요. 다만 둘 다 급해서 다툼도 순식간에 커질 수 있으니 한 템포 쉬는 규칙이 필요해요.'],
  'earth-earth': ['같은 흙 원소라 현실 감각이 닮았어요', '둘 다 흙 원소라 안정과 현실을 중요하게 봐요. 생활 계획과 돈 관리, 약속 지키는 방식이 잘 맞아요. 다만 변화를 두려워해 관계가 단조로워질 수 있으니 작은 새로움을 주기적으로 더해 보세요.'],
  'air-air': ['같은 공기 원소라 대화가 잘 통해요', '둘 다 공기 원소라 이야기와 생각을 나누는 걸 좋아해요. 대화 주제가 끝없이 이어지고 서로를 지적으로 자극해요. 다만 감정 이야기가 가볍게 지나갈 수 있어 마음을 표현하는 시간을 따로 두면 좋아요.'],
  'water-water': ['같은 물 원소라 감정이 깊이 통해요', '둘 다 물 원소라 감정의 결을 잘 알아채요. 말하지 않아도 기분을 읽고 서로를 감싸 줘요. 다만 같이 가라앉기 쉬워서 한쪽이 힘들 때 바깥 활동으로 환기시켜 주는 연습이 필요해요.'],
  'air-fire': ['불과 공기가 서로를 키워 주는 조합이에요', '공기가 불을 키우듯 한쪽의 아이디어와 다른 쪽의 열정이 서로를 북돋아요. 새로운 계획을 함께 세우고 실행하기에 좋은 조합이에요. 다만 둘 다 들뜨기 쉬워서 마무리와 현실 점검은 의식적으로 챙겨 주세요.'],
  'earth-water': ['흙과 물이 서로를 받쳐 주는 조합이에요', '물이 흙을 촉촉하게 하고 흙이 물을 담아 주듯 감정과 현실이 서로를 받쳐 줘요. 정서적 안정과 생활 안정이 함께 오는 조합이에요. 다만 변화가 적어질 수 있어 가끔은 새로운 경험을 같이 해 보세요.'],
  'fire-water': ['불과 물이라 서로 식히고 끓이는 조합이에요', '불의 직진과 물의 감정이 부딪히면 한쪽은 식고 한쪽은 끓는 느낌이 들 수 있어요. 불은 물의 속도를 기다려 주고, 물은 마음을 말로 꺼내 주면 서로에게 없는 면을 배우는 사이가 돼요.'],
  'air-earth': ['공기와 흙이라 이상과 현실이 엇갈리기 쉬워요', '공기의 가벼운 아이디어와 흙의 현실 감각이 서로 답답하게 느껴질 수 있어요. 아이디어는 현실 점검을 받고, 현실은 새로운 시도를 열어 주면 서로를 넓혀 주는 사이가 돼요.'],
  'earth-fire': ['불과 흙이라 속도와 신중함이 다른 조합이에요', '불의 빠른 추진과 흙의 신중한 속도가 어긋나기 쉬워요. 불은 흙의 확인 과정을 존중하고, 흙은 불의 도전에 한 번은 올라타 보면 좋은 균형이 생겨요.'],
  'air-water': ['공기와 물이라 이성과 감정의 온도가 달라요', '공기는 말로 정리하고 물은 마음으로 느껴서 같은 일을 다르게 받아들이기 쉬워요. 공기는 해결책보다 공감을 먼저, 물은 느낌을 짧은 말로 풀어 주면 대화가 훨씬 편해져요.'],
};
const wKey = (a, b) => (a === b ? `${a}-${a}` : [a, b].sort().join('-'));

/* ───────── 수비학 관계수 ───────── */
const REL_NUM = {
  1: ['개척 — 둘이 함께 새 길을 여는 조합이에요', '함께하면 새로운 시작과 방향 정하기에 힘이 나요. 다만 서로 주도권을 잡으려 할 수 있으니 영역을 나누면 좋아요.'],
  2: ['협력 — 서로를 잇고 맞춰 가는 조합이에요', '배려와 조율이 중심이 되는 관계예요. 다만 서로 눈치를 보다 속마음을 미룰 수 있으니 필요한 말은 분명히 해요.'],
  3: ['표현 — 함께 웃고 이야기하며 즐거운 조합이에요', '대화와 표현이 풍부해서 분위기가 밝아요. 다만 가볍게 지나친 말이 오해를 만들 수 있으니 중요한 이야기는 차분하게 해요.'],
  4: ['안정 — 기초를 함께 단단히 쌓는 조합이에요', '약속과 계획을 지키며 신뢰를 쌓는 관계예요. 다만 변화가 적어 답답해질 수 있으니 가끔 새로운 경험을 더해요.'],
  5: ['자유 — 변화와 새로움이 많은 조합이에요', '함께하면 여행·도전처럼 활기찬 경험이 늘어요. 다만 자주 흔들릴 수 있으니 기본 약속은 단단히 정해 두어요.'],
  6: ['책임 — 서로를 돌보고 책임지는 조합이에요', '가정적이고 따뜻한 관계가 되기 쉬워요. 다만 과하게 챙기다 서로 부담이 될 수 있으니 각자의 시간을 존중해요.'],
  7: ['탐구 — 깊이 이해하고 생각을 나누는 조합이에요', '혼자만의 시간이 필요한 두 사람이 서로의 거리를 존중해 줄 수 있어요. 다만 마음을 말하지 않으면 멀게 느껴질 수 있어요.'],
  8: ['성취 — 현실에서 함께 결과를 만드는 조합이에요', '목표를 세우고 이루는 힘이 큰 관계예요. 다만 성과에만 몰두하면 감정 돌봄이 소홀해질 수 있어요.'],
  9: ['포용 — 서로를 넓게 품는 조합이에요', '이해심이 크고 서로의 다름을 받아 주는 관계예요. 다만 마무리를 미루지 않고 감정도 꼭 표현해요.'],
};
const reduceNum = (n) => { while (n > 9) n = String(n).split('').reduce((s, c) => s + Number(c), 0); return n; };

/* ───────── 사람 카드 ───────── */
function personCard(p, label) {
  const s = p.saju, P = s.pillars;
  const gi = P.day.gi, zi = P.day.zi;
  return {
    label,
    pillars: [['time', '시주'], ['day', '일주'], ['month', '월주'], ['year', '연주']].map(([k, l]) => (P[k] ? { label: l, hanja: P[k].hanja, ko: P[k].ko } : { label: l, hanja: null, ko: null })),
    dayMaster: { ko: GAN_KO[gi], hanja: GAN[gi], element: s.element, elementName: el(s.element) },
    dayBranch: { ko: ZHI_KO[zi], hanja: ZHI[zi] },
    animal: `${p.animal.name}띠`,
    west: { name: p.west.name, element: W_EL_KO[p.west.wEl] ? `${W_EL_KO[p.west.wEl]} 원소` : p.west.wEl },
    num: p.num.n,
    nine: p.nine ? p.nine.name : null,
    vedicMoon: p.vedic ? p.vedic.moon.name : null,
    count: s.count,
    hasTime: !!s.hasTime,
  };
}

/* ───────── 항목별 서술 ───────── */
function secIlgan(a, b) {
  const ga = a.saju.pillars.day.gi, gb = b.saju.pillars.day.gi;
  const ea = a.saju.element, eb = b.saju.element;
  const dir = elDir(ea, eb), D = dirTexts(ea, eb)[dir];
  const hap = Math.abs(ga - gb) === 5, chung = Math.abs(ga - gb) === 6;
  const tgAB = F.tenGod(ga, gb), tgBA = F.tenGod(gb, ga);
  const score = (hap ? 1 : 0) - (chung ? 1 : 0) + (dir === 'aGives' || dir === 'bGives' ? 1 : dir === 'peer' ? 0 : -1);
  const paragraphs = [
    `일간은 사주의 주인공이라 타고난 기질과 서로를 대하는 기본 태도를 보여 주는 자리예요. 나는 ${GAN_KO[ga]}${GAN[ga]} 일간으로 ${el(ea)} 기운, 상대는 ${GAN_KO[gb]}${GAN[gb]} 일간으로 ${el(eb)} 기운이에요.`,
    D.p,
  ];
  const good = D.good.slice(), watch = D.watch.slice();
  if (hap) {
    const res = HAP_RESULT[Math.min(ga, gb) % 5];
    paragraphs.push(`${pairName(ga, gb)}${eunneun(GAN_KO[gb])} 천간합(${res}으로 합해요)을 이루는 짝이에요. 서로 다른 성질이 만나 하나로 어우러지려는 힘이라, 처음부터 끌리거나 서로에게 없는 면에 자연스럽게 마음이 가기 쉬워요. 다만 합은 묶이는 힘이라 서로의 영향을 많이 받으니, 상대에게 맞추다 내 색이 흐려지지 않는지 가끔 살펴보세요.`);
    good.push('서로에게 자연스럽게 끌리는 힘이 있어요.'); watch.push('서로의 영향을 많이 받아 내 색이 흐려질 수 있어요.');
  }
  if (chung) {
    paragraphs.push(`${pairName(ga, gb)}${eunneun(GAN_KO[gb])} 같은 음양끼리 정면으로 맞서는 짝(천간충)이에요. 의견이 갈릴 때 양보가 어려워 팽팽해지기 쉬워요. 다만 명리학에는 천간의 충을 방위 개념이 약해 충이 아니라 극으로만 보는 견해도 있어서, 큰 위험 신호라기보다 서로의 속도와 고집을 인정하는 연습이 필요하다는 정도로 읽어 주세요.`);
    watch.push('의견이 갈릴 때 서로 양보하지 않아 팽팽해질 수 있어요.');
  }
  paragraphs.push(`실제 장면으로 보면, ${DIR_SCENES[dir][0]} ${DIR_SCENES[dir][1]}`);
  paragraphs.push(tgAB === tgBA
    ? `십성으로 보면 나와 상대는 서로에게 같은 ‘${tgAB}’의 자리예요. ${TG_REL[tgAB]}`
    : `십성으로 보면 나에게 상대는 ‘${tgAB}’의 자리예요. ${TG_REL[tgAB]} 반대로 상대에게 나는 ‘${tgBA}’의 자리예요. ${TG_REL[tgBA]}`);
  const sp = [];
  for (const [who, person, tg, other] of [['나', a, tgAB, '상대'], ['상대', b, tgBA, '나']]) {
    if (SPOUSE_STAR[person.gender] && SPOUSE_STAR[person.gender].includes(tg)) {
      sp.push(`${who}${person.gender === 'M' ? '(남성)' : '(여성)'}에게 ${other}${eunneun(other)} ${person.gender === 'M' ? '재성' : '관성'}의 자리인데, 전통 육친론에서는 이를 배우자 자리와 닿는 인연으로 읽어요.`);
    }
  }
  if (sp.length) paragraphs.push(sp.join(' '));
  return { key: 'ilgan', title: '일간 · 성향과 기질', level: levelOf(score), headline: hap ? `${D.headline}. 게다가 천간합이 있어요` : chung ? `${D.headline}. 천간충도 함께 있어요` : D.headline, paragraphs, good, watch };
}

function secBranch(key, title, tags, palace, aKo, bKo, extra) {
  const st = branchStory(tags, { ...PALACE[palace], who: [aKo, bKo] });
  const score = F.relScore(tags);
  const lead = `${PALACE[palace].name}${eunneun(PALACE[palace].name)} ${PALACE[palace].domain}${eulreul(PALACE[palace].domain)} 보는 자리예요.`;
  const paragraphs = [lead, ...st.p];
  if (extra) paragraphs.push(extra);
  // 관계 유형이 여럿이면(예: 육합+형) 모두 풀어 줘요. 없으면 '없음'
  const kinds = tags.length ? tags : ['없음'];
  for (const k of kinds) paragraphs.push(...TIMELINE[k](TIMELINE_AREA[palace]));
  const headline = tags.length ? `${tags.join('·')}이 있는 조합이에요` : '특별한 합이나 충이 없는 평탄한 조합이에요';
  return { key, title, level: levelOf(score), headline, paragraphs, good: st.good, watch: st.watch };
}

function secBalance(a, b) {
  const ca = a.saju.count, cb = b.saju.count, ords = F.ELEMENT_ORDER;
  const fillB = ords.filter((k) => ca[k] === 0 && cb[k] >= 1);
  const fillA = ords.filter((k) => cb[k] === 0 && ca[k] >= 1);
  const lackBoth = ords.filter((k) => ca[k] === 0 && cb[k] === 0);
  const heavyBoth = ords.filter((k) => ca[k] >= 3 && cb[k] >= 3);
  const paragraphs = [`오행 균형은 사주 여덟 글자(시간을 모르면 여섯 글자)에 어떤 기운이 얼마나 있는지를 비교해요. 부족한 기운을 상대가 채워 주면 서로에게 큰 힘이 된다고 봐요.`];
  const good = [], watch = [];
  if (fillB.length) { paragraphs.push(`내 사주에는 ${fillB.map(el).join('·')} 기운이 없는데, 상대 사주에는 있어서 상대가 나에게 ${fillB.map((k) => EL_TRAIT[k]).join(', ')}을 보태 줘요. 상대 곁에 있으면 내게 부족했던 면이 자연스럽게 채워지는 느낌을 받기 쉬워요. 일상에서는 ${fillB.map((k) => FILL_DAILY[k]).join(' ')}`); good.push(`상대가 내게 없는 ${fillB.map(el).join('·')} 기운을 채워 줘요.`); }
  if (fillA.length) { paragraphs.push(`${fillB.length ? '반대로 ' : ''}상대 사주에는 ${fillA.map(el).join('·')} 기운이 없는데 내 사주에는 있어서, 내가 상대에게 ${fillA.map((k) => EL_TRAIT[k]).join(', ')}을 보태 줄 수 있어요. 내가 가진 장점이 상대에게 든든한 버팀목이 돼요. 상대에게는 ${fillA.map((k) => FILL_DAILY[k]).join(' ')}`); good.push(`내가 상대에게 없는 ${fillA.map(el).join('·')} 기운을 채워 줘요.`); }
  if (lackBoth.length) { paragraphs.push(`두 사람 모두 ${lackBoth.map(el).join('·')} 기운이 없어요. 둘 다 ${lackBoth.map((k) => EL_TRAIT[k]).join(', ')}이 약해서 같은 부분에서 함께 막힐 수 있어요. 이 부분은 둘이 의식적으로 챙기거나 주변의 도움을 받으면 좋아요.`); watch.push(`둘 다 ${lackBoth.map(el).join('·')} 기운이 약해 같은 부분에서 막힐 수 있어요.`); }
  if (heavyBoth.length) { paragraphs.push(`두 사람 모두 ${heavyBoth.map(el).join('·')} 기운이 많아요. 같은 성향이 강해서 서로 닮아 편하기도 하지만, 지나치게 한쪽으로 쏠릴 수 있어서 반대 성격의 활동을 함께 해 보면 균형이 잡혀요.`); watch.push(`둘 다 ${heavyBoth.map(el).join('·')} 기운이 많아 한쪽으로 쏠리기 쉬워요.`); }
  if (!fillB.length && !fillA.length && !lackBoth.length && !heavyBoth.length) paragraphs.push('서로 크게 채워 주거나 겹치는 부분은 없어요. 오행 균형으로는 평범한 조합이고, 관계의 색은 다른 항목이 더 크게 정해요.');
  const fills = fillB.length > 0 || fillA.length > 0;
  return { key: 'balance', title: '오행 균형 · 서로 채워 주는 기운', level: fills ? 'good' : 'ok', headline: fills ? '서로 부족한 기운을 채워 주는 조합이에요' : '서로 채워 주는 부분은 크지 않아요', paragraphs, good, watch };
}

function secWest(a, b) {
  const wa = a.west.wEl, wb = b.west.wEl, [hl, body] = W_PAIR[wKey(wa, wb)];
  const goodPair = (wa === 'fire' && wb === 'air') || (wa === 'air' && wb === 'fire') || (wa === 'earth' && wb === 'water') || (wa === 'water' && wb === 'earth');
  const level = wa === wb ? 'ok' : goodPair ? 'good' : 'tense';
  const names = `나는 ${a.west.name}(${W_EL_KO[wa]} 원소), 상대는 ${b.west.name}(${W_EL_KO[wb]} 원소)예요.`;
  return {
    key: 'west', title: '서양 별자리 · 원소 궁합', level, headline: hl,
    paragraphs: [`서양 별자리에서는 태양 별자리의 원소(불·흙·공기·물)로 두 사람의 대화 온도와 감정 표현 방식을 비교해요. ${names}`, body],
    good: level === 'tense' ? ['서로에게 없는 면을 신기해하며 배울 수 있어요.'] : ['원소의 결이 맞아 서로의 반응이 예측 가능해요.'],
    watch: level === 'tense' ? ['반응 속도와 표현 방식이 달라 오해가 생기기 쉬워요.'] : level === 'ok' ? ['닮은 약점이 같이 올라올 수 있어요.'] : ['좋은 조합이어도 대화를 줄이면 서서히 멀어질 수 있어요.'],
  };
}

function secNumber(a, b) {
  const rn = reduceNum(a.num.n + b.num.n), [hl, body] = REL_NUM[rn];
  return {
    key: 'number', title: '수비학 · 두 사람의 관계수', level: 'info', headline: hl,
    paragraphs: [`수비학에서는 두 사람의 생명수를 더해 한 자리로 줄인 값을 관계의 숫자로 봐요. 나는 ${a.num.n}번으로 ${LIFEPATH_LINE[a.num.n]}, 상대는 ${b.num.n}번으로 ${LIFEPATH_LINE[b.num.n]}이에요. 두 숫자를 합해 한 자리로 줄이면 관계수는 ${rn}이에요.`, body],
    good: [], watch: [],
  };
}

function secNine(a, b) {
  const ea = a.nine.element, eb = b.nine.element, dir = elDir(ea, eb);
  const lvl = dir === 'aGives' || dir === 'bGives' ? 'good' : dir === 'peer' ? 'ok' : 'tense';
  const how = { peer: '본명성 오행이 같아서 닮은 점이 많아요.', aGives: '내 본명성 오행이 상대의 오행을 살려 줘서 내가 힘을 보태는 쪽이에요.', bGives: '상대의 본명성 오행이 내 오행을 살려 줘서 내가 힘을 받는 쪽이에요.', aOver: '내 본명성 오행이 상대의 오행을 누르는 관계라 내 속도가 상대에게 부담이 될 수 있어요.', bOver: '상대의 본명성 오행이 내 오행을 누르는 관계라 내가 맞추는 느낌이 들 수 있어요.' }[dir];
  return {
    key: 'nine', title: '구성기학 · 본명성', level: lvl, headline: how.replace(/\.$/, ''),
    paragraphs: [`구성기학은 태어난 해의 본명성(아홉 개의 별)으로 타고난 결을 봐요. 나는 ${a.nine.name}으로 ${el(ea)} 기운, 상대는 ${b.nine.name}으로 ${el(eb)} 기운이에요. 이 앱은 방위와 시기는 보지 않고 본명성의 오행 관계만 단순하게 비교해요.`, how],
    good: lvl === 'tense' ? [] : ['본명성의 결이 크게 어긋나지 않아요.'], watch: lvl === 'tense' ? ['본명성의 결이 달라 서로의 속도를 확인하는 습관이 필요해요.'] : [],
  };
}

function secVedic(a, b) {
  const ea = a.vedic.moon.element, eb = b.vedic.moon.element, dir = elDir(ea, eb);
  const how = { peer: '달 별자리의 기운이 같아서 감정의 결이 닮았어요.', aGives: '내 달 기운이 상대의 달 기운을 살려 줘서 내가 감정적으로 받쳐 주는 쪽이에요.', bGives: '상대의 달 기운이 내 달 기운을 살려 줘서 마음이 편안해지는 쪽이에요.', aOver: '내 달 기운이 상대의 달 기운을 누르는 관계라 감정 표현이 강하게 느껴질 수 있어요.', bOver: '상대의 달 기운이 내 달 기운을 누르는 관계라 내가 감정을 눌러 참기 쉬워요.' }[dir];
  return {
    key: 'vedic', title: '베딕 점성술 · 달 별자리', level: 'info', headline: how.replace(/\.$/, ''),
    paragraphs: [`베딕 점성술에서는 달 별자리를 마음과 감정의 결로 봐요. 나는 ${a.vedic.moon.name}, 상대는 ${b.vedic.moon.name}이에요. 이 앱은 달 별자리의 기운을 오행으로 옮겨 단순하게 비교하는 참고 항목이에요.`, how],
    good: [], watch: [],
  };
}

/* ───────── 종합 ───────── */
const STYLE = {
  many: '잘 맞는 면이 더 많은 조합이에요. 함께 있을 때 편안함과 힘을 얻는 부분이 여러 곳에서 겹치고, 부딪히는 부분은 비교적 적어요. 그래도 잘 맞는 조합일수록 대화가 줄고 서로를 당연하게 여기기 쉬우니, 고마움을 말로 표현하는 습관이 관계를 오래 가게 해요.',
  mixed: '잘 맞는 면과 긴장되는 면이 함께 있는 조합이에요. 서로에게서 배울 것이 많은 만큼 맞추는 노력도 필요해요. 잘 맞는 부분에서 신뢰를 쌓고, 긴장되는 부분은 미리 규칙을 정해 두면 오히려 서로를 더 깊이 이해하게 돼요.',
  few: '다름이 큰 조합이에요. 서로 다른 속도와 방식 때문에 처음에는 어긋남을 자주 느낄 수 있어요. 하지만 다름은 서로를 넓혀 주는 힘이기도 해요. 상대를 바꾸려 하기보다 다름을 설명하고 인정하는 대화를 이어 가면 의외로 단단한 관계가 될 수 있어요.',
};
export const MATCH_NOTES = [
  '궁합은 두 사람의 기운을 견주어 보는 재미 요소예요. 관계의 좋고 나쁨을 판단하는 근거로 쓰지 마세요.',
  '천간충은 학파에 따라 충이 아니라 극으로만 보기도 해요. 일지·월지·띠의 합과 충은 육합·삼합·충·형·자형만 반영하고, 해·파·원진은 반영하지 않아요.',
  '전통 육친론에서는 남성의 재성, 여성의 관성을 배우자 자리로 보지만, 이를 검증한 한 학술 연구는 사주 원국의 배우자성이 실제 혼인 여부에는 영향을 주지 않는다고 보고했어요.',
  '서양 원소 궁합, 구성기학(본명성 오행만 비교), 수비학 관계수, 베딕 달 별자리는 이 앱이 단순하게 옮긴 해석이에요.',
];

/* ───────── 생활 장면 서술 ───────── */
function buildScenes(a, b, secs, style, tips) {
  const by = Object.fromEntries(secs.map((x) => [x.key, x]));
  const ga = a.saju.pillars.day.gi, gb = b.saju.pillars.day.gi;
  const dir = elDir(a.saju.element, b.saju.element);
  const hap = Math.abs(ga - gb) === 5, chung = Math.abs(ga - gb) === 6;
  const lv = (k) => (by[k] ? by[k].level : 'ok');
  const first = hap
    ? '처음 만났을 때부터 서로에게 자연스럽게 끌리는 힘이 있어요. 천간합이 있는 조합은 낯설지 않은 느낌과 호기심이 함께 오는 편이에요.'
    : lv('tti') === 'good' ? '첫인상이 편안하고 주변에서도 잘 어울린다는 말을 듣기 쉬워요. 띠가 합으로 이어져 처음부터 분위기가 부드럽게 흘러요.'
      : lv('tti') === 'tense' ? '처음에는 다른 점이 오히려 매력으로 보여 끌리기 쉬워요. 다만 시간이 지나며 띠가 충하는 다름이 도드라질 수 있어, 첫 설렘만 믿지 말고 서로를 천천히 알아 가는 게 좋아요.'
        : '처음에는 평범하게 시작하지만 알아 갈수록 서로의 결이 보이는 조합이에요. 첫인상보다 함께 쌓는 시간이 관계의 색을 정해요.';
  const daily = (lv('ilji') === 'good' ? '일상에서는 생활 리듬과 쉬는 방식이 잘 맞아 같이 있는 시간이 편안해요. ' : lv('ilji') === 'tense' ? '일상에서는 생활 리듬과 쉬는 방식이 달라 사소한 일로 부딪히기 쉬워요. 연락 빈도나 집안일 같은 약속을 정해 두면 훨씬 편해져요. ' : '일상에서는 큰 끌림도 큰 충돌도 없는 평탄한 흐름이에요. 함께 하는 습관이 관계의 온도를 만들어요. ')
    + (lv('wolji') === 'good' ? '현실 문제를 의논할 때도 기준이 비슷해 이야기가 잘 풀려요.' : lv('wolji') === 'tense' ? '다만 직업관이나 가족을 대하는 기준이 달라 현실적인 선택에서는 의견이 갈릴 수 있어요.' : '현실 문제는 이야기를 나누며 기준을 만들어 가면 돼요.');
  const dirLine = { peer: '비슷한 결이라 서로의 입장을 금방 이해하지만, 둘 다 물러서지 않으면 길어져요.', aGives: '내가 먼저 상대를 살펴 주는 쪽이라 갈등이 생기면 내가 한 발 물러서 조율하게 되기 쉬워요.', bGives: '상대가 먼저 나를 살펴 주는 쪽이라 갈등이 생기면 상대가 풀어 주려는 경우가 많아요. 그 마음을 당연하게 여기지 않는 게 중요해요.', aOver: '내 속도와 말투가 강하게 전해져 상대가 눌린다고 느끼기 쉬워요. 결론을 말하기 전에 상대의 의견을 먼저 물어 주세요.', bOver: '상대의 속도와 말투가 강하게 느껴져 내가 눌린다고 느끼기 쉬워요. 참지 말고 짧고 분명하게 내 생각을 말해 주세요.' }[dir];
  const clash = `${dirLine}${chung ? ' 천간충까지 있어 정면으로 맞서는 순간이 있을 수 있으니, 감정이 올라올 때는 잠깐 쉬었다 이야기하세요.' : ''}${lv('west') === 'tense' ? ' 별자리 원소가 달라 같은 말도 다르게 받아들일 수 있어요. 해결을 원하는지 공감을 원하는지 먼저 물어보세요.' : ''}`;
  const bal = by.balance && by.balance.good.length
    ? '서로 힘들 때는 오행이 서로 부족한 면을 채워 줘서 든든한 버팀목이 돼요. 상대가 가진 장점을 빌려 쓰는 마음으로 기대 보세요.'
    : '서로 힘들 때는 특별히 채워 주는 면이 크지 않아서, 필요한 도움을 말로 요청하는 습관이 중요해요.';
  const support = dir === 'aGives' ? ' 내가 챙겨 주는 쪽이 되기 쉬우니 내가 지칠 땐 도움을 요청해도 괜찮아요.' : dir === 'bGives' ? ' 상대가 받쳐 주는 쪽이 되기 쉬우니 상대가 지칠 땐 내가 돌려주는 시간을 만들어 주세요.' : '';
  const longTerm = `${STYLE[style]} 특히 ${tips.slice(0, 2).join(' ')}`;
  return [
    { title: '처음 만났을 때', text: first },
    { title: '일상을 함께 보낼 때', text: daily },
    { title: '의견이 갈릴 때', text: clash },
    { title: '서로 힘들 때', text: bal + support },
    { title: '오래 함께하려면', text: longTerm },
  ];
}

export function matchDetail(a, b) {
  const aZi = a.saju.pillars.day.zi, bZi = b.saju.pillars.day.zi;
  const sections = [secIlgan(a, b)];
  sections.push(secBranch('ilji', '일지 · 일상과 친밀감', F.branchTags(aZi, bZi), 'day', ZHI_KO[aZi], ZHI_KO[bZi],
    (() => { const d = elDir(ZHI_EL[aZi], ZHI_EL[bZi]); return `일지의 오행으로 보면 ${{ peer: '같은 결이라 생활의 기반이 닮아 있어요.', aGives: '내 쪽이 상대의 생활 기반을 받쳐 주는 흐름이에요.', bGives: '상대 쪽이 내 생활 기반을 받쳐 주는 흐름이에요.', aOver: '내 쪽의 생활 방식이 상대를 누르듯 작용할 수 있어요.', bOver: '상대 쪽의 생활 방식이 나를 누르듯 작용할 수 있어요.' }[d]}`; })()));
  const aM = a.saju.pillars.month.zi, bM = b.saju.pillars.month.zi;
  sections.push(secBranch('wolji', '월지 · 환경과 가치관', F.branchTags(aM, bM), 'month', ZHI_KO[aM], ZHI_KO[bM]));
  sections.push(secBranch('tti', `띠 · ${a.animal.name}띠와 ${b.animal.name}띠`, F.branchTags(a.animal.idx, b.animal.idx), 'year', a.animal.name, b.animal.name));
  sections.push(secBalance(a, b));
  sections.push(secWest(a, b));
  if (a.nine && b.nine) sections.push(secNine(a, b));
  sections.push(secNumber(a, b));
  if (a.vedic && b.vedic) sections.push(secVedic(a, b));

  const tally = { good: 0, ok: 0, tense: 0 };
  sections.forEach((s) => { if (tally[s.level] !== undefined) tally[s.level]++; });
  const total = tally.good + tally.ok + tally.tense;
  // 사주 근거가 있는 항목(일간·일지·월지·띠·오행 균형)을 먼저, 앱이 단순화한 체계(서양·구성기학)를 뒤에 둬요.
  const PRIORITY = { ilgan: 0, ilji: 1, wolji: 2, tti: 3, balance: 4, west: 5, nine: 6, number: 7, vedic: 8 };
  const byPriority = (x, y) => PRIORITY[x.key] - PRIORITY[y.key];
  const goods = sections.filter((s) => s.level === 'good').sort(byPriority), tenses = sections.filter((s) => s.level === 'tense').sort(byPriority);
  const style = tally.good >= tally.tense + 2 ? 'many' : tally.tense >= tally.good + 2 ? 'few' : 'mixed';
  // 요약은 사주 근거가 있는 항목(일간·일지·월지·띠·오행 균형)과, 앱이 단순화한 체계(서양·구성기학)를 무게를 구분해서 말해요.
  const SAJU_KEYS = ['ilgan', 'ilji', 'wolji', 'tti', 'balance'], SIMPLE_KEYS = ['west', 'nine'];
  const nm = (list) => list.map((x) => `‘${x.title.split(' · ')[0]}’`).join(', ');
  const sg = goods.filter((x) => SAJU_KEYS.includes(x.key)), st = tenses.filter((x) => SAJU_KEYS.includes(x.key));
  const mg = goods.filter((x) => SIMPLE_KEYS.includes(x.key)), mt = tenses.filter((x) => SIMPLE_KEYS.includes(x.key));
  // 단순화한 체계 줄: 잘 어울리는 쪽/다름이 보이는 쪽을 각각 한 구절로 만들고, 둘 다 있을 때만 쉼표로 이어요. 항상 마침표로 끝나요.
  const simple = (g, t) => {
    const parts = [];
    if (g.length) parts.push(`${nm(g)}에서는 잘 어울리는 신호가 있어요`);
    if (t.length) parts.push(`${nm(t)}에서는 다름이 보여요`);
    if (!parts.length) return '';
    const body = parts.length === 2 ? `${parts[0].replace(/어요$/, '고')}, ${parts[1]}` : parts[0];
    return `서양 별자리·구성기학처럼 이 앱이 단순하게 옮긴 체계는 참고로만 봐 주세요. ${body}.`;
  };
  const summary = [
    `${total}가지 기준 중 잘 맞음 ${tally.good}개, 무난 ${tally.ok}개, 긴장 ${tally.tense}개예요. ${STYLE[style]}`,
    sg.length ? `사주 기준으로 가장 잘 맞는 부분은 ${nm(sg.slice(0, 3))}이에요. ${sg[0].headline}.` : '사주 기준으로는 뚜렷하게 잘 맞는 항목이 많지 않아요. 대신 큰 충돌도 적어서 함께 만들어 가는 몫이 큰 조합이에요.',
    st.length ? `사주 기준으로 조심이 필요한 부분은 ${nm(st.slice(0, 3))}이에요. ${st[0].headline}.` : '사주 기준으로는 뚜렷하게 긴장되는 항목이 없어요. 큰 충돌 없이 편안하게 이어 가기 좋은 조합이에요.',
  ];
  const simpleLine = simple(mg, mt); if (simpleLine) summary.push(simpleLine);
  const tips = [];
  const has = (k, lv) => sections.some((s) => s.key === k && s.level === lv);
  if (has('ilgan', 'tense')) tips.push('의견이 갈릴 때는 결론보다 이유를 먼저 묻고, 말투를 한 단계 낮춰 보세요. 같은 말도 속도와 톤에 따라 압박으로 느껴질 수 있어요.');
  if (has('ilji', 'tense')) tips.push('연락 빈도, 집안일, 쉬는 날 같은 일상의 약속을 구체적으로 정해 두세요. 일상의 규칙이 있으면 사소한 충돌이 크게 번지지 않아요.');
  if (has('wolji', 'tense')) tips.push('직업이나 가족 이야기는 판단보다 공감을 먼저 해 주세요. 서로 자란 환경이 달라 기준이 다를 수 있어요.');
  if (has('tti', 'tense')) tips.push('처음 끌린 다름이 시간이 지나면 부딪힘이 될 수 있어요. 서로 다른 점을 월 1회 정도 가볍게 이야기해 보세요.');
  if (has('west', 'tense')) tips.push('대화의 온도 차이를 인정하세요. 한쪽은 해결을, 다른 쪽은 공감을 원할 수 있으니 먼저 어느 쪽이 필요한지 물어보세요.');
  if (has('balance', 'good')) tips.push('서로 채워 주는 부분을 자주 칭찬해 주세요. 상대 덕분에 편해진 점을 말로 표현하면 관계가 더 단단해져요.');
  if (has('ilgan', 'good')) tips.push('서로를 키워 주는 힘이 있으니, 주고받는 균형만 점검해 주세요. 한쪽만 계속 주면 지칠 수 있어요.');
  tips.push('서운한 일은 쌓아 두지 말고 하루 안에 가볍게 이야기해 보세요. 어떤 조합이든 대화의 빈도가 관계의 온도를 정해요.');
  tips.push('가끔 둘이 처음 해 보는 활동을 함께해 보세요. 새로운 경험은 닮은 조합에는 자극을, 다른 조합에는 공통의 추억을 만들어 줘요.');
  return {
    people: [personCard(a, '나'), personCard(b, '상대')],
    verdict: { style, headline: { many: '잘 맞는 면이 더 많은 조합', mixed: '잘 맞는 면과 긴장되는 면이 함께 있는 조합', few: '다름이 큰 조합' }[style], tally, total },
    summary,
    strengths: goods.map((s) => ({ title: s.title, text: `${s.headline}. ${s.good[0] || ''}`.trim() })),
    cautions: tenses.map((s) => ({ title: s.title, text: `${s.headline}. ${s.watch[0] || ''}`.trim() })),
    scenes: buildScenes(a, b, sections, style, tips), sections, tips: tips.slice(0, 6), notes: MATCH_NOTES, LEVEL: LV,
  };
}

/* ═════════════════════ 10년 대운 상세 ═════════════════════ */
// 대운 천간이 내 일간에게 어떤 십성인지에 따라 10년의 큰 흐름을 길게 풀이해요.
const TG_LONG = {
  비견: ['내 페이스와 주도권이 단단해지는 시기예요. 나와 같은 힘이 곁에 늘어나서 독립심과 자신감이 커지고, 동료나 친구와 대등하게 손을 맞잡는 일이 많아져요.', '대신 비교와 경쟁이 자연스럽게 따라와요. 고집이 세지면 협력이 어려워질 수 있으니, 나눠야 할 일과 내가 정할 일을 구분하면 이 시기의 힘이 오래 가요.'],
  겁재: ['승부욕과 추진력이 올라오는 시기예요. 경쟁 상대나 자극이 되는 사람을 만나 더 크게 성장하고, 하고 싶은 일에 과감하게 뛰어드는 힘이 생겨요.', '동시에 지출과 나눔, 역할 다툼에 신경 쓸 일이 늘어요. 함께 쓰는 돈이나 책임은 기준을 미리 정해 두고, 충동적인 결정은 하루 묵혀 보세요.'],
  식신: ['표현과 결과물이 편안하게 나오는 시기예요. 여유가 생기고 하고 싶은 일을 즐기면서 해도 성과가 쌓여서, 재능을 꾸준히 갈고닦기에 좋은 10년이에요.', '다만 편안함에 안주하면 속도가 느려질 수 있어요. 작은 목표를 정해 결과물을 계속 만들어 내면 이 시기의 복이 더 크게 열려요.'],
  상관: ['재치와 창의력, 솔직한 표현이 터져 나오는 시기예요. 새로운 아이디어와 개성이 눈에 띄고, 틀을 깨는 시도가 반응을 얻기도 해요.', '말이 앞서 오해나 마찰이 생기기 쉬운 시기이기도 해요. 직설은 한 템포 늦추고, 조직이나 윗사람과의 관계에서는 표현 방식을 다듬을수록 득이 커요.'],
  편재: ['활동 반경이 넓어지고 기회가 많아지는 시기예요. 사람, 일, 경험이 한꺼번에 들어와 도전하고 움직일수록 길이 열려요.', '기회가 많은 만큼 흩어지기 쉬워요. 우선순위를 정하고, 수입과 지출의 흐름을 기록하며 한 번에 크게 벌이기보다 꾸준히 이어 가세요.'],
  정재: ['꾸준한 실속을 챙기기 좋은 시기예요. 규칙적인 일과 성실한 노력이 안정적인 결과로 돌아오고, 생활 기반이 단단해져요.', '안정에 집중하다 보면 변화에 둔해질 수 있어요. 새로운 배움이나 작은 시도를 곁들이면 이 시기의 안정이 더 크게 자라요.'],
  편관: ['책임과 압박이 함께 오는 시기예요. 도전적인 과제와 큰 역할이 주어져 나를 단련시키고, 버텨낸 만큼 단단한 실력과 신뢰가 쌓여요.', '긴장이 길어지면 지치기 쉬워요. 완벽하게 해내려는 마음을 조금 내려놓고, 쉬는 시간과 도움을 청할 사람을 미리 정해 두세요.'],
  정관: ['신뢰와 질서가 쌓이는 시기예요. 맡은 일을 성실하게 해내면 평판과 지위가 안정적으로 오르고, 믿을 만한 사람이라는 인정을 받기 쉬워요.', '규칙과 기대가 많아져 답답해질 수 있어요. 해야 할 일과 하고 싶은 일의 균형을 의식적으로 맞추면 이 시기의 성과를 오래 지켜요.'],
  편인: ['생각이 깊어지고 몰입하기 좋은 시기예요. 남다른 관심사나 전문 분야를 파고들어 독특한 강점을 만들 수 있고, 직관과 영감도 예민해져요.', '혼자 생각에 갇혀 현실 행동이 늦어질 수 있어요. 아는 것을 작게라도 실행하고, 믿을 만한 사람과 이야기를 나누면 흐름이 훨씬 가벼워져요.'],
  정인: ['도움과 배움이 들어오는 시기예요. 가르쳐 주는 사람, 지지해 주는 사람이 곁에 생겨서 공부와 자격, 마음의 안정을 쌓기에 좋은 10년이에요.', '보호받는 편안함에 기대다 결정을 미루기 쉬워요. 배운 것은 실제로 써 보고, 스스로 선택하는 경험을 늘리면 이 시기가 더 큰 힘이 돼요.'],
};
const TG_GOOD = {
  비견: ['독립적으로 일을 이끄는 힘이 커져요.', '믿을 만한 동료와 대등한 협업이 가능해요.'], 겁재: ['경쟁 속에서 실력이 빠르게 올라와요.', '과감한 도전에 용기가 생겨요.'],
  식신: ['재능이 결과물로 이어지기 쉬워요.', '마음의 여유가 생겨 관계가 부드러워져요.'], 상관: ['아이디어와 표현력이 돋보여요.', '새로운 방식으로 성과를 내기 좋아요.'],
  편재: ['기회와 인맥이 넓어져요.', '움직일수록 새로운 길이 열려요.'], 정재: ['꾸준한 노력이 안정적인 결과로 돌아와요.', '생활과 수입의 기반이 단단해져요.'],
  편관: ['어려운 과제를 해내며 실력이 단단해져요.', '책임 있는 역할을 맡아 존재감이 커져요.'], 정관: ['신뢰와 평판이 안정적으로 쌓여요.', '조직 안에서 인정받기 좋아요.'],
  편인: ['전문성과 직관이 깊어져요.', '몰입해서 만든 결과가 독창적이에요.'], 정인: ['배움과 자격을 쌓기에 좋아요.', '곁에서 지지해 주는 사람이 생겨요.'],
};
const TG_WATCH = {
  비견: ['고집이 세져 협력이 어려워질 수 있어요.', '비교 때문에 마음이 흔들릴 수 있어요.'], 겁재: ['지출과 나눔의 기준이 흐려지기 쉬워요.', '충동적인 결정으로 후회할 수 있어요.'],
  식신: ['편안함에 안주해 속도가 느려질 수 있어요.', '미루는 습관이 쌓이기 쉬워요.'], 상관: ['말이 앞서 오해가 생길 수 있어요.', '규칙이나 윗사람과 부딪히기 쉬워요.'],
  편재: ['일을 벌이다 흩어지기 쉬워요.', '지출이 활동 폭만큼 늘어나기 쉬워요.'], 정재: ['변화에 둔해져 기회를 놓칠 수 있어요.', '지나치게 아끼느라 여유가 사라질 수 있어요.'],
  편관: ['긴장이 길어져 지치기 쉬워요.', '혼자 다 짊어지려는 마음이 커질 수 있어요.'], 정관: ['기대와 규칙에 눌려 답답할 수 있어요.', '남의 시선에 맞추다 내 마음을 놓칠 수 있어요.'],
  편인: ['생각이 많아 실행이 늦어질 수 있어요.', '혼자 고립된 느낌이 들 수 있어요.'], 정인: ['의존하는 마음이 커져 결정을 미룰 수 있어요.', '배우기만 하고 써 보지 않을 수 있어요.'],
};
const TG_TIPS = {
  비견: ['혼자 정할 일과 같이 정할 일을 나눠 적어 보세요.', '경쟁 상대 대신 어제의 나와 비교해 보세요.', '동업이나 공동 비용은 문서로 정리하세요.'],
  겁재: ['큰 지출은 하루 묵힌 뒤 결정하세요.', '경쟁이 올라올 땐 운동처럼 몸으로 풀어 보세요.', '빌려주거나 보증하는 일은 신중히 하세요.'],
  식신: ['매주 작은 결과물 하나를 정해 만들어 보세요.', '좋아하는 일을 루틴으로 만들어 꾸준히 이어 가세요.', '쉬는 시간도 일정에 넣어 균형을 지키세요.'],
  상관: ['중요한 말은 글로 한 번 정리한 뒤 전하세요.', '새로운 아이디어는 작게 시험해 보세요.', '윗사람에게는 의견 앞에 존중의 말을 먼저 붙여 보세요.'],
  편재: ['하고 싶은 일의 우선순위를 세 개로 줄여 보세요.', '수입과 지출을 매달 한 번 점검하세요.', '새 인맥은 넓히되 깊이 있는 관계도 챙기세요.'],
  정재: ['월 단위로 저축과 지출 기준을 정해 두세요.', '낯선 분야를 분기마다 하나씩 체험해 보세요.', '안정만 보지 말고 작은 도전을 곁들이세요.'],
  편관: ['쉬는 날과 도움을 청할 사람을 미리 정해 두세요.', '완벽보다 완료를 목표로 해 보세요.', '운동이나 취미로 긴장을 정기적으로 풀어 주세요.'],
  정관: ['해야 할 일과 하고 싶은 일을 나란히 적어 균형을 보세요.', '평판을 위해 애쓴 만큼 나를 위한 시간도 확보하세요.', '약속과 마감은 여유 있게 잡으세요.'],
  편인: ['생각을 글이나 메모로 꺼내 실행 계획으로 바꿔 보세요.', '믿을 만한 사람과 정기적으로 이야기를 나누세요.', '몰입한 뒤에는 꼭 쉬고 몸을 움직여 주세요.'],
  정인: ['배운 것은 일주일 안에 한 번 써 보세요.', '중요한 결정은 기한을 정해 스스로 내려 보세요.', '도움을 주는 사람에게 감사를 표현하세요.'],
};
// 나이대와 십성 그룹이 만나는 맥락
const STAGE = (age) => (age < 20 ? 0 : age < 40 ? 1 : age < 60 ? 2 : 3);
const STAGE_NAME = ['성장기', '자립과 확장의 시기', '책임과 성숙의 시기', '전환과 여유의 시기'];
const GROUP_STAGE = {
  비겁: ['또래와 어울리며 자기 색을 찾아가는 때라', '내 힘으로 자리를 만들고 동료와 경쟁하며 크는 때라', '독립적으로 쌓아 온 것을 지키고 동료와 역할을 나누는 때라', '내 방식대로 삶을 꾸리고 오랜 동료와 편하게 지내기 좋은 때라'],
  식상: ['재능과 표현을 키우고 관심사를 넓히는 때라', '재능을 일과 결과물로 바꾸고 나를 드러내는 때라', '쌓은 경험을 가르치고 표현하며 나누는 때라', '취미와 표현을 즐기며 여유를 누리기 좋은 때라'],
  재성: ['현실 감각과 생활 습관을 몸에 익히는 때라', '일과 수입의 기반을 만들고 활동 반경을 넓히는 때라', '생활과 재산의 틀을 안정적으로 다지는 때라', '쌓아 온 것을 알뜰하게 정리하고 누리기 좋은 때라'],
  관성: ['규칙과 책임을 배우며 단단해지는 때라', '조직과 사회에서 역할을 맡고 인정받는 때라', '책임이 큰 자리에서 신뢰를 쌓는 때라', '짊어졌던 책임을 정리하고 명예를 지키는 때라'],
  인성: ['배움과 보호 속에서 바탕을 쌓는 때라', '공부와 자격으로 실력을 쌓고 도움을 받는 때라', '쌓은 지식을 깊이 있게 다지고 후배를 이끄는 때라', '마음의 안정과 배움을 즐기기 좋은 때라'],
};
const TG_BRIEF = {
  비견: '내 페이스를 지키는 힘', 겁재: '경쟁과 추진력', 식신: '편안한 표현과 결과물', 상관: '재치와 날카로운 표현', 편재: '넓은 활동과 기회',
  정재: '꾸준한 실속', 편관: '책임과 도전', 정관: '신뢰와 질서', 편인: '깊은 몰입과 직관', 정인: '배움과 도움',
};
const GROUP_SHIFT = {
  비겁: '앞선 흐름에서 한 걸음 물러나 내 페이스와 주도권을 되찾는 방향으로 바뀌어요.',
  식상: '해야 하는 일 중심에서 표현하고 만들어 내는 일 중심으로 바뀌어요.',
  재성: '생각과 준비의 단계에서 현실적인 성과와 생활 기반을 챙기는 단계로 바뀌어요.',
  관성: '자유롭게 움직이던 때에서 책임과 규칙을 받아들이는 때로 바뀌어요.',
  인성: '밖으로 쏟던 힘을 거두고 배우고 정리하며 안으로 쌓는 때로 바뀌어요.',
};
const FIELD_LABEL = [['wealth', '재물'], ['job', '직업'], ['biz', '사업'], ['love', '연애·관계'], ['study', '학업'], ['cond', '컨디션']];
// 대운 지지와 원국 지지의 관계가 닿는 영역(궁위)
const PALACE_AREA = {
  year: { name: '연지', area: '첫인상과 집안, 넓은 인연', hap: '집안과 오래된 인연이 안정되고 도움이 들어오기 쉬워요.', chung: '이동과 환경 변화, 오래된 인연의 정리가 있을 수 있어요.', hyeong: '집안이나 오래된 관계에서 신경 쓸 일이 생길 수 있어요.', za: '같은 패턴이 반복되니 습관을 점검해 보세요.' },
  month: { name: '월지', area: '직업과 사회적 환경, 집안 환경', hap: '일터와 사회적 환경이 안정되고 협력자를 만나기 쉬워요.', chung: '직업이나 일하는 환경에 변화와 이동이 생기기 쉬워요.', hyeong: '직장이나 가족 관계에서 책임과 눈치로 마음이 쓰일 수 있어요.', za: '일하는 방식이 반복되니 변화를 줘 보세요.' },
  day: { name: '일지', area: '배우자 자리와 가까운 관계, 생활 기반', hap: '가까운 관계가 편안해지고 생활의 호흡이 맞아 가요.', chung: '가까운 관계와 생활 기반에 변화가 생기기 쉬워요. 집이나 관계의 형태가 바뀔 수도 있어요.', hyeong: '가까운 관계에서 서운함이 쌓이기 쉬우니 이야기를 자주 나누세요.', za: '나의 습관이 가까운 관계에 반복해서 드러날 수 있어요.' },
  time: { name: '시지', area: '미래의 계획과 꿈, 말년의 바람', hap: '꿈과 미래 계획이 안정되고 후배나 가까운 사람과의 관계가 가까워져요.', chung: '미래 계획과 꿈의 방향에 변화가 생기기 쉬워요.', hyeong: '미래에 대한 걱정이 마음에 걸릴 수 있어요.', za: '미래 걱정이 반복되니 작은 계획으로 풀어 주세요.' },
};

function paragraphOfPalace(tags, pal) {
  const parts = [];
  if (tags.includes('육합') || tags.includes('삼합')) parts.push(`합이 되어 ${pal.hap}`);
  if (tags.includes('충')) parts.push(`충이 되어 ${pal.chung}`);
  if (tags.includes('형')) parts.push(`형이 겹쳐 ${pal.hyeong}`);
  if (tags.includes('자형')) parts.push(`자형이 되어 ${pal.za}`);
  if (!parts.length) return [];
  return [`${pal.name}(${pal.area})에서는 ${parts.join(' 한편 ')}`];
}

function elementPara(p, gEl, zEl) {
  const c = p.saju.count, out = [];
  const uniq = [...new Set([gEl, zEl])];
  for (const k of uniq) {
    if (c[k] === 0) out.push(`이 대운에는 내 사주에 없던 ${el(k)} 기운이 들어와요. ${EL_TRAIT[k]}이 새로 열려서, 그동안 낯설었던 면이 자연스럽게 채워지는 시기예요.`);
    else if (c[k] >= 3) out.push(`이 대운에는 이미 많은 ${el(k)} 기운이 더해져요. ${EL_TRAIT[k]}이 더 강해져서 장점이 커지는 만큼 한쪽으로 쏠리기 쉬우니, 반대 성격의 활동을 곁들여 균형을 잡아 주세요.`);
  }
  if (!out.length) out.push(`이 대운의 ${uniq.map(el).join('·')} 기운은 내 사주에 이미 적당히 있는 기운이라, 특별히 부족을 채우거나 쏠림을 키우기보다 기존 흐름을 이어 가는 편이에요.`);
  return out;
}

export function daewoonDetail(p, nowYear) {
  const dw = F.daewoon(p, nowYear);
  if (!dw) return null;
  const dm = p.saju.pillars.day.gi;
  const P = p.saju.pillars;
  const cur = dw.list.find((x) => x.current);
  return {
    forward: dw.forward,
    items: dw.list.map((x, i) => {
      const prev = dw.list[i - 1], next = dw.list[i + 1];
      const zi = ZHI.indexOf(x.ganzhi[1]);
      const zTg = F.tenGod(dm, F.ZHI_BONGI[zi]);
      const stage = STAGE(x.startAge);
      const paragraphs = [];
      paragraphs.push(`${x.startAge}~${x.endAge}세는 ${STAGE_NAME[stage]}이고, ${x.ko}(${x.ganzhi}) 대운이 들어와요. 천간 ${GAN_KO[GAN.indexOf(x.ganzhi[0])]}${x.ganzhi[0]}${eunneun(GAN_KO[GAN.indexOf(x.ganzhi[0])])} ${el(x.ganEl)} 기운으로 내 일간에게 ‘${x.tg}’, 지지 ${ZHI_KO[zi]}${x.ganzhi[1]}${eunneun(ZHI_KO[zi])} ${el(x.zhiEl)} 기운으로 본기 ‘${zTg}’의 작용을 해요. ${TG_LONG[x.tg][0]}`);
      paragraphs.push(TG_LONG[x.tg][1]);
      paragraphs.push(`${GROUP_STAGE[x.group][stage]} ‘${x.group}’ 흐름이 들어오는 모습이에요. ${x.theme}`);
      const rel = [];
      for (const k of ['year', 'month', 'day', 'time']) if (P[k]) rel.push(...paragraphOfPalace(F.branchTags(zi, P[k].zi), PALACE_AREA[k]));
      paragraphs.push(rel.length ? `대운의 지지가 내 사주의 자리와 만나는 모습을 보면, ${rel.join(' ')}` : '대운의 지지는 내 사주의 지지와 특별한 합·충·형을 이루지 않아요. 환경이나 관계가 크게 흔들리기보다 기존 흐름 위에서 천천히 변하는 시기예요.');
      paragraphs.push(...elementPara(p, x.ganEl, x.zhiEl));
      const ft = [];
      if (prev) ft.push(`이 대운은 앞선 ${prev.ko} 대운(‘${prev.tg}’)에서 이어져요. ${TG_BRIEF[prev.tg]}에 무게가 실리던 때에서 ${TG_BRIEF[x.tg]}${euro(TG_BRIEF[x.tg])} 무게가 옮겨 가요. ${prev.group === x.group ? `같은 ‘${x.group}’ 계열이라 큰 방향은 이어지고 결만 달라져요.` : GROUP_SHIFT[x.group]} 바뀌는 첫 1~2년(${x.startYear}~${x.startYear + 1}년)은 적응기라 새로운 결에 몸과 마음을 맞추는 시간으로 생각하면 편해요.`);
      else ft.push(`이 대운은 인생의 첫 대운이에요. 아직 만들어지는 중인 시기라 환경과 주변 사람의 영향이 큰 때예요.`);
      if (next) ft.push(`${x.endYear}년 전후로는 ${next.ko} 대운(‘${next.tg}’)으로 넘어가요. ${TG_BRIEF[x.tg]}에서 ${TG_BRIEF[next.tg]}${euro(TG_BRIEF[next.tg])} 무게가 옮겨 가고, ${next.group === x.group ? `같은 ‘${next.group}’ 계열이라 큰 방향은 이어져요.` : GROUP_SHIFT[next.group]} 끝나 갈 무렵부터 다음 결을 준비하면 부드럽게 이어 갈 수 있어요.`);
      else ft.push('이 대운이 마지막으로 계산된 대운이에요. 이후의 흐름은 이 시기를 어떻게 보내느냐에 따라 달라져요.');
      paragraphs.push(ft.join(' '));
      const good = [...TG_GOOD[x.tg]], watch = [...TG_WATCH[x.tg]];
      const palaceChung = ['month', 'day'].filter((k) => P[k] && F.branchTags(zi, P[k].zi).includes('충'));
      if (palaceChung.length) watch.push(`${palaceChung.map((k) => PALACE_AREA[k].name).join('·')}와 충이 있어 변화가 잦을 수 있어요. 큰 결정은 서두르지 않는 편이 좋아요.`);
      const palaceHap = ['month', 'day'].filter((k) => P[k] && F.branchTags(zi, P[k].zi).some((t) => t === '육합' || t === '삼합'));
      if (palaceHap.length) good.push(`${palaceHap.map((k) => PALACE_AREA[k].name).join('·')}와 합이 있어 주변의 도움과 안정이 따라와요.`);
      const fields = FIELD_LABEL.map(([k, label]) => ({ key: k, label, text: gcField(x.group, k) }));
      const progress = x.current ? { yearIn: nowYear - x.startYear + 1, left: x.endYear - nowYear, total: x.endYear - x.startYear + 1 } : null;
      if (progress) {
        const ph = progress.yearIn <= 3 ? '초반이라 새 흐름에 적응하며 방향을 잡는 때예요.' : progress.yearIn <= 7 ? '중반이라 이 대운의 힘이 가장 선명하게 드러나는 때예요.' : '후반이라 성과를 정리하고 다음 흐름을 준비하는 때예요.';
        paragraphs.push(`지금 ${nowYear}년은 이 대운의 ${progress.yearIn}년 차예요(전체 ${progress.total}년 중, 남은 기간 약 ${progress.left}년). ${ph}`);
      }
      return {
        ganzhi: x.ganzhi, ko: x.ko, startAge: x.startAge, endAge: x.endAge, startYear: x.startYear, endYear: x.endYear, current: x.current,
        group: x.group, tg: x.tg, zhiTg: zTg, stageName: STAGE_NAME[stage], ganEl: x.ganEl, zhiEl: x.zhiEl,
        summary: `${x.group} 흐름 · ${x.theme}`, paragraphs, fields, good, watch, tips: TG_TIPS[x.tg].slice(), progress,
      };
    }),
    current: cur ? cur.ganzhi : null,
  };
}
