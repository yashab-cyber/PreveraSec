import { Logger } from '../utils/Logger';
import { CredentialVault, Credential } from './CredentialVault';
import { SessionManager, Session } from './SessionManager';
import { OAuth2Manager } from './OAuth2Manager';

export interface ActorContext {
  id: string;
  role: Credential['role'];
  environment: Credential['environment'];
  credentialId: string;
  sessionId?: string;
  username: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  metadata?: Record<string, any>;
  capabilities: string[];
}

export interface ContextPool {
  id: string;
  name: string;
  environment: Credential['environment'];
  contexts: Map<Credential['role'], ActorContext[]>;
  activeContext?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ContextSwitchResult {
  previousContext?: ActorContext;
  currentContext: ActorContext;
  session?: Session;
  credentialsRefreshed: boolean;
}

export interface MultiActorConfig {
  maxContextsPerRole: number;
  contextTimeout: number; // in milliseconds
  autoRefreshTokens: boolean;
  preloadContexts: boolean;
  defaultCapabilities: Record<Credential['role'], string[]>;
}

/**
 * Multi-Actor Context Manager for handling role switching and context pools
 */
export class MultiActorContextManager {
  private logger: Logger;
  private config: MultiActorConfig;
  private vault: CredentialVault;
  private sessionManager: SessionManager;
  private oauth2Manager?: OAuth2Manager;
  private contextPools: Map<string, ContextPool> = new Map();
  private activeContexts: Map<string, string> = new Map(); // poolId -> contextId
  private contextById: Map<string, ActorContext> = new Map();

  constructor(
    config: MultiActorConfig,
    vault: CredentialVault,
    sessionManager: SessionManager,
    oauth2Manager?: OAuth2Manager
  ) {
    this.logger = Logger.getInstance();
    this.config = {
      defaultCapabilities: {
        guest: ['read'],
        user: ['read', 'write'],
        admin: ['read', 'write', 'admin', 'manage-users'],
        vendor: ['read', 'vendor-specific', 'external-api']
      },
      ...config
    };
    this.vault = vault;
    this.sessionManager = sessionManager;
    this.oauth2Manager = oauth2Manager;

    this.logger.info('Multi-Actor Context Manager initialized', {
      maxContextsPerRole: config.maxContextsPerRole,
      autoRefreshTokens: config.autoRefreshTokens
    });
  }

  /**
   * Create a new context pool
   */
  public async createContextPool(
    name: string,
    environment: Credential['environment'],
    metadata?: Record<string, any>
  ): Promise<ContextPool> {
    const poolId = this.generatePoolId();
    
    const pool: ContextPool = {
      id: poolId,
      name,
      environment,
      contexts: new Map(),
      createdAt: new Date(),
      metadata
    };

    // Initialize role arrays
    const roles: Credential['role'][] = ['guest', 'user', 'admin', 'vendor'];
    for (const role of roles) {
      pool.contexts.set(role, []);
    }

    this.contextPools.set(poolId, pool);

    this.logger.info('Created context pool', {
      poolId,
      name,
      environment
    });

    // Preload contexts if enabled
    if (this.config.preloadContexts) {
      await this.preloadContextsForPool(poolId);
    }

    return pool;
  }

  /**
   * Preload contexts for all roles in a pool
   */
  public async preloadContextsForPool(poolId: string): Promise<number> {
    const pool = this.contextPools.get(poolId);
    if (!pool) {
      throw new Error('Context pool not found');
    }

    let preloadedCount = 0;
    const roles: Credential['role'][] = ['guest', 'user', 'admin', 'vendor'];

    for (const role of roles) {
      const credentials = await this.vault.getCredentialsByRole(role, pool.environment);
      const maxContexts = Math.min(credentials.length, this.config.maxContextsPerRole);

      for (let i = 0; i < maxContexts; i++) {
        const credential = credentials[i];
        if (credential) {
          await this.createActorContext(poolId, credential);
          preloadedCount++;
        }
      }
    }

    this.logger.info('Preloaded contexts for pool', {
      poolId,
      preloadedCount
    });

    return preloadedCount;
  }

  /**
   * Create an actor context from a credential
   */
  public async createActorContext(
    poolId: string,
    credential: Credential
  ): Promise<ActorContext> {
    const pool = this.contextPools.get(poolId);
    if (!pool) {
      throw new Error('Context pool not found');
    }

    const contextId = this.generateContextId();
    const capabilities = this.config.defaultCapabilities[credential.role] || [];

    const context: ActorContext = {
      id: contextId,
      role: credential.role,
      environment: credential.environment,
      credentialId: credential.id,
      username: credential.username,
      email: credential.email,
      isActive: false,
      createdAt: new Date(),
      capabilities,
      metadata: {
        poolId,
        hasValidToken: !!credential.accessToken,
        tokenExpiresAt: credential.tokenExpiresAt?.toISOString()
      }
    };

    // Add to pool
    const roleContexts = pool.contexts.get(credential.role) || [];
    roleContexts.push(context);
    pool.contexts.set(credential.role, roleContexts);

    // Track context globally
    this.contextById.set(contextId, context);

    this.logger.debug('Created actor context', {
      contextId,
      poolId,
      role: credential.role,
      username: credential.username
    });

    return context;
  }

  /**
   * Switch to a different role context
   */
  public async switchToRole(
    poolId: string,
    targetRole: Credential['role'],
    contextIndex: number = 0
  ): Promise<ContextSwitchResult> {
    const pool = this.contextPools.get(poolId);
    if (!pool) {
      throw new Error('Context pool not found');
    }

    // Get current context
    const currentContextId = this.activeContexts.get(poolId);
    const previousContext = currentContextId ? this.contextById.get(currentContextId) : undefined;

    // Deactivate current context
    if (previousContext) {
      previousContext.isActive = false;
      previousContext.lastUsed = new Date();
    }

    // Get target role contexts
    const roleContexts = pool.contexts.get(targetRole) || [];
    if (roleContexts.length === 0) {
      // Create a new context for this role
      const credentials = await this.vault.getCredentialsByRole(targetRole, pool.environment);
      if (credentials.length === 0) {
        throw new Error(`No credentials available for role: ${targetRole}`);
      }

      const context = await this.createActorContext(poolId, credentials[0]);
      roleContexts.push(context);
    }

    // Select context (use index or first available)
    const targetContext = roleContexts[contextIndex] || roleContexts[0];
    if (!targetContext) {
      throw new Error(`No context available for role: ${targetRole} at index: ${contextIndex}`);
    }

    // Activate new context
    targetContext.isActive = true;
    targetContext.lastUsed = new Date();
    this.activeContexts.set(poolId, targetContext.id);
    pool.activeContext = targetContext.id;

    // Create/refresh session if needed
    let session: Session | undefined;
    let credentialsRefreshed = false;

    if (targetContext.sessionId) {
      session = await this.sessionManager.getSession(targetContext.sessionId);
    }

    if (!session) {
      // Create new session
      session = await this.sessionManager.createSession(targetContext.credentialId);
      targetContext.sessionId = session.id;
    }

    // Check if token refresh is needed
    if (this.config.autoRefreshTokens && this.oauth2Manager) {
      const credential = await this.vault.getCredential(targetContext.credentialId);
      if (credential && this.needsTokenRefresh(credential)) {
        credentialsRefreshed = await this.sessionManager.refreshSessionToken(session);
      }
    }

    this.logger.info('Switched to role context', {
      poolId,
      previousRole: previousContext?.role,
      newRole: targetRole,
      contextId: targetContext.id,
      username: targetContext.username,
      credentialsRefreshed
    });

    return {
      previousContext,
      currentContext: targetContext,
      session,
      credentialsRefreshed
    };
  }

  /**
   * Get active context for a pool
   */
  public getActiveContext(poolId: string): ActorContext | null {
    const contextId = this.activeContexts.get(poolId);
    return contextId ? this.contextById.get(contextId) || null : null;
  }

  /**
   * Get all contexts for a role in a pool
   */
  public getContextsForRole(poolId: string, role: Credential['role']): ActorContext[] {
    const pool = this.contextPools.get(poolId);
    if (!pool) {
      return [];
    }

    return pool.contexts.get(role) || [];
  }

  /**
   * Get context by ID
   */
  public getContext(contextId: string): ActorContext | null {
    return this.contextById.get(contextId) || null;
  }

  /**
   * Refresh all contexts in a pool
   */
  public async refreshPoolContexts(poolId: string): Promise<{
    refreshed: number;
    failed: number;
    errors: string[];
  }> {
    const pool = this.contextPools.get(poolId);
    if (!pool) {
      throw new Error('Context pool not found');
    }

    let refreshed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Refresh contexts for each role
    for (const [role, contexts] of pool.contexts.entries()) {
      for (const context of contexts) {
        try {
          if (context.sessionId) {
            const session = await this.sessionManager.getSession(context.sessionId);
            if (session && this.oauth2Manager) {
              const success = await this.sessionManager.refreshSessionToken(session);
              if (success) {
                refreshed++;
              } else {
                failed++;
                errors.push(`Failed to refresh token for ${role} context ${context.id}`);
              }
            }
          }
        } catch (error) {
          failed++;
          errors.push(`Error refreshing ${role} context ${context.id}: ${error}`);
        }
      }
    }

    this.logger.info('Refreshed pool contexts', {
      poolId,
      refreshed,
      failed,
      errors: errors.length
    });

    return { refreshed, failed, errors };
  }

  /**
   * Execute action with specific role context
   */
  public async executeWithRole<T>(
    poolId: string,
    role: Credential['role'],
    action: (context: ActorContext, session: Session) => Promise<T>,
    contextIndex: number = 0
  ): Promise<T> {
    // Switch to role
    const switchResult = await this.switchToRole(poolId, role, contextIndex);
    
    if (!switchResult.session) {
      throw new Error('No session available for role execution');
    }

    try {
      // Execute action
      const result = await action(switchResult.currentContext, switchResult.session);
      
      // Update context usage
      switchResult.currentContext.lastUsed = new Date();
      
      return result;
    } catch (error) {
      this.logger.error('Role execution failed', {
        poolId,
        role,
        contextId: switchResult.currentContext.id,
        error
      });
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  public getPoolStats(poolId: string): {
    totalContexts: number;
    activeContexts: number;
    contextsByRole: Record<Credential['role'], number>;
    hasActiveContext: boolean;
    activeRole?: Credential['role'];
  } | null {
    const pool = this.contextPools.get(poolId);
    if (!pool) {
      return null;
    }

    let totalContexts = 0;
    let activeContexts = 0;
    const contextsByRole: Record<Credential['role'], number> = {
      guest: 0,
      user: 0,
      admin: 0,
      vendor: 0
    };

    for (const [role, contexts] of pool.contexts.entries()) {
      totalContexts += contexts.length;
      contextsByRole[role] = contexts.length;
      
      for (const context of contexts) {
        if (context.isActive) {
          activeContexts++;
        }
      }
    }

    const activeContext = this.getActiveContext(poolId);

    return {
      totalContexts,
      activeContexts,
      contextsByRole,
      hasActiveContext: !!activeContext,
      activeRole: activeContext?.role
    };
  }

  /**
   * Clean up expired contexts
   */
  public async cleanupExpiredContexts(): Promise<number> {
    const now = new Date();
    const contextTimeout = this.config.contextTimeout;
    let cleanedCount = 0;

    for (const pool of this.contextPools.values()) {
      for (const [role, contexts] of pool.contexts.entries()) {
        const validContexts: ActorContext[] = [];
        
        for (const context of contexts) {
          const lastUsed = context.lastUsed || context.createdAt;
          const age = now.getTime() - lastUsed.getTime();
          
          if (age > contextTimeout && !context.isActive) {
            // Clean up session
            if (context.sessionId) {
              await this.sessionManager.destroySession(context.sessionId);
            }
            
            // Remove from global tracking
            this.contextById.delete(context.id);
            cleanedCount++;
            
            this.logger.debug('Cleaned up expired context', {
              contextId: context.id,
              role,
              age: Math.floor(age / (60 * 1000)) // age in minutes
            });
          } else {
            validContexts.push(context);
          }
        }
        
        pool.contexts.set(role, validContexts);
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('Cleaned up expired contexts', { cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Check if credential needs token refresh
   */
  private needsTokenRefresh(credential: Credential): boolean {
    if (!credential.tokenExpiresAt) {
      return false;
    }

    const now = new Date();
    const timeUntilExpiry = credential.tokenExpiresAt.getTime() - now.getTime();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes

    return timeUntilExpiry <= refreshThreshold;
  }

  /**
   * Generate pool ID
   */
  private generatePoolId(): string {
    return `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate context ID
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all context pools
   */
  public getContextPools(): ContextPool[] {
    return Array.from(this.contextPools.values());
  }

  /**
   * Get context pool by ID
   */
  public getContextPool(poolId: string): ContextPool | null {
    return this.contextPools.get(poolId) || null;
  }

  /**
   * Remove context pool
   */
  public async removeContextPool(poolId: string): Promise<boolean> {
    const pool = this.contextPools.get(poolId);
    if (!pool) {
      return false;
    }

    // Clean up all contexts and sessions
    for (const contexts of pool.contexts.values()) {
      for (const context of contexts) {
        if (context.sessionId) {
          await this.sessionManager.destroySession(context.sessionId);
        }
        this.contextById.delete(context.id);
      }
    }

    // Remove from tracking
    this.contextPools.delete(poolId);
    this.activeContexts.delete(poolId);

    this.logger.info('Removed context pool', { poolId });

    return true;
  }
}
