import { AppSpec, PreveraSecConfig } from '../types/AppSpec';

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
export abstract class BaseIngestor {
  protected config: PreveraSecConfig;

  constructor(config: PreveraSecConfig) {
    this.config = config;
  }

  /**
   * Ingest data from a source file/path
   */
  public abstract ingest(sourcePath: string): Promise<IngestionResult>;

  /**
   * Validate that the source is supported by this ingestor
   */
  public abstract isSupported(sourcePath: string): boolean;

  /**
   * Get the name of this ingestor for logging
   */
  public abstract getName(): string;

  /**
   * Get supported file extensions
   */
  public abstract getSupportedExtensions(): string[];

  /**
   * Preprocess source content before ingestion
   */
  protected preprocessContent(content: string): string {
    return content;
  }

  /**
   * Postprocess ingestion result
   */
  protected postprocessResult(result: IngestionResult): IngestionResult {
    return result;
  }
}
