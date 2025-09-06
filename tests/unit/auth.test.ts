import { generateJWT, verifyJWT, generateOAuthState, validateOAuthState, createMCPSession, validateMCPSession } from '@/lib/auth';
jest.mock('../../lib/db', () => ({
  db: {
    account: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    oAuthState: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    mCPSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Import the mocked db
const { db } = require('../../lib/db');

describe('Authentication Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Functions', () => {
    it('should generate a valid JWT token', async () => {
      const payload = { userId: 'test-user', sessionId: 'test-session' };
      const token = await generateJWT(payload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify a valid JWT token', async () => {
      const payload = { userId: 'test-user', sessionId: 'test-session' };
      const token = await generateJWT(payload);

      const verified = await verifyJWT(token);
      expect(verified).toBeTruthy();
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.sessionId).toBe(payload.sessionId);
    });

    it('should return null for invalid JWT token', async () => {
      const invalidToken = 'invalid.jwt.token';
      const verified = await verifyJWT(invalidToken);
      expect(verified).toBeNull();
    });

    it('should return null for expired JWT token', async () => {
      const payload = { userId: 'test-user' };
      const token = await generateJWT(payload, '1ms'); // Very short expiry

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const verified = await verifyJWT(token);
      expect(verified).toBeNull();
    });
  });

  describe('OAuth State Functions', () => {
    it('should generate a valid OAuth state', () => {
      const state = generateOAuthState();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('should validate a correct OAuth state', async () => {
      const mockAccount = {
        id: 'test-account-id',
        email: 'test@example.com',
      };
      const mockOAuthState = {
        id: 'test-state-id',
        state: 'test-state',
        account: mockAccount,
        expiresAt: new Date(Date.now() + 60000),
      };

      (db.oAuthState.findUnique as jest.Mock).mockResolvedValue(mockOAuthState);
      (db.oAuthState.delete as jest.Mock).mockResolvedValue(mockOAuthState);

      const account = await validateOAuthState('test-state');

      expect(account).toBeTruthy();
      expect(account?.id).toBe('test-account-id');
      expect(db.oAuthState.findUnique).toHaveBeenCalledWith({
        where: { state: 'test-state' },
        include: { account: true }
      });
      expect(db.oAuthState.delete).toHaveBeenCalledWith({
        where: { id: mockOAuthState.id }
      });
    });

    it('should return null for invalid OAuth state', async () => {
      (db.oAuthState.findUnique as jest.Mock).mockResolvedValue(null);

      const account = await validateOAuthState('invalid-state');

      expect(account).toBeNull();
      expect(db.oAuthState.findUnique).toHaveBeenCalledWith({
        where: { state: 'invalid-state' },
        include: { account: true }
      });
    });
  });

  describe('MCP Session Functions', () => {
    it('should create MCP session', async () => {
      const mockSession = { 
        sessionId: 'test-session-id', 
        accountId: 'test-account', 
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 24*60*60*1000)
      };
      (db.mCPSession.create as jest.Mock).mockResolvedValue(mockSession);
      const session = await createMCPSession('test-account', 'test-tenant');
      expect(session.sessionId).toBe('test-session-id');
      expect(db.mCPSession.create).toHaveBeenCalledWith({
        data: {
          sessionId: expect.any(String),
          accountId: 'test-account',
          tenantId: 'test-tenant',
          expiresAt: expect.any(Date)
        }
      });
    });

    it('should validate valid MCP session', async () => {
      const mockSession = { 
        sessionId: 'valid-session',
        accountId: 'test-account',
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 24*60*60*1000)
      };
      (db.mCPSession.findUnique as jest.Mock).mockResolvedValue(mockSession);
      const session = await validateMCPSession('valid-session');
      expect(session).toBeTruthy();
      expect(session!.accountId).toBe('test-account');
      expect(db.mCPSession.findUnique).toHaveBeenCalledWith({
        where: { sessionId: 'valid-session' },
        include: { account: true }
      });
    });

    it('should invalidate expired MCP session', async () => {
      const mockExpiredSession = { 
        sessionId: 'expired-session',
        expiresAt: new Date(0)
      };
      (db.mCPSession.findUnique as jest.Mock).mockResolvedValue(mockExpiredSession);
      const session = await validateMCPSession('expired-session');
      expect(session).toBeNull();
      expect(db.mCPSession.findUnique).toHaveBeenCalledWith({
        where: { sessionId: 'expired-session' },
        include: { account: true }
      });
    });
  });
});