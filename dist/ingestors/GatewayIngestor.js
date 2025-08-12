"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayIngestor = void 0;
const BaseIngestor_1 = require("./BaseIngestor");
const Logger_1 = require("../utils/Logger");
/**
 * API Gateway Configuration Ingestor
 */
class GatewayIngestor extends BaseIngestor_1.BaseIngestor {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'Gateway';
    }
    getSupportedExtensions() {
        return ['.yaml', '.yml', '.json'];
    }
    isSupported(sourcePath) {
        return this.getSupportedExtensions().some(ext => sourcePath.toLowerCase().endsWith(ext));
    }
    async ingest(sourcePath) {
        this.logger.ingestor('gateway', `Ingesting from ${sourcePath}`);
        // TODO: Implement API Gateway config parsing for AWS, Kong, etc.
        return {
            endpoints: [],
            parameters: {},
            security: {},
            info: {
                title: 'Gateway Configuration',
                version: '1.0.0'
            }
        };
    }
}
exports.GatewayIngestor = GatewayIngestor;
//# sourceMappingURL=GatewayIngestor.js.map