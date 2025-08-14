/**
 * Phase 3 Test: Contract-Aware Fuzzing v1
 * 
 * Tests the complete fuzzing system including:
 * - Semantic generators with typed payloads
 * - Response validators with anomaly detection
 * - Rate-aware budget management
 * - End-to-end fuzzing with DoD validation
 */

import { Logger } from './utils/Logger';
import { ContractAwareFuzzer, FuzzingConfig, EndpointConfig } from './fuzzing/ContractAwareFuzzer';
import { AuthOrchestrator } from './auth/AuthOrchestrator';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
}

class Phase3TestSuite {
  private logger: Logger;
  private fuzzer: ContractAwareFuzzer;
  private authOrchestrator: AuthOrchestrator;
  
  constructor() {
    this.logger = Logger.getInstance();
  }

  async runAllTests(): Promise<TestResult[]> {
    this.logger.info('🚀 Starting Phase 3: Contract-Aware Fuzzing v1 Tests');
    
    const results: TestResult[] = [];
    
    // Initialize components
    await this.initializeComponents();

    try {
      // Test 1: Semantic Generators
      results.push(await this.testSemanticGenerators());
      
      // Test 2: Response Validators  
      results.push(await this.testResponseValidators());
      
      // Test 3: Rate-Aware Budget Manager
      results.push(await this.testBudgetManager());
      
      // Test 4: Contract-Aware Fuzzing Integration
      results.push(await this.testFuzzingIntegration());
      
      // Test 5: DoD Validation - Vulnerability Detection with FP ≤10%
      results.push(await this.testVulnerabilityDetection());
      
      // Test 6: Per-Endpoint Budget Compliance
      results.push(await this.testEndpointBudgets());

    } catch (error) {
      this.logger.error('Test suite error', error);
      results.push({
        name: 'Critical Error',
        passed: false,
        duration: 0,
        details: { error: error.message },
        error: error.message
      });
    }

    await this.printResults(results);
    return results;
  }

  private async initializeComponents(): Promise<void> {
    this.logger.info('Initializing Phase 3 components...');
    
    // Initialize auth orchestrator
    // Initialize with proper configuration
    this.authOrchestrator = new AuthOrchestrator({
      vault: {
        vaultPath: './temp-vault',
        encryptionKey: 'test-key-12345678901234567890123456789012',
        autoRotate: false,
        rotationInterval: 24,
        maxCredentialAge: 7
      },
      session: {
        sessionTimeout: 3600000, // 1 hour
        refreshThreshold: 300000, // 5 minutes
        maxSessions: 100
      },
      multiActor: {
        maxContextsPerRole: 10,
        contextTimeout: 1800000, // 30 minutes
        autoRefreshTokens: true,
        preloadContexts: false,
        defaultCapabilities: {
          guest: ['read'],
          user: ['read', 'write'],
          admin: ['read', 'write', 'delete'],
          vendor: ['read', 'write', 'manage']
        }
      }
    });
    await this.authOrchestrator.initialize();
    
    // Initialize fuzzer with auth context
    this.fuzzer = new ContractAwareFuzzer(this.authOrchestrator);
  }

  private async testSemanticGenerators(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('🔧 Testing semantic generators...');
      
      const { SemanticGenerators } = await import('./fuzzing/SemanticGenerators');
      const generators = new SemanticGenerators();
      
      // Test string generation
      const stringPayloads = generators.generate('string', {
        minLength: 1,
        maxLength: 100
      });
      
      // Test email generation
      const emailPayloads = generators.generate('email');
      
      // Test number generation with boundaries
      const numberPayloads = generators.generate('number', {
        boundaries: [0, 100, -1, 999999]
      });
      
      // Test JWT generation
      const jwtPayloads = generators.generate('jwt');
      
      // Test mutation
      const mutations = generators.mutate('test@example.com', 'email', 0.8);
      
      const details = {
        stringPayloads: stringPayloads.length,
        emailPayloads: emailPayloads.length, 
        numberPayloads: numberPayloads.length,
        jwtPayloads: jwtPayloads.length,
        mutations: mutations.length,
        stats: generators.getGenerationStats(),
        samplePayloads: {
          string: stringPayloads.slice(0, 3),
          email: emailPayloads.slice(0, 2),
          mutations: mutations.slice(0, 2)
        }
      };
      
      // Validation checks
      const hasInjectionPayloads = stringPayloads.some(p => p.malicious);
      const hasBoundaryPayloads = numberPayloads.some(p => p.boundary);
      const hasValidEmails = emailPayloads.some(p => !p.malicious);
      const hasMutations = mutations.length > 0;
      
      const passed = hasInjectionPayloads && hasBoundaryPayloads && 
                    hasValidEmails && hasMutations &&
                    stringPayloads.length >= 5 && emailPayloads.length >= 5;

      return {
        name: 'Semantic Generators',
        passed,
        duration: Date.now() - startTime,
        details
      };

    } catch (error) {
      return {
        name: 'Semantic Generators',
        passed: false,
        duration: Date.now() - startTime,
        details: { error: error.message },
        error: error.message
      };
    }
  }

  private async testResponseValidators(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('🔍 Testing response validators...');
      
      const { ResponseValidators } = await import('./fuzzing/ResponseValidators');
      const validators = new ResponseValidators();
      
      // Test normal response
      const normalResponse = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { success: true, data: 'normal response' },
        timing: 100,
        size: 50
      };
      
      const normalValidation = validators.validateResponse(normalResponse);
      
      // Test malicious response (SQL injection)
      const maliciousResponse = {
        status: 500,
        headers: { 'content-type': 'text/html' },
        body: 'SQL syntax error near DROP TABLE users',
        timing: 500,
        size: 200
      };
      
      const maliciousValidation = validators.validateResponse(maliciousResponse);
      
      // Test schema validation
      const schemaResponse = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { id: 123, name: 'test', email: 'test@example.com' },
        timing: 80,
        size: 60
      };
      
      const schema = {
        type: 'object' as const,
        properties: {
          id: { type: 'number' as const },
          name: { type: 'string' as const },
          email: { type: 'string' as const, format: 'email' }
        },
        required: ['id', 'name']
      };
      
      const schemaValidation = validators.validateResponse(schemaResponse, schema);
      
      const details = {
        normalValidation: {
          isValid: normalValidation.isValid,
          confidence: normalValidation.confidence,
          statusClass: normalValidation.statusClass,
          errorSignatures: normalValidation.errorSignatures.length,
          anomalies: normalValidation.anomalies.length
        },
        maliciousValidation: {
          isValid: maliciousValidation.isValid,
          confidence: maliciousValidation.confidence,
          statusClass: maliciousValidation.statusClass,
          errorSignatures: maliciousValidation.errorSignatures.length,
          errorTypes: maliciousValidation.errorSignatures.filter(s => s.matched).map(s => s.type),
          anomalies: maliciousValidation.anomalies.length
        },
        schemaValidation: {
          isValid: schemaValidation.isValid,
          schemaCompliant: schemaValidation.schemaCompliant,
          confidence: schemaValidation.confidence
        },
        stats: validators.getValidationStats()
      };
      
      // Validation checks
      const normalIsValid = normalValidation.isValid;
      const maliciousDetected = !maliciousValidation.isValid && 
                               maliciousValidation.errorSignatures.some(s => s.matched);
      const schemaWorks = schemaValidation.schemaCompliant;
      
      const passed = normalIsValid && maliciousDetected && schemaWorks;

      return {
        name: 'Response Validators',
        passed,
        duration: Date.now() - startTime,
        details
      };

    } catch (error) {
      return {
        name: 'Response Validators', 
        passed: false,
        duration: Date.now() - startTime,
        details: { error: error.message },
        error: error.message
      };
    }
  }

  private async testBudgetManager(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('💰 Testing rate-aware budget manager...');
      
      const { RateAwareBudgetManager } = await import('./fuzzing/RateAwareBudgetManager');
      
      const budgetConfig = {
        maxRequestsPerEndpoint: 10,
        maxTotalRequests: 50,
        maxDurationMs: 30000,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        respectRetryAfter: true
      };
      
      const budgetManager = new RateAwareBudgetManager(budgetConfig);
      
      // Test normal request flow
      let canProceed = budgetManager.checkBudget('/api/test', 'GET');
      const initialCheck = { ...canProceed };
      
      // Record successful request
      budgetManager.recordRequest('/api/test', 'GET', 200, {}, 100);
      
      // Test rate limiting response
      budgetManager.recordRequest('/api/test', 'GET', 429, {
        'retry-after': '5'
      }, 200);
      
      // Check if rate limited
      canProceed = budgetManager.checkBudget('/api/test', 'GET');
      const rateLimitedCheck = { ...canProceed };
      
      // Test budget exhaustion
      for (let i = 0; i < 15; i++) {
        budgetManager.recordRequest('/api/test', 'GET', 200, {}, 50);
      }
      
      canProceed = budgetManager.checkBudget('/api/test', 'GET');
      const exhaustedCheck = { ...canProceed };
      
      const stats = budgetManager.getBudgetStats();
      
      const details = {
        initialCheck,
        rateLimitedCheck,
        exhaustedCheck,
        budgetStats: stats,
        isHealthy: budgetManager.isHealthy(),
        recommendedRate: budgetManager.getRecommendedRate('/api/test', 'GET')
      };
      
      // Validation checks
      const initiallyCanProceed = initialCheck.canProceed;
      const respectsRateLimit = !rateLimitedCheck.canProceed && rateLimitedCheck.delayMs > 0;
      const respectsBudget = !exhaustedCheck.canProceed;
      const hasStats = stats.global.totalRequestsUsed > 0;
      
      const passed = initiallyCanProceed && respectsRateLimit && 
                    respectsBudget && hasStats;

      return {
        name: 'Rate-Aware Budget Manager',
        passed,
        duration: Date.now() - startTime,
        details
      };

    } catch (error) {
      return {
        name: 'Rate-Aware Budget Manager',
        passed: false,
        duration: Date.now() - startTime,
        details: { error: error.message },
        error: error.message
      };
    }
  }

  private async testFuzzingIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('🎯 Testing contract-aware fuzzing integration...');
      
      const config: FuzzingConfig = {
        budget: {
          maxRequestsPerEndpoint: 20,
          maxTotalRequests: 100,
          maxDurationMs: 15000,
          initialDelayMs: 50,
          maxDelayMs: 2000,
          backoffMultiplier: 1.5,
          respectRetryAfter: true
        },
        generation: {
          intensityLevel: 0.7,
          includeBaseline: true,
          includeBoundaries: true,
          includeMutations: true,
          mutationIntensity: 0.6
        },
        validation: {
          enableSchemaValidation: true,
          enableAnomalyDetection: true,
          falsePositiveThreshold: 0.1,
          confidenceThreshold: 0.6
        },
        endpoints: [
          {
            path: '/api/users/{id}',
            method: 'GET',
            parameters: [
              {
                name: 'id',
                location: 'path',
                type: 'id',
                required: true
              }
            ],
            expectedSchema: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' }
              }
            }
          },
          {
            path: '/api/users',
            method: 'POST',
            parameters: [
              {
                name: 'email',
                location: 'body',
                type: 'email',
                required: true
              },
              {
                name: 'name',
                location: 'body',
                type: 'string',
                required: true,
                config: { minLength: 1, maxLength: 50 }
              }
            ]
          }
        ]
      };
      
      // Start fuzzing session
      const sessionId = await this.fuzzer.startSession(config);
      
      // Fuzz single endpoint
      const singleResult = await this.fuzzer.fuzzEndpoint(config.endpoints[0]);
      
      // Get session stats
      const sessionStats = this.fuzzer.getSessionStats();
      
      const details = {
        sessionId,
        singleEndpointResult: {
          totalTests: singleResult.totalTests,
          vulnerabilities: singleResult.vulnerabilities.length,
          anomalies: singleResult.anomalies,
          falsePositiveRate: singleResult.falsePositiveRate,
          budgetUsed: singleResult.budgetUsed
        },
        sessionStats: {
          totalTests: sessionStats.session.overallStats.totalTests,
          budgetUtilization: sessionStats.session.overallStats.budgetUtilization,
          generatorStats: sessionStats.generators,
          validatorStats: sessionStats.validators
        }
      };
      
      // Validation checks
      const hasTests = singleResult.totalTests > 0;
      const hasBudgetTracking = singleResult.budgetUsed >= 0;
      const hasSessionId = sessionId.startsWith('fuzz_');
      const hasStats = sessionStats !== null;
      
      const passed = hasTests && hasBudgetTracking && hasSessionId && hasStats;

      return {
        name: 'Contract-Aware Fuzzing Integration',
        passed,
        duration: Date.now() - startTime,
        details
      };

    } catch (error) {
      return {
        name: 'Contract-Aware Fuzzing Integration',
        passed: false,
        duration: Date.now() - startTime,
        details: { error: error.message },
        error: error.message
      };
    }
  }

  private async testVulnerabilityDetection(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('🛡️ Testing vulnerability detection with DoD compliance...');
      
      const config: FuzzingConfig = {
        budget: {
          maxRequestsPerEndpoint: 30,
          maxTotalRequests: 150,
          maxDurationMs: 20000,
          initialDelayMs: 30,
          maxDelayMs: 1000,
          backoffMultiplier: 1.8,
          respectRetryAfter: true
        },
        generation: {
          intensityLevel: 0.9, // High intensity for vulnerability detection
          includeBaseline: true,
          includeBoundaries: true,
          includeMutations: true,
          mutationIntensity: 0.8
        },
        validation: {
          enableSchemaValidation: true,
          enableAnomalyDetection: true,
          falsePositiveThreshold: 0.1, // DoD requirement: FP ≤10%
          confidenceThreshold: 0.7 // Higher confidence threshold
        },
        endpoints: [
          // Vulnerable endpoints for testing
          {
            path: '/api/vulnerable/sql',
            method: 'GET',
            parameters: [
              {
                name: 'query',
                location: 'query',
                type: 'string',
                required: true
              }
            ]
          },
          {
            path: '/api/vulnerable/xss',
            method: 'POST',
            parameters: [
              {
                name: 'content',
                location: 'body',
                type: 'string',
                required: true
              }
            ]
          },
          {
            path: '/api/secure/endpoint',
            method: 'GET',
            parameters: [
              {
                name: 'id',
                location: 'path',
                type: 'id',
                required: true
              }
            ],
            expectedSchema: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                status: { type: 'string' }
              }
            }
          }
        ]
      };
      
      // Run comprehensive fuzzing
      const sessionId = await this.fuzzer.startSession(config);
      const session = await this.fuzzer.fuzzAll();
      
      // Analyze results
      const totalVulnerabilities = session.overallStats.totalVulnerabilities;
      const avgFalsePositiveRate = session.overallStats.avgFalsePositiveRate;
      const totalTests = session.overallStats.totalTests;
      
      // Count vulnerabilities by severity
      const vulnerabilitiesBySeverity = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
      
      session.results.forEach(result => {
        result.vulnerabilities.forEach(vuln => {
          vulnerabilitiesBySeverity[vuln.severity]++;
        });
      });
      
      const details = {
        sessionId,
        summary: {
          totalTests,
          totalVulnerabilities,
          avgFalsePositiveRate: Math.round(avgFalsePositiveRate * 100) / 100,
          dodCompliant: avgFalsePositiveRate <= 0.1
        },
        vulnerabilitiesBySeverity,
        endpointResults: session.results.map(r => ({
          endpoint: `${r.endpoint.method} ${r.endpoint.path}`,
          tests: r.totalTests,
          vulnerabilities: r.vulnerabilities.length,
          fpRate: r.falsePositiveRate,
          anomalies: r.anomalies
        })),
        budgetUtilization: session.overallStats.budgetUtilization,
        executionTime: session.endTime! - session.startTime
      };
      
      // DoD validation checks
      const hasDetectedVulnerabilities = totalVulnerabilities > 0;
      const meetsFalsePositiveThreshold = avgFalsePositiveRate <= 0.1;
      const hasReasonableTestCoverage = totalTests >= 30;
      const hasCriticalVulnerabilities = vulnerabilitiesBySeverity.critical > 0 || 
                                        vulnerabilitiesBySeverity.high > 0;
      
      const passed = hasDetectedVulnerabilities && meetsFalsePositiveThreshold && 
                    hasReasonableTestCoverage;

      return {
        name: 'Vulnerability Detection (DoD Compliance)',
        passed,
        duration: Date.now() - startTime,
        details
      };

    } catch (error) {
      return {
        name: 'Vulnerability Detection (DoD Compliance)',
        passed: false,
        duration: Date.now() - startTime,
        details: { error: error.message },
        error: error.message
      };
    }
  }

  private async testEndpointBudgets(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('📊 Testing per-endpoint budget compliance...');
      
      const config: FuzzingConfig = {
        budget: {
          maxRequestsPerEndpoint: 15, // Strict endpoint limit
          maxTotalRequests: 100,
          maxDurationMs: 10000,
          initialDelayMs: 20,
          maxDelayMs: 500,
          backoffMultiplier: 1.5,
          respectRetryAfter: true
        },
        generation: {
          intensityLevel: 0.5,
          includeBaseline: true,
          includeBoundaries: true,
          includeMutations: false,
          mutationIntensity: 0.0
        },
        validation: {
          enableSchemaValidation: false,
          enableAnomalyDetection: true,
          falsePositiveThreshold: 0.2,
          confidenceThreshold: 0.5
        },
        endpoints: [
          {
            path: '/api/budget-test-1',
            method: 'GET',
            parameters: [
              { name: 'param1', location: 'query', type: 'string', required: true },
              { name: 'param2', location: 'query', type: 'number', required: false }
            ]
          },
          {
            path: '/api/budget-test-2',
            method: 'POST',
            parameters: [
              { name: 'data', location: 'body', type: 'string', required: true }
            ]
          }
        ]
      };
      
      const sessionId = await this.fuzzer.startSession(config);
      const session = await this.fuzzer.fuzzAll();
      
      // Get final budget statistics from the session
      const budgetStats = (session as any).finalStats?.budget || null;
      
      if (!budgetStats) {
        throw new Error('Budget statistics not available - session may have ended');
      }
      
      const details = {
        sessionId,
        budgetConfig: config.budget,
        finalStats: {
          totalRequestsUsed: budgetStats.global.totalRequestsUsed,
          maxTotalRequests: budgetStats.global.maxTotalRequests,
          utilizationPercent: budgetStats.global.utilizationPercent
        },
        endpointStats: budgetStats.endpoints.map(e => ({
          endpoint: e.endpoint,
          requestsUsed: e.requestsUsed,
          maxRequests: e.maxRequests,
          utilizationPercent: e.utilizationPercent,
          budgetRespected: e.requestsUsed <= config.budget.maxRequestsPerEndpoint
        })),
        summary: budgetStats.summary,
        testResults: session.results.map(r => ({
          endpoint: `${r.endpoint.method} ${r.endpoint.path}`,
          totalTests: r.totalTests,
          budgetUsed: r.budgetUsed
        }))
      };
      
      // Budget compliance validation
      const totalBudgetRespected = budgetStats.global.totalRequestsUsed <= 
                                  config.budget.maxTotalRequests;
      
      const allEndpointBudgetsRespected = budgetStats.endpoints.every(e => 
        e.requestsUsed <= config.budget.maxRequestsPerEndpoint
      );
      
      const hasEndpointStats = budgetStats.endpoints.length > 0;
      const reasonableUtilization = budgetStats.global.utilizationPercent > 10;
      
      const passed = totalBudgetRespected && allEndpointBudgetsRespected && 
                    hasEndpointStats && reasonableUtilization;

      return {
        name: 'Per-Endpoint Budget Compliance',
        passed,
        duration: Date.now() - startTime,
        details
      };

    } catch (error) {
      return {
        name: 'Per-Endpoint Budget Compliance',
        passed: false,
        duration: Date.now() - startTime,
        details: { error: error.message },
        error: error.message
      };
    }
  }

  private async printResults(results: TestResult[]): Promise<void> {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    this.logger.info('');
    this.logger.info('================================================================================');
    this.logger.info('📊 PHASE 3 CONTRACT-AWARE FUZZING TEST RESULTS');
    this.logger.info('================================================================================');
    this.logger.info('');
    this.logger.info('📈 Summary:');
    this.logger.info(`   Total Tests: ${totalTests}`);
    this.logger.info(`   Passed: ${passedTests} ✅`);
    this.logger.info(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    this.logger.info(`   Success Rate: ${successRate.toFixed(1)}%`);
    this.logger.info(`   Total Duration: ${totalDuration}ms`);
    this.logger.info('');
    this.logger.info('📋 Test Details:');
    
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      this.logger.info(`   ${status} ${result.name} (${result.duration}ms)`);
      
      if (!result.passed && result.error) {
        this.logger.info(`      Error: ${result.error}`);
      }
      
      // Log key details for passed tests
      if (result.passed) {
        switch (result.name) {
          case 'Semantic Generators':
            this.logger.info(`      Generated payloads: ${result.details.stringPayloads + result.details.emailPayloads + result.details.numberPayloads}`);
            break;
          case 'Response Validators':
            this.logger.info(`      Error signatures detected: ${result.details.maliciousValidation.errorSignatures}`);
            break;
          case 'Rate-Aware Budget Manager':
            this.logger.info(`      Total requests tracked: ${result.details.budgetStats.global.totalRequestsUsed}`);
            break;
          case 'Contract-Aware Fuzzing Integration':
            this.logger.info(`      Tests executed: ${result.details.singleEndpointResult.totalTests}`);
            break;
          case 'Vulnerability Detection (DoD Compliance)':
            this.logger.info(`      Vulnerabilities found: ${result.details.summary.totalVulnerabilities}`);
            this.logger.info(`      False positive rate: ${(result.details.summary.avgFalsePositiveRate * 100).toFixed(1)}%`);
            this.logger.info(`      DoD compliant (FP ≤10%): ${result.details.summary.dodCompliant ? '✅' : '❌'}`);
            break;
          case 'Per-Endpoint Budget Compliance':
            this.logger.info(`      Budget utilization: ${result.details.finalStats.utilizationPercent.toFixed(1)}%`);
            break;
        }
      }
    });
    
    this.logger.info('');
    this.logger.info('🎯 Definition of Done Assessment:');
    
    const semanticGeneratorsPass = results.find(r => r.name === 'Semantic Generators')?.passed || false;
    const validatorsPass = results.find(r => r.name === 'Response Validators')?.passed || false;
    const budgetManagerPass = results.find(r => r.name === 'Rate-Aware Budget Manager')?.passed || false;
    const vulnerabilityDetectionPass = results.find(r => r.name === 'Vulnerability Detection (DoD Compliance)')?.passed || false;
    const budgetCompliancePass = results.find(r => r.name === 'Per-Endpoint Budget Compliance')?.passed || false;
    
    const vulnResult = results.find(r => r.name === 'Vulnerability Detection (DoD Compliance)');
    const fpRate = vulnResult?.details?.summary?.avgFalsePositiveRate || 1;
    
    this.logger.info(`   ✅ Typed semantic generators (min/max/enum/format boundaries): ${semanticGeneratorsPass ? '✅' : '❌'}`);
    this.logger.info(`   ✅ Property-based inputs and semantic mutators: ${semanticGeneratorsPass ? '✅' : '❌'}`);
    this.logger.info(`   ✅ Status classes, schema conformance, error-signature anomalies: ${validatorsPass ? '✅' : '❌'}`);
    this.logger.info(`   ✅ Rate-aware budget manager (Retry-After/backoff): ${budgetManagerPass ? '✅' : '❌'}`);
    this.logger.info(`   ✅ Per-endpoint test budgets respected: ${budgetCompliancePass ? '✅' : '❌'}`);
    this.logger.info(`   ✅ Detects seed vulns on demo apps with FP ≤10%: ${fpRate <= 0.1 && vulnerabilityDetectionPass ? '✅' : '❌'}`);
    
    const allDodRequirementsMet = semanticGeneratorsPass && validatorsPass && 
                                 budgetManagerPass && vulnerabilityDetectionPass && 
                                 budgetCompliancePass && fpRate <= 0.1;
    
    this.logger.info('');
    this.logger.info(`🏁 Phase 3 Status: ${allDodRequirementsMet ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`);
    this.logger.info('');
    this.logger.info('================================================================================');
  }
}

// Execute the test suite
async function runPhase3Tests(): Promise<void> {
  const testSuite = new Phase3TestSuite();
  const results = await testSuite.runAllTests();
  
  // Exit with error code if any tests failed
  const hasFailures = results.some(r => !r.passed);
  if (hasFailures) {
    process.exit(1);
  }
}

// Auto-run if this file is executed directly
if (require.main === module) {
  runPhase3Tests().catch(error => {
    console.error('Phase 3 test execution failed:', error);
    process.exit(1);
  });
}

export { runPhase3Tests, Phase3TestSuite };
