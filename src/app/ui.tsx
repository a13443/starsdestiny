import { Border } from '@toss/tds-mobile';
import type { ReactNode } from 'react';
import { stars } from './domain';
import type { El, Vote } from './types';

export const ALL_SYS = ['사주', '서양', '띠', '수비학', '베딕', '구성기학'] as const;
export const SYS_KO: Record<string, string> = { 사주: '사주', 서양: '서양 별자리', 띠: '띠', 수비학: '수비학', 베딕: '베딕', 구성기학: '구성기학' };

export function Stars({ n }: { n: number }) { return <span className="stars" role="img" aria-label={`5점 만점에 ${n}점`}>{stars(n)}</span>; }

export function VoteChips({ votes }: { votes: Vote[] }) {
  const by = new Map(votes.map((v) => [v.sys, v]));
  return (
    <div className="vchips" role="list" aria-label="체계별 투표">
      {ALL_SYS.map((s) => {
        const v = by.get(s);
        if (!v) return <span key={s} className="vc lock" role="listitem">{SYS_KO[s]} 잠김</span>;
        const hasPos = (v.items ?? []).some((x) => x.v > 0), hasNeg = (v.items ?? []).some((x) => x.v < 0);
        const mixed = v.v === 0 && hasPos && hasNeg;
        const cls = v.v > 0 ? 'pos' : v.v < 0 ? 'neg' : mixed ? 'mix' : 'zero';
        const sym = v.v > 0 ? '＋' : v.v < 0 ? '－' : mixed ? '±' : '·';
        const lab = v.v > 0 ? '좋은 방향' : v.v < 0 ? '조심 신호' : mixed ? '좋은 신호와 조심 신호가 엇갈려 상쇄' : '중립';
        return <span key={s} className={`vc ${cls}${s === '사주' ? ' core' : ''}`} role="listitem" aria-label={`${SYS_KO[s]}${s === '사주' ? '(중심 체계)' : ''} ${lab}`}>{SYS_KO[s]} {sym}</span>;
      })}
    </div>
  );
}

export function AffChips({ strong, affinity }: { strong: string[]; affinity: { sys: string }[] }) {
  return (
    <div className="vchips" role="list" aria-label="체계별 강점">
      {ALL_SYS.map((s) => {
        if (!affinity.some((a) => a.sys === s)) return <span key={s} className="vc lock" role="listitem">{SYS_KO[s]} 잠김</span>;
        const on = strong.includes(s);
        return <span key={s} className={`vc ${on ? 'pos' : 'zero'}`} role="listitem" aria-label={`${SYS_KO[s]} ${on ? '강점' : '해당 없음'}`}>{SYS_KO[s]} {on ? '＋' : '·'}</span>;
      })}
    </div>
  );
}

export function Reasons({ items }: { items: { v: number; text: string; sys?: string }[] }) {
  if (!items.length) return null;
  return (
    <ul className="why">
      {items.map((r, i) => (
        <li key={i} className={r.v > 0 ? 'pos' : 'neg'}>
          <b aria-hidden="true">{r.v > 0 ? '＋' : '－'}</b>
          <span><span className="sr">{r.v > 0 ? '좋은 신호: ' : '조심 신호: '}</span>{r.sys && <em className="sy">{SYS_KO[r.sys] ?? r.sys} </em>}{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** 생성형 AI 고지·표시: 공식 정책상 결과물이 AI로 만든 것이면 라벨로 즉시 인식할 수 있어야 해요. */
export function AiRow() {
  return <p className="airow"><span className="aibadge">AI 작성 문구 포함</span><span>풀이 문구는 AI의 도움을 받아 작성한 문장을 규칙에 따라 조합해 보여드려요. 실시간으로 AI가 새로 만드는 결과는 아니에요.</span></p>;
}
export function HowNote({ kind }: { kind: 'reading' | 'destiny' }) {
  const t = kind === 'destiny'
    ? '분야별 풀이는 사주의 십성을 중심으로 쓰고, 나머지 체계가 같은 분야를 강점으로 가리키는지를 칩으로 겹쳐 보여줘요. 테두리 칩이 중심 체계인 사주예요.'
    : '풀이는 사주를 중심으로 해요(2표, 테두리 칩). 서양 별자리·띠·수비학은 보조 체계로 1표씩 겹쳐서 별점을 한 단계 안에서 조정하고 해설에 근거를 더해요. 사주가 별다른 신호를 내지 않을 때는 보조 체계의 표가 방향을 정해요.';
  return <details className="how"><summary>이 풀이는 이렇게 만들어요</summary><p>{t} 시간·출생지를 넣으면 베딕, 성별을 선택하면 구성기학이 보조 체계로 더해져요. 모든 규칙은 이 앱의 해석이고, 재미로 보는 콘텐츠예요.</p></details>;
}
export const Disclaimer = () => <p className="note">재미로 보는 콘텐츠예요. 의료·법률·투자 같은 중요한 판단의 근거로 쓰지 마세요. 풀이 규칙은 학파마다 달라서 이 앱의 해석 방식이 정답은 아니에요.</p>;
export function Section({ title, children }: { title: string; children: ReactNode }) { return <><Border variant="height16" /><h2 className="h2">{title}</h2>{children}</>; }

export const Chip = ({ el, label }: { el: El; label: string }) => <span className="chip" style={{ ['--c' as string]: `var(--${el})` }}>{label}</span>;
export const LockedCard = ({ title, why }: { title: string; why: string }) => <section className="sys locked"><div className="row2"><h3>{title}</h3><span className="badge">잠김</span></div><p className="main">아직 닫혀 있어요</p><p className="sm">{why}</p></section>;
