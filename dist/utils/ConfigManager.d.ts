import { PreveraSecConfig } from '../types/AppSpec';
/**
 * Configuration Manager for PreveraSec
 * Handles loading and merging of configuration from multiple sources
 */
export declare class ConfigManager {
    private static defaultConfig;
    /**
     * Load configuration from file with fallback to defaults
     */
    static load(configPath?: string): Promise<PreveraSecConfig>;
    /**
     * Parse configuration file based on extension
     */
    private static parseConfig;
    /**
     * Deep merge configurations with user config taking precedence
     */
    private static mergeConfigs;
    /**
     * Deep merge utility function
     */
    private static deepMerge;
    /**
     * Check if value is an object
     */
    private static isObject;
    /**
     * Apply environment variable overrides
     */
    private static applyEnvironmentOverrides;
    /**
     * Validate configuration and apply constraints
     */
    private static validateConfig;
    /**
     * Save configuration to file
     */
    static save(config: PreveraSecConfig, filePath: string): Promise<void>;
    /**
     * Get default configuration
     */
    static getDefault(): PreveraSecConfig;
    /**
     * Create a minimal configuration template
     */
    static createTemplate(): string;
    /**
     * Validate a configuration object against the schema
     */
    static validate(config: any): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=ConfigManager.d.ts.map