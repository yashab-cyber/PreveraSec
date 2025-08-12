"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSpecValidator = void 0;
const fs = __importStar(require("fs"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const Logger_1 = require("../utils/Logger");
/**
 * AppSpec Validator
 * Validates AppSpec against schema and calculates completeness metrics
 */
class AppSpecValidator {
    constructor(customSchemaPath) {
        this.logger = Logger_1.Logger.getInstance();
        this.schemaPath = customSchemaPath || require.resolve('../../schemas/appspec.schema.json');
        // Initialize AJV with formats support
        this.ajv = new ajv_1.default({
            allErrors: true,
            verbose: true,
            strict: false // Allow additional properties for extensibility
        });
        (0, ajv_formats_1.default)(this.ajv);
    }
    /**
     * Validate AppSpec against schema and calculate metrics
     */
    async validate(specPath) {
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
            const result = {
                valid,
                errors: valid ? undefined : validator.errors,
                warnings,
                coverage,
                metrics
            };
            this.logger.validator(`Validation completed - Valid: ${valid}, Coverage: ${coverage}%`);
            return result;
        }
        catch (error) {
            this.logger.error('Validation failed', error);
            throw error;
        }
    }
    /**
     * Validate AppSpec object directly
     */
    async validateObject(appSpec) {
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
    async loadAppSpec(specPath) {
        if (!fs.existsSync(specPath)) {
            throw new Error(`AppSpec file not found: ${specPath}`);
        }
        const content = fs.readFileSync(specPath, 'utf8');
        try {
            return JSON.parse(content);
        }
        catch (error) {
            throw new Error(`Invalid JSON in AppSpec file: ${error}`);
        }
    }
    /**
     * Load validation schema
     */
    async loadSchema() {
        if (!fs.existsSync(this.schemaPath)) {
            throw new Error(`Schema file not found: ${this.schemaPath}`);
        }
        const content = fs.readFileSync(this.schemaPath, 'utf8');
        return JSON.parse(content);
    }
    /**
     * Calculate validation metrics
     */
    calculateMetrics(appSpec) {
        const totalEndpoints = appSpec.endpoints.length;
        const documentedEndpoints = appSpec.endpoints.filter(e => e.description || e.summary).length;
        const securedEndpoints = appSpec.endpoints.filter(e => e.security && e.security.length > 0).length;
        const totalParameters = appSpec.endpoints.reduce((count, endpoint) => count + (endpoint.parameters?.length || 0), 0);
        const annotatedParameters = appSpec.endpoints.reduce((count, endpoint) => count + (endpoint.parameters?.filter(p => p.semantic || p.ragAnnotation || p.description).length || 0), 0);
        // Schema compliance - percentage of endpoints with complete schemas
        const compliantEndpoints = appSpec.endpoints.filter(endpoint => {
            const hasParameters = endpoint.parameters && endpoint.parameters.length > 0;
            const parametersHaveSchemas = hasParameters ?
                endpoint.parameters.every(p => p.schema) : true;
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
    calculateCoverage(metrics) {
        const { totalEndpoints, documentedEndpoints, securedEndpoints, totalParameters, annotatedParameters, schemaCompliance } = metrics;
        if (totalEndpoints === 0)
            return 100;
        // Weighted scoring
        const documentationScore = (documentedEndpoints / totalEndpoints) * 100;
        const securityScore = (securedEndpoints / totalEndpoints) * 100;
        const annotationScore = totalParameters > 0 ?
            (annotatedParameters / totalParameters) * 100 : 100;
        // Combined score with weights
        const coverage = (documentationScore * 0.3 + // 30% weight for documentation
            securityScore * 0.2 + // 20% weight for security
            annotationScore * 0.2 + // 20% weight for parameter annotations
            schemaCompliance * 0.3 // 30% weight for schema compliance
        );
        return Math.round(coverage);
    }
    /**
     * Generate validation warnings
     */
    generateWarnings(appSpec, metrics) {
        const warnings = [];
        const { totalEndpoints, documentedEndpoints, securedEndpoints, totalParameters, annotatedParameters } = metrics;
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
        const totalSemanticParams = appSpec.endpoints.reduce((count, e) => count + (e.parameters?.filter(p => p.semantic).length || 0), 0);
        if (totalParameters > 0 && totalSemanticParams / totalParameters < 0.3) {
            warnings.push(`Only ${totalSemanticParams}/${totalParameters} parameters have semantic types`);
        }
        // Rate limiting warnings
        const endpointsWithRateLimit = appSpec.endpoints.filter(e => e.rateLimit).length;
        if (endpointsWithRateLimit / totalEndpoints < 0.2) {
            warnings.push('Consider adding rate limiting to more endpoints');
        }
        // Compliance warnings
        const endpointsWithCompliance = appSpec.endpoints.filter(e => e.semantics?.complianceRequirements && e.semantics.complianceRequirements.length > 0).length;
        if (endpointsWithCompliance === 0) {
            warnings.push('No compliance requirements specified for any endpoints');
        }
        return warnings;
    }
    /**
     * Generate validation report
     */
    generateReport(result) {
        const { valid, coverage, metrics, warnings } = result;
        let report = `AppSpec Validation Report\n`;
        report += `========================\n\n`;
        report += `Overall Status: ${valid ? '✅ VALID' : '❌ INVALID'}\n`;
        report += `Coverage Score: ${coverage}%\n\n`;
        report += `Metrics:\n`;
        report += `- Total Endpoints: ${metrics.totalEndpoints}\n`;
        report += `- Documented Endpoints: ${metrics.documentedEndpoints} (${Math.round(metrics.documentedEndpoints / metrics.totalEndpoints * 100)}%)\n`;
        report += `- Secured Endpoints: ${metrics.securedEndpoints} (${Math.round(metrics.securedEndpoints / metrics.totalEndpoints * 100)}%)\n`;
        report += `- Total Parameters: ${metrics.totalParameters}\n`;
        report += `- Annotated Parameters: ${metrics.annotatedParameters} (${Math.round(metrics.annotatedParameters / metrics.totalParameters * 100)}%)\n`;
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
    meetsQualityThreshold(result, threshold = 90) {
        return result.valid && result.coverage >= threshold;
    }
    /**
     * Get quality recommendations
     */
    getRecommendations(result) {
        const recommendations = [];
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
exports.AppSpecValidator = AppSpecValidator;
//# sourceMappingURL=AppSpecValidator.js.map