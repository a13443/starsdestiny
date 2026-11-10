import type { MatchDetailResult, ProfileView, Votes } from './types';
import { APP_TITLE } from './brand';
import { headline } from './views/Home';

/**
 * 공유 문구를 만들어요. 생년월일·시간·출생지·성별은 절대 넣지 않아요.
 * 궁합 공유에는 상대의 정보(별자리·띠·일간 등)를 넣지 않고, 두 사람의 집계만 담아요(상대 동의 없이 내보내지 않기 위해서예요).
 */
export function resultShareText(P: ProfileView, V: Votes, link: string | null): string {
  const lines = [
    `${APP_TITLE} 결과`,
    `${P.west.name} · ${P.animal.name}띠 · ${P.saju.dayMaster.ko}${P.saju.dayMaster.hanja} 일간 · 생명수 ${P.num.n}`,
    headline(V),
    '(재미로 보는 운세)',
  ];
  if (link) lines.push(link);
  return lines.join('\n');
}

export function matchShareText(R: Pick<MatchDetailResult, 'verdict'>, link: string | null): string {
  const t = R.verdict.tally;
  const lines = [`${APP_TITLE} 궁합`, R.verdict.headline, `${R.verdict.total}가지 기준 중 잘 맞음 ${t.good} · 무난 ${t.ok} · 긴장 ${t.tense}`, '(재미로 보는 운세)'];
  if (link) lines.push(link);
  return lines.join('\n');
}
