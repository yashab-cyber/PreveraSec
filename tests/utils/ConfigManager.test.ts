import { ConfigManager } from '../src/utils/ConfigManager';

describe('ConfigManager', () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Cleanup
  });

  it('should load default configuration', async () => {
    const config = await ConfigManager.load();
    expect(config).toBeDefined();
    expect(config.ingestors).toBeDefined();
    expect(config.dast).toBeDefined();
  });

  it('should validate configuration', () => {
    const validConfig = {
      ingestors: { openapi: { enabled: true } },
      enrichment: { source_maps: true },
      rag: { embedding_model: 'test', documentation_sources: [], confidence_threshold: 0.8 },
      dast: { max_concurrent: 5, timeout: 30000, follow_redirects: true, custom_headers: {} }
    };

    const result = ConfigManager.validate(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid configuration', () => {
    const invalidConfig = {
      dast: { max_concurrent: 'invalid' }
    };

    const result = ConfigManager.validate(invalidConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
