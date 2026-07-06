import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// App-wide safety net: a render error anywhere below shows a readable message and a
// reload button instead of a blank white screen. The message helps diagnose issues.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface to the console for debugging; the UI shows the message below.
    console.error('App render error:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="max-w-lg w-full bg-panel border border-border rounded-md p-5">
          <h1 className="text-[16px] font-bold text-ink-primary mb-1">Something went wrong on this page</h1>
          <p className="text-[12.5px] text-ink-secondary mb-3">
            The rest of the app is fine — you can go back and try again. If this keeps happening,
            share the message below with your developer.
          </p>
          <pre className="text-[11px] text-nps-red bg-app border border-border rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
            {error.message || String(error)}
          </pre>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                this.setState({ error: null });
                window.history.back();
              }}
              className="px-3 py-1.5 rounded text-[12.5px] border border-border bg-panel hover:bg-panel-alt"
            >
              Go back
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="px-3 py-1.5 rounded text-[12.5px] bg-accent text-white"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
