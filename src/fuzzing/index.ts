/**
 * Phase 3: Contract-Aware Fuzzing v1 - Module Exports
 * 
 * Exports all fuzzing components for easy integration
 */

// Main fuzzer
export { ContractAwareFuzzer } from './ContractAwareFuzzer';
export type { 
  FuzzingConfig,
  EndpointConfig,
  ParameterConfig,
  FuzzingResult,
  Vulnerability,
  FuzzingSession
} from './ContractAwareFuzzer';

// Semantic generators
export { SemanticGenerators } from './SemanticGenerators';
export type {
  GenerationConfig,
  SemanticPayload
} from './SemanticGenerators';

// Response validators
export { ResponseValidators } from './ResponseValidators';
export type {
  ValidationResult,
  Anomaly,
  StatusClass,
  ErrorSignature,
  ResponseData,
  ExpectedSchema
} from './ResponseValidators';

// Budget manager
export { RateAwareBudgetManager } from './RateAwareBudgetManager';
export type {
  BudgetConfig,
  EndpointBudget,
  BudgetStatus,
  RateLimitInfo
} from './RateAwareBudgetManager';

// Default configurations for common use cases
export const DefaultConfigs = {
  // Conservative fuzzing configuration
  conservative: {
    budget: {
      maxRequestsPerEndpoint: 10,
      maxTotalRequests: 100,
      maxDurationMs: 30000,
      initialDelayMs: 200,
      maxDelayMs: 5000,
      backoffMultiplier: 2.0,
      respectRetryAfter: true
    },
    generation: {
      intensityLevel: 0.5,
      includeBaseline: true,
      includeBoundaries: true,
      includeMutations: false,
      mutationIntensity: 0.3
    },
    validation: {
      enableSchemaValidation: true,
      enableAnomalyDetection: true,
      falsePositiveThreshold: 0.05,
      confidenceThreshold: 0.8
    }
  },

  // Aggressive fuzzing configuration
  aggressive: {
    budget: {
      maxRequestsPerEndpoint: 50,
      maxTotalRequests: 500,
      maxDurationMs: 120000,
      initialDelayMs: 50,
      maxDelayMs: 2000,
      backoffMultiplier: 1.5,
      respectRetryAfter: true
    },
    generation: {
      intensityLevel: 0.9,
      includeBaseline: true,
      includeBoundaries: true,
      includeMutations: true,
      mutationIntensity: 0.8
    },
    validation: {
      enableSchemaValidation: true,
      enableAnomalyDetection: true,
      falsePositiveThreshold: 0.1,
      confidenceThreshold: 0.6
    }
  },

  // Production-safe configuration
  production: {
    budget: {
      maxRequestsPerEndpoint: 5,
      maxTotalRequests: 50,
      maxDurationMs: 15000,
      initialDelayMs: 500,
      maxDelayMs: 10000,
      backoffMultiplier: 3.0,
      respectRetryAfter: true
    },
    generation: {
      intensityLevel: 0.3,
      includeBaseline: true,
      includeBoundaries: true,
      includeMutations: false,
      mutationIntensity: 0.1
    },
    validation: {
      enableSchemaValidation: true,
      enableAnomalyDetection: true,
      falsePositiveThreshold: 0.02,
      confidenceThreshold: 0.9
    }
  }
};
