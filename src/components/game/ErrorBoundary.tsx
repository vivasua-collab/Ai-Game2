'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Props для ErrorBoundary
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

/**
 * State для ErrorBoundary
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary для обработки ошибок в PhaserGame
 * 
 * Отлавливает ошибки рендеринга и生命周期 методов дочерних компонентов.
 * Показывает fallback UI с возможностью перезапуска.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Обновляем state, чтобы показать fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Логируем ошибку
    console.error('[ErrorBoundary] PhaserGame error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
    
    // Можно отправить ошибку в сервис мониторинга
    // Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Вызываем внешний обработчик если есть
    this.props.onReset?.();
    
    // Перезагружаем страницу для полного сброса
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
          <div className="max-w-md text-center space-y-6">
            <div className="text-6xl mb-4">💥</div>
            
            <h1 className="text-2xl font-bold text-red-400">
              Ошибка игры
            </h1>
            
            <p className="text-slate-400">
              Произошла непредвиденная ошибка в игровом движке.
              Попробуйте перезапустить игру.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-4 bg-slate-800 rounded-lg text-left">
                <p className="text-xs text-red-300 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs text-slate-500 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={this.handleReset}
                className="bg-amber-600 hover:bg-amber-700"
              >
                🔄 Перезапустить игру
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="border-slate-600 text-slate-400 hover:bg-slate-800"
              >
                🏠 На главную
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Fallback компонент для отображения при ошибке загрузки Phaser
 */
export function GameErrorFallback({ onRetry }: { onRetry?: () => void }): ReactNode {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="text-center space-y-4">
        <div className="text-4xl">🎮</div>
        <h2 className="text-xl font-semibold text-amber-400">
          Не удалось загрузить игру
        </h2>
        <p className="text-slate-400 text-sm">
          Проверьте консоль браузера для подробностей
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Попробовать снова
          </Button>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
