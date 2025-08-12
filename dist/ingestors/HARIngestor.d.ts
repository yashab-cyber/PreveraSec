import { BaseIngestor, IngestionResult } from './BaseIngestor';
/**
 * HAR (HTTP Archive) Ingestor
 */
export declare class HARIngestor extends BaseIngestor {
    private logger;
    constructor(config: any);
    getName(): string;
    getSupportedExtensions(): string[];
    isSupported(sourcePath: string): boolean;
    ingest(sourcePath: string): Promise<IngestionResult>;
}
//# sourceMappingURL=HARIngestor.d.ts.map