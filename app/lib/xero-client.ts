// Xero API client setup

import { XeroClient } from 'xero-node';
import { db } from './db';
import { refreshAccessToken } from './auth';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Custom error class for token refresh failures
export class TokenRefreshError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'TokenRefreshError';
  }
}

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID!;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET!;

// Secure encryption key handling - fail fast in production
let ENCRYPTION_KEY: string;
if (process.env.ENCRYPTION_KEY) {
  ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
} else {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }
  console.warn('⚠️ Using insecure default encryption key for development only');
  ENCRYPTION_KEY = randomBytes(32).toString('hex');
}

// Encryption utilities for sensitive data
function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Initialize Xero client with proper scopes
export function createXeroClient() {
  return new XeroClient({
    clientId: XERO_CLIENT_ID,
    clientSecret: XERO_CLIENT_SECRET,
    grantType: 'authorization_code',
    scopes: [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.contacts',
      'accounting.settings'
    ]
  });
}

// Token management functions
export async function storeTokens(accountId: string, tokens: any, tenantId?: string) {
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = encrypt(tokens.refresh_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db.oAuthToken.create({
    data: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      accountId,
      tenantId
    }
  });
}

export async function getValidTokens(accountId: string, tenantId?: string) {
  const tokenRecord = await db.oAuthToken.findFirst({
    where: {
      accountId,
      tenantId,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!tokenRecord) {
    return null;
  }

  let accessToken = decrypt(tokenRecord.accessToken);

  // Check if token is expired or will expire soon (within 5 minutes)
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (tokenRecord.expiresAt <= fiveMinutesFromNow) {
    try {
      const refreshToken = decrypt(tokenRecord.refreshToken);
      const newTokens = await refreshAccessToken(refreshToken);

      // Update stored tokens
      const encryptedAccessToken = encrypt(newTokens.access_token);
      const encryptedRefreshToken = encrypt(newTokens.refresh_token);
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      await db.oAuthToken.update({
        where: { id: tokenRecord.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt
        }
      });

      accessToken = newTokens.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);

      // Mark token as invalid in database to prevent further attempts
      await db.oAuthToken.update({
        where: { id: tokenRecord.id },
        data: { expiresAt: new Date(0) } // Mark as expired
      });

      // Throw proper error instead of silent failure
      throw new TokenRefreshError('Failed to refresh Xero token', error);
    }
  }

  return {
    access_token: accessToken,
    token_type: tokenRecord.tokenType,
    scope: tokenRecord.scope
  };
}

// Multi-tenant Xero client
export class XeroTenantClient {
  private client: XeroClient;
  private accountId: string;
  private tenantId: string;

  constructor(accountId: string, tenantId: string) {
    this.client = createXeroClient();
    this.accountId = accountId;
    this.tenantId = tenantId;
  }

  async initialize() {
    try {
      const tokens = await getValidTokens(this.accountId, this.tenantId);
      if (!tokens) {
        throw new Error('No valid tokens found for tenant');
      }

      await this.client.setTokenSet(tokens);
      await this.client.updateTenants();
    } catch (error) {
      if (error instanceof TokenRefreshError) {
        // Re-throw token refresh errors with context
        throw new Error(`Token refresh failed for tenant ${this.tenantId}: ${error.message}`);
      }
      throw error;
    }
  }

  async getInvoices() {
    try {
      const response = await this.client.accountingApi.getInvoices(this.tenantId);
      return response.body.invoices;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  async getContacts() {
    try {
      const response = await this.client.accountingApi.getContacts(this.tenantId);
      return response.body.contacts;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  async getAccounts() {
    try {
      const response = await this.client.accountingApi.getAccounts(this.tenantId);
      return response.body.accounts;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  // Add more Xero API methods as needed
}

// Factory function to create tenant-specific client
export async function createXeroTenantClient(accountId: string, tenantId: string) {
  const client = new XeroTenantClient(accountId, tenantId);
  await client.initialize();
  return client;
}

// Store Xero tenant connections
export async function storeXeroConnection(accountId: string, tenant: any) {
  await db.xeroConnection.upsert({
    where: { tenantId: tenant.tenantId },
    update: {
      tenantName: tenant.tenantName,
      tenantType: tenant.tenantType
    },
    create: {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      tenantType: tenant.tenantType,
      accountId
    }
  });
}

// Get all connected tenants for an account
export async function getConnectedTenants(accountId: string) {
  return await db.xeroConnection.findMany({
    where: { accountId },
    include: {
      oauthTokens: {
        where: {
          expiresAt: {
            gt: new Date()
          }
        }
      }
    }
  });
}