import { BaseIngestor, IngestionResult } from './BaseIngestor';
/**
 * OpenAPI/Swagger Ingestor
 * Supports OpenAPI 2.0, 3.0, and 3.1 specifications
 */
export declare class OpenAPIIngestor extends BaseIngestor {
    private logger;
    constructor(config: any);
    getName(): string;
    getSupportedExtensions(): string[];
    isSupported(sourcePath: string): boolean;
    ingest(sourcePath: string): Promise<IngestionResult>;
    private extractInfo;
    private extractEndpoints;
    private extractParameters;
    private extractRequestBody;
    private extractResponses;
    private extractSecurity;
    private extractComponents;
    private extractSecuritySchemes;
    private extractGlobalParameters;
    private extractSemantics;
    private extractSchema;
    private normalizePath;
    private normalizeSecurityScheme;
    private normalizeParameter;
    private createParameterFromRef;
    private detectSemanticType;
    private isSensitiveParameter;
}
//# sourceMappingURL=OpenAPIIngestor.d.ts.map