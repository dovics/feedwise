/**
 * Structured logging utility for API requests and errors
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  request?: {
    method?: string;
    url?: string;
    userId?: string;
    headers?: Record<string, string>;
  };
}

class Logger {
  private formatMessage(logEntry: LogEntry): string {
    const { level, timestamp, message, context, error, request } = logEntry;

    let log = `[${timestamp}] [${level}] ${message}`;

    // Add request info if available
    if (request) {
      const requestParts = [];
      if (request.method) requestParts.push(request.method);
      if (request.url) requestParts.push(request.url);
      if (request.userId) requestParts.push(`user:${request.userId}`);

      if (requestParts.length > 0) {
        log += ` | Request: ${requestParts.join(' ')}`;
      }
    }

    // Add context if available
    if (context && Object.keys(context).length > 0) {
      log += ` | Context: ${JSON.stringify(context)}`;
    }

    // Add error details if available
    if (error) {
      log += `\n  Error: ${error.name}: ${error.message}`;
      if (error.stack) {
        log += `\n  Stack: ${error.stack}`;
      }
      if (error.cause) {
        log += `\n  Cause: ${JSON.stringify(error.cause)}`;
      }
    }

    return log;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error, requestInfo?: LogEntry['request']) {
    const logEntry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
      request: requestInfo,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      };
    }

    const formattedMessage = this.formatMessage(logEntry);

    // Output to console with appropriate color
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, error: Error, context?: LogContext, requestInfo?: LogEntry['request']) {
    this.log(LogLevel.ERROR, message, context, error, requestInfo);
  }

  /**
   * Log API request start
   */
  logApiRequestStart(method: string, url: string, userId?: string, additionalContext?: LogContext) {
    this.info(`API Request Started: ${method} ${url}`, {
      ...additionalContext,
      phase: 'request_start',
    });
  }

  /**
   * Log API request success
   */
  logApiRequestSuccess(method: string, url: string, userId?: string, duration?: number, additionalContext?: LogContext) {
    this.info(`API Request Success: ${method} ${url}${duration ? ` (${duration}ms)` : ''}`, {
      ...additionalContext,
      phase: 'request_success',
      duration,
    });
  }

  /**
   * Log API request error with full details
   */
  logApiRequestError(
    method: string,
    url: string,
    error: Error,
    userId?: string,
    duration?: number,
    additionalContext?: LogContext
  ) {
    this.error(
      `API Request Error: ${method} ${url}${duration ? ` (${duration}ms)` : ''}`,
      error,
      {
        ...additionalContext,
        phase: 'request_error',
        duration,
      },
      { method, url, userId }
    );
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(operation: string, model: string, context?: LogContext, error?: Error) {
    if (error) {
      this.error(`Database Error: ${operation} on ${model}`, error, {
        ...context,
        phase: 'database_error',
        operation,
        model,
      });
    } else {
      this.debug(`Database Operation: ${operation} on ${model}`, {
        ...context,
        phase: 'database_operation',
        operation,
        model,
      });
    }
  }

  /**
   * Log external API call
   */
  logExternalApiCall(service: string, endpoint: string, context?: LogContext, error?: Error) {
    if (error) {
      this.error(`External API Error: ${service} - ${endpoint}`, error, {
        ...context,
        phase: 'external_api_error',
        service,
        endpoint,
      });
    } else {
      this.info(`External API Call: ${service} - ${endpoint}`, {
        ...context,
        phase: 'external_api_call',
        service,
        endpoint,
      });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Helper function to extract request info for logging
 */
export function extractRequestInfo(req: Request, userId?: string): LogEntry['request'] {
  return {
    method: req.method,
    url: req.url,
    userId,
    headers: Object.fromEntries(
      // Only log safe headers, exclude sensitive ones
      Array.from(req.headers.entries())
        .filter(([key]) => !['authorization', 'cookie', 'set-cookie'].includes(key.toLowerCase()))
    ),
  };
}

/**
 * Wrapper for API route handlers with automatic logging
 */
export function withApiLogging(
  handler: (req: Request, context?: any) => Promise<Response>,
  options?: { logRequest?: boolean; logSuccess?: boolean; logError?: boolean }
) {
  return async (req: Request, context?: any): Promise<Response> => {
    const startTime = Date.now();
    const url = req.url;
    const method = req.method;

    try {
      if (options?.logRequest !== false) {
        logger.logApiRequestStart(method, url);
      }

      const response = await handler(req, context);

      if (options?.logSuccess !== false) {
        const duration = Date.now() - startTime;
        logger.logApiRequestSuccess(method, url, undefined, duration, {
          statusCode: response.status,
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (options?.logError !== false) {
        logger.logApiRequestError(
          method,
          url,
          error as Error,
          undefined,
          duration
        );
      }
      throw error;
    }
  };
}

/**
 * Wrap Prisma operations with automatic error logging
 * Use this for critical database operations that need detailed logging
 *
 * @example
 * const user = await withPrismaLogging(
 *   () => prisma.user.findUnique({ where: { id } }),
 *   'findUnique',
 *   'User',
 *   { userId: id }
 * );
 */
export async function withPrismaLogging<T>(
  operation: () => Promise<T>,
  operationType: string,
  modelName: string,
  context?: LogContext
): Promise<T> {
  try {
    const result = await operation();
    logger.logDatabaseOperation(operationType, modelName, context);
    return result;
  } catch (error) {
    logger.logDatabaseOperation(operationType, modelName, context, error as Error);
    throw error;
  }
}
