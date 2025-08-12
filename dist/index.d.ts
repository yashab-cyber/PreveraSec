/**
 * PreveraSec - AppSpec++ Full Grey-Box Context Compiler
 * Main entry point for the library
 */
export { AppSpecCompiler, CompilationSources } from './core/AppSpecCompiler';
export { AppSpecValidator, ValidationResult, ValidationMetrics } from './core/AppSpecValidator';
export { DiffTool, DiffResult } from './core/DiffTool';
export { DASTScanner, DASTScanOptions, DASTScanResult, Vulnerability } from './dast/DASTScanner';
export { PreveraSecServer } from './server/PreveraSecServer';
export { BaseIngestor, IngestionResult } from './ingestors/BaseIngestor';
export { OpenAPIIngestor } from './ingestors/OpenAPIIngestor';
export { GraphQLIngestor } from './ingestors/GraphQLIngestor';
export { PostmanIngestor } from './ingestors/PostmanIngestor';
export { HARIngestor } from './ingestors/HARIngestor';
export { GatewayIngestor } from './ingestors/GatewayIngestor';
export { BaseEnricher } from './enrichers/BaseEnricher';
export { SourceMapEnricher } from './enrichers/SourceMapEnricher';
export { TypeScriptEnricher } from './enrichers/TypeScriptEnricher';
export { CodeDiscoveryEnricher } from './enrichers/CodeDiscoveryEnricher';
export { RAGEnricher } from './enrichers/RAGEnricher';
export { Logger } from './utils/Logger';
export { ConfigManager } from './utils/ConfigManager';
export * from './types/AppSpec';
export declare const version: any;
//# sourceMappingURL=index.d.ts.map