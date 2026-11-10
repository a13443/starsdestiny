import { SegmentedControl } from '@toss/tds-mobile';

/** TDS SegmentedControl은 좌우 24px 여백을 내장해서, 페이지 여백(20px 안쪽)에서는 칸이 좁아져 글자가 꺾여요. 여백을 상쇄해 전체 폭을 써요. */
export function Seg({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: { value: string; label: string }[] }) {
  return (
    <div className={`segwrap${items.length > 3 ? ' dense' : ''}`}>
      <SegmentedControl value={value} onChange={onChange}>
        {items.map((i) => <SegmentedControl.Item key={i.value} value={i.value}>{i.label}</SegmentedControl.Item>)}
      </SegmentedControl>
    </div>
  );
}
