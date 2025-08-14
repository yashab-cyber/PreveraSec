import { Logger } from '../utils/Logger';
import { CredentialVault, VaultConfig } from './CredentialVault';
import { TestAccountSeeder, SeederConfig, TestAccountTemplate } from './TestAccountSeeder';
import { OAuth2Manager, OAuth2Config } from './OAuth2Manager';
import { SessionManager, SessionConfig } from './SessionManager';
import { MultiActorContextManager, MultiActorConfig, ActorContext, ContextPool } from './MultiActorContextManager';

export interface AuthOrchestratorConfig {
  vault: VaultConfig;
  seeder?: SeederConfig;
  oauth2?: OAuth2Config;
  session: SessionConfig;
  multiActor: MultiActorConfig;
  enableAutoCleanup?: boolean;
  cleanupIntervalMs?: number;
}

export interface AuthInitializationResult {
  credentialsSeeded: number;
  contextPoolsCreated: number;
  oauthEnabled: boolean;
  ready: boolean;
}

export interface LoginResult {
  success: boolean;
  context?: ActorContext;
  sessionId?: string;
  csrfToken?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RoleExecutionResult<T> {
  result: T;
  executedAs: {
    role: string;
    username: string;
    contextId: string;
  };
  tokenRefreshed: boolean;
  executionTime: number;
}

/**
 * Main authentication orchestrator that coordinates all auth components
 */
export class AuthOrchestrator {
  private logger: Logger;
  private config: AuthOrchestratorConfig;
  
  // Core components
  private vault: CredentialVault;
  private seeder?: TestAccountSeeder;
  private oauth2Manager?: OAuth2Manager;
  private sessionManager: SessionManager;
  private contextManager: MultiActorContextManager;

  // State
  private isInitialized = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: AuthOrchestratorConfig) {
    this.logger = Logger.getInstance();
    this.config = {
      enableAutoCleanup: true,
      cleanupIntervalMs: 10 * 60 * 1000, // 10 minutes
      ...config
    };

    this.logger.info('Auth Orchestrator initializing', {
      hasSeeder: !!config.seeder,
      hasOAuth2: !!config.oauth2,
      autoCleanup: this.config.enableAutoCleanup
    });

    // Initialize components
    this.initializeComponents();
  }

  /**
   * Initialize all authentication components
   */
  private initializeComponents(): void {
    // Initialize credential vault
    this.vault = new CredentialVault(this.config.vault);

    // Initialize test account seeder if configured
    if (this.config.seeder) {
      this.seeder = new TestAccountSeeder(this.vault, this.config.seeder);
    }

    // Initialize OAuth2 manager if configured
    if (this.config.oauth2) {
      this.oauth2Manager = new OAuth2Manager(this.config.oauth2, this.vault);
    }

    // Initialize session manager
    this.sessionManager = new SessionManager(
      this.config.session,
      this.vault,
      this.oauth2Manager
    );

    // Initialize multi-actor context manager
    this.contextManager = new MultiActorContextManager(
      this.config.multiActor,
      this.vault,
      this.sessionManager,
      this.oauth2Manager
    );

    this.logger.info('Auth components initialized');
  }

  /**
   * Initialize the authentication system
   */
  public async initialize(): Promise<AuthInitializationResult> {
    if (this.isInitialized) {
      this.logger.warn('Auth orchestrator already initialized');
      return this.getInitializationStatus();
    }

    try {
      this.logger.info('Initializing authentication system...');

      // Initialize vault
      await this.vault.initialize();

      // Seed test accounts if configured
      let credentialsSeeded = 0;
      if (this.seeder) {
        await this.seeder.initialize();
        const seededIds = await this.seeder.seedAccounts();
        credentialsSeeded = seededIds.length;
      }

      // Create default context pools for each environment
      const environments = ['test', 'staging', 'production'] as const;
      let contextPoolsCreated = 0;

      for (const environment of environments) {
        try {
          const pool = await this.contextManager.createContextPool(
            `${environment}-pool`,
            environment,
            {
              defaultPool: true,
              createdBy: 'AuthOrchestrator'
            }
          );
          contextPoolsCreated++;

          this.logger.debug('Created context pool', {
            poolId: pool.id,
            environment
          });
        } catch (error) {
          this.logger.warn('Failed to create context pool', {
            environment,
            error
          });
        }
      }

      // Start cleanup if enabled
      if (this.config.enableAutoCleanup) {
        this.startAutoCleanup();
      }

      this.isInitialized = true;

      const result: AuthInitializationResult = {
        credentialsSeeded,
        contextPoolsCreated,
        oauthEnabled: !!this.oauth2Manager,
        ready: true
      };

      this.logger.info('Authentication system initialized successfully', result);

      return result;
    } catch (error) {
      this.logger.error('Failed to initialize authentication system', { error });
      throw error;
    }
  }

  /**
   * Get initialization status
   */
  private getInitializationStatus(): AuthInitializationResult {
    const vaultStats = this.vault.getStats();
    const pools = this.contextManager.getContextPools();

    return {
      credentialsSeeded: vaultStats.total,
      contextPoolsCreated: pools.length,
      oauthEnabled: !!this.oauth2Manager,
      ready: this.isInitialized
    };
  }

  /**
   * Login with deterministic role selection
   */
  public async login(
    role: string,
    environment: 'test' | 'staging' | 'production' = 'test',
    options?: {
      username?: string;
      contextIndex?: number;
      poolId?: string;
    }
  ): Promise<LoginResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Authentication system not initialized'
      };
    }

    try {
      const targetRole = role as any; // Type assertion for role
      const poolId = options?.poolId || this.findDefaultPoolId(environment);

      if (!poolId) {
        return {
          success: false,
          error: `No context pool found for environment: ${environment}`
        };
      }

      // Switch to target role
      const switchResult = await this.contextManager.switchToRole(
        poolId,
        targetRole,
        options?.contextIndex || 0
      );

      if (!switchResult.session) {
        return {
          success: false,
          error: 'Failed to create session for role'
        };
      }

      this.logger.info('Login successful', {
        role: targetRole,
        username: switchResult.currentContext.username,
        environment,
        contextId: switchResult.currentContext.id,
        sessionId: switchResult.session.id
      });

      return {
        success: true,
        context: switchResult.currentContext,
        sessionId: switchResult.session.id,
        csrfToken: switchResult.session.csrfToken,
        metadata: {
          role: targetRole,
          username: switchResult.currentContext.username,
          environment,
          credentialsRefreshed: switchResult.credentialsRefreshed
        }
      };
    } catch (error) {
      this.logger.error('Login failed', {
        role,
        environment,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Execute action with specific role
   */
  public async executeAsRole<T>(
    role: string,
    action: (context: ActorContext) => Promise<T>,
    environment: 'test' | 'staging' | 'production' = 'test',
    options?: {
      contextIndex?: number;
      poolId?: string;
    }
  ): Promise<RoleExecutionResult<T>> {
    const startTime = Date.now();
    const targetRole = role as any; // Type assertion
    const poolId = options?.poolId || this.findDefaultPoolId(environment);

    if (!poolId) {
      throw new Error(`No context pool found for environment: ${environment}`);
    }

    const result = await this.contextManager.executeWithRole(
      poolId,
      targetRole,
      async (context, session) => {
        return await action(context);
      },
      options?.contextIndex || 0
    );

    const executionTime = Date.now() - startTime;
    const activeContext = this.contextManager.getActiveContext(poolId);

    if (!activeContext) {
      throw new Error('No active context after execution');
    }

    this.logger.debug('Role execution completed', {
      role: targetRole,
      username: activeContext.username,
      executionTime,
      contextId: activeContext.id
    });

    return {
      result,
      executedAs: {
        role: activeContext.role,
        username: activeContext.username,
        contextId: activeContext.id
      },
      tokenRefreshed: false, // TODO: Track this from context manager
      executionTime
    };
  }

  /**
   * Get current active context for environment
   */
  public getActiveContext(environment: 'test' | 'staging' | 'production' = 'test'): ActorContext | null {
    const poolId = this.findDefaultPoolId(environment);
    return poolId ? this.contextManager.getActiveContext(poolId) : null;
  }

  /**
   * Switch roles in current environment
   */
  public async switchRole(
    targetRole: string,
    environment: 'test' | 'staging' | 'production' = 'test',
    contextIndex: number = 0
  ): Promise<LoginResult> {
    return this.login(targetRole, environment, { contextIndex });
  }

  /**
   * Refresh all tokens and sessions
   */
  public async refreshAllTokens(
    environment?: 'test' | 'staging' | 'production'
  ): Promise<{
    refreshed: number;
    failed: number;
    errors: string[];
  }> {
    let totalRefreshed = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    const pools = environment
      ? this.contextManager.getContextPools().filter(p => p.environment === environment)
      : this.contextManager.getContextPools();

    for (const pool of pools) {
      try {
        const result = await this.contextManager.refreshPoolContexts(pool.id);
        totalRefreshed += result.refreshed;
        totalFailed += result.failed;
        allErrors.push(...result.errors);
      } catch (error) {
        totalFailed++;
        allErrors.push(`Failed to refresh pool ${pool.id}: ${error}`);
      }
    }

    this.logger.info('Token refresh completed', {
      environment,
      totalRefreshed,
      totalFailed,
      errors: allErrors.length
    });

    return {
      refreshed: totalRefreshed,
      failed: totalFailed,
      errors: allErrors
    };
  }

  /**
   * Get authentication system statistics
   */
  public getSystemStats(): {
    vault: ReturnType<CredentialVault['getStats']>;
    sessions: ReturnType<SessionManager['getSessionStats']>;
    contexts: {
      pools: number;
      totalContexts: number;
      activeContexts: number;
    };
    seeder?: ReturnType<TestAccountSeeder['getSeederStats']>;
  } {
    const vaultStats = this.vault.getStats();
    const sessionStats = this.sessionManager.getSessionStats();
    const pools = this.contextManager.getContextPools();

    let totalContexts = 0;
    let activeContexts = 0;

    for (const pool of pools) {
      const poolStats = this.contextManager.getPoolStats(pool.id);
      if (poolStats) {
        totalContexts += poolStats.totalContexts;
        activeContexts += poolStats.activeContexts;
      }
    }

    const stats = {
      vault: vaultStats,
      sessions: sessionStats,
      contexts: {
        pools: pools.length,
        totalContexts,
        activeContexts
      },
      seeder: this.seeder?.getSeederStats()
    };

    return stats;
  }

  /**
   * Cleanup expired resources
   */
  public async cleanup(): Promise<{
    credentialsRemoved: number;
    sessionsRemoved: number;
    contextsRemoved: number;
    oauth2Cleaned: number;
  }> {
    const results = {
      credentialsRemoved: 0,
      sessionsRemoved: 0,
      contextsRemoved: 0,
      oauth2Cleaned: 0
    };

    try {
      // Cleanup expired credentials
      results.credentialsRemoved = await this.vault.cleanupExpired();

      // Cleanup expired sessions
      results.sessionsRemoved = await this.sessionManager.cleanupExpiredSessions();

      // Cleanup expired contexts
      results.contextsRemoved = await this.contextManager.cleanupExpiredContexts();

      // Cleanup OAuth2 flows if available
      if (this.oauth2Manager) {
        results.oauth2Cleaned = this.oauth2Manager.cleanupExpired();
      }

      this.logger.info('Cleanup completed', results);
    } catch (error) {
      this.logger.error('Cleanup failed', { error });
      throw error;
    }

    return results;
  }

  /**
   * Start automatic cleanup
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        this.logger.error('Auto cleanup failed', { error });
      }
    }, this.config.cleanupIntervalMs || 10 * 60 * 1000);

    this.logger.info('Auto cleanup started', {
      intervalMs: this.config.cleanupIntervalMs
    });
  }

  /**
   * Stop automatic cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      this.logger.info('Auto cleanup stopped');
    }
  }

  /**
   * Shutdown the authentication system
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down authentication system...');

    // Stop auto cleanup
    this.stopAutoCleanup();

    // Destroy all sessions
    const allSessions = this.sessionManager.getAllActiveSessions();
    for (const session of allSessions) {
      await this.sessionManager.destroySession(session.id);
    }

    // Remove all context pools
    const pools = this.contextManager.getContextPools();
    for (const pool of pools) {
      await this.contextManager.removeContextPool(pool.id);
    }

    // Final cleanup
    await this.cleanup();

    this.isInitialized = false;

    this.logger.info('Authentication system shutdown complete');
  }

  /**
   * Find default pool ID for environment
   */
  private findDefaultPoolId(environment: string): string | null {
    const pools = this.contextManager.getContextPools();
    const defaultPool = pools.find(
      p => p.environment === environment && p.metadata?.defaultPool === true
    );
    return defaultPool?.id || null;
  }

  // Getters for components (for advanced usage)
  public getVault(): CredentialVault { return this.vault; }
  public getSeeder(): TestAccountSeeder | undefined { return this.seeder; }
  public getOAuth2Manager(): OAuth2Manager | undefined { return this.oauth2Manager; }
  public getSessionManager(): SessionManager { return this.sessionManager; }
  public getContextManager(): MultiActorContextManager { return this.contextManager; }
}
