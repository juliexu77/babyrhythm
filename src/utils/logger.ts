/**
 * Centralized logging utility for BabyRhythm
 * 
 * Features:
 * - Environment-aware (only logs in development)
 * - Supports multiple log levels
 * - Can be toggled via localStorage
 * - Consistent API with console
 * - Adds context/prefixes for better debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    // Check if we're in development mode
    const isDevelopment = import.meta.env.DEV;
    
    // Allow override via localStorage for debugging in production
    const storageEnabled = localStorage.getItem('debug_logging_enabled');
    
    this.config = {
      enabled: isDevelopment || storageEnabled === 'true',
      level: (localStorage.getItem('debug_log_level') as LogLevel) || 'info',
      prefix: '🔷'
    };
  }

  /**
   * Enable/disable logging at runtime
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    localStorage.setItem('debug_logging_enabled', String(enabled));
  }

  /**
   * Set minimum log level (debug < info < warn < error)
   */
  setLevel(level: LogLevel) {
    this.config.level = level;
    localStorage.setItem('debug_log_level', level);
  }

  /**
   * Check if a log level should be printed
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log message with context
   */
  private formatMessage(prefix: string, ...args: any[]): any[] {
    return [`${this.config.prefix} ${prefix}`, ...args];
  }

  /**
   * Debug level - detailed information for debugging
   */
  debug(prefix: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(...this.formatMessage(`[DEBUG] ${prefix}`, ...args));
    }
  }

  /**
   * Info level - general information
   */
  info(prefix: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(...this.formatMessage(`[INFO] ${prefix}`, ...args));
    }
  }

  /**
   * Warning level - potential issues
   */
  warn(prefix: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage(`[WARN] ${prefix}`, ...args));
    }
  }

  /**
   * Error level - actual errors (always logged in development)
   */
  error(prefix: string, error: any, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage(`[ERROR] ${prefix}`, error, ...args));
    }
  }

  /**
   * Group related logs together
   */
  group(label: string, collapsed: boolean = false) {
    if (this.config.enabled) {
      collapsed ? console.groupCollapsed(label) : console.group(label);
    }
  }

  groupEnd() {
    if (this.config.enabled) {
      console.groupEnd();
    }
  }

  /**
   * Time execution of operations
   */
  time(label: string) {
    if (this.config.enabled) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.config.enabled) {
      console.timeEnd(label);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common logging patterns
export const logActivity = (action: string, data: any) => {
  logger.debug(`Activity: ${action}`, data);
};

export const logAPI = (endpoint: string, data: any) => {
  logger.debug(`API: ${endpoint}`, data);
};

export const logAuth = (action: string, data: any) => {
  logger.info(`Auth: ${action}`, data);
};

export const logError = (context: string, error: any) => {
  logger.error(context, error);
};

/**
 * Usage examples:
 * 
 * import { logger, logActivity, logError } from '@/utils/logger';
 * 
 * // Basic logging
 * logger.info('User action', { action: 'click', button: 'submit' });
 * logger.debug('Data loaded', activities);
 * logger.warn('Slow operation', { duration: 5000 });
 * logger.error('Failed to save', error);
 * 
 * // Convenience functions
 * logActivity('create', newActivity);
 * logError('Photo upload', error);
 * 
 * // Grouping
 * logger.group('Processing activities');
 * logger.info('Step 1', data1);
 * logger.info('Step 2', data2);
 * logger.groupEnd();
 * 
 * // Timing
 * logger.time('fetch-activities');
 * await fetchActivities();
 * logger.timeEnd('fetch-activities');
 * 
 * // Runtime control (from browser console):
 * // window.logger.setEnabled(true)  // Enable in production
 * // window.logger.setLevel('debug') // Show all logs
 */

// Make logger available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).logger = logger;
}
