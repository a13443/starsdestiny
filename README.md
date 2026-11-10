# 별사주 — 앱인토스 미니앱 (v2: 카드 메뉴 + 시각 개선)

사주를 중심으로 풀이하고 서양 별자리·수비학·띠·구성기학·베딕 점성술을 보조 체계로 겹쳐 보는 미니앱이에요.
WebView 방식, SDK 3.x(`@apps-in-toss/web-framework`), TDS Mobile(`@toss/tds-mobile`, `@toss/tds-mobile-ait`) 기반이에요.

## 명령어
```
npm install          # React 18 고정(TDS Mobile 2.5.1이 React 16~18만 지원해요)
npm test             # vitest 218개: 플랫폼 13 · 도메인 규칙 5 · 앱 흐름/화면/홈/입력 · 입력 조합별 전 화면 크래시 검사 · 깨진 문장 검사 · 화면 코드 규칙(lint)
npm run dev          # vite --port 3000 (일반 브라우저에서는 광고·저장소·공유가 개발용 대체 동작을 해요)
npm run build        # tsc -b && vite build && ait build  →  starsdestiny.ait 생성
```

## 구조
- `src/engine/` 계산 엔진(사주·별자리·수비학·구성기학·베딕, 풀이 문구). 프로토타입에서 검증한 코드 그대로예요.
- `src/platform/` SDK 어댑터. 실제 SDK 타입과의 호환을 `tsc`가 검증해요(`sdk.ts`의 `_sdkCompat`).
  - `ads.ts` 광고 게이트: 사전 로딩, 준비 전엔 실시간 로딩 없이 실패 처리, 보상 판정, 재생 후 다시 로딩
  - `storage.ts` 토스 안=앱인토스 Storage, 일반 브라우저=localStorage, 실패 시 메모리
  - `share.ts` `intoss://` 딥링크 기반 공유 링크 / `analytics.ts` 이벤트 로그 / `nav.ts` 뒤로가기
- `src/app/` UI(TDS 컴포넌트). 입력(윤달·시간·출생지 포함) · 홈(기운 링·체계별 카드·명식표) · 오늘의 운세풀이 · 신년운 · 총운·운명풀이(10년 대운 상세 서술) · 택일 · 궁합(두 사람 데이터 비교 → 종합 → 생활 장면 → 항목별 상세)과 광고 게이트(`gate.tsx`), 이어서 보기가 구현돼 있어요.

## 출시 전 반드시 할 일 (TODO)
1. `apps-in-toss.config.ts`의 `appName`, `brand.primaryColor`를 콘솔 등록값과 맞추기
2. `src/app/App.tsx`의 `AD_GROUP_ID`를 콘솔에서 발급한 보상형 광고 그룹 ID로 교체
3. 이식 완료: 입력·홈·오늘·신년운·총운·택일·궁합·운세 일기·공유(텍스트 + 화면 카드). 남은 것은 실기기 테스트와 콘솔 값 교체
4. 이 폼은 프로토타입과 같은 규칙이에요(`domain.ts`의 `toProfile`): 윤달, 미래 날짜 거부, 성별·시간·출생지 선택 입력
5. 샌드박스 앱 → 토스 앱 QR 테스트(실기기). 번들 업로드 후 검수 요청
6. 분석 로그: 콘솔에서 핵심 지표(전환 지표) 설정. 이벤트 이름은 `src/platform/analytics.ts` 참고
7. 번들 최적화: 현재 JS 약 1.65MB(gzip 약 539KB). 엔진을 동적 import로 분리하면 첫 화면이 빨라져요
8. 공식 정책 재확인: 생성형 AI 고지 의무 해당 여부(채널톡 문의), 개인정보 처리방침, 사업자 등록(광고 정산)

## 이 프로젝트에서 확인된 것 / 확인 못 한 것
- 확인: 타입 검사(`tsc -b`) 통과, 테스트 218개 통과, 주요 테스트는 일부러 동작을 망가뜨려 실제로 실패하는지까지 확인, `ait build` 번들 생성, 390px 모바일 폭 실제 브라우저에서 입력·홈·오늘·신년운·총운·택일·궁합 화면 육안 확인(가로 넘침·콘솔 오류 없음)
- 확인 못 함: 토스 앱·샌드박스 안에서의 실제 동작, 실광고 노출, 공유 링크 생성, 검수 통과 여부

## 실제 화면에서 발견돼 규칙으로 막아 둔 것 (재발 방지)
- TDS `Button`의 `color="light"|"dark"`는 흰 페이지에서 글자가 안 보여요 → `lint.test.ts`가 금지. 보조 버튼은 `variant="weak"`(기본색), 본문 안 버튼은 `display="block"`
- TDS `SegmentedControl`은 좌우 24px 여백이 내장돼 있어요 → 공통 래퍼 `Seg.tsx` 사용(칸이 4개 이상이면 자동으로 촘촘하게)
- 성별을 고르지 않으면 대운이 `null`이에요 → 화면에서 잠금 카드로 처리, 모든 화면은 `ErrorBoundary`로 보호
- 엔진의 `consensus.text`는 완성된 문장이에요 → 뒤에 말을 덧붙이지 말 것(`test-utils.ts`의 `expectSane`이 깨진 문장을 검사)
- 택일의 `rx`(수성 역행)는 분야와 무관하게 참이에요 → 화면에는 `caution`(분야별 주의 문구)만 보여줄 것
- 시·도를 바꾸면 시·군·구 상태도 초기화할 것(화면 값만 비어 보이고 저장은 옛 값이 남을 수 있어요)
- 엔진은 같은 이름의 함수를 두 모듈에서 export하면 `index.mjs`에서 그 이름이 `undefined`가 돼요(예: `iga`). 테스트에서는 해당 모듈을 직접 import할 것
- 문장에 끼워 넣는 단어 뒤의 조사는 `fortune.mjs`의 `iga`로 고를 것(받침 유무). 행운 물건 문장은 1년치 전수 테스트가 지켜요
- 궁합·대운 상세 서술은 `src/engine/detail.mjs`(`matchDetail`, `daewoonDetail`)가 만들어요. 규칙 표(천간합·천간충·궁위·육합·삼합·충·형·자형·오행 상생상극)는 출처로 확인했고, 생활 장면 문구는 이 앱의 해석이에요
- 궁합 요약은 사주 근거 항목(일간·일지·월지·띠·오행 균형)과 앱이 단순화한 체계(서양·구성기학)의 무게를 구분해 써요. 단순화한 체계는 ‘참고로만’ 표기해요
- 접는 카드(details)에는 펼침 화살표를 둘 것(`lint2.test.ts`가 CSS를 검사해요)
- 문장 검사: 엔진은 무작위 400쌍·340건으로 금지어·빈 값·조사·중첩 괄호·문장 중복·끊긴 문장을 전수 확인해요
- 운세 일기: 하루 1건을 `diary:v1` 한 키에 JSON으로 저장(Storage 호출을 늘리지 않기 위해), 저장 60일·화면 14일, 날짜는 KST 기준이라 오늘 화면과 항상 같아요. 저장값이 깨져도 항목 단위로 걸러요
- 공유: `Share.createLink`(경로는 항상 `intoss://앱이름/`, 개인정보 없음) → `Share.sendMessage`(텍스트만). 이미지 파일은 SDK로 보낼 수 없어서 카드는 화면에서 보여 주고 캡처를 안내해요. 궁합 공유에는 상대의 정보를 넣지 않아요
- `APP_NAME`(App.tsx)은 `apps-in-toss.config.ts`의 appName과 같아야 공유 링크가 열려요(콘솔 등록값으로 교체)
- 앱 이름은 `src/app/brand.ts`의 `APP_TITLE`(별사주), 콘솔 고유 키는 `APP_NAME`(starsdestiny)에서만 정해요. 콘솔에서 `appName`이 달라지면 `brand.ts`와 `apps-in-toss.config.ts` 두 곳만 바꾸면 되고, `brand.test.ts`가 둘이 같은지 검사해요

## v2 변경: 홈과 '이어서 보기'를 카드 목록으로
- 홈 상단에 오늘 요약 카드(`TodayTeaser`: 일진·종합 운 별점·한 줄), 메뉴는 TDS `ListRow`+`Badge` 카드(`menu.tsx`)로 바꿨어요. 알약은 광고 보고 열기(베이지)·열림(초록)·무료(회색)
- 접근성 이름은 `제목 · 상태`로 유지(테스트는 `getByRole('button', { name })`), 설명은 `aria-describedby`로 연결해요
- **키보드(Enter·Space)는 TDS ListRow가 이미 클릭으로 바꿔 줘요.** `onKeyDown`을 또 달면 한 번 눌러도 두 번 실행돼 광고가 두 번 뜰 수 있어요(테스트가 막아 둬요)
- **알약 색은 `!important`로 지정**해요. TDS Badge가 색을 인라인 스타일(`var(--t…BadgeBackground)`)로 박아 두는데 그 변수가 없는 환경에서는 배경이 투명해져서 광고/무료 구분이 사라져요(`pill-css.test.ts`가 CSS 파일을 검사해요)
- 신년운의 올해·내년 연도는 제목이 아니라 설명 앞에 붙여 제목을 한 줄로 유지해요
- 확인하지 못한 것: 토스 앱 안에서 TDS가 배지 색 변수를 넣어 주는지, ListRow의 키보드 처리가 실제 WebView에서도 같은지(jsdom에서만 확인)

## v2 시각 개선(보는 맛)
- **오늘의 별 히어로**(`visual.tsx` TodayHero): 홈 맨 위와 오늘 풀이 상단. 쪽빛 그라데이션 + 금색 일진 한자·큰 별. 한자는 장식이라 `aria-hidden`
- **오늘의 5가지 운 막대**(TodayBars, 클래스 `fortuneBars`): 레벨 1~5를 막대 길이(×20%)로. 점수는 1~5 그대로 보여주고 100점으로 환산하지 않아요(없는 정밀도를 만들지 않으려고)
- **궁합**: 두 사람 일간 타일(오행 색) + 판정 막대(잘 맞음/무난/긴장). 집계는 막대 이름·범례·첫 문단이 서로 같아야 해요
- **메뉴·카테고리 아이콘**: 외부 파일 없이 인라인 SVG, 장식(aria-hidden)이라 접근성 이름은 그대로
- **가시성**: 색 쌍을 WCAG 대비로 검사해요(`contrast.test.ts`). 옛 별 색 `#d69a2d`는 흰 바탕 대비 2.46이라 `#a86400`(4.68)으로 바꿨어요
- **움직임**: 막대·히어로 등장만. `prefers-reduced-motion`이면 꺼요. 애니메이션은 transform·opacity만 써요
- **CSS 이름 충돌 주의**: 십성 분포의 `.bars`(height: 44px)를 새 막대가 재사용했다가 목록이 44px로 붕괴한 적이 있어요. 새 컴포넌트 클래스는 `css-collision.test.ts`가 지켜요
- **레이아웃은 jsdom으로 못 잡아요.** 배포 전에 빌드 후 `PLAYWRIGHT_PATH=… node scripts/layout-check.cjs`로 실제 브라우저에서 목록 높이·겹침·가로 넘침을 재요(390·320px)

## 광고 그룹 ID (v2)
- 실제 ID `ait.v2.live.2f3beacd63df4412`(콘솔 발급), 테스트 ID `ait-ad-test-rewarded-id`(공식 문서의 리워드 테스트 ID)가 `src/platform/adGroup.ts`에 있어요
- **공식 정책: 개발·테스트 단계에서 실제 ID로 테스트하면 정책 위반으로 불이익**이 있을 수 있어요. 그래서 **실제 서비스 주소에서만 실제 ID**를 쓰고, 그 외(콘솔 QR 테스트, 샌드박스, 로컬, 알 수 없는 주소)는 전부 테스트 ID를 써요. 번들 하나로 QR 테스트와 출시를 모두 처리해요
  - 실제 서비스 주소: `<appName>.web.tossmini.com`, 그리고 2026-08-25 이후 업로드한 SDK 3.x 번들은 `<appName>.apps.tossmini.com`(둘 다 처리)
  - 콘솔 QR 테스트: `<appName>.private-web.tossmini.com`, `<appName>.private-apps.tossmini.com`
- 판정이 틀리면 실제 서비스에서 테스트 광고만 나가(수익 0) 정책 위반은 피해요. 출시 후 `app_open` 이벤트의 `ad_mode`(live/test)와 콘솔 광고 지표로 확인해요
- 광고 흐름은 공식 권장대로 load → loaded → show → 다음 load, 보상은 `userEarnedReward`일 때만 지급(dismissed만으로는 안 열려요), 광고가 뜨지 못하면 사용자가 막히지 않게 열려요
- 지원 버전(공식 문서): 토스 앱 5.247.0 이상 = ver2(토스 애즈+AdMob), 5.227.0~5.247.0 미만 = AdMob 단독, 5.227.0 미만 = 광고 미지원(이때는 광고 없이 열려요)

## v2.1: 광고를 보고 닫아도 안 열리던 문제 (QR 테스트에서 발견)
- 원인(코드로 확인): 게이트가 `dismissed`(닫힘) 이벤트가 와야만 결과를 정했어요. 공식 FAQ에 **Android 토스 앱 5.255.0에서는 dismissed 이벤트가 발생하지 않는다**고 돼 있어서, 닫힘에만 의존하면 그 환경에서는 영원히 안 열리고 카드도 계속 `준비 중`에 잠겨요. 또 실패 안내가 메뉴 맨 아래(9개 카드 다음)에 나와서 화면 밖이었어요
- 공식 이벤트 순서(리워드): `show → impression → (시청 완료) → userEarnedReward → dismissed`
- 수정(`src/platform/ads.ts`): `userEarnedReward`가 오는 순간 바로 열어요(닫힘을 기다리지 않아요). dismissed만으로는 열지 않아요(공식). 닫힘이 보상보다 먼저 오는 경우를 대비해 1.5초 기다려요. 아무 이벤트도 안 오면 90초 뒤 포기해서 카드가 영원히 잠기지 않아요. 다음 광고는 닫힘이 오면 바로, 안 오면 4초 뒤에 불러와요
- 실패 안내는 **눌린 카드 안**에 붉은 줄로 나와요(홈과 `이어서 보기` 모두)
- **콘솔 QR 테스트 주소(`private-web`/`private-apps`)에서만** 광고 이벤트 진단 줄(`AdDebug`)이 보여요. 실제 서비스 주소·샌드박스·로컬에는 나오지 않아요(`ad-flow.test.tsx`가 확인해요)
