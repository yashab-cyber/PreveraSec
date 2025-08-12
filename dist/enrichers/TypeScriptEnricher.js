"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptEnricher = void 0;
const BaseEnricher_1 = require("./BaseEnricher");
const Logger_1 = require("../utils/Logger");
/**
 * TypeScript Enricher
 * Analyzes TypeScript definition files for semantic type information
 */
class TypeScriptEnricher extends BaseEnricher_1.BaseEnricher {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'TypeScript';
    }
    isEnabled() {
        return this.config.enrichment.typescript_definitions;
    }
    async enrich(appSpec, sources) {
        if (!sources.typescript)
            return;
        this.logger.enricher('typescript', `Analyzing TypeScript definitions from ${sources.typescript}`);
        // TODO: Implement TypeScript definition analysis
        // This would parse .d.ts files to:
        // - Extract interface definitions
        // - Identify semantic types (email, money, etc.)
        // - Add type validation rules
        if (!appSpec.frontend)
            appSpec.frontend = {};
        appSpec.frontend.typescript = true;
        appSpec.frontend.semanticTypes = {};
    }
}
exports.TypeScriptEnricher = TypeScriptEnricher;
//# sourceMappingURL=TypeScriptEnricher.js.map