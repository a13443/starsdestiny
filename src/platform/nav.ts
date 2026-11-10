import type { Sdk } from './sdk';

/** 시스템 뒤로가기를 구독해요. 첫 화면에서는 구독하지 않아야 기본 동작(미니앱 종료)이 유지돼요. */
export function onBack(sdk: Pick<Sdk, 'graniteEvent'> | null, handler: () => void): () => void {
  if (!sdk) return () => {};
  try { return sdk.graniteEvent.addEventListener('backEvent', { onEvent: handler }); } catch { return () => {}; }
}
