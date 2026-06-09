import React from 'react';
import { useApp } from '../store/AppContext';

interface ErrorBoundaryProps { children?: React.ReactNode; }

class ErrorBoundaryBase extends React.Component<ErrorBoundaryProps & { t: (key: string) => string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6" style={{ direction: 'rtl' }}>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full flex flex-col gap-4">
            <h1 className="text-lg font-black text-red-400">{this.props.t('error.unexpected')}</h1>
            <p className="text-xs text-slate-400 font-mono break-all">{(this.state as any).error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-4 rounded-lg border border-slate-700 cursor-pointer self-start"
            >
              {this.props.t('error.reload')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  const { t } = useApp();
  return <ErrorBoundaryBase t={t} {...props} />;
};
