# Vercel Deployment Guide for Xero MCP Server

## 🚀 Deployment Checklist

### Pre-Deployment Setup
- [ ] Clone the repository
- [ ] Install dependencies: `pnpm install`
- [ ] Set up environment variables (see `.env.example`)
- [ ] Configure Xero OAuth application
- [ ] Set up Vercel Postgres database
- [ ] Run database migrations: `pnpm db:push`
- [ ] Seed database (optional): `pnpm db:seed`

### Environment Variables
Ensure all required environment variables are set in Vercel:

#### Required Variables
- `POSTGRES_URL` - Vercel Postgres connection string
- `POSTGRES_PRISMA_URL` - Prisma connection string
- `POSTGRES_URL_NON_POOLING` - Non-pooled connection string
- `XERO_CLIENT_ID` - Xero OAuth client ID
- `XERO_CLIENT_SECRET` - Xero OAuth client secret
- `XERO_REDIRECT_URI` - OAuth callback URL
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - 32-character encryption key

#### Optional Variables
- `XERO_WEBHOOK_KEY` - Webhook verification key
- `MCP_DEBUG` - Enable debug logging
- `LOG_LEVEL` - Logging level (info, debug, error)
- `SENTRY_DSN` - Error monitoring
- `VERCEL_ANALYTICS_ID` - Vercel Analytics

### Vercel Configuration
- [ ] Project linked to GitHub repository
- [ ] Build command: `pnpm run vercel:build`
- [ ] Install command: `pnpm install`
- [ ] Node.js version: 18.x or later
- [ ] Environment variables configured
- [ ] Domain configured (optional)

### Database Setup
- [ ] Vercel Postgres database created
- [ ] Connection strings configured
- [ ] Database schema deployed
- [ ] Initial data seeded (if needed)

### Xero Configuration
- [ ] Xero OAuth application created
- [ ] Redirect URI configured: `https://your-domain.vercel.app/api/auth/callback`
- [ ] Required scopes enabled:
  - `openid`
  - `profile`
  - `email`
  - `accounting.transactions`
  - `accounting.contacts`
  - `accounting.settings`

## 🔧 Post-Deployment Configuration

### 1. Update Environment Variables
```bash
# In Vercel dashboard, go to Project Settings > Environment Variables
XERO_REDIRECT_URI=https://your-deployment-url.vercel.app/api/auth/callback
NEXTAUTH_URL=https://your-deployment-url.vercel.app
```

### 2. Database Migration
```bash
# Run these commands in your local environment
pnpm db:push
pnpm db:seed
```

### 3. Test OAuth Flow
1. Visit your deployed application
2. Click "Connect to Xero"
3. Complete OAuth authorization
4. Verify connection status

### 4. Test MCP Tools
1. Access the MCP tools interface
2. Execute a simple tool (e.g., list-accounts)
3. Verify tool execution and results

## 🐛 Troubleshooting Guide

### Common Issues

#### 1. Build Failures
**Error:** `Module not found: Can't resolve '@prisma/client'`

**Solution:**
```bash
# Ensure Prisma client is generated
pnpm db:generate

# Check if @prisma/client is in dependencies
pnpm list @prisma/client
```

#### 2. Database Connection Issues
**Error:** `Can't reach database server`

**Solution:**
- Verify Vercel Postgres connection strings
- Check database firewall settings
- Ensure database is not paused
- Verify connection pooling settings

#### 3. OAuth Redirect Issues
**Error:** `Invalid redirect URI`

**Solution:**
- Update Xero OAuth application with correct redirect URI
- Ensure `XERO_REDIRECT_URI` matches Vercel domain
- Check for HTTPS vs HTTP mismatch

#### 4. MCP Tool Execution Failures
**Error:** `Session expired` or `Invalid session`

**Solution:**
- Clear browser localStorage
- Re-authenticate with Xero
- Check session timeout settings
- Verify JWT token validity

#### 5. Environment Variable Issues
**Error:** `Environment variable not found`

**Solution:**
- Check Vercel environment variable names (case-sensitive)
- Ensure variables are set for correct environment (Production/Preview)
- Redeploy after adding new variables

### Debug Commands

#### Check Database Connection
```bash
# Test database connection
pnpm db:studio
```

#### Check Environment Variables
```bash
# In Vercel dashboard or locally
echo $DATABASE_URL
echo $XERO_CLIENT_ID
```

#### Check Build Logs
```bash
# In Vercel dashboard, check deployment logs
# Look for Prisma generation and build errors
```

#### Test MCP Server
```bash
# Test MCP server locally
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
```

### Performance Optimization

#### 1. Database Connection Pooling
- Use `POSTGRES_URL` for pooled connections
- Use `POSTGRES_URL_NON_POOLING` for migrations

#### 2. Function Timeouts
- MCP routes: 300 seconds (5 minutes)
- Auth routes: 60 seconds
- Webhook routes: 30 seconds

#### 3. Caching Strategy
- Implement Redis for session storage (optional)
- Cache Xero API responses where appropriate
- Use Vercel's edge network for global distribution

### Monitoring & Maintenance

#### 1. Scheduled Tasks
- Session cleanup: Daily at 2 AM
- Token refresh: Every 6 hours
- Database maintenance: Weekly

#### 2. Error Monitoring
- Set up Sentry for error tracking
- Monitor Vercel function logs
- Track MCP tool usage and failures

#### 3. Backup Strategy
- Vercel Postgres automatic backups
- Export critical data regularly
- Test restore procedures

## 📞 Support

For additional help:
1. Check Vercel deployment logs
2. Review Xero OAuth documentation
3. Check Prisma deployment guides
4. Open an issue in the repository

## 🔄 Update Process

When deploying updates:
1. Test changes locally
2. Push to main branch
3. Monitor Vercel deployment
4. Test OAuth flow after deployment
5. Verify database migrations ran successfully
6. Check MCP tool functionality

## 🛡️ Production Optimizations

### Error Handling & Monitoring

#### Centralized Error Handling
- **Error Classification**: User-facing, system, recoverable, and critical errors
- **Structured Logging**: Comprehensive error logging with context
- **MCP Error Responses**: Protocol-compliant error responses
- **HTTP Error Mapping**: Proper HTTP status codes for different error types

#### Monitoring & Analytics
- **MCP Tool Usage**: Track tool execution time and success rates
- **Xero API Monitoring**: API call patterns and error rates
- **Performance Metrics**: Response times and system health
- **Security Events**: Failed authentications and suspicious activity

#### Health Checks
- **System Health**: `/api/health` endpoint for overall system status
- **Database Connectivity**: Automatic database health monitoring
- **External Dependencies**: Xero API and external service monitoring
- **Detailed Diagnostics**: POST `/api/health` for comprehensive system checks

### Performance Optimizations

#### Caching Strategy
- **Xero Data Cache**: 5-minute TTL for frequently accessed data
- **Session Cache**: Fast session validation and storage
- **Tool Result Cache**: MCP tool execution result caching
- **Connection Pooling**: Optimized database and HTTP client connections

#### Webhook Management
- **Signature Verification**: HMAC-SHA256 signature validation
- **Idempotent Processing**: Duplicate event prevention
- **Event Queuing**: High-volume webhook handling
- **Audit Logging**: Complete webhook event tracking

#### Maintenance Operations
- **Session Cleanup**: Daily cleanup of expired MCP sessions
- **Token Refresh**: Automatic OAuth token renewal
- **Cache Management**: Periodic cache cleanup and optimization
- **Database Maintenance**: Automated database optimization routines

### Security Enhancements

#### Request Security
- **CORS Configuration**: Proper cross-origin request handling
- **Security Headers**: XSS protection, content type options, frame options
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Input Validation**: Comprehensive request validation

#### Data Protection
- **Encrypted Tokens**: AES-256-CBC encryption for sensitive data
- **Secure Sessions**: Session-based authentication with expiration
- **Webhook Security**: Signature verification for webhook authenticity
- **Environment Security**: Secure environment variable handling

### Production Deployment Checklist

#### Pre-Deployment
- [ ] Environment variables validated and secured
- [ ] Database migrations tested and ready
- [ ] SSL certificates configured
- [ ] Monitoring and alerting set up
- [ ] Backup procedures documented

#### Deployment Verification
- [ ] OAuth flow tested end-to-end
- [ ] MCP tools functional and responsive
- [ ] Webhook endpoints responding correctly
- [ ] Health check endpoints operational
- [ ] Error handling working as expected

#### Post-Deployment
- [ ] Load testing completed for high concurrency
- [ ] Monitoring dashboards configured
- [ ] Alerting rules set up for critical errors
- [ ] Performance benchmarks established
- [ ] Documentation updated with new features

#### Operational Procedures
- [ ] Incident response procedures documented
- [ ] Backup and recovery procedures tested
- [ ] Monitoring and alerting verified
- [ ] Support contact information updated
- [ ] Runbook for common issues created

## 📊 Monitoring & Alerting

### Key Metrics to Monitor
- **MCP Tool Performance**: Average execution time, success rate
- **Xero API Usage**: Call volume, error rates, response times
- **System Health**: CPU, memory, database connections
- **Security Events**: Failed logins, suspicious activity
- **User Activity**: Active sessions, tool usage patterns

### Alerting Rules
- **Critical**: System down, database unreachable
- **High**: High error rates, OAuth failures
- **Medium**: Performance degradation, webhook failures
- **Low**: Increased latency, cache misses

### Log Analysis
- **Error Patterns**: Identify common failure modes
- **Performance Trends**: Monitor system performance over time
- **Security Incidents**: Track and analyze security events
- **User Behavior**: Understand usage patterns and needs