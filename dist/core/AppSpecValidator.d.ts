import { AppSpec } from '../types/AppSpec';
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors?: any[];
    warnings?: string[];
    coverage: number;
    metrics: ValidationMetrics;
}
export interface ValidationMetrics {
    totalEndpoints: number;
    documentedEndpoints: number;
    securedEndpoints: number;
    totalParameters: number;
    annotatedParameters: number;
    schemaCompliance: number;
}
/**
 * AppSpec Validator
 * Validates AppSpec against schema and calculates completeness metrics
 */
export declare class AppSpecValidator {
    private logger;
    private ajv;
    private schemaPath;
    constructor(customSchemaPath?: string);
    /**
     * Validate AppSpec against schema and calculate metrics
     */
    validate(specPath: string): Promise<ValidationResult>;
    /**
     * Validate AppSpec object directly
     */
    validateObject(appSpec: AppSpec): Promise<ValidationResult>;
    /**
     * Load AppSpec from file
     */
    private loadAppSpec;
    /**
     * Load validation schema
     */
    private loadSchema;
    /**
     * Calculate validation metrics
     */
    private calculateMetrics;
    /**
     * Calculate overall coverage score
     */
    private calculateCoverage;
    /**
     * Generate validation warnings
     */
    private generateWarnings;
    /**
     * Generate validation report
     */
    generateReport(result: ValidationResult): string;
    /**
     * Check if AppSpec meets quality threshold
     */
    meetsQualityThreshold(result: ValidationResult, threshold?: number): boolean;
    /**
     * Get quality recommendations
     */
    getRecommendations(result: ValidationResult): string[];
}
//# sourceMappingURL=AppSpecValidator.d.ts.map