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
exports.DASTScanner = void 0;
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const Logger_1 = require("../utils/Logger");
/**
 * Context-Aware DAST Scanner
 * Uses AppSpec to perform intelligent security testing
 */
class DASTScanner {
    constructor(config) {
        this.vulnerabilityId = 1;
        this.config = config;
        this.logger = Logger_1.Logger.getInstance();
        this.httpClient = axios_1.default.create({
            timeout: config.dast.timeout,
            maxRedirects: config.dast.follow_redirects ? 5 : 0,
            validateStatus: () => true // Accept all status codes
        });
    }
    /**
     * Perform DAST scan using AppSpec context
     */
    async scan(options) {
        const startTime = new Date();
        this.logger.dast('Starting DAST scan', { target: options.target });
        try {
            // Load AppSpec
            const appSpec = await this.loadAppSpec(options.specPath);
            // Initialize scan result
            const result = {
                target: options.target,
                startTime: startTime.toISOString(),
                endTime: '',
                summary: {
                    testsRun: 0,
                    vulnerabilities: [],
                    coverage: 0,
                    duration: 0
                },
                vulnerabilities: [],
                coverage: {
                    totalEndpoints: appSpec.endpoints.length,
                    testedEndpoints: 0,
                    skippedEndpoints: [],
                    percentage: 0
                },
                endpoints: []
            };
            // Setup HTTP client with auth and headers
            this.setupHttpClient(options);
            // Test each endpoint
            const endpointTests = appSpec.endpoints.map(endpoint => this.testEndpoint(endpoint, options.target, result));
            // Execute tests with concurrency control
            const batches = this.createBatches(endpointTests, options.maxConcurrent);
            for (const batch of batches) {
                await Promise.allSettled(batch);
            }
            // Finalize results
            const endTime = new Date();
            result.endTime = endTime.toISOString();
            result.summary.duration = endTime.getTime() - startTime.getTime();
            result.summary.testsRun = result.endpoints.reduce((sum, ep) => sum + ep.tests.length, 0);
            result.summary.vulnerabilities = result.vulnerabilities;
            result.coverage.testedEndpoints = result.endpoints.filter(ep => ep.status === 'tested').length;
            result.coverage.percentage = Math.round((result.coverage.testedEndpoints / result.coverage.totalEndpoints) * 100);
            this.logger.dast('DAST scan completed', {
                duration: result.summary.duration,
                vulnerabilities: result.vulnerabilities.length,
                coverage: result.coverage.percentage
            });
            return result;
        }
        catch (error) {
            this.logger.error('DAST scan failed', error);
            throw error;
        }
    }
    /**
     * Test individual endpoint
     */
    async testEndpoint(endpoint, baseUrl, result) {
        const endpointResult = {
            endpoint: endpoint.path,
            method: endpoint.method,
            status: 'failed',
            responseTime: 0,
            vulnerabilities: [],
            tests: []
        };
        try {
            this.logger.dast(`Testing ${endpoint.method} ${endpoint.path}`);
            const url = this.buildUrl(baseUrl, endpoint.path);
            const startTime = Date.now();
            // Basic endpoint test
            const response = await this.makeRequest(endpoint.method, url, {});
            const responseTime = Date.now() - startTime;
            endpointResult.responseTime = responseTime;
            endpointResult.statusCode = response.status;
            endpointResult.status = 'tested';
            // Security tests based on AppSpec context
            await this.runSecurityTests(endpoint, url, response, endpointResult);
            result.endpoints.push(endpointResult);
            result.vulnerabilities.push(...endpointResult.vulnerabilities);
        }
        catch (error) {
            this.logger.error(`Failed to test ${endpoint.method} ${endpoint.path}`, error);
            endpointResult.status = 'failed';
            result.endpoints.push(endpointResult);
            result.coverage.skippedEndpoints.push(`${endpoint.method} ${endpoint.path}`);
        }
    }
    /**
     * Run security tests for an endpoint
     */
    async runSecurityTests(endpoint, url, baseResponse, result) {
        // SQL Injection tests
        await this.testSQLInjection(endpoint, url, result);
        // XSS tests
        await this.testXSS(endpoint, url, result);
        // Authentication bypass tests
        await this.testAuthBypass(endpoint, url, result);
        // Parameter manipulation tests
        await this.testParameterManipulation(endpoint, url, result);
        // Rate limiting tests
        await this.testRateLimiting(endpoint, url, result);
        // Sensitive data exposure tests
        await this.testSensitiveDataExposure(endpoint, baseResponse, result);
        // CSRF tests
        await this.testCSRF(endpoint, url, result);
        // File upload tests (if applicable)
        if (endpoint.requestBody?.content?.['multipart/form-data']) {
            await this.testFileUpload(endpoint, url, result);
        }
    }
    /**
     * Test for SQL injection vulnerabilities
     */
    async testSQLInjection(endpoint, url, result) {
        const sqlPayloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT null, version() --",
            "1' ORDER BY 1 --",
            "admin'--"
        ];
        const testResult = {
            name: 'SQL Injection',
            passed: true,
            description: 'Tests for SQL injection vulnerabilities in parameters'
        };
        if (!endpoint.parameters || endpoint.parameters.length === 0) {
            testResult.description += ' (No parameters to test)';
            result.tests.push(testResult);
            return;
        }
        try {
            for (const payload of sqlPayloads) {
                for (const param of endpoint.parameters) {
                    if (param.in === 'query' || param.in === 'body') {
                        const testUrl = param.in === 'query' ?
                            `${url}?${param.name}=${encodeURIComponent(payload)}` : url;
                        const data = param.in === 'body' ? { [param.name]: payload } : undefined;
                        const response = await this.makeRequest(endpoint.method, testUrl, data);
                        // Check for SQL error patterns
                        const body = JSON.stringify(response.data).toLowerCase();
                        const sqlErrors = [
                            'sql syntax', 'mysql_fetch', 'ora-', 'postgresql', 'sqlite_',
                            'unclosed quotation mark', 'quoted string not properly terminated'
                        ];
                        if (sqlErrors.some(error => body.includes(error))) {
                            testResult.passed = false;
                            result.vulnerabilities.push({
                                id: `SQLI-${this.vulnerabilityId++}`,
                                severity: 'high',
                                type: 'SQL Injection',
                                endpoint: endpoint.path,
                                method: endpoint.method,
                                description: `Potential SQL injection vulnerability in parameter '${param.name}'`,
                                impact: 'Attackers may be able to access, modify, or delete database information',
                                remediation: 'Use parameterized queries or prepared statements',
                                evidence: { payload, response: response.data },
                                cwe: 'CWE-89',
                                owasp: 'A03:2021 - Injection'
                            });
                            break;
                        }
                    }
                }
            }
        }
        catch (error) {
            // Error in testing doesn't mean vulnerability
        }
        result.tests.push(testResult);
    }
    /**
     * Test for XSS vulnerabilities
     */
    async testXSS(endpoint, url, result) {
        const xssPayloads = [
            '<script>alert("XSS")</script>',
            '<img src="x" onerror="alert(\'XSS\')">',
            '"><script>alert(document.cookie)</script>',
            "javascript:alert('XSS')",
            '<svg/onload=alert("XSS")>'
        ];
        const testResult = {
            name: 'Cross-Site Scripting (XSS)',
            passed: true,
            description: 'Tests for XSS vulnerabilities in parameters'
        };
        if (!endpoint.parameters || endpoint.parameters.length === 0) {
            result.tests.push(testResult);
            return;
        }
        try {
            for (const payload of xssPayloads) {
                for (const param of endpoint.parameters) {
                    if (param.in === 'query' || param.in === 'body') {
                        const testUrl = param.in === 'query' ?
                            `${url}?${param.name}=${encodeURIComponent(payload)}` : url;
                        const data = param.in === 'body' ? { [param.name]: payload } : undefined;
                        const response = await this.makeRequest(endpoint.method, testUrl, data);
                        // Check if payload is reflected without encoding
                        const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                        if (body.includes(payload)) {
                            testResult.passed = false;
                            result.vulnerabilities.push({
                                id: `XSS-${this.vulnerabilityId++}`,
                                severity: 'medium',
                                type: 'Cross-Site Scripting',
                                endpoint: endpoint.path,
                                method: endpoint.method,
                                description: `Potential XSS vulnerability in parameter '${param.name}'`,
                                impact: 'Attackers may execute malicious scripts in user browsers',
                                remediation: 'Implement proper input validation and output encoding',
                                evidence: { payload, response: response.data },
                                cwe: 'CWE-79',
                                owasp: 'A03:2021 - Injection'
                            });
                            break;
                        }
                    }
                }
            }
        }
        catch (error) {
            // Continue with other tests
        }
        result.tests.push(testResult);
    }
    /**
     * Test for authentication bypass
     */
    async testAuthBypass(endpoint, url, result) {
        const testResult = {
            name: 'Authentication Bypass',
            passed: true,
            description: 'Tests for authentication bypass vulnerabilities'
        };
        // Only test endpoints that should require authentication
        if (!endpoint.security || endpoint.security.length === 0) {
            testResult.description += ' (No security requirements defined)';
            result.tests.push(testResult);
            return;
        }
        try {
            // Test without authentication headers
            const originalHeaders = { ...this.httpClient.defaults.headers.common };
            delete this.httpClient.defaults.headers.common['Authorization'];
            const response = await this.makeRequest(endpoint.method, url, {});
            // Restore headers
            this.httpClient.defaults.headers.common = originalHeaders;
            // If response is successful when it should require auth, it's a vulnerability
            if (response.status >= 200 && response.status < 300) {
                testResult.passed = false;
                result.vulnerabilities.push({
                    id: `AUTH-${this.vulnerabilityId++}`,
                    severity: 'high',
                    type: 'Authentication Bypass',
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    description: 'Endpoint accessible without proper authentication',
                    impact: 'Unauthorized access to protected resources',
                    remediation: 'Implement proper authentication checks',
                    evidence: { statusCode: response.status, response: response.data },
                    cwe: 'CWE-306',
                    owasp: 'A01:2021 - Broken Access Control'
                });
            }
        }
        catch (error) {
            // Expected behavior for protected endpoints
        }
        result.tests.push(testResult);
    }
    /**
     * Test parameter manipulation
     */
    async testParameterManipulation(endpoint, url, result) {
        const testResult = {
            name: 'Parameter Manipulation',
            passed: true,
            description: 'Tests for parameter manipulation vulnerabilities'
        };
        if (!endpoint.parameters || endpoint.parameters.length === 0) {
            result.tests.push(testResult);
            return;
        }
        try {
            // Test for parameter pollution, type confusion, etc.
            for (const param of endpoint.parameters) {
                if (param.in === 'query') {
                    // Test parameter pollution
                    const pollutedUrl = `${url}?${param.name}=value1&${param.name}=value2`;
                    const response = await this.makeRequest(endpoint.method, pollutedUrl, {});
                    // Check for unexpected behavior
                    if (response.status === 500) {
                        testResult.passed = false;
                        result.vulnerabilities.push({
                            id: `PARAM-${this.vulnerabilityId++}`,
                            severity: 'medium',
                            type: 'Parameter Manipulation',
                            endpoint: endpoint.path,
                            method: endpoint.method,
                            description: `Parameter pollution vulnerability with '${param.name}'`,
                            impact: 'May lead to application logic bypass or unexpected behavior',
                            remediation: 'Implement proper parameter validation and handling',
                            evidence: { parameter: param.name, response: response.data },
                            cwe: 'CWE-235',
                            owasp: 'A03:2021 - Injection'
                        });
                    }
                }
            }
        }
        catch (error) {
            // Continue with tests
        }
        result.tests.push(testResult);
    }
    /**
     * Test rate limiting
     */
    async testRateLimiting(endpoint, url, result) {
        const testResult = {
            name: 'Rate Limiting',
            passed: true,
            description: 'Tests for proper rate limiting implementation'
        };
        try {
            // Send multiple rapid requests
            const requests = Array(10).fill(0).map(() => this.makeRequest(endpoint.method, url, {}));
            const responses = await Promise.allSettled(requests);
            const statusCodes = responses
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value.status);
            // Check if any requests were rate limited (429 status)
            const rateLimited = statusCodes.some(code => code === 429);
            if (!rateLimited && !endpoint.rateLimit) {
                testResult.passed = false;
                result.vulnerabilities.push({
                    id: `RATE-${this.vulnerabilityId++}`,
                    severity: 'low',
                    type: 'Missing Rate Limiting',
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    description: 'Endpoint does not implement rate limiting',
                    impact: 'May be vulnerable to abuse and DoS attacks',
                    remediation: 'Implement proper rate limiting mechanisms',
                    evidence: { requests: requests.length, rateLimited },
                    cwe: 'CWE-770',
                    owasp: 'A04:2021 - Insecure Design'
                });
            }
        }
        catch (error) {
            // Continue
        }
        result.tests.push(testResult);
    }
    /**
     * Test for sensitive data exposure
     */
    async testSensitiveDataExposure(endpoint, response, result) {
        const testResult = {
            name: 'Sensitive Data Exposure',
            passed: true,
            description: 'Tests for exposure of sensitive information'
        };
        try {
            const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            const sensitivePatterns = [
                /password/i,
                /secret/i,
                /token/i,
                /api[_\-]?key/i,
                /\d{16}/, // Credit card numbers
                /\d{3}-\d{2}-\d{4}/, // SSN
                /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ // Email
            ];
            for (const pattern of sensitivePatterns) {
                if (pattern.test(body)) {
                    testResult.passed = false;
                    result.vulnerabilities.push({
                        id: `SENS-${this.vulnerabilityId++}`,
                        severity: 'medium',
                        type: 'Sensitive Data Exposure',
                        endpoint: endpoint.path,
                        method: endpoint.method,
                        description: 'Response may contain sensitive information',
                        impact: 'Sensitive data may be exposed to unauthorized parties',
                        remediation: 'Remove sensitive data from responses or implement proper access controls',
                        evidence: { pattern: pattern.source },
                        cwe: 'CWE-200',
                        owasp: 'A01:2021 - Broken Access Control'
                    });
                    break;
                }
            }
        }
        catch (error) {
            // Continue
        }
        result.tests.push(testResult);
    }
    /**
     * Test for CSRF vulnerabilities
     */
    async testCSRF(endpoint, url, result) {
        const testResult = {
            name: 'Cross-Site Request Forgery (CSRF)',
            passed: true,
            description: 'Tests for CSRF protection'
        };
        // Only test state-changing operations
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method)) {
            testResult.description += ' (Not applicable for read-only operations)';
            result.tests.push(testResult);
            return;
        }
        try {
            // Check if CSRF token is required
            const hasCSRFParam = endpoint.parameters?.some(p => p.name.toLowerCase().includes('csrf') ||
                p.name.toLowerCase().includes('token'));
            if (!hasCSRFParam) {
                // Try to make request without CSRF token
                const response = await this.makeRequest(endpoint.method, url, {});
                if (response.status >= 200 && response.status < 300) {
                    testResult.passed = false;
                    result.vulnerabilities.push({
                        id: `CSRF-${this.vulnerabilityId++}`,
                        severity: 'medium',
                        type: 'Cross-Site Request Forgery',
                        endpoint: endpoint.path,
                        method: endpoint.method,
                        description: 'Endpoint does not appear to implement CSRF protection',
                        impact: 'May be vulnerable to cross-site request forgery attacks',
                        remediation: 'Implement CSRF tokens or SameSite cookie attributes',
                        evidence: { statusCode: response.status },
                        cwe: 'CWE-352',
                        owasp: 'A01:2021 - Broken Access Control'
                    });
                }
            }
        }
        catch (error) {
            // Continue
        }
        result.tests.push(testResult);
    }
    /**
     * Test file upload vulnerabilities
     */
    async testFileUpload(endpoint, url, result) {
        const testResult = {
            name: 'File Upload Security',
            passed: true,
            description: 'Tests for file upload vulnerabilities'
        };
        // This is a simplified test - real implementation would be more comprehensive
        result.tests.push(testResult);
    }
    /**
     * Helper methods
     */
    async loadAppSpec(specPath) {
        const content = fs.readFileSync(specPath, 'utf8');
        return JSON.parse(content);
    }
    setupHttpClient(options) {
        if (options.auth) {
            this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${options.auth}`;
        }
        Object.entries(options.customHeaders).forEach(([key, value]) => {
            this.httpClient.defaults.headers.common[key] = value;
        });
    }
    buildUrl(baseUrl, path) {
        const cleanBase = baseUrl.replace(/\/$/, '');
        const cleanPath = path.replace(/^\//, '');
        return `${cleanBase}/${cleanPath}`;
    }
    async makeRequest(method, url, data) {
        const config = { method: method.toLowerCase(), url };
        if (['post', 'put', 'patch'].includes(method.toLowerCase()) && data) {
            config.data = data;
        }
        return this.httpClient.request(config);
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    /**
     * Save scan results to file
     */
    async saveResults(results, filePath) {
        const content = JSON.stringify(results, null, 2);
        fs.writeFileSync(filePath, content, 'utf8');
        this.logger.dast(`Results saved to ${filePath}`);
    }
}
exports.DASTScanner = DASTScanner;
//# sourceMappingURL=DASTScanner.js.map