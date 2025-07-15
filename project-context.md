# DNSweeper Project Context

## Overview
DNSweeper is a comprehensive DNS management and analysis tool that provides CLI utilities and web interfaces for DNS record management, risk analysis, and optimization.

## Technology Stack

### Core Technologies
- **Runtime**: Node.js v22.4.1
- **Language**: TypeScript 5.x (strict mode enabled)
- **Package Manager**: npm

### Frontend
- **Framework**: React 18.x
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Axios
- **WebSocket**: Socket.IO Client

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL (planned)
- **Caching**: Redis (planned)
- **WebSocket**: Socket.IO
- **Authentication**: JWT

### Testing
- **Test Runner**: Vitest
- **Test Utilities**: @testing-library/react
- **Coverage**: c8

### Code Quality
- **Linter**: ESLint with TypeScript parser
- **Formatter**: Prettier
- **Git Hooks**: Husky (planned)

## Project Structure

```
dnsweeper/
├── src/                    # CLI source code
│   ├── commands/          # CLI commands
│   ├── lib/              # Core libraries
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── web/                   # Web application
│   ├── frontend/         # React frontend
│   │   ├── src/         # Frontend source
│   │   └── public/      # Static assets
│   └── backend/          # Express backend
│       ├── src/         # Backend source
│       └── tests/       # Backend tests
├── docs/                  # Documentation
├── scripts/              # Utility scripts
└── config/               # Configuration files
```

## Key Features

### CLI Commands
- `lookup`: DNS record lookup with multiple record types
- `analyze`: Risk analysis and scoring
- `sweep`: Bulk DNS resolution
- `import`: Import DNS records from CSV
- `export`: Export records to various formats
- `sync`: Sync with DNS providers (Cloudflare, Route53)
- `validate`: Validate DNS configurations
- `performance`: Performance analysis
- `edge`: Edge computing DNS
- `tenant`: Multi-tenant management

### Core Libraries
- **DNSResolver**: Parallel DNS resolution with caching
- **RiskAnalyzer**: 18-factor risk scoring system
- **CSVProcessor**: Large file streaming with encoding detection
- **CloudflareClient**: Cloudflare API integration
- **Route53Client**: AWS Route53 integration
- **OutputFormatter**: Multiple output formats (JSON, CSV, Table)

## Coding Standards

### TypeScript
- Strict mode enabled (`"strict": true`)
- No implicit any (`"noImplicitAny": true`)
- Explicit return types for functions
- Interface over type alias for object shapes
- Proper error handling with try-catch

### Code Style
- 2 spaces indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline
- Max line length: 100 characters

### Best Practices
- Functional programming preferred
- Async/await over callbacks
- Proper error messages with context
- Comprehensive JSDoc comments
- Unit tests for all utilities
- Integration tests for commands

## Common Issues and Solutions

### TypeScript Errors
1. **TS2339** (Property does not exist): Add proper type definitions or interfaces
2. **TS2345** (Type mismatch): Ensure types align or use type assertions carefully
3. **TS7006** (Parameter implicitly any): Add explicit parameter types
4. **TS2322** (Type not assignable): Check type compatibility

### ESLint Issues
1. **no-unused-vars**: Remove or prefix with underscore
2. **prettier/prettier**: Run `npm run lint -- --fix`
3. **@typescript-eslint/no-explicit-any**: Replace with specific types
4. **no-console**: Use logger utility instead

### Import Path Issues
- Use relative imports for local modules
- Use `@/` prefix for src imports (if configured)
- Ensure file extensions in imports

### Test Failures
- Mock external dependencies properly
- Use `vi.mock()` for module mocking
- Handle async operations correctly
- Clean up after tests

## Dependencies

### Major Dependencies
- commander: CLI framework
- chalk: Terminal styling
- ora: Spinner for long operations
- csv-parse/csv-stringify: CSV processing
- node-fetch: HTTP client
- dotenv: Environment variables

### Dev Dependencies
- @types/*: TypeScript definitions
- vitest: Test framework
- eslint: Linting
- prettier: Code formatting
- typescript: TypeScript compiler

## Environment Variables
- `CLOUDFLARE_API_TOKEN`: Cloudflare API authentication
- `AWS_ACCESS_KEY_ID`: AWS credentials
- `AWS_SECRET_ACCESS_KEY`: AWS credentials
- `AWS_REGION`: AWS region
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Performance Considerations
- DNS queries are parallelized with configurable concurrency
- Large CSV files are processed using streams
- Caching implemented for DNS results
- Rate limiting for API calls

## Security Notes
- Input validation on all user inputs
- API tokens stored securely
- No hardcoded credentials
- HTTPS only for API communications
- Rate limiting on public endpoints

## Current Development Status
- **Phase 1-8**: Completed ✅
- **TypeScript Errors**: 108 (to be fixed)
- **ESLint Issues**: 2,967 (to be fixed)
- **Test Coverage**: ~60%

## AI Assistant Guidelines
When fixing errors:
1. Maintain existing code style
2. Preserve functionality
3. Add types rather than using any
4. Keep changes minimal and focused
5. Ensure tests still pass
6. Document complex changes