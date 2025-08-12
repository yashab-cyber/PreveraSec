"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceMapEnricher = void 0;
const BaseEnricher_1 = require("./BaseEnricher");
const Logger_1 = require("../utils/Logger");
/**
 * Source Map Enricher
 * Analyzes source maps to understand frontend-backend API relationships
 */
class SourceMapEnricher extends BaseEnricher_1.BaseEnricher {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'SourceMap';
    }
    isEnabled() {
        return this.config.enrichment.source_maps;
    }
    async enrich(appSpec, sources) {
        if (!sources.sourceMaps)
            return;
        this.logger.enricher('sourcemap', `Analyzing source maps from ${sources.sourceMaps}`);
        // TODO: Implement source map analysis
        // This would parse source maps to:
        // - Find API calls in frontend code
        // - Map minified code to original sources
        // - Detect client-side API usage patterns
        if (!appSpec.frontend)
            appSpec.frontend = {};
        appSpec.frontend.sourceMaps = {
            available: true,
            files: []
        };
    }
}
exports.SourceMapEnricher = SourceMapEnricher;
//# sourceMappingURL=SourceMapEnricher.js.map