/**
 * Phase 3: Contract-Aware Fuzzing v1 - Semantic Generators
 * 
 * Replaces blind fuzzing with typed, semantic generators for:
 * - Property-based inputs with boundary conditions
 * - Format-aware semantic mutators  
 * - Context-specific payload generation
 */

import { Logger } from '../utils/Logger';
import * as crypto from 'crypto';

export interface GenerationConfig {
  minLength?: number;
  maxLength?: number;
  format?: string;
  charset?: string;
  boundaries?: any[];
  semantic?: string;
  mutation?: boolean;
}

export interface SemanticPayload {
  value: any;
  type: string;
  category: string;
  boundary?: boolean;
  malicious?: boolean;
  description: string;
}

export class SemanticGenerators {
  private logger: Logger;
  private seedValues: Map<string, any[]>;

  constructor() {
    this.logger = Logger.getInstance();
    this.seedValues = new Map();
    this.initializeSeedValues();
  }

  private initializeSeedValues(): void {
    // Email variants for testing
    this.seedValues.set('email', [
      'test@example.com',
      'user+tag@domain.co.uk',
      'very.long.email.address.with.many.dots@subdomain.example-domain.com',
      'user@localhost',
      'unicode@тест.com',
      'special!#$%&*+-/=?^_`{|}~@example.com'
    ]);

    // JWT token patterns
    this.seedValues.set('jwt', [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'invalid.jwt.token',
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyIn0.',
    ]);

    // ID patterns  
    this.seedValues.set('id', [
      '123', '0', '-1', '999999999', '1.5', 'abc', 'null', 'undefined',
      '<?xml version="1.0"?><id>123</id>',
      "'; DROP TABLE users; --",
      '../../../etc/passwd'
    ]);

    // CSRF token patterns
    this.seedValues.set('csrf', [
      crypto.randomBytes(32).toString('hex'),
      'invalid_csrf_token',
      '',
      'a'.repeat(1000)
    ]);

    // Money/currency patterns
    this.seedValues.set('money', [
      '0.01', '999999.99', '-100.00', '0', '0.001', '1e10',
      'NaN', 'Infinity', '-Infinity', '$100', '€50', '¥1000'
    ]);

    // Date patterns
    this.seedValues.set('dates', [
      '2023-12-31', '1900-01-01', '2099-12-31', '2023-02-29',
      '0000-00-00', '2023-13-01', '2023-01-32', 'invalid-date',
      '1970-01-01T00:00:00Z', new Date().toISOString()
    ]);

    // File upload patterns
    this.seedValues.set('files', [
      { name: 'test.txt', type: 'text/plain', size: 1024 },
      { name: 'large.bin', type: 'application/octet-stream', size: 10485760 },
      { name: '../../../etc/passwd', type: 'text/plain', size: 100 },
      { name: 'script.js', type: 'application/javascript', size: 500 },
      { name: 'image.exe', type: 'image/jpeg', size: 2048 }
    ]);

    // Pagination patterns
    this.seedValues.set('pagination', [
      { page: 1, limit: 10 },
      { page: -1, limit: 100 },
      { page: 999999, limit: 1 },
      { page: 0, limit: 0 },
      { page: 'invalid', limit: 'invalid' }
    ]);
  }

  /**
   * Generate semantic payloads based on type and configuration
   */
  generate(type: string, config: GenerationConfig = {}): SemanticPayload[] {
    this.logger.debug('Generating semantic payloads', { type, config });

    switch (type.toLowerCase()) {
      case 'string':
        return this.generateStringPayloads(config);
      case 'integer':
      case 'number':
        return this.generateNumberPayloads(config);
      case 'email':
        return this.generateEmailPayloads(config);
      case 'jwt':
        return this.generateJwtPayloads(config);
      case 'id':
        return this.generateIdPayloads(config);
      case 'csrf':
        return this.generateCsrfPayloads(config);
      case 'money':
      case 'currency':
        return this.generateMoneyPayloads(config);
      case 'date':
      case 'datetime':
        return this.generateDatePayloads(config);
      case 'file':
        return this.generateFilePayloads(config);
      case 'pagination':
        return this.generatePaginationPayloads(config);
      case 'enum':
        return this.generateEnumPayloads(config);
      default:
        return this.generateGenericPayloads(type, config);
    }
  }

  private generateStringPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const minLen = config.minLength || 0;
    const maxLen = config.maxLength || 1000;

    // Boundary conditions
    payloads.push(
      {
        value: '',
        type: 'string',
        category: 'boundary',
        boundary: true,
        malicious: false,
        description: 'Empty string'
      },
      {
        value: 'a'.repeat(minLen),
        type: 'string', 
        category: 'boundary',
        boundary: true,
        malicious: false,
        description: 'Minimum length string'
      },
      {
        value: 'a'.repeat(maxLen),
        type: 'string',
        category: 'boundary',
        boundary: true,
        malicious: false,
        description: 'Maximum length string'
      },
      {
        value: 'a'.repeat(maxLen + 1),
        type: 'string',
        category: 'boundary',
        boundary: true,
        malicious: true,
        description: 'Over maximum length string'
      }
    );

    // Injection patterns
    const injectionPatterns = [
      "'; DROP TABLE users; --",
      '<script>alert("XSS")</script>',
      '{{7*7}}',
      '${7*7}',
      '../../../etc/passwd',
      'null\x00byte',
      '\\u0000'
    ];

    injectionPatterns.forEach(pattern => {
      payloads.push({
        value: pattern,
        type: 'string',
        category: 'injection',
        boundary: false,
        malicious: true,
        description: `Injection pattern: ${pattern.substring(0, 20)}`
      });
    });

    // Unicode and special characters
    payloads.push(
      {
        value: '🚀💻🔐', 
        type: 'string',
        category: 'unicode',
        boundary: false,
        malicious: false,
        description: 'Unicode emoji characters'
      },
      {
        value: 'тест测试',
        type: 'string',
        category: 'unicode', 
        boundary: false,
        malicious: false,
        description: 'Unicode text characters'
      }
    );

    return payloads;
  }

  private generateNumberPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];

    // Boundary conditions
    const boundaries = [
      { value: 0, desc: 'Zero' },
      { value: -1, desc: 'Negative one' },
      { value: 1, desc: 'Positive one' },
      { value: Number.MAX_SAFE_INTEGER, desc: 'Maximum safe integer' },
      { value: Number.MIN_SAFE_INTEGER, desc: 'Minimum safe integer' },
      { value: Number.POSITIVE_INFINITY, desc: 'Positive infinity' },
      { value: Number.NEGATIVE_INFINITY, desc: 'Negative infinity' },
      { value: NaN, desc: 'NaN' },
      { value: 2147483647, desc: '32-bit max integer' },
      { value: -2147483648, desc: '32-bit min integer' }
    ];

    boundaries.forEach(({ value, desc }) => {
      payloads.push({
        value,
        type: 'number',
        category: 'boundary',
        boundary: true,
        malicious: false,
        description: desc
      });
    });

    // Custom boundaries if provided
    if (config.boundaries) {
      config.boundaries.forEach((boundary, index) => {
        payloads.push({
          value: boundary,
          type: 'number',
          category: 'custom_boundary',
          boundary: true,
          malicious: false,
          description: `Custom boundary ${index + 1}`
        });
      });
    }

    return payloads;
  }

  private generateEmailPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const seeds = this.seedValues.get('email') || [];

    seeds.forEach(email => {
      payloads.push({
        value: email,
        type: 'email',
        category: 'valid',
        boundary: false,
        malicious: false,
        description: `Valid email: ${email}`
      });
    });

    // Invalid email patterns
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user..double.dot@example.com',
      'user@.com',
      'user@com',
      'a'.repeat(320) + '@example.com' // Over RFC limit
    ];

    invalidEmails.forEach(email => {
      payloads.push({
        value: email,
        type: 'email',
        category: 'invalid',
        boundary: true,
        malicious: true,
        description: `Invalid email: ${email.substring(0, 30)}`
      });
    });

    return payloads;
  }

  private generateJwtPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const seeds = this.seedValues.get('jwt') || [];

    seeds.forEach(jwt => {
      payloads.push({
        value: jwt,
        type: 'jwt',
        category: 'token',
        boundary: false,
        malicious: jwt.includes('invalid'),
        description: `JWT token: ${jwt.substring(0, 20)}...`
      });
    });

    // JWT manipulation attacks
    const manipulations = [
      'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiJ9.', // None algorithm
      '', // Empty token
      'not.a.jwt', // Invalid format
      'a'.repeat(2000) // Oversized token
    ];

    manipulations.forEach(jwt => {
      payloads.push({
        value: jwt,
        type: 'jwt',
        category: 'attack',
        boundary: false,
        malicious: true,
        description: `JWT attack: ${jwt.substring(0, 20)}...`
      });
    });

    return payloads;
  }

  private generateIdPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const seeds = this.seedValues.get('id') || [];

    seeds.forEach(id => {
      const isMalicious = typeof id === 'string' && (
        id.includes('DROP') || 
        id.includes('../') || 
        id.includes('<')
      );

      payloads.push({
        value: id,
        type: 'id',
        category: isMalicious ? 'injection' : 'boundary',
        boundary: !isMalicious,
        malicious: isMalicious,
        description: `ID value: ${String(id).substring(0, 30)}`
      });
    });

    return payloads;
  }

  private generateCsrfPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const seeds = this.seedValues.get('csrf') || [];

    seeds.forEach(csrf => {
      payloads.push({
        value: csrf,
        type: 'csrf',
        category: 'token',
        boundary: false,
        malicious: csrf === '' || csrf === 'invalid_csrf_token',
        description: `CSRF token: ${String(csrf).substring(0, 20)}...`
      });
    });

    return payloads;
  }

  private generateMoneyPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const seeds = this.seedValues.get('money') || [];

    seeds.forEach(money => {
      const isMalicious = String(money).includes('NaN') || 
                         String(money).includes('Infinity') ||
                         String(money).startsWith('-');

      payloads.push({
        value: money,
        type: 'money',
        category: 'currency',
        boundary: false,
        malicious: isMalicious,
        description: `Money value: ${money}`
      });
    });

    return payloads;
  }

  private generateDatePayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const seeds = this.seedValues.get('dates') || [];

    seeds.forEach(date => {
      const isMalicious = String(date).includes('invalid') ||
                         String(date).includes('00-00') ||
                         String(date).includes('-13-') ||
                         String(date).includes('-32');

      payloads.push({
        value: date,
        type: 'date',
        category: 'temporal',
        boundary: false,
        malicious: isMalicious,
        description: `Date value: ${date}`
      });
    });

    return payloads;
  }

  private generateFilePayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const seeds = this.seedValues.get('files') || [];

    seeds.forEach(file => {
      const isMalicious = file.name.includes('../') ||
                         file.name.includes('.exe') ||
                         file.size > 10000000;

      payloads.push({
        value: file,
        type: 'file',
        category: 'upload',
        boundary: false,
        malicious: isMalicious,
        description: `File: ${file.name} (${file.size} bytes)`
      });
    });

    return payloads;
  }

  private generatePaginationPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const seeds = this.seedValues.get('pagination') || [];

    seeds.forEach(pagination => {
      const isMalicious = pagination.page < 0 || 
                         pagination.limit <= 0 ||
                         pagination.page > 100000;

      payloads.push({
        value: pagination,
        type: 'pagination',
        category: 'navigation',
        boundary: false,
        malicious: isMalicious,
        description: `Pagination: page=${pagination.page}, limit=${pagination.limit}`
      });
    });

    return payloads;
  }

  private generateEnumPayloads(config: GenerationConfig): SemanticPayload[] {
    const payloads: SemanticPayload[] = [];
    const validValues = config.boundaries || ['option1', 'option2', 'option3'];

    // Valid enum values
    validValues.forEach(value => {
      payloads.push({
        value,
        type: 'enum',
        category: 'valid',
        boundary: false,
        malicious: false,
        description: `Valid enum: ${value}`
      });
    });

    // Invalid enum values
    const invalidValues = ['invalid_option', '', 'null', '999', '<script>'];
    invalidValues.forEach(value => {
      payloads.push({
        value,
        type: 'enum', 
        category: 'invalid',
        boundary: false,
        malicious: true,
        description: `Invalid enum: ${value}`
      });
    });

    return payloads;
  }

  private generateGenericPayloads(type: string, config: GenerationConfig): SemanticPayload[] {
    this.logger.warn('Generating generic payloads for unknown type', { type });
    
    return [
      {
        value: null,
        type,
        category: 'null',
        boundary: true,
        malicious: false,
        description: 'Null value'
      },
      {
        value: undefined,
        type,
        category: 'undefined',
        boundary: true,
        malicious: false,
        description: 'Undefined value'
      }
    ];
  }

  /**
   * Mutate existing value with semantic awareness
   */
  mutate(value: any, type: string, intensity: number = 0.5): SemanticPayload[] {
    this.logger.debug('Mutating value semantically', { value, type, intensity });

    const mutations: SemanticPayload[] = [];
    
    // Type-specific mutations
    switch (type.toLowerCase()) {
      case 'string':
        mutations.push(...this.mutateString(value, intensity));
        break;
      case 'number':
        mutations.push(...this.mutateNumber(value, intensity));
        break;
      case 'email':
        mutations.push(...this.mutateEmail(value, intensity));
        break;
      default:
        mutations.push(...this.mutateGeneric(value, type, intensity));
    }

    return mutations;
  }

  private mutateString(value: string, intensity: number): SemanticPayload[] {
    const mutations: SemanticPayload[] = [];
    
    if (intensity > 0.3) {
      // Character doubling
      mutations.push({
        value: value + value,
        type: 'string',
        category: 'mutation',
        boundary: false,
        malicious: false,
        description: 'String doubling mutation'
      });
    }

    if (intensity > 0.6) {
      // Case variations
      mutations.push(
        {
          value: value.toUpperCase(),
          type: 'string',
          category: 'mutation',
          boundary: false,
          malicious: false,
          description: 'Uppercase mutation'
        },
        {
          value: value.toLowerCase(),
          type: 'string',
          category: 'mutation', 
          boundary: false,
          malicious: false,
          description: 'Lowercase mutation'
        }
      );
    }

    if (intensity > 0.8) {
      // Malicious injections
      mutations.push({
        value: value + "'; DROP TABLE users; --",
        type: 'string',
        category: 'mutation',
        boundary: false,
        malicious: true,
        description: 'SQL injection mutation'
      });
    }

    return mutations;
  }

  private mutateNumber(value: number, intensity: number): SemanticPayload[] {
    const mutations: SemanticPayload[] = [];

    if (intensity > 0.2) {
      mutations.push(
        {
          value: value + 1,
          type: 'number',
          category: 'mutation',
          boundary: false,
          malicious: false,
          description: 'Increment mutation'
        },
        {
          value: value - 1,
          type: 'number',
          category: 'mutation',
          boundary: false,
          malicious: false,
          description: 'Decrement mutation'
        }
      );
    }

    if (intensity > 0.5) {
      mutations.push(
        {
          value: value * 10,
          type: 'number',
          category: 'mutation',
          boundary: false,
          malicious: false,
          description: 'Scale up mutation'
        },
        {
          value: -value,
          type: 'number',
          category: 'mutation',
          boundary: false,
          malicious: true,
          description: 'Sign flip mutation'
        }
      );
    }

    return mutations;
  }

  private mutateEmail(value: string, intensity: number): SemanticPayload[] {
    const mutations: SemanticPayload[] = [];

    if (intensity > 0.4) {
      mutations.push({
        value: value.replace('@', '@@'),
        type: 'email',
        category: 'mutation',
        boundary: false,
        malicious: true,
        description: 'Double @ mutation'
      });
    }

    if (intensity > 0.7) {
      mutations.push({
        value: value + '../',
        type: 'email',
        category: 'mutation',
        boundary: false,
        malicious: true,
        description: 'Path traversal mutation'
      });
    }

    return mutations;
  }

  private mutateGeneric(value: any, type: string, intensity: number): SemanticPayload[] {
    const mutations: SemanticPayload[] = [];

    if (intensity > 0.5) {
      mutations.push({
        value: String(value) + 'MUTATED',
        type,
        category: 'mutation',
        boundary: false,
        malicious: false,
        description: 'Generic string append mutation'
      });
    }

    return mutations;
  }

  /**
   * Get statistics about generated payloads
   */
  getGenerationStats(): any {
    return {
      availableTypes: Array.from(this.seedValues.keys()),
      totalSeedValues: Array.from(this.seedValues.values()).reduce((sum, arr) => sum + arr.length, 0),
      supportedFormats: ['string', 'number', 'email', 'jwt', 'id', 'csrf', 'money', 'date', 'file', 'pagination', 'enum']
    };
  }
}
