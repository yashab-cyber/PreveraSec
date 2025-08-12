"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostmanIngestor = void 0;
const BaseIngestor_1 = require("./BaseIngestor");
const Logger_1 = require("../utils/Logger");
/**
 * Postman Collection Ingestor
 */
class PostmanIngestor extends BaseIngestor_1.BaseIngestor {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'Postman';
    }
    getSupportedExtensions() {
        return ['.json'];
    }
    isSupported(sourcePath) {
        // Would check if JSON file is a Postman collection
        return sourcePath.toLowerCase().endsWith('.json');
    }
    async ingest(sourcePath) {
        this.logger.ingestor('postman', `Ingesting from ${sourcePath}`);
        // TODO: Implement Postman collection parsing
        return {
            endpoints: [],
            parameters: {},
            security: {},
            info: {
                title: 'Postman Collection',
                version: '1.0.0'
            }
        };
    }
}
exports.PostmanIngestor = PostmanIngestor;
//# sourceMappingURL=PostmanIngestor.js.map