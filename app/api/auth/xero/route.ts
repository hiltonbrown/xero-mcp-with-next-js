// Xero auth initiation

import { generateOAuthState, storeOAuthState, getXeroAuthUrl, generatePKCEChallenge } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get('accountId');

    if (!accountId) {
      return new Response(JSON.stringify({ error: 'Account ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify account exists
    const account = await db.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate OAuth state and PKCE challenge
    const state = generateOAuthState();
    const { verifier, challenge } = generatePKCEChallenge();

    // Store state and PKCE verifier (you might want to store verifier in session/cache)
    await storeOAuthState(state, accountId);

    // For demo purposes, we'll store verifier in a simple in-memory store
    // In production, use Redis or similar
    (globalThis as any).pkceStore = (globalThis as any).pkceStore || new Map();
    (globalThis as any).pkceStore.set(state, verifier);

    // Generate Xero authorization URL
    const authUrl = getXeroAuthUrl(state, challenge);

    // Redirect to Xero
    return Response.redirect(authUrl, 302);

  } catch (error) {
    console.error('OAuth initiation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}