"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEnricher = void 0;
/**
 * Base interface for all enrichers
 * Enrichers add additional context and semantic information to the AppSpec
 */
class BaseEnricher {
    constructor(config) {
        this.config = config;
    }
    /**
     * Get priority for enricher execution order (lower = higher priority)
     */
    getPriority() {
        return 100;
    }
}
exports.BaseEnricher = BaseEnricher;
//# sourceMappingURL=BaseEnricher.js.map