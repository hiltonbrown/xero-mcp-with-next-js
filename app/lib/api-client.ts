// Client-side API utilities for MCP integration

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export interface XeroTenant {
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  tenants: XeroTenant[];
  sessionId?: string;
  expiresAt?: string;
}

class MCPApiClient {
  private sessionId: string | null = null;
  private baseUrl = '/api';

  constructor() {
    // Try to restore session from localStorage
    if (typeof window !== 'undefined') {
      this.sessionId = localStorage.getItem('mcp_session_id');
    }
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mcp_session_id', sessionId);
    }
  }

  clearSession() {
    this.sessionId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mcp_session_id');
    }
  }

  private async makeRequest(endpoint: string, data?: any): Promise<any> {
    const url = new URL(endpoint, window.location.origin);
    if (this.sessionId) {
      url.searchParams.set('sessionId', this.sessionId);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // OAuth flow methods
  async initiateXeroAuth(accountId: string): Promise<void> {
    const params = new URLSearchParams({ accountId });
    window.location.href = `/api/auth/xero?${params}`;
  }

  // MCP methods
  async listTools(): Promise<MCPTool[]> {
    const response = await this.makeRequest('/api/mcp', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {}
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.result.tools;
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const response = await this.makeRequest('/api/mcp', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.result;
  }

  // Connection status
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      // This would typically check with your backend
      // For now, we'll return a mock status
      return {
        isConnected: !!this.sessionId,
        tenants: [],
        sessionId: this.sessionId || undefined
      };
    } catch (error) {
      return {
        isConnected: false,
        tenants: []
      };
    }
  }

  // Utility methods
  async initialize(): Promise<void> {
    const response = await this.makeRequest('/api/mcp', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'xero-mcp-client',
          version: '1.0.0'
        }
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }
  }
}

// Export singleton instance
export const mcpClient = new MCPApiClient();

// React hooks for API integration
export const useMCPClient = () => {
  return mcpClient;
};

// Utility functions
export const formatMCPErrors = (error: any): string => {
  if (error.message) return error.message;
  if (error.error?.message) return error.error.message;
  return 'An unknown error occurred';
};

export const isMCPError = (response: MCPResponse): boolean => {
  return !!response.error;
};