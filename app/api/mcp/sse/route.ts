// SSE (Server-Sent Events) endpoint for MCP real-time communication
// Uses Redis pub/sub for event distribution

import { getRedisClient } from '@/lib/redis';
import { validateMCPSession } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    // Validate session
    if (!sessionId) {
      return new Response('Session ID required', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const session = await validateMCPSession(sessionId);
    if (!session) {
      return new Response('Invalid or expired session', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const redis = await getRedisClient();
    const subscriber = redis.duplicate();

    // Create SSE response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await subscriber.connect();

          // Subscribe to MCP events for this session
          await subscriber.subscribe(`mcp:events:${sessionId}`, (message) => {
            try {
              const data = JSON.parse(message);
              controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
              console.error('Error parsing SSE message:', error);
            }
          });

          // Send initial connection confirmation
          controller.enqueue(`data: ${JSON.stringify({
            type: 'connection',
            status: 'established',
            sessionId,
            timestamp: new Date().toISOString()
          })}\n\n`);

          // Handle client disconnect
          request.signal.addEventListener('abort', async () => {
            try {
              await subscriber.unsubscribe(`mcp:events:${sessionId}`);
              await subscriber.disconnect();
              controller.close();
            } catch (error) {
              console.error('Error cleaning up SSE connection:', error);
            }
          });

        } catch (error) {
          console.error('SSE connection error:', error);
          controller.error(error);
        }
      },

      async cancel() {
        try {
          await subscriber.unsubscribe(`mcp:events:${sessionId}`);
          await subscriber.disconnect();
        } catch (error) {
          console.error('Error during SSE cleanup:', error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('SSE endpoint error:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}