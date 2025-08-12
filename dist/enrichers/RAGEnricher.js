"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGEnricher = void 0;
const BaseEnricher_1 = require("./BaseEnricher");
const Logger_1 = require("../utils/Logger");
/**
 * RAG Enricher
 * Uses Retrieval-Augmented Generation to enhance parameter and endpoint documentation
 */
class RAGEnricher extends BaseEnricher_1.BaseEnricher {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'RAG';
    }
    isEnabled() {
        return !!this.config.rag.api_key;
    }
    async enrich(appSpec, sources) {
        if (!sources.docs)
            return;
        this.logger.enricher('rag', `Processing documentation from ${sources.docs}`);
        // TODO: Implement RAG-powered documentation analysis
        // This would:
        // - Embed documentation using OpenAI/similar
        // - Find semantic relationships between docs and parameters
        // - Generate parameter meanings and invariants
        // - Annotate endpoints with business context
        if (!appSpec.documentation) {
            appSpec.documentation = {
                sources: [],
                ragAnnotations: {}
            };
        }
        appSpec.documentation.sources.push({
            type: 'markdown',
            path: sources.docs
        });
        this.logger.enricher('rag', 'RAG enrichment completed (placeholder)');
    }
}
exports.RAGEnricher = RAGEnricher;
//# sourceMappingURL=RAGEnricher.js.map