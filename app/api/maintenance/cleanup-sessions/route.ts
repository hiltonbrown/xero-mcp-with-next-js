// Maintenance route for cleaning up expired MCP sessions

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Clean up expired MCP sessions
    const expiredSessions = await db.mCPSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    // Clean up old OAuth states (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const expiredStates = await db.account.updateMany({
      where: {
        oauthState: {
          not: null
        },
        updatedAt: {
          lt: oneHourAgo
        }
      },
      data: {
        oauthState: null
      }
    });

    return NextResponse.json({
      success: true,
      cleaned: {
        sessions: expiredSessions.count,
        oauthStates: expiredStates.count
      }
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions' },
      { status: 500 }
    );
  }
}