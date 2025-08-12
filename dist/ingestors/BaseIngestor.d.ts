import { PreveraSecConfig } from '../types/AppSpec';
/**
 * Result from ingestion process
 */
export interface IngestionResult {
    endpoints?: any[];
    parameters?: Record<string, any>;
    security?: Record<string, any>;
    components?: any;
    info?: any;
    metadata?: any;
}
/**
 * Base interface for all ingestors
 * Ingestors are responsible for extracting API information from various sources
 */
export declare abstract class BaseIngestor {
    protected config: PreveraSecConfig;
    constructor(config: PreveraSecConfig);
    /**
     * Ingest data from a source file/path
     */
    abstract ingest(sourcePath: string): Promise<IngestionResult>;
    /**
     * Validate that the source is supported by this ingestor
     */
    abstract isSupported(sourcePath: string): boolean;
    /**
     * Get the name of this ingestor for logging
     */
    abstract getName(): string;
    /**
     * Get supported file extensions
     */
    abstract getSupportedExtensions(): string[];
    /**
     * Preprocess source content before ingestion
     */
    protected preprocessContent(content: string): string;
    /**
     * Postprocess ingestion result
     */
    protected postprocessResult(result: IngestionResult): IngestionResult;
}
//# sourceMappingURL=BaseIngestor.d.ts.map