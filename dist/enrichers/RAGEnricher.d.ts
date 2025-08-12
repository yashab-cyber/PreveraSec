import { BaseEnricher } from './BaseEnricher';
import { AppSpec } from '../types/AppSpec';
import { CompilationSources } from '../core/AppSpecCompiler';
/**
 * RAG Enricher
 * Uses Retrieval-Augmented Generation to enhance parameter and endpoint documentation
 */
export declare class RAGEnricher extends BaseEnricher {
    private logger;
    constructor(config: any);
    getName(): string;
    isEnabled(): boolean;
    enrich(appSpec: AppSpec, sources: CompilationSources): Promise<void>;
}
//# sourceMappingURL=RAGEnricher.d.ts.map