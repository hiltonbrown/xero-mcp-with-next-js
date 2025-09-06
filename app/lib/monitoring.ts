// Monitoring and logging system for Xero MCP integration

import { db } from './db';

export interface MonitoringEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  category: 'mcp' | 'xero' | 'auth' | 'system' | 'user';
  userId?: string;
  sessionId?: string;
  data: Record<string, any>;
  duration?: number;
  success: boolean;
  error?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: Date;
  tags?: Record<string, string>;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private events: MonitoringEvent[] = [];
  private metrics: PerformanceMetric[] = [];

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Log MCP tool usage
  async logMCPToolUsage(
    toolName: string,
    userId: string,
    sessionId: string,
    success: boolean,
    duration: number,
    data?: any,
    error?: string
  ) {
    const event: MonitoringEvent = {
      id: `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType: 'tool_execution',
      category: 'mcp',
      userId,
      sessionId,
      data: {
        toolName,
        ...data
      },
      duration,
      success,
      error
    };

    await this.logEvent(event);

    // Record performance metric
    this.recordMetric('mcp_tool_execution_time', duration, 'ms', {
      tool: toolName,
      success: success.toString()
    });
  }

  // Log Xero API calls
  async logXeroAPICall(
    endpoint: string,
    method: string,
    userId: string,
    success: boolean,
    duration: number,
    statusCode?: number,
    error?: string
  ) {
    const event: MonitoringEvent = {
      id: `xero_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType: 'api_call',
      category: 'xero',
      userId,
      data: {
        endpoint,
        method,
        statusCode
      },
      duration,
      success,
      error
    };

    await this.logEvent(event);

    // Record performance metric
    this.recordMetric('xero_api_call_time', duration, 'ms', {
      endpoint,
      method,
      success: success.toString()
    });
  }

  // Log authentication events
  async logAuthEvent(
    eventType: 'login' | 'logout' | 'token_refresh' | 'oauth_callback',
    userId: string,
    success: boolean,
    data?: any,
    error?: string
  ) {
    const event: MonitoringEvent = {
      id: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType,
      category: 'auth',
      userId,
      data,
      success,
      error
    };

    await this.logEvent(event);
  }

  // Log system events
  async logSystemEvent(
    eventType: string,
    data: any,
    severity: 'info' | 'warning' | 'error' = 'info'
  ) {
    const event: MonitoringEvent = {
      id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType,
      category: 'system',
      data: {
        ...data,
        severity
      },
      success: severity !== 'error'
    };

    await this.logEvent(event);
  }

  // Record performance metrics
  recordMetric(
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count',
    tags?: Record<string, string>
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    this.metrics.unshift(metric);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(0, 1000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Metric: ${name} = ${value}${unit}`, tags);
    }
  }

  // Private method to log events
  private async logEvent(event: MonitoringEvent) {
    // Store in memory for quick access
    this.events.unshift(event);
    if (this.events.length > 1000) {
      this.events = this.events.slice(0, 1000);
    }

    // Log to console with appropriate formatting
    const logData = {
      id: event.id,
      timestamp: event.timestamp.toISOString(),
      type: event.eventType,
      category: event.category,
      userId: event.userId,
      sessionId: event.sessionId,
      success: event.success,
      duration: event.duration,
      error: event.error
    };

    if (event.success) {
      console.log(`✅ ${event.category.toUpperCase()}: ${event.eventType}`, logData);
    } else {
      console.error(`❌ ${event.category.toUpperCase()}: ${event.eventType}`, logData);
    }

    // In production, persist to database or external monitoring service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Store in database for long-term analysis
        await this.persistEvent(event);

        // Send to external monitoring service
        await this.sendToExternalMonitoring(event);
      } catch (error) {
        console.error('Failed to persist monitoring event:', error);
      }
    }
  }

  // Persist event to database
  private async persistEvent(event: MonitoringEvent) {
    try {
      // Store in a monitoring_events table (would need to create this schema)
      // For now, we'll just log that we would persist it
      console.log('📝 Would persist event to database:', event.id);
    } catch (error) {
      console.error('Failed to persist event:', error);
    }
  }

  // Send to external monitoring service
  private async sendToExternalMonitoring(event: MonitoringEvent) {
    // Send to services like Sentry, DataDog, etc.
    if (process.env.SENTRY_DSN) {
      // Send to Sentry
      console.log('📤 Would send to Sentry:', event.id);
    }

    if (process.env.DATADOG_API_KEY) {
      // Send to DataDog
      console.log('📤 Would send to DataDog:', event.id);
    }
  }

  // Get monitoring statistics
  getStats(timeRange: '1h' | '24h' | '7d' = '24h') {
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(now.getTime() - timeRangeMs[timeRange]);

    const relevantEvents = this.events.filter(e => e.timestamp >= cutoff);
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const stats = {
      timeRange,
      totalEvents: relevantEvents.length,
      totalMetrics: relevantMetrics.length,
      eventsByCategory: {} as Record<string, number>,
      eventsByType: {} as Record<string, number>,
      successRate: 0,
      averageDuration: 0,
      errorRate: 0,
      topTools: [] as Array<{ name: string; count: number }>,
      recentEvents: relevantEvents.slice(0, 10)
    };

    // Calculate statistics
    let totalDuration = 0;
    let durationCount = 0;
    let successCount = 0;
    const toolUsage: Record<string, number> = {};

    relevantEvents.forEach(event => {
      // Category counts
      stats.eventsByCategory[event.category] = (stats.eventsByCategory[event.category] || 0) + 1;

      // Type counts
      stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;

      // Success rate
      if (event.success) successCount++;

      // Duration tracking
      if (event.duration) {
        totalDuration += event.duration;
        durationCount++;
      }

      // Tool usage tracking
      if (event.category === 'mcp' && event.data?.toolName) {
        toolUsage[event.data.toolName] = (toolUsage[event.data.toolName] || 0) + 1;
      }
    });

    stats.successRate = relevantEvents.length > 0 ? (successCount / relevantEvents.length) * 100 : 0;
    stats.averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
    stats.errorRate = 100 - stats.successRate;

    // Top tools
    stats.topTools = Object.entries(toolUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return stats;
  }

  // Health check metrics
  async getHealthMetrics() {
    const stats = this.getStats('1h');

    return {
      status: stats.errorRate < 5 ? 'healthy' : stats.errorRate < 15 ? 'warning' : 'critical',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      eventsPerHour: stats.totalEvents,
      errorRate: stats.errorRate,
      averageResponseTime: stats.averageDuration,
      timestamp: new Date().toISOString()
    };
  }

  // Clear monitoring data
  clearData() {
    this.events = [];
    this.metrics = [];
  }
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance();

// Utility functions for easy monitoring
export const monitorMCPTool = async (
  toolName: string,
  userId: string,
  sessionId: string,
  operation: () => Promise<any>
) => {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    await monitoring.logMCPToolUsage(toolName, userId, sessionId, true, duration, result);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await monitoring.logMCPToolUsage(toolName, userId, sessionId, false, duration, undefined, errorMessage);
    throw error;
  }
};

export const monitorXeroAPI = async (
  endpoint: string,
  method: string,
  userId: string,
  operation: () => Promise<any>
) => {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    await monitoring.logXeroAPICall(endpoint, method, userId, true, duration, result.status);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await monitoring.logXeroAPICall(endpoint, method, userId, false, duration, undefined, errorMessage);
    throw error;
  }
};