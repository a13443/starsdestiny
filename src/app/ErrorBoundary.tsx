import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@toss/tds-mobile';

/** 화면 하나에서 예외가 나도 앱 전체가 흰 화면이 되지 않게 막고, 처음 화면으로 돌아갈 수 있게 해요. */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void; resetKey?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[화면 오류]', error.message, info.componentStack); }
  componentDidUpdate(prev: { resetKey?: string }) { if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert">
        <h1 className="h1">잠시 문제가 생겼어요</h1>
        <p className="sub">화면을 불러오는 중에 오류가 났어요. 처음 화면에서 다시 시도해 주세요. 입력한 정보는 그대로 있어요.</p>
        <Button display="full" size="xlarge" onClick={() => { this.setState({ failed: false }); this.props.onReset(); }}>처음 화면으로</Button>
      </section>
    );
  }
}
