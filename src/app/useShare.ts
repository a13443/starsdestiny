import { useCallback, useState } from 'react';
import { createShareLink, shareMessage, type Sdk, type Tracker } from '../platform';

export type ShareState = { busy: boolean; notice: string };

/**
 * 공유 흐름: ① intoss:// 공유 링크 만들기 → ② 문구 만들기 → ③ 네이티브 공유 시트(Share.sendMessage).
 * 링크를 못 만들어도 문구는 공유하고, 공유 시트를 못 열면(일반 브라우저·오류) 이유를 안내해요.
 */
export function useShare(sdk: Pick<Sdk, 'Share'> | null, appName: string, tracker: Tracker) {
  const [state, setState] = useState<ShareState>({ busy: false, notice: '' });
  const run = useCallback(async (kind: 'result' | 'match', build: (link: string | null) => string) => {
    if (state.busy) return;
    setState({ busy: true, notice: '' }); tracker.track('share_click', { kind });
    const link = await createShareLink(sdk, appName, '/'); // 링크에는 어떤 개인정보도 담지 않아요(경로는 항상 '/')
    const r = await shareMessage(sdk, build(link));
    const notice = r === 'shared' ? '' : r === 'unsupported' ? '토스 앱 안에서만 공유할 수 있어요.' : '공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
    if (r === 'shared') tracker.track('share_done', { kind, link: link ? 'yes' : 'no' });
    setState({ busy: false, notice });
  }, [sdk, appName, tracker, state.busy]);
  return { ...state, run };
}
