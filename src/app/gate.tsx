import { MENU_VIS, MenuCard, MenuList } from './menu';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdGate, KV, Tracker } from '../platform';
import { kstToday, kstYear } from './domain';

export type GateKey = 'today' | 'newyear' | 'destiny' | 'taekil';
export const GATES: { key: GateKey; title: string; desc: string }[] = [
  { key: 'today', title: '오늘의 운세풀이', desc: '오늘의 5가지 운 · 시간대 흐름 · 오행 포인트' },
  { key: 'newyear', title: '신년운', desc: '올해와 내년의 시기별 흐름 · 월별 · 삼재' },
  { key: 'destiny', title: '나의 총운 · 운명풀이', desc: '타고난 구조 · 10년 대운 · 분야별 풀이' },
  { key: 'taekil', title: '택일', desc: '이사 · 결혼 · 개업 · 계약 · 여행 좋은 날' },
];
/** 화면에 보이는 설명. 신년운은 올해와 내년을 앞에 붙여 보여줘요(제목은 한 줄로 두려고 연도를 설명으로 옮겼어요). */
export const gateDesc = (k: GateKey): string => (k === 'newyear' ? `${kstYear()}년과 ${kstYear() + 1}년 · ${GATES.find((g) => g.key === k)!.desc}` : GATES.find((g) => g.key === k)!.desc);
const unlockKey = (k: GateKey) => `unlock:${kstToday()}:${k}`;
const NONE: Record<GateKey, boolean> = { today: false, newyear: false, destiny: false, taekil: false };

/** 광고 게이트: 보상형 광고를 끝까지 보면 그 항목이 오늘 하루 열려요. 한 번 연 항목은 광고 없이 다시 열려요. */
export function useGates(kv: KV, gate: AdGate, tracker: Tracker) {
  const [unlocked, setUnlocked] = useState<Record<GateKey, boolean>>(NONE);
  const [busy, setBusy] = useState<GateKey | null>(null);
  const [message, setMessage] = useState('');
  const [messageKey, setMessageKey] = useState<GateKey | null>(null);
  const unlockedRef = useRef(unlocked); unlockedRef.current = unlocked;

  useEffect(() => {
    let alive = true;
    (async () => {
      const next = { ...NONE };
      for (const g of GATES) next[g.key] = (await kv.get(unlockKey(g.key))) === '1';
      if (alive) setUnlocked(next);
    })();
    return () => { alive = false; };
  }, [kv]);

  const open = useCallback(async (key: GateKey): Promise<boolean> => {
    if (unlockedRef.current[key]) return true;
    setBusy(key); setMessage(''); setMessageKey(null); tracker.track('gate_open', { item: key });
    const r = await gate.show();
    tracker.track(r === 'rewarded' ? 'ad_rewarded' : 'ad_failed', { item: key, result: r });
    // 광고를 못 보여준 경우(로드 실패·미지원)에는 앱이 막히지 않게 열어줘요. 보상 없이 닫은 경우(dismissed)만 열지 않아요.
    if (r === 'dismissed') { setMessage('광고를 끝까지 보지 않아 열지 못했어요. 다시 눌러 끝까지 봐 주세요.'); setMessageKey(key); setBusy(null); return false; }
    await kv.set(unlockKey(key), '1'); setUnlocked((u) => ({ ...u, [key]: true })); setBusy(null);
    return true;
  }, [gate, kv, tracker]);

  return { unlocked, busy, message, messageKey, open };
}

export function NextMenu({ current, unlocked, busy, message, messageKey, onGate, onMatch, onHome }: {
  current?: GateKey; unlocked: Record<GateKey, boolean>; busy: GateKey | null; message?: string; messageKey?: GateKey | null;
  onGate: (k: GateKey) => void; onMatch: () => void; onHome: () => void;
}) {
  return (
    <section aria-label="이어서 보기">
      <h2 className="h2">이어서 보기</h2>
      <p className="note">다 읽으셨다면 바로 이어서 볼 수 있어요. 광고를 한 번 보면 그 항목이 열리고, 열린 항목은 오늘 하루 유지돼요.</p>
      <MenuList label="이어서 볼 메뉴">
        {GATES.filter((g) => g.key !== current).map((g) => (
          <MenuCard key={g.key} title={g.title} desc={gateDesc(g.key)} vis={MENU_VIS[g.key]} note={messageKey === g.key ? message : undefined} status={busy === g.key ? 'busy' : unlocked[g.key] ? 'open' : 'locked'} onClick={() => onGate(g.key)} />
        ))}
        <MenuCard title="궁합 보기" vis={MENU_VIS.match} desc="두 사람의 사주·별자리·띠·구성기학·수비학" status="free" onClick={onMatch} />
        <MenuCard title="내 결과로 돌아가기" desc="처음 화면으로 돌아가요" status="none" onClick={onHome} />
      </MenuList>
    </section>
  );
}
