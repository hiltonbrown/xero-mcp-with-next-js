# Testing Guide for Xero MCP Integration

## Overview

This project uses a comprehensive testing strategy with Jest and Testing Library to ensure code quality and reliability. The testing suite includes unit tests, integration tests, API tests, and component tests.

## Testing Framework Setup

### Dependencies
- **Jest**: Testing framework with Next.js compatibility
- **Testing Library**: React component testing utilities
- **Supertest**: API endpoint testing
- **MSW (Mock Service Worker)**: API mocking for external services
- **@types/jest**: TypeScript definitions for Jest

### Configuration Files
- `jest.config.js`: Jest configuration for Next.js
- `jest.setup.js`: Global test setup and mocks
- `tests/__mocks__/` : Mock data and fixtures

## Running Tests

### Available Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run specific test types
pnpm test:unit        # Unit tests only
pnpm test:api         # API tests only
pnpm test:integration # Integration tests only
pnpm test:components  # Component tests only

# Type checking and linting
pnpm type-check
pnpm lint
```

### Test File Organization

```
tests/
├── __mocks__/           # Mock data and fixtures
│   ├── xero-api.ts     # Xero API response mocks
│   └── mcp-protocol.ts # MCP protocol message mocks
├── unit/               # Unit tests
│   ├── auth.test.ts
│   └── error-handler.test.ts
├── api/                # API endpoint tests
│   └── health.test.ts
├── integration/        # Integration tests
└── components/         # Component tests
```

## Writing Tests

### Unit Tests

Unit tests focus on individual functions and utilities:

```typescript
// tests/unit/auth.test.ts
import { generateJWT, verifyJWT } from '@/lib/auth';

describe('JWT Functions', () => {
  it('should generate a valid JWT token', async () => {
    const payload = { userId: 'test-user' };
    const token = await generateJWT(payload);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should verify a valid JWT token', async () => {
    const payload = { userId: 'test-user' };
    const token = await generateJWT(payload);

    const verified = await verifyJWT(token);
    expect(verified?.userId).toBe(payload.userId);
  });
});
```

### API Tests

API tests verify endpoint functionality:

```typescript
// tests/api/health.test.ts
import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  it('should return healthy status', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
  });
});
```

### Component Tests

Component tests verify React component behavior:

```typescript
// tests/components/Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import Dashboard from '@/components/Dashboard';

describe('Dashboard', () => {
  it('should render dashboard title', () => {
    render(<Dashboard />);
    expect(screen.getByText('Xero MCP Dashboard')).toBeInTheDocument();
  });
});
```

## Mock Data and Fixtures

### Xero API Mocks

```typescript
// tests/__mocks__/xero-api.ts
export const mockXeroTenant = {
  tenantId: 'test-tenant-id',
  tenantName: 'Test Company',
  tenantType: 'ORGANISATION',
};

export const mockXeroTokenResponse = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 1800,
  token_type: 'Bearer',
  scope: 'openid profile email accounting.transactions',
};
```

### MCP Protocol Mocks

```typescript
// tests/__mocks__/mcp-protocol.ts
export const mockMCPListToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {},
};

export const mockMCPListToolsResponse = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    tools: [
      {
        name: 'list-accounts',
        description: 'List chart of accounts',
        inputSchema: { /* schema */ },
      },
    ],
  },
};
```

## Test Environment Setup

### Database Testing
Tests use a separate test database to avoid affecting development data:

```bash
# Setup test database
export DATABASE_URL="postgresql://test:test@localhost:5432/test"
pnpm db:push
pnpm db:seed
```

### Environment Variables
Test environment variables are configured in `jest.setup.js`:

```javascript
process.env.XERO_CLIENT_ID = 'test-client-id'
process.env.XERO_CLIENT_SECRET = 'test-client-secret'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
```

## CI/CD Integration

### GitHub Actions Workflow

The CI/CD pipeline includes:
- **Test Execution**: Unit, API, and integration tests
- **Type Checking**: TypeScript compilation verification
- **Linting**: Code style and quality checks
- **Coverage Reports**: Test coverage analysis
- **Security Scanning**: Vulnerability detection
- **Deployment**: Automatic deployment to Vercel

### Coverage Requirements

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 85%
- **Lines**: > 80%

## Best Practices

### Test Naming
- Use descriptive test names that explain the expected behavior
- Follow the pattern: `should [expected behavior] when [condition]`

### Test Isolation
- Each test should be independent and not rely on other tests
- Use `beforeEach` and `afterEach` for setup and cleanup
- Mock external dependencies to avoid test interference

### Mock Strategy
- Mock external APIs and services
- Use realistic mock data that matches production structure
- Avoid over-mocking internal functions

### Performance Testing
- Include performance assertions in critical path tests
- Monitor memory usage in long-running tests
- Use appropriate timeouts for async operations

## Debugging Tests

### Common Issues

1. **Mock Not Working**
   ```javascript
   // Clear mocks between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

2. **Async Test Timeouts**
   ```javascript
   it('should handle async operation', async () => {
     jest.setTimeout(10000); // Increase timeout
     // test code
   });
   ```

3. **Database Connection Issues**
   ```bash
   # Ensure test database is running
   export DATABASE_URL="postgresql://test:test@localhost:5432/test"
   ```

### Debug Mode
```bash
# Run tests with debug information
DEBUG=true pnpm test

# Run specific test file
pnpm test -- tests/unit/auth.test.ts

# Run tests with coverage for specific file
pnpm test -- --coverage --collectCoverageFrom="app/lib/auth.ts"
```

## Test Categories

### Unit Tests
- Test individual functions and utilities
- Mock all external dependencies
- Focus on business logic and edge cases

### Integration Tests
- Test component interactions
- Use real database for data operations
- Verify end-to-end workflows

### API Tests
- Test HTTP endpoints and responses
- Verify authentication and authorization
- Test error handling and edge cases

### Component Tests
- Test React component rendering
- Verify user interactions
- Test component lifecycle and state changes

## Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.ts` or `*.spec.ts`
3. Include setup and teardown as needed
4. Add mock data to `__mocks__` directory
5. Update this documentation if needed

### Test Maintenance

- Keep tests up-to-date with code changes
- Remove obsolete tests
- Update mock data when API changes
- Review and update test coverage regularly

## Troubleshooting

### Test Failures

1. **Check Dependencies**: Ensure all dependencies are installed
2. **Database Issues**: Verify test database is running and accessible
3. **Environment Variables**: Check that all required env vars are set
4. **Mock Conflicts**: Clear mocks between test runs

### Performance Issues

1. **Slow Tests**: Identify and optimize slow-running tests
2. **Memory Leaks**: Monitor memory usage in test suites
3. **Database Bottlenecks**: Optimize database queries in tests

### Coverage Issues

1. **Low Coverage**: Identify untested code paths
2. **False Positives**: Exclude generated code from coverage
3. **Test Quality**: Ensure tests exercise all code branches

For additional help, check the main project documentation or open an issue in the repository.