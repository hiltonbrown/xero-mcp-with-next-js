// Unit tests for authentication utilities

import { generateJWT, verifyJWT, generateOAuthState, validateOAuthState } from '@/lib/auth';
jest.mock('../../lib/db', () => ({
  db: {
    account: {
      findFirst: jest.fn(),
      update: jest.fn(),
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
        oauthState: 'test-state',
      };

      (db.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (db.account.update as jest.Mock).mockResolvedValue(mockAccount);

      const account = await validateOAuthState('test-state');

      expect(account).toBeTruthy();
      expect(account?.id).toBe('test-account-id');
      expect(db.account.findFirst).toHaveBeenCalledWith({
        where: { oauthState: 'test-state' }
      });
      expect(db.account.update).toHaveBeenCalledWith({
        where: { id: 'test-account-id' },
        data: { oauthState: null }
      });
    });

    it('should return null for invalid OAuth state', async () => {
      (db.account.findFirst as jest.Mock).mockResolvedValue(null);

      const account = await validateOAuthState('invalid-state');

      expect(account).toBeNull();
      expect(db.account.findFirst).toHaveBeenCalledWith({
        where: { oauthState: 'invalid-state' }
      });
    });
  });
});