import * as fs from 'fs';
import * as path from 'path';
import { AppSpec, AppInfo, Endpoint, PreveraSecConfig, IngestionSource } from '../types/AppSpec';
import { Logger } from '../utils/Logger';
import { OpenAPIIngestor } from '../ingestors/OpenAPIIngestor';
import { GraphQLIngestor } from '../ingestors/GraphQLIngestor';
import { PostmanIngestor } from '../ingestors/PostmanIngestor';
import { HARIngestor } from '../ingestors/HARIngestor';
import { GatewayIngestor } from '../ingestors/GatewayIngestor';
import { SourceMapEnricher } from '../enrichers/SourceMapEnricher';
import { TypeScriptEnricher } from '../enrichers/TypeScriptEnricher';
import { CodeDiscoveryEnricher } from '../enrichers/CodeDiscoveryEnricher';
import { RAGEnricher } from '../enrichers/RAGEnricher';

/**
 * Sources for AppSpec compilation
 */
export interface CompilationSources {
  openapi?: string;
  graphql?: string;
  postman?: string;
  har?: string;
  gateway?: string;
  sourceMaps?: string;
  typescript?: string;
  source?: string;
  docs?: string;
  roles?: string;
  features?: string;
}

/**
 * AppSpec Compiler - Central engine that normalizes all inputs into unified AppSpec
 */
export class AppSpecCompiler {
  private logger: Logger;
  private config: PreveraSecConfig;

  constructor(config: PreveraSecConfig) {
    this.config = config;
    this.logger = Logger.getInstance();
  }

  /**
   * Compile multiple sources into unified AppSpec
   */
  public async compile(sources: CompilationSources): Promise<AppSpec> {
    const startTime = Date.now();
    this.logger.compiler('Starting AppSpec compilation');

    // Initialize empty AppSpec
    const appSpec: AppSpec = {
      version: '1.0.0',
      info: this.createDefaultInfo(),
      endpoints: [],
      parameters: {},
      security: {},
      metadata: {
        compiledAt: new Date().toISOString(),
        compiler: {
          version: '1.0.0',
          sources: {}
        },
        coverage: {
          endpointsDocumented: 0,
          parametersAnnotated: 0,
          securityCovered: 0
        }
      }
    };

    try {
      // Phase 1: Ingestion - Collect data from various sources
      await this.ingestSources(appSpec, sources);

      // Phase 2: Enrichment - Add semantic information and context
      await this.enrichAppSpec(appSpec, sources);

      // Phase 3: Normalization - Resolve conflicts and standardize
      await this.normalizeAppSpec(appSpec);

      // Phase 4: Validation - Ensure completeness and consistency
      await this.validateAppSpec(appSpec);

      // Calculate final coverage metrics
      this.calculateCoverage(appSpec);

      this.logger.timing('AppSpec compilation', startTime);
      this.logger.compiler('AppSpec compilation completed successfully', {
        endpoints: appSpec.endpoints.length,
        parameters: Object.keys(appSpec.parameters).length,
        security: Object.keys(appSpec.security).length
      });

      return appSpec;

    } catch (error) {
      this.logger.error('AppSpec compilation failed', error);
      throw error;
    }
  }

  /**
   * Phase 1: Ingest data from various sources
   */
  private async ingestSources(appSpec: AppSpec, sources: CompilationSources): Promise<void> {
    this.logger.compiler('Phase 1: Ingesting sources');

    const ingestors = [
      { type: 'openapi', path: sources.openapi, ingestor: new OpenAPIIngestor(this.config) },
      { type: 'graphql', path: sources.graphql, ingestor: new GraphQLIngestor(this.config) },
      { type: 'postman', path: sources.postman, ingestor: new PostmanIngestor(this.config) },
      { type: 'har', path: sources.har, ingestor: new HARIngestor(this.config) },
      { type: 'gateway', path: sources.gateway, ingestor: new GatewayIngestor(this.config) }
    ];

    for (const { type, path: sourcePath, ingestor } of ingestors) {
      if (sourcePath && this.config.ingestors[type as keyof typeof this.config.ingestors]?.enabled) {
        try {
          this.logger.ingestor(type, `Processing ${sourcePath}`);
          const data = await ingestor.ingest(sourcePath);
          
          // Merge ingested data into AppSpec
          this.mergeIngestedData(appSpec, data, type);
          
          // Record source metadata
          if (appSpec.metadata?.compiler?.sources) {
            appSpec.metadata.compiler.sources[type] = {
              path: sourcePath,
              lastModified: this.getFileModificationTime(sourcePath),
              checksum: await this.calculateChecksum(sourcePath)
            };
          }

        } catch (error) {
          this.logger.error(`Failed to ingest ${type} from ${sourcePath}`, error);
          // Continue with other sources
        }
      }
    }

    this.logger.compiler('Phase 1 completed', { totalEndpoints: appSpec.endpoints.length });
  }

  /**
   * Phase 2: Enrich AppSpec with additional context and semantic information
   */
  private async enrichAppSpec(appSpec: AppSpec, sources: CompilationSources): Promise<void> {
    this.logger.compiler('Phase 2: Enriching AppSpec');

    const enrichers = [];

    // Source maps enrichment
    if (sources.sourceMaps && this.config.enrichment.source_maps) {
      enrichers.push(new SourceMapEnricher(this.config));
    }

    // TypeScript definitions enrichment
    if (sources.typescript && this.config.enrichment.typescript_definitions) {
      enrichers.push(new TypeScriptEnricher(this.config));
    }

    // Code discovery enrichment
    if (sources.source && this.config.enrichment.code_discovery.enabled) {
      enrichers.push(new CodeDiscoveryEnricher(this.config));
    }

    // RAG documentation enrichment
    if (sources.docs) {
      enrichers.push(new RAGEnricher(this.config));
    }

    // Apply all enrichers
    for (const enricher of enrichers) {
      try {
        await enricher.enrich(appSpec, sources);
      } catch (error) {
        this.logger.error(`Enrichment failed for ${enricher.constructor.name}`, error);
        // Continue with other enrichers
      }
    }

    this.logger.compiler('Phase 2 completed');
  }

  /**
   * Phase 3: Normalize and resolve conflicts
   */
  private async normalizeAppSpec(appSpec: AppSpec): Promise<void> {
    this.logger.compiler('Phase 3: Normalizing AppSpec');

    // Deduplicate endpoints
    appSpec.endpoints = this.deduplicateEndpoints(appSpec.endpoints);

    // Normalize parameter definitions
    this.normalizeParameters(appSpec);

    // Resolve security scheme references
    this.resolveSecurityReferences(appSpec);

    // Generate operation IDs for endpoints without them
    this.generateOperationIds(appSpec);

    this.logger.compiler('Phase 3 completed');
  }

  /**
   * Phase 4: Validate AppSpec completeness
   */
  private async validateAppSpec(appSpec: AppSpec): Promise<void> {
    this.logger.compiler('Phase 4: Validating AppSpec');

    const warnings = [];

    // Check for endpoints without documentation
    const undocumented = appSpec.endpoints.filter(e => !e.description && !e.summary);
    if (undocumented.length > 0) {
      warnings.push(`${undocumented.length} endpoints lack documentation`);
    }

    // Check for parameters without semantic types
    const totalParams = appSpec.endpoints.reduce((count, e) => count + (e.parameters?.length || 0), 0);
    const typedParams = appSpec.endpoints.reduce((count, e) => 
      count + (e.parameters?.filter(p => p.semantic).length || 0), 0);
    
    if (typedParams / totalParams < 0.5) {
      warnings.push(`Only ${Math.round(typedParams / totalParams * 100)}% of parameters have semantic types`);
    }

    // Log warnings
    warnings.forEach(warning => this.logger.warn(warning));

    this.logger.compiler('Phase 4 completed');
  }

  /**
   * Calculate coverage metrics
   */
  private calculateCoverage(appSpec: AppSpec): void {
    const totalEndpoints = appSpec.endpoints.length;
    const documentedEndpoints = appSpec.endpoints.filter(e => e.description || e.summary).length;
    
    const totalParams = appSpec.endpoints.reduce((count, e) => count + (e.parameters?.length || 0), 0);
    const annotatedParams = appSpec.endpoints.reduce((count, e) => 
      count + (e.parameters?.filter(p => p.semantic || p.ragAnnotation).length || 0), 0);
    
    const securedEndpoints = appSpec.endpoints.filter(e => e.security && e.security.length > 0).length;

    if (appSpec.metadata?.coverage) {
      appSpec.metadata.coverage = {
        endpointsDocumented: totalEndpoints > 0 ? Math.round((documentedEndpoints / totalEndpoints) * 100) : 0,
        parametersAnnotated: totalParams > 0 ? Math.round((annotatedParams / totalParams) * 100) : 0,
        securityCovered: totalEndpoints > 0 ? Math.round((securedEndpoints / totalEndpoints) * 100) : 0
      };
    }
  }

  /**
   * Save AppSpec to file
   */
  public async save(appSpec: AppSpec, filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(appSpec, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
    
    this.logger.compiler(`AppSpec saved to ${filePath}`);
  }

  /**
   * Helper methods
   */
  private createDefaultInfo(): AppInfo {
    return {
      title: 'Application',
      version: '1.0.0',
      description: 'Auto-generated AppSpec',
      servers: []
    };
  }

  private mergeIngestedData(appSpec: AppSpec, data: any, source: string): void {
    // Merge endpoints
    if (data.endpoints) {
      data.endpoints.forEach((endpoint: Endpoint) => {
        endpoint.source = source as any;
        appSpec.endpoints.push(endpoint);
      });
    }

    // Merge parameters
    if (data.parameters) {
      Object.assign(appSpec.parameters, data.parameters);
    }

    // Merge security schemes
    if (data.security) {
      Object.assign(appSpec.security, data.security);
    }

    // Merge components
    if (data.components) {
      if (!appSpec.components) appSpec.components = {};
      if (data.components.schemas) {
        if (!appSpec.components.schemas) appSpec.components.schemas = {};
        Object.assign(appSpec.components.schemas, data.components.schemas);
      }
    }

    // Update info if more detailed
    if (data.info && (!appSpec.info.title || appSpec.info.title === 'Application')) {
      appSpec.info = { ...appSpec.info, ...data.info };
    }
  }

  private deduplicateEndpoints(endpoints: Endpoint[]): Endpoint[] {
    const seen = new Map<string, Endpoint>();
    
    for (const endpoint of endpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, endpoint);
      } else {
        // Merge with existing, preferring more detailed information
        const merged = this.mergeEndpoints(existing, endpoint);
        seen.set(key, merged);
      }
    }
    
    return Array.from(seen.values());
  }

  private mergeEndpoints(existing: Endpoint, incoming: Endpoint): Endpoint {
    return {
      ...existing,
      // Prefer non-empty descriptions
      description: incoming.description || existing.description,
      summary: incoming.summary || existing.summary,
      // Merge parameters
      parameters: this.mergeParameters(existing.parameters || [], incoming.parameters || []),
      // Merge tags
      tags: [...new Set([...(existing.tags || []), ...(incoming.tags || [])])],
      // Prefer more detailed security info
      security: incoming.security || existing.security,
      // Keep semantic annotations from both
      semantics: incoming.semantics || existing.semantics
    };
  }

  private mergeParameters(existing: any[], incoming: any[]): any[] {
    const merged = [...existing];
    
    for (const incomingParam of incoming) {
      const existingIndex = merged.findIndex(p => p.name === incomingParam.name && p.in === incomingParam.in);
      
      if (existingIndex >= 0) {
        // Merge parameter information
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...incomingParam,
          // Keep semantic info from both
          semantic: incomingParam.semantic || merged[existingIndex].semantic
        };
      } else {
        merged.push(incomingParam);
      }
    }
    
    return merged;
  }

  private normalizeParameters(appSpec: AppSpec): void {
    // Extract common parameters to the global parameters section
    const parameterCounts = new Map<string, number>();
    
    // Count parameter usage
    appSpec.endpoints.forEach(endpoint => {
      endpoint.parameters?.forEach(param => {
        const key = `${param.name}:${param.in}`;
        parameterCounts.set(key, (parameterCounts.get(key) || 0) + 1);
      });
    });

    // Extract frequently used parameters (used in 3+ endpoints)
    parameterCounts.forEach((count, key) => {
      if (count >= 3) {
        const [name, location] = key.split(':');
        // Find the parameter definition and add to global parameters
        // This is simplified - in a real implementation, we'd be more careful about this
      }
    });
  }

  private resolveSecurityReferences(appSpec: AppSpec): void {
    // Ensure all referenced security schemes exist
    appSpec.endpoints.forEach(endpoint => {
      endpoint.security?.forEach(requirement => {
        Object.keys(requirement).forEach(schemeName => {
          if (!appSpec.security[schemeName]) {
            this.logger.warn(`Security scheme '${schemeName}' referenced but not defined`);
          }
        });
      });
    });
  }

  private generateOperationIds(appSpec: AppSpec): void {
    appSpec.endpoints.forEach(endpoint => {
      if (!endpoint.operationId) {
        // Generate operation ID from method and path
        const pathParts = endpoint.path.split('/').filter(Boolean);
        const cleanPath = pathParts
          .map(part => part.replace(/[{}]/g, ''))
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        
        endpoint.operationId = `${endpoint.method.toLowerCase()}${cleanPath}`;
      }
    });
  }

  private getFileModificationTime(filePath: string): string {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const crypto = await import('crypto');
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return 'unknown';
    }
  }
}
