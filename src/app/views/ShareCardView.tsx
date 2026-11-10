import { Border } from '@toss/tds-mobile';
import { APP_TITLE } from '../brand';
import { viewOf, votesOf, type Profile } from '../domain';
import { Disclaimer } from '../ui';
import { EL_KO, Ring, headline } from './Home';

/** 공유 카드(화면용). SDK로 이미지 파일을 보낼 수 없어서, 카드는 화면에서 보여 주고 캡처해서 공유하도록 안내해요. 생년월일·시간·출생지·성별은 카드에 넣지 않아요. */
export function ShareCardView({ profile }: { profile: Profile }) {
  const P = viewOf(profile), V = votesOf(profile);
  const valText: Record<string, string> = { '사주 일간': `${P.saju.dayMaster.ko}${P.saju.dayMaster.hanja}`, '서양 별자리': P.west.name, 띠: `${P.animal.name}띠`, 구성기학: P.nine?.name ?? '', '베딕 달': P.vedic?.moon.name ?? '' };
  return (
    <section>
      <h1 className="h1">공유 카드</h1>
      <p className="note">이미지 파일은 토스 공유 기능으로 보낼 수 없어서, 아래 카드를 화면 캡처로 저장해 공유해 주세요. 카드에는 생년월일·시간·출생지·성별이 들어 있지 않아요.</p>
      <Border variant="height16" />
      <article className="shareCard" aria-label="공유 카드">
        <p className="scBrand">{APP_TITLE}</p>
        <Ring tally={V.tally} total={V.total} />
        <h2 className="scHead">{headline(V)}</h2>
        <ul className="scRows">
          {V.list.map((x) => <li key={x.sys}><span className="dot" style={{ background: `var(--${x.el})` }} /><span className="k">{x.sys}</span><b>{valText[x.sys]}</b><em>{EL_KO[x.el]}</em></li>)}
        </ul>
        <p className="scFoot">재미로 보는 운세 · 기운은 이 앱의 해석 규칙이에요</p>
      </article>
      <Disclaimer />
    </section>
  );
}
