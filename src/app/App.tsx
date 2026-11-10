import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_NAME } from './brand';
import { Button, Border } from '@toss/tds-mobile';
import { AppProvider } from './AppProvider';
import { adGroupIdFor, adModeFor, createAdGate, isQrTestHost, createKV, createTracker, getJSON, getSdk, onBack, setJSON, type EventName, type Sdk } from '../platform';
import { EMPTY_FORM, kstToday, toProfile, viewOf, votesOf, type BirthForm } from './domain';
import { BirthFields } from './BirthFields';
import { GATES, NextMenu, gateDesc, useGates, type GateKey } from './gate';
import { Disclaimer } from './ui';
import { ErrorBoundary } from './ErrorBoundary';
import { HomeView } from './views/Home';
import { TodayView } from './views/Today';
import { NewYearView } from './views/NewYear';
import { DestinyView } from './views/Destiny';
import { TaekilView } from './views/Taekil';
import { MatchView } from './views/Match';
import { DiaryView } from './views/DiaryView';
import { ShareCardView } from './views/ShareCardView';
import { loadDiary, recordMood, type Diary, type Mood } from './diary';
import { useShare } from './useShare';
import { MENU_VIS, MenuCard, MenuList } from './menu';
import { AdDebug } from './AdDebug';
import { matchShareText, resultShareText } from './shareText';

const PROFILE_KEY = 'profile:v1';
type View = 'input' | 'home' | GateKey | 'match' | 'diary' | 'card';

/** sdk·hosted는 테스트용 주입 지점이에요. 실제 실행에서는 환경에서 자동으로 정해져요. */
export default function App({ sdk: injected, hosted, host }: { sdk?: Sdk | null; hosted?: boolean; host?: string } = {}) {
  const sdk = useMemo(() => (injected !== undefined ? injected : getSdk()), [injected]);
  const isHosted = hosted ?? !!sdk;
  const kv = useMemo(() => createKV(sdk), [sdk]);
  const tracker = useMemo(() => createTracker(sdk, (m) => console.debug(m)), [sdk]);
  // 광고 그룹 ID: 실제 서비스 주소에서만 실제 ID, 그 외(QR 테스트·샌드박스·로컬)는 테스트 ID. host는 테스트용 주입 지점이에요.
  const adHost = host ?? (typeof location !== 'undefined' ? location.hostname : '');
  const adMode = adModeFor(adHost, APP_NAME);
  const qrTest = isQrTestHost(adHost, APP_NAME); // 콘솔 QR 테스트에서만 광고 이벤트 진단 줄을 보여줘요
  const [adTrace, setAdTrace] = useState<string[]>([]);
  const gate = useMemo(() => createAdGate(sdk, adGroupIdFor(adHost, APP_NAME), { onTrace: qrTest ? (line) => setAdTrace((t) => [...t.slice(-11), line]) : undefined }), [sdk, adHost, qrTest]);
  const gates = useGates(kv, gate, tracker);
  const share = useShare(sdk, APP_NAME, tracker);
  const [stack, setStack] = useState<View[] | null>(null);
  const [form, setForm] = useState<BirthForm | null>(null);
  const [msg, setMsg] = useState('');
  const [diary, setDiary] = useState<Diary>({});
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return; booted.current = true;
    (async () => {
      const saved = await getJSON<BirthForm | null>(kv, PROFILE_KEY, null);
      setForm(saved); setDiary(await loadDiary(kv)); setStack([saved ? 'home' : 'input']); tracker.track('app_open', { returning: !!saved, ad_mode: adMode });
      void gate.preload(); // 광고는 미리 불러둬요(재생 시점 실시간 로딩 금지)
    })();
    return () => gate.dispose();
  }, [kv, gate, tracker]);

  // 첫 화면에서는 구독하지 않아 기본 동작(미니앱 종료)을 유지해요.
  const depth = stack?.length ?? 0;
  useEffect(() => (depth > 1 ? onBack(sdk, () => setStack((s) => (s && s.length > 1 ? s.slice(0, -1) : s))) : () => {}), [depth, sdk]);

  const push = useCallback((v: View) => setStack((s) => (s ? [...s, v] : [v])), []);
  const replace = useCallback((v: View) => setStack((s) => (s ? [...s.slice(0, -1), v] : [v])), []);
  const profile = useMemo(() => { try { return form ? toProfile(form) : null; } catch { return null; } }, [form]);

  async function submit(f: BirthForm) {
    try { toProfile(f); } catch (e) { setMsg((e as Error).message); return; } // 존재하지 않는 음력 날짜 등
    setMsg('');
    await setJSON(kv, PROFILE_KEY, f); setForm(f); tracker.track('profile_submit', { cal: f.cal });
    setStack(['home']);
  }
  async function openGate(k: GateKey, mode: 'push' | 'replace') {
    if (!(await gates.open(k))) return;
    tracker.track(`view_${k}` as EventName);
    (mode === 'push' ? push : replace)(k);
  }
  async function onMood(m: Mood, level: number) {
    setDiary(await recordMood(kv, kstToday(), m, level)); tracker.track('diary_record', { mood: m });
  }
  const goDiary = (mode: 'push' | 'replace') => { tracker.track('view_diary'); (mode === 'push' ? push : replace)('diary'); };
  const goMatch = (mode: 'push' | 'replace') => { tracker.track('view_match'); (mode === 'push' ? push : replace)('match'); };

  if (!stack) return <AppProvider hosted={isHosted}><main className="page"><p className="sub">불러오는 중이에요…</p></main></AppProvider>;
  const view = stack[stack.length - 1];
  const next = (cur: GateKey) => <NextMenu current={cur} unlocked={gates.unlocked} busy={gates.busy} message={gates.message} messageKey={gates.messageKey} onGate={(k) => void openGate(k, 'replace')} onMatch={() => goMatch('replace')} onHome={() => setStack(['home'])} />;
  return (
    <AppProvider hosted={isHosted}>
      <main className="page">
        <ErrorBoundary resetKey={stack.join('>')} onReset={() => setStack([profile ? 'home' : 'input'])}>
        {view === 'input' && <InputView initial={form} onSubmit={submit} error={msg} />}
        {view === 'home' && profile && (
          <HomeView profile={profile} onImprove={() => push('input')}>
            <Border variant="height16" />
            <h2 className="h2">이 조합으로 더 보기</h2>
            <p className="note">아래 풀이는 사주를 중심으로 하고, 서양 별자리·띠·수비학·베딕·구성기학을 보조 체계로 함께 반영해요.</p>
            <MenuList label="더 보기 메뉴">
              {GATES.map((g) => (
                <MenuCard key={g.key} title={g.title} desc={gateDesc(g.key)} vis={MENU_VIS[g.key]} note={gates.messageKey === g.key ? gates.message : undefined} status={gates.busy === g.key ? 'busy' : gates.unlocked[g.key] ? 'open' : 'locked'} onClick={() => void openGate(g.key, 'push')} />
              ))}
              <MenuCard title="궁합 보기" vis={MENU_VIS.match} desc="두 사람의 사주·별자리·띠·구성기학·수비학" status="free" onClick={() => goMatch('push')} />
              <MenuCard title="운세 일기" vis={MENU_VIS.diary} desc="오늘 풀이가 실제 하루와 맞았는지 기록해요" status="free" onClick={() => goDiary('push')} />
              <MenuCard title="내 결과 공유하기" vis={MENU_VIS.share} desc="결과 요약과 링크를 친구에게 보내요" status={share.busy ? 'busy' : 'free'} busyLabel="공유 준비 중" onClick={() => void share.run('result', (link) => resultShareText(viewOf(profile), votesOf(profile), link))} />
              <MenuCard title="공유 카드 보기" vis={MENU_VIS.card} desc="카드로 보여드려요. 화면을 캡처해서 공유해요" status="free" onClick={() => push('card')} />
              <MenuCard title="정보 수정" vis={MENU_VIS.edit} desc="생년월일·성별·시간·출생지를 바꿔요" status="none" onClick={() => push('input')} />
            </MenuList>
            {qrTest && <AdDebug id={adGroupIdFor(adHost, APP_NAME)} lines={adTrace} />}
            {share.notice && <p className="msg" role="status">{share.notice}</p>}
            <Disclaimer />
          </HomeView>
        )}
        {view === 'today' && profile && <>{<TodayView profile={profile} unlocked={gates.unlocked.today} mood={diary[kstToday()]?.mood ?? null} onMood={(m, lv) => void onMood(m, lv)} onDiary={() => goDiary('replace')} />}{next('today')}</>}
        {view === 'newyear' && profile && <>{<NewYearView profile={profile} />}{next('newyear')}</>}
        {view === 'destiny' && profile && <>{<DestinyView profile={profile} />}{next('destiny')}</>}
        {view === 'taekil' && profile && <>{<TaekilView profile={profile} />}{next('taekil')}</>}
        {view === 'match' && profile && <MatchView me={profile} onShare={(R) => void share.run('match', (link) => matchShareText(R, link))} sharing={share.busy} notice={share.notice} />}
        {view === 'card' && profile && <ShareCardView profile={profile} />}
        {view === 'diary' && <DiaryView diary={diary} onGoToday={() => void openGate('today', 'replace')} />}
        </ErrorBoundary>
      </main>
    </AppProvider>
  );
}

function InputView({ initial, onSubmit, error }: { initial: BirthForm | null; onSubmit: (f: BirthForm) => void; error: string }) {
  const [f, setF] = useState<BirthForm>(initial ?? EMPTY_FORM);
  return (
    <section>
      <h1 className="h1">여섯 가지 운세가 같은 말을 할까요?</h1>
      <p className="lead">사주를 중심으로 풀이하고, 서양 별자리·수비학·띠·구성기학·베딕 점성술을 보조 체계로 함께 겹쳐서 어디서 만나고 어디서 갈리는지 알려드려요. 생년월일과 성별이면 다섯 가지, 시간과 출생지까지 넣으면 여섯 가지가 열려요.</p>
      <BirthFields value={f} onChange={(p) => setF((x) => ({ ...x, ...p }))} advanced />
      <div className="gap" />
      <Button display="full" size="xlarge" onClick={() => onSubmit(f)}>결과 보기</Button>
      {error && <p className="msg" role="alert">{error}</p>}
      <p className="fine">입력한 정보는 이 기기 안에서만 계산하고 저장해요. 풀이 문구는 AI의 도움을 받아 작성한 문장을 규칙에 따라 조합해 보여드려요.</p>
    </section>
  );
}
