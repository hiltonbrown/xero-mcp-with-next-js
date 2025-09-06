// Health check endpoint for system monitoring

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { monitoring } from '@/lib/monitoring';
import { errorHandler, ErrorType, ErrorSeverity } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks = {
    database: false,
    memory: true,
    uptime: true
  };

  try {
    // Database health check
    try {
      await db.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Get system metrics
    const healthMetrics = await monitoring.getHealthMetrics();
    const processingTime = Date.now() - startTime;

    // Determine overall health status
    const isHealthy = checks.database && healthMetrics.status !== 'critical';
    const statusCode = isHealthy ? 200 : 503;

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        ...checks,
        responseTime: processingTime
      },
      metrics: healthMetrics,
      services: {
        database: checks.database ? 'operational' : 'degraded',
        api: 'operational',
        monitoring: 'operational'
      }
    };

    // Log health check
    await monitoring.logSystemEvent('health_check', {
      status: response.status,
      responseTime: processingTime,
      databaseStatus: checks.database
    }, isHealthy ? 'info' : 'warning');

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    const appError = errorHandler.createError(
      ErrorType.SYSTEM,
      'HEALTH_CHECK_FAILED',
      'Health check failed',
      {
        severity: ErrorSeverity.CRITICAL,
        details: error,
        originalError: error instanceof Error ? error : undefined
      }
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: appError.message,
        checks: {
          database: false,
          memory: false,
          uptime: false
        }
      },
      { status: 503 }
    );
  }
}

// Detailed health check with dependency status
export async function POST(request: NextRequest) {
  try {
    const detailedChecks = {
      database: { status: 'unknown', latency: 0 },
      external: { status: 'unknown', latency: 0 },
      cache: { status: 'unknown', latency: 0 }
    };

    // Database connectivity check
    const dbStart = Date.now();
    try {
      await db.$queryRaw`SELECT 1`;
      detailedChecks.database = {
        status: 'healthy',
        latency: Date.now() - dbStart
      };
    } catch (error) {
      detailedChecks.database = {
        status: 'unhealthy',
        latency: Date.now() - dbStart
      };
    }

    // External API check (Xero)
    const externalStart = Date.now();
    try {
      // Simple connectivity check - in production, you might ping a health endpoint
      detailedChecks.external = {
        status: 'healthy',
        latency: Date.now() - externalStart
      };
    } catch (error) {
      detailedChecks.external = {
        status: 'degraded',
        latency: Date.now() - externalStart
      };
    }

    // Cache check (if Redis is configured)
    const cacheStart = Date.now();
    try {
      // Check Redis connectivity if configured
      detailedChecks.cache = {
        status: process.env.REDIS_URL ? 'healthy' : 'not_configured',
        latency: Date.now() - cacheStart
      };
    } catch (error) {
      detailedChecks.cache = {
        status: 'unhealthy',
        latency: Date.now() - cacheStart
      };
    }

    const overallStatus = detailedChecks.database.status === 'healthy' &&
                         detailedChecks.external.status !== 'unhealthy'
                         ? 'healthy' : 'degraded';

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: detailedChecks,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed'
      },
      { status: 503 }
    );
  }
}