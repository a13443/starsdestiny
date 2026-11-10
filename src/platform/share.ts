import type { Sdk } from './sdk';

/** 미니앱 딥링크. 공식 정책상 공유 링크는 자사 웹사이트가 아니라 intoss:// 스킴이어야 해요. */
export function deepLink(appName: string, path = '/'): string { return `intoss://${appName}${path.startsWith('/') ? path : '/' + path}`; }

export async function createShareLink(sdk: Pick<Sdk, 'Share'> | null, appName: string, path = '/', ogImageUrl?: string): Promise<string | null> {
  if (!sdk) return null;
  try { return await sdk.Share.createLink({ path: deepLink(appName, path), ogImageUrl }); } catch { return null; }
}
/** 네이티브 공유 시트로 텍스트 메시지를 보내요(Share.sendMessage). 이미지 파일은 SDK로 보낼 수 없어서 텍스트만 지원해요. */
export async function shareMessage(sdk: Pick<Sdk, 'Share'> | null, message: string): Promise<'shared' | 'unsupported' | 'failed'> {
  if (!sdk) return 'unsupported';
  try { await sdk.Share.sendMessage({ message }); return 'shared'; } catch { return 'failed'; }
}
