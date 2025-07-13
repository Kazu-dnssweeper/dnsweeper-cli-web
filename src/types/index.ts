export interface IDNSRecord {
  id: string;
  name: string;
  type: DNSRecordType;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
  created: Date;
  updated: Date;
}

export type DNSRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'SOA'
  | 'SRV'
  | 'PTR'
  | 'CAA';

export interface ICommandOptions {
  verbose?: boolean;
  json?: boolean;
  quiet?: boolean;
}

export interface IListOptions extends ICommandOptions {
  type?: DNSRecordType;
  name?: string;
  limit?: string;
}

export interface IAddOptions extends ICommandOptions {
  ttl?: string;
  priority?: string;
  weight?: string;
  port?: string;
}

export interface IDeleteOptions extends ICommandOptions {
  force?: boolean;
  confirm?: boolean;
}

export interface IImportOptions extends ICommandOptions {
  format?: string;
  resolve?: boolean;
  streaming?: boolean;
  limit?: string;
}

export interface IAnalyzeOptions extends ICommandOptions {
  format?: string;
  level?: 'low' | 'medium' | 'high' | 'critical';
  checkDns?: boolean;
  output?: string;
}

export interface IConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultTTL: number;
  outputFormat: 'table' | 'json' | 'yaml';
}

export interface IDNSResolverOptions {
  timeout?: number;
  servers?: string[];
}

export interface IDNSQuery {
  domain: string;
  type: DNSRecordType;
  server?: string;
}

export interface IDNSResolveResult {
  type: DNSRecordType;
  value: string;
  ttl?: number;
  priority?: number;
  weight?: number;
  port?: number;
  exchange?: string;
  target?: string;
}
