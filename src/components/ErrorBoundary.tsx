/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components,
 * displays fallback UI, and logs errors for monitoring.
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log component stack
    console.log('Component stack:', errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-screen bg-slate-900 flex items-center justify-center p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-slate-800 rounded-lg p-6 border border-red-500/50 shadow-2xl fade-in">
            <div className="text-center">
              <span className="text-6xl mb-4 block">😵</span>
              <h2 className="text-xl font-bold text-white mb-2">
                Oops, something went wrong
              </h2>
              <p className="text-slate-400 mb-6">
                An unexpected error occurred. Don't worry, your recordings are safe!
              </p>
              {/* Uncomment to show error details in development */}
              {/* {false && (
                <details className="bg-slate-900 rounded p-3 mb-4 text-left">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                    Error details
                  </summary>
                  <pre className="text-xs text-red-400 font-mono mt-2 whitespace-pre-wrap break-all">
                    {this.state.error?.toString()}
                  </pre>
                </details>
              )} */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded-lg transition btn-press focus-ring min-h-[44px]"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition btn-press focus-ring min-h-[44px]"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
