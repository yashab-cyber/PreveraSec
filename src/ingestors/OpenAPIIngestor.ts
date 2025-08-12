import * as fs from 'fs';
import * as yaml from 'js-yaml';
import SwaggerParser from '@apidevtools/swagger-parser';
import { BaseIngestor, IngestionResult } from './BaseIngestor';
import { Endpoint, Parameter, SecurityScheme, HttpMethod } from '../types/AppSpec';
import { Logger } from '../utils/Logger';

/**
 * OpenAPI/Swagger Ingestor
 * Supports OpenAPI 2.0, 3.0, and 3.1 specifications
 */
export class OpenAPIIngestor extends BaseIngestor {
  private logger: Logger;

  constructor(config: any) {
    super(config);
    this.logger = Logger.getInstance();
  }

  public getName(): string {
    return 'OpenAPI';
  }

  public getSupportedExtensions(): string[] {
    return ['.json', '.yaml', '.yml'];
  }

  public isSupported(sourcePath: string): boolean {
    const extensions = this.getSupportedExtensions();
    return extensions.some(ext => sourcePath.toLowerCase().endsWith(ext));
  }

  public async ingest(sourcePath: string): Promise<IngestionResult> {
    this.logger.ingestor('openapi', `Ingesting from ${sourcePath}`);

    try {
      // Parse and validate OpenAPI specification
      const api = await SwaggerParser.validate(sourcePath);
      
      const result: IngestionResult = {
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

    } catch (error) {
      this.logger.error(`OpenAPI ingestion failed for ${sourcePath}`, error);
      throw error;
    }
  }

  private extractInfo(api: any): any {
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

  private extractEndpoints(api: any): Endpoint[] {
    const endpoints: Endpoint[] = [];
    
    if (!api.paths) return endpoints;

    Object.entries(api.paths).forEach(([path, pathItem]: [string, any]) => {
      if (!pathItem) return;

      const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      
      httpMethods.forEach(method => {
        const operation = pathItem[method.toLowerCase()];
        if (!operation) return;

        const endpoint: Endpoint = {
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

  private extractParameters(operationParams: any[], pathParams: any[] = []): Parameter[] {
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

  private extractRequestBody(requestBody: any): any {
    if (!requestBody) return undefined;

    return {
      description: requestBody.description,
      required: requestBody.required,
      content: requestBody.content ? Object.fromEntries(
        Object.entries(requestBody.content).map(([mediaType, content]: [string, any]) => [
          mediaType,
          {
            schema: this.extractSchema(content.schema),
            example: content.example,
            examples: content.examples
          }
        ])
      ) : undefined
    };
  }

  private extractResponses(responses: any): Record<string, any> {
    return Object.fromEntries(
      Object.entries(responses).map(([statusCode, response]: [string, any]) => [
        statusCode,
        {
          description: response.description || `${statusCode} response`,
          headers: response.headers ? Object.fromEntries(
            Object.entries(response.headers).map(([name, header]: [string, any]) => [
              name,
              {
                description: header.description,
                required: header.required,
                schema: this.extractSchema(header.schema)
              }
            ])
          ) : undefined,
          content: response.content ? Object.fromEntries(
            Object.entries(response.content).map(([mediaType, content]: [string, any]) => [
              mediaType,
              {
                schema: this.extractSchema(content.schema),
                example: content.example,
                examples: content.examples
              }
            ])
          ) : undefined
        }
      ])
    );
  }

  private extractSecurity(security: any): any[] | undefined {
    if (!security) return undefined;
    return security;
  }

  private extractComponents(api: any): any {
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

  private extractSecuritySchemes(api: any): Record<string, SecurityScheme> {
    const schemes: Record<string, SecurityScheme> = {};

    // OpenAPI 3.x
    if (api.components?.securitySchemes) {
      Object.entries(api.components.securitySchemes).forEach(([name, scheme]: [string, any]) => {
        schemes[name] = this.normalizeSecurityScheme(scheme);
      });
    }

    // OpenAPI 2.0 (Swagger)
    if (api.securityDefinitions) {
      Object.entries(api.securityDefinitions).forEach(([name, scheme]: [string, any]) => {
        schemes[name] = this.normalizeSecurityScheme(scheme);
      });
    }

    return schemes;
  }

  private extractGlobalParameters(api: any): Record<string, Parameter> {
    const params: Record<string, Parameter> = {};

    if (api.components?.parameters) {
      Object.entries(api.components.parameters).forEach(([name, param]: [string, any]) => {
        params[name] = this.normalizeParameter(param);
      });
    }

    if (api.parameters) {
      Object.entries(api.parameters).forEach(([name, param]: [string, any]) => {
        params[name] = this.normalizeParameter(param);
      });
    }

    return params;
  }

  private extractSemantics(operation: any): any {
    const semantics: any = {};

    // Detect data types based on operation info
    if (operation.tags?.some((tag: string) => ['payment', 'billing', 'finance'].includes(tag.toLowerCase()))) {
      semantics.dataTypes = ['financial'];
    }

    if (operation.tags?.some((tag: string) => ['user', 'profile', 'account'].includes(tag.toLowerCase()))) {
      semantics.dataTypes = [...(semantics.dataTypes || []), 'pii'];
    }

    // Determine risk level
    if (operation.tags?.some((tag: string) => ['admin', 'delete', 'critical'].includes(tag.toLowerCase()))) {
      semantics.riskLevel = 'high';
    } else if (operation.summary?.toLowerCase().includes('delete') || operation.operationId?.toLowerCase().includes('delete')) {
      semantics.riskLevel = 'medium';
    } else {
      semantics.riskLevel = 'low';
    }

    return Object.keys(semantics).length > 0 ? semantics : undefined;
  }

  private extractSchema(schema: any): any {
    if (!schema) return undefined;

    const result: any = {};
    
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
      result.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([key, value]) => [key, this.extractSchema(value)])
      );
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

  private normalizePath(path: string): string {
    // Convert OpenAPI path parameters to AppSpec format
    return path.replace(/{([^}]+)}/g, ':$1');
  }

  private normalizeSecurityScheme(scheme: any): SecurityScheme {
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

  private normalizeParameter(param: any): Parameter {
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

  private createParameterFromRef(ref: string): Parameter {
    // In a real implementation, we'd resolve the reference
    return {
      name: 'unknown',
      in: 'query',
      description: `Referenced parameter: ${ref}`
    };
  }

  private detectSemanticType(paramName: string, schema: any): import('../types/AppSpec').SemanticType | undefined {
    const name = paramName.toLowerCase();
    
    if (name.includes('email')) return 'email';
    if (name.includes('password') || name.includes('pwd')) return 'password';
    if (name.includes('token') || name.includes('jwt')) return 'jwt';
    if (name.includes('csrf')) return 'csrf';
    if (name.includes('id') && schema?.type === 'string') return 'id';
    if (name.includes('timestamp') || name.includes('time') || schema?.format === 'date-time') return 'timestamp';
    if (schema?.format === 'uri' || name.includes('url')) return 'url';
    if (name.includes('phone') || schema?.pattern?.includes('phone')) return 'phone';
    if (name.includes('amount') || name.includes('price') || name.includes('cost')) return 'money';
    
    return undefined;
  }

  private isSensitiveParameter(paramName: string): boolean {
    const sensitiveNames = [
      'password', 'secret', 'token', 'key', 'auth', 'credential',
      'ssn', 'social', 'credit', 'card', 'cvv', 'pin'
    ];
    
    const name = paramName.toLowerCase();
    return sensitiveNames.some(sensitive => name.includes(sensitive));
  }
}
