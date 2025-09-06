// Xero webhook handler with enhanced security and processing

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { errorHandler, ErrorType, ErrorSeverity } from '@/lib/error-handler';
import { monitoring } from '@/lib/monitoring';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.XERO_WEBHOOK_KEY;

// In-memory store for processed events (use Redis in production)
const processedEvents = new Map<string, number>();
const EVENT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let requestId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Extract and validate webhook signature
    const signature = request.headers.get('x-xero-signature');
    if (!signature) {
      await monitoring.logSystemEvent('webhook_no_signature', { requestId }, 'warning');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const isValidSignature = verifyWebhookSignature(body, signature);

    if (!isValidSignature) {
      await monitoring.logSystemEvent('webhook_invalid_signature', { requestId, signature }, 'error');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      const appError = errorHandler.createError(
        ErrorType.VALIDATION,
        'WEBHOOK_INVALID_JSON',
        'Invalid JSON in webhook payload',
        {
          severity: ErrorSeverity.MEDIUM,
          details: { body: body.substring(0, 500) },
          requestId
        }
      );
      return NextResponse.json(
        errorHandler.toHTTPResponse(appError).json,
        { status: appError.statusCode }
      );
    }

    // Validate webhook payload structure
    if (!payload.events || !Array.isArray(payload.events)) {
      const appError = errorHandler.createError(
        ErrorType.VALIDATION,
        'WEBHOOK_INVALID_PAYLOAD',
        'Invalid webhook payload structure',
        {
          severity: ErrorSeverity.MEDIUM,
          details: payload,
          requestId
        }
      );
      return NextResponse.json(
        errorHandler.toHTTPResponse(appError).json,
        { status: appError.statusCode }
      );
    }

    // Process events with idempotency
    const processedEventIds: string[] = [];
    const failedEventIds: string[] = [];

    for (const event of payload.events) {
      try {
        const eventId = `${event.resourceId}_${event.eventType}_${event.eventDateUtc}`;

        // Check for duplicate processing
        if (isEventProcessed(eventId)) {
          await monitoring.logSystemEvent('webhook_duplicate_event', {
            eventId,
            requestId
          }, 'info');
          continue;
        }

        // Process the event
        await processWebhookEvent(event, requestId);

        // Mark as processed
        markEventProcessed(eventId);
        processedEventIds.push(eventId);

      } catch (error) {
        console.error(`Failed to process webhook event:`, error);
        failedEventIds.push(event.eventId || 'unknown');

        await monitoring.logSystemEvent('webhook_event_processing_failed', {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId
        }, 'error');
      }
    }

    // Log successful webhook processing
    await monitoring.logSystemEvent('webhook_processed', {
      requestId,
      totalEvents: payload.events.length,
      processedEvents: processedEventIds.length,
      failedEvents: failedEventIds.length,
      processingTime: Date.now() - startTime
    }, 'info');

    // Return success response
    return NextResponse.json({
      status: 'ok',
      processed: processedEventIds.length,
      failed: failedEventIds.length,
      requestId
    });

  } catch (error) {
    const appError = errorHandler.createError(
      ErrorType.SYSTEM,
      'WEBHOOK_PROCESSING_ERROR',
      'Failed to process webhook',
      {
        severity: ErrorSeverity.HIGH,
        details: error,
        requestId,
        originalError: error instanceof Error ? error : undefined
      }
    );

    await monitoring.logSystemEvent('webhook_processing_error', {
      requestId,
      error: appError.message,
      processingTime: Date.now() - startTime
    }, 'error');

    return NextResponse.json(
      errorHandler.toHTTPResponse(appError).json,
      { status: appError.statusCode }
    );
  }
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error('XERO_WEBHOOK_KEY not configured');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload, 'utf8')
      .digest('base64');

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Check if event has already been processed
function isEventProcessed(eventId: string): boolean {
  const processedAt = processedEvents.get(eventId);
  if (!processedAt) return false;

  // Clean up old entries
  const now = Date.now();
  if (now - processedAt > EVENT_EXPIRY) {
    processedEvents.delete(eventId);
    return false;
  }

  return true;
}

// Mark event as processed
function markEventProcessed(eventId: string): void {
  processedEvents.set(eventId, Date.now());

  // Clean up old entries periodically
  if (processedEvents.size > 1000) {
    const now = Date.now();
    for (const [id, timestamp] of processedEvents.entries()) {
      if (now - timestamp > EVENT_EXPIRY) {
        processedEvents.delete(id);
      }
    }
  }
}

// Process individual webhook event
async function processWebhookEvent(event: any, requestId: string): Promise<void> {
  const {
    resourceId,
    resourceType,
    eventType,
    eventDateUtc,
    tenantId
  } = event;

  // Store webhook event in database
  await db.webhookEvent.create({
    data: {
      eventType,
      resourceId,
      resourceType,
      payload: event,
      tenantId
    }
  });

  // Process based on event type
  switch (eventType) {
    case 'CREATE':
      await handleResourceCreated(resourceType, resourceId, tenantId, requestId);
      break;
    case 'UPDATE':
      await handleResourceUpdated(resourceType, resourceId, tenantId, requestId);
      break;
    case 'DELETE':
      await handleResourceDeleted(resourceType, resourceId, tenantId, requestId);
      break;
    default:
      console.log(`Unhandled event type: ${eventType}`);
  }

  // Log successful event processing
  await monitoring.logSystemEvent('webhook_event_processed', {
    eventType,
    resourceType,
    resourceId,
    tenantId,
    requestId
  }, 'info');
}

// Event handlers for different resource types
async function handleResourceCreated(resourceType: string, resourceId: string, tenantId: string, requestId: string) {
  // Handle resource creation
  console.log(`Resource created: ${resourceType} ${resourceId}`);

  // In a real implementation, you might:
  // - Update local caches
  // - Trigger notifications
  // - Update search indexes
  // - Queue background jobs
}

async function handleResourceUpdated(resourceType: string, resourceId: string, tenantId: string, requestId: string) {
  // Handle resource updates
  console.log(`Resource updated: ${resourceType} ${resourceId}`);

  // In a real implementation, you might:
  // - Invalidate caches
  // - Update local data stores
  // - Trigger sync operations
}

async function handleResourceDeleted(resourceType: string, resourceId: string, tenantId: string, requestId: string) {
  // Handle resource deletion
  console.log(`Resource deleted: ${resourceType} ${resourceId}`);

  // In a real implementation, you might:
  // - Clean up local data
  // - Update references
  // - Trigger cleanup jobs
}

// Health check endpoint for webhooks
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Xero webhook endpoint is active',
    processedEvents: processedEvents.size,
    timestamp: new Date().toISOString()
  });
}