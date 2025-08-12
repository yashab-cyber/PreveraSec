/**
 * Core AppSpec Types
 * 
 * TypeScript interfaces for the complete AppSpec schema
 * These types provide compile-time safety and IDE support
 */

// Core AppSpec structure
export interface AppSpec {
  version: '1.0.0';
  info: AppInfo;
  endpoints: Endpoint[];
  parameters: Record<string, Parameter>;
  security: Record<string, SecurityScheme>;
  components?: Components;
  frontend?: FrontendContext;
  roles?: RoleMatrix;
  featureFlags?: Record<string, FeatureFlag>;
  documentation?: Documentation;
  metadata?: CompilationMetadata;
}

// Application information
export interface AppInfo {
  title: string;
  version: string;
  description?: string;
  contact?: Contact;
  license?: License;
  servers?: Server[];
}

export interface Contact {
  name?: string;
  email?: string;
  url?: string;
}

export interface License {
  name?: string;
  url?: string;
}

export interface Server {
  url: string;
  description?: string;
  environment?: 'development' | 'staging' | 'production';
}

// Endpoint definition
export interface Endpoint {
  id: string;
  path: string;
  method: HttpMethod;
  source: EndpointSource;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
  rateLimit?: RateLimit;
  semantics?: SemanticAnnotations;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE';

export type EndpointSource = 'openapi' | 'graphql' | 'postman' | 'har' | 'gateway' | 'code-discovery' | 'manual';

// Parameter definition
export interface Parameter {
  name: string;
  in: ParameterLocation;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: JsonSchema;
  example?: any;
  examples?: Record<string, Example>;
  semantic?: SemanticType;
  sensitive?: boolean;
  ragAnnotation?: RAGAnnotation;
}

export type ParameterLocation = 'query' | 'header' | 'path' | 'cookie' | 'body';

export type SemanticType = 'email' | 'password' | 'jwt' | 'csrf' | 'money' | 'id' | 'timestamp' | 'url' | 'phone' | 'ssn';

// Request and Response structures
export interface RequestBody {
  description?: string;
  content?: Record<string, MediaType>;
  required?: boolean;
}

export interface Response {
  description: string;
  headers?: Record<string, Header>;
  content?: Record<string, MediaType>;
}

export interface MediaType {
  schema?: JsonSchema;
  example?: any;
  examples?: Record<string, Example>;
}

export interface Header {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: JsonSchema;
}

export interface Example {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

// Security definitions
export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'jwt';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export type SecurityRequirement = Record<string, string[]>;

// Components for reusability
export interface Components {
  schemas?: Record<string, JsonSchema>;
  headers?: Record<string, Header>;
  examples?: Record<string, Example>;
}

// Frontend context
export interface FrontendContext {
  framework?: 'react' | 'angular' | 'vue' | 'svelte' | 'next' | 'nuxt' | 'vanilla';
  typescript?: boolean;
  sourceMaps?: SourceMapAnalysis;
  semanticTypes?: Record<string, SemanticTypeInfo>;
}

export interface SourceMapAnalysis {
  available: boolean;
  files?: SourceMapFile[];
}

export interface SourceMapFile {
  source: string;
  map: string;
  endpoints: string[];
}

export interface SemanticTypeInfo {
  type: string;
  semantic?: SemanticType;
  sensitive?: boolean;
  validation?: ValidationRules;
}

export interface ValidationRules {
  pattern?: string;
  min?: number;
  max?: number;
  required?: boolean;
}

// Role-based access control
export interface RoleMatrix {
  roles: Role[];
  permissions: Record<string, Permission>;
}

export interface Role {
  name: string;
  description?: string;
  permissions: string[];
  inheritFrom?: string[];
}

export interface Permission {
  resource: string;
  actions: string[];
}

// Feature flags
export interface FeatureFlag {
  enabled: boolean;
  conditions?: FeatureFlagConditions;
  affectedEndpoints: string[];
}

export interface FeatureFlagConditions {
  userSegments?: string[];
  percentage?: number;
}

// Documentation and RAG
export interface Documentation {
  sources: DocumentationSource[];
  ragAnnotations: Record<string, RAGAnnotation>;
}

export interface DocumentationSource {
  type: 'markdown' | 'swagger-ui' | 'postman' | 'readme';
  path: string;
  content?: string;
}

export interface RAGAnnotation {
  meaning: string;
  invariants: string[];
  examples?: string[];
  relatedEndpoints?: string[];
  confidence: number;
}

// Rate limiting
export interface RateLimit {
  requests: number;
  window: string;
  burst?: number;
  scope: 'global' | 'user' | 'ip' | 'api-key';
}

// Semantic annotations
export interface SemanticAnnotations {
  dataTypes?: DataType[];
  businessContext?: string;
  riskLevel?: RiskLevel;
  complianceRequirements?: ComplianceType[];
}

export type DataType = 'pii' | 'financial' | 'health' | 'biometric' | 'location' | 'behavioral';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceType = 'gdpr' | 'ccpa' | 'hipaa' | 'pci-dss' | 'sox' | 'ferpa';

// Compilation metadata
export interface CompilationMetadata {
  compiledAt: string;
  compiler?: CompilerInfo;
  coverage?: CoverageMetrics;
}

export interface CompilerInfo {
  version: string;
  sources: Record<string, SourceInfo>;
}

export interface SourceInfo {
  path: string;
  lastModified: string;
  checksum: string;
}

export interface CoverageMetrics {
  endpointsDocumented: number;
  parametersAnnotated: number;
  securityCovered: number;
}

// JSON Schema type (simplified for our use)
export interface JsonSchema {
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  example?: any;
  enum?: any[];
  const?: any;
  
  // Numeric constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Array constraints
  items?: JsonSchema | JsonSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Object constraints
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  required?: string[];
  minProperties?: number;
  maxProperties?: number;
  
  // Conditional schemas
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  
  // References
  $ref?: string;
  
  // Custom extensions
  'x-semantic'?: SemanticType;
  'x-sensitive'?: boolean;
  'x-example-values'?: any[];
}

// Ingestion source types
export interface IngestionSource {
  type: string;
  path: string;
  format?: string;
  options?: Record<string, any>;
}

export interface OpenAPISource extends IngestionSource {
  type: 'openapi';
  version?: '2.0' | '3.0' | '3.1';
}

export interface GraphQLSource extends IngestionSource {
  type: 'graphql';
  introspection?: boolean;
}

export interface PostmanSource extends IngestionSource {
  type: 'postman';
  environment?: string;
  variables?: Record<string, string>;
}

export interface HARSource extends IngestionSource {
  type: 'har';
  filterStatic?: boolean;
}

export interface GatewaySource extends IngestionSource {
  type: 'gateway';
  provider: 'aws' | 'kong' | 'istio' | 'nginx';
}

// Configuration interfaces
export interface PreveraSecConfig {
  ingestors: IngestorConfig;
  enrichment: EnrichmentConfig;
  rag: RAGConfig;
  dast: DASTConfig;
  output?: OutputConfig;
  security?: SecurityConfig;
}

export interface IngestorConfig {
  openapi: { enabled: boolean; versions: string[] };
  graphql: { enabled: boolean; introspection: boolean };
  postman: { enabled: boolean; environments: boolean };
  har: { enabled: boolean; filter_static: boolean };
  gateway: { enabled: boolean; providers: string[] };
}

export interface EnrichmentConfig {
  source_maps: boolean;
  typescript_definitions: boolean;
  semantic_analysis: boolean;
  code_discovery: {
    enabled: boolean;
    safe_mode: boolean;
    max_depth?: number;
  };
}

export interface RAGConfig {
  embedding_model: string;
  documentation_sources: string[];
  confidence_threshold: number;
  max_tokens?: number;
  api_key?: string;
}

export interface DASTConfig {
  max_concurrent: number;
  timeout: number;
  follow_redirects: boolean;
  custom_headers: Record<string, string>;
  rate_limit?: {
    requests_per_second: number;
    burst_size: number;
  };
}

export interface OutputConfig {
  format: 'json' | 'yaml';
  pretty: boolean;
  include_metadata: boolean;
}

export interface SecurityConfig {
  api_key?: string;
  rate_limiting: {
    enabled: boolean;
    requests_per_minute: number;
  };
  allowed_origins: string[];
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];
