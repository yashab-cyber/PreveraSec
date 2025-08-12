import { BaseIngestor, IngestionResult } from './BaseIngestor';
/**
 * GraphQL SDL Ingestor
 * Parses GraphQL Schema Definition Language files
 */
export declare class GraphQLIngestor extends BaseIngestor {
    private logger;
    constructor(config: any);
    getName(): string;
    getSupportedExtensions(): string[];
    isSupported(sourcePath: string): boolean;
    ingest(sourcePath: string): Promise<IngestionResult>;
}
//# sourceMappingURL=GraphQLIngestor.d.ts.map