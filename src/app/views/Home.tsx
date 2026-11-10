import { Button } from '@toss/tds-mobile';
import type { ReactNode } from 'react';
import { viewOf, votesOf, type Profile } from '../domain';
import type { El, Votes } from '../types';
import { AiRow, Chip as BaseChip, LockedCard as Locked } from '../ui';
import { Myeongsik } from './Myeongsik';
import { TodayHero } from '../visual';

export const EL_KO: Record<El, string> = { fire: '불꽃', water: '물결', wood: '성장', metal: '결단', earth: '안정' };
export const EL_DESC: Record<El, string> = { fire: '열정과 표현', water: '직관과 유연함', wood: '성장과 소통', metal: '원칙과 결단', earth: '안정과 포용' };
export const ORDER: El[] = ['wood', 'fire', 'earth', 'metal', 'water'];
const W_EL_KO: Record<string, string> = { fire: '불', earth: '흙', air: '공기', water: '물' };

export function headline(v: Votes): string {
  const n = v.top[1], ties = ORDER.filter((k) => v.tally[k] === n);
  const names = ties.map((k) => `‘${EL_KO[k]}’`).join(', ');
  if (n >= 3) return `${v.total}개 체계 중 ${n}개가 ${names} 기운을 가리켜요`;
  if (n === 2) return ties.length > 1 ? `${names} 기운이 두 곳씩 나란히 겹쳐요` : `두 체계가 ${names} 기운에서 겹쳐요`;
  return '체계마다 서로 다른 면을 비춰요';
}

export function Ring({ tally, total }: { tally: Record<El, number>; total: number }) {
  const R = 54, C = 2 * Math.PI * R, gap = total > 1 ? 3 : 0;
  const top = [...ORDER].sort((a, b) => tally[b] - tally[a])[0];
  let off = 0;
  return (
    <svg className="ring" viewBox="0 0 140 140" role="img" aria-label="체계별 기운 분포">
      <circle cx="70" cy="70" r={R} fill="none" stroke="#e5e8eb" strokeWidth="14" />
      {ORDER.filter((k) => tally[k]).map((k) => {
        const len = (tally[k] / total) * C, node = <circle key={k} cx="70" cy="70" r={R} fill="none" stroke={`var(--${k})`} strokeWidth="14" strokeDasharray={`${Math.max(len - gap, 1)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />;
        off += len; return node;
      })}
      <text x="70" y="72" textAnchor="middle" fontSize="30" fontWeight="700" fill="#191f28">{tally[top]}<tspan fontSize="16" fill="#6b7684">/{total}</tspan></text>
      <text x="70" y="94" textAnchor="middle" fontSize="12.5" fill="#6b7684">{EL_KO[top]}</text>
    </svg>
  );
}
const Chip = ({ el, label }: { el: El; label?: string }) => <BaseChip el={el} label={label ?? EL_KO[el]} />;
const Card = ({ el, children }: { el: El | null; children: ReactNode }) => <section className="sys" style={{ ['--c' as string]: el ? `var(--${el})` : '#e5e8eb' }}>{children}</section>;

export function HomeView({ profile, onImprove, children }: { profile: Profile; onImprove: () => void; children?: ReactNode }) {
  const P = viewOf(profile), V = votesOf(profile), s = P.saju, w = P.west, Vd = P.vedic;
  const open = 4 + (P.nine ? 1 : 0) + (Vd ? 1 : 0);
  const names: [string, boolean][] = [['사주', true], ['별자리', true], ['수비학', true], ['띠', true], ['구성기학', !!P.nine], ['베딕', !!Vd]];
  const valText: Record<string, string> = { '사주 일간': `${s.dayMaster.ko}(${s.dayMaster.hanja})`, '서양 별자리': w.name, 띠: `${P.animal.name}띠`, 구성기학: P.nine?.name ?? '', '베딕 달': Vd?.moon.name ?? '' };
  const sub = V.top[1] >= 2 ? `‘${EL_KO[V.top[0]]}’은 ${EL_DESC[V.top[0]]}의 기운이에요.` : '서로 다른 면이 한 사람 안에 함께 있다는 뜻이에요.';
  const pil: ['time' | 'day' | 'month' | 'year', string][] = [['time', '시주'], ['day', '일주'], ['month', '월주'], ['year', '연주']];
  return (
    <section>
      <AiRow />
      <TodayHero profile={profile} />
      <div className="hero">
        <Ring tally={V.tally} total={V.total} />
        <div>
          <h1 className="headline">{headline(V)}</h1>
          <p className="headsub">{sub}</p>
          <p className="headsub">{V.total}개 체계를 동등하게(1표씩) 비교한 결과예요. 아래 풀이의 별점과는 계산 방식이 달라요.</p>
        </div>
      </div>
      <ul className="votes">{V.list.map((x) => <li key={x.sys}><span className="k">{x.sys}</span><span className="v">{valText[x.sys]}</span><Chip el={x.el} /></li>)}</ul>
      <p className="note">‘기운’은 이 앱이 오행과 서양 4원소를 맞춰 본 방식이에요. 고전에 정해진 대응표는 아니에요.</p>
      <div className="unlock" aria-label="열린 체계">{names.map(([n, on]) => <span key={n} className={on ? 'on' : ''}>{n}{on ? '' : ' 잠김'}</span>)}</div>
      {open < 6 && <div className="improve"><Button display="block" size="large" variant="weak" onClick={onImprove}>정확도 올리기 · {open}/6개 열림</Button></div>}

      <Card el={s.element}>
        <div className="row2"><h3>사주</h3><Chip el={s.element} label={`${EL_KO[s.element]} · 일간`} /></div>
        <p className="main">{s.dayMaster.ko}{s.dayMaster.hanja} 일간</p><p>{s.dayMaster.line}</p>
        <div className="pillars">{pil.map(([k, label]) => { const p = s.pillars[k]; return p
          ? <div key={k} className={`pil${k === 'day' ? ' me' : ''}`}><span className="pl">{label}</span><div className="pcell" style={{ ['--c' as string]: `var(--${p.ganEl})` }}>{p.hanja[0]}</div><div className="pcell" style={{ ['--c' as string]: `var(--${p.zhiEl})` }}>{p.hanja[1]}</div><span className="pk">{p.ko}</span></div>
          : <div key={k} className="pil empty"><span className="pl">{label}</span><div className="pcell">?</div><span className="pk">시간 입력 시</span></div>; })}</div>
        <div className="bar" aria-hidden="true">{ORDER.filter((k) => s.count[k]).map((k) => <i key={k} title={`${EL_KO[k]} ${s.count[k]}`} style={{ background: `var(--${k})`, flex: s.count[k] }} />)}</div>
        <div className="legend">{ORDER.map((k) => <span key={k}><b>{EL_KO[k]}</b> {s.count[k]}</span>)}</div>
        {!s.hasTime && <p className="sm">태어난 시간을 넣으면 시주가 채워져요.</p>}
        {s.uncertain && <p className="sm">절기가 바뀌는 날에 태어나셨어요. 시간을 넣으면 연주·월주가 더 정확해져요.</p>}
        <p className="sm">출생 시각은 표준시 그대로 계산해요. 23시대 출생은 학파에 따라 일주가 달라질 수 있어요.</p>
        <details className="how"><summary>명식표 보기 · 십성 · 지장간 · 12운성 · 공망</summary><Myeongsik profile={profile} /></details>
      </Card>
      <Card el={w.element}>
        <div className="row2"><h3>서양 별자리</h3><Chip el={w.element} label={`${EL_KO[w.element]} · ${W_EL_KO[w.wEl] ?? w.wEl} 원소`} /></div>
        <p className="main">{w.name}</p><p>{w.line}</p>
        {w.cusp && <p className="sm">별자리가 바뀌는 경계 무렵이에요. 태어난 시간을 넣으면 정확히 가려져요.</p>}
      </Card>
      <Card el={null}><div className="row2"><h3>수비학 · 생명수</h3><span className="badge">기운 매핑 없음</span></div><p className="main">{P.num.n}</p><p>{P.num.line}</p></Card>
      <Card el={P.animal.element}>
        <div className="row2"><h3>띠</h3><Chip el={P.animal.element} /></div>
        <p className="main">{P.animal.name}띠 <span className="hj-sub">({P.animal.hanja})</span></p><p>{P.animal.line}</p>
        <p className="sm">입춘을 새해로 보는 기준이에요. 1~2월 초에 태어났다면 달력상 해와 띠가 다를 수 있어요.</p>
      </Card>
      {P.nine
        ? <Card el={P.nine.element}><div className="row2"><h3>구성기학</h3><Chip el={P.nine.element} /></div><p className="main">{P.nine.name}</p><p>{P.nine.line}</p></Card>
        : <Locked title="구성기학" why="성별을 선택하면 열려요. 본명성을 구하는 공식이 남녀에 따라 달라서 필요해요." />}
      {Vd
        ? <Card el={Vd.element}>
            <div className="row2"><h3>베딕 점성술 <span className="beta">β</span></h3><Chip el={Vd.element} label={`${EL_KO[Vd.element]} · 달`} /></div>
            <p className="main">달 {Vd.moon.name}</p><p>{Vd.moon.line}</p>
            <dl><dt>낙샤트라</dt><dd>{Vd.nakshatra.name} · {Vd.nakshatra.pada}파다</dd><dt>태양 라시</dt><dd>{Vd.sun.name}</dd><dt>상승궁(라그나)</dt><dd>{Vd.lagna.name}</dd></dl>
            <p className="sm">{Vd.sun.idx !== w.idx ? `서양에서는 태양이 ‘${w.name}’, 베딕에서는 ‘${Vd.sun.name}’로 나와요. 서양은 계절(춘분)을, 베딕은 고정된 별자리를 기준으로 삼아서 생기는 차이예요.` : '이번엔 서양 태양궁과 베딕 태양 라시가 같은 별자리예요.'}</p>
          </Card>
        : <Locked title="베딕 점성술" why={!P.tier.time ? '태어난 시간과 출생지를 입력하면 열려요.' : '태어난 곳을 고르면 열려요.'} />}
      {children}
    </section>
  );
}
