import * as fs from 'fs';
import axios from 'axios';
import { AppSpec, Endpoint, PreveraSecConfig } from '../types/AppSpec';
import { Logger } from '../utils/Logger';

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
export class DiffTool {
  private logger: Logger;
  private config: PreveraSecConfig;

  constructor(config: PreveraSecConfig) {
    this.config = config;
    this.logger = Logger.getInstance();
  }

  /**
   * Compare AppSpec against runtime API
   */
  public async compare(specPath: string, runtimeUrl: string): Promise<DiffResult> {
    this.logger.info('Starting spec vs runtime comparison');

    try {
      // Load AppSpec
      const appSpec = await this.loadAppSpec(specPath);
      
      // Discover runtime endpoints
      const runtimeEndpoints = await this.discoverRuntimeEndpoints(runtimeUrl);
      
      // Initialize diff result
      const diffResult: DiffResult = {
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

    } catch (error) {
      this.logger.error('Comparison failed', error);
      throw error;
    }
  }

  /**
   * Discover runtime endpoints through various methods
   */
  private async discoverRuntimeEndpoints(baseUrl: string): Promise<RuntimeEndpoint[]> {
    const endpoints: RuntimeEndpoint[] = [];
    
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
  private async discoverViaOptions(baseUrl: string, endpoints: RuntimeEndpoint[]): Promise<void> {
    try {
      const response = await axios.options(baseUrl, {
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
    } catch (error) {
      this.logger.debug('OPTIONS discovery failed', error);
    }
  }

  /**
   * Discover endpoints by crawling common paths
   */
  private async discoverViaCrawling(baseUrl: string, endpoints: RuntimeEndpoint[]): Promise<void> {
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
          const response = await axios.request({
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
        } catch (error) {
          // Continue with other paths
        }
      }
    }
  }

  /**
   * Discover endpoints through error analysis
   */
  private async discoverViaErrors(baseUrl: string, endpoints: RuntimeEndpoint[]): Promise<void> {
    try {
      // Send malformed requests to trigger error messages that might reveal endpoints
      const testUrls = [
        `${baseUrl}/nonexistent-endpoint-12345`,
        `${baseUrl}/api/nonexistent`,
        `${baseUrl}/../admin`
      ];
      
      for (const url of testUrls) {
        try {
          const response = await axios.get(url, {
            timeout: this.config.dast.timeout,
            validateStatus: () => true
          });
          
          // Analyze error responses for endpoint hints
          const errorAnalysis = this.analyzeErrorResponse(response);
          endpoints.push(...errorAnalysis);
          
        } catch (error) {
          // Continue
        }
      }
    } catch (error) {
      this.logger.debug('Error-based discovery failed', error);
    }
  }

  /**
   * Compare discovered endpoints with AppSpec
   */
  private async compareEndpoints(
    appSpec: AppSpec,
    runtimeEndpoints: RuntimeEndpoint[],
    result: DiffResult
  ): Promise<void> {
    
    // Find new endpoints (in runtime but not in spec)
    for (const runtimeEndpoint of runtimeEndpoints) {
      const specEndpoint = appSpec.endpoints.find(e => 
        this.normalizePathForComparison(e.path) === this.normalizePathForComparison(runtimeEndpoint.path) &&
        e.method === runtimeEndpoint.method
      );
      
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
      const runtimeEndpoint = runtimeEndpoints.find(e =>
        this.normalizePathForComparison(e.path) === this.normalizePathForComparison(specEndpoint.path) &&
        e.method === specEndpoint.method
      );
      
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
      const runtimeEndpoint = runtimeEndpoints.find(e =>
        this.normalizePathForComparison(e.path) === this.normalizePathForComparison(specEndpoint.path) &&
        e.method === specEndpoint.method
      );
      
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
              type: change.type as any,
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
  private async compareEndpointDetails(
    specEndpoint: Endpoint,
    runtimeEndpoint: RuntimeEndpoint
  ): Promise<EndpointChange[]> {
    const changes: EndpointChange[] = [];
    
    // Compare parameters
    const specParams = specEndpoint.parameters || [];
    const runtimeParams = runtimeEndpoint.detectedParameters || [];
    
    // Check for missing parameters in runtime
    for (const specParam of specParams) {
      const runtimeParam = runtimeParams.find(p => 
        p.name === specParam.name && p.in === specParam.in
      );
      
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
      const specParam = specParams.find(p => 
        p.name === runtimeParam.name && p.in === runtimeParam.in
      );
      
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
  public async generateReport(diff: DiffResult, outputPath: string, format: string = 'html'): Promise<void> {
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
  private async generateHTMLReport(diff: DiffResult, outputPath: string): Promise<void> {
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
  private async generateJSONReport(diff: DiffResult, outputPath: string): Promise<void> {
    fs.writeFileSync(outputPath, JSON.stringify(diff, null, 2), 'utf8');
    this.logger.info(`JSON report generated: ${outputPath}`);
  }

  /**
   * Generate text report
   */
  private async generateTextReport(diff: DiffResult, outputPath: string): Promise<void> {
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
  private async loadAppSpec(specPath: string): Promise<AppSpec> {
    const content = fs.readFileSync(specPath, 'utf8');
    return JSON.parse(content);
  }

  private normalizePathForComparison(path: string): string {
    return path.replace(/:[^/]+/g, '{param}').replace(/\{[^}]+\}/g, '{param}');
  }

  private deduplicateEndpoints(endpoints: RuntimeEndpoint[]): RuntimeEndpoint[] {
    const seen = new Map<string, RuntimeEndpoint>();
    
    endpoints.forEach(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`;
      if (!seen.has(key)) {
        seen.set(key, endpoint);
      }
    });
    
    return Array.from(seen.values());
  }

  private async analyzeParameters(response: any): Promise<RuntimeParameter[]> {
    // This would analyze the response to detect parameters
    // For now, return empty array
    return [];
  }

  private analyzeErrorResponse(response: any): RuntimeEndpoint[] {
    // This would parse error messages for endpoint hints
    // For now, return empty array
    return [];
  }

  private getSeverityForChange(changeType: string): 'low' | 'medium' | 'high' {
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

  private calculateSummary(result: DiffResult): void {
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

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers || {})) {
      normalized[key] = String(value);
    }
    return normalized;
  }
}
