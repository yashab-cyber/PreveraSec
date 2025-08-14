import { randomBytes } from 'crypto';
import { CredentialVault, Credential } from './CredentialVault';
import { Logger } from '../utils/Logger';

export interface TestAccountTemplate {
  role: Credential['role'];
  username?: string;
  email?: string;
  password?: string;
  metadata?: Record<string, any>;
  count: number;
}

export interface SeederConfig {
  environment: Credential['environment'];
  templates: TestAccountTemplate[];
  usernamePrefix?: string;
  emailDomain?: string;
  passwordLength?: number;
  seedOnInit?: boolean;
}

/**
 * Test account seeder for generating and managing test credentials
 */
export class TestAccountSeeder {
  private logger: Logger;
  private vault: CredentialVault;
  private config: SeederConfig;

  constructor(vault: CredentialVault, config: SeederConfig) {
    this.logger = Logger.getInstance();
    this.vault = vault;
    this.config = {
      usernamePrefix: 'testuser',
      emailDomain: 'example.com',
      passwordLength: 16,
      seedOnInit: true,
      ...config
    };

    this.logger.info('Test account seeder initialized', {
      environment: config.environment,
      templates: config.templates.length
    });
  }

  /**
   * Initialize the seeder and optionally seed accounts
   */
  public async initialize(): Promise<void> {
    if (this.config.seedOnInit) {
      await this.seedAccounts();
    }
  }

  /**
   * Seed test accounts based on templates
   */
  public async seedAccounts(): Promise<string[]> {
    const createdIds: string[] = [];

    for (const template of this.config.templates) {
      const templateIds = await this.seedAccountsFromTemplate(template);
      createdIds.push(...templateIds);
    }

    this.logger.info('Test accounts seeded successfully', {
      totalCreated: createdIds.length,
      environment: this.config.environment
    });

    return createdIds;
  }

  /**
   * Seed accounts from a specific template
   */
  public async seedAccountsFromTemplate(template: TestAccountTemplate): Promise<string[]> {
    const createdIds: string[] = [];

    for (let i = 0; i < template.count; i++) {
      const credential = this.generateCredentialFromTemplate(template, i);
      const id = await this.vault.storeCredential(credential);
      createdIds.push(id);

      this.logger.debug('Created test account', {
        id,
        role: credential.role,
        username: credential.username
      });
    }

    return createdIds;
  }

  /**
   * Generate a specific test account
   */
  public async generateTestAccount(
    role: Credential['role'],
    overrides?: Partial<Omit<Credential, 'id' | 'createdAt'>>
  ): Promise<string> {
    const credential: Omit<Credential, 'id' | 'createdAt'> = {
      role,
      username: this.generateUsername(role),
      password: this.generatePassword(),
      email: this.generateEmail(role),
      environment: this.config.environment,
      metadata: {
        generated: true,
        generatedAt: new Date().toISOString(),
        seederVersion: '1.0.0'
      },
      ...overrides
    };

    const id = await this.vault.storeCredential(credential);

    this.logger.info('Generated individual test account', {
      id,
      role,
      username: credential.username
    });

    return id;
  }

  /**
   * Get a random test account for a specific role
   */
  public async getRandomTestAccount(role: Credential['role']): Promise<Credential | null> {
    const accounts = await this.vault.getCredentialsByRole(role, this.config.environment);
    
    if (accounts.length === 0) {
      this.logger.warn('No test accounts found for role, generating new one', { role });
      const id = await this.generateTestAccount(role);
      return await this.vault.getCredential(id);
    }

    // Return a random account from available ones
    const randomIndex = Math.floor(Math.random() * accounts.length);
    const selectedAccount = accounts[randomIndex];

    this.logger.debug('Selected random test account', {
      role,
      username: selectedAccount.username,
      totalAvailable: accounts.length
    });

    return selectedAccount;
  }

  /**
   * Refresh test accounts (remove old, create new)
   */
  public async refreshTestAccounts(): Promise<{
    removed: number;
    created: number;
  }> {
    // Clean up expired credentials
    const removed = await this.vault.cleanupExpired();

    // Check if we need to create new accounts
    const stats = this.vault.getStats();
    const created: string[] = [];

    for (const template of this.config.templates) {
      const currentCount = stats.byRole[template.role] || 0;
      if (currentCount < template.count) {
        const needed = template.count - currentCount;
        const templateWithCount = { ...template, count: needed };
        const newIds = await this.seedAccountsFromTemplate(templateWithCount);
        created.push(...newIds);
      }
    }

    this.logger.info('Refreshed test accounts', {
      removed,
      created: created.length
    });

    return {
      removed,
      created: created.length
    };
  }

  /**
   * Get seeding statistics
   */
  public getSeederStats(): {
    templates: number;
    environment: string;
    expectedAccounts: number;
    actualAccounts: number;
  } {
    const expectedAccounts = this.config.templates.reduce(
      (sum, template) => sum + template.count,
      0
    );

    const vaultStats = this.vault.getStats();
    const actualAccounts = vaultStats.byEnvironment[this.config.environment] || 0;

    return {
      templates: this.config.templates.length,
      environment: this.config.environment,
      expectedAccounts,
      actualAccounts
    };
  }

  /**
   * Generate credential from template
   */
  private generateCredentialFromTemplate(
    template: TestAccountTemplate,
    index: number
  ): Omit<Credential, 'id' | 'createdAt'> {
    return {
      role: template.role,
      username: template.username || this.generateUsername(template.role, index),
      password: template.password || this.generatePassword(),
      email: template.email || this.generateEmail(template.role, index),
      environment: this.config.environment,
      metadata: {
        ...template.metadata,
        generated: true,
        generatedAt: new Date().toISOString(),
        templateIndex: index,
        seederVersion: '1.0.0'
      }
    };
  }

  /**
   * Generate a username
   */
  private generateUsername(role: Credential['role'], index?: number): string {
    const prefix = this.config.usernamePrefix || 'testuser';
    const suffix = index !== undefined ? `_${index + 1}` : `_${this.generateRandomSuffix()}`;
    return `${prefix}_${role}${suffix}`;
  }

  /**
   * Generate an email address
   */
  private generateEmail(role: Credential['role'], index?: number): string {
    const username = this.generateUsername(role, index);
    const domain = this.config.emailDomain || 'example.com';
    return `${username}@${domain}`;
  }

  /**
   * Generate a secure password
   */
  private generatePassword(): string {
    const length = this.config.passwordLength || 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    const randomBuffer = randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += charset[randomBuffer[i] % charset.length];
    }

    return password;
  }

  /**
   * Generate a random suffix for uniqueness
   */
  private generateRandomSuffix(): string {
    return randomBytes(4).toString('hex');
  }

  /**
   * Create default templates for all roles
   */
  public static createDefaultTemplates(): TestAccountTemplate[] {
    return [
      {
        role: 'guest',
        count: 3,
        metadata: { permissions: ['read'] }
      },
      {
        role: 'user',
        count: 5,
        metadata: { permissions: ['read', 'write'] }
      },
      {
        role: 'admin',
        count: 2,
        metadata: { permissions: ['read', 'write', 'admin'] }
      },
      {
        role: 'vendor',
        count: 2,
        metadata: { permissions: ['read', 'vendor-specific'] }
      }
    ];
  }

  /**
   * Validate seeder configuration
   */
  public static validateConfig(config: SeederConfig): string[] {
    const errors: string[] = [];

    if (!config.environment) {
      errors.push('Environment is required');
    }

    if (!config.templates || config.templates.length === 0) {
      errors.push('At least one template is required');
    }

    for (const template of config.templates || []) {
      if (!template.role) {
        errors.push('Template role is required');
      }
      if (template.count <= 0) {
        errors.push(`Template for role ${template.role} must have count > 0`);
      }
    }

    return errors;
  }
}
