// Unit tests for error handler

import { errorHandler, ErrorType, ErrorSeverity } from '@/lib/error-handler';

describe('Error Handler', () => {
  beforeEach(() => {
    // Clear error log before each test
    errorHandler['errorLog'] = [];
  });

  describe('Error Creation', () => {
    it('should create a user input error', () => {
      const error = errorHandler.createError(
        ErrorType.USER_INPUT,
        'INVALID_EMAIL',
        'Invalid email format',
        {
          severity: ErrorSeverity.LOW,
          statusCode: 400,
          requestId: 'test-request'
        }
      );

      expect(error.type).toBe(ErrorType.USER_INPUT);
      expect(error.code).toBe('INVALID_EMAIL');
      expect(error.message).toBe('Invalid email format');
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.statusCode).toBe(400);
      expect(error.requestId).toBe('test-request');
    });

    it('should use default user message for known error types', () => {
      const error = errorHandler.createError(
        ErrorType.AUTHENTICATION,
        'TOKEN_EXPIRED',
        'JWT token has expired'
      );

      expect(error.userMessage).toBe('Authentication failed. Please sign in again.');
    });

    it('should use custom user message when provided', () => {
      const customMessage = 'Custom error message';
      const error = errorHandler.createError(
        ErrorType.SYSTEM,
        'INTERNAL_ERROR',
        'Internal server error',
        { userMessage: customMessage }
      );

      expect(error.userMessage).toBe(customMessage);
    });
  });

  describe('Xero Error Handling', () => {
    it('should handle Xero authentication errors', () => {
      const xeroError = {
        response: {
          status: 401,
          data: { Type: 'Unauthorized', Title: 'Unauthorized' }
        }
      };

      const error = errorHandler.handleXeroError(xeroError, { requestId: 'test' });

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.code).toBe('XERO_UNAUTHORIZED');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.statusCode).toBe(401);
    });

    it('should handle Xero rate limit errors', () => {
      const xeroError = {
        response: {
          status: 429,
          data: { Type: 'RateLimitError', Title: 'Rate limit exceeded' }
        }
      };

      const error = errorHandler.handleXeroError(xeroError);

      expect(error.type).toBe(ErrorType.RATE_LIMIT);
      expect(error.code).toBe('XERO_RATE_LIMIT');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(429);
    });

    it('should handle network errors', () => {
      const networkError = new Error('Connection timeout');

      const error = errorHandler.handleXeroError(networkError);

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.code).toBe('XERO_CONNECTION_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(503);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle Prisma unique constraint errors', () => {
      const dbError = {
        code: 'P2002',
        message: 'Unique constraint failed'
      };

      const error = errorHandler.handleDatabaseError(dbError);

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.code).toBe('DB_UNIQUE_CONSTRAINT');
      expect(error.statusCode).toBe(409);
    });

    it('should handle database connection errors', () => {
      const dbError = {
        code: 'P1001',
        message: 'Database connection failed'
      };

      const error = errorHandler.handleDatabaseError(dbError);

      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.code).toBe('DB_CONNECTION_ERROR');
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.statusCode).toBe(503);
    });
  });

  describe('OAuth Error Handling', () => {
    it('should handle OAuth access denied', () => {
      const oauthError = { error: 'access_denied' };

      const error = errorHandler.handleOAuthError(oauthError);

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.code).toBe('OAUTH_ACCESS_DENIED');
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.retryable).toBe(false);
    });

    it('should handle OAuth invalid request', () => {
      const oauthError = { error: 'invalid_request' };

      const error = errorHandler.handleOAuthError(oauthError);

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.code).toBe('OAUTH_INVALID_REQUEST');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('Response Formatting', () => {
    it('should format error for HTTP response', () => {
      const error = errorHandler.createError(
        ErrorType.USER_INPUT,
        'TEST_ERROR',
        'Test error message'
      );

      const response = errorHandler.toHTTPResponse(error);

      expect(response.status).toBe(500);
      expect(response.json.error.code).toBe('TEST_ERROR');
      expect(response.json.error.message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should format error for MCP response', () => {
      const error = errorHandler.createError(
        ErrorType.VALIDATION,
        'MCP_INVALID_PARAMS',
        'Invalid parameters'
      );

      const response = errorHandler.toMCPResponse(error, 123);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(123);
      expect(response.error.code).toBe(-32602); // Invalid params
      expect(response.error.message).toBe('Please check your input and try again.');
    });
  });

  describe('Error Statistics', () => {
    it('should track error statistics', () => {
      errorHandler.createError(ErrorType.DATABASE, 'DB_ERROR_1', 'Database error 1');
      errorHandler.createError(ErrorType.DATABASE, 'DB_ERROR_2', 'Database error 2');
      errorHandler.createError(ErrorType.NETWORK, 'NETWORK_ERROR', 'Network error');

      const stats = errorHandler.getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.byType[ErrorType.DATABASE]).toBe(2);
      expect(stats.byType[ErrorType.NETWORK]).toBe(1);
      expect(stats.recent).toHaveLength(3);
    });
  });
});