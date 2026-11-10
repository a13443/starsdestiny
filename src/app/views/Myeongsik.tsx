import type { ReactNode } from 'react';
import { myeongsikOf, type Profile } from '../domain';
import type { MyeongsikCol } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

/** 명식표(만세력): 십성 · 천간/지지 · 지장간 · 12운성(일간 기준·동주) · 공망 · 절입 */
export function Myeongsik({ profile }: { profile: Profile }) {
  const M = myeongsikOf(profile);
  const row = (label: ReactNode, cell: (c: MyeongsikCol) => ReactNode) => (
    <tr><th scope="row">{label}</th>{M.cols.map((c) => c.empty ? <td key={c.key} className="mt-empty">—</td> : <td key={c.key}>{cell(c)}</td>)}</tr>
  );
  return (
    <div>
      <table className="mt" aria-label="명식표">
        <thead><tr><th scope="col" />{M.cols.map((c) => <th key={c.key} scope="col" className={c.key === 'day' ? 'me' : undefined}>{c.label}{c.gm && <><br /><span className="gm">공망</span></>}</th>)}</tr></thead>
        <tbody>
          {row(<>십성<br /><small>천간</small></>, (c) => c.gan!.tg)}
          {row('천간', (c) => <><span className="hj" style={{ color: `var(--${c.gan!.el})` }}>{c.gan!.hanja}</span><br /><small>{c.gan!.ko}</small></>)}
          {row('지지', (c) => <><span className="hj" style={{ color: `var(--${c.zhi!.el})` }}>{c.zhi!.hanja}</span><br /><small>{c.zhi!.ko}</small></>)}
          {row(<>십성<br /><small>지지(본기)</small></>, (c) => c.zhi!.tg)}
          {row('지장간', (c) => <>{c.jijanggan!.map((x, i) => <span key={i} className="hj sm" style={{ color: `var(--${x.el})` }}>{x.hanja}</span>)}<br /><small>{c.jijanggan!.map((x) => x.ko).join('')}</small></>)}
          {row(<>12운성<br /><small>일간 기준</small></>, (c) => c.unseong)}
          {row(<>12운성<br /><small>동주</small></>, (c) => c.unseongSame)}
        </tbody>
      </table>
      <p className="sm">
        일간 {M.dayMaster.ko}({M.dayMaster.hanja}) 기준이에요. 공망은 일주 기준 {M.gongmang.map((g) => `${g.hanja}(${g.ko})`).join('·')}이고{' '}
        {M.gongmangWhere.length ? `${M.gongmangWhere.join('·')}에 해당해요.` : '원국에는 해당이 없어요.'}
        {M.jeolib && ` 월주는 ${M.jeolib.name}(${M.jeolib.m}/${M.jeolib.d} ${pad(M.jeolib.h)}:${pad(M.jeolib.mi)}, 한국 시각) 절입 이후 기준이에요.`}
        {' '}12운성(동주)은 각 천간이 자기 기둥의 지지에서 갖는 단계예요. 지장간 표와 12운성은 일반적으로 쓰는 방식이고 학파별 차이가 있어요.
        {M.cols.some((c) => c.empty) && ' 시간을 입력하면 시주 칸이 채워져요.'}
      </p>
    </div>
  );
}
