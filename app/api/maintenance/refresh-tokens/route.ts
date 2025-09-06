// Maintenance route for refreshing expired OAuth tokens

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refreshAccessToken } from '@/lib/auth';
// Import encryption utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function encrypt(text: string): string {
  const crypto = require('crypto');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const crypto = require('crypto');
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function GET(request: NextRequest) {
  try {
    // Find tokens that will expire in the next hour
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    const expiringTokens = await db.oAuthToken.findMany({
      where: {
        expiresAt: {
          lt: oneHourFromNow,
          gt: new Date() // Not already expired
        }
      },
      include: {
        account: true
      }
    });

    let refreshedCount = 0;
    let failedCount = 0;

    for (const token of expiringTokens) {
      try {
        // Attempt to refresh the token
        const refreshToken = decryptToken(token.refreshToken);
        const newTokens = await refreshAccessToken(refreshToken);

        // Update the token in database
        const encryptedAccessToken = encrypt(newTokens.access_token);
        const encryptedRefreshToken = encrypt(newTokens.refresh_token);
        const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

        await db.oAuthToken.update({
          where: { id: token.id },
          data: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
            updatedAt: new Date()
          }
        });

        refreshedCount++;
      } catch (error) {
        console.error(`Failed to refresh token for account ${token.accountId}:`, error);
        failedCount++;

        // If refresh fails, mark token as expired by setting expiresAt to past
        await db.oAuthToken.update({
          where: { id: token.id },
          data: {
            expiresAt: new Date(Date.now() - 1000), // Set to past
            updatedAt: new Date()
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      refreshed: refreshedCount,
      failed: failedCount,
      total: expiringTokens.length
    });
  } catch (error) {
    console.error('Token refresh maintenance error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh tokens' },
      { status: 500 }
    );
  }
}

// Helper function to decrypt tokens
function decryptToken(encryptedToken: string): string {
  return decrypt(encryptedToken);
}