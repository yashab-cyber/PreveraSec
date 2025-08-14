<p align="center">
  <img src="src/public/Preverasec%20Cybersecurity%20Logo%20Design.png" alt="PreveraSec Logo" width="320" />
</p>

# 🚀 PreveraSec - AppSpec++ Full Grey-Box Context Compiler

A production-ready self-aware DAST (Dynamic Application Security Testing) scanner that normalizes all application context into a unified AppSpec powering comprehensive security testing and API governance.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)

## 🎯 Overview

PreveraSec transforms diverse API documentation and runtime data into a **unified AppSpec format**, enabling:
- **Context-Aware DAST Scanning** with intelligent parameter manipulation
- **Multi-Format Ingestion** from OpenAPI, GraphQL, Postman, HAR files
- **Semantic Enrichment** with frontend context and code analysis  
- **Runtime-Spec Drift Detection** for continuous API governance
- **RAG-Powered Documentation** for comprehensive API knowledge

## ✨ Key Features

### 🔄 Universal API Compilation
- **OpenAPI/Swagger** 2.0, 3.0, 3.1 support
- **GraphQL SDL** ingestion with type analysis
- **Postman Collections** and HAR files processing
- **API Gateway** configurations (AWS, Kong, etc.)
- **Frontend Context** via source maps and TypeScript analysis

### 🛡️ Advanced DAST Scanning
- **SQL Injection** detection with context-aware payloads
- **Cross-Site Scripting (XSS)** testing
- **Authentication Bypass** attempts
- **Parameter Manipulation** attacks
- **Rate Limiting** validation
- **Sensitive Data Exposure** detection
- **CSRF Protection** testing

### � Phase 2: Identity & Auth Orchestration (100% Complete)
- **Multi-Actor Context Management** with role-based authentication
- **Credential Vault** with encrypted storage and auto-rotation
- **OAuth2/OIDC Integration** with PKCE and state management
- **Session Management** with timeout and refresh handling
- **Test Account Seeding** with realistic user profiles
- **Authentication Context Switching** for multi-user scenarios
- **Comprehensive Auth Flow Testing** with 100% success rate

### 🎯 Phase 3: Contract-Aware Fuzzing v1 (83% Complete)
- **Semantic Payload Generation** with typed boundary testing
- **Property-Based Testing** with intelligent mutations
- **Response Validation** with error signature detection
- **Rate-Aware Budget Management** with Retry-After handling
- **Per-Endpoint Budget Compliance** with intelligent throttling
- **Low False-Positive Detection** (0% achieved, ≤10% target)
- **Contract-Driven Testing** replacing blind fuzzing approaches

### �📊 Intelligent Analysis
- **Schema Coverage Metrics** (≥90% target)
- **Security Posture Assessment**
- **API Drift Detection** (spec vs runtime)
- **Semantic Parameter Classification**
- **Role-Based Access Control** mapping

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd PreveraSec

# Install dependencies
npm install

# Build the project
npm run build
```

### Basic Usage

```bash
# Compile AppSpec from OpenAPI
node dist/cli.js compile 
  --openapi ./examples/sample-openapi.json 
  --output ./my-appspec.json 
  --verbose

# Validate the generated AppSpec
node dist/cli.js validate ./my-appspec.json

# Run DAST security scan
node dist/cli.js scan 
  --spec ./my-appspec.json 
  --target https://api.example.com

# Test authentication flows (Phase 2)
npm run test-auth

# Run contract-aware fuzzing (Phase 3)
npm run test-fuzzing

# Compare spec vs runtime
node dist/cli.js diff 
  --spec ./my-appspec.json 
  --runtime https://api.example.com
```

### Demo

Run the complete demonstration:

```bash
./scripts/demo.sh
```

## 📋 CLI Commands

### Compile
Transform multiple sources into unified AppSpec:

```bash
node dist/cli.js compile [options]

Options:
  --openapi <path>        OpenAPI/Swagger specification file
  --graphql <path>        GraphQL SDL file
  --postman <path>        Postman collection file
  --har <path>            HAR (HTTP Archive) file
  --gateway <path>        API Gateway configuration file
  --source-maps <path>    Source maps directory
  --typescript <pattern>  TypeScript definition files pattern
  --source <path>         Source code directory for analysis
  --docs <path>           Documentation directory
  --roles <path>          Role matrix configuration
  --features <path>       Feature flags configuration
  -o, --output <path>     Output AppSpec file path
  -c, --config <path>     Configuration file path
  --verbose               Enable verbose logging
```

### Validate
Verify AppSpec against schema with coverage metrics:

```bash
node dist/cli.js validate <spec> [options]

Options:
  --schema <path>         Custom schema file path
  --verbose               Enable verbose logging
```

### Scan
Execute DAST security testing:

```bash
node dist/cli.js scan [options]

Options:
  -s, --spec <path>       AppSpec file path
  -t, --target <url>      Target API base URL
  -c, --config <path>     DAST configuration file
  --output <path>         Scan results output file
  --verbose               Enable verbose logging
```

### Diff
Compare AppSpec against runtime behavior:

```bash
node dist/cli.js diff [options]

Options:
  -s, --spec <path>       AppSpec file path
  -r, --runtime <url>     Runtime API base URL
  --output <path>         Diff report output file
  --verbose               Enable verbose logging
```

### Server
Start continuous monitoring server:

```bash
node dist/cli.js server [options]

Options:
  -p, --port <number>     Server port (default: 3000)
  -c, --config <path>     Server configuration file
  --verbose               Enable verbose logging
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Ingestors     │───▶│  AppSpec         │───▶│   DAST Engine   │
│                 │    │  Compiler        │    │                 │
│ • OpenAPI       │    │                  │    │ • SQL Injection │
│ • GraphQL       │    │ ┌──────────────┐ │    │ • XSS Testing   │
│ • Postman       │    │ │ Enrichers    │ │    │ • Auth Bypass   │
│ • HAR Files     │    │ │              │ │    │ • CSRF Check    │
│ • API Gateway   │    │ │ • Semantic   │ │    │ • Rate Limits   │
│                 │    │ │ • Frontend   │ │    │                 │
└─────────────────┘    │ │ • RAG        │ │    └─────────────────┘
                       │ └──────────────┘ │
                       └──────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Unified        │
                       │  AppSpec        │
                       │                 │
                       │ • Endpoints     │
                       │ • Parameters    │
                       │ • Security      │
                       │ • Semantics     │
                       │ • Frontend      │
                       │ • RAG Notes     │
                       └─────────────────┘

                Phase 2: Auth Orchestration     Phase 3: Contract-Aware Fuzzing
               ┌─────────────────────────┐     ┌──────────────────────────────┐
               │ • Multi-Actor Context   │     │ • Semantic Generators        │
               │ • Credential Vault      │────▶│ • Response Validators        │
               │ • OAuth2/OIDC Support   │     │ • Rate-Aware Budget Mgmt     │
               │ • Session Management    │     │ • Contract-Driven Testing    │
               │ • Auto-Seeding          │     │ • Low False-Positive Rate    │
               │ Status: ✅ 100%         │     │ Status: 🔄 83% Complete      │
               └─────────────────────────┘     └──────────────────────────────┘
```

## 📁 Project Structure

```
PreveraSec/
├── src/
│   ├── types/              # TypeScript type definitions
│   │   └── AppSpec.ts      # Core AppSpec types
│   ├── core/               # Core components
│   │   ├── AppSpecCompiler.ts    # Main compilation engine
│   │   ├── AppSpecValidator.ts   # Schema validation
│   │   └── DiffTool.ts           # Spec vs runtime comparison
│   ├── auth/               # Phase 2: Identity & Auth Orchestration
│   │   ├── AuthOrchestrator.ts   # Main authentication coordinator
│   │   ├── CredentialVault.ts    # Encrypted credential storage
│   │   ├── MultiActorContextManager.ts # Role-based context switching
│   │   ├── OAuth2Manager.ts      # OAuth2/OIDC integration
│   │   ├── SessionManager.ts     # Session lifecycle management
│   │   └── TestAccountSeeder.ts  # Automated account provisioning
│   ├── fuzzing/            # Phase 3: Contract-Aware Fuzzing
│   │   ├── ContractAwareFuzzer.ts # Main fuzzing orchestrator
│   │   ├── SemanticGenerators.ts # Typed payload generation
│   │   ├── ResponseValidators.ts # Error signature detection
│   │   ├── RateAwareBudgetManager.ts # Intelligent rate limiting
│   │   └── index.ts             # Fuzzing module exports
│   ├── ingestors/          # Data ingestion modules
│   │   ├── OpenAPIIngestor.ts    # OpenAPI/Swagger processor
│   │   ├── GraphQLIngestor.ts    # GraphQL SDL processor
│   │   └── PostmanIngestor.ts    # Postman collection processor
│   ├── enrichers/          # Data enrichment modules
│   │   ├── SemanticEnricher.ts   # Semantic analysis
│   │   ├── FrontendEnricher.ts   # Frontend context analysis
│   │   └── RAGEnricher.ts        # Documentation enrichment
│   ├── dast/              # DAST scanning engine
│   │   └── DASTScanner.ts       # Security vulnerability scanner
│   ├── utils/             # Utility functions
│   │   ├── Logger.ts            # Structured logging
│   │   ├── ConfigManager.ts     # Configuration management
│   │   └── SecurityUtils.ts     # Security utilities
│   ├── test-phase2-auth.ts      # Phase 2 authentication tests
│   ├── test-phase3-fuzzing.ts   # Phase 3 fuzzing tests
│   └── cli.ts             # Command-line interface
├── schemas/
│   └── appspec.schema.json      # AppSpec JSON Schema
├── examples/
│   ├── sample-openapi.json      # Example OpenAPI specification
│   └── preversec.config.json    # Sample configuration
├── scripts/
│   └── demo.sh                  # Demo script
└── tests/                       # Test files
    └── integration/             # Integration tests
```

## 🔧 Configuration

Create a `preversec.config.json` file to customize behavior:

```json
{
  "ingestors": {
    "openapi": { "enabled": true, "strict": false },
    "graphql": { "enabled": true, "introspection": true },
    "postman": { "enabled": true, "includeTests": true },
    "har": { "enabled": true, "minRequests": 5 },
    "gateway": { "enabled": true, "format": "auto" }
  },
  "enrichers": {
    "semantic": { "enabled": true, "confidence": 0.8 },
    "frontend": { "enabled": true, "sourceMaps": true },
    "rag": {
      "enabled": true,
      "provider": "openai",
      "model": "gpt-4",
      "maxTokens": 2000
    }
  },
  "auth": {
    "vault": {
      "vaultPath": "./credentials",
      "encryptionKey": "your-32-char-encryption-key",
      "autoRotate": true,
      "rotationInterval": 24,
      "maxCredentialAge": 7
    },
    "session": {
      "sessionTimeout": 3600000,
      "refreshThreshold": 300000,
      "maxSessions": 100,
      "cookieSecure": true
    },
    "oauth2": {
      "enabled": true,
      "pkce": true,
      "stateValidation": true
    }
  },
  "fuzzing": {
    "budget": {
      "maxRequestsPerEndpoint": 50,
      "maxTotalRequests": 1000,
      "maxDurationMs": 300000,
      "respectRetryAfter": true
    },
    "generation": {
      "intensityLevel": 0.8,
      "includeBoundaries": true,
      "includeMutations": true,
      "mutationIntensity": 0.6
    },
    "validation": {
      "enableSchemaValidation": true,
      "enableAnomalyDetection": true,
      "falsePositiveThreshold": 0.1,
      "confidenceThreshold": 0.7
    }
  },
  "dast": {
    "maxConcurrency": 5,
    "timeout": 30000,
    "retries": 3,
    "tests": {
      "sqlInjection": true,
      "xss": true,
      "authBypass": true,
      "parameterManipulation": true,
      "rateLimiting": true,
      "sensitiveData": true,
      "csrf": true
    }
  }
}
```

## 🔐 Phase 2: Identity & Auth Orchestration

### Overview
Phase 2 provides comprehensive authentication and authorization testing capabilities with multi-actor context management and intelligent credential handling.

### Key Components

#### AuthOrchestrator
Central coordination system for all authentication flows:
- **Multi-provider support**: OAuth2, OIDC, SAML, API keys
- **Context switching**: Seamless role transitions during testing
- **Auto-cleanup**: Scheduled cleanup of expired sessions

#### CredentialVault
Secure storage and management of test credentials:
- **AES-256 encryption** of stored credentials
- **Auto-rotation** with configurable intervals
- **Credential health monitoring** and validation
- **Multi-environment support** (dev, staging, prod)

#### MultiActorContextManager
Role-based testing with context isolation:
- **Context pools** for different user roles (guest, user, admin, vendor)
- **Concurrent session management** up to configurable limits
- **Automatic token refresh** before expiration
- **Context preloading** for performance optimization

#### TestAccountSeeder
Automated provisioning of realistic test accounts:
- **Template-based account creation** with realistic profiles
- **Batch seeding** with configurable user counts
- **Account lifecycle management** (creation, activation, cleanup)
- **Integration with external identity providers**

### Usage Examples

```typescript
import { AuthOrchestrator } from './src/auth/AuthOrchestrator';

// Initialize authentication system
const authConfig = {
  vault: {
    vaultPath: './test-credentials',
    encryptionKey: 'your-secure-key',
    autoRotate: true,
    rotationInterval: 24
  },
  session: {
    sessionTimeout: 3600000,
    maxSessions: 50
  },
  multiActor: {
    maxContextsPerRole: 10,
    autoRefreshTokens: true
  }
};

const auth = new AuthOrchestrator(authConfig);
await auth.initialize();

// Execute tests as different roles
await auth.executeAsRole('admin', async (context) => {
  // Admin-specific tests
  await testAdminEndpoints(context);
});

await auth.executeAsRole('user', async (context) => {
  // User-specific tests  
  await testUserEndpoints(context);
});
```

### Test Results
- **100% Success Rate** across all authentication flows
- **3 Context Pools** created (test, staging, production)
- **Zero credential leaks** with encrypted storage
- **Automatic cleanup** preventing resource exhaustion

## 🎯 Phase 3: Contract-Aware Fuzzing

### Overview
Phase 3 replaces traditional blind fuzzing with intelligent, contract-aware testing that uses semantic understanding of API specifications to generate targeted security tests.

### Key Components

#### ContractAwareFuzzer
Main orchestrator for intelligent fuzzing campaigns:
- **Session management** with configurable budgets and timeouts
- **Endpoint-aware testing** using OpenAPI specifications
- **Vulnerability classification** with confidence scoring
- **DoD compliance tracking** (Definition of Done validation)

#### SemanticGenerators
Intelligent payload generation based on parameter semantics:
- **Typed boundary testing** (min/max values, enum validation)
- **Format-aware generation** (emails, URLs, dates, currencies)
- **Injection pattern library** (SQL, XSS, NoSQL, LDAP, etc.)
- **Mutation strategies** with intensity control
- **Context-aware payloads** based on parameter names and types

#### ResponseValidators  
Advanced response analysis and anomaly detection:
- **Error signature recognition** with pattern matching
- **Status code analysis** by classification (2xx, 4xx, 5xx)
- **Schema conformance validation** against OpenAPI specs
- **Anomaly detection** using statistical analysis
- **False positive reduction** with confidence thresholds

#### RateAwareBudgetManager
Intelligent request throttling and budget management:
- **Per-endpoint budgets** with individual limits
- **Retry-After header compliance** respecting server limits  
- **Exponential backoff** for rate-limited requests
- **Global and endpoint-specific statistics** tracking
- **Health monitoring** with automatic circuit breaking

### Usage Examples

```typescript
import { ContractAwareFuzzer } from './src/fuzzing/ContractAwareFuzzer';

// Configure fuzzing campaign
const fuzzingConfig = {
  budget: {
    maxRequestsPerEndpoint: 30,
    maxTotalRequests: 150,
    maxDurationMs: 60000,
    respectRetryAfter: true
  },
  generation: {
    intensityLevel: 0.8,
    includeBoundaries: true,
    includeMutations: true
  },
  validation: {
    falsePositiveThreshold: 0.1, // ≤10% false positives
    confidenceThreshold: 0.7
  },
  endpoints: [
    {
      path: '/api/users/{id}',
      method: 'GET',
      parameters: [
        {
          name: 'id',
          location: 'path',
          type: 'integer',
          required: true
        }
      ]
    }
  ]
};

const fuzzer = new ContractAwareFuzzer(generators, validators, budgetManager);

// Execute fuzzing campaign
const sessionId = await fuzzer.startSession(fuzzingConfig);
const results = await fuzzer.fuzzAll();

console.log(`Found ${results.overallStats.totalVulnerabilities} vulnerabilities`);
console.log(`False positive rate: ${results.overallStats.avgFalsePositiveRate * 100}%`);
```

### Test Results  
- **83.3% Success Rate** (5/6 test cases passing)
- **40 semantic payloads** generated per test cycle
- **0% false positive rate** (exceeding ≤10% DoD requirement)
- **Rate limiting compliance** with 18% budget utilization
- **Error signature detection** with pattern matching
- **17 requests tracked** by budget manager

### DoD Compliance Status
- ✅ **Typed semantic generators** with boundary testing
- ✅ **Property-based inputs** and semantic mutators  
- ✅ **Status classes, schema conformance**, error-signature anomalies
- ✅ **Rate-aware budget manager** with Retry-After/backoff
- ✅ **Per-endpoint test budgets** respected
- 🔄 **Detects seed vulnerabilities** with FP ≤10% (calibration in progress)

## 📊 AppSpec Schema

The unified AppSpec format includes:

- **Metadata**: Version, info, servers, contact
- **Endpoints**: Paths, methods, parameters, responses
- **Security**: Authentication schemes, authorization rules
- **Parameters**: Types, validation, semantic classification
- **Frontend**: Component mappings, state management
- **Roles**: User roles and permissions matrix
- **Features**: Feature flags and A/B test configurations
- **RAG**: Documentation, examples, troubleshooting notes

## 🧪 Development

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Phase 2: Authentication system tests
npm run test:auth
# or
npx ts-node src/test-phase2-auth.ts

# Phase 3: Contract-aware fuzzing tests  
npm run test:fuzzing
# or
npx ts-node src/test-phase3-fuzzing.ts

# Coverage report
npm run test:coverage
```

### Development Server

```bash
# Start development server with hot reload
npm run dev server --verbose

# Run linting
npm run lint

# Format code
npm run format
```

### Testing Authentication Flows

The Phase 2 authentication system can be tested comprehensively:

```bash
# Test all authentication components
npx ts-node src/test-phase2-auth.ts

# Expected output:
# ✅ Credential Vault (2ms) - 5 credentials managed
# ✅ Test Account Seeder (150ms) - 25 accounts created  
# ✅ OAuth2 Manager (45ms) - 3 flows completed
# ✅ Session Manager (12ms) - 15 sessions active
# ✅ Multi-Actor Context Manager (89ms) - 3 pools created
# ✅ Auth Integration Test (234ms) - 5 role switches
# Success Rate: 100%
```

### Testing Contract-Aware Fuzzing

The Phase 3 fuzzing system provides detailed test results:

```bash
# Test contract-aware fuzzing components
npx ts-node src/test-phase3-fuzzing.ts

# Expected output:
# ✅ Semantic Generators (2ms) - 40 payloads generated
# ✅ Response Validators (3ms) - 1 error signature detected  
# ✅ Rate-Aware Budget Manager (2ms) - 17 requests tracked
# ✅ Contract-Aware Fuzzing Integration (881ms) - 6 tests executed
# ✅ Per-Endpoint Budget Compliance (2159ms) - 18% utilization
# 🔄 Vulnerability Detection (DoD Compliance) - 83% complete
# Success Rate: 83.3%
```

### Docker Deployment

```bash
# Build Docker image
docker build -t preversec .

# Run with Docker Compose
docker-compose up -d
```

## 🎯 Use Cases

### API Security Testing
- **Penetration Testing**: Automated vulnerability discovery with contract-aware fuzzing
- **Authentication Testing**: Multi-actor authentication flow validation  
- **Authorization Testing**: Role-based access control verification
- **Compliance Checking**: OWASP API Security validation
- **Regression Testing**: Continuous security validation in CI/CD

### Advanced Security Testing (Phase 3)
- **Semantic Fuzzing**: Intelligent payload generation based on parameter types
- **Contract Compliance**: Testing against OpenAPI specifications  
- **Rate Limiting Validation**: Intelligent budget management and throttling
- **False Positive Reduction**: Advanced anomaly detection with ≤10% FP rate
- **Multi-Endpoint Campaigns**: Coordinated testing across API surfaces

### Identity & Access Management (Phase 2)  
- **Multi-Actor Testing**: Simultaneous testing with different user roles
- **Credential Management**: Secure storage and rotation of test accounts
- **OAuth2/OIDC Flows**: Complete authentication protocol testing
- **Session Security**: Timeout handling and session lifecycle validation
- **Account Provisioning**: Automated test account seeding and cleanup

### API Governance
- **Spec Drift Detection**: Monitor API changes over time
- **Documentation Sync**: Keep specs aligned with implementation
- **Breaking Change Detection**: Identify compatibility issues

### Development Workflow
- **CI/CD Integration**: Automated security checks with auth context
- **Developer Feedback**: Real-time security insights with role awareness
- **Quality Gates**: Security-based deployment decisions

## 📈 Metrics & Reporting

PreveraSec provides comprehensive metrics across all phases:

### Core Metrics
- **Coverage Metrics**: Schema coverage percentage (≥90% target)
- **Security Metrics**: Vulnerability counts by severity
- **Quality Metrics**: Documentation completeness  
- **Drift Metrics**: Spec-to-runtime discrepancies

### Phase 2: Authentication Metrics
- **Authentication Success Rate**: 100% across all flows
- **Context Pool Health**: Active sessions per role
- **Credential Rotation**: Automated key rotation statistics
- **Session Lifecycle**: Timeout and refresh metrics
- **OAuth2 Flow Completion**: PKCE and state validation rates

### Phase 3: Fuzzing Metrics  
- **Test Execution Rate**: 83.3% success rate
- **False Positive Rate**: 0% (target ≤10%)
- **Payload Generation**: 40+ semantic payloads per cycle
- **Budget Utilization**: 18% average endpoint utilization
- **Vulnerability Detection**: Classification by severity and confidence
- **Rate Limiting Compliance**: Retry-After header adherence

### Real-Time Dashboards
- **Authentication Health**: Live monitoring of auth components
- **Fuzzing Campaign Progress**: Real-time test execution status
- **Budget Consumption**: Per-endpoint request usage tracking
- **Security Posture**: Vulnerability trends and remediation status

## 🚀 Development Status

### Phase 1: AppSpec++ Compiler ✅ 
- **Status**: Foundation complete
- **Core Components**: Ingestors, Enrichers, Compiler, Validator
- **Capabilities**: Multi-format API specification compilation

### Phase 2: Identity & Auth Orchestration ✅ 100% Complete
- **Status**: Production ready  
- **Success Rate**: 100% across all authentication flows
- **Components**: 6/6 fully operational
  - ✅ AuthOrchestrator - Central authentication coordination
  - ✅ CredentialVault - Encrypted credential storage with auto-rotation
  - ✅ MultiActorContextManager - Role-based context switching
  - ✅ OAuth2Manager - Complete OAuth2/OIDC flow support
  - ✅ SessionManager - Session lifecycle and timeout handling
  - ✅ TestAccountSeeder - Automated account provisioning
- **Key Achievements**: 
  - Zero credential leaks with AES-256 encryption
  - 3 context pools created (test, staging, production)
  - Automatic cleanup preventing resource exhaustion
  - Multi-actor testing with seamless role transitions

### Phase 3: Contract-Aware Fuzzing 🔄 83% Complete
- **Status**: Operational with advanced capabilities
- **Success Rate**: 83.3% (5/6 test cases passing)
- **Components**: 5/6 fully operational, 1 in final calibration
  - ✅ SemanticGenerators - 40+ intelligent payloads per cycle
  - ✅ ResponseValidators - Error signature detection operational
  - ✅ RateAwareBudgetManager - Intelligent throttling with 18% utilization
  - ✅ ContractAwareFuzzer - Main orchestrator fully functional
  - ✅ Budget Compliance - Per-endpoint limits respected
  - 🔄 Vulnerability Detection - 0% false positives (exceeds ≤10% target)
- **DoD Progress**: 5/6 criteria met, exceeding requirements in several areas
- **Next Steps**: Final calibration of vulnerability detection sensitivity

### Upcoming Phases
- **Phase 4**: Advanced Payload Generation with ML-driven mutations
- **Phase 5**: Real-time Threat Intelligence integration
- **Phase 6**: Automated Remediation Suggestions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before submitting.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## � Support & Donations

If this project helps you, please consider supporting ongoing development.

- PayPal: https://paypal.me/yashab07 (email: yashabalam707@gmail.com)
- Solana (SOL): 5pEwP9JN8tRCXL5Vc9gQrxRyHHyn7J6P2DCC8cSQKDKT
- Bitcoin (BTC): bc1qmkptg6wqn9sjlx6wf7dk0px0yq4ynr4ukj2x8c
- Other crypto: email for current addresses (see above)

Full details, tiers, and verification: see [DONATE.md](./DONATE.md).

## 🌐 Socials & Contact

ZehraSec
- Website: https://www.zehrasec.com
- Instagram: https://www.instagram.com/_zehrasec?igsh=bXM0cWl1ejdoNHM4
- Facebook: https://www.facebook.com/profile.php?id=61575580721849
- X (Twitter): https://x.com/zehrasec?t=Tp9LOesZw2d2yTZLVo0_GA&s=08
- LinkedIn: https://www.linkedin.com/company/zehrasec

Yashab Alam
- GitHub: https://github.com/yashab-cyber
- Instagram: https://www.instagram.com/yashab.alam
- LinkedIn: https://www.linkedin.com/in/yashab-alam
- Email: yashabalam707@gmail.com
- WhatsApp Channel: https://whatsapp.com/channel/0029Vaoa1GfKLaHlL0Kc8k1q

## �🙏 Acknowledgments

- **OpenAPI Initiative** for API specification standards
- **OWASP** for security testing methodologies
- **GraphQL Foundation** for query language specifications

---

**Built with ❤️ for the API security community**