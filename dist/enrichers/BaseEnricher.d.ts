import { AppSpec, PreveraSecConfig } from '../types/AppSpec';
import { CompilationSources } from '../core/AppSpecCompiler';
/**
 * Base interface for all enrichers
 * Enrichers add additional context and semantic information to the AppSpec
 */
export declare abstract class BaseEnricher {
    protected config: PreveraSecConfig;
    constructor(config: PreveraSecConfig);
    /**
     * Enrich the AppSpec with additional information
     */
    abstract enrich(appSpec: AppSpec, sources: CompilationSources): Promise<void>;
    /**
     * Get the name of this enricher for logging
     */
    abstract getName(): string;
    /**
     * Check if this enricher is enabled in the configuration
     */
    abstract isEnabled(): boolean;
    /**
     * Get priority for enricher execution order (lower = higher priority)
     */
    getPriority(): number;
}
//# sourceMappingURL=BaseEnricher.d.ts.map