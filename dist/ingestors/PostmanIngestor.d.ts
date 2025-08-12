import { BaseIngestor, IngestionResult } from './BaseIngestor';
/**
 * Postman Collection Ingestor
 */
export declare class PostmanIngestor extends BaseIngestor {
    private logger;
    constructor(config: any);
    getName(): string;
    getSupportedExtensions(): string[];
    isSupported(sourcePath: string): boolean;
    ingest(sourcePath: string): Promise<IngestionResult>;
}
//# sourceMappingURL=PostmanIngestor.d.ts.map