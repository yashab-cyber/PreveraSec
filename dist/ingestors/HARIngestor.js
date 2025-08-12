"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HARIngestor = void 0;
const BaseIngestor_1 = require("./BaseIngestor");
const Logger_1 = require("../utils/Logger");
/**
 * HAR (HTTP Archive) Ingestor
 */
class HARIngestor extends BaseIngestor_1.BaseIngestor {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'HAR';
    }
    getSupportedExtensions() {
        return ['.har', '.json'];
    }
    isSupported(sourcePath) {
        return sourcePath.toLowerCase().endsWith('.har') || sourcePath.toLowerCase().endsWith('.json');
    }
    async ingest(sourcePath) {
        this.logger.ingestor('har', `Ingesting from ${sourcePath}`);
        // TODO: Implement HAR file parsing
        return {
            endpoints: [],
            parameters: {},
            security: {},
            info: {
                title: 'HAR Archive',
                version: '1.0.0'
            }
        };
    }
}
exports.HARIngestor = HARIngestor;
//# sourceMappingURL=HARIngestor.js.map