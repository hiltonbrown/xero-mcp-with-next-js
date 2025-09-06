// API tests for health check endpoint

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/health/route';

// Mock the monitoring service
jest.mock('@/lib/monitoring', () => ({
  monitoring: {
    getHealthMetrics: jest.fn(),
  },
}));

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    $queryRaw: jest.fn(),
  },
}));

import { monitoring } from '@/lib/monitoring';
import { db } from '@/lib/db';

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status when database is connected', async () => {
      // Mock database connection success
      (db.$queryRaw as jest.Mock).mockResolvedValue([{ '1': 1 }]);

      // Mock health metrics
      (monitoring.getHealthMetrics as jest.Mock).mockResolvedValue({
        status: 'healthy',
        uptime: 3600,
        memory: { rss: 100000000, heapTotal: 50000000, heapUsed: 30000000 },
        eventsPerHour: 10,
        errorRate: 0.5,
        averageResponseTime: 150,
        timestamp: new Date().toISOString(),
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks.database).toBe(true);
      expect(data.checks.responseTime).toBeDefined();
      expect(data.metrics).toBeDefined();
    });

    it('should return unhealthy status when database is disconnected', async () => {
      // Mock database connection failure
      (db.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.database).toBe(false);
    });

    it('should include system information', async () => {
      (db.$queryRaw as jest.Mock).mockResolvedValue([{ '1': 1 }]);
      (monitoring.getHealthMetrics as jest.Mock).mockResolvedValue({
        status: 'healthy',
        uptime: 3600,
        memory: { rss: 100000000, heapTotal: 50000000, heapUsed: 30000000 },
        eventsPerHour: 10,
        errorRate: 0.5,
        averageResponseTime: 150,
        timestamp: new Date().toISOString(),
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.uptime).toBeDefined();
      expect(data.version).toBeDefined();
      expect(data.environment).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('POST /api/health', () => {
    it('should return detailed health check with dependency status', async () => {
      (db.$queryRaw as jest.Mock).mockResolvedValue([{ '1': 1 }]);

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBeDefined();
      expect(data.checks.database).toBeDefined();
      expect(data.checks.external).toBeDefined();
      expect(data.checks.cache).toBeDefined();
      expect(data.system).toBeDefined();
    });

    it('should handle database connection failures in detailed check', async () => {
      (db.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.checks.database.status).toBe('unhealthy');
      expect(data.status).toBe('degraded');
    });
  });
});