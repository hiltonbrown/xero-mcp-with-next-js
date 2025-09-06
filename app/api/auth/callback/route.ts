// OAuth callback

import { validateOAuthState, exchangeCodeForTokens, createMCPSession } from '@/lib/auth';
import { storeTokens, storeXeroConnection, createXeroClient } from '@/lib/xero-client';
import { db } from '@/lib/db';
import { getCache, deleteCache, cacheKeys } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return Response.redirect(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=${error}`, 302);
    }

    if (!code || !state) {
      return Response.redirect(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=missing_params`, 302);
    }

    // Validate OAuth state
    const account = await validateOAuthState(state);
    if (!account) {
      return Response.redirect(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=invalid_state`, 302);
    }

    // Get PKCE verifier from cache
    const verifier = await getCache<string>(cacheKeys.pkce(state));

    if (!verifier) {
      return Response.redirect(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=missing_verifier`, 302);
    }

    // Clean up PKCE verifier from cache
    await deleteCache(cacheKeys.pkce(state));

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, verifier);

    // Store tokens in database
    await storeTokens(account.id, tokens);

    // Initialize Xero client to get tenant information
    const xeroClient = createXeroClient();
    await xeroClient.setTokenSet(tokens);
    await xeroClient.updateTenants();

    const tenants = xeroClient.tenants;

    // Store tenant connections
    for (const tenant of tenants) {
      await storeXeroConnection(account.id, tenant);
      // Store tokens for each tenant
      await storeTokens(account.id, tokens, tenant.tenantId);
    }

    // Create MCP session for the authenticated user
    const session = await createMCPSession(account.id);

    // Redirect back to the application with success
    const redirectUrl = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('sessionId', session.sessionId);
    redirectUrl.searchParams.set('tenantCount', tenants.length.toString());

    return Response.redirect(redirectUrl.toString(), 302);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?error=callback_error`, 302);
  }
}