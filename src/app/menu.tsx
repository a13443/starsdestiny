import { Badge, ListRow } from '@toss/tds-mobile';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './visual';

/** 메뉴 카드 오른쪽 알약. none은 알약 없이 화살표만 보여요. */
export type MenuStatus = 'locked' | 'open' | 'free' | 'busy' | 'none';
export const STATUS_LABEL = { locked: '광고 보고 열기', open: '열림', free: '무료', busy: '준비 중' } as const;
const COLOR = { locked: 'yellow', open: 'green', free: 'elephant', busy: 'blue' } as const;

/**
 * 메뉴 한 칸(카드). 스크린 리더가 읽는 이름은 `제목 · 상태`예요(`name`을 주면 제목 대신 써요).
 * 설명은 aria-describedby로 이어 두어요. 키보드(Enter·Space)는 TDS ListRow가 클릭으로 바꿔 주므로 따로 처리하지 않아요(중복하면 한 번 눌러도 두 번 실행돼요). 준비 중(busy)에는 눌러도 반응하지 않아요(광고를 두 번 띄우지 않기 위해서예요).
 */
export type Tint = 'gold' | 'blue' | 'indigo' | 'green' | 'coral' | 'teal' | 'slate' | 'violet';
/** 메뉴별 아이콘과 색(장식). 색은 밝은 배경+진한 아이콘 조합이라 대비를 contrast.test가 검사해요. */
export const MENU_VIS: Record<string, { icon: IconName; tint: Tint }> = {
  today: { icon: 'sun', tint: 'gold' }, newyear: { icon: 'calendar', tint: 'blue' }, destiny: { icon: 'compass', tint: 'indigo' }, taekil: { icon: 'check', tint: 'green' },
  match: { icon: 'heart', tint: 'coral' }, diary: { icon: 'pencil', tint: 'teal' }, share: { icon: 'share', tint: 'slate' }, card: { icon: 'card', tint: 'violet' }, edit: { icon: 'sliders', tint: 'slate' },
};

export function MenuCard({ title, name, desc, status, busyLabel, vis, note, onClick }: {
  title: string; name?: string; desc: string; status: MenuStatus; busyLabel?: string; vis?: { icon: IconName; tint: Tint }; note?: string; onClick: () => void;
}) {
  const descId = useId();
  const base = name ?? title;
  const pill = status === 'busy' ? (busyLabel ?? STATUS_LABEL.busy) : status === 'none' ? '' : STATUS_LABEL[status];
  const label = pill ? `${base} · ${pill}` : base;
  const press = () => { if (status !== 'busy') onClick(); };
  return (
    <li className="menuCard">
      <ListRow
        as="div" border="none" verticalPadding="large" horizontalPadding="small" withTouchEffect
        arrowType={status === 'none' ? 'right' : undefined}
        left={vis ? <span className={`menuIcon tint-${vis.tint}`}><Icon name={vis.icon} /></span> : undefined}
        role="button" tabIndex={0} aria-label={label} aria-describedby={descId} aria-disabled={status === 'busy'}
        onClick={press}
        contents={<><ListRow.Texts type="2RowTypeA" top={title} bottom={desc} bottomProps={{ typography: 't7', color: 'var(--adaptiveGrey600)', fontWeight: 'regular' }} /><span id={descId} className="srOnly">{desc}</span></>}
        right={pill ? <span className={`pill pill-${status}`}><Badge size="small" variant="weak" color={COLOR[status as keyof typeof COLOR]}>{pill}</Badge></span> : undefined}
      />
      {note && <p className="menuNote" role="status">{note}</p>}
    </li>
  );
}

export function MenuList({ label, children }: { label: string; children: ReactNode }) {
  return <ul className="menuList" aria-label={label}>{children}</ul>;
}
