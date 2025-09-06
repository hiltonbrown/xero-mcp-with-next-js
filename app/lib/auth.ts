// Authentication utilities

import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, createHash } from 'crypto';
import { db } from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID!;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET!;
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI!;

// JWT token functions
export async function generateJWT(payload: any, expiresIn: string = '1h') {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);

  return jwt;
}

export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// OAuth state parameter functions
export function generateOAuthState() {
  return randomBytes(32).toString('hex');
}

export async function storeOAuthState(state: string, accountId?: string) {
  // Create new state record
  await db.oAuthState.create({
    data: {
      state,
      accountId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    }
  });
}

export async function validateOAuthState(state: string) {
  const oauthState = await db.oAuthState.findUnique({
    where: { state },
    include: { account: true }
  });

  if (oauthState && oauthState.expiresAt > new Date()) {
    // Delete the state after use
    await db.oAuthState.delete({
      where: { id: oauthState.id }
    });
    return oauthState.account;
  }

  return null;
}

// PKCE functions
export function generatePKCEChallenge() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

// Xero OAuth 2.0 flow
export function getXeroAuthUrl(state: string, challenge: string) {
  const scopes = [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XERO_CLIENT_ID,
    redirect_uri: XERO_REDIRECT_URI,
    scope: scopes,
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  return `https://login.xero.com/identity/connect/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string, verifier: string) {
  const tokenUrl = 'https://identity.xero.com/connect/token';

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: XERO_REDIRECT_URI,
    code_verifier: verifier,
    client_id: XERO_CLIENT_ID,
    client_secret: XERO_CLIENT_SECRET
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const tokenUrl = 'https://identity.xero.com/connect/token';

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: XERO_CLIENT_ID,
    client_secret: XERO_CLIENT_SECRET
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  return await response.json();
}

// Session management for MCP connections
export async function createMCPSession(accountId: string, tenantId?: string) {
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const session = await db.mCPSession.create({
    data: {
      sessionId,
      accountId,
      tenantId,
      expiresAt
    }
  });

  return session;
}

export async function validateMCPSession(sessionId: string) {
  const session = await db.mCPSession.findUnique({
    where: { sessionId },
    include: { account: true }
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function revokeMCPSession(sessionId: string) {
  await db.mCPSession.delete({
    where: { sessionId }
  });
}