/**
 * Client-side logging utility
 * Provides structured logging for client components
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// interface LogEntry {
//   level: LogLevel
//   message: string
//   timestamp: string
//   context?: Record<string, unknown>
// } // Unused interface

class ClientLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private shouldLog(level: LogLevel): boolean {
    // In development, log everything
    if (this.isDevelopment) return true
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error'
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return
    
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return
    
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return
    
    console.warn(this.formatMessage('warn', message, context))
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return
    
    console.error(this.formatMessage('error', message, context))
  }

  // Legacy method for backward compatibility
  log(message: string, context?: Record<string, unknown>): void {
    this.info(message, context)
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger()

// Export individual methods for convenience
export const { debug, info, warn, error, log } = clientLogger
