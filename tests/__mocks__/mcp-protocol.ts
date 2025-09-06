// Mock data for MCP protocol messages

export const mockMCPListToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {},
}

export const mockMCPListToolsResponse = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    tools: [
      {
        name: 'list-accounts',
        description: 'List chart of accounts with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', description: 'Specific tenant ID' },
            where: { type: 'string', description: 'Filter conditions' },
            orderBy: { type: 'string', description: 'Sort order' },
          },
        },
      },
      {
        name: 'list-contacts',
        description: 'List customer/supplier contacts with search capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', description: 'Specific tenant ID' },
            where: { type: 'string', description: 'Search/filter conditions' },
            page: { type: 'number', description: 'Page number' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'create-contact',
        description: 'Create a new customer or supplier contact',
        inputSchema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', description: 'Tenant ID' },
            name: { type: 'string', description: 'Contact name' },
            email: { type: 'string', description: 'Contact email' },
            contactType: { type: 'string', enum: ['CUSTOMER', 'SUPPLIER'] },
          },
          required: ['tenantId', 'name', 'contactType'],
        },
      },
    ],
  },
}

export const mockMCPCallToolRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'list-accounts',
    arguments: {
      tenantId: 'test-tenant-id',
    },
  },
}

export const mockMCPCallToolResponse = {
  jsonrpc: '2.0',
  id: 2,
  result: {
    content: [
      {
        type: 'text',
        text: 'Found 1 account',
      },
      {
        type: 'json',
        json: [
          {
            AccountID: 'test-account-id',
            Code: '100',
            Name: 'Test Account',
            Type: 'REVENUE',
            Status: 'ACTIVE',
          },
        ],
      },
    ],
  },
}

export const mockMCPErrorResponse = {
  jsonrpc: '2.0',
  error: {
    code: -32601,
    message: 'Method not found',
    data: {
      type: 'VALIDATION',
      retryable: false,
    },
  },
  id: 3,
}

export const mockMCPInvalidRequest = {
  jsonrpc: '2.0',
  id: 4,
  method: 'invalid-method',
  params: {},
}

export const mockMCPMalformedRequest = {
  jsonrpc: '2.0',
  id: 5,
  // Missing method
  params: {},
}

// Mock session data
export const mockMCPSession = {
  id: 'test-session-id',
  sessionId: 'session_12345',
  accountId: 'test-account-id',
  tenantId: 'test-tenant-id',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock database records
export const mockAccount = {
  id: 'test-account-id',
  email: 'test@example.com',
  name: 'Test User',
  oauthState: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockXeroConnection = {
  id: 'test-connection-id',
  tenantId: 'test-tenant-id',
  tenantName: 'Test Company',
  tenantType: 'ORGANISATION',
  accountId: 'test-account-id',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockOAuthToken = {
  id: 'test-token-id',
  accessToken: 'encrypted-access-token',
  refreshToken: 'encrypted-refresh-token',
  expiresAt: new Date(Date.now() + 1800 * 1000), // 30 minutes from now
  tokenType: 'Bearer',
  scope: 'openid profile email accounting.transactions',
  accountId: 'test-account-id',
  tenantId: 'test-tenant-id',
  createdAt: new Date(),
  updatedAt: new Date(),
}