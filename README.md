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

### 📊 Intelligent Analysis
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

### Docker Deployment

```bash
# Build Docker image
docker build -t preversec .

# Run with Docker Compose
docker-compose up -d
```

## 🎯 Use Cases

### API Security Testing
- **Penetration Testing**: Automated vulnerability discovery
- **Compliance Checking**: OWASP API Security validation
- **Regression Testing**: Continuous security validation

### API Governance
- **Spec Drift Detection**: Monitor API changes over time
- **Documentation Sync**: Keep specs aligned with implementation
- **Breaking Change Detection**: Identify compatibility issues

### Development Workflow
- **CI/CD Integration**: Automated security checks
- **Developer Feedback**: Real-time security insights
- **Quality Gates**: Security-based deployment decisions

## 📈 Metrics & Reporting

PreveraSec provides comprehensive metrics:

- **Coverage Metrics**: Schema coverage percentage
- **Security Metrics**: Vulnerability counts by severity
- **Quality Metrics**: Documentation completeness
- **Drift Metrics**: Spec-to-runtime discrepancies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAPI Initiative** for API specification standards
- **OWASP** for security testing methodologies
- **GraphQL Foundation** for query language specifications

---

**Built with ❤️ for the API security community**