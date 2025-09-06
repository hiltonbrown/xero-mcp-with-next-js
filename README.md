# Xero MCP Integration Server

[![Build Status](https://github.com/hiltonbrown/xero-mcp-with-next-js/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/hiltonbrown/xero-mcp-with-next-js/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)

> **Connect AI assistants to Xero accounting data seamlessly**

Transform your Xero workflow with AI-powered insights and automation. This server enables AI assistants like Claude, ChatGPT, or any Model Context Protocol (MCP) compatible AI to securely access and analyze your Xero accounting data.

## Features

- **Secure OAuth 2.0 Integration** - Enterprise-grade authentication with Xero
- **AI Assistant Compatible** - Works with Claude, ChatGPT, and other MCP clients
- **Real-time Data Access** - Live synchronization with Xero accounting data
- **Enterprise Security** - Encrypted tokens, CSRF protection, and audit logging
- **Comprehensive API Coverage** - Invoices, contacts, accounts, payments, and more
- **Production Ready** - Optimized for Vercel deployment with monitoring

## What You Can Do

**Instant Financial Insights** - Ask "What's my cash flow trend this quarter?"
**Automated Reporting** - Generate reports with natural language requests
**Smart Data Entry** - AI-assisted invoice and transaction management
**Real-time Alerts** - Get notified about important financial events
**Multi-tenant Support** - Connect multiple Xero organizations

## Quick Start

Get up and running in 3 minutes:

### 1. Clone & Install
```bash
git clone https://github.com/hiltonbrown/xero-mcp-with-next-js.git
cd xero-mcp-with-next-js
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Xero credentials (see Configuration section)
```

### 3. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and follow the OAuth flow to connect your Xero account!

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security)
- [License](#-license)

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Xero Developer Account** - [Sign up](https://developer.xero.com/)
- **PostgreSQL Database** - Local or cloud (Supabase, Railway, etc.)
- **Vercel Account** (optional) - For deployment

## Installation

### Option 1: Local Development (Recommended)

```bash
# Clone the repository
git clone https://github.com/hiltonbrown/xero-mcp-with-next-js.git
cd xero-mcp-with-next-js

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### Option 2: Using Docker

```bash
# Clone and start with Docker
git clone https://github.com/hiltonbrown/xero-mcp-with-next-js.git
cd xero-mcp-with-next-js

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy
```

### Option 3: Vercel One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hiltonbrown/xero-mcp-with-next-js)

## Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/xero_mcp"

# Xero API Configuration
XERO_CLIENT_ID="your-xero-client-id"
XERO_CLIENT_SECRET="your-xero-client-secret"
XERO_REDIRECT_URI="http://localhost:3000/api/auth/callback"

# Security Configuration
JWT_SECRET="your-256-bit-secret-here"
ENCRYPTION_KEY="your-32-character-encryption-key"

# Optional: Redis for production caching
REDIS_URL="redis://localhost:6379"

# Optional: Monitoring and logging
SENTRY_DSN="your-sentry-dsn-here"
```

### Xero Developer Setup

1. **Create Xero App**
   - Go to [Xero Developer Portal](https://developer.xero.com/)
   - Click "New App" and select "Web app"
   - Enter your app details

2. **Configure OAuth 2.0**
   - Set redirect URI to: `http://localhost:3000/api/auth/callback`
   - Copy Client ID and Client Secret to your `.env.local`

3. **Set Permissions**
   - Enable required scopes: `accounting.transactions`, `accounting.contacts`, etc.

### Database Setup

```bash
# Install PostgreSQL locally or use a cloud provider
# Then run migrations:
npx prisma migrate deploy

# Optional: Seed with test data
npx prisma db seed
```

## Usage

### Connecting AI Assistants

#### Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xero": {
      "command": "node",
      "args": ["path/to/your/mcp/server"],
      "env": {
        "XERO_CLIENT_ID": "your-client-id",
        "DATABASE_URL": "your-database-url"
      }
    }
  }
}
```

#### ChatGPT Integration

Configure the MCP server URL in your ChatGPT settings:

```javascript
// Example MCP client connection
const mcpClient = await connectToMCPServer({
  url: 'http://localhost:3000/api/mcp',
  sessionId: 'your-session-id'
});
```

### Example Queries

Once connected, you can ask your AI assistant:

- *"Show me my outstanding invoices over $500"*
- *"What's my total revenue for Q1 2024?"*
- *"List all customers who haven't paid in 30 days"*
- *"Create a summary of my cash flow this month"*
- *"Find transactions with 'Office Supplies' in the description"*

### API Endpoints

#### Authentication
```bash
# Initiate OAuth flow
GET /api/auth/xero?accountId=123

# OAuth callback handler
GET /api/auth/callback?code=...&state=...
```

#### MCP Server
```bash
# MCP protocol endpoint
POST /api/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

#### Health & Monitoring
```bash
# Health check
GET /api/health

# Detailed health check
POST /api/health
```

#### Webhooks
```bash
# Xero webhook receiver
POST /api/webhooks/xero
X-Xero-Signature: <signature>
```

## 📚 API Reference

### MCP Tools Available

| Tool | Description | Parameters |
|------|-------------|------------|
| `list-accounts` | Chart of accounts | `tenantId`, `where`, `orderBy` |
| `list-contacts` | Customer/supplier contacts | `tenantId`, `where`, `page`, `pageSize` |
| `list-invoices` | Sales invoices | `tenantId`, `status`, `dateFrom`, `dateTo` |
| `list-items` | Inventory items | `tenantId`, `where` |
| `list-payments` | Payment records | `tenantId`, `status`, `dateFrom`, `dateTo` |
| `create-contact` | New contact | `tenantId`, `name`, `email`, `contactType` |
| `create-invoice` | New invoice | `tenantId`, `contactId`, `date`, `lineItems` |
| `update-contact` | Update contact | `tenantId`, `contactId`, `name`, `email` |

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 5 accounts"
      },
      {
        "type": "json",
        "json": [...]
      }
    ]
  }
}
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit      # Unit tests
npm run test:api       # API tests
npm run test:integration # Integration tests

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **Unit Tests**: Core functions and utilities
- **API Tests**: HTTP endpoints and responses
- **Integration Tests**: End-to-end OAuth and MCP flows
- **Component Tests**: React component testing

## Deployment

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Vercel will automatically detect Next.js
   vercel --prod
   ```

2. **Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Enable "Fluid Compute" for better performance
   - Set function timeout to 30 seconds for MCP operations

3. **Database**
   - Use Vercel Postgres or connect external PostgreSQL
   - Run migrations: `npx prisma migrate deploy`

### Docker Deployment

```bash
# Build and run
docker build -t xero-mcp .
docker run -p 3000:3000 xero-mcp
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates enabled
- [ ] Monitoring and alerting set up
- [ ] Backup procedures documented
- [ ] Load testing completed

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/xero-mcp-with-next-js.git
   cd xero-mcp-with-next-js
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with Next.js rules
- **Prettier**: Automated code formatting
- **Testing**: Minimum 80% code coverage required

### Pull Request Process

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Write tests for your changes
3. Ensure all tests pass: `npm test`
4. Update documentation if needed
5. Submit a pull request with a clear description

### Commit Message Format

```
feat: add new MCP tool for bank reconciliation
fix: resolve OAuth token refresh issue
docs: update API documentation
test: add integration tests for webhook handling
refactor: improve error handling in auth module
```

## Troubleshooting

### Common Issues

**OAuth Connection Failed**
```bash
# Check Xero app configuration
# Verify redirect URI matches: http://localhost:3000/api/auth/callback
# Ensure Xero app has correct scopes enabled
```

**Database Connection Error**
```bash
# Verify DATABASE_URL is correct
# Check PostgreSQL is running
# Run: npx prisma migrate deploy
```

**MCP Tool Not Working**
```bash
# Check session is valid
# Verify Xero connection is active
# Check API permissions in Xero
```

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Check health endpoint
curl http://localhost:3000/api/health
```

### Getting Help

- **Documentation**: [Full API Docs](https://docs.example.com)
- **Discussions**: [GitHub Discussions](https://github.com/hiltonbrown/xero-mcp-with-next-js/discussions)
- **Issues**: [GitHub Issues](https://github.com/hiltonbrown/xero-mcp-with-next-js/issues)
- **Email**: support@example.com

## Security

### Data Protection
- **Encrypted Tokens**: All sensitive data encrypted with AES-256
- **Secure Sessions**: JWT-based authentication with expiration
- **CSRF Protection**: OAuth state parameter validation
- **Input Validation**: Comprehensive request sanitization

### Best Practices
- **Environment Variables**: Never commit secrets to version control
- **HTTPS Only**: Always use HTTPS in production
- **Regular Updates**: Keep dependencies updated for security patches
- **Access Control**: Implement proper authorization checks

### Security Reporting
If you discover a security vulnerability, please email security@example.com instead of creating a public issue.

## Roadmap

### Version 2.0 (Coming Soon)
- [ ] Advanced reporting tools
- [ ] Bulk operations support
- [ ] Real-time webhook notifications
- [ ] Multi-organization support
- [ ] Advanced analytics dashboard

### Version 1.5 (Current)
- [x] Basic MCP tool implementation
- [x] OAuth 2.0 integration
- [x] Webhook support
- [x] Comprehensive testing suite
- [x] Production deployment ready

## Acknowledgments

- **Xero API** - For providing excellent accounting APIs
- **Model Context Protocol** - For the AI assistant integration standard
- **Next.js Community** - For the amazing React framework
- **Vercel** - For the best deployment platform

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for Accountants, Bookkeepers and AI enthusiasts**

[⭐ Star us on GitHub](https://github.com/hiltonbrown/xero-mcp-with-next-js) • [📖 Documentation](Still to do) • [🐛 Report Issues](https://github.com/hiltonbrown/xero-mcp-with-next-js/issues)
