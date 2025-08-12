import { Endpoint, PreveraSecConfig } from '../types/AppSpec';
/**
 * Diff comparison result
 */
export interface DiffResult {
    specPath: string;
    runtimeUrl: string;
    timestamp: string;
    differences: Difference[];
    newEndpoints: RuntimeEndpoint[];
    missingEndpoints: Endpoint[];
    modifiedEndpoints: EndpointDiff[];
    summary: DiffSummary;
}
export interface Difference {
    type: 'new-endpoint' | 'missing-endpoint' | 'parameter-change' | 'response-change' | 'security-change';
    severity: 'low' | 'medium' | 'high';
    description: string;
    specEndpoint?: Endpoint;
    runtimeEndpoint?: RuntimeEndpoint;
    details: any;
}
export interface RuntimeEndpoint {
    path: string;
    method: string;
    discoveryMethod: 'options' | 'crawling' | 'error-analysis';
    responseCode: number;
    responseTime: number;
    headers: Record<string, string>;
    detectedParameters?: RuntimeParameter[];
}
export interface RuntimeParameter {
    name: string;
    in: 'query' | 'header' | 'path';
    required: boolean;
    type: string;
    discoveryMethod: string;
}
export interface EndpointDiff {
    endpoint: string;
    method: string;
    changes: EndpointChange[];
}
export interface EndpointChange {
    type: 'parameter-added' | 'parameter-removed' | 'response-changed' | 'security-changed';
    description: string;
    before: any;
    after: any;
}
export interface DiffSummary {
    totalDifferences: number;
    newEndpoints: number;
    missingEndpoints: number;
    modifiedEndpoints: number;
    criticalDifferences: number;
    specCoverage: number;
}
/**
 * Diff Tool - Compare AppSpec against runtime behavior
 */
export declare class DiffTool {
    private logger;
    private config;
    constructor(config: PreveraSecConfig);
    /**
     * Compare AppSpec against runtime API
     */
    compare(specPath: string, runtimeUrl: string): Promise<DiffResult>;
    /**
     * Discover runtime endpoints through various methods
     */
    private discoverRuntimeEndpoints;
    /**
     * Discover endpoints using OPTIONS method
     */
    private discoverViaOptions;
    /**
     * Discover endpoints by crawling common paths
     */
    private discoverViaCrawling;
    /**
     * Discover endpoints through error analysis
     */
    private discoverViaErrors;
    /**
     * Compare discovered endpoints with AppSpec
     */
    private compareEndpoints;
    /**
     * Compare details of matching endpoints
     */
    private compareEndpointDetails;
    /**
     * Generate diff report in various formats
     */
    generateReport(diff: DiffResult, outputPath: string, format?: string): Promise<void>;
    /**
     * Generate HTML report
     */
    private generateHTMLReport;
    /**
     * Generate JSON report
     */
    private generateJSONReport;
    /**
     * Generate text report
     */
    private generateTextReport;
    /**
     * Helper methods
     */
    private loadAppSpec;
    private normalizePathForComparison;
    private deduplicateEndpoints;
    private analyzeParameters;
    private analyzeErrorResponse;
    private getSeverityForChange;
    private calculateSummary;
    private normalizeHeaders;
}
//# sourceMappingURL=DiffTool.d.ts.map