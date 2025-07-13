import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting DNSweeper test suite...');
});

afterAll(() => {
  console.log('✅ DNSweeper test suite completed');
});

// Reset state before each test
beforeEach(() => {
  // Reset any global state if needed
});

afterEach(() => {
  // Cleanup after each test
});

// Global test utilities
export const TEST_DOMAINS = {
  valid: ['google.com', 'github.com', 'cloudflare.com'],
  invalid: ['this-domain-does-not-exist-12345.invalid'],
  timeout: ['example-timeout.test'],
} as const;

export const TEST_DNS_RECORDS = {
  A: ['142.250.207.46', '172.217.161.46'],
  AAAA: ['2404:6800:4004:828::200e'],
  MX: [{ exchange: 'smtp.google.com', priority: 10 }],
  TXT: ['v=spf1 include:_spf.google.com ~all'],
  CNAME: ['www.example.com'],
} as const;
