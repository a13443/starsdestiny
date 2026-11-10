// jsdom에는 matchMedia가 없어요(실제 WebView에는 있어요). TDS가 사용하므로 테스트 환경에만 최소 구현을 둬요.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
}

// ResizeObserver도 jsdom에 없어요(실제 WebView에는 있어요). TDS의 SegmentedControl 등이 사용해요.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
