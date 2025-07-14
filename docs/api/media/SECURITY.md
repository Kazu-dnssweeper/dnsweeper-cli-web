# Security Policy

## Supported Versions

DNSweeper actively supports security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of DNSweeper seriously. If you have discovered a security vulnerability, please follow these steps:

### 1. Do NOT create a public issue
Security vulnerabilities must be reported privately to avoid potential exploitation.

### 2. Report via Email
Send your report to: [security@dnsweeper.example.com]

Include the following information:
- **Description**: Clear explanation of the vulnerability
- **Impact**: Potential impact and severity assessment
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Proof of Concept**: Code or commands demonstrating the vulnerability (if applicable)
- **Suggested Fix**: Any recommendations for fixing the issue

### 3. Response Timeline
- **Initial Response**: Within 48 hours
- **Vulnerability Assessment**: Within 7 days
- **Patch Development**: Depending on severity (Critical: 7 days, High: 14 days, Medium: 30 days)
- **Public Disclosure**: After patch release and user notification

## Security Best Practices

When using DNSweeper, we recommend:

1. **Keep Updated**: Always use the latest version
2. **Secure Credentials**: Never store DNS provider credentials in plain text
3. **Access Control**: Limit access to DNSweeper configuration files
4. **Audit Logs**: Enable logging for all DNS modifications
5. **Network Security**: Use DNSweeper in secure network environments

## Known Security Considerations

### DNS Data Sensitivity
- DNS records can reveal infrastructure details
- Exported DNS data should be treated as sensitive
- Use encryption when transferring DNS configuration files

### API Credentials
- Store API credentials using environment variables or secure vaults
- Rotate credentials regularly
- Use minimal required permissions for API keys

### Command Injection
- DNSweeper sanitizes all user inputs
- Domain names are validated against RFC standards
- File paths are checked for directory traversal attempts

## Security Features

DNSweeper includes the following security features:

- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Built-in rate limiting for DNS queries
- **Secure Defaults**: Security-focused default configurations
- **Audit Trail**: Comprehensive logging of all operations
- **No External Telemetry**: No data is sent to external services

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who:
- Follow our reporting process
- Allow reasonable time for patches
- Do not exploit vulnerabilities

Security researchers will be credited in our release notes unless they prefer to remain anonymous.

## Contact

For any security-related questions: [security@dnsweeper.example.com]