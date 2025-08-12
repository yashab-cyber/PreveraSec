"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPIIngestor = void 0;
const swagger_parser_1 = __importDefault(require("@apidevtools/swagger-parser"));
const BaseIngestor_1 = require("./BaseIngestor");
const Logger_1 = require("../utils/Logger");
/**
 * OpenAPI/Swagger Ingestor
 * Supports OpenAPI 2.0, 3.0, and 3.1 specifications
 */
class OpenAPIIngestor extends BaseIngestor_1.BaseIngestor {
    constructor(config) {
        super(config);
        this.logger = Logger_1.Logger.getInstance();
    }
    getName() {
        return 'OpenAPI';
    }
    getSupportedExtensions() {
        return ['.json', '.yaml', '.yml'];
    }
    isSupported(sourcePath) {
        const extensions = this.getSupportedExtensions();
        return extensions.some(ext => sourcePath.toLowerCase().endsWith(ext));
    }
    async ingest(sourcePath) {
        this.logger.ingestor('openapi', `Ingesting from ${sourcePath}`);
        try {
            // Parse and validate OpenAPI specification
            const api = await swagger_parser_1.default.validate(sourcePath);
            const result = {
                endpoints: [],
                parameters: {},
                security: {},
                components: {},
                info: this.extractInfo(api)
            };
            // Extract endpoints
            result.endpoints = this.extractEndpoints(api);
            // Extract reusable components
            result.components = this.extractComponents(api);
            // Extract security schemes
            result.security = this.extractSecuritySchemes(api);
            // Extract global parameters
            result.parameters = this.extractGlobalParameters(api);
            this.logger.ingestor('openapi', `Extracted ${result.endpoints?.length} endpoints`);
            return this.postprocessResult(result);
        }
        catch (error) {
            this.logger.error(`OpenAPI ingestion failed for ${sourcePath}`, error);
            throw error;
        }
    }
    extractInfo(api) {
        return {
            title: api.info?.title || 'API',
            version: api.info?.version || '1.0.0',
            description: api.info?.description,
            contact: api.info?.contact,
            license: api.info?.license,
            servers: api.servers || (api.host ? [{
                    url: `${api.schemes?.[0] || 'https'}://${api.host}${api.basePath || ''}`,
                    description: 'API Server'
                }] : [])
        };
    }
    extractEndpoints(api) {
        const endpoints = [];
        if (!api.paths)
            return endpoints;
        Object.entries(api.paths).forEach(([path, pathItem]) => {
            if (!pathItem)
                return;
            const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
            httpMethods.forEach(method => {
                const operation = pathItem[method.toLowerCase()];
                if (!operation)
                    return;
                const endpoint = {
                    id: `${method.toLowerCase()}_${path.replace(/[{}]/g, '').replace(/\//g, '_')}`,
                    path: this.normalizePath(path),
                    method,
                    source: 'openapi',
                    operationId: operation.operationId,
                    summary: operation.summary,
                    description: operation.description,
                    tags: operation.tags,
                    parameters: this.extractParameters(operation.parameters || [], pathItem.parameters || []),
                    requestBody: this.extractRequestBody(operation.requestBody),
                    responses: this.extractResponses(operation.responses || {}),
                    security: this.extractSecurity(operation.security || api.security),
                    deprecated: operation.deprecated,
                    semantics: this.extractSemantics(operation)
                };
                endpoints.push(endpoint);
            });
        });
        return endpoints;
    }
    extractParameters(operationParams, pathParams = []) {
        const allParams = [...pathParams, ...operationParams];
        return allParams.map(param => {
            // Handle parameter references
            if (param.$ref) {
                // In a real implementation, we'd resolve the reference
                return this.createParameterFromRef(param.$ref);
            }
            return {
                name: param.name,
                in: param.in,
                description: param.description,
                required: param.required || param.in === 'path',
                deprecated: param.deprecated,
                schema: this.extractSchema(param.schema || param),
                example: param.example,
                examples: param.examples,
                semantic: this.detectSemanticType(param.name, param.schema),
                sensitive: this.isSensitiveParameter(param.name)
            };
        });
    }
    extractRequestBody(requestBody) {
        if (!requestBody)
            return undefined;
        return {
            description: requestBody.description,
            required: requestBody.required,
            content: requestBody.content ? Object.fromEntries(Object.entries(requestBody.content).map(([mediaType, content]) => [
                mediaType,
                {
                    schema: this.extractSchema(content.schema),
                    example: content.example,
                    examples: content.examples
                }
            ])) : undefined
        };
    }
    extractResponses(responses) {
        return Object.fromEntries(Object.entries(responses).map(([statusCode, response]) => [
            statusCode,
            {
                description: response.description || `${statusCode} response`,
                headers: response.headers ? Object.fromEntries(Object.entries(response.headers).map(([name, header]) => [
                    name,
                    {
                        description: header.description,
                        required: header.required,
                        schema: this.extractSchema(header.schema)
                    }
                ])) : undefined,
                content: response.content ? Object.fromEntries(Object.entries(response.content).map(([mediaType, content]) => [
                    mediaType,
                    {
                        schema: this.extractSchema(content.schema),
                        example: content.example,
                        examples: content.examples
                    }
                ])) : undefined
            }
        ]));
    }
    extractSecurity(security) {
        if (!security)
            return undefined;
        return security;
    }
    extractComponents(api) {
        if (api.components) {
            return {
                schemas: api.components.schemas,
                parameters: api.components.parameters,
                headers: api.components.headers,
                responses: api.components.responses,
                examples: api.components.examples,
                securitySchemes: api.components.securitySchemes
            };
        }
        // OpenAPI 2.0 (Swagger) format
        if (api.definitions || api.parameters || api.responses) {
            return {
                schemas: api.definitions,
                parameters: api.parameters,
                responses: api.responses
            };
        }
        return {};
    }
    extractSecuritySchemes(api) {
        const schemes = {};
        // OpenAPI 3.x
        if (api.components?.securitySchemes) {
            Object.entries(api.components.securitySchemes).forEach(([name, scheme]) => {
                schemes[name] = this.normalizeSecurityScheme(scheme);
            });
        }
        // OpenAPI 2.0 (Swagger)
        if (api.securityDefinitions) {
            Object.entries(api.securityDefinitions).forEach(([name, scheme]) => {
                schemes[name] = this.normalizeSecurityScheme(scheme);
            });
        }
        return schemes;
    }
    extractGlobalParameters(api) {
        const params = {};
        if (api.components?.parameters) {
            Object.entries(api.components.parameters).forEach(([name, param]) => {
                params[name] = this.normalizeParameter(param);
            });
        }
        if (api.parameters) {
            Object.entries(api.parameters).forEach(([name, param]) => {
                params[name] = this.normalizeParameter(param);
            });
        }
        return params;
    }
    extractSemantics(operation) {
        const semantics = {};
        // Detect data types based on operation info
        if (operation.tags?.some((tag) => ['payment', 'billing', 'finance'].includes(tag.toLowerCase()))) {
            semantics.dataTypes = ['financial'];
        }
        if (operation.tags?.some((tag) => ['user', 'profile', 'account'].includes(tag.toLowerCase()))) {
            semantics.dataTypes = [...(semantics.dataTypes || []), 'pii'];
        }
        // Determine risk level
        if (operation.tags?.some((tag) => ['admin', 'delete', 'critical'].includes(tag.toLowerCase()))) {
            semantics.riskLevel = 'high';
        }
        else if (operation.summary?.toLowerCase().includes('delete') || operation.operationId?.toLowerCase().includes('delete')) {
            semantics.riskLevel = 'medium';
        }
        else {
            semantics.riskLevel = 'low';
        }
        return Object.keys(semantics).length > 0 ? semantics : undefined;
    }
    extractSchema(schema) {
        if (!schema)
            return undefined;
        const result = {};
        // Copy basic schema properties
        const schemaProps = ['type', 'format', 'title', 'description', 'default', 'example', 'enum', 'const'];
        schemaProps.forEach(prop => {
            if (schema[prop] !== undefined) {
                result[prop] = schema[prop];
            }
        });
        // Numeric constraints
        const numericProps = ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'];
        numericProps.forEach(prop => {
            if (schema[prop] !== undefined) {
                result[prop] = schema[prop];
            }
        });
        // String constraints
        const stringProps = ['minLength', 'maxLength', 'pattern'];
        stringProps.forEach(prop => {
            if (schema[prop] !== undefined) {
                result[prop] = schema[prop];
            }
        });
        // Array constraints
        if (schema.items) {
            result.items = this.extractSchema(schema.items);
        }
        const arrayProps = ['minItems', 'maxItems', 'uniqueItems'];
        arrayProps.forEach(prop => {
            if (schema[prop] !== undefined) {
                result[prop] = schema[prop];
            }
        });
        // Object constraints
        if (schema.properties) {
            result.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, this.extractSchema(value)]));
        }
        if (schema.additionalProperties !== undefined) {
            result.additionalProperties = typeof schema.additionalProperties === 'object'
                ? this.extractSchema(schema.additionalProperties)
                : schema.additionalProperties;
        }
        if (schema.required) {
            result.required = schema.required;
        }
        return result;
    }
    normalizePath(path) {
        // Convert OpenAPI path parameters to AppSpec format
        return path.replace(/{([^}]+)}/g, ':$1');
    }
    normalizeSecurityScheme(scheme) {
        return {
            type: scheme.type,
            description: scheme.description,
            name: scheme.name,
            in: scheme.in,
            scheme: scheme.scheme,
            bearerFormat: scheme.bearerFormat,
            flows: scheme.flows,
            openIdConnectUrl: scheme.openIdConnectUrl
        };
    }
    normalizeParameter(param) {
        return {
            name: param.name,
            in: param.in,
            description: param.description,
            required: param.required,
            deprecated: param.deprecated,
            schema: this.extractSchema(param.schema || param),
            example: param.example,
            examples: param.examples,
            semantic: this.detectSemanticType(param.name, param.schema),
            sensitive: this.isSensitiveParameter(param.name)
        };
    }
    createParameterFromRef(ref) {
        // In a real implementation, we'd resolve the reference
        return {
            name: 'unknown',
            in: 'query',
            description: `Referenced parameter: ${ref}`
        };
    }
    detectSemanticType(paramName, schema) {
        const name = paramName.toLowerCase();
        if (name.includes('email'))
            return 'email';
        if (name.includes('password') || name.includes('pwd'))
            return 'password';
        if (name.includes('token') || name.includes('jwt'))
            return 'jwt';
        if (name.includes('csrf'))
            return 'csrf';
        if (name.includes('id') && schema?.type === 'string')
            return 'id';
        if (name.includes('timestamp') || name.includes('time') || schema?.format === 'date-time')
            return 'timestamp';
        if (schema?.format === 'uri' || name.includes('url'))
            return 'url';
        if (name.includes('phone') || schema?.pattern?.includes('phone'))
            return 'phone';
        if (name.includes('amount') || name.includes('price') || name.includes('cost'))
            return 'money';
        return undefined;
    }
    isSensitiveParameter(paramName) {
        const sensitiveNames = [
            'password', 'secret', 'token', 'key', 'auth', 'credential',
            'ssn', 'social', 'credit', 'card', 'cvv', 'pin'
        ];
        const name = paramName.toLowerCase();
        return sensitiveNames.some(sensitive => name.includes(sensitive));
    }
}
exports.OpenAPIIngestor = OpenAPIIngestor;
//# sourceMappingURL=OpenAPIIngestor.js.map