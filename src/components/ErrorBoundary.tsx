/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components,
 * displays fallback UI, and logs errors for monitoring.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

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

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-lg p-6 border border-red-500/50">
            <div className="text-center">
              <span className="text-6xl mb-4">😵</span>
              <h2 className="text-xl font-bold text-white mb-2">
                Oops, something went wrong
              </h2>
              <p className="text-slate-400 mb-6">
                An unexpected error occurred. Don't worry, your recordings are safe!
              </p>
              <div className="bg-slate-900 rounded p-3 mb-4 text-left">
                <p className="text-xs text-slate-500 font-mono">
                  {this.state.error?.toString()}
                </p>
              </div>
              <button
                onClick={this.handleReset}
                className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
