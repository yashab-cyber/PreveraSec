/**
 * Phase 3: Contract-Aware Fuzzing v1 - Response Validators
 * 
 * Provides validation for:
 * - Status class analysis (2xx, 4xx, 5xx patterns)
 * - Schema conformance checking
 * - Error signature anomaly detection
 */

import { Logger } from '../utils/Logger';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  anomalies: Anomaly[];
  statusClass: StatusClass;
  schemaCompliant: boolean;
  errorSignatures: ErrorSignature[];
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: any;
  confidence: number;
}

export interface StatusClass {
  code: number;
  class: '1xx' | '2xx' | '3xx' | '4xx' | '5xx';
  expected: boolean;
  message: string;
}

export interface ErrorSignature {
  pattern: string;
  type: string;
  matched: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical' | 'low' | 'medium' | 'high';
  description: string;
}

export interface ResponseData {
  status: number;
  headers: Record<string, string>;
  body: any;
  timing: number;
  size: number;
}

export interface ExpectedSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, any>;
  required?: string[];
  format?: string;
  pattern?: string;
}

export class ResponseValidators {
  private logger: Logger;
  private knownErrorSignatures: Map<string, ErrorSignature>;
  private anomalyPatterns: Map<string, RegExp>;

  constructor() {
    this.logger = Logger.getInstance();
    this.knownErrorSignatures = new Map();
    this.anomalyPatterns = new Map();
    this.initializeErrorSignatures();
    this.initializeAnomalyPatterns();
  }

  private initializeErrorSignatures(): void {
    const signatures: ErrorSignature[] = [
      // SQL Injection indicators
      {
        pattern: 'SQL syntax.*error|mysql_fetch|ORA-\\d+|sqlite_.*error',
        type: 'sql_injection',
        matched: false,
        severity: 'critical',
        description: 'SQL injection vulnerability detected'
      },
      
      // XSS indicators  
      {
        pattern: '<script|javascript:|on\\w+\\s*=|alert\\(|document\\.cookie',
        type: 'xss',
        matched: false,
        severity: 'critical', 
        description: 'Cross-site scripting vulnerability detected'
      },

      // Path traversal indicators
      {
        pattern: 'No such file or directory|Permission denied|Access is denied|\\.\\./|root:.*:|etc/passwd',
        type: 'path_traversal',
        matched: false,
        severity: 'high',
        description: 'Path traversal vulnerability detected'
      },

      // Information disclosure
      {
        pattern: 'stack trace|Exception in thread|at \\w+\\.\\w+\\.|DEBUG:|TRACE:|phpinfo\\(\\)',
        type: 'information_disclosure',
        matched: false,
        severity: 'medium',
        description: 'Information disclosure detected'
      },

      // Authentication bypass
      {
        pattern: 'bypass.*authentication|admin.*unauthorized|elevated.*privileges|authentication.*failed.*success',
        type: 'auth_bypass',
        matched: false,
        severity: 'critical',
        description: 'Authentication bypass detected'
      },

      // CSRF indicators
      {
        pattern: 'CSRF.*token.*invalid|token.*mismatch|Cross-site.*request',
        type: 'csrf_vulnerability',
        matched: false,
        severity: 'high',
        description: 'CSRF vulnerability detected'
      },

      // JWT vulnerabilities
      {
        pattern: 'JWT.*invalid|token.*expired|signature.*invalid|algorithm.*none',
        type: 'jwt_vulnerability', 
        matched: false,
        severity: 'high',
        description: 'JWT vulnerability detected'
      },

      // Rate limiting bypass
      {
        pattern: 'rate.*limit.*bypassed|throttle.*bypassed|quota.*exceeded.*ignored',
        type: 'rate_limit_bypass',
        matched: false,
        severity: 'medium',
        description: 'Rate limiting bypass detected'
      },

      // Business logic errors
      {
        pattern: 'negative.*balance|price.*below.*cost|quantity.*exceeds.*stock|unauthorized.*operation',
        type: 'business_logic',
        matched: false,
        severity: 'high',
        description: 'Business logic vulnerability detected'
      },

      // Serialization vulnerabilities
      {
        pattern: 'deserialization.*error|pickle.*load|ObjectInputStream|unserialize\\(',
        type: 'deserialization',
        matched: false,
        severity: 'critical',
        description: 'Deserialization vulnerability detected'
      }
    ];

    signatures.forEach(sig => {
      this.knownErrorSignatures.set(sig.type, sig);
    });
  }

  private initializeAnomalyPatterns(): void {
    // Response time anomalies
    this.anomalyPatterns.set('slow_response', /response.*time.*(\d+).*ms/i);
    
    // Size anomalies  
    this.anomalyPatterns.set('large_response', /content-length:\s*(\d+)/i);
    
    // Header anomalies
    this.anomalyPatterns.set('missing_security_headers', /x-frame-options|content-security-policy|x-xss-protection/i);
    
    // Error patterns
    this.anomalyPatterns.set('error_leakage', /error|exception|warning|notice|fatal/i);
  }

  /**
   * Validate response and detect anomalies
   */
  validateResponse(
    response: ResponseData, 
    expectedSchema?: ExpectedSchema,
    baseline?: ResponseData
  ): ValidationResult {
    this.logger.debug('Validating response', { 
      status: response.status, 
      size: response.size,
      timing: response.timing 
    });

    const statusClass = this.analyzeStatusClass(response.status);
    const schemaCompliant = expectedSchema ? 
      this.validateSchema(response.body, expectedSchema) : true;
    const errorSignatures = this.detectErrorSignatures(response);
    const anomalies = this.detectAnomalies(response, baseline);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(statusClass, schemaCompliant, errorSignatures, anomalies);

    const result: ValidationResult = {
      isValid: this.determineValidity(statusClass, schemaCompliant, errorSignatures, anomalies),
      confidence,
      anomalies,
      statusClass,
      schemaCompliant,
      errorSignatures
    };

    this.logger.debug('Validation result', result);
    return result;
  }

  private analyzeStatusClass(status: number): StatusClass {
    let statusClass: StatusClass['class'];
    let expected = false;
    let message = '';

    if (status >= 100 && status < 200) {
      statusClass = '1xx';
      message = 'Informational response';
      expected = false; // Usually not expected in API responses
    } else if (status >= 200 && status < 300) {
      statusClass = '2xx';
      message = 'Success response';
      expected = true;
    } else if (status >= 300 && status < 400) {
      statusClass = '3xx';
      message = 'Redirection response';
      expected = true; // Can be expected
    } else if (status >= 400 && status < 500) {
      statusClass = '4xx';
      message = 'Client error response';
      expected = true; // Expected for invalid inputs
    } else if (status >= 500 && status < 600) {
      statusClass = '5xx'; 
      message = 'Server error response';
      expected = false; // Usually indicates a problem
    } else {
      statusClass = '5xx'; // Default for unknown status codes
      message = 'Unknown status code';
      expected = false;
    }

    return { code: status, class: statusClass, expected, message };
  }

  private validateSchema(data: any, schema: ExpectedSchema): boolean {
    try {
      // Basic type checking
      if (schema.type === 'object' && (typeof data !== 'object' || data === null || Array.isArray(data))) {
        return false;
      }
      
      if (schema.type === 'array' && !Array.isArray(data)) {
        return false;
      }
      
      if (schema.type === 'string' && typeof data !== 'string') {
        return false;
      }
      
      if (schema.type === 'number' && typeof data !== 'number') {
        return false;
      }
      
      if (schema.type === 'boolean' && typeof data !== 'boolean') {
        return false;
      }

      // Property validation for objects
      if (schema.type === 'object' && schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (schema.required?.includes(key) && !(key in data)) {
            return false;
          }
          
          if (key in data && !this.validateSchema(data[key], propSchema as ExpectedSchema)) {
            return false;
          }
        }
      }

      // Format validation for strings
      if (schema.type === 'string' && schema.format && typeof data === 'string') {
        return this.validateFormat(data, schema.format);
      }

      // Pattern validation for strings
      if (schema.type === 'string' && schema.pattern && typeof data === 'string') {
        return new RegExp(schema.pattern).test(data);
      }

      return true;
    } catch (error) {
      this.logger.error('Schema validation error', error);
      return false;
    }
  }

  private validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      case 'date':
        return !isNaN(Date.parse(value));
      case 'uri':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'ipv4':
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value);
      default:
        return true; // Unknown format, assume valid
    }
  }

  private detectErrorSignatures(response: ResponseData): ErrorSignature[] {
    const detectedSignatures: ErrorSignature[] = [];
    const responseText = this.extractResponseText(response);

    for (const [type, signature] of this.knownErrorSignatures) {
      const pattern = new RegExp(signature.pattern, 'i');
      const matched = pattern.test(responseText);

      if (matched) {
        detectedSignatures.push({
          ...signature,
          matched: true
        });
      }
    }

    return detectedSignatures;
  }

  private detectAnomalies(response: ResponseData, baseline?: ResponseData): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Response time anomalies
    if (response.timing > 10000) { // > 10 seconds
      anomalies.push({
        type: 'slow_response',
        severity: 'medium',
        description: `Response time unusually high: ${response.timing}ms`,
        evidence: { timing: response.timing },
        confidence: 0.8
      });
    }

    // Large response size anomalies
    if (response.size > 10485760) { // > 10MB
      anomalies.push({
        type: 'large_response',
        severity: 'low',
        description: `Response size unusually large: ${response.size} bytes`,
        evidence: { size: response.size },
        confidence: 0.6
      });
    }

    // Security header anomalies
    if (!this.hasSecurityHeaders(response.headers)) {
      anomalies.push({
        type: 'missing_security_headers',
        severity: 'medium',
        description: 'Missing important security headers',
        evidence: { headers: response.headers },
        confidence: 0.7
      });
    }

    // Status code anomalies
    if (response.status === 500) {
      anomalies.push({
        type: 'server_error',
        severity: 'high',
        description: 'Internal server error detected',
        evidence: { status: response.status },
        confidence: 0.9
      });
    }

    // Compare with baseline if provided
    if (baseline) {
      anomalies.push(...this.compareWithBaseline(response, baseline));
    }

    return anomalies;
  }

  private hasSecurityHeaders(headers: Record<string, string>): boolean {
    const securityHeaders = [
      'x-frame-options',
      'x-xss-protection', 
      'x-content-type-options',
      'content-security-policy',
      'strict-transport-security'
    ];

    const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
    return securityHeaders.some(header => headerKeys.includes(header));
  }

  private compareWithBaseline(response: ResponseData, baseline: ResponseData): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Timing comparison
    const timingDiff = Math.abs(response.timing - baseline.timing);
    const timingRatio = timingDiff / baseline.timing;
    
    if (timingRatio > 2.0) { // More than 2x difference
      anomalies.push({
        type: 'timing_anomaly',
        severity: 'medium',
        description: `Response time significantly different from baseline: ${response.timing}ms vs ${baseline.timing}ms`,
        evidence: { current: response.timing, baseline: baseline.timing, ratio: timingRatio },
        confidence: 0.7
      });
    }

    // Size comparison
    const sizeDiff = Math.abs(response.size - baseline.size);
    const sizeRatio = baseline.size > 0 ? sizeDiff / baseline.size : 1;
    
    if (sizeRatio > 1.5) { // More than 50% difference
      anomalies.push({
        type: 'size_anomaly',
        severity: 'low',
        description: `Response size significantly different from baseline: ${response.size} vs ${baseline.size} bytes`,
        evidence: { current: response.size, baseline: baseline.size, ratio: sizeRatio },
        confidence: 0.6
      });
    }

    // Status code comparison
    if (response.status !== baseline.status) {
      anomalies.push({
        type: 'status_anomaly',
        severity: 'high',
        description: `Status code changed from baseline: ${response.status} vs ${baseline.status}`,
        evidence: { current: response.status, baseline: baseline.status },
        confidence: 0.9
      });
    }

    return anomalies;
  }

  private extractResponseText(response: ResponseData): string {
    try {
      if (typeof response.body === 'string') {
        return response.body;
      } else if (typeof response.body === 'object') {
        return JSON.stringify(response.body);
      } else {
        return String(response.body || '');
      }
    } catch (error) {
      return '';
    }
  }

  private calculateConfidence(
    statusClass: StatusClass,
    schemaCompliant: boolean,
    errorSignatures: ErrorSignature[],
    anomalies: Anomaly[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Status class confidence
    if (statusClass.expected) {
      confidence += 0.2;
    } else {
      confidence -= 0.1;
    }

    // Schema compliance confidence
    if (schemaCompliant) {
      confidence += 0.2;
    } else {
      confidence -= 0.3;
    }

    // Error signature impact
    const criticalErrors = errorSignatures.filter(sig => sig.severity === 'critical' && sig.matched);
    confidence -= criticalErrors.length * 0.3;

    const highErrors = errorSignatures.filter(sig => sig.severity === 'error' && sig.matched);
    confidence -= highErrors.length * 0.2;

    // Anomaly impact
    const criticalAnomalies = anomalies.filter(anom => anom.severity === 'critical');
    confidence -= criticalAnomalies.length * 0.2;

    const highAnomalies = anomalies.filter(anom => anom.severity === 'high');
    confidence -= highAnomalies.length * 0.1;

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  private determineValidity(
    statusClass: StatusClass,
    schemaCompliant: boolean,
    errorSignatures: ErrorSignature[],
    anomalies: Anomaly[]
  ): boolean {
    // Critical vulnerabilities make response invalid
    const hasCriticalErrors = errorSignatures.some(sig => 
      sig.severity === 'critical' && sig.matched
    );
    
    const hasCriticalAnomalies = anomalies.some(anom => 
      anom.severity === 'critical'
    );

    if (hasCriticalErrors || hasCriticalAnomalies) {
      return false;
    }

    // Unexpected status codes with high severity issues
    if (!statusClass.expected) {
      const hasHighSeverityIssues = errorSignatures.some(sig => 
        ['high', 'critical'].includes(sig.severity) && sig.matched
      ) || anomalies.some(anom => 
        ['high', 'critical'].includes(anom.severity)
      );
      
      if (hasHighSeverityIssues) {
        return false;
      }
    }

    // Schema non-compliance with errors
    if (!schemaCompliant && (errorSignatures.length > 0 || anomalies.length > 0)) {
      return false;
    }

    return true;
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): any {
    return {
      knownErrorSignatures: this.knownErrorSignatures.size,
      anomalyPatterns: this.anomalyPatterns.size,
      supportedFormats: ['email', 'uuid', 'date', 'uri', 'ipv4'],
      severityLevels: ['low', 'medium', 'high', 'critical']
    };
  }
}
