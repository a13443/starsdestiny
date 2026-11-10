/** 콘솔 QR 테스트 전용 광고 이벤트 진단 줄. 실제 서비스 주소에서는 App이 이 컴포넌트를 그리지 않아요. */
export function AdDebug({ id, lines }: { id: string; lines: string[] }) {
  return (
    <aside className="adDebug" aria-label="광고 이벤트 진단(QR 테스트 전용)">
      <p><b>광고 진단(QR 테스트 전용)</b></p>
      <p className="adDebugId">광고 그룹 {id}</p>
      <ol className="adDebugList">{lines.length ? lines.map((l, i) => <li key={i}>{l}</li>) : <li>아직 광고 이벤트가 없어요. 광고 보고 열기를 눌러 보세요.</li>}</ol>
    </aside>
  );
}
