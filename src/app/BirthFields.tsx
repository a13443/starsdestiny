import { Seg } from './Seg';
import { EMPTY_FORM, REGIONS, daysIn, placeNames, type BirthForm } from './domain';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const CY = new Date().getFullYear();

/** 생년월일·성별(·시간·출생지) 입력. 내 정보와 상대 정보 입력이 같이 써요. */
export function BirthFields({ value, onChange, advanced = false, who = '' }: { value: BirthForm; onChange: (patch: Partial<BirthForm>) => void; advanced?: boolean; who?: string }) {
  const v = { ...EMPTY_FORM, ...value };
  const maxD = daysIn(v.y, v.m, v.cal);
  const num = (s: string) => (s === '' ? '' : Number(s));
  const gv = v.gender ?? 'N';
  return (
    <div className="fields">
      <Seg value={v.cal} onChange={(x) => onChange({ cal: x as 'solar' | 'lunar', leap: false, d: v.d && Number(v.d) > daysIn(v.y, v.m, x as 'solar' | 'lunar') ? '' : v.d })} items={[{ value: 'solar', label: '양력' }, { value: 'lunar', label: '음력' }]} />
      <div className="row">
        <select aria-label={`${who}태어난 해`} value={v.y} onChange={(e) => onChange({ y: num(e.target.value) })}><option value="">연</option>{range(1900, CY).reverse().map((y) => <option key={y} value={y}>{y}년</option>)}</select>
        <select aria-label={`${who}태어난 달`} value={v.m} onChange={(e) => onChange({ m: num(e.target.value) })}><option value="">월</option>{range(1, 12).map((m) => <option key={m} value={m}>{m}월</option>)}</select>
        <select aria-label={`${who}태어난 날`} value={v.d} onChange={(e) => onChange({ d: num(e.target.value) })}><option value="">일</option>{range(1, maxD).map((d) => <option key={d} value={d}>{d}일</option>)}</select>
      </div>
      {v.cal === 'lunar' && <label className="chk"><input type="checkbox" checked={!!v.leap} onChange={(e) => onChange({ leap: e.target.checked })} /> 윤달에 태어났어요</label>}
      <p className="hint">성별 <span>(구성기학·대운 계산에 써요)</span></p>
      <Seg value={gv} onChange={(x) => onChange({ gender: x === 'N' ? null : (x as 'M' | 'F') })} items={[{ value: 'M', label: '남' }, { value: 'F', label: '여' }, { value: 'N', label: '선택 안 함' }]} />
      {advanced && (
        <details className="how" open={v.hh !== '' || !!v.region}>
          <summary>정확도 올리기 — 시간과 출생지</summary>
          <p className="hint">태어난 시간</p>
          <div className="row">
            <select aria-label="태어난 시" value={v.hh ?? ''} onChange={(e) => onChange({ hh: num(e.target.value), mm: e.target.value === '' ? '' : v.mm })}><option value="">모름</option>{range(0, 23).map((h) => <option key={h} value={h}>{h}시</option>)}</select>
            <select aria-label="태어난 분" value={v.mm ?? ''} disabled={v.hh === '' || v.hh === undefined} onChange={(e) => onChange({ mm: num(e.target.value) })}><option value="">분</option>{range(0, 59).map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>)}</select>
          </div>
          <p className="hint">태어난 곳</p>
          <div className="row">
            <select aria-label="시·도" value={v.region ?? ''} onChange={(e) => onChange({ region: e.target.value, city: '' })}><option value="">선택 안 함</option>{REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            <select aria-label="시·군·구" value={v.city ?? ''} disabled={!v.region} onChange={(e) => onChange({ city: e.target.value })}><option value="">시·군·구</option>{(v.region ? placeNames(v.region) : []).map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <p className="hint">시간과 출생지를 모두 넣으면 사주 시주와 베딕 점성술이 열려요. 행정구역은 2018년 기준이에요.</p>
        </details>
      )}
    </div>
  );
}
