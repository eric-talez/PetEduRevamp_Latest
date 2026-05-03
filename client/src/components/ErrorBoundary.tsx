import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** 폴백 UI에 표시할 영역 이름 (예: "지도", "AI 분석") */
  name?: string;
  /** 인라인(국소) 폴백 UI를 사용 (페이지 전체가 아닌 영역만 차단) */
  inline?: boolean;
  /** 폴백에서 다시 시도 버튼을 눌렀을 때 추가 동작 */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`,
      error,
      errorInfo
    );

    if (import.meta.env.DEV) {
      console.group(`🚨 Error Boundary${this.props.name ? ` (${this.props.name})` : ''}`);
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  renderInlineFallback() {
    const label = this.props.name || '이 영역';
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-900/10"
        role="alert"
        aria-live="polite"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {label}을(를) 표시하는 중 문제가 발생했어요.
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            나머지 화면은 정상적으로 사용할 수 있어요.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <p className="mt-2 text-xs font-mono text-amber-600 dark:text-amber-500">
              {this.state.error.message}
            </p>
          )}
        </div>
        <Button
          onClick={this.handleReset}
          variant="outline"
          size="sm"
          className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.inline) {
        return this.renderInlineFallback();
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                앗! 문제가 발생했습니다
              </h2>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                예상치 못한 오류로 화면을 표시하지 못했어요.<br />
                다시 시도하거나 홈으로 이동해 주세요.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    개발자 정보 (클릭하여 펼치기)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1"
                >
                  새로고침
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="default"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  홈으로
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 국소(인라인) ErrorBoundary - 위험 컴포넌트 한 영역만 차단하고
 * 페이지의 나머지는 정상 동작하게 합니다.
 *
 * 사용 예: 지도, AI 분석, 파일 업로드 분석, 영상통화 패널 등
 */
export function LocalErrorBoundary({
  children,
  name,
  fallback,
  onReset,
}: {
  children: ReactNode;
  name?: string;
  fallback?: ReactNode;
  onReset?: () => void;
}) {
  return (
    <ErrorBoundary inline name={name} fallback={fallback} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}
