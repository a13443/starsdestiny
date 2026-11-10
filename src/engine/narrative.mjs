// 겹쳐보기 서술형 풀이 엔진 v0.3
// 신호(십성·합충·삼재·개인 연수 등)는 fortune.mjs에서 계산하고, 여기서는 그 신호를 시기별 이야기로 엮어요.
// 문구는 모두 이 앱의 해석이에요. 매매 시점, 업종 추천, 질병·사망 같은 단정적 표현은 쓰지 않아요.
import LJ from 'lunar-javascript';
import * as E from './engine.mjs';
import * as F from './fortune.mjs';

const { Solar } = LJ;
const { GAN, ZHI, GAN_KO, ZHI_KO, EL } = E;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hasB = (w) => { const c = [...String(w)].reverse().find((ch) => /[가-힣]/.test(ch)); return c ? (c.charCodeAt(0) - 0xac00) % 28 !== 0 : false; };
const ye = (noun) => noun + (hasB(noun) ? '이에요' : '예요');

export const CAT_LABEL = { wealth: '재물운', love: '연애운', biz: '사업운', job: '직업운', study: '학업운', cond: '컨디션운' };
export const WEALTH_DISCLAIMER = '재물운은 생활 속 소비·저축 습관을 돌아보는 참고용 풀이예요. 금융상품 선택이나 투자 판단의 근거로 쓰지 마세요.';
export const COND_DISCLAIMER = '의학적 조언이 아니에요. 몸이 불편하면 전문가와 상담하세요.';

/* ───────── 문구 데이터 ───────── */
// [group][cat] = { s: 시기별 짧은 문장, l: 길게 풀어쓴 기조 }
const GC = {
  비겁: {
    wealth: { s: '수입은 내 노력에 비례하지만 지출도 함께 늘기 쉬운 흐름이에요.', l: '내 힘으로 버는 흐름이 중심이에요. 함께 쓰거나 나누는 지출, 보증·동업처럼 돈이 얽히는 일은 한 번 더 따져보는 게 좋아요. 대신 고정 저축을 먼저 떼어두면 흐름이 안정돼요.' },
    love: { s: '대등한 관계에서 편안함을 찾지만 비교 심리가 올라오기 쉬운 흐름이에요.', l: '대등하고 편한 관계를 원하는 흐름이에요. 친구 같은 인연이 편하지만 경쟁심이나 비교 때문에 감정이 흔들릴 수도 있어요. 서로의 영역을 존중하는 선을 먼저 정해두면 좋아요.' },
    biz: { s: '독립해서 직접 해보려는 힘이 커지지만 경쟁도 함께 늘어나는 흐름이에요.', l: '내 이름으로 직접 해보고 싶은 마음이 커지는 흐름이에요. 파트너와 손발은 잘 맞지만 역할과 지분이 흐려지면 다툼이 생기기 쉬워요. 시작 전에 역할을 문서로 정해두면 좋아요.' },
    job: { s: '독립적으로 주도하는 일에서 힘이 나는 흐름이에요.', l: '주도권이 있는 역할과 전문직·프리랜서형이 잘 맞는 흐름이에요. 시키는 일보다 내가 정하는 일에서 힘이 나요. 협업은 역할이 분명할 때 편해요.' },
    study: { s: '내 방식대로 밀고 갈 때 속도가 붙는 흐름이에요.', l: '스스로 정한 방식이 잘 통하는 흐름이에요. 경쟁이 자극이 될 때는 속도가 붙지만, 비교가 지나치면 흔들려요. 나만의 계획표를 우선하세요.' },
    cond: { s: '에너지는 넉넉하지만 무리하기 쉬운 흐름이에요.', l: '에너지가 비교적 넉넉한 흐름이에요. 그래서 무리해서 버티는 습관이 쌓이기 쉬워요. 규칙적인 휴식과 가벼운 운동으로 페이스를 지키세요.' },
  },
  식상: {
    wealth: { s: '만들고 표현한 만큼 수입 아이디어가 늘어나는 흐름이에요.', l: '재능과 아이디어가 돈으로 이어지는 흐름이에요. 기술, 글, 콘텐츠, 서비스처럼 내가 만든 것이 수입이 되기 쉬워요. 다만 수입이 들쭉날쭉할 수 있어서 지출 기록을 같이 두면 좋아요.' },
    love: { s: '마음을 표현하기 쉬워 호감이 잘 전해지는 흐름이에요.', l: '표현이 풍부해지고 매력이 말과 분위기로 드러나는 흐름이에요. 마음을 전하기는 쉬운데 말이 앞서 오해가 생기기도 해요. 한 템포 쉬고 말하면 관계가 더 깊어져요.' },
    biz: { s: '아이디어가 결과물로 이어지는 흐름이에요.', l: '아이디어와 표현이 곧 경쟁력이 되는 흐름이에요. 기획, 콘텐츠, 서비스, 교육처럼 내가 만든 것을 보여주는 일에서 성과가 나기 쉬워요. 다만 벌여놓은 일이 많아지기 쉬워서 우선순위를 줄이는 게 중요해요.' },
    job: { s: '표현하고 만드는 일에서 존재감이 커지는 흐름이에요.', l: '기획, 창작, 교육, 서비스처럼 표현이 곧 성과인 일이 잘 맞아요. 말과 글, 아이디어를 쓰는 자리에서 존재감이 커져요. 반복 업무만 이어지면 지치기 쉬우니 변주를 주세요.' },
    study: { s: '배운 것을 꺼내 표현할 때 실력이 느는 흐름이에요.', l: '말하고 정리하며 배울 때 오래 남는 흐름이에요. 요약, 발표, 글쓰기처럼 밖으로 꺼내는 공부가 잘 맞아요. 호기심이 여러 갈래로 퍼지기 쉬우니 하나를 끝까지 마무리하세요.' },
    cond: { s: '생각과 표현에 에너지를 많이 쓰는 흐름이에요.', l: '생각과 표현에 에너지를 많이 쓰는 흐름이에요. 수면과 식사 리듬이 곧 컨디션을 좌우해요. 늦은 밤 작업을 줄이고 말을 쉬는 시간을 두세요.' },
  },
  재성: {
    wealth: { s: '수입 기회가 눈에 띄지만 욕심이 앞서기 쉬운 흐름이에요.', l: '현실 감각이 살아나 수입과 지출을 구체적으로 보게 되는 흐름이에요. 활동 반경이 넓어지면서 기회도 늘지만 욕심이 커지기 쉬워요. 들어오는 돈의 크기보다 남기는 구조를 먼저 정해두면 좋아요.' },
    love: { s: '만남의 기회가 넓어지고 챙기는 마음이 커지는 흐름이에요.', l: '관계에도 현실감이 붙는 흐름이에요. 챙기는 마음이 크고 만남의 기회도 넓어지지만, 상대의 속도를 놓치기 쉬워요. 상대가 편안한지 가끔 물어보는 것만으로도 좋아요.' },
    biz: { s: '고객과 거래처가 늘어나는 기회가 보이는 흐름이에요.', l: '시장과 고객이 눈에 들어오는 흐름이에요. 영업, 유통, 거래처 확장에서 기회가 생기지만 현금 흐름 관리가 느슨해지기 쉬워요. 매출보다 남는 돈을 먼저 보세요.' },
    job: { s: '성과가 숫자로 보이는 현실적인 일에서 힘이 나는 흐름이에요.', l: '영업, 유통, 운영, 기획처럼 성과가 숫자로 보이는 일이 잘 맞아요. 현실 감각과 실행력이 장점이에요. 바쁨에 휩쓸리지 않게 우선순위를 정해두면 좋아요.' },
    study: { s: '쓰임이 분명한 목표가 있을 때 속도가 붙는 흐름이에요.', l: '목표가 분명할 때 속도가 붙는 흐름이에요. 자격증이나 시험처럼 쓰임이 분명한 공부가 잘 맞아요. 바깥 일정이 많으면 공부 시간이 쪼개지니 시간을 먼저 확보하세요.' },
    cond: { s: '바쁜 일정 속에서 회복 시간이 줄어들기 쉬운 흐름이에요.', l: '바쁜 일정에 몸이 따라가는 흐름이에요. 일과 일 사이의 회복 시간이 짧아지기 쉬워요. 짧은 산책이나 스트레칭을 일정표에 미리 넣어두세요.' },
  },
  관성: {
    wealth: { s: '정해진 틀 안의 안정적인 수입이 힘이 되는 흐름이에요.', l: '안정적인 소득과 정해진 규칙이 힘이 되는 흐름이에요. 조직·제도 안에서 얻는 수입이 편하고, 큰 변동을 노리는 선택은 맞지 않기 쉬워요. 원칙을 정해 꾸준히 적립하는 방식이 어울려요.' },
    love: { s: '진지하고 믿음직한 인연에 마음이 가는 흐름이에요.', l: '책임감 있고 진지한 관계가 중심인 흐름이에요. 믿음직한 사람과 인연이 닿기 쉽지만, 규칙과 기대가 많아지면 서로 숨이 막힐 수 있어요. 숨 쉴 틈과 가벼운 시간을 일부러 만들어 보세요.' },
    biz: { s: '체계를 갖출수록 신뢰와 평가가 쌓이는 흐름이에요.', l: '체계와 신뢰로 키우는 흐름이에요. 규정, 품질, 계약처럼 틀을 갖출수록 평가가 좋아지지만 압박감도 같이 커져요. 일정에 여유를 두면 안정적으로 갈 수 있어요.' },
    job: { s: '조직 안에서 책임을 맡으며 인정받는 흐름이에요.', l: '조직과 제도 안에서 책임을 맡는 일, 공공·관리·법규 분야가 잘 맞아요. 신뢰를 쌓을수록 위치가 올라가요. 부담을 혼자 지지 않도록 나누는 연습이 필요해요.' },
    study: { s: '계획과 마감이 있을 때 집중이 잘되는 흐름이에요.', l: '계획과 마감이 있을 때 힘이 나는 흐름이에요. 시험 준비처럼 틀이 있는 공부에 강해요. 압박이 커지면 효율이 떨어지니 쉬는 구간도 계획에 넣으세요.' },
    cond: { s: '책임감으로 긴장이 쌓이기 쉬운 흐름이에요.', l: '긴장이 쌓이기 쉬운 흐름이에요. 책임이 늘수록 몸이 먼저 굳을 수 있어서 해소 루틴이 중요해요. 스트레칭, 산책, 따뜻한 샤워처럼 몸을 풀어주는 습관을 만들어 보세요.' },
  },
  인성: {
    wealth: { s: '공부하고 확신이 선 뒤에 움직이면 좋은 흐름이에요.', l: '아는 만큼 지키는 흐름이에요. 공부하고 확신이 선 뒤에 움직이면 좋은 결과가 따라오지만, 결정을 미루다 기회를 놓치기도 쉬워요. 자격과 지식에 쓰는 비용은 나중에 돌아오기 쉬워요.' },
    love: { s: '편안하게 기댈 수 있는 관계를 찾게 되는 흐름이에요.', l: '정서적 안정과 배려를 중요하게 보는 흐름이에요. 편안하게 기댈 수 있는 관계가 잘 맞지만, 기대고 의존하는 마음이 커지기 쉬워요. 서로 독립된 시간을 존중하면 관계가 오래가요.' },
    biz: { s: '전문성과 주변의 도움으로 단단해지는 흐름이에요.', l: '전문성과 신뢰로 승부하는 흐름이에요. 아는 것을 정리해 파는 교육, 컨설팅, 문서 업무에서 도움이 들어와요. 실행이 느려지기 쉬우니 작게 먼저 시험해 보세요.' },
    job: { s: '전문성과 신뢰를 쌓는 일에서 힘이 나는 흐름이에요.', l: '연구, 교육, 문서·심사처럼 지식과 신뢰가 쌓이는 일이 잘 맞아요. 깊이 있는 전문성이 강점이에요. 실행과 발표를 일부러 늘리면 기회가 커져요.' },
    study: { s: '깊이 있게 파고들며 좋은 자료와 도움을 만나는 흐름이에요.', l: '깊이 파고드는 공부가 강점인 흐름이에요. 자료를 충분히 모은 뒤 정리하면 효율이 높고, 좋은 스승이나 자료와도 인연이 닿기 쉬워요. 읽기만 하지 말고 문제를 풀며 확인하세요.' },
    cond: { s: '마음이 편안할수록 컨디션이 좋아지는 흐름이에요.', l: '마음이 편해야 몸도 편한 흐름이에요. 혼자 쉬는 시간과 규칙적인 생활이 도움이 돼요. 생각이 많아질 때는 몸을 움직이며 환기하세요.' },
  },
};

// 십성별 성격(명사 앞에 붙는 말) — "...는 해예요 / 달이에요 / 날이에요"
const TG_FLAVOR = {
  비견: '같은 결의 기운이라 내 페이스를 믿고 가는', 겁재: '비슷한 기운이 경쟁자처럼 들어와 나눠 쓰고 비교하게 되는', 식신: '느긋하게 만들고 즐기면서 결과가 쌓이는',
  상관: '재능이 튀어나오지만 말과 표현의 수위를 조절해야 하는', 편재: '활동 반경이 넓고 변화가 큰 기회형', 정재: '꾸준하고 안정적인 쌓임이 중심인',
  편관: '압박과 도전이 크지만 성장으로 이어지는', 정관: '질서와 신뢰가 쌓이고 평가받는', 편인: '생각이 깊어지고 전문 영역을 파고드는', 정인: '도움과 배움이 들어오는',
};
const YEAR_LEVEL = {
  5: '여러 신호가 같은 방향을 가리켜서 적극적으로 움직여 볼 만한 해예요.', 4: '전반적으로 순조로운 흐름이에요.',
  3: '크게 기울지 않는 평탄한 흐름이에요.', 2: '조심스럽게 운영하면 좋은 해예요.', 1: '새로 벌이기보다 지키는 데 무게를 두면 좋은 해예요.',
};
const LEVEL_GLOSS = {
  5: '여러 신호가 같은 방향을 가리키는 드문 날이에요. 미뤄둔 일을 꺼내 보기 좋아요.', 4: '전반적으로 순조로운 날이에요. 평소보다 한 걸음 더 나가 봐도 좋아요.',
  3: '크게 기울지 않는 평범한 날이에요. 평소 루틴을 지키는 게 가장 좋아요.', 2: '조금 조심스러운 날이에요. 속도를 낮추고 점검하는 데 쓰면 좋아요.',
  1: '신중함이 필요한 날이에요. 큰 결정은 미루고 쉬어가는 마음으로 보내세요.',
};
const PHASE_LABEL = ['연초(2~5월)', '연중(6~9월)', '연말(10월~다음 해 1월)'];
const PATTERN = {
  rise: ['{lab}에는 아직 속도를 내기보다 준비하는 쪽이 어울려요. {S}', '{lab}에 접어들면서 흐름이 풀리기 시작해요. {S}', '{lab}으로 갈수록 흐름이 눈에 띄게 좋아지고 성장할 기회가 생겨요. {S}'],
  fall: ['{lab}에는 흐름이 좋아서 기회를 먼저 잡기 좋아요. {S}', '{lab}에는 슬슬 속도를 조절해야 해요. {S}', '{lab}에는 넓히기보다 정리와 마무리에 힘을 쓰는 게 좋아요. {S}'],
  midPeak: ['{lab}에는 차분하게 기반을 다지는 시기예요. {S}', '{lab}이 올해의 정점이에요. {S}', '{lab}에는 정점의 열기가 가라앉으니 얻은 것을 지키는 데 집중하세요. {S}'],
  midDip: ['{lab}에는 비교적 순조롭게 출발해요. {S}', '{lab}에는 한 번 숨을 고르는 구간이 와요. 무리한 결정은 미루는 게 좋아요. {S}', '{lab}에는 다시 흐름을 되찾아요. {S}'],
  steadyHigh: ['{lab}부터 흐름이 좋아요. {S}', '{lab}에도 좋은 흐름이 이어져요. {S}', '{lab}까지 큰 기복 없이 안정적으로 이어져요. {S}'],
  steadyLow: ['{lab}에는 무리하지 않고 지키는 쪽이 어울려요. {S}', '{lab}에도 조심스러운 흐름이 이어져요. {S}', '{lab}에는 서서히 숨통이 트이기 시작해요. {S}'],
  steady: ['{lab}에는 큰 기복 없이 평탄하게 시작해요. {S}', '{lab}에도 평탄한 흐름이에요. {S}', '{lab}에도 비슷한 결로 이어져요. {S}'],
};
// 시기 평균이 높은데(3.6 이상) 하락 패턴의 중·후반일 때 쓰는 완화 문구
const PATTERN_HI = {
  fall: [null, '{lab}에도 좋은 흐름이 이어져요. 다만 정점을 지나는 구간이라 조금씩 속도를 조절하면 좋아요. {S}', '{lab}에도 흐름은 나쁘지 않아요. 다만 새로 넓히기보다 정리와 마무리에 무게를 두면 좋아요. {S}'],
};
const CAUTION = {
  wealth: '큰 지출과 보증·대여처럼 돈이 얽히는 결정은 미루고, 새는 돈부터 점검하세요.', love: '감정이 앞서기 쉬우니 중요한 말은 하루 쉬었다가 전하세요.',
  biz: '새 계약과 확장은 서두르지 말고 현금 흐름과 일정을 먼저 점검하세요.', study: '새 과목을 늘리기보다 기본기와 복습에 집중하세요.', cond: '수면과 식사 리듬을 먼저 지키고 일정에 쉬는 시간을 넣으세요.',
};
const CHANCE = {
  wealth: '새 수입원을 작게 시험해 보거나, 배우고 싶던 분야를 공부해 보기에 좋아요.', love: '새로운 만남이나 마음 표현에 용기를 내 보기 좋아요.',
  biz: '제안을 내고 새 거래처를 만나 보기에 좋아요.', study: '새 과목이나 자격에 도전해 보기에 좋아요.', cond: '새 운동이나 생활 습관을 시작하기에 좋아요.',
};
const DAY_CHANCE = {
  wealth: '오늘은 새 수입 아이디어를 메모하거나 필요한 지출을 계획하기에 좋아요.', love: '오늘은 안부를 먼저 건네거나 마음을 표현하기에 좋아요.',
  biz: '오늘은 제안, 보고, 미팅처럼 사람을 만나는 일을 앞에 배치해 보세요.', study: '오늘은 어려운 과제를 먼저 풀기에 좋은 날이에요.', cond: '오늘은 가벼운 운동이나 산책으로 에너지를 쓰기 좋아요.',
};
const DAY_CAUTION = {
  wealth: '오늘은 충동구매와 큰 결제를 미루고 지출을 한 번 더 확인하세요.', love: '오늘은 중요한 대화를 서두르지 말고 한 템포 쉬세요.',
  biz: '오늘은 계약·합의를 한 번 더 확인하고 일정에 여유를 두세요.', study: '오늘은 새 내용보다 복습과 정리가 잘 맞아요.', cond: '오늘은 일찍 쉬고 무리한 일정은 줄이세요.',
};
const DAY_FLAT = '오늘은 평소 루틴을 지키는 것이 가장 좋은 선택이에요.';
const EVENT = {
  love_pos: (m, p) => `${m}월(${p})에는 내 일지와 합이 들어와 마음이 편해지고 인연이 닿기 쉬워요.`,
  love_neg: (m, p) => `${m}월(${p})에는 내 일지와 충·형이 걸려 감정 기복이 생기기 쉬우니 말을 아끼는 게 좋아요.`,
  wealth_pos: (m, p) => `${m}월(${p})에는 내 띠와 합이 들어와 주변의 도움이나 협력으로 기회가 생겨요.`,
  biz_neg: (m, p) => `${m}월(${p})에는 내 띠와 충·형이 걸려 일정과 거래에서 변동이 생기기 쉬우니 여유를 두세요.`,
};
const TIPS = {
  wealth: { low: ['월 고정 저축액을 먼저 떼어두고 남는 돈으로 생활하는 구조를 만들어 보세요.', '구독·자동결제처럼 새는 지출을 한 번에 정리하는 날을 정해 보세요.', '큰 결제나 보증·대여는 하루 이상 묵힌 뒤 결정하세요.'],
    mid: ['수입과 지출을 한 달만 꼼꼼히 기록해 흐름부터 눈으로 확인해 보세요.', '자기계발이나 자격처럼 나중에 돌아오는 곳에 일정 비율을 쓰는 것도 방법이에요.', '새로운 수입원은 작게 시험해 본 뒤 키워 보세요.'],
    high: ['기회는 좋지만 남기는 구조가 먼저예요. 늘어난 수입의 일정 비율을 자동 저축으로 돌려 두세요.', '관심 분야를 공부하거나 작은 프로젝트로 경험을 쌓는 방식으로 접근해 보세요.', '기쁜 마음에 지출이 늘기 쉬우니 큰 결정은 한 템포 쉬고 하세요.'] },
  love: { low: ['중요한 대화는 감정이 가라앉은 뒤로 미루고 문자 대신 목소리로 전해 보세요.', '상대를 바꾸려 하기보다 내가 편한 거리를 먼저 정해 보세요.', '혼자 보내는 시간을 일정에 넣어 감정의 여유를 만드세요.'],
    mid: ['작은 안부와 고마움을 자주 표현하는 것만으로도 관계가 안정돼요.', '새로운 모임이나 취미에 한 번 나가 보세요.', '상대의 속도와 내 속도를 가끔 비교해 점검해 보세요.'],
    high: ['마음이 열린 시기이니 먼저 연락하고 만남을 제안해 보세요.', '좋은 인상은 꾸밈보다 편안한 태도에서 나와요. 솔직하게 표현해 보세요.', '설레는 마음이 클수록 상대의 속도를 한 번 더 살피세요.'] },
  biz: { low: ['새 계약과 확장은 미루고 현재 거래의 문서와 일정부터 정리하세요.', '중요한 합의는 문서로 남기고 역할과 책임을 분명히 하세요.', '무리한 일정을 줄이고 핵심 한두 가지에 집중하세요.'],
    mid: ['하고 싶은 일을 세 가지로 줄여 우선순위를 정해 보세요.', '고객이나 동료의 피드백을 월 1회 정리해 방향을 조정하세요.', '작게 시험해 보고 반응을 본 뒤 규모를 키우세요.'],
    high: ['제안서와 기획을 내놓기 좋은 시기예요. 미뤄둔 아이디어를 꺼내 보세요.', '새 거래처와 협업을 시도하되 현금 흐름 기준을 먼저 세우세요.', '기회가 많을수록 집중이 흐려져요. 이번 시즌의 한 가지 목표를 정하세요.'] },
  job: { low: ['하루 중 가장 집중되는 시간에 핵심 업무를 먼저 배치해 보세요.', '내가 잘하는 일 세 가지와 좋아하는 일 세 가지를 적어 겹치는 곳을 찾아보세요.', '3개월 단위로 배운 것과 성과를 기록해 두면 방향이 보여요.'],
    mid: ['하루 중 가장 집중되는 시간에 핵심 업무를 먼저 배치해 보세요.', '내가 잘하는 일 세 가지와 좋아하는 일 세 가지를 적어 겹치는 곳을 찾아보세요.', '3개월 단위로 배운 것과 성과를 기록해 두면 방향이 보여요.'],
    high: ['하루 중 가장 집중되는 시간에 핵심 업무를 먼저 배치해 보세요.', '내가 잘하는 일 세 가지와 좋아하는 일 세 가지를 적어 겹치는 곳을 찾아보세요.', '3개월 단위로 배운 것과 성과를 기록해 두면 방향이 보여요.'] },
  study: { low: ['새 과목을 늘리기보다 기본기 복습에 시간을 쓰세요.', '공부 시간을 짧게 나눠 하루 두세 번 집중해 보세요.', '스마트폰을 멀리 두는 시간 규칙을 정해 보세요.'],
    mid: ['하루 공부량을 작게 정하고 연속 일수를 쌓아 보세요.', '배운 내용을 소리 내어 설명하거나 요약해 보세요.', '주 1회 모의 점검으로 약한 부분을 확인하세요.'],
    high: ['새 자격이나 어려운 과제에 도전하기 좋은 시기예요.', '스터디나 멘토에게 조언을 구하면 속도가 붙어요.', '집중이 잘되는 시간대를 찾아 가장 어려운 공부를 그때 배치하세요.'] },
  cond: { low: ['취침과 기상 시각을 먼저 고정하고 일정 사이에 쉬는 시간을 넣으세요.', '카페인과 늦은 야식을 줄이고 물을 자주 마셔 보세요.', '하루 10분 걷기나 스트레칭으로 몸을 풀어 주세요.'],
    mid: ['식사 시간을 규칙적으로 지키는 것만으로도 컨디션이 안정돼요.', '주 3회 가벼운 운동 루틴을 만들어 보세요.', '잠들기 전 화면을 줄이고 조용한 시간을 만들어 보세요.'],
    high: ['컨디션이 좋은 시기에 새 운동이나 습관을 시작해 보세요.', '에너지가 넘칠수록 과로하기 쉬우니 쉬는 날을 미리 정해 두세요.', '좋은 리듬을 기록해 두면 힘든 시기에 도움이 돼요.'] },
};
const DAY_TIPS = {
  wealth: { low: ['오늘 결제는 장바구니에 담아두고 내일 다시 확인해 보세요.', '구독·자동결제 내역을 5분만 훑어보세요.'], mid: ['오늘 쓴 돈을 저녁에 한 줄씩 기록해 보세요.', '이번 주 꼭 필요한 지출 세 가지만 적어 보세요.'], high: ['오늘 떠오른 수입 아이디어를 바로 메모해 두세요.', '필요한 지출이 있다면 가격을 두세 곳 비교한 뒤 결정하세요.'] },
  love: { low: ['중요한 연락은 내일로 미루고 오늘은 안부 정도만 전해 보세요.', '혼자 쉬는 시간을 먼저 확보하세요.'], mid: ['고마운 사람에게 짧은 메시지를 하나 보내 보세요.', '오늘은 상대의 이야기를 평소보다 길게 들어 보세요.'], high: ['마음에 둔 사람에게 먼저 가볍게 연락해 보세요.', '솔직하고 편안한 표현이 가장 좋은 인상을 남겨요.'] },
  biz: { low: ['계약서와 메일은 보내기 전에 한 번 더 읽어 보세요.', '오늘 일정에 30분 정도 여유 시간을 넣어 두세요.'], mid: ['오늘 할 일을 세 가지로 줄여 우선순위를 정하세요.', '미뤄둔 답장 한두 개를 정리해 보세요.'], high: ['미뤄둔 제안이나 보고를 오늘 꺼내 보세요.', '새로 만날 사람이 있다면 질문 두 가지를 미리 준비하세요.'] },
  study: { low: ['새 단원 대신 어제 공부한 내용을 복습해 보세요.', '25분 집중, 5분 휴식으로 짧게 끊어 해 보세요.'], mid: ['오늘 공부 목표를 한 문장으로 적고 시작하세요.', '배운 것을 소리 내어 한 번 설명해 보세요.'], high: ['가장 어려운 과제를 집중이 잘 되는 시간에 먼저 풀어 보세요.', '모르는 부분은 오늘 안에 질문으로 정리해 두세요.'] },
  cond: { low: ['오늘은 취침 시각을 평소보다 30분 앞당겨 보세요.', '카페인은 오후 이전까지만 마셔 보세요.'], mid: ['점심 후 10분 걷기를 해 보세요.', '물을 자주 마시고 식사 시간을 지켜 보세요.'], high: ['가벼운 운동이나 산책을 일정에 넣어 보세요.', '좋은 컨디션일수록 과하지 않게, 쉬는 시간도 함께 넣어 두세요.'] },
};
const SINSAL_CAT = {
  love: { 도화: '사람을 끄는 매력이 있고 만남의 기회가 많은 편이에요. 호감이 많다고 서두르기보다 오래 갈 사람을 천천히 고르세요.' },
  job: { 역마: '이동과 변화에 강해 출장·영업·유통처럼 움직이는 자리에서 에너지가 살아나요.', 화개: '혼자 깊이 파고드는 재능이 있어 연구, 창작, 전문 기술 같은 일에 잘 맞아요.', 천을귀인: '윗사람이나 멘토의 도움을 받기 쉬운 편이에요.' },
  biz: { 역마: '새로운 시장과 거래처를 찾아 움직일 때 기회가 생겨요.', 천을귀인: '중요한 순간에 도와주는 사람이 나타나기 쉬우니 인맥을 소중히 하세요.' },
  study: { 화개: '혼자 깊이 몰입하는 재능이 있어 학문과 예술 쪽 공부가 잘 맞아요.', 천을귀인: '좋은 스승이나 자료를 만나기 쉬워요.' },
  wealth: { 천을귀인: '어려울 때 주변의 도움이 닿기 쉬워서 재정 문제도 혼자 끌어안지 않는 게 좋아요.' },
};

/* ───────── 유틸 ───────── */
const band = (lv) => (lv <= 2 ? 'low' : lv >= 4 ? 'high' : 'mid');
const dominantGroup = (list) => { const c = {}; list.forEach((g) => { c[g] = (c[g] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
const eun = (w) => w + (hasB(w) ? '은' : '는');
const ga = (w) => w + (hasB(w) ? '이' : '가');
const labOf = (arr) => arr.map((x) => F.SYS_LABEL[x.sys || x]).join('·');

export function patternOf(a) {
  const [l1, l2, l3] = a;
  if (l3 - l1 >= 1 && l2 >= l1 - 0.3) return 'rise';
  if (l1 - l3 >= 1) return 'fall';
  if (l2 - Math.max(l1, l3) >= 0.7) return 'midPeak';
  if (Math.min(l1, l3) - l2 >= 0.7) return 'midDip';
  if (Math.min(l1, l2, l3) >= 3.7) return 'steadyHigh';
  if (Math.max(l1, l2, l3) <= 2.3) return 'steadyLow';
  return 'steady';
}
/** 그 달에 해당 분야로 같은 방향 표를 던진 체계들의 대표 근거 문장(최대 2개) */
function monthWhy(m, cat, sign, seen) {
  const c = m.cats.find((x) => x.key === cat);
  const out = [];
  for (const v of c.votes) {
    if (v.v !== sign) continue;
    const it = v.items.find((x) => Math.sign(x.v) === sign && !(seen && seen.has(x.text)));
    if (it) { out.push(it.text); if (seen) seen.add(it.text); }
    if (out.length >= 2) break;
  }
  return out.join(' ');
}
/** 여러 달에 걸친 체계별 합의 한 문장 */
function phaseConsensus(seg, cat, active) {
  const votes = active.map((sys) => { let sum = 0; for (const m of seg) { const v = m.cats.find((x) => x.key === cat).votes.find((x) => x.sys === sys); sum += v ? v.v : 0; } return { sys, v: Math.sign(sum) }; });
  const pos = votes.filter((v) => v.v > 0), neg = votes.filter((v) => v.v < 0);
  if (pos.length >= 2 && !neg.length) return `이 시기에는 ${eun(labOf(pos))} 좋은 방향을 함께 가리켜요.`;
  if (neg.length >= 2 && !pos.length) return `이 시기에는 ${eun(labOf(neg))} 조심 신호를 함께 보내요.`;
  if (pos.length && neg.length) return `이 시기에는 ${eun(labOf(pos))} 좋은 방향, ${eun(labOf(neg))} 조심 신호로 엇갈려요.`;
  return '';
}
/** 체계별 대표 근거를 한 문단으로 */
function systemDetail(votes) {
  const parts = [];
  for (const v of votes) { if (v.v === 0) continue; const it = v.items.find((x) => Math.sign(x.v) === v.v); if (it) parts.push(`${F.SYS_LABEL[v.sys]}: ${it.text}`); }
  return parts.join(' ');
}

/* ───────── 신년운 서술 ───────── */
export function yearNarrative(p, Y) {
  const base = F.yearlyReading(p, Y);
  const months = base.monthDetail;
  const active = F.activeSystems(p);
  const group = F.TG_GROUP[base.tg];
  const luck = F.luckyElement(p.saju.count, E.GAN_EL[E.GAN.indexOf(base.pillar[0])], E.ZHI_EL[E.ZHI.indexOf(base.pillar[1])]);
  const cats = base.cats.map((c) => {
    const cat = c.key;
    const lvSeries = months.map((m) => m.lv[cat]);
    const ph = [0, 1, 2].map((i) => {
      const seg = months.slice(i * 4, i * 4 + 4);
      const avg = seg.reduce((a, m) => a + m.lv[cat], 0) / seg.length;
      return { label: PHASE_LABEL[i], avg, level: Math.round(avg), group: dominantGroup(seg.map((m) => m.group)), seg };
    });
    const pat = patternOf(ph.map((x) => x.avg));
    const para = [];
    para.push(`${Y}년은 ${base.pillarKo}년(${base.pillar}), 내 일간 기준 ${base.tg}의 해예요. 쉽게 말해 ${TG_FLAVOR[base.tg]} ${ye('해')}. ${CAT_LABEL[cat]}은 ${YEAR_LEVEL[c.level]} ${GC[group][cat].l}`);
    const det = systemDetail(c.votes);
    const seen = new Set(c.votes.flatMap((v) => v.items.map((x) => x.text)).filter((t) => det.includes(t)));
    para.push(`체계별로 겹쳐 보면, ${CAT_LABEL[cat]}은 ${c.consensus.text}${det ? ' ' + det : ''}`);
    const best = months.reduce((a, m) => (m.lv[cat] > a.lv[cat] ? m : a), months[0]);
    const worst = months.reduce((a, m) => (m.lv[cat] < a.lv[cat] ? m : a), months[0]);
    const used = new Set();
    ph.forEach((x, i) => {
      const tpl = (x.avg >= 3.6 && PATTERN_HI[pat] && PATTERN_HI[pat][i]) || PATTERN[pat][i];
      let t = tpl.replace('{lab}', x.label).replace('{S}', GC[x.group][cat].s);
      if (x.avg <= 2.4) t += ' ' + CAUTION[cat];
      else if (x.avg >= 3.8) t += ' ' + CHANCE[cat];
      const pc = phaseConsensus(x.seg, cat, active);
      if (pc) t += ' ' + pc;
      const high = x.avg >= 3;
      const key = x.seg.reduce((a, m) => (high ? (m.lv[cat] > a.lv[cat] ? m : a) : (m.lv[cat] < a.lv[cat] ? m : a)), x.seg[0]);
      if (key !== best && key !== worst && key.lv[cat] !== 3) {
        const why = monthWhy(key, cat, high ? 1 : -1, seen);
        if (why) { t += ` 이 시기에는 ${key.solarMonth}월(${key.pillar})을 눈여겨보세요. ${why}`; used.add(key); }
      }
      para.push(t);
    });
    const hl = [];
    if (best.lv[cat] > worst.lv[cat]) {
      hl.push(`한 해 중 가장 흐름이 좋은 달은 ${best.solarMonth}월(${best.pillar})이에요. ${monthWhy(best, cat, 1, seen) || `내 일간 기준 ${best.tg}의 달이라 평소보다 한 걸음 더 나가 봐도 좋아요.`}`);
      hl.push(`가장 조심할 달은 ${worst.solarMonth}월(${worst.pillar})이에요. ${monthWhy(worst, cat, -1, seen) || `내 일간 기준 ${worst.tg}의 달이라 속도를 낮추고 점검하는 데 쓰면 좋아요.`}`);
    }
    if (hl.length) para.push(hl.join(' '));
    const ex = [];
    if (F.PERSONAL_CAT[base.personalYear.py] === cat) ex.push(`수비학으로 보면 올해는 개인 연수 ${base.personalYear.py}, ${base.personalYear.keyPy}의 해라 이 분야에도 힘이 실려요.`);
    if (base.samjae && (cat === 'biz' || cat === 'cond' || cat === 'wealth')) ex.push(`올해는 ${base.samjae.stage} 해라 크게 넓히기보다 점검하고 정리하는 쪽에 무게를 두면 좋아요.`);
    if (cat === 'wealth') ex.push(`올해 보강하면 좋은 기운은 ‘${EL[luck.element].ko}’이에요. 그 기운의 색이나 활동을 생활 속 작은 포인트로 더해 보세요. ${WEALTH_DISCLAIMER}`);
    if (cat === 'cond') ex.push(COND_DISCLAIMER);
    if (ex.length) para.push(ex.join(' '));
    return {
      key: cat, label: c.label, level: c.level, levelLabel: c.levelLabel,
      summary: `올해 ${CAT_LABEL[cat]}은 ‘${c.levelLabel}’ 정도로 읽혀요.`,
      phases: ph.map((x) => ({ label: x.label, level: x.level })), pattern: pat, series: lvSeries,
      votes: c.votes, consensus: c.consensus, paragraphs: para, tips: TIPS[cat][band(c.level)].slice(), signals: c.reasons,
    };
  });
  return { year: Y, pillar: base.pillar, pillarKo: base.pillarKo, tg: base.tg, head: base.head, cats, samjae: base.samjae, personalYear: base.personalYear, dasha: base.dasha, months: base.months, active, yearStar: base.yearStar };
}

/* ───────── 오늘의 풀이 서술 ───────── */
function hourFlowCat(p, y, m, d, cat) {
  const dm = p.saju.pillars.day.gi, myZ = p.saju.pillars.day.zi;
  const idx = { wealth: 0, biz: 1, study: 2, cond: 3 };
  return F.HOURS.map(([ko, h, range]) => {
    const tp = Solar.fromYmdHms(y, m, d, h, 0, 0).getLunar().getEightChar().getTime();
    const gi = GAN.indexOf(tp[0]), zi = ZHI.indexOf(tp[1]);
    const tg = F.tenGod(dm, gi);
    const eff = cat === 'love' ? ((F.TG_LOVE[p.gender || ''] || {})[tg] || 0) : F.TG_EFFECT[tg][idx[cat]];
    return { ko, range, score: eff + F.relScore(F.branchTags(zi, myZ)) };
  });
}
export function dailyNarrative(p, R) {
  const { y, m, d } = R.date;
  return R.cats.map((c) => {
    const cat = c.key;
    const hours = hourFlowCat(p, y, m, d, cat);
    let best = hours[0], worst = hours[0];
    hours.forEach((h) => { if (h.score > best.score) best = h; if (h.score < worst.score) worst = h; });
    const today = [];
    today.push(c.level >= 4 ? DAY_CHANCE[cat] : c.level <= 2 ? DAY_CAUTION[cat] : DAY_FLAT);
    if (best.score > worst.score) today.push(`시간대로는 ${best.ko}시(${best.range})가 가장 순조롭고, ${worst.ko}시(${worst.range})는 천천히 가는 편이 좋아요. (사주 12시진 기준)`);
    const lucky = (cat === 'love' || cat === 'study') ? `오늘 곁에 두면 좋은 색은 ${R.lucky.color} 계열이에요.` : (cat === 'wealth' ? `오늘 곁에 둘 물건으로는 ${R.lucky.items[0]}${F.iga(R.lucky.items[0])} 어울려요.` : '');
    if (lucky) today.push(lucky);
    if (cat === 'cond') today.push(COND_DISCLAIMER);
    return {
      key: cat, label: c.label, level: c.level, levelLabel: c.levelLabel,
      summary: `오늘 ${CAT_LABEL[cat]}은 ‘${c.levelLabel}’ 정도로 읽혀요. ${LEVEL_GLOSS[c.level]}`,
      votes: c.votes, consensus: c.consensus,
      good: c.signals.filter((r) => r.v > 0).map((r) => r.text), watch: c.signals.filter((r) => r.v < 0).map((r) => r.text),
      items: c.signals,
      today, tips: DAY_TIPS[cat][band(c.level)].slice(),
    };
  });
}

/* ───────── 운명풀이(총운) 서술 ───────── */
export const DESTINY_CATS = [['wealth', '재물'], ['biz', '사업'], ['job', '직업'], ['study', '학업'], ['love', '연애·관계'], ['cond', '컨디션 관리']];
// 체계별 타고난 성향 → 강점 분야 (이 앱의 해석: 기운 키워드 기반, 6개 체계가 같은 표를 써요)
const GROUP_FIELD = { 비겁: ['biz', 'job'], 식상: ['job', 'wealth', 'study'], 재성: ['wealth', 'biz'], 관성: ['job', 'biz'], 인성: ['study', 'job', 'cond'] };
const EL_AFF = { fire: ['love', 'biz', 'job'], water: ['study', 'love', 'cond'], wood: ['study', 'job', 'biz'], metal: ['job', 'biz', 'wealth'], earth: ['wealth', 'cond', 'love'] };
const NUM_AFF = { 1: ['biz', 'job'], 2: ['love', 'cond'], 3: ['job', 'love'], 4: ['wealth', 'cond'], 5: ['job', 'biz'], 6: ['love', 'cond'], 7: ['study', 'job'], 8: ['wealth', 'biz'], 9: ['love', 'study'], 11: ['study', 'love'], 22: ['biz', 'wealth'], 33: ['love', 'cond'] };
/** 십성 그룹 × 분야의 긴 문장(대운 상세에서 써요) */
export function gcField(group, cat) { return GC[group][cat].l; }

export function affinity(p, top) {
  const out = [{ sys: '사주', key: `${top} 중심`, fields: GROUP_FIELD[top] }];
  out.push({ sys: '서양', key: `${p.west.name}(${EL[p.west.element].ko} 기운)`, fields: EL_AFF[p.west.element] });
  out.push({ sys: '띠', key: `${p.animal.name}띠(${EL[p.animal.element].ko} 기운)`, fields: EL_AFF[p.animal.element] });
  out.push({ sys: '수비학', key: `생명수 ${p.num.n}`, fields: NUM_AFF[p.num.n] });
  if (p.vedic) out.push({ sys: '베딕', key: `달 ${p.vedic.moon.name}(${EL[p.vedic.element].ko} 기운)`, fields: EL_AFF[p.vedic.element] });
  if (p.nine) out.push({ sys: '구성기학', key: `${p.nine.name}(${EL[p.nine.element].ko} 기운)`, fields: EL_AFF[p.nine.element] });
  return out;
}
export function destinyNarrative(p, nowYear) {
  const D = F.destiny(p);
  const dw = F.daewoon(p, nowYear);
  const cur = dw ? dw.list.find((x) => x.current) : null;
  const top = D.top;
  const second = D.ranked[1] && D.ranked[1][1] > 0 ? D.ranked[1][0] : null;
  const minCnt = Math.min(...F.ELEMENT_ORDER.map((k) => p.saju.count[k]));
  const weak = F.ELEMENT_ORDER.filter((k) => p.saju.count[k] === minCnt)[0];
  const aff = affinity(p, top);
  const fields = DESTINY_CATS.map(([cat, label]) => {
    const strong = aff.filter((a) => a.fields.includes(cat));
    const para = [];
    para.push(`내 사주는 ${top} 기운이 가장 두드러져요. ${GC[top][cat].l}`);
    if (strong.length) para.push(`체계별로 겹쳐 보면 ${aff.length}개 체계 중 ${strong.length}개, 즉 ${ga(labOf(strong))} ${label}을 강점으로 가리켜요. ${strong.map((a) => `${F.SYS_LABEL[a.sys]}(${a.key})`).join(', ')}이에요.`.replace(`${label}을 강점`, `${label}${hasB(label) ? '을' : '를'} 강점`));
    else para.push(`체계별로 겹쳐 보면 ${aff.length}개 체계 모두 이 분야를 특별히 가리키지 않아요. 타고난 강점보다 연습으로 채워 가는 영역이에요.`);
    if (second && second !== top) para.push(`여기에 ${second} 기운도 함께 있어 ${GC[second][cat].s}`);
    const sl = D.sinsal.filter((s) => SINSAL_CAT[cat] && SINSAL_CAT[cat][s.key]).map((s) => `사주 ${s.where}에 ${s.key}${F.iga(s.key)} 있어서 ${SINSAL_CAT[cat][s.key]}`);
    if (sl.length) para.push(sl.join(' '));
    if (cur) {
      para.push(`지금 지나는 10년 대운은 ${cur.ko}(${cur.ganzhi}), ‘${cur.group}’ 흐름이에요. 이 시기에는 ${GC[cur.group][cat].s}`);
      const i = dw.list.indexOf(cur), prev = dw.list[i - 1], next = dw.list[i + 1];
      const flow = [];
      if (prev) flow.push(`바로 앞선 ${prev.startAge}~${prev.endAge}세는 ‘${prev.group}’ 흐름이었어요. ${GC[prev.group][cat].s}`);
      if (next) flow.push(`${next.startAge}~${next.endAge}세에는 ‘${next.group}’ 흐름으로 바뀌어서 ${GC[next.group][cat].s}`);
      if (flow.length) para.push(flow.join(' '));
    } else para.push('성별을 선택하면 지금 지나는 10년 대운과 함께 더 입체적으로 풀이해 드려요.');
    if (cat === 'wealth') para.push(`내 사주에서 가장 적은 기운은 ‘${EL[weak].ko}’이에요. 그 기운의 색이나 활동을 생활에 조금씩 더해 보세요. ${WEALTH_DISCLAIMER}`);
    if (cat === 'cond') para.push(COND_DISCLAIMER);
    return { key: cat, label, paragraphs: para, tips: TIPS[cat].mid.slice(), strong: strong.map((a) => a.sys), total: aff.length };
  });
  return { top, second, fields, daewoon: dw, current: cur, affinity: aff };
}
