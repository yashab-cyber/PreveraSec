import { BaseIngestor, IngestionResult } from './BaseIngestor';
/**
 * API Gateway Configuration Ingestor
 */
export declare class GatewayIngestor extends BaseIngestor {
    private logger;
    constructor(config: any);
    getName(): string;
    getSupportedExtensions(): string[];
    isSupported(sourcePath: string): boolean;
    ingest(sourcePath: string): Promise<IngestionResult>;
}
//# sourceMappingURL=GatewayIngestor.d.ts.map