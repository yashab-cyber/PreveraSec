/**
 * Phase 3: Contract-Aware Fuzzing v1 - Rate-Aware Budget Manager
 * 
 * Provides intelligent rate limiting and budget management:
 * - Retry-After header handling
 * - Exponential backoff strategies  
 * - Per-endpoint test budgets
 * - Dynamic rate adjustment
 */

import { Logger } from '../utils/Logger';

export interface BudgetConfig {
  maxRequestsPerEndpoint: number;
  maxTotalRequests: number;
  maxDurationMs: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  respectRetryAfter: boolean;
}

export interface EndpointBudget {
  endpoint: string;
  method: string;
  requestsUsed: number;
  maxRequests: number;
  lastRequestTime: number;
  currentDelayMs: number;
  failures: number;
  successes: number;
  rateLimited: boolean;
  banned: boolean;
}

export interface BudgetStatus {
  canProceed: boolean;
  delayMs: number;
  reason: string;
  remainingRequests: number;
  estimatedCompletion?: number;
}

export interface RateLimitInfo {
  retryAfter?: number;
  resetTime?: number;
  remainingRequests?: number;
  limitWindow?: number;
}

export class RateAwareBudgetManager {
  private logger: Logger;
  private config: BudgetConfig;
  private endpointBudgets: Map<string, EndpointBudget>;
  private totalRequestsUsed: number;
  private startTime: number;
  private globalRateLimited: boolean;
  private globalDelayMs: number;

  constructor(config: BudgetConfig) {
    this.logger = Logger.getInstance();
    this.config = config;
    this.endpointBudgets = new Map();
    this.totalRequestsUsed = 0;
    this.startTime = Date.now();
    this.globalRateLimited = false;
    this.globalDelayMs = 0;
  }

  /**
   * Check if a request can proceed and get delay information
   */
  checkBudget(endpoint: string, method: string = 'GET'): BudgetStatus {
    const budgetKey = `${method.toUpperCase()} ${endpoint}`;
    const now = Date.now();

    // Check global limits first
    const globalStatus = this.checkGlobalLimits(now);
    if (!globalStatus.canProceed) {
      return globalStatus;
    }

    // Get or create endpoint budget
    let endpointBudget = this.endpointBudgets.get(budgetKey);
    if (!endpointBudget) {
      endpointBudget = this.createEndpointBudget(endpoint, method);
      this.endpointBudgets.set(budgetKey, endpointBudget);
    }

    // Check endpoint-specific limits
    const endpointStatus = this.checkEndpointLimits(endpointBudget, now);
    return endpointStatus;
  }

  /**
   * Record request completion and update budgets
   */
  recordRequest(
    endpoint: string, 
    method: string = 'GET', 
    statusCode: number,
    headers: Record<string, string> = {},
    responseTimeMs: number = 0
  ): void {
    const budgetKey = `${method.toUpperCase()} ${endpoint}`;
    const now = Date.now();
    const isSuccess = statusCode >= 200 && statusCode < 400;
    const isRateLimited = statusCode === 429 || statusCode === 503;

    this.logger.debug('Recording request', {
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      isSuccess,
      isRateLimited
    });

    // Update global counters
    this.totalRequestsUsed++;

    // Update endpoint budget
    const endpointBudget = this.endpointBudgets.get(budgetKey);
    if (endpointBudget) {
      endpointBudget.requestsUsed++;
      endpointBudget.lastRequestTime = now;

      if (isSuccess) {
        endpointBudget.successes++;
        // Reduce delay on success (but not below initial)
        endpointBudget.currentDelayMs = Math.max(
          this.config.initialDelayMs,
          endpointBudget.currentDelayMs / this.config.backoffMultiplier
        );
      } else {
        endpointBudget.failures++;
      }

      if (isRateLimited) {
        endpointBudget.rateLimited = true;
        this.handleRateLimit(endpointBudget, headers, statusCode);
      } else {
        endpointBudget.rateLimited = false;
      }

      // Check if endpoint should be banned (too many consecutive failures)
      if (endpointBudget.failures >= 10 && endpointBudget.successes === 0) {
        endpointBudget.banned = true;
        this.logger.warn('Endpoint banned due to excessive failures', {
          endpoint,
          method,
          failures: endpointBudget.failures
        });
      }
    }

    // Update global rate limiting
    if (isRateLimited) {
      this.handleGlobalRateLimit(headers, statusCode);
    }
  }

  /**
   * Get current budget statistics
   */
  getBudgetStats(): any {
    const now = Date.now();
    const elapsedMs = now - this.startTime;
    const remainingTimeMs = Math.max(0, this.config.maxDurationMs - elapsedMs);
    
    const endpointStats = Array.from(this.endpointBudgets.entries()).map(([key, budget]) => ({
      endpoint: key,
      requestsUsed: budget.requestsUsed,
      maxRequests: budget.maxRequests,
      utilizationPercent: (budget.requestsUsed / budget.maxRequests) * 100,
      successRate: budget.requestsUsed > 0 ? 
        (budget.successes / budget.requestsUsed) * 100 : 0,
      currentDelayMs: budget.currentDelayMs,
      rateLimited: budget.rateLimited,
      banned: budget.banned
    }));

    return {
      global: {
        totalRequestsUsed: this.totalRequestsUsed,
        maxTotalRequests: this.config.maxTotalRequests,
        utilizationPercent: (this.totalRequestsUsed / this.config.maxTotalRequests) * 100,
        elapsedMs,
        remainingTimeMs,
        globalRateLimited: this.globalRateLimited,
        globalDelayMs: this.globalDelayMs
      },
      endpoints: endpointStats,
      summary: {
        totalEndpoints: this.endpointBudgets.size,
        activeEndpoints: endpointStats.filter(e => !e.banned).length,
        rateLimitedEndpoints: endpointStats.filter(e => e.rateLimited).length,
        bannedEndpoints: endpointStats.filter(e => e.banned).length,
        avgSuccessRate: endpointStats.length > 0 ?
          endpointStats.reduce((sum, e) => sum + e.successRate, 0) / endpointStats.length : 0
      }
    };
  }

  /**
   * Reset budget for specific endpoint
   */
  resetEndpointBudget(endpoint: string, method: string = 'GET'): void {
    const budgetKey = `${method.toUpperCase()} ${endpoint}`;
    const existing = this.endpointBudgets.get(budgetKey);
    
    if (existing) {
      this.endpointBudgets.set(budgetKey, {
        ...existing,
        requestsUsed: 0,
        failures: 0,
        successes: 0,
        currentDelayMs: this.config.initialDelayMs,
        rateLimited: false,
        banned: false
      });
      
      this.logger.info('Reset endpoint budget', { endpoint, method });
    }
  }

  /**
   * Reset all budgets
   */
  resetAllBudgets(): void {
    this.endpointBudgets.clear();
    this.totalRequestsUsed = 0;
    this.startTime = Date.now();
    this.globalRateLimited = false;
    this.globalDelayMs = 0;
    
    this.logger.info('Reset all budgets');
  }

  private checkGlobalLimits(now: number): BudgetStatus {
    const elapsedMs = now - this.startTime;

    // Check time limit
    if (elapsedMs >= this.config.maxDurationMs) {
      return {
        canProceed: false,
        delayMs: 0,
        reason: 'Maximum test duration exceeded',
        remainingRequests: 0
      };
    }

    // Check total request limit
    if (this.totalRequestsUsed >= this.config.maxTotalRequests) {
      return {
        canProceed: false,
        delayMs: 0,
        reason: 'Maximum total requests exceeded',
        remainingRequests: 0
      };
    }

    // Check global rate limiting
    if (this.globalRateLimited && this.globalDelayMs > 0) {
      return {
        canProceed: false,
        delayMs: this.globalDelayMs,
        reason: 'Global rate limit in effect',
        remainingRequests: this.config.maxTotalRequests - this.totalRequestsUsed
      };
    }

    return {
      canProceed: true,
      delayMs: 0,
      reason: 'OK',
      remainingRequests: this.config.maxTotalRequests - this.totalRequestsUsed,
      estimatedCompletion: now + (this.config.maxDurationMs - elapsedMs)
    };
  }

  private checkEndpointLimits(budget: EndpointBudget, now: number): BudgetStatus {
    // Check if endpoint is banned
    if (budget.banned) {
      return {
        canProceed: false,
        delayMs: 0,
        reason: 'Endpoint banned due to excessive failures',
        remainingRequests: 0
      };
    }

    // Check endpoint request limit
    if (budget.requestsUsed >= budget.maxRequests) {
      return {
        canProceed: false,
        delayMs: 0,
        reason: 'Endpoint request limit exceeded',
        remainingRequests: 0
      };
    }

    // Check endpoint rate limiting
    if (budget.rateLimited) {
      const timeSinceLastRequest = now - budget.lastRequestTime;
      if (timeSinceLastRequest < budget.currentDelayMs) {
        const remainingDelayMs = budget.currentDelayMs - timeSinceLastRequest;
        return {
          canProceed: false,
          delayMs: remainingDelayMs,
          reason: 'Endpoint rate limited',
          remainingRequests: budget.maxRequests - budget.requestsUsed
        };
      }
    }

    // Apply minimum delay between requests to be respectful
    const timeSinceLastRequest = now - budget.lastRequestTime;
    const minDelayMs = Math.max(this.config.initialDelayMs, budget.currentDelayMs);
    
    if (timeSinceLastRequest < minDelayMs) {
      const remainingDelayMs = minDelayMs - timeSinceLastRequest;
      return {
        canProceed: false,
        delayMs: remainingDelayMs,
        reason: 'Respecting minimum delay between requests',
        remainingRequests: budget.maxRequests - budget.requestsUsed
      };
    }

    return {
      canProceed: true,
      delayMs: 0,
      reason: 'OK',
      remainingRequests: budget.maxRequests - budget.requestsUsed
    };
  }

  private createEndpointBudget(endpoint: string, method: string): EndpointBudget {
    return {
      endpoint,
      method: method.toUpperCase(),
      requestsUsed: 0,
      maxRequests: this.config.maxRequestsPerEndpoint,
      lastRequestTime: 0,
      currentDelayMs: this.config.initialDelayMs,
      failures: 0,
      successes: 0,
      rateLimited: false,
      banned: false
    };
  }

  private handleRateLimit(
    budget: EndpointBudget, 
    headers: Record<string, string>,
    statusCode: number
  ): void {
    const rateLimitInfo = this.parseRateLimitHeaders(headers);
    
    if (rateLimitInfo.retryAfter && this.config.respectRetryAfter) {
      // Use server-provided Retry-After
      budget.currentDelayMs = rateLimitInfo.retryAfter * 1000;
    } else {
      // Apply exponential backoff
      budget.currentDelayMs = Math.min(
        budget.currentDelayMs * this.config.backoffMultiplier,
        this.config.maxDelayMs
      );
    }

    this.logger.warn('Endpoint rate limited', {
      endpoint: budget.endpoint,
      method: budget.method,
      statusCode,
      delayMs: budget.currentDelayMs,
      rateLimitInfo
    });
  }

  private handleGlobalRateLimit(headers: Record<string, string>, statusCode: number): void {
    this.globalRateLimited = true;
    const rateLimitInfo = this.parseRateLimitHeaders(headers);
    
    if (rateLimitInfo.retryAfter && this.config.respectRetryAfter) {
      this.globalDelayMs = rateLimitInfo.retryAfter * 1000;
    } else {
      this.globalDelayMs = Math.min(
        Math.max(this.globalDelayMs * this.config.backoffMultiplier, this.config.initialDelayMs),
        this.config.maxDelayMs
      );
    }

    // Set timer to reset global rate limiting
    setTimeout(() => {
      this.globalRateLimited = false;
      this.globalDelayMs = 0;
      this.logger.info('Global rate limit reset');
    }, this.globalDelayMs);

    this.logger.warn('Global rate limit triggered', {
      statusCode,
      delayMs: this.globalDelayMs,
      rateLimitInfo
    });
  }

  private parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo {
    const info: RateLimitInfo = {};
    
    // Convert header names to lowercase for case-insensitive lookup
    const lowerHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      lowerHeaders[key.toLowerCase()] = value;
    });

    // Parse Retry-After header (RFC 7231)
    const retryAfter = lowerHeaders['retry-after'];
    if (retryAfter) {
      const retryAfterNum = parseInt(retryAfter, 10);
      if (!isNaN(retryAfterNum)) {
        info.retryAfter = retryAfterNum;
      }
    }

    // Parse X-RateLimit-* headers (common but not standardized)
    const remaining = lowerHeaders['x-ratelimit-remaining'];
    if (remaining) {
      const remainingNum = parseInt(remaining, 10);
      if (!isNaN(remainingNum)) {
        info.remainingRequests = remainingNum;
      }
    }

    const reset = lowerHeaders['x-ratelimit-reset'];
    if (reset) {
      const resetNum = parseInt(reset, 10);
      if (!isNaN(resetNum)) {
        // Could be Unix timestamp or seconds from now
        info.resetTime = resetNum > 1000000000 ? resetNum * 1000 : Date.now() + (resetNum * 1000);
      }
    }

    const window = lowerHeaders['x-ratelimit-window'];
    if (window) {
      const windowNum = parseInt(window, 10);
      if (!isNaN(windowNum)) {
        info.limitWindow = windowNum;
      }
    }

    return info;
  }

  /**
   * Wait for the specified delay with logging
   */
  async wait(delayMs: number, reason: string = 'Rate limiting'): Promise<void> {
    if (delayMs <= 0) return;

    this.logger.info('Waiting due to rate limiting', {
      delayMs,
      reason,
      delaySeconds: Math.round(delayMs / 1000)
    });

    return new Promise(resolve => {
      setTimeout(resolve, delayMs);
    });
  }

  /**
   * Get recommended request rate (requests per second)
   */
  getRecommendedRate(endpoint?: string, method?: string): number {
    if (endpoint && method) {
      const budgetKey = `${method.toUpperCase()} ${endpoint}`;
      const budget = this.endpointBudgets.get(budgetKey);
      
      if (budget && budget.currentDelayMs > 0) {
        return 1000 / budget.currentDelayMs;
      }
    }

    // Global rate based on current settings
    return 1000 / Math.max(this.config.initialDelayMs, this.globalDelayMs);
  }

  /**
   * Check if system is healthy for continued testing
   */
  isHealthy(): boolean {
    const stats = this.getBudgetStats();
    
    // Too many banned endpoints
    if (stats.summary.bannedEndpoints > stats.summary.totalEndpoints * 0.5) {
      return false;
    }
    
    // Too many rate limited endpoints  
    if (stats.summary.rateLimitedEndpoints > stats.summary.totalEndpoints * 0.8) {
      return false;
    }
    
    // Low success rate
    if (stats.summary.avgSuccessRate < 50) {
      return false;
    }
    
    return true;
  }
}
