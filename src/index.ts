/**
 * PreveraSec - AppSpec++ Full Grey-Box Context Compiler
 * Main entry point for the library
 */

// Core exports
export { AppSpecCompiler, CompilationSources } from './core/AppSpecCompiler';
export { AppSpecValidator, ValidationResult, ValidationMetrics } from './core/AppSpecValidator';
export { DiffTool, DiffResult } from './core/DiffTool';

// DAST exports
export { DASTScanner, DASTScanOptions, DASTScanResult, Vulnerability } from './dast/DASTScanner';

// Server exports
export { PreveraSecServer } from './server/PreveraSecServer';

// Ingestor exports
export { BaseIngestor, IngestionResult } from './ingestors/BaseIngestor';
export { OpenAPIIngestor } from './ingestors/OpenAPIIngestor';
export { GraphQLIngestor } from './ingestors/GraphQLIngestor';
export { PostmanIngestor } from './ingestors/PostmanIngestor';
export { HARIngestor } from './ingestors/HARIngestor';
export { GatewayIngestor } from './ingestors/GatewayIngestor';

// Enricher exports
export { BaseEnricher } from './enrichers/BaseEnricher';
export { SourceMapEnricher } from './enrichers/SourceMapEnricher';
export { TypeScriptEnricher } from './enrichers/TypeScriptEnricher';
export { CodeDiscoveryEnricher } from './enrichers/CodeDiscoveryEnricher';
export { RAGEnricher } from './enrichers/RAGEnricher';

// Utility exports
export { Logger } from './utils/Logger';
export { ConfigManager } from './utils/ConfigManager';

// Type exports
export * from './types/AppSpec';

// Version
export const version = require('../package.json').version;
