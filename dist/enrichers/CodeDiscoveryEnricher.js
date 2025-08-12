"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeDiscoveryEnricher = void 0;
const BaseEnricher_1 = require("./BaseEnricher");
const Logger_1 = require("../utils/Logger");
/**
 * Code Discovery Enricher
 * Performs safe, read-only static analysis of source code to find hidden endpoints
 */
class CodeDiscoveryEnricher extends BaseEnricher_1.BaseEnricher {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'CodeDiscovery';
    }
    isEnabled() {
        return this.config.enrichment.code_discovery.enabled;
    }
    async enrich(appSpec, sources) {
        if (!sources.source)
            return;
        this.logger.enricher('code-discovery', `Analyzing source code from ${sources.source}`);
        // TODO: Implement static code analysis
        // This would parse source files to:
        // - Find route definitions in Express, Flask, etc.
        // - Discover undocumented endpoints
        // - Extract parameter validation rules
        // - Identify middleware and security constraints
        this.logger.enricher('code-discovery', 'Code analysis completed (placeholder)');
    }
}
exports.CodeDiscoveryEnricher = CodeDiscoveryEnricher;
//# sourceMappingURL=CodeDiscoveryEnricher.js.map