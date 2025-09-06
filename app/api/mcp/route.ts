// Main MCP server endpoint

import { mcpServer } from '@/lib/mcp-server';
import { validateMCPSession } from '@/lib/auth';

export async function GET(request: Request) {
  // Handle MCP server info request
  return new Response(JSON.stringify({
    name: 'xero-mcp-server',
    version: '1.0.0',
    capabilities: {
      tools: {},
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    // Validate session
    if (!sessionId) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Session ID required'
        },
        id: body.id
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = await validateMCPSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Invalid or expired session'
        },
        id: body.id
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process MCP request using our server instance
    const response = await mcpServer.processRequest(body, sessionId);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('MCP request error:', error);
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      },
      id: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}