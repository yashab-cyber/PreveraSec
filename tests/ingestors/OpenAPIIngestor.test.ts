import { OpenAPIIngestor } from '../../src/ingestors/OpenAPIIngestor';
import { PreveraSecConfig } from '../../src/types/AppSpec';

describe('OpenAPIIngestor', () => {
  let ingestor: OpenAPIIngestor;
  let mockConfig: PreveraSecConfig;

  beforeEach(() => {
    mockConfig = {
      ingestors: {
        openapi: { enabled: true, versions: ['3.0'] },
        graphql: { enabled: false, introspection: false },
        postman: { enabled: false, environments: false },
        har: { enabled: false, filter_static: false },
        gateway: { enabled: false, providers: [] }
      },
      enrichment: {
        source_maps: false,
        typescript_definitions: false,
        semantic_analysis: false,
        code_discovery: { enabled: false, safe_mode: true }
      },
      rag: {
        embedding_model: 'test',
        documentation_sources: [],
        confidence_threshold: 0.8
      },
      dast: {
        max_concurrent: 5,
        timeout: 30000,
        follow_redirects: true,
        custom_headers: {}
      }
    };

    ingestor = new OpenAPIIngestor(mockConfig);
  });

  it('should identify supported file extensions', () => {
    const extensions = ingestor.getSupportedExtensions();
    expect(extensions).toContain('.json');
    expect(extensions).toContain('.yaml');
    expect(extensions).toContain('.yml');
  });

  it('should validate supported files', () => {
    expect(ingestor.isSupported('swagger.json')).toBe(true);
    expect(ingestor.isSupported('openapi.yaml')).toBe(true);
    expect(ingestor.isSupported('api.yml')).toBe(true);
    expect(ingestor.isSupported('test.txt')).toBe(false);
  });

  it('should return correct name', () => {
    expect(ingestor.getName()).toBe('OpenAPI');
  });

  // Integration tests would require actual OpenAPI files
  // For now, we'll add a placeholder
  it.skip('should ingest OpenAPI specification', async () => {
    // This would test with real OpenAPI files
  });
});
