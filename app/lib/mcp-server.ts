import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createXeroTenantClient, getConnectedTenants } from './xero-client';
import { validateMCPSession, createMCPSession } from './auth.js';
import { getRedisClient } from './redis';

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

const ListItemsSchema = z.object({
  tenantId: z.string().optional(),
  where: z.string().optional(),
});

const ListPaymentsSchema = z.object({
  tenantId: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const ListBankTransactionsSchema = z.object({
  tenantId: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const TOOL_DEFINITIONS = [
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

// MCP Server Implementation
class XeroMCPServer {
  private server: Server;

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
        tools: TOOL_DEFINITIONS,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const sessionId = (request as any).sessionId;
        if (!sessionId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Session ID required for tool execution',
              },
            ],
            isError: true,
          };
        }
        switch (name) {
          case 'list-accounts':
            return await this.handleListAccounts(args, sessionId);
          case 'list-contacts':
            return await this.handleListContacts(args, sessionId);
          case 'list-invoices':
            return await this.handleListInvoices(args, sessionId);
          case 'list-items':
            return await this.handleListItems(args, sessionId);
          case 'list-payments':
            return await this.handleListPayments(args, sessionId);
          case 'list-bank-transactions':
            return await this.handleListBankTransactions(args, sessionId);
          case 'create-contact':
            return await this.handleCreateContact(args, sessionId);
          case 'create-invoice':
            return await this.handleCreateInvoice(args, sessionId);
          case 'update-contact':
            return await this.handleUpdateContact(args, sessionId);
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
    const session = await validateMCPSession(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    // Validate tenantId against session tenants if provided
    if (tenantId && session.tenantId && tenantId !== session.tenantId) {
      throw new Error('Tenant ID does not match session');
    }

    const accountId = session.accountId;
    const effectiveTenantId = tenantId || session.tenantId;
    if (!effectiveTenantId) {
      throw new Error('Tenant ID required');
    }

    const client = await createXeroTenantClient(accountId, effectiveTenantId);
    return client;
  }

  private async handleListAccounts(args: any, sessionId: string) {
    const { tenantId } = ListAccountsSchema.parse(args);
    const client = await this.getXeroClient(sessionId, tenantId);

    const accounts = await client.getAccounts() || [];

    return {
      content: [
        {
          type: 'text',
          text: `Found ${accounts.length} accounts`,
        },
        {
          type: 'json',
          json: accounts,
        },
      ],
    };
  }

  private async handleListContacts(args: any, sessionId: string) {
    const { tenantId, where, page = 1, pageSize = 100 } = ListContactsSchema.parse(args);
    const client = await this.getXeroClient(sessionId, tenantId);

    const contacts = await client.getContacts() || [];
    // TODO: Implement server-side filtering and pagination based on where, page, pageSize

    return {
      content: [
        {
          type: 'text',
          text: `Found ${contacts.length} contacts`,
        },
        {
          type: 'json',
          json: contacts,
        },
      ],
    };
  }

  private async handleListInvoices(args: any, sessionId: string) {
    const { tenantId, status, dateFrom, dateTo } = ListInvoicesSchema.parse(args);
    const client = await this.getXeroClient(sessionId, tenantId);

    const invoices = await client.getInvoices() || [];
    // TODO: Implement filtering by status, dateFrom, dateTo

    return {
      content: [
        {
          type: 'text',
          text: `Found ${invoices.length} invoices`,
        },
        {
          type: 'json',
          json: invoices,
        },
      ],
    };
  }

  private async handleListItems(args: any, sessionId: string) {
    const { tenantId, where } = ListItemsSchema.parse(args);
    const client = await this.getXeroClient(sessionId, tenantId);

    const items = await client.getItems() || [];
    let filteredItems = items;
    if (where) {
      // Client-side filtering example; ideally use API params
      filteredItems = items.filter((item: any) => item.name && item.name.toLowerCase().includes(where.toLowerCase()));
    }

    await this.publishEvent(sessionId, { type: 'items_listed', count: filteredItems.length });

    return {
      content: [
        {
          type: 'text',
          text: `Found ${filteredItems.length} items`,
        },
        {
          type: 'json',
          json: filteredItems,
        },
      ],
    };
  }

  private async handleListPayments(args: any, sessionId: string) {
    const { tenantId, status, dateFrom, dateTo } = ListPaymentsSchema.parse(args);
    const client = await this.getXeroClient(sessionId, tenantId);

    const payments = await client.getPayments() || [];
    let filteredPayments = payments;
    if (status) {
      filteredPayments = payments.filter((p: any) => p.status === status);
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : new Date(0);
      const to = dateTo ? new Date(dateTo) : new Date();
      filteredPayments = filteredPayments.filter((p: any) => new Date(p.date) >= from && new Date(p.date) <= to);
    }

    await this.publishEvent(sessionId, { type: 'payments_listed', count: filteredPayments.length });

    return {
      content: [
        {
          type: 'text',
          text: `Found ${filteredPayments.length} payments`,
        },
        {
          type: 'json',
          json: filteredPayments,
        },
      ],
    };
  }

  private async handleListBankTransactions(args: any, sessionId: string) {
    const { tenantId, status, dateFrom, dateTo } = ListBankTransactionsSchema.parse(args);
    const client = await this.getXeroClient(sessionId, tenantId);

    const transactions = await client.getBankTransactions() || [];
    let filteredTransactions = transactions;
    if (status) {
      filteredTransactions = transactions.filter((t: any) => t.status === status);
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : new Date(0);
      const to = dateTo ? new Date(dateTo) : new Date();
      filteredTransactions = filteredTransactions.filter((t: any) => new Date(t.date) >= from && new Date(t.date) <= to);
    }

    await this.publishEvent(sessionId, { type: 'bank_transactions_listed', count: filteredTransactions.length });

    return {
      content: [
        {
          type: 'text',
          text: `Found ${filteredTransactions.length} bank transactions`,
        },
        {
          type: 'json',
          json: filteredTransactions,
        },
      ],
    };
  }

  private async handleCreateContact(args: any, sessionId: string) {
    const validatedArgs = CreateContactSchema.parse(args);
    const client = await this.getXeroClient(sessionId, validatedArgs.tenantId);

    const contactData = {
      Name: validatedArgs.name,
      Type: validatedArgs.contactType,
      EmailAddress: validatedArgs.email,
      Addresses: validatedArgs.addresses || [],
    };

    const result = await client.createContact(contactData) || {};
    await this.publishEvent(sessionId, { type: 'contact_created', data: result });

    return {
      content: [
        {
          type: 'text',
          text: 'Contact created successfully',
        },
        {
          type: 'json',
          json: result,
        },
      ],
    };
  }

  private async handleCreateInvoice(args: any, sessionId: string) {
    const validatedArgs = CreateInvoiceSchema.parse(args);
    const client = await this.getXeroClient(sessionId, validatedArgs.tenantId);

    const invoiceData = {
      Type: validatedArgs.type,
      Contact: {
        ContactID: validatedArgs.contactId,
      },
      Date: validatedArgs.date,
      DueDate: validatedArgs.dueDate,
      LineItems: validatedArgs.lineItems.map((li: any) => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        AccountCode: li.accountCode,
        TaxType: li.taxType || 'NONE',
      })),
      Reference: validatedArgs.reference,
    };

    const result = await client.createInvoice(invoiceData) || {};
    await this.publishEvent(sessionId, { type: 'invoice_created', data: result });

    return {
      content: [
        {
          type: 'text',
          text: 'Invoice created successfully',
        },
        {
          type: 'json',
          json: result,
        },
      ],
    };
  }

  private async handleUpdateContact(args: any, sessionId: string) {
    const validatedArgs = UpdateContactSchema.parse(args);
    const client = await this.getXeroClient(sessionId, validatedArgs.tenantId);

    const updateData = {
      ContactID: validatedArgs.contactId,
      Name: validatedArgs.name,
      EmailAddress: validatedArgs.email,
    };

    const result = await client.updateContact(updateData) || {};
    await this.publishEvent(sessionId, { type: 'contact_updated', data: result });

    return {
      content: [
        {
          type: 'text',
          text: 'Contact updated successfully',
        },
        {
          type: 'json',
          json: result,
        },
      ],
    };
  }

  // Session management
  async createSession(accountId: string, tenantId?: string) {
    const session = await createMCPSession(accountId, tenantId);
    return session.sessionId;
  }

  getServer() {
    return this.server;
  }

  // Publish events to Redis for SSE broadcasting
  async publishEvent(sessionId: string, event: any) {
    try {
      const redis = await getRedisClient();
      const eventData = {
        ...event,
        timestamp: new Date().toISOString(),
        sessionId
      };

      await redis.publish(`mcp:events:${sessionId}`, JSON.stringify(eventData));
    } catch (error) {
      console.error('Failed to publish MCP event:', error);
    }
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
    const tools = TOOL_DEFINITIONS;

    return {
      jsonrpc: '2.0',
      result: { tools },
      id: request.id
    };
  }

  private async handleCallTool(request: any) {
    const { name, arguments: args } = request.params;

    try {
      const sessionId = request.sessionId as string;
      if (!sessionId) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Session ID required'
          },
          id: request.id
        };
      }
      switch (name) {
        case 'list-accounts':
          return await this.handleListAccounts(args, sessionId);
        case 'list-contacts':
          return await this.handleListContacts(args, sessionId);
        case 'list-invoices':
          return await this.handleListInvoices(args, sessionId);
        case 'list-items':
          return await this.handleListItems(args, sessionId);
        case 'list-payments':
          return await this.handleListPayments(args, sessionId);
        case 'list-bank-transactions':
          return await this.handleListBankTransactions(args, sessionId);
        case 'create-contact':
          return await this.handleCreateContact(args, sessionId);
        case 'create-invoice':
          return await this.handleCreateInvoice(args, sessionId);
        case 'update-contact':
          return await this.handleUpdateContact(args, sessionId);
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