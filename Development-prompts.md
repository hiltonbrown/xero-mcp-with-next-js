# Integrating Xero MCP Server into Next.js for Vercel Deployment

## Claude Code AI Prompts for Implementation

### Prompt 1: Project Setup and Dependencies

```
Create a comprehensive Next.js project structure for integrating the Xero MCP server functionality with Vercel deployment. Set up the following:

**Project Structure:**
```

src/
├── app/
│   ├── api/
│   │   ├── mcp/
│   │   │   └── route.ts                    # Main MCP server endpoint
│   │   ├── auth/
│   │   │   ├── callback/route.ts           # OAuth callback
│   │   │   └── xero/route.ts               # Xero auth initiation
│   │   └── webhooks/
│   │       └── xero/route.ts               # Xero webhook handler
│   ├── components/
│   │   ├── XeroConnect.tsx                 # OAuth connection component
│   │   ├── XeroTools.tsx                   # MCP tools interface
│   │   └── Dashboard.tsx                   # Main dashboard
│   ├── lib/
│   │   ├── xero-client.ts                  # Xero API client setup
│   │   ├── mcp-server.ts                   # MCP server configuration
│   │   ├── auth.ts                         # Authentication utilities
│   │   └── db.ts                           # Database configuration
│   └── types/
│       ├── xero.ts                         # Xero API types
│       └── mcp.ts                          # MCP protocol types
├── prisma/
│   └── schema.prisma                       # Database schema
└── package.json

```

**Install Dependencies:**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@vercel/postgres": "^0.8.0",
    "xero-node": "^4.34.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "typescript": "^5.5.0",
    "zod": "^3.23.0",
    "jose": "^5.2.0",
    "uuid": "^9.0.0",
    "@types/uuid": "^9.0.8",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "prisma": "^5.15.0"
  }
}
```

**Configure files:**

1. `next.config.js` with MCP server optimizations
2. `vercel.json` with function configuration for MCP endpoints
3. `tsconfig.json` with proper paths and compiler options
4. `.env.example` with all required environment variables
5. `tailwind.config.js` for styling

Set up the basic project structure and install all dependencies. Ensure TypeScript is properly configured for both Next.js and MCP server development.

```

### Prompt 2: Database Schema and Authentication Setup

```

Create a complete database schema and authentication system for the Xero MCP integration:

**Database Schema (Prisma):**
Create `prisma/schema.prisma` with the following models:

- `Account` model for user accounts with OAuth state
- `XeroConnection` model for storing Xero tenant connections
- `OAuthToken` model for encrypted token storage with refresh capabilities
- `WebhookEvent` model for tracking Xero webhook events
- `MCPSession` model for managing MCP client sessions

Include proper relationships, indexes, and field types. Add encryption fields for sensitive data and timestamps for all models.

**Authentication Implementation:**
Create `src/lib/auth.ts` with:

- JWT token generation and validation functions
- OAuth state parameter generation and validation
- Xero OAuth 2.0 flow implementation (authorization code + PKCE)
- Token refresh mechanism with error handling
- Session management utilities for MCP connections

Create `src/lib/xero-client.ts` with:

- XeroClient initialization with proper scopes
- Token management integration with database
- Error handling for expired/invalid tokens
- Multi-tenant support for different Xero organizations

**OAuth Routes:**
Implement `/api/auth/xero/route.ts`:

- Initiate OAuth flow with proper scopes
- Generate and store PKCE challenge
- Redirect to Xero authorization server

Implement `/api/auth/callback/route.ts`:

- Handle OAuth callback with authorization code
- Exchange code for access/refresh tokens
- Store encrypted tokens in database
- Fetch and store connected Xero tenants

Include comprehensive error handling, security measures (CSRF protection), and proper TypeScript types throughout.

```

### Prompt 3: MCP Server Core Implementation

```

Implement the core MCP server functionality integrated with the Xero API:

**Main MCP Server Setup (`src/lib/mcp-server.ts`):**
Create an MCP server using `@modelcontextprotocol/sdk` that exposes all key Xero accounting tools:

**List Tools:**

- `list-accounts` - Chart of accounts with filtering options
- `list-contacts` - Customer/supplier contacts with search capabilities
- `list-invoices` - Sales invoices with status and date filters
- `list-items` - Inventory items with categorization
- `list-payments` - Payment records with reconciliation status
- `list-bank-transactions` - Bank transactions with matching capabilities
- `list-reports-profit-loss` - P&L reports with date ranges
- `list-reports-balance-sheet` - Balance sheet with comparison periods

**Create Tools:**

- `create-contact` - New customer/supplier with validation
- `create-invoice` - Sales invoice with line items and tax calculations
- `create-payment` - Payment allocation to invoices
- `create-bank-transaction` - Manual bank transaction entry

**Update Tools:**

- `update-contact` - Modify existing contact details
- `update-invoice` - Edit draft invoices with proper validation

**API Route (`src/app/api/mcp/route.ts`):**
Implement the MCP server HTTP endpoint using Vercel's serverless function format:

- Handle both GET and POST requests for MCP protocol
- Implement session management for stateful MCP connections
- Include proper authentication middleware to verify Xero tokens
- Add comprehensive error handling with MCP-compliant error responses
- Configure for Vercel's Fluid Compute with appropriate timeout settings

**Tool Implementation Details:**
Each tool should:

- Accept structured parameters with Zod schema validation
- Include comprehensive error handling for Xero API limitations
- Return properly formatted MCP responses with rich content
- Handle rate limiting with exponential backoff
- Support pagination for large datasets
- Include relevant metadata and context in responses

Ensure all tools follow MCP best practices with clear descriptions, proper input schemas, and structured output formats.

```

### Prompt 4: Frontend Components and User Interface

```

Create React components for the Xero MCP integration user interface:

**Xero Connection Component (`src/components/XeroConnect.tsx`):**
Build a component that handles:

- Display current Xero connection status
- Initiate OAuth flow with loading states
- Show connected Xero organizations/tenants
- Handle disconnection and reconnection flows
- Display connection errors and troubleshooting info
- Show token expiration warnings with refresh options

**MCP Tools Interface (`src/components/XeroTools.tsx`):**
Create an interactive interface that:

- Lists all available MCP tools with descriptions
- Provides form interfaces for each tool's parameters
- Displays tool execution results in structured format
- Shows loading states and error messages
- Supports pagination for list-based tools
- Includes search and filtering capabilities
- Provides export functionality for data results

**Dashboard Component (`src/components/Dashboard.tsx`):**
Implement a main dashboard featuring:

- Overview of Xero connection status
- Quick access to commonly used tools
- Recent activity log from MCP tool usage
- Xero data summaries (account balances, recent transactions)
- Integration health monitoring
- Links to detailed tool interfaces

**Styling and UX:**

- Use Tailwind CSS for responsive design
- Implement proper loading states with skeletons
- Add error boundaries for robust error handling
- Include accessibility features (ARIA labels, keyboard navigation)
- Provide clear user feedback for all actions
- Implement dark/light mode support

**API Integration:**
Create client-side utilities for:

- Making authenticated requests to MCP endpoints
- Handling OAuth flow initiation from frontend
- Real-time status updates for long-running operations
- Client-side validation before API calls

Include comprehensive TypeScript types for all props, state, and API responses. Implement proper error boundaries and user feedback mechanisms throughout the interface.

```

### Prompt 5: Vercel Deployment Configuration and Environment Setup

```

Configure the project for optimal deployment on Vercel with MCP server support:

**Vercel Configuration (`vercel.json`):**

```json
{
  "functions": {
    "src/app/api/mcp/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/auth/**": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/maintenance/cleanup-sessions",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/maintenance/refresh-tokens",
      "schedule": "0 */6 * * *"
    }
  ],
  "redirects": [
    {
      "source": "/oauth/callback",
      "destination": "/api/auth/callback",
      "permanent": false
    }
  ]
}
```

**Environment Variables Setup:**
Create comprehensive `.env.example`:

```bash
# Database
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Xero API Configuration
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REDIRECT_URI=
XERO_WEBHOOK_KEY=

# Application Security
NEXTAUTH_SECRET=
JWT_SIGNING_KEY=
ENCRYPTION_KEY=

# Application URLs
NEXTAUTH_URL=
VERCEL_URL=

# Debug and Monitoring
MCP_DEBUG=false
LOG_LEVEL=info
```

**Next.js Configuration (`next.config.js`):**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'xero-node']
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  }
};

module.exports = nextConfig;
```

**Database Migration and Setup:**
Create migration scripts and database initialization:

- Set up Vercel Postgres integration
- Create database migration commands
- Add seed data for testing
- Configure connection pooling for serverless functions

**Deployment Scripts:**
Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "deploy": "vercel",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

**Security Configuration:**

- CORS setup for MCP endpoints
- Rate limiting configuration
- Webhook signature validation
- Environment variable validation on startup
- Security headers configuration

Include deployment checklist and troubleshooting guide for common Vercel deployment issues.

```

### Prompt 6: Error Handling, Monitoring, and Production Optimizations

```

Implement comprehensive error handling, monitoring, and production optimizations:

**Error Handling System (`src/lib/error-handler.ts`):**
Create centralized error handling for:

- Xero API errors (rate limiting, authentication, validation)
- MCP protocol errors (malformed requests, timeout issues)
- Database connection and query errors
- Network and connectivity issues
- OAuth flow errors and edge cases

Implement error classification system:

- User-facing errors (OAuth failures, invalid inputs)
- System errors (API timeouts, database issues)
- Recoverable errors (token refresh, retry mechanisms)
- Critical errors (configuration issues, security violations)

**Monitoring and Logging (`src/lib/monitoring.ts`):**
Set up comprehensive monitoring for:

- MCP tool usage analytics and performance metrics
- Xero API call patterns and error rates
- Database query performance and connection health
- OAuth flow success/failure rates
- User activity and engagement metrics

Implement structured logging with:

- Request/response tracing for debugging
- Performance metrics for tool execution times
- Security event logging (failed authentications, suspicious activity)
- Business metrics (most-used tools, data volume)

**Performance Optimizations:**
Implement caching strategies:

- Redis-compatible caching for frequently accessed Xero data
- MCP response caching with TTL management
- Database query result caching
- Static asset optimization and CDN configuration

Connection pooling and resource management:

- Database connection pooling for Postgres
- HTTP client connection reuse for Xero API
- Memory management for long-running MCP sessions
- Graceful degradation for high-load scenarios

**Webhook Management (`src/app/api/webhooks/xero/route.ts`):**
Implement robust webhook handling:

- Signature verification for security
- Idempotent processing to prevent duplicate handling
- Event queuing for high-volume scenarios
- Real-time updates to connected MCP clients
- Webhook event audit logging

**Health Checks and Maintenance:**
Create maintenance endpoints:

- `/api/health` - System health and dependency status
- `/api/maintenance/cleanup-sessions` - Cleanup expired MCP sessions
- `/api/maintenance/refresh-tokens` - Proactive token refresh
- Database maintenance and optimization routines

**Production Deployment Checklist:**

- Environment variable validation and security audit
- Database migration and backup procedures
- SSL certificate and security configuration
- Load testing for MCP endpoints under high concurrency
- Monitoring dashboard setup and alerting configuration
- Documentation for operational procedures

Include comprehensive error response formats that follow both HTTP and MCP protocol standards, with clear user guidance for resolution.

```

### Prompt 7: Testing Strategy and Development Workflow

```

Create a comprehensive testing strategy and development workflow for the Xero MCP integration:

**Testing Framework Setup:**
Configure testing environment with:

- Jest for unit testing with Next.js compatibility
- Testing Library React for component testing
- Supertest for API endpoint integration testing
- Mock Service Worker (MSW) for Xero API mocking
- Prisma test database configuration

**Unit Tests:**
Create unit tests for:

- MCP tool implementations with various input scenarios
- Xero API client functions with error handling
- Authentication utilities and token management
- Database operations and data transformations
- Utility functions and helpers

**Integration Tests:**
Implement integration tests for:

- Complete OAuth flow end-to-end
- MCP server protocol compliance
- Database operations with real database
- Webhook processing and validation
- Error handling across system boundaries

**API Testing (`tests/api/`):**
Create comprehensive API tests:

- MCP endpoint testing with various protocol messages
- Authentication endpoint testing including edge cases
- Webhook endpoint testing with signature validation
- Rate limiting and error response testing
- Performance testing for concurrent requests

**Component Testing (`tests/components/`):**
Test React components for:

- User interaction flows (OAuth initiation, tool usage)
- Error state handling and user feedback
- Data loading and pagination
- Accessibility compliance
- Responsive design behavior

**Mock Data and Fixtures:**
Create realistic test data:

- Xero API response mocks for all supported endpoints
- MCP protocol message examples for testing
- Database seed data for development and testing
- User session and authentication state mocks

**Development Workflow:**
Set up development environment with:

- Local development database with Docker
- Xero Demo Company configuration for testing
- Hot reloading for MCP server changes
- Environment switching between dev/staging/production
- Code formatting and linting automation

**Testing Scripts in `package.json`:**

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:api": "jest --testPathPattern=api",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

**CI/CD Pipeline Configuration:**
Create GitHub Actions workflow for:

- Automated testing on pull requests
- Type checking and linting
- Database migration testing
- Security scanning and dependency auditing
- Automated deployment to Vercel on merge to main

**Performance Testing:**
Implement performance tests for:

- MCP tool execution under load
- Database query optimization validation
- Memory usage and leak detection
- Concurrent user session handling
- API response time benchmarking

Include detailed testing documentation and troubleshooting guides for common development issues.

```

## Implementation Summary

These prompts provide a comprehensive roadmap for integrating the Xero MCP server functionality into a Next.js application for Vercel deployment. The implementation covers:

### Key Technical Achievements:
- **Full MCP Protocol Compliance**: Proper implementation using the official SDK
- **Robust OAuth 2.0 Integration**: Complete Xero authentication with token management
- **Vercel-Optimized Architecture**: Serverless-first design with Fluid Compute support
- **Production-Ready Security**: Encryption, authentication, and comprehensive error handling
- **Scalable Database Design**: Proper data modeling with Prisma and PostgreSQL

### Critical Integration Points:
1. **MCP Server Transport**: HTTP-based transport suitable for serverless deployment
2. **Authentication Bridge**: Seamless connection between Next.js auth and Xero OAuth
3. **Tool Exposure**: All major Xero accounting operations available through MCP protocol
4. **Session Management**: Stateful MCP connections with proper lifecycle management
5. **Error Handling**: Comprehensive error management across all system boundaries

### Deployment Considerations:
- **Environment Configuration**: Proper setup for development, staging, and production
- **Database Migration**: Automated schema management and data seeding
- **Monitoring Setup**: Comprehensive logging and performance tracking
- **Security Implementation**: OAuth, webhook verification, and data encryption

This integration enables AI applications to interact with Xero accounting data through the standardized MCP protocol while maintaining security, performance, and scalability requirements for production deployment on Vercel's platform.
