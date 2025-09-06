// Centralized error handling system for Xero MCP integration

export enum ErrorType {
  // User-facing errors
  USER_INPUT = 'USER_INPUT',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',

  // System errors
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  EXTERNAL_API = 'EXTERNAL_API',
  CONFIGURATION = 'CONFIGURATION',

  // Recoverable errors
  RATE_LIMIT = 'RATE_LIMIT',
  TEMPORARY = 'TEMPORARY',
  RETRYABLE = 'RETRYABLE',

  // Critical errors
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  details?: any;
  userMessage?: string;
  retryable: boolean;
  statusCode: number;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  stack?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Create standardized error objects
  createError(
    type: ErrorType,
    code: string,
    message: string,
    options: {
      severity?: ErrorSeverity;
      details?: any;
      userMessage?: string;
      retryable?: boolean;
      statusCode?: number;
      requestId?: string;
      userId?: string;
      originalError?: Error;
    } = {}
  ): AppError {
    const {
      severity = ErrorSeverity.MEDIUM,
      details,
      userMessage,
      retryable = false,
      statusCode = 500,
      requestId,
      userId,
      originalError
    } = options;

    const error: AppError = {
      type,
      severity,
      code,
      message,
      details,
      userMessage: userMessage || this.getDefaultUserMessage(type),
      retryable,
      statusCode,
      timestamp: new Date(),
      requestId,
      userId,
      stack: originalError?.stack
    };

    this.logError(error);
    return error;
  }

  // Handle Xero API errors
  handleXeroError(error: any, context?: { requestId?: string; userId?: string }): AppError {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          return this.createError(
            ErrorType.AUTHENTICATION,
            'XERO_UNAUTHORIZED',
            'Xero API authentication failed',
            {
              severity: ErrorSeverity.HIGH,
              details: data,
              retryable: false,
              statusCode: 401,
              ...context
            }
          );

        case 403:
          return this.createError(
            ErrorType.AUTHORIZATION,
            'XERO_FORBIDDEN',
            'Xero API access forbidden',
            {
              severity: ErrorSeverity.HIGH,
              details: data,
              retryable: false,
              statusCode: 403,
              ...context
            }
          );

        case 429:
          return this.createError(
            ErrorType.RATE_LIMIT,
            'XERO_RATE_LIMIT',
            'Xero API rate limit exceeded',
            {
              severity: ErrorSeverity.MEDIUM,
              details: data,
              retryable: true,
              statusCode: 429,
              ...context
            }
          );

        case 400:
          return this.createError(
            ErrorType.VALIDATION,
            'XERO_BAD_REQUEST',
            'Invalid request to Xero API',
            {
              severity: ErrorSeverity.MEDIUM,
              details: data,
              retryable: false,
              statusCode: 400,
              ...context
            }
          );

        default:
          return this.createError(
            ErrorType.EXTERNAL_API,
            'XERO_API_ERROR',
            `Xero API error: ${status}`,
            {
              severity: ErrorSeverity.MEDIUM,
              details: data,
              retryable: status >= 500,
              statusCode: status,
              ...context
            }
          );
      }
    }

    // Network or other errors
    return this.createError(
      ErrorType.NETWORK,
      'XERO_CONNECTION_ERROR',
      'Failed to connect to Xero API',
      {
        severity: ErrorSeverity.HIGH,
        details: error,
        retryable: true,
        statusCode: 503,
        ...context
      }
    );
  }

  // Handle database errors
  handleDatabaseError(error: any, context?: { requestId?: string; userId?: string }): AppError {
    // Check for specific Prisma error codes
    if (error.code) {
      switch (error.code) {
        case 'P1001':
          return this.createError(
            ErrorType.DATABASE,
            'DB_CONNECTION_ERROR',
            'Database connection failed',
            {
              severity: ErrorSeverity.CRITICAL,
              details: error,
              retryable: true,
              statusCode: 503,
              ...context
            }
          );

        case 'P2002':
          return this.createError(
            ErrorType.VALIDATION,
            'DB_UNIQUE_CONSTRAINT',
            'Database unique constraint violation',
            {
              severity: ErrorSeverity.MEDIUM,
              details: error,
              retryable: false,
              statusCode: 409,
              ...context
            }
          );

        case 'P2028':
          return this.createError(
            ErrorType.DATABASE,
            'DB_TRANSACTION_TIMEOUT',
            'Database transaction timeout',
            {
              severity: ErrorSeverity.MEDIUM,
              details: error,
              retryable: true,
              statusCode: 504,
              ...context
            }
          );
      }
    }

    return this.createError(
      ErrorType.DATABASE,
      'DB_UNKNOWN_ERROR',
      'Database operation failed',
      {
        severity: ErrorSeverity.HIGH,
        details: error,
        retryable: true,
        statusCode: 500,
        ...context
      }
    );
  }

  // Handle OAuth errors
  handleOAuthError(error: any, context?: { requestId?: string; userId?: string }): AppError {
    const errorCode = error.code || error.error;

    switch (errorCode) {
      case 'access_denied':
        return this.createError(
          ErrorType.AUTHENTICATION,
          'OAUTH_ACCESS_DENIED',
          'User denied OAuth authorization',
          {
            severity: ErrorSeverity.LOW,
            details: error,
            retryable: false,
            statusCode: 403,
            ...context
          }
        );

      case 'invalid_request':
        return this.createError(
          ErrorType.VALIDATION,
          'OAUTH_INVALID_REQUEST',
          'Invalid OAuth request',
          {
            severity: ErrorSeverity.MEDIUM,
            details: error,
            retryable: false,
            statusCode: 400,
            ...context
          }
        );

      case 'unauthorized_client':
        return this.createError(
          ErrorType.AUTHENTICATION,
          'OAUTH_UNAUTHORIZED_CLIENT',
          'OAuth client not authorized',
          {
            severity: ErrorSeverity.HIGH,
            details: error,
            retryable: false,
            statusCode: 401,
            ...context
          }
        );

      default:
        return this.createError(
          ErrorType.AUTHENTICATION,
          'OAUTH_UNKNOWN_ERROR',
          'OAuth authentication failed',
          {
            severity: ErrorSeverity.MEDIUM,
            details: error,
            retryable: true,
            statusCode: 500,
            ...context
          }
        );
    }
  }

  // Handle MCP protocol errors
  handleMCPError(error: any, context?: { requestId?: string; userId?: string }): AppError {
    if (error.code) {
      switch (error.code) {
        case -32600:
          return this.createError(
            ErrorType.VALIDATION,
            'MCP_INVALID_REQUEST',
            'Invalid MCP request format',
            {
              severity: ErrorSeverity.LOW,
              details: error,
              retryable: false,
              statusCode: 400,
              ...context
            }
          );

        case -32601:
          return this.createError(
            ErrorType.VALIDATION,
            'MCP_METHOD_NOT_FOUND',
            'MCP method not found',
            {
              severity: ErrorSeverity.LOW,
              details: error,
              retryable: false,
              statusCode: 404,
              ...context
            }
          );

        case -32603:
          return this.createError(
            ErrorType.SYSTEM,
            'MCP_INTERNAL_ERROR',
            'MCP internal server error',
            {
              severity: ErrorSeverity.HIGH,
              details: error,
              retryable: true,
              statusCode: 500,
              ...context
            }
          );
      }
    }

    return this.createError(
      ErrorType.UNKNOWN,
      'MCP_UNKNOWN_ERROR',
      'Unknown MCP error',
      {
        severity: ErrorSeverity.MEDIUM,
        details: error,
        retryable: false,
        statusCode: 500,
        ...context
      }
    );
  }

  // Convert error to HTTP response
  toHTTPResponse(error: AppError) {
    return {
      status: error.statusCode,
      json: {
        error: {
          code: error.code,
          message: error.userMessage || error.message,
          type: error.type,
          retryable: error.retryable
        },
        ...(process.env.NODE_ENV === 'development' && {
          details: error.details,
          stack: error.stack
        })
      }
    };
  }

  // Convert error to MCP response
  toMCPResponse(error: AppError, requestId: string | number) {
    return {
      jsonrpc: '2.0',
      error: {
        code: this.mapToMCPErrorCode(error),
        message: error.userMessage || error.message,
        data: {
          type: error.type,
          retryable: error.retryable,
          ...(process.env.NODE_ENV === 'development' && {
            details: error.details
          })
        }
      },
      id: requestId
    };
  }

  private mapToMCPErrorCode(error: AppError): number {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return -32602; // Invalid params
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return -32001; // Application error
      case ErrorType.SYSTEM:
        return -32603; // Internal error
      default:
        return -32000; // Server error
    }
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return 'Authentication failed. Please sign in again.';
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait and try again.';
      case ErrorType.DATABASE:
        return 'Database temporarily unavailable. Please try again.';
      case ErrorType.NETWORK:
        return 'Network connection issue. Please check your connection.';
      case ErrorType.EXTERNAL_API:
        return 'External service temporarily unavailable. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private logError(error: AppError) {
    // Keep only last 1000 errors in memory
    this.errorLog.unshift(error);
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(0, 1000);
    }

    // Log to console with appropriate level
    const logData = {
      timestamp: error.timestamp.toISOString(),
      type: error.type,
      severity: error.severity,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      requestId: error.requestId,
      userId: error.userId
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('🔴 HIGH ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('🟡 MEDIUM ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('🔵 LOW ERROR:', logData);
        break;
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (Sentry, etc.)
      // this.sendToMonitoring(error);
    }
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: this.errorLog.slice(0, 10)
    };

    this.errorLog.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = [];
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: { requestId?: string; userId?: string }
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = errorHandler.createError(
        ErrorType.UNKNOWN,
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        {
          severity: ErrorSeverity.MEDIUM,
          details: error,
          originalError: error instanceof Error ? error : undefined,
          ...context
        }
      );
      throw appError;
    }
  };
}