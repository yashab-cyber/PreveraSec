import { AppSpec, PreveraSecConfig } from '../types/AppSpec';
/**
 * Sources for AppSpec compilation
 */
export interface CompilationSources {
    openapi?: string;
    graphql?: string;
    postman?: string;
    har?: string;
    gateway?: string;
    sourceMaps?: string;
    typescript?: string;
    source?: string;
    docs?: string;
    roles?: string;
    features?: string;
}
/**
 * AppSpec Compiler - Central engine that normalizes all inputs into unified AppSpec
 */
export declare class AppSpecCompiler {
    private logger;
    private config;
    constructor(config: PreveraSecConfig);
    /**
     * Compile multiple sources into unified AppSpec
     */
    compile(sources: CompilationSources): Promise<AppSpec>;
    /**
     * Phase 1: Ingest data from various sources
     */
    private ingestSources;
    /**
     * Phase 2: Enrich AppSpec with additional context and semantic information
     */
    private enrichAppSpec;
    /**
     * Phase 3: Normalize and resolve conflicts
     */
    private normalizeAppSpec;
    /**
     * Phase 4: Validate AppSpec completeness
     */
    private validateAppSpec;
    /**
     * Calculate coverage metrics
     */
    private calculateCoverage;
    /**
     * Save AppSpec to file
     */
    save(appSpec: AppSpec, filePath: string): Promise<void>;
    /**
     * Helper methods
     */
    private createDefaultInfo;
    private mergeIngestedData;
    private deduplicateEndpoints;
    private mergeEndpoints;
    private mergeParameters;
    private normalizeParameters;
    private resolveSecurityReferences;
    private generateOperationIds;
    private getFileModificationTime;
    private calculateChecksum;
}
//# sourceMappingURL=AppSpecCompiler.d.ts.map