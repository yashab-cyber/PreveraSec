import { AppSpec, PreveraSecConfig } from '../types/AppSpec';
import { CompilationSources } from '../core/AppSpecCompiler';

/**
 * Base interface for all enrichers
 * Enrichers add additional context and semantic information to the AppSpec
 */
export abstract class BaseEnricher {
  protected config: PreveraSecConfig;

  constructor(config: PreveraSecConfig) {
    this.config = config;
  }

  /**
   * Enrich the AppSpec with additional information
   */
  public abstract enrich(appSpec: AppSpec, sources: CompilationSources): Promise<void>;

  /**
   * Get the name of this enricher for logging
   */
  public abstract getName(): string;

  /**
   * Check if this enricher is enabled in the configuration
   */
  public abstract isEnabled(): boolean;

  /**
   * Get priority for enricher execution order (lower = higher priority)
   */
  public getPriority(): number {
    return 100;
  }
}
