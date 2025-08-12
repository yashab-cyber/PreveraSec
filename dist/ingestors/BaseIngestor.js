"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseIngestor = void 0;
/**
 * Base interface for all ingestors
 * Ingestors are responsible for extracting API information from various sources
 */
class BaseIngestor {
    constructor(config) {
        this.config = config;
    }
    /**
     * Preprocess source content before ingestion
     */
    preprocessContent(content) {
        return content;
    }
    /**
     * Postprocess ingestion result
     */
    postprocessResult(result) {
        return result;
    }
}
exports.BaseIngestor = BaseIngestor;
//# sourceMappingURL=BaseIngestor.js.map