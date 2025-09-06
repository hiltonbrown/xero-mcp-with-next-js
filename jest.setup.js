// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock environment variables
process.env.XERO_CLIENT_ID = 'test-client-id'
process.env.XERO_CLIENT_SECRET = 'test-client-secret'
process.env.XERO_REDIRECT_URI = 'http://localhost:3000/api/auth/callback'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Global test utilities
global.testRequestId = 'test-request-id'

// Mock fetch for tests
global.fetch = jest.fn()

// Mock crypto for tests
Object.defineProperty(global.self, 'crypto', {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      digest: jest.fn(),
    },
  },
})