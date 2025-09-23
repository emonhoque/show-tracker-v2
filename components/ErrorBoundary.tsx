'use client'

import { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId?: NodeJS.Timeout

  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    // Store error info for debugging
    this.setState({ errorInfo })
    
    // Report to external service (e.g., Sentry, LogRocket, etc.)
    this.reportError(error, errorInfo)
  }

  override componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.children !== this.props.children) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary()
      } else if (resetKeys && prevProps.resetKeys) {
        const hasResetKeyChanged = resetKeys.some((key, index) => 
          key !== prevProps.resetKeys?.[index]
        )
        if (hasResetKeyChanged) {
          this.resetErrorBoundary()
        }
      }
    }
  }

  override componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In production, you would send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo })
      console.error('Production error:', error, errorInfo)
    }
  }

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    })
  }

  private handleRetry = () => {
    const { retryCount } = this.state
    const maxRetries = 3
    
    if (retryCount < maxRetries) {
      this.setState(prevState => ({ 
        retryCount: prevState.retryCount + 1 
      }))
      
      // Reset after a short delay
      this.resetTimeoutId = setTimeout(() => {
        this.resetErrorBoundary()
      }, 1000)
    } else {
      // After max retries, reload the page
      window.location.reload()
    }
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-6">
                An unexpected error occurred. We&apos;re working to fix this issue.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {this.state.retryCount > 0 ? `Try Again (${this.state.retryCount}/3)` : 'Try Again'}
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              >
                Reload Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono text-muted-foreground overflow-auto">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
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
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
