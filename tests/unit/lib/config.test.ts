import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  loadConfig,
  validateConfig,
  saveConfig,
  type DnsSweeperConfig,
} from '../../../src/lib/config.js';

vi.mock('fs');
vi.mock('os');

describe('Config', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load default config when no file exists', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(os.homedir).mockReturnValue('/home/user');
      
      const config = await loadConfig();
      
      expect(config.dns?.timeout).toBe(5000);
      expect(config.dns?.retries).toBe(3);
      expect(config.dns?.concurrent).toBe(10);
      expect(config.csv?.encoding).toBe('utf8');
      expect(config.csv?.delimiter).toBe(',');
      expect(config.output?.format).toBe('table');
      expect(config.output?.colors).toBe(true);
    });

    it('should merge custom config with defaults', async () => {
      const customConfig = { 
        dns: { timeout: 10000, retries: 5 },
        csv: { encoding: 'utf-16le' as const }
      };
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(customConfig));
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      vi.mocked(os.homedir).mockReturnValue('/home/user');
      
      const config = await loadConfig();
      
      expect(config.dns?.timeout).toBe(10000);
      expect(config.dns?.retries).toBe(5);
      expect(config.dns?.concurrent).toBe(10); // default value
      expect(config.csv?.encoding).toBe('utf-16le');
      expect(config.csv?.delimiter).toBe(','); // default value
    });

    it('should handle specific config file path', async () => {
      const customConfig = { dns: { timeout: 15000 } };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(customConfig));
      
      const config = await loadConfig('/custom/path/config.json');
      
      expect(config.dns?.timeout).toBe(15000);
      expect(fs.readFile).toHaveBeenCalledWith('/custom/path/config.json', 'utf8');
    });

    it('should handle invalid config file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      vi.mocked(os.homedir).mockReturnValue('/home/user');
      
      await expect(loadConfig()).rejects.toThrow();
    });

    it('should search for config files in order', async () => {
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error('ENOENT')) // .dnsweeper.json
        .mockRejectedValueOnce(new Error('ENOENT')) // .dnsweeperrc
        .mockResolvedValueOnce(undefined); // dnsweeper.config.json
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ dns: { timeout: 8000 } }));
      vi.mocked(os.homedir).mockReturnValue('/home/user');
      
      const config = await loadConfig();
      
      expect(config.dns?.timeout).toBe(8000);
    });

    it('should search home directory when no config found in project', async () => {
      vi.mocked(fs.access)
        .mockRejectedValue(new Error('ENOENT')); // All project files fail
      
      vi.mocked(os.homedir).mockReturnValue('/home/user');
      
      const config = await loadConfig();
      
      expect(config.dns?.timeout).toBe(5000); // default
    });
  });

  describe('environment variable override', () => {
    beforeEach(() => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(os.homedir).mockReturnValue('/home/user');
    });

    it('should override DNS settings from environment variables', async () => {
      process.env.DNSWEEPER_DNS_TIMEOUT = '15000';
      process.env.DNSWEEPER_DNS_SERVERS = 'dns1.example.com,dns2.example.com';
      
      const config = await loadConfig();
      
      expect(config.dns?.timeout).toBe(15000);
      expect(config.dns?.servers).toEqual(['dns1.example.com', 'dns2.example.com']);
    });

    it('should override API settings from environment variables', async () => {
      process.env.CLOUDFLARE_API_KEY = 'test-api-key';
      process.env.CLOUDFLARE_EMAIL = 'test@example.com';
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      
      const config = await loadConfig();
      
      expect(config.api?.cloudflare?.apiKey).toBe('test-api-key');
      expect(config.api?.cloudflare?.email).toBe('test@example.com');
      expect(config.api?.route53?.accessKeyId).toBe('test-access-key');
      expect(config.api?.route53?.secretAccessKey).toBe('test-secret-key');
    });

    it('should override output settings from environment variables', async () => {
      process.env.DNSWEEPER_OUTPUT_FORMAT = 'json';
      process.env.NO_COLOR = '1';
      
      const config = await loadConfig();
      
      expect(config.output?.format).toBe('json');
      expect(config.output?.colors).toBe(false);
    });

    it('should handle DNSWEEPER_NO_COLOR environment variable', async () => {
      process.env.DNSWEEPER_NO_COLOR = '1';
      
      const config = await loadConfig();
      
      expect(config.output?.colors).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const validConfig: DnsSweeperConfig = {
        dns: { timeout: 5000, retries: 3 },
        risk: {
          weights: { unusedDays: 0.4, namingPattern: 0.3, ttl: 0.3 },
          thresholds: { high: 70, medium: 40 }
        }
      };
      
      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should reject negative DNS timeout', () => {
      const invalidConfig: DnsSweeperConfig = {
        dns: { timeout: -1000 }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow('DNS timeout must be positive');
    });

    it('should reject negative DNS retries', () => {
      const invalidConfig: DnsSweeperConfig = {
        dns: { retries: -1 }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow('DNS retries must be positive');
    });

    it('should reject invalid risk weights that do not sum to 1', () => {
      const invalidConfig: DnsSweeperConfig = {
        risk: {
          weights: { unusedDays: 0.5, namingPattern: 0.3, ttl: 0.3 } // sums to 1.1
        }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow('Risk weights must sum to 1.0');
    });

    it('should reject invalid risk thresholds', () => {
      const invalidConfig: DnsSweeperConfig = {
        risk: {
          thresholds: { high: 40, medium: 70 } // high <= medium
        }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(
        'High risk threshold must be greater than medium threshold'
      );
    });

    it('should accept risk weights that sum to approximately 1.0', () => {
      const validConfig: DnsSweeperConfig = {
        risk: {
          weights: { unusedDays: 0.333, namingPattern: 0.333, ttl: 0.334 } // sums to 1.0
        }
      };
      
      expect(() => validateConfig(validConfig)).not.toThrow();
    });
  });

  describe('saveConfig', () => {
    it('should save config to specified path', async () => {
      const config: DnsSweeperConfig = {
        dns: { timeout: 8000 },
        csv: { encoding: 'utf-16le' }
      };
      
      const customPath = '/custom/path/config.json';
      
      await saveConfig(config, customPath);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        customPath,
        expect.stringContaining('"timeout": 8000'),
        'utf8'
      );
    });

    it('should save config to default path when no path specified', async () => {
      const config: DnsSweeperConfig = {
        dns: { timeout: 6000 }
      };
      
      await saveConfig(config);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.dnsweeper.json'),
        expect.stringContaining('"timeout": 6000'),
        'utf8'
      );
    });

    it('should format JSON with proper indentation', async () => {
      const config: DnsSweeperConfig = {
        dns: { timeout: 5000 },
        csv: { encoding: 'utf8' }
      };
      
      await saveConfig(config);
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedContent = writeCall[1] as string;
      
      expect(savedContent).toMatch(/{\s+"dns":/);
      expect(savedContent).toMatch(/  "timeout": 5000/);
    });

    it('should handle save errors', async () => {
      const config: DnsSweeperConfig = { dns: { timeout: 5000 } };
      
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'));
      
      await expect(saveConfig(config)).rejects.toThrow();
    });
  });

  describe('deep merge functionality', () => {
    it('should deeply merge nested objects', async () => {
      const fileConfig = {
        dns: { timeout: 10000 },
        api: { cloudflare: { apiKey: 'test-key' } }
      };
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(fileConfig));
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      
      const config = await loadConfig();
      
      expect(config.dns?.timeout).toBe(10000);
      expect(config.dns?.retries).toBe(3); // default preserved
      expect(config.api?.cloudflare?.apiKey).toBe('test-key');
    });

    it('should preserve arrays correctly', async () => {
      const fileConfig = {
        dns: { servers: ['custom1.example.com', 'custom2.example.com'] }
      };
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(fileConfig));
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      
      const config = await loadConfig();
      
      expect(config.dns?.servers).toEqual(['custom1.example.com', 'custom2.example.com']);
    });
  });
});