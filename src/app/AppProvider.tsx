import type { ReactNode } from 'react';
import { TDSMobileProvider } from '@toss/tds-mobile';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';

/** 토스 앱(샌드박스 포함) 안: 앱인토스 전용 Provider(브랜드 색은 설정 파일 값을 사용). 일반 브라우저: 개발용 기본 Provider. */
export function AppProvider({ hosted, children }: { hosted: boolean; children: ReactNode }) {
  if (hosted) return <TDSMobileAITProvider>{children}</TDSMobileAITProvider>;
  return <TDSMobileProvider userAgent={{ fontA11y: undefined, fontScale: undefined, isAndroid: false, isIOS: false }}>{children}</TDSMobileProvider>;
}
