import { BaseEnricher } from './BaseEnricher';
import { AppSpec } from '../types/AppSpec';
import { CompilationSources } from '../core/AppSpecCompiler';
/**
 * Code Discovery Enricher
 * Performs safe, read-only static analysis of source code to find hidden endpoints
 */
export declare class CodeDiscoveryEnricher extends BaseEnricher {
    private logger;
    constructor(config: any);
    getName(): string;
    isEnabled(): boolean;
    enrich(appSpec: AppSpec, sources: CompilationSources): Promise<void>;
}
//# sourceMappingURL=CodeDiscoveryEnricher.d.ts.map