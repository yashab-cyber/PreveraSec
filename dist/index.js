"use strict";
/**
 * PreveraSec - AppSpec++ Full Grey-Box Context Compiler
 * Main entry point for the library
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = exports.ConfigManager = exports.Logger = exports.RAGEnricher = exports.CodeDiscoveryEnricher = exports.TypeScriptEnricher = exports.SourceMapEnricher = exports.BaseEnricher = exports.GatewayIngestor = exports.HARIngestor = exports.PostmanIngestor = exports.GraphQLIngestor = exports.OpenAPIIngestor = exports.BaseIngestor = exports.PreveraSecServer = exports.DASTScanner = exports.DiffTool = exports.AppSpecValidator = exports.AppSpecCompiler = void 0;
// Core exports
var AppSpecCompiler_1 = require("./core/AppSpecCompiler");
Object.defineProperty(exports, "AppSpecCompiler", { enumerable: true, get: function () { return AppSpecCompiler_1.AppSpecCompiler; } });
var AppSpecValidator_1 = require("./core/AppSpecValidator");
Object.defineProperty(exports, "AppSpecValidator", { enumerable: true, get: function () { return AppSpecValidator_1.AppSpecValidator; } });
var DiffTool_1 = require("./core/DiffTool");
Object.defineProperty(exports, "DiffTool", { enumerable: true, get: function () { return DiffTool_1.DiffTool; } });
// DAST exports
var DASTScanner_1 = require("./dast/DASTScanner");
Object.defineProperty(exports, "DASTScanner", { enumerable: true, get: function () { return DASTScanner_1.DASTScanner; } });
// Server exports
var PreveraSecServer_1 = require("./server/PreveraSecServer");
Object.defineProperty(exports, "PreveraSecServer", { enumerable: true, get: function () { return PreveraSecServer_1.PreveraSecServer; } });
// Ingestor exports
var BaseIngestor_1 = require("./ingestors/BaseIngestor");
Object.defineProperty(exports, "BaseIngestor", { enumerable: true, get: function () { return BaseIngestor_1.BaseIngestor; } });
var OpenAPIIngestor_1 = require("./ingestors/OpenAPIIngestor");
Object.defineProperty(exports, "OpenAPIIngestor", { enumerable: true, get: function () { return OpenAPIIngestor_1.OpenAPIIngestor; } });
var GraphQLIngestor_1 = require("./ingestors/GraphQLIngestor");
Object.defineProperty(exports, "GraphQLIngestor", { enumerable: true, get: function () { return GraphQLIngestor_1.GraphQLIngestor; } });
var PostmanIngestor_1 = require("./ingestors/PostmanIngestor");
Object.defineProperty(exports, "PostmanIngestor", { enumerable: true, get: function () { return PostmanIngestor_1.PostmanIngestor; } });
var HARIngestor_1 = require("./ingestors/HARIngestor");
Object.defineProperty(exports, "HARIngestor", { enumerable: true, get: function () { return HARIngestor_1.HARIngestor; } });
var GatewayIngestor_1 = require("./ingestors/GatewayIngestor");
Object.defineProperty(exports, "GatewayIngestor", { enumerable: true, get: function () { return GatewayIngestor_1.GatewayIngestor; } });
// Enricher exports
var BaseEnricher_1 = require("./enrichers/BaseEnricher");
Object.defineProperty(exports, "BaseEnricher", { enumerable: true, get: function () { return BaseEnricher_1.BaseEnricher; } });
var SourceMapEnricher_1 = require("./enrichers/SourceMapEnricher");
Object.defineProperty(exports, "SourceMapEnricher", { enumerable: true, get: function () { return SourceMapEnricher_1.SourceMapEnricher; } });
var TypeScriptEnricher_1 = require("./enrichers/TypeScriptEnricher");
Object.defineProperty(exports, "TypeScriptEnricher", { enumerable: true, get: function () { return TypeScriptEnricher_1.TypeScriptEnricher; } });
var CodeDiscoveryEnricher_1 = require("./enrichers/CodeDiscoveryEnricher");
Object.defineProperty(exports, "CodeDiscoveryEnricher", { enumerable: true, get: function () { return CodeDiscoveryEnricher_1.CodeDiscoveryEnricher; } });
var RAGEnricher_1 = require("./enrichers/RAGEnricher");
Object.defineProperty(exports, "RAGEnricher", { enumerable: true, get: function () { return RAGEnricher_1.RAGEnricher; } });
// Utility exports
var Logger_1 = require("./utils/Logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return Logger_1.Logger; } });
var ConfigManager_1 = require("./utils/ConfigManager");
Object.defineProperty(exports, "ConfigManager", { enumerable: true, get: function () { return ConfigManager_1.ConfigManager; } });
// Type exports
__exportStar(require("./types/AppSpec"), exports);
// Version
exports.version = require('../package.json').version;
//# sourceMappingURL=index.js.map