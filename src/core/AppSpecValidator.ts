import * as fs from 'fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AppSpec } from '../types/AppSpec';
import { Logger } from '../utils/Logger';

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
export class AppSpecValidator {
  private logger: Logger;
  private ajv: Ajv;
  private schemaPath: string;

  constructor(customSchemaPath?: string) {
    this.logger = Logger.getInstance();
    this.schemaPath = customSchemaPath || require.resolve('../../schemas/appspec.schema.json');
    
    // Initialize AJV with formats support
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false // Allow additional properties for extensibility
    });
    addFormats(this.ajv);
  }

  /**
   * Validate AppSpec against schema and calculate metrics
   */
  public async validate(specPath: string): Promise<ValidationResult> {
    this.logger.validator('Starting validation');

    try {
      // Load and parse AppSpec
      const appSpec = await this.loadAppSpec(specPath);
      
      // Load schema
      const schema = await this.loadSchema();
      
      // Compile validator
      const validator = this.ajv.compile(schema);
      
      // Validate against schema
      const valid = validator(appSpec);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(appSpec);
      const coverage = this.calculateCoverage(metrics);
      
      // Generate warnings
      const warnings = this.generateWarnings(appSpec, metrics);

      const result: ValidationResult = {
        valid,
        errors: valid ? undefined : validator.errors,
        warnings,
        coverage,
        metrics
      };

      this.logger.validator(`Validation completed - Valid: ${valid}, Coverage: ${coverage}%`);
      return result;

    } catch (error) {
      this.logger.error('Validation failed', error);
      throw error;
    }
  }

  /**
   * Validate AppSpec object directly
   */
  public async validateObject(appSpec: AppSpec): Promise<ValidationResult> {
    const schema = await this.loadSchema();
    const validator = this.ajv.compile(schema);
    const valid = validator(appSpec);
    
    const metrics = this.calculateMetrics(appSpec);
    const coverage = this.calculateCoverage(metrics);
    const warnings = this.generateWarnings(appSpec, metrics);

    return {
      valid,
      errors: valid ? undefined : validator.errors,
      warnings,
      coverage,
      metrics
    };
  }

  /**
   * Load AppSpec from file
   */
  private async loadAppSpec(specPath: string): Promise<AppSpec> {
    if (!fs.existsSync(specPath)) {
      throw new Error(`AppSpec file not found: ${specPath}`);
    }

    const content = fs.readFileSync(specPath, 'utf8');
    
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in AppSpec file: ${error}`);
    }
  }

  /**
   * Load validation schema
   */
  private async loadSchema(): Promise<any> {
    if (!fs.existsSync(this.schemaPath)) {
      throw new Error(`Schema file not found: ${this.schemaPath}`);
    }

    const content = fs.readFileSync(this.schemaPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Calculate validation metrics
   */
  private calculateMetrics(appSpec: AppSpec): ValidationMetrics {
    const totalEndpoints = appSpec.endpoints.length;
    const documentedEndpoints = appSpec.endpoints.filter(e => e.description || e.summary).length;
    const securedEndpoints = appSpec.endpoints.filter(e => e.security && e.security.length > 0).length;
    
    const totalParameters = appSpec.endpoints.reduce(
      (count, endpoint) => count + (endpoint.parameters?.length || 0), 
      0
    );
    
    const annotatedParameters = appSpec.endpoints.reduce(
      (count, endpoint) => count + (endpoint.parameters?.filter(p => 
        p.semantic || p.ragAnnotation || p.description
      ).length || 0), 
      0
    );

    // Schema compliance - percentage of endpoints with complete schemas
    const compliantEndpoints = appSpec.endpoints.filter(endpoint => {
      const hasParameters = endpoint.parameters && endpoint.parameters.length > 0;
      const parametersHaveSchemas = hasParameters ? 
        endpoint.parameters!.every(p => p.schema) : true;
      const hasResponses = endpoint.responses && Object.keys(endpoint.responses).length > 0;
      
      return parametersHaveSchemas && hasResponses;
    }).length;

    const schemaCompliance = totalEndpoints > 0 ? (compliantEndpoints / totalEndpoints) * 100 : 100;

    return {
      totalEndpoints,
      documentedEndpoints,
      securedEndpoints,
      totalParameters,
      annotatedParameters,
      schemaCompliance
    };
  }

  /**
   * Calculate overall coverage score
   */
  private calculateCoverage(metrics: ValidationMetrics): number {
    const { 
      totalEndpoints, 
      documentedEndpoints, 
      securedEndpoints, 
      totalParameters, 
      annotatedParameters,
      schemaCompliance 
    } = metrics;

    if (totalEndpoints === 0) return 100;

    // Weighted scoring
    const documentationScore = (documentedEndpoints / totalEndpoints) * 100;
    const securityScore = (securedEndpoints / totalEndpoints) * 100;
    const annotationScore = totalParameters > 0 ? 
      (annotatedParameters / totalParameters) * 100 : 100;

    // Combined score with weights
    const coverage = (
      documentationScore * 0.3 +  // 30% weight for documentation
      securityScore * 0.2 +       // 20% weight for security
      annotationScore * 0.2 +     // 20% weight for parameter annotations
      schemaCompliance * 0.3      // 30% weight for schema compliance
    );

    return Math.round(coverage);
  }

  /**
   * Generate validation warnings
   */
  private generateWarnings(appSpec: AppSpec, metrics: ValidationMetrics): string[] {
    const warnings: string[] = [];
    const { 
      totalEndpoints, 
      documentedEndpoints, 
      securedEndpoints, 
      totalParameters, 
      annotatedParameters 
    } = metrics;

    // Documentation warnings
    if (documentedEndpoints / totalEndpoints < 0.8) {
      warnings.push(`Only ${documentedEndpoints}/${totalEndpoints} endpoints have documentation`);
    }

    // Security warnings
    if (securedEndpoints / totalEndpoints < 0.5) {
      warnings.push(`Only ${securedEndpoints}/${totalEndpoints} endpoints have security defined`);
    }

    // Parameter annotation warnings
    if (totalParameters > 0 && annotatedParameters / totalParameters < 0.6) {
      warnings.push(`Only ${annotatedParameters}/${totalParameters} parameters are annotated`);
    }

    // Endpoint without IDs
    const endpointsWithoutIds = appSpec.endpoints.filter(e => !e.operationId).length;
    if (endpointsWithoutIds > 0) {
      warnings.push(`${endpointsWithoutIds} endpoints lack operation IDs`);
    }

    // Missing semantic types
    const totalSemanticParams = appSpec.endpoints.reduce((count, e) => 
      count + (e.parameters?.filter(p => p.semantic).length || 0), 0);
    
    if (totalParameters > 0 && totalSemanticParams / totalParameters < 0.3) {
      warnings.push(`Only ${totalSemanticParams}/${totalParameters} parameters have semantic types`);
    }

    // Rate limiting warnings
    const endpointsWithRateLimit = appSpec.endpoints.filter(e => e.rateLimit).length;
    if (endpointsWithRateLimit / totalEndpoints < 0.2) {
      warnings.push('Consider adding rate limiting to more endpoints');
    }

    // Compliance warnings
    const endpointsWithCompliance = appSpec.endpoints.filter(e => 
      e.semantics?.complianceRequirements && e.semantics.complianceRequirements.length > 0
    ).length;
    
    if (endpointsWithCompliance === 0) {
      warnings.push('No compliance requirements specified for any endpoints');
    }

    return warnings;
  }

  /**
   * Generate validation report
   */
  public generateReport(result: ValidationResult): string {
    const { valid, coverage, metrics, warnings } = result;
    
    let report = `AppSpec Validation Report\n`;
    report += `========================\n\n`;
    
    report += `Overall Status: ${valid ? '✅ VALID' : '❌ INVALID'}\n`;
    report += `Coverage Score: ${coverage}%\n\n`;
    
    report += `Metrics:\n`;
    report += `- Total Endpoints: ${metrics.totalEndpoints}\n`;
    report += `- Documented Endpoints: ${metrics.documentedEndpoints} (${Math.round(metrics.documentedEndpoints/metrics.totalEndpoints*100)}%)\n`;
    report += `- Secured Endpoints: ${metrics.securedEndpoints} (${Math.round(metrics.securedEndpoints/metrics.totalEndpoints*100)}%)\n`;
    report += `- Total Parameters: ${metrics.totalParameters}\n`;
    report += `- Annotated Parameters: ${metrics.annotatedParameters} (${Math.round(metrics.annotatedParameters/metrics.totalParameters*100)}%)\n`;
    report += `- Schema Compliance: ${Math.round(metrics.schemaCompliance)}%\n\n`;
    
    if (warnings && warnings.length > 0) {
      report += `Warnings:\n`;
      warnings.forEach(warning => {
        report += `⚠️  ${warning}\n`;
      });
      report += '\n';
    }
    
    if (!valid && result.errors) {
      report += `Validation Errors:\n`;
      result.errors.forEach(error => {
        report += `❌ ${error.instancePath || 'root'}: ${error.message}\n`;
      });
    }
    
    return report;
  }

  /**
   * Check if AppSpec meets quality threshold
   */
  public meetsQualityThreshold(result: ValidationResult, threshold: number = 90): boolean {
    return result.valid && result.coverage >= threshold;
  }

  /**
   * Get quality recommendations
   */
  public getRecommendations(result: ValidationResult): string[] {
    const recommendations: string[] = [];
    const { metrics } = result;
    
    if (metrics.documentedEndpoints / metrics.totalEndpoints < 0.9) {
      recommendations.push('Add descriptions to undocumented endpoints');
    }
    
    if (metrics.securedEndpoints / metrics.totalEndpoints < 0.8) {
      recommendations.push('Define security requirements for more endpoints');
    }
    
    if (metrics.annotatedParameters / metrics.totalParameters < 0.7) {
      recommendations.push('Add semantic types and descriptions to parameters');
    }
    
    if (metrics.schemaCompliance < 80) {
      recommendations.push('Improve schema definitions for requests and responses');
    }
    
    return recommendations;
  }
}
