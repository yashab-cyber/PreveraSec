import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PreveraSecConfig, DeepPartial } from '../types/AppSpec';

/**
 * Configuration Manager for PreveraSec
 * Handles loading and merging of configuration from multiple sources
 */
export class ConfigManager {
  private static defaultConfig: PreveraSecConfig = {
    ingestors: {
      openapi: { enabled: true, versions: ['2.0', '3.0', '3.1'] },
      graphql: { enabled: true, introspection: false },
      postman: { enabled: true, environments: true },
      har: { enabled: true, filter_static: true },
      gateway: { enabled: true, providers: ['aws', 'kong', 'istio', 'nginx'] }
    },
    enrichment: {
      source_maps: true,
      typescript_definitions: true,
      semantic_analysis: true,
      code_discovery: {
        enabled: true,
        safe_mode: true,
        max_depth: 5
      }
    },
    rag: {
      embedding_model: 'text-embedding-3-small',
      documentation_sources: ['./docs', './README.md'],
      confidence_threshold: 0.8,
      max_tokens: 4000
    },
    dast: {
      max_concurrent: 10,
      timeout: 30000,
      follow_redirects: true,
      custom_headers: {},
      rate_limit: {
        requests_per_second: 10,
        burst_size: 20
      }
    },
    output: {
      format: 'json',
      pretty: true,
      include_metadata: true
    },
    security: {
      rate_limiting: {
        enabled: true,
        requests_per_minute: 1000
      },
      allowed_origins: ['*']
    }
  };

  /**
   * Load configuration from file with fallback to defaults
   */
  public static async load(configPath?: string): Promise<PreveraSecConfig> {
    let config = this.defaultConfig;

    // Try to load from specified path or common locations
    const paths = configPath 
      ? [configPath]
      : [
          './preversec.config.json',
          './preversec.config.yaml',
          './preversec.config.yml',
          './.preversec.json',
          './config/preversec.json'
        ];

    for (const filePath of paths) {
      try {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const userConfig = this.parseConfig(fileContent, filePath);
          config = this.mergeConfigs(config, userConfig);
          break;
        }
      } catch (error) {
        console.warn(`Warning: Failed to load config from ${filePath}:`, error);
      }
    }

    // Override with environment variables
    config = this.applyEnvironmentOverrides(config);

    return this.validateConfig(config);
  }

  /**
   * Parse configuration file based on extension
   */
  private static parseConfig(content: string, filePath: string): DeepPartial<PreveraSecConfig> {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.json':
        return JSON.parse(content);
      case '.yaml':
      case '.yml':
        return yaml.load(content) as DeepPartial<PreveraSecConfig>;
      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }
  }

  /**
   * Deep merge configurations with user config taking precedence
   */
  private static mergeConfigs(
    defaultConfig: PreveraSecConfig,
    userConfig: DeepPartial<PreveraSecConfig>
  ): PreveraSecConfig {
    return this.deepMerge(defaultConfig, userConfig) as PreveraSecConfig;
  }

  /**
   * Deep merge utility function
   */
  private static deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   */
  private static isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Apply environment variable overrides
   */
  private static applyEnvironmentOverrides(config: PreveraSecConfig): PreveraSecConfig {
    const envConfig = { ...config };

    // RAG configuration
    if (process.env.OPENAI_API_KEY) {
      envConfig.rag.api_key = process.env.OPENAI_API_KEY;
    }

    // DAST configuration
    if (process.env.PREVERSEC_MAX_CONCURRENT) {
      envConfig.dast.max_concurrent = parseInt(process.env.PREVERSEC_MAX_CONCURRENT);
    }

    if (process.env.PREVERSEC_TIMEOUT) {
      envConfig.dast.timeout = parseInt(process.env.PREVERSEC_TIMEOUT);
    }

    // Security configuration
    if (process.env.PREVERSEC_API_KEY) {
      envConfig.security!.api_key = process.env.PREVERSEC_API_KEY;
    }

    // Output configuration
    if (process.env.PREVERSEC_OUTPUT_FORMAT) {
      envConfig.output!.format = process.env.PREVERSEC_OUTPUT_FORMAT as 'json' | 'yaml';
    }

    return envConfig;
  }

  /**
   * Validate configuration and apply constraints
   */
  private static validateConfig(config: PreveraSecConfig): PreveraSecConfig {
    const validated = { ...config };

    // Validate DAST settings
    if (validated.dast.max_concurrent < 1) {
      console.warn('max_concurrent must be at least 1, setting to 1');
      validated.dast.max_concurrent = 1;
    }
    if (validated.dast.max_concurrent > 100) {
      console.warn('max_concurrent capped at 100 for safety');
      validated.dast.max_concurrent = 100;
    }

    if (validated.dast.timeout < 1000) {
      console.warn('timeout must be at least 1000ms, setting to 1000');
      validated.dast.timeout = 1000;
    }

    // Validate RAG settings
    if (validated.rag.confidence_threshold < 0 || validated.rag.confidence_threshold > 1) {
      console.warn('confidence_threshold must be between 0 and 1, setting to 0.8');
      validated.rag.confidence_threshold = 0.8;
    }

    // Validate code discovery depth
    if (validated.enrichment.code_discovery.max_depth && validated.enrichment.code_discovery.max_depth > 10) {
      console.warn('code_discovery max_depth capped at 10 for performance');
      validated.enrichment.code_discovery.max_depth = 10;
    }

    return validated;
  }

  /**
   * Save configuration to file
   */
  public static async save(config: PreveraSecConfig, filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();
    let content: string;

    switch (ext) {
      case '.json':
        content = JSON.stringify(config, null, 2);
        break;
      case '.yaml':
      case '.yml':
        content = yaml.dump(config, { indent: 2 });
        break;
      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Get default configuration
   */
  public static getDefault(): PreveraSecConfig {
    return JSON.parse(JSON.stringify(this.defaultConfig));
  }

  /**
   * Create a minimal configuration template
   */
  public static createTemplate(): string {
    const template = {
      ingestors: {
        openapi: { enabled: true },
        graphql: { enabled: false },
        postman: { enabled: true },
        har: { enabled: false },
        gateway: { enabled: false }
      },
      enrichment: {
        source_maps: true,
        typescript_definitions: true,
        semantic_analysis: true,
        code_discovery: { enabled: true, safe_mode: true }
      },
      rag: {
        embedding_model: 'text-embedding-3-small',
        documentation_sources: ['./docs'],
        confidence_threshold: 0.8
      },
      dast: {
        max_concurrent: 5,
        timeout: 30000
      }
    };

    return JSON.stringify(template, null, 2);
  }

  /**
   * Validate a configuration object against the schema
   */
  public static validate(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic structure validation
    if (!config.ingestors) errors.push('Missing ingestors configuration');
    if (!config.enrichment) errors.push('Missing enrichment configuration');
    if (!config.rag) errors.push('Missing RAG configuration');
    if (!config.dast) errors.push('Missing DAST configuration');

    // Type validation
    if (config.dast && typeof config.dast.max_concurrent !== 'number') {
      errors.push('dast.max_concurrent must be a number');
    }

    if (config.rag && typeof config.rag.confidence_threshold !== 'number') {
      errors.push('rag.confidence_threshold must be a number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
