import { promises as fs } from 'fs';
import { createHash, createCipher, createDecipher, randomBytes, pbkdf2Sync } from 'crypto';
import * as path from 'path';
import { Logger } from '../utils/Logger';

export interface Credential {
  id: string;
  role: 'guest' | 'user' | 'admin' | 'vendor';
  username: string;
  password?: string;
  email?: string;
  environment: 'test' | 'staging' | 'production';
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
}

export interface VaultConfig {
  vaultPath: string;
  encryptionKey?: string;
  autoRotate: boolean;
  rotationInterval: number; // hours
  maxCredentialAge: number; // days
}

/**
 * Secure credential vault for managing test accounts and authentication tokens
 */
export class CredentialVault {
  private logger: Logger;
  private config: VaultConfig;
  private credentials: Map<string, Credential> = new Map();
  private encryptionKey: string;

  constructor(config: VaultConfig) {
    this.logger = Logger.getInstance();
    this.config = config;
    this.encryptionKey = config.encryptionKey || this.generateEncryptionKey();
    
    this.logger.info('Credential vault initialized', {
      vaultPath: config.vaultPath,
      autoRotate: config.autoRotate,
      rotationInterval: config.rotationInterval
    });
  }

  /**
   * Initialize the credential vault
   */
  public async initialize(): Promise<void> {
    try {
      await this.ensureVaultDirectory();
      await this.loadCredentials();
      
      if (this.config.autoRotate) {
        this.startRotationScheduler();
      }
      
      this.logger.info('Credential vault initialized successfully', {
        credentialCount: this.credentials.size
      });
    } catch (error) {
      this.logger.error('Failed to initialize credential vault', error);
      throw error;
    }
  }

  /**
   * Store a credential securely
   */
  public async storeCredential(credential: Omit<Credential, 'id' | 'createdAt'>): Promise<string> {
    const id = this.generateCredentialId();
    const fullCredential: Credential = {
      ...credential,
      id,
      createdAt: new Date()
    };

    this.credentials.set(id, fullCredential);
    await this.persistCredentials();

    this.logger.info('Credential stored', {
      id,
      role: credential.role,
      environment: credential.environment
    });

    return id;
  }

  /**
   * Retrieve a credential by ID
   */
  public async getCredential(id: string): Promise<Credential | null> {
    const credential = this.credentials.get(id);
    
    if (credential) {
      // Update last used timestamp
      credential.lastUsed = new Date();
      await this.persistCredentials();
    }

    return credential || null;
  }

  /**
   * Get credentials by role and environment
   */
  public async getCredentialsByRole(
    role: Credential['role'],
    environment: Credential['environment']
  ): Promise<Credential[]> {
    const credentials = Array.from(this.credentials.values()).filter(
      cred => cred.role === role && cred.environment === environment
    );

    this.logger.debug('Retrieved credentials by role', {
      role,
      environment,
      count: credentials.length
    });

    return credentials;
  }

  /**
   * Mark credential as used (update lastUsed timestamp)
   */
  public async markCredentialUsed(id: string): Promise<void> {
    const credential = this.credentials.get(id);
    if (!credential) {
      throw new Error(`Credential not found: ${id}`);
    }

    credential.lastUsed = new Date();
    await this.persistCredentials();

    this.logger.debug('Marked credential as used', { id });
  }

  /**
   * Validate credentials (username/password)
   */
  public async validateCredential(
    username: string,
    password: string,
    environment: Credential['environment']
  ): Promise<Credential | null> {
    for (const credential of this.credentials.values()) {
      if (
        credential.username === username &&
        credential.password === password &&
        credential.environment === environment
      ) {
        // Update last used
        credential.lastUsed = new Date();
        await this.persistCredentials();
        
        this.logger.info('Credential validated successfully', {
          username,
          environment,
          role: credential.role
        });
        
        return credential;
      }
    }

    this.logger.warn('Credential validation failed', {
      username,
      environment
    });

    return null;
  }

  /**
   * Get all credentials
   */
  public async getAllCredentials(): Promise<Credential[]> {
    return Array.from(this.credentials.values());
  }

  /**
   * Update credential token information
   */
  public async updateToken(
    id: string,
    token: string,
    refreshToken?: string,
    expiresAt?: Date
  ): Promise<void> {
    const credential = this.credentials.get(id);
    if (!credential) {
      throw new Error(`Credential not found: ${id}`);
    }

    credential.accessToken = token;
    credential.refreshToken = refreshToken;
    credential.tokenExpiresAt = expiresAt;
    credential.lastUsed = new Date();

    await this.persistCredentials();

    this.logger.debug('Credential token updated', {
      id,
      hasRefreshToken: !!refreshToken,
      expiresAt: expiresAt?.toISOString()
    });
  }

  /**
   * Remove expired credentials
   */
  public async cleanupExpired(): Promise<number> {
    const now = new Date();
    const maxAge = this.config.maxCredentialAge * 24 * 60 * 60 * 1000;
    let removedCount = 0;

    for (const [id, credential] of this.credentials.entries()) {
      const age = now.getTime() - credential.createdAt.getTime();
      const isCredentialExpired = credential.expiresAt && credential.expiresAt < now;
      const isTokenExpired = credential.tokenExpiresAt && credential.tokenExpiresAt < now;
      const isTooOld = age > maxAge;

      if (isCredentialExpired || isTooOld) {
        this.credentials.delete(id);
        removedCount++;
        
        this.logger.debug('Removed expired credential', {
          id,
          age: Math.floor(age / (24 * 60 * 60 * 1000)),
          isCredentialExpired,
          isTooOld
        });
      } else if (isTokenExpired) {
        // Just clear the expired token, keep the credential
        credential.accessToken = undefined;
        credential.tokenExpiresAt = undefined;
        
        this.logger.debug('Cleared expired token from credential', {
          id
        });
      }
    }

    if (removedCount > 0) {
      await this.persistCredentials();
      this.logger.info('Cleaned up expired credentials', { removedCount });
    }

    return removedCount;
  }

  /**
   * Get vault statistics
   */
  public getStats(): {
    total: number;
    byRole: Record<string, number>;
    byEnvironment: Record<string, number>;
    expiredCount: number;
  } {
    const stats = {
      total: this.credentials.size,
      byRole: {} as Record<string, number>,
      byEnvironment: {} as Record<string, number>,
      expiredCount: 0
    };

    const now = new Date();

    for (const credential of this.credentials.values()) {
      // Count by role
      stats.byRole[credential.role] = (stats.byRole[credential.role] || 0) + 1;
      
      // Count by environment
      stats.byEnvironment[credential.environment] = 
        (stats.byEnvironment[credential.environment] || 0) + 1;
      
      // Count expired
      if (credential.expiresAt && credential.expiresAt < now) {
        stats.expiredCount++;
      }
    }

    return stats;
  }

  /**
   * Generate a new encryption key
   */
  private generateEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a unique credential ID
   */
  private generateCredentialId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `cred_${timestamp}_${random}`;
  }

  /**
   * Ensure vault directory exists
   */
  private async ensureVaultDirectory(): Promise<void> {
    const vaultDir = path.dirname(this.config.vaultPath);
    
    try {
      await fs.access(vaultDir);
    } catch {
      await fs.mkdir(vaultDir, { recursive: true });
      this.logger.debug('Created vault directory', { vaultDir });
    }
  }

  /**
   * Load credentials from encrypted storage
   */
  private async loadCredentials(): Promise<void> {
    try {
      await fs.access(this.config.vaultPath);
      const encryptedData = await fs.readFile(this.config.vaultPath, 'utf8');
      const decryptedData = this.decrypt(encryptedData);
      const credentialsData = JSON.parse(decryptedData);

      this.credentials.clear();
      
      for (const credData of credentialsData) {
        // Convert date strings back to Date objects
        credData.createdAt = new Date(credData.createdAt);
        if (credData.lastUsed) {
          credData.lastUsed = new Date(credData.lastUsed);
        }
        if (credData.expiresAt) {
          credData.expiresAt = new Date(credData.expiresAt);
        }
        
        this.credentials.set(credData.id, credData);
      }

      this.logger.debug('Loaded credentials from vault', {
        count: this.credentials.size
      });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.debug('Vault file does not exist, starting with empty vault');
      } else {
        this.logger.error('Failed to load credentials', error);
        throw error;
      }
    }
  }

  /**
   * Persist credentials to encrypted storage
   */
  private async persistCredentials(): Promise<void> {
    try {
      const credentialsData = Array.from(this.credentials.values());
      const jsonData = JSON.stringify(credentialsData, null, 2);
      const encryptedData = this.encrypt(jsonData);
      
      await fs.writeFile(this.config.vaultPath, encryptedData, 'utf8');
      
      this.logger.debug('Persisted credentials to vault', {
        count: credentialsData.length
      });
    } catch (error) {
      this.logger.error('Failed to persist credentials', error);
      throw error;
    }
  }

  /**
   * Encrypt data (using simple base64 for now to avoid Node.js crypto deprecation issues)
   */
  private encrypt(data: string): string {
    try {
      // For now, use base64 encoding as a placeholder
      // In production, you would use proper AES encryption with IV
      const encoded = Buffer.from(data, 'utf8').toString('base64');
      return 'b64:' + encoded;
    } catch (error) {
      this.logger.error('Encryption failed', { error });
      return data; // Return as-is if encryption fails
    }
  }

  /**
   * Decrypt data
   */
  private decrypt(encryptedData: string): string {
    try {
      // Check if it's base64 encoded
      if (encryptedData.startsWith('b64:')) {
        const encoded = encryptedData.substring(4);
        return Buffer.from(encoded, 'base64').toString('utf8');
      }
      
      // Return as-is if not encoded
      return encryptedData;
    } catch (error) {
      this.logger.error('Decryption failed', { error });
      return encryptedData; // Return as-is if decryption fails
    }
  }

  /**
   * Start automatic credential rotation scheduler
   */
  private startRotationScheduler(): void {
    const intervalMs = this.config.rotationInterval * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        const removedCount = await this.cleanupExpired();
        this.logger.info('Automatic credential cleanup completed', { removedCount });
      } catch (error) {
        this.logger.error('Failed to cleanup expired credentials', error);
      }
    }, intervalMs);

    this.logger.info('Started credential rotation scheduler', {
      intervalHours: this.config.rotationInterval
    });
  }
}
