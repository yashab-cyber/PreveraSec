"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLIngestor = void 0;
const BaseIngestor_1 = require("./BaseIngestor");
const Logger_1 = require("../utils/Logger");
/**
 * GraphQL SDL Ingestor
 * Parses GraphQL Schema Definition Language files
 */
class GraphQLIngestor extends BaseIngestor_1.BaseIngestor {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'GraphQL';
    }
    getSupportedExtensions() {
        return ['.graphql', '.gql', '.sdl'];
    }
    isSupported(sourcePath) {
        return this.getSupportedExtensions().some(ext => sourcePath.toLowerCase().endsWith(ext));
    }
    async ingest(sourcePath) {
        this.logger.ingestor('graphql', `Ingesting from ${sourcePath}`);
        // TODO: Implement GraphQL SDL parsing
        // This would use graphql-tools or similar to parse SDL and extract:
        // - Queries as GET endpoints
        // - Mutations as POST endpoints
        // - Subscriptions as WebSocket endpoints
        // - Types as schemas
        return {
            endpoints: [],
            parameters: {},
            security: {},
            info: {
                title: 'GraphQL API',
                version: '1.0.0'
            }
        };
    }
}
exports.GraphQLIngestor = GraphQLIngestor;
//# sourceMappingURL=GraphQLIngestor.js.map