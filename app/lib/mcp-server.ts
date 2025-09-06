// MCP server configuration

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createXeroTenantClient, getConnectedTenants } from './xero-client';
import { validateMCPSession } from './auth.js';

// Tool schemas
const ListAccountsSchema = z.object({
  tenantId: z.string().optional(),
  where: z.string().optional(),
  orderBy: z.string().optional(),
});

const ListContactsSchema = z.object({
  tenantId: z.string().optional(),
  where: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

const ListInvoicesSchema = z.object({
  tenantId: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

const CreateContactSchema = z.object({
  tenantId: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  contactType: z.enum(['CUSTOMER', 'SUPPLIER']),
  addresses: z.array(z.object({
    addressType: z.string(),
    addressLine1: z.string(),
    city: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
});

const CreateInvoiceSchema = z.object({
  tenantId: z.string(),
  type: z.enum(['ACCREC', 'ACCPAY']),
  contactId: z.string(),
  date: z.string(),
  dueDate: z.string(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitAmount: z.number(),
    accountCode: z.string(),
    taxType: z.string().optional(),
  })),
  reference: z.string().optional(),
});

const UpdateContactSchema = z.object({
  tenantId: z.string(),
  contactId: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

// MCP Server Implementation
class XeroMCPServer {
  private server: Server;
  private sessions: Map<string, { accountId: string; tenantId?: string; expiresAt: Date }> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'xero-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // List Tools
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
            name: 'list-invoices',
            description: 'List sales invoices with status and date filters',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string', description: 'Specific tenant ID' },
                status: { type: 'string', description: 'Invoice status filter' },
                dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
                page: { type: 'number', description: 'Page number' },
                pageSize: { type: 'number', description: 'Items per page' },
              },
            },
          },
          {
            name: 'list-items',
            description: 'List inventory items with categorization',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string', description: 'Specific tenant ID' },
                where: { type: 'string', description: 'Filter conditions' },
              },
            },
          },
          {
            name: 'list-payments',
            description: 'List payment records with reconciliation status',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string', description: 'Specific tenant ID' },
                status: { type: 'string', description: 'Payment status' },
                dateFrom: { type: 'string', description: 'Start date' },
                dateTo: { type: 'string', description: 'End date' },
              },
            },
          },
          {
            name: 'list-bank-transactions',
            description: 'List bank transactions with matching capabilities',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string', description: 'Specific tenant ID' },
                status: { type: 'string', description: 'Transaction status' },
                dateFrom: { type: 'string', description: 'Start date' },
                dateTo: { type: 'string', description: 'End date' },
              },
            },
          },
          // Create Tools
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
                addresses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      addressType: { type: 'string' },
                      addressLine1: { type: 'string' },
                      city: { type: 'string' },
                      region: { type: 'string' },
                      postalCode: { type: 'string' },
                      country: { type: 'string' },
                    },
                  },
                },
              },
              required: ['tenantId', 'name', 'contactType'],
            },
          },
          {
            name: 'create-invoice',
            description: 'Create a new sales or purchase invoice',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string', description: 'Tenant ID' },
                type: { type: 'string', enum: ['ACCREC', 'ACCPAY'] },
                contactId: { type: 'string', description: 'Contact ID' },
                date: { type: 'string', description: 'Invoice date' },
                dueDate: { type: 'string', description: 'Due date' },
                lineItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      quantity: { type: 'number' },
                      unitAmount: { type: 'number' },
                      accountCode: { type: 'string' },
                      taxType: { type: 'string' },
                    },
                  },
                },
                reference: { type: 'string', description: 'Invoice reference' },
              },
              required: ['tenantId', 'type', 'contactId', 'date', 'dueDate', 'lineItems'],
            },
          },
          // Update Tools
          {
            name: 'update-contact',
            description: 'Update an existing contact',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string', description: 'Tenant ID' },
                contactId: { type: 'string', description: 'Contact ID to update' },
                name: { type: 'string', description: 'New contact name' },
                email: { type: 'string', description: 'New contact email' },
              },
              required: ['tenantId', 'contactId'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list-accounts':
            return await this.handleListAccounts(args);
          case 'list-contacts':
            return await this.handleListContacts(args);
          case 'list-invoices':
            return await this.handleListInvoices(args);
          case 'list-items':
            return await this.handleListItems(args);
          case 'list-payments':
            return await this.handleListPayments(args);
          case 'list-bank-transactions':
            return await this.handleListBankTransactions(args);
          case 'create-contact':
            return await this.handleCreateContact(args);
          case 'create-invoice':
            return await this.handleCreateInvoice(args);
          case 'update-contact':
            return await this.handleUpdateContact(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async getXeroClient(sessionId: string, tenantId?: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    const client = await createXeroTenantClient(session.accountId, tenantId || session.tenantId!);
    return client;
  }

  private async handleListAccounts(request: any) {
    const args = request.params.arguments || {};
    const { tenantId } = ListAccountsSchema.parse(args);
    const client = await this.getXeroClient(request.sessionId, tenantId);

    const accounts = await client.getAccounts();

    return {
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `Found ${accounts?.length || 0} accounts`,
          },
          {
            type: 'json',
            json: accounts || [],
          },
        ],
      },
      id: request.id
    };
  }

  private async handleListContacts(request: any) {
    const args = request.params.arguments || {};
    const { tenantId, where, page = 1, pageSize = 100 } = ListContactsSchema.parse(args);
    const client = await this.getXeroClient(request.sessionId, tenantId);

    const contacts = await client.getContacts();

    return {
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `Found ${contacts?.length || 0} contacts`,
          },
          {
            type: 'json',
            json: contacts || [],
          },
        ],
      },
      id: request.id
    };
  }

  private async handleListInvoices(request: any) {
    const args = request.params.arguments || {};
    const { tenantId, status, dateFrom, dateTo } = ListInvoicesSchema.parse(args);
    const client = await this.getXeroClient(request.sessionId, tenantId);

    const invoices = await client.getInvoices();

    return {
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `Found ${invoices?.length || 0} invoices`,
          },
          {
            type: 'json',
            json: invoices || [],
          },
        ],
      },
      id: request.id
    };
  }

  private async handleListItems(args: any) {
    const { tenantId } = args;
    const client = await this.getXeroClient(args.sessionId, tenantId);

    // Note: Xero API doesn't have a direct items endpoint, this would need to be implemented
    // based on your specific requirements
    return {
      content: [
        {
          type: 'text',
          text: 'Items listing not yet implemented',
        },
      ],
    };
  }

  private async handleListPayments(args: any) {
    const { tenantId } = args;
    const client = await this.getXeroClient(args.sessionId, tenantId);

    // Note: This would need to be implemented based on Xero's payment endpoints
    return {
      content: [
        {
          type: 'text',
          text: 'Payments listing not yet implemented',
        },
      ],
    };
  }

  private async handleListBankTransactions(args: any) {
    const { tenantId } = args;
    const client = await this.getXeroClient(args.sessionId, tenantId);

    // Note: This would need to be implemented based on Xero's bank transaction endpoints
    return {
      content: [
        {
          type: 'text',
          text: 'Bank transactions listing not yet implemented',
        },
      ],
    };
  }

  private async handleCreateContact(request: any) {
    const args = request.params.arguments || {};
    const validatedArgs = CreateContactSchema.parse(args);
    const client = await this.getXeroClient(request.sessionId, validatedArgs.tenantId);

    // Note: This would need to be implemented using Xero's create contact API
    return {
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: 'Contact creation not yet implemented',
          },
        ],
      },
      id: request.id
    };
  }

  private async handleCreateInvoice(request: any) {
    const args = request.params.arguments || {};
    const validatedArgs = CreateInvoiceSchema.parse(args);
    const client = await this.getXeroClient(request.sessionId, validatedArgs.tenantId);

    // Note: This would need to be implemented using Xero's create invoice API
    return {
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: 'Invoice creation not yet implemented',
          },
        ],
      },
      id: request.id
    };
  }

  private async handleUpdateContact(request: any) {
    const args = request.params.arguments || {};
    const validatedArgs = UpdateContactSchema.parse(args);
    const client = await this.getXeroClient(request.sessionId, validatedArgs.tenantId);

    // Note: This would need to be implemented using Xero's update contact API
    return {
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: 'Contact update not yet implemented',
          },
        ],
      },
      id: request.id
    };
  }

  // Session management
  createSession(accountId: string, tenantId?: string) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    this.sessions.set(sessionId, { accountId, tenantId, expiresAt });
    return sessionId;
  }

  validateSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    return session;
  }

  getServer() {
    return this.server;
  }

  async processRequest(request: any, sessionId: string) {
    // Add session ID to request for tool handlers
    const enrichedRequest = { ...request, sessionId };

    try {
      switch (enrichedRequest.method) {
        case 'tools/list':
          return await this.handleListTools(enrichedRequest);
        case 'tools/call':
          return await this.handleCallTool(enrichedRequest);
        case 'initialize':
          return {
            jsonrpc: '2.0',
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {
                  listChanged: true
                }
              },
              serverInfo: {
                name: 'xero-mcp-server',
                version: '1.0.0'
              }
            },
            id: enrichedRequest.id
          };
        default:
          return {
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Method not found: ${enrichedRequest.method}`
            },
            id: enrichedRequest.id
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        },
        id: enrichedRequest.id
      };
    }
  }

  private async handleListTools(request: any) {
    const tools = [
      // List Tools
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
        name: 'list-invoices',
        description: 'List sales invoices with status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', description: 'Specific tenant ID' },
            status: { type: 'string', description: 'Invoice status filter' },
            dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            page: { type: 'number', description: 'Page number' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      // Create Tools
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
      {
        name: 'create-invoice',
        description: 'Create a new sales or purchase invoice',
        inputSchema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', description: 'Tenant ID' },
            type: { type: 'string', enum: ['ACCREC', 'ACCPAY'] },
            contactId: { type: 'string', description: 'Contact ID' },
            date: { type: 'string', description: 'Invoice date' },
            dueDate: { type: 'string', description: 'Due date' },
            lineItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitAmount: { type: 'number' },
                  accountCode: { type: 'string' },
                  taxType: { type: 'string' },
                },
              },
            },
          },
          required: ['tenantId', 'type', 'contactId', 'date', 'dueDate', 'lineItems'],
        },
      },
      // Update Tools
      {
        name: 'update-contact',
        description: 'Update an existing contact',
        inputSchema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', description: 'Tenant ID' },
            contactId: { type: 'string', description: 'Contact ID to update' },
            name: { type: 'string', description: 'New contact name' },
            email: { type: 'string', description: 'New contact email' },
          },
          required: ['tenantId', 'contactId'],
        },
      },
    ];

    return {
      jsonrpc: '2.0',
      result: { tools },
      id: request.id
    };
  }

  private async handleCallTool(request: any) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list-accounts':
          return await this.handleListAccounts({ ...request, params: { arguments: args } });
        case 'list-contacts':
          return await this.handleListContacts({ ...request, params: { arguments: args } });
        case 'list-invoices':
          return await this.handleListInvoices({ ...request, params: { arguments: args } });
        case 'create-contact':
          return await this.handleCreateContact({ ...request, params: { arguments: args } });
        case 'create-invoice':
          return await this.handleCreateInvoice({ ...request, params: { arguments: args } });
        case 'update-contact':
          return await this.handleUpdateContact({ ...request, params: { arguments: args } });
        default:
          return {
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Tool not found: ${name}`
            },
            id: request.id
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Tool execution failed',
          data: error instanceof Error ? error.message : 'Unknown error'
        },
        id: request.id
      };
    }
  }
}

// Export singleton instance
export const mcpServer = new XeroMCPServer();