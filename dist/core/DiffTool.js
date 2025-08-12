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
exports.DiffTool = void 0;
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const Logger_1 = require("../utils/Logger");
/**
 * Diff Tool - Compare AppSpec against runtime behavior
 */
class DiffTool {
    constructor(config) {
        this.config = config;
        this.logger = Logger_1.Logger.getInstance();
    }
    /**
     * Compare AppSpec against runtime API
     */
    async compare(specPath, runtimeUrl) {
        this.logger.info('Starting spec vs runtime comparison');
        try {
            // Load AppSpec
            const appSpec = await this.loadAppSpec(specPath);
            // Discover runtime endpoints
            const runtimeEndpoints = await this.discoverRuntimeEndpoints(runtimeUrl);
            // Initialize diff result
            const diffResult = {
                specPath,
                runtimeUrl,
                timestamp: new Date().toISOString(),
                differences: [],
                newEndpoints: [],
                missingEndpoints: [],
                modifiedEndpoints: [],
                summary: {
                    totalDifferences: 0,
                    newEndpoints: 0,
                    missingEndpoints: 0,
                    modifiedEndpoints: 0,
                    criticalDifferences: 0,
                    specCoverage: 0
                }
            };
            // Compare endpoints
            await this.compareEndpoints(appSpec, runtimeEndpoints, diffResult);
            // Calculate summary
            this.calculateSummary(diffResult);
            this.logger.info('Comparison completed', {
                differences: diffResult.differences.length,
                newEndpoints: diffResult.newEndpoints.length,
                missingEndpoints: diffResult.missingEndpoints.length
            });
            return diffResult;
        }
        catch (error) {
            this.logger.error('Comparison failed', error);
            throw error;
        }
    }
    /**
     * Discover runtime endpoints through various methods
     */
    async discoverRuntimeEndpoints(baseUrl) {
        const endpoints = [];
        // Method 1: OPTIONS discovery
        await this.discoverViaOptions(baseUrl, endpoints);
        // Method 2: Common endpoint crawling
        await this.discoverViaCrawling(baseUrl, endpoints);
        // Method 3: Error-based discovery
        await this.discoverViaErrors(baseUrl, endpoints);
        return this.deduplicateEndpoints(endpoints);
    }
    /**
     * Discover endpoints using OPTIONS method
     */
    async discoverViaOptions(baseUrl, endpoints) {
        try {
            const response = await axios_1.default.options(baseUrl, {
                timeout: this.config.dast.timeout
            });
            const allowHeader = response.headers['allow'];
            if (allowHeader) {
                const methods = allowHeader.split(',').map(m => m.trim());
                for (const method of methods) {
                    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                        endpoints.push({
                            path: '/',
                            method,
                            discoveryMethod: 'options',
                            responseCode: response.status,
                            responseTime: 0, // Would measure in real implementation
                            headers: this.normalizeHeaders(response.headers),
                            detectedParameters: []
                        });
                    }
                }
            }
        }
        catch (error) {
            this.logger.debug('OPTIONS discovery failed', error);
        }
    }
    /**
     * Discover endpoints by crawling common paths
     */
    async discoverViaCrawling(baseUrl, endpoints) {
        const commonPaths = [
            '/api/v1', '/api/v2', '/api',
            '/users', '/user', '/auth', '/login', '/register',
            '/products', '/orders', '/payments',
            '/admin', '/dashboard', '/health', '/status',
            '/docs', '/swagger', '/openapi.json'
        ];
        const methods = ['GET', 'POST'];
        for (const path of commonPaths) {
            for (const method of methods) {
                try {
                    const url = `${baseUrl}${path}`;
                    const response = await axios_1.default.request({
                        method: method.toLowerCase(),
                        url,
                        timeout: this.config.dast.timeout,
                        validateStatus: () => true // Accept all status codes
                    });
                    // Consider it discovered if it doesn't return 404
                    if (response.status !== 404) {
                        endpoints.push({
                            path,
                            method,
                            discoveryMethod: 'crawling',
                            responseCode: response.status,
                            responseTime: 0,
                            headers: this.normalizeHeaders(response.headers),
                            detectedParameters: await this.analyzeParameters(response)
                        });
                    }
                }
                catch (error) {
                    // Continue with other paths
                }
            }
        }
    }
    /**
     * Discover endpoints through error analysis
     */
    async discoverViaErrors(baseUrl, endpoints) {
        try {
            // Send malformed requests to trigger error messages that might reveal endpoints
            const testUrls = [
                `${baseUrl}/nonexistent-endpoint-12345`,
                `${baseUrl}/api/nonexistent`,
                `${baseUrl}/../admin`
            ];
            for (const url of testUrls) {
                try {
                    const response = await axios_1.default.get(url, {
                        timeout: this.config.dast.timeout,
                        validateStatus: () => true
                    });
                    // Analyze error responses for endpoint hints
                    const errorAnalysis = this.analyzeErrorResponse(response);
                    endpoints.push(...errorAnalysis);
                }
                catch (error) {
                    // Continue
                }
            }
        }
        catch (error) {
            this.logger.debug('Error-based discovery failed', error);
        }
    }
    /**
     * Compare discovered endpoints with AppSpec
     */
    async compareEndpoints(appSpec, runtimeEndpoints, result) {
        // Find new endpoints (in runtime but not in spec)
        for (const runtimeEndpoint of runtimeEndpoints) {
            const specEndpoint = appSpec.endpoints.find(e => this.normalizePathForComparison(e.path) === this.normalizePathForComparison(runtimeEndpoint.path) &&
                e.method === runtimeEndpoint.method);
            if (!specEndpoint) {
                result.newEndpoints.push(runtimeEndpoint);
                result.differences.push({
                    type: 'new-endpoint',
                    severity: 'medium',
                    description: `New endpoint discovered: ${runtimeEndpoint.method} ${runtimeEndpoint.path}`,
                    runtimeEndpoint,
                    details: {
                        discoveryMethod: runtimeEndpoint.discoveryMethod,
                        responseCode: runtimeEndpoint.responseCode
                    }
                });
            }
        }
        // Find missing endpoints (in spec but not in runtime)
        for (const specEndpoint of appSpec.endpoints) {
            const runtimeEndpoint = runtimeEndpoints.find(e => this.normalizePathForComparison(e.path) === this.normalizePathForComparison(specEndpoint.path) &&
                e.method === specEndpoint.method);
            if (!runtimeEndpoint) {
                result.missingEndpoints.push(specEndpoint);
                result.differences.push({
                    type: 'missing-endpoint',
                    severity: 'high',
                    description: `Endpoint missing from runtime: ${specEndpoint.method} ${specEndpoint.path}`,
                    specEndpoint,
                    details: {
                        documented: true,
                        deprecated: specEndpoint.deprecated
                    }
                });
            }
        }
        // Find modified endpoints
        for (const specEndpoint of appSpec.endpoints) {
            const runtimeEndpoint = runtimeEndpoints.find(e => this.normalizePathForComparison(e.path) === this.normalizePathForComparison(specEndpoint.path) &&
                e.method === specEndpoint.method);
            if (runtimeEndpoint) {
                const changes = await this.compareEndpointDetails(specEndpoint, runtimeEndpoint);
                if (changes.length > 0) {
                    result.modifiedEndpoints.push({
                        endpoint: specEndpoint.path,
                        method: specEndpoint.method,
                        changes
                    });
                    // Add differences for each change
                    changes.forEach(change => {
                        result.differences.push({
                            type: change.type,
                            severity: this.getSeverityForChange(change.type),
                            description: change.description,
                            specEndpoint,
                            runtimeEndpoint,
                            details: { before: change.before, after: change.after }
                        });
                    });
                }
            }
        }
    }
    /**
     * Compare details of matching endpoints
     */
    async compareEndpointDetails(specEndpoint, runtimeEndpoint) {
        const changes = [];
        // Compare parameters
        const specParams = specEndpoint.parameters || [];
        const runtimeParams = runtimeEndpoint.detectedParameters || [];
        // Check for missing parameters in runtime
        for (const specParam of specParams) {
            const runtimeParam = runtimeParams.find(p => p.name === specParam.name && p.in === specParam.in);
            if (!runtimeParam && specParam.required) {
                changes.push({
                    type: 'parameter-removed',
                    description: `Required parameter '${specParam.name}' not found in runtime`,
                    before: specParam,
                    after: null
                });
            }
        }
        // Check for new parameters in runtime
        for (const runtimeParam of runtimeParams) {
            const specParam = specParams.find(p => p.name === runtimeParam.name && p.in === runtimeParam.in);
            if (!specParam) {
                changes.push({
                    type: 'parameter-added',
                    description: `New parameter '${runtimeParam.name}' found in runtime`,
                    before: null,
                    after: runtimeParam
                });
            }
        }
        return changes;
    }
    /**
     * Generate diff report in various formats
     */
    async generateReport(diff, outputPath, format = 'html') {
        switch (format.toLowerCase()) {
            case 'html':
                await this.generateHTMLReport(diff, outputPath);
                break;
            case 'json':
                await this.generateJSONReport(diff, outputPath);
                break;
            case 'text':
                await this.generateTextReport(diff, outputPath);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    /**
     * Generate HTML report
     */
    async generateHTMLReport(diff, outputPath) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>PreveraSec Diff Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0; color: #1f77b4; }
        .section { margin: 30px 0; }
        .endpoint { background: #f9f9f9; padding: 10px; margin: 10px 0; border-left: 4px solid #ccc; }
        .new { border-left-color: #28a745; }
        .missing { border-left-color: #dc3545; }
        .modified { border-left-color: #ffc107; }
        .severity-high { color: #dc3545; }
        .severity-medium { color: #ffc107; }
        .severity-low { color: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PreveraSec Diff Report</h1>
        <p><strong>Spec:</strong> ${diff.specPath}</p>
        <p><strong>Runtime:</strong> ${diff.runtimeUrl}</p>
        <p><strong>Generated:</strong> ${diff.timestamp}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>${diff.summary.totalDifferences}</h3>
            <p>Total Differences</p>
        </div>
        <div class="metric">
            <h3>${diff.summary.newEndpoints}</h3>
            <p>New Endpoints</p>
        </div>
        <div class="metric">
            <h3>${diff.summary.missingEndpoints}</h3>
            <p>Missing Endpoints</p>
        </div>
        <div class="metric">
            <h3>${diff.summary.specCoverage}%</h3>
            <p>Spec Coverage</p>
        </div>
    </div>

    <div class="section">
        <h2>New Endpoints (${diff.newEndpoints.length})</h2>
        ${diff.newEndpoints.map(ep => `
            <div class="endpoint new">
                <strong>${ep.method} ${ep.path}</strong>
                <p>Discovery: ${ep.discoveryMethod} | Status: ${ep.responseCode}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Missing Endpoints (${diff.missingEndpoints.length})</h2>
        ${diff.missingEndpoints.map(ep => `
            <div class="endpoint missing">
                <strong>${ep.method} ${ep.path}</strong>
                <p>${ep.description || 'No description'}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>All Differences (${diff.differences.length})</h2>
        ${diff.differences.map(d => `
            <div class="endpoint ${d.type}">
                <strong class="severity-${d.severity}">[${d.severity.toUpperCase()}]</strong>
                ${d.description}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
        fs.writeFileSync(outputPath, html, 'utf8');
        this.logger.info(`HTML report generated: ${outputPath}`);
    }
    /**
     * Generate JSON report
     */
    async generateJSONReport(diff, outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(diff, null, 2), 'utf8');
        this.logger.info(`JSON report generated: ${outputPath}`);
    }
    /**
     * Generate text report
     */
    async generateTextReport(diff, outputPath) {
        let report = 'PreveraSec Diff Report\n';
        report += '=====================\n\n';
        report += `Spec: ${diff.specPath}\n`;
        report += `Runtime: ${diff.runtimeUrl}\n`;
        report += `Generated: ${diff.timestamp}\n\n`;
        report += 'Summary:\n';
        report += `- Total Differences: ${diff.summary.totalDifferences}\n`;
        report += `- New Endpoints: ${diff.summary.newEndpoints}\n`;
        report += `- Missing Endpoints: ${diff.summary.missingEndpoints}\n`;
        report += `- Spec Coverage: ${diff.summary.specCoverage}%\n\n`;
        if (diff.newEndpoints.length > 0) {
            report += 'New Endpoints:\n';
            diff.newEndpoints.forEach(ep => {
                report += `  + ${ep.method} ${ep.path} (${ep.discoveryMethod})\n`;
            });
            report += '\n';
        }
        if (diff.missingEndpoints.length > 0) {
            report += 'Missing Endpoints:\n';
            diff.missingEndpoints.forEach(ep => {
                report += `  - ${ep.method} ${ep.path}\n`;
            });
            report += '\n';
        }
        fs.writeFileSync(outputPath, report, 'utf8');
        this.logger.info(`Text report generated: ${outputPath}`);
    }
    /**
     * Helper methods
     */
    async loadAppSpec(specPath) {
        const content = fs.readFileSync(specPath, 'utf8');
        return JSON.parse(content);
    }
    normalizePathForComparison(path) {
        return path.replace(/:[^/]+/g, '{param}').replace(/\{[^}]+\}/g, '{param}');
    }
    deduplicateEndpoints(endpoints) {
        const seen = new Map();
        endpoints.forEach(endpoint => {
            const key = `${endpoint.method}:${endpoint.path}`;
            if (!seen.has(key)) {
                seen.set(key, endpoint);
            }
        });
        return Array.from(seen.values());
    }
    async analyzeParameters(response) {
        // This would analyze the response to detect parameters
        // For now, return empty array
        return [];
    }
    analyzeErrorResponse(response) {
        // This would parse error messages for endpoint hints
        // For now, return empty array
        return [];
    }
    getSeverityForChange(changeType) {
        switch (changeType) {
            case 'parameter-removed':
                return 'high';
            case 'parameter-added':
                return 'medium';
            case 'response-changed':
                return 'medium';
            case 'security-changed':
                return 'high';
            default:
                return 'low';
        }
    }
    calculateSummary(result) {
        result.summary = {
            totalDifferences: result.differences.length,
            newEndpoints: result.newEndpoints.length,
            missingEndpoints: result.missingEndpoints.length,
            modifiedEndpoints: result.modifiedEndpoints.length,
            criticalDifferences: result.differences.filter(d => d.severity === 'high').length,
            specCoverage: result.newEndpoints.length > 0 ?
                Math.round(((result.newEndpoints.length + result.modifiedEndpoints.length) /
                    (result.newEndpoints.length + result.missingEndpoints.length + result.modifiedEndpoints.length)) * 100) : 100
        };
    }
    normalizeHeaders(headers) {
        const normalized = {};
        for (const [key, value] of Object.entries(headers || {})) {
            normalized[key] = String(value);
        }
        return normalized;
    }
}
exports.DiffTool = DiffTool;
//# sourceMappingURL=DiffTool.js.map