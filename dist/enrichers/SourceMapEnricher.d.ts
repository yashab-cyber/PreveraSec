import { BaseEnricher } from './BaseEnricher';
import { AppSpec } from '../types/AppSpec';
import { CompilationSources } from '../core/AppSpecCompiler';
/**
 * Source Map Enricher
 * Analyzes source maps to understand frontend-backend API relationships
 */
export declare class SourceMapEnricher extends BaseEnricher {
    private logger;
    constructor(config: any);
    getName(): string;
    isEnabled(): boolean;
    enrich(appSpec: AppSpec, sources: CompilationSources): Promise<void>;
}
//# sourceMappingURL=SourceMapEnricher.d.ts.map