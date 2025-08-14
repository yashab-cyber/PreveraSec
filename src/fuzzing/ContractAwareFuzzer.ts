/**
 * Phase 3: Contract-Aware Fuzzing v1 - Main Fuzzer
 * 
 * Coordinates semantic generators, validators, and budget management to provide:
 * - Contract-aware fuzzing with typed generators
 * - Intelligent rate limiting and budget management
 * - Anomaly detection and vulnerability identification
 */

import { Logger } from '../utils/Logger';
import { SemanticGenerators, SemanticPayload, GenerationConfig } from './SemanticGenerators';
import { ResponseValidators, ValidationResult, ResponseData, ExpectedSchema } from './ResponseValidators';
import { RateAwareBudgetManager, BudgetConfig, BudgetStatus } from './RateAwareBudgetManager';
import { AuthOrchestrator } from '../auth/AuthOrchestrator';

export interface FuzzingConfig {
  budget: BudgetConfig;
  generation: {
    intensityLevel: number; // 0.1 to 1.0
    includeBaseline: boolean;
    includeBoundaries: boolean;
    includeMutations: boolean;
    mutationIntensity: number;
  };
  validation: {
    enableSchemaValidation: boolean;
    enableAnomalyDetection: boolean;
    falsePositiveThreshold: number; // Max FP rate (0.0 to 1.0)
    confidenceThreshold: number; // Min confidence for findings
  };
  endpoints: EndpointConfig[];
}

export interface EndpointConfig {
  path: string;
  method: string;
  parameters: ParameterConfig[];
  expectedSchema?: ExpectedSchema;
  authentication?: string; // role name
  baseline?: ResponseData;
}

export interface ParameterConfig {
  name: string;
  location: 'query' | 'path' | 'header' | 'body';
  type: string;
  required: boolean;
  config?: GenerationConfig;
}

export interface FuzzingResult {
  endpoint: EndpointConfig;
  totalTests: number;
  vulnerabilities: Vulnerability[];
  anomalies: number;
  falsePositiveRate: number;
  executionTimeMs: number;
  budgetUsed: number;
}

export interface Vulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  evidence: {
    payload: SemanticPayload;
    request: any;
    response: ResponseData;
    validation: ValidationResult;
  };
  reproducible: boolean;
}

export interface FuzzingSession {
  sessionId: string;
  config: FuzzingConfig;
  startTime: number;
  endTime?: number;
  results: FuzzingResult[];
  overallStats: {
    totalTests: number;
    totalVulnerabilities: number;
    avgFalsePositiveRate: number;
    budgetUtilization: number;
  };
}

export class ContractAwareFuzzer {
  private logger: Logger;
  private generators: SemanticGenerators;
  private validators: ResponseValidators;
  private budgetManager: RateAwareBudgetManager;
  private authOrchestrator?: AuthOrchestrator;
  private currentSession?: FuzzingSession;

  constructor(authOrchestrator?: AuthOrchestrator) {
    this.logger = Logger.getInstance();
    this.generators = new SemanticGenerators();
    this.validators = new ResponseValidators();
    this.authOrchestrator = authOrchestrator;
  }

  /**
   * Start a new fuzzing session
   */
  async startSession(config: FuzzingConfig): Promise<string> {
    const sessionId = `fuzz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info('Starting contract-aware fuzzing session', {
      sessionId,
      endpoints: config.endpoints.length,
      budget: config.budget
    });

    // Initialize budget manager
    this.budgetManager = new RateAwareBudgetManager(config.budget);

    // Create session
    this.currentSession = {
      sessionId,
      config,
      startTime: Date.now(),
      results: [],
      overallStats: {
        totalTests: 0,
        totalVulnerabilities: 0,
        avgFalsePositiveRate: 0,
        budgetUtilization: 0
      }
    };

    return sessionId;
  }

  /**
   * Fuzz a specific endpoint
   */
  async fuzzEndpoint(endpointConfig: EndpointConfig): Promise<FuzzingResult> {
    if (!this.currentSession) {
      throw new Error('No active fuzzing session. Call startSession() first.');
    }

    this.logger.info('Fuzzing endpoint', {
      path: endpointConfig.path,
      method: endpointConfig.method,
      parameters: endpointConfig.parameters.length
    });

    const startTime = Date.now();
    const vulnerabilities: Vulnerability[] = [];
    let totalTests = 0;
    let anomalies = 0;

    // Generate test cases for each parameter
    for (const param of endpointConfig.parameters) {
      const paramResults = await this.fuzzParameter(endpointConfig, param);
      vulnerabilities.push(...paramResults.vulnerabilities);
      totalTests += paramResults.tests;
      anomalies += paramResults.anomalies;

      // Check if we should continue (budget/health)
      if (!this.budgetManager.isHealthy()) {
        this.logger.warn('Stopping endpoint fuzzing due to unhealthy state');
        break;
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const budgetStats = this.budgetManager.getBudgetStats();
    const endpointKey = `${endpointConfig.method.toUpperCase()} ${endpointConfig.path}`;
    const endpointBudget = budgetStats.endpoints.find(e => e.endpoint === endpointKey);

    const result: FuzzingResult = {
      endpoint: endpointConfig,
      totalTests,
      vulnerabilities,
      anomalies,
      falsePositiveRate: this.calculateFalsePositiveRate(vulnerabilities),
      executionTimeMs,
      budgetUsed: endpointBudget ? endpointBudget.utilizationPercent : 0
    };

    // Update session stats
    this.updateSessionStats(result);

    return result;
  }

  /**
   * Fuzz all configured endpoints
   */
  async fuzzAll(): Promise<FuzzingSession> {
    if (!this.currentSession) {
      throw new Error('No active fuzzing session. Call startSession() first.');
    }

    this.logger.info('Starting comprehensive fuzzing', {
      endpoints: this.currentSession.config.endpoints.length
    });

    for (const endpointConfig of this.currentSession.config.endpoints) {
      try {
        const result = await this.fuzzEndpoint(endpointConfig);
        this.currentSession.results.push(result);

        this.logger.info('Endpoint fuzzing completed', {
          endpoint: endpointConfig.path,
          method: endpointConfig.method,
          tests: result.totalTests,
          vulnerabilities: result.vulnerabilities.length,
          falsePositiveRate: result.falsePositiveRate
        });

      } catch (error) {
        this.logger.error('Error fuzzing endpoint', {
          endpoint: endpointConfig.path,
          method: endpointConfig.method,
          error: error.message
        });
      }
    }

    // Finalize session
    this.currentSession.endTime = Date.now();
    const finalSession = { ...this.currentSession };
    
    // Add final stats to the session
    (finalSession as any).finalStats = {
      budget: this.budgetManager.getBudgetStats(),
      generators: this.generators.getGenerationStats(),
      validators: this.validators.getValidationStats()
    };
    
    this.currentSession = undefined;

    this.logger.info('Fuzzing session completed', {
      sessionId: finalSession.sessionId,
      duration: finalSession.endTime! - finalSession.startTime,
      totalTests: finalSession.overallStats.totalTests,
      totalVulnerabilities: finalSession.overallStats.totalVulnerabilities,
      avgFalsePositiveRate: finalSession.overallStats.avgFalsePositiveRate
    });

    return finalSession;
  }

  private async fuzzParameter(
    endpointConfig: EndpointConfig, 
    paramConfig: ParameterConfig
  ): Promise<{ vulnerabilities: Vulnerability[]; tests: number; anomalies: number }> {
    
    const vulnerabilities: Vulnerability[] = [];
    let tests = 0;
    let anomalies = 0;

    this.logger.debug('Fuzzing parameter', {
      endpoint: endpointConfig.path,
      parameter: paramConfig.name,
      type: paramConfig.type
    });

    // Generate semantic payloads
    const payloads = this.generators.generate(paramConfig.type, paramConfig.config);
    
    // Add mutations if enabled
    if (this.currentSession!.config.generation.includeMutations) {
      // Get baseline value for mutation
      const baselineValue = this.getBaselineValue(paramConfig);
      if (baselineValue !== undefined) {
        const mutations = this.generators.mutate(
          baselineValue, 
          paramConfig.type, 
          this.currentSession!.config.generation.mutationIntensity
        );
        payloads.push(...mutations);
      }
    }

    // Test each payload
    for (const payload of payloads) {
      // Check budget before proceeding
      const budgetStatus = this.budgetManager.checkBudget(endpointConfig.path, endpointConfig.method);
      
      if (!budgetStatus.canProceed) {
        if (budgetStatus.delayMs > 0) {
          await this.budgetManager.wait(budgetStatus.delayMs, budgetStatus.reason);
          continue; // Retry after waiting
        } else {
          this.logger.warn('Budget exhausted for endpoint', {
            endpoint: endpointConfig.path,
            reason: budgetStatus.reason
          });
          break; // Budget exhausted, move to next parameter
        }
      }

      try {
        const testResult = await this.executeTest(endpointConfig, paramConfig, payload);
        tests++;

        if (testResult.isVulnerability) {
          vulnerabilities.push(testResult.vulnerability);
        }

        if (testResult.hasAnomalies) {
          anomalies++;
        }

      } catch (error) {
        this.logger.error('Test execution error', {
          endpoint: endpointConfig.path,
          parameter: paramConfig.name,
          payload: payload.description,
          error: error.message
        });
        tests++;
      }
    }

    return { vulnerabilities, tests, anomalies };
  }

  private async executeTest(
    endpointConfig: EndpointConfig,
    paramConfig: ParameterConfig,
    payload: SemanticPayload
  ): Promise<{ isVulnerability: boolean; hasAnomalies: boolean; vulnerability?: Vulnerability }> {
    
    // Authenticate if required
    if (endpointConfig.authentication && this.authOrchestrator) {
      await this.authOrchestrator.executeAsRole(endpointConfig.authentication, async () => {
        // Authentication context is set
      });
    }

    // Build request
    const request = this.buildRequest(endpointConfig, paramConfig, payload);
    
    // Execute request (mock implementation - replace with actual HTTP client)
    const startTime = Date.now();
    const response = await this.executeRequest(request);
    const timing = Date.now() - startTime;

    // Record request for budget tracking
    this.budgetManager.recordRequest(
      endpointConfig.path,
      endpointConfig.method,
      response.status,
      response.headers,
      timing
    );

    const responseData: ResponseData = {
      status: response.status,
      headers: response.headers,
      body: response.body,
      timing,
      size: this.calculateResponseSize(response)
    };

    // Validate response
    const validation = this.validators.validateResponse(
      responseData,
      endpointConfig.expectedSchema,
      endpointConfig.baseline
    );

    // Determine if this is a vulnerability
    const isVulnerability = this.isVulnerability(payload, validation);
    const hasAnomalies = validation.anomalies.length > 0;

    let vulnerability: Vulnerability | undefined;

    if (isVulnerability) {
      vulnerability = {
        type: this.determineVulnerabilityType(payload, validation),
        severity: this.determineSeverity(payload, validation),
        confidence: validation.confidence,
        description: this.generateVulnerabilityDescription(payload, validation),
        evidence: {
          payload,
          request,
          response: responseData,
          validation
        },
        reproducible: await this.testReproducibility(endpointConfig, paramConfig, payload)
      };
    }

    return { isVulnerability, hasAnomalies, vulnerability };
  }

  private buildRequest(
    endpointConfig: EndpointConfig,
    paramConfig: ParameterConfig,
    payload: SemanticPayload
  ): any {
    // Build request object based on parameter location
    const request: any = {
      url: endpointConfig.path,
      method: endpointConfig.method,
      headers: {},
      query: {},
      body: null
    };

    switch (paramConfig.location) {
      case 'query':
        request.query[paramConfig.name] = payload.value;
        break;
      case 'path':
        request.url = request.url.replace(`{${paramConfig.name}}`, encodeURIComponent(String(payload.value)));
        break;
      case 'header':
        request.headers[paramConfig.name] = String(payload.value);
        break;
      case 'body':
        if (typeof request.body === 'object') {
          request.body = request.body || {};
          request.body[paramConfig.name] = payload.value;
        } else {
          request.body = { [paramConfig.name]: payload.value };
        }
        break;
    }

    return request;
  }

  private async executeRequest(request: any): Promise<any> {
    // Mock HTTP request execution
    // In a real implementation, this would use an HTTP client like axios or fetch
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // Simulate network delay

    const requestStr = JSON.stringify(request);
    const isVulnerableEndpoint = request.url.includes('/vulnerable/');
    const isSecureEndpoint = request.url.includes('/secure/');
    
    // Only vulnerable endpoints should actually be vulnerable
    if (isVulnerableEndpoint) {
      // Check for actual vulnerability patterns
      const hasLegitSQLInjection = requestStr.includes('DROP TABLE') || 
                                  requestStr.includes("' OR '1'='1") ||
                                  requestStr.includes('UNION SELECT');
      
      const hasLegitXSS = requestStr.includes('<script>alert(') ||
                         requestStr.includes('javascript:') ||
                         requestStr.includes('<img src=x onerror=');
      
      const hasLegitPathTraversal = requestStr.includes('../../../etc/passwd') ||
                                   requestStr.includes('..\\..\\windows\\system32');

      const isActualVulnerability = hasLegitSQLInjection || hasLegitXSS || hasLegitPathTraversal;

      if (isActualVulnerability) {
        // Vulnerable endpoints respond with vulnerability indicators
        let status = 200;
        let body: any = { success: true, data: 'Mock response' };
        
        const vulnType = Math.random();
        if (hasLegitSQLInjection && vulnType < 0.9) {
          status = 500;
          body = { error: 'SQL syntax error near DROP TABLE users' };
        } else if (hasLegitXSS && vulnType < 0.9) {
          status = 200;
          body = { success: true, data: '<script>alert("XSS detected")</script>' };
        } else if (hasLegitPathTraversal && vulnType < 0.9) {
          status = 403;
          body = { error: 'File access denied: /etc/passwd' };
        } else {
          // 10% chance the vulnerability is properly defended against
          status = 400;
          body = { error: 'Invalid input detected' };
        }
        
        return {
          status,
          headers: { 'content-type': 'application/json' },
          data: body,
          url: request.url
        };
      }
    }

    // Default response for non-vulnerable requests or secure endpoints
    const shouldSimulateRandomError = Math.random() < 0.05; // 5% random errors for realism
    let status = 200;
    let body: any = { success: true, data: 'Mock response' };

    if (shouldSimulateRandomError) {
      // Occasional benign errors for realism
      status = 400;
      body = { error: 'Bad request format' };
    }

    return {
      status,
      headers: {
        'content-type': 'application/json',
        'content-length': JSON.stringify(body).length.toString()
      },
      body
    };
  }

  private calculateResponseSize(response: any): number {
    try {
      return JSON.stringify(response.body).length;
    } catch {
      return 0;
    }
  }

  private isVulnerability(payload: SemanticPayload, validation: ValidationResult): boolean {
    // Check if confidence meets threshold
    if (validation.confidence < this.currentSession!.config.validation.confidenceThreshold) {
      return false;
    }

    // Check for critical error signatures
    const hasCriticalErrors = validation.errorSignatures.some(sig => 
      sig.severity === 'critical' && sig.matched
    );

    // Check for high-severity anomalies
    const hasHighSeverityAnomalies = validation.anomalies.some(anom => 
      ['high', 'critical'].includes(anom.severity)
    );

    // Malicious payloads with unexpected responses
    const isMaliciousWithUnexpectedResponse = payload.malicious && 
      validation.statusClass.code === 200 && 
      validation.errorSignatures.length > 0;

    return hasCriticalErrors || hasHighSeverityAnomalies || isMaliciousWithUnexpectedResponse;
  }

  private determineVulnerabilityType(payload: SemanticPayload, validation: ValidationResult): string {
    // Check error signatures first
    for (const signature of validation.errorSignatures) {
      if (signature.matched && signature.severity === 'critical') {
        return signature.type;
      }
    }

    // Check payload type
    if (payload.category === 'injection') {
      return 'injection_vulnerability';
    }

    // Check anomalies
    for (const anomaly of validation.anomalies) {
      if (anomaly.severity === 'critical') {
        return anomaly.type;
      }
    }

    return 'unknown_vulnerability';
  }

  private determineSeverity(payload: SemanticPayload, validation: ValidationResult): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Known critical vulnerabilities
    const hasCriticalSignatures = validation.errorSignatures.some(sig => 
      sig.severity === 'critical' && sig.matched
    );
    
    if (hasCriticalSignatures) {
      return 'critical';
    }

    // High: Multiple high-severity issues or server errors with malicious payloads
    const hasHighSeverityAnomalies = validation.anomalies.some(anom => 
      anom.severity === 'high'
    );
    
    const isServerErrorWithMaliciousPayload = validation.statusClass.class === '5xx' && 
      payload.malicious;

    if (hasHighSeverityAnomalies || isServerErrorWithMaliciousPayload) {
      return 'high';
    }

    // Medium: Multiple medium issues or unexpected behavior
    const hasMediumSeverityIssues = validation.anomalies.some(anom => 
      anom.severity === 'medium'
    ) || validation.errorSignatures.some(sig => 
      sig.severity === 'error' && sig.matched
    );

    if (hasMediumSeverityIssues) {
      return 'medium';
    }

    return 'low';
  }

  private generateVulnerabilityDescription(payload: SemanticPayload, validation: ValidationResult): string {
    let description = `Potential vulnerability detected with ${payload.type} payload: ${payload.description}`;

    if (validation.errorSignatures.length > 0) {
      const signatures = validation.errorSignatures.filter(sig => sig.matched);
      description += ` Detected signatures: ${signatures.map(sig => sig.type).join(', ')}`;
    }

    if (validation.anomalies.length > 0) {
      description += ` Anomalies detected: ${validation.anomalies.length}`;
    }

    return description;
  }

  private async testReproducibility(
    endpointConfig: EndpointConfig,
    paramConfig: ParameterConfig,
    payload: SemanticPayload
  ): Promise<boolean> {
    // Simple reproducibility test - execute the same test again
    try {
      const testResult = await this.executeTest(endpointConfig, paramConfig, payload);
      return testResult.isVulnerability;
    } catch {
      return false;
    }
  }

  private getBaselineValue(paramConfig: ParameterConfig): any {
    // Return reasonable baseline values for mutation
    switch (paramConfig.type.toLowerCase()) {
      case 'string': return 'baseline_string';
      case 'number': case 'integer': return 42;
      case 'email': return 'test@example.com';
      case 'id': return '123';
      default: return 'baseline_value';
    }
  }

  private calculateFalsePositiveRate(vulnerabilities: Vulnerability[]): number {
    if (vulnerabilities.length === 0) return 0;
    
    // Simple heuristic: vulnerabilities with low confidence are likely false positives
    const lowConfidenceCount = vulnerabilities.filter(v => v.confidence < 0.7).length;
    return lowConfidenceCount / vulnerabilities.length;
  }

  private updateSessionStats(result: FuzzingResult): void {
    if (!this.currentSession) return;

    this.currentSession.overallStats.totalTests += result.totalTests;
    this.currentSession.overallStats.totalVulnerabilities += result.vulnerabilities.length;
    
    // Update average false positive rate
    const results = [...this.currentSession.results, result];
    const totalFpRate = results.reduce((sum, r) => sum + r.falsePositiveRate, 0);
    this.currentSession.overallStats.avgFalsePositiveRate = totalFpRate / results.length;

    // Update budget utilization
    const budgetStats = this.budgetManager.getBudgetStats();
    this.currentSession.overallStats.budgetUtilization = budgetStats.global.utilizationPercent;
  }

  /**
   * Get current session statistics
   */
  getSessionStats(): any {
    if (!this.currentSession) {
      return null;
    }

    return {
      session: this.currentSession,
      budget: this.budgetManager.getBudgetStats(),
      generators: this.generators.getGenerationStats(),
      validators: this.validators.getValidationStats()
    };
  }
}
