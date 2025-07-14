/**
 * Route53 認証機能
 */

import crypto from 'crypto';

import type { Route53Config } from './types.js';

export class Route53Auth {
  private config: Route53Config;

  constructor(config: Route53Config) {
    this.config = config;
  }

  /**
   * AWS署名v4を生成
   */
  createSignature(
    method: string,
    uri: string,
    headers: Record<string, string>,
    body: string = ''
  ): string {
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.substr(0, 8);
    const service = 'route53';
    const region = this.config.region || 'us-east-1';

    // Step 1: Create canonical request
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');

    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');

    const canonicalRequest = [
      method,
      uri,
      '', // query string
      canonicalHeaders,
      '', // empty line
      signedHeaders,
      this.sha256(body),
    ].join('\n');

    // Step 2: Create string to sign
    const credentialScope = `${date}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');

    // Step 3: Calculate signature
    const kDate = this.hmac(`AWS4${this.config.secretAccessKey}`, date);
    const kRegion = this.hmac(kDate, region);
    const kService = this.hmac(kRegion, service);
    const kSigning = this.hmac(kService, 'aws4_request');
    const signature = this.hmac(kSigning, stringToSign).toString('hex');

    // Step 4: Create authorization header
    const authorization = [
      `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ');

    return authorization;
  }

  /**
   * 認証ヘッダーを作成
   */
  createAuthHeaders(
    method: string,
    uri: string,
    body: string = ''
  ): Record<string, string> {
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    
    const headers: Record<string, string> = {
      'X-Amz-Date': timestamp,
      'Host': 'route53.amazonaws.com',
      'Content-Type': 'application/xml',
    };

    if (this.config.sessionToken) {
      headers['X-Amz-Security-Token'] = this.config.sessionToken;
    }

    if (body) {
      headers['Content-Length'] = body.length.toString();
    }

    const authorization = this.createSignature(method, uri, headers, body);
    headers['Authorization'] = authorization;

    return headers;
  }

  /**
   * SHA256ハッシュを計算
   */
  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * HMAC-SHA256を計算
   */
  private hmac(key: string | Buffer, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
  }
}