import { BaseEnricher } from './BaseEnricher';
import { AppSpec } from '../types/AppSpec';
import { CompilationSources } from '../core/AppSpecCompiler';
/**
 * TypeScript Enricher
 * Analyzes TypeScript definition files for semantic type information
 */
export declare class TypeScriptEnricher extends BaseEnricher {
    private logger;
    constructor(config: any);
    getName(): string;
    isEnabled(): boolean;
    enrich(appSpec: AppSpec, sources: CompilationSources): Promise<void>;
}
//# sourceMappingURL=TypeScriptEnricher.d.ts.map