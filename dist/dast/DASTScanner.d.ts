import { PreveraSecConfig } from '../types/AppSpec';
/**
 * DAST scan options
 */
export interface DASTScanOptions {
    specPath: string;
    target: string;
    maxDepth: number;
    maxConcurrent: number;
    timeout: number;
    auth?: string;
    customHeaders: Record<string, string>;
}
/**
 * DAST scan result
 */
export interface DASTScanResult {
    target: string;
    startTime: string;
    endTime: string;
    summary: ScanSummary;
    vulnerabilities: Vulnerability[];
    coverage: CoverageReport;
    endpoints: EndpointResult[];
}
export interface ScanSummary {
    testsRun: number;
    vulnerabilities: Vulnerability[];
    coverage: number;
    duration: number;
}
export interface Vulnerability {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    endpoint: string;
    method: string;
    description: string;
    impact: string;
    remediation: string;
    evidence: any;
    cwe?: string;
    owasp?: string;
}
export interface CoverageReport {
    totalEndpoints: number;
    testedEndpoints: number;
    skippedEndpoints: string[];
    percentage: number;
}
export interface EndpointResult {
    endpoint: string;
    method: string;
    status: 'tested' | 'skipped' | 'failed';
    responseTime: number;
    statusCode?: number;
    vulnerabilities: Vulnerability[];
    tests: TestResult[];
}
export interface TestResult {
    name: string;
    passed: boolean;
    description: string;
    evidence?: any;
}
/**
 * Context-Aware DAST Scanner
 * Uses AppSpec to perform intelligent security testing
 */
export declare class DASTScanner {
    private logger;
    private config;
    private httpClient;
    private vulnerabilityId;
    constructor(config: PreveraSecConfig);
    /**
     * Perform DAST scan using AppSpec context
     */
    scan(options: DASTScanOptions): Promise<DASTScanResult>;
    /**
     * Test individual endpoint
     */
    private testEndpoint;
    /**
     * Run security tests for an endpoint
     */
    private runSecurityTests;
    /**
     * Test for SQL injection vulnerabilities
     */
    private testSQLInjection;
    /**
     * Test for XSS vulnerabilities
     */
    private testXSS;
    /**
     * Test for authentication bypass
     */
    private testAuthBypass;
    /**
     * Test parameter manipulation
     */
    private testParameterManipulation;
    /**
     * Test rate limiting
     */
    private testRateLimiting;
    /**
     * Test for sensitive data exposure
     */
    private testSensitiveDataExposure;
    /**
     * Test for CSRF vulnerabilities
     */
    private testCSRF;
    /**
     * Test file upload vulnerabilities
     */
    private testFileUpload;
    /**
     * Helper methods
     */
    private loadAppSpec;
    private setupHttpClient;
    private buildUrl;
    private makeRequest;
    private createBatches;
    /**
     * Save scan results to file
     */
    saveResults(results: DASTScanResult, filePath: string): Promise<void>;
}
//# sourceMappingURL=DASTScanner.d.ts.map