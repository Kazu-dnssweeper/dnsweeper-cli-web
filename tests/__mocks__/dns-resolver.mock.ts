import { vi } from 'vitest';

export const mockDnsResolver = {
  lookup: vi.fn().mockImplementation(async (domain) => {
    return {
      address: '93.184.216.34',
      family: 4
    };
  }),
  resolve: vi.fn().mockImplementation(async (domain, type) => {
    return [
      { name: domain, type: 'A', ttl: 300, data: '93.184.216.34' }
    ];
  })
};