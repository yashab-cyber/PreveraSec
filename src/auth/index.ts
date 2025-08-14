// Core authentication components
export { CredentialVault, type Credential, type VaultConfig } from './CredentialVault';
export { TestAccountSeeder, type TestAccountTemplate, type SeederConfig } from './TestAccountSeeder';
export { OAuth2Manager, type OAuth2Config, type OAuth2TokenResponse, type DeviceCodeResponse, type AuthorizationFlow, type TokenInfo } from './OAuth2Manager';
export { SessionManager, type SessionConfig, type Session, type AuthenticationResult } from './SessionManager';
export { MultiActorContextManager, type ActorContext, type ContextPool, type ContextSwitchResult, type MultiActorConfig } from './MultiActorContextManager';

// Main orchestrator
export { AuthOrchestrator, type AuthOrchestratorConfig, type AuthInitializationResult, type LoginResult, type RoleExecutionResult } from './AuthOrchestrator';

// Import types for use in functions
import { AuthOrchestrator, AuthOrchestratorConfig } from './AuthOrchestrator';
import { CredentialVault } from './CredentialVault';

// Convenience exports for common configurations
export const DefaultConfigurations = {
  /**
   * Default vault configuration for test environments
   */
  testVault: {
    vaultPath: './test-credentials.vault',
    encryptionKey: 'test-key-please-change-in-production',
    autoRotate: false,
    rotationInterval: 24,
    maxCredentialAge: 30
  },

  /**
   * Default session configuration for testing
   */
  testSession: {
    sessionTimeout: 2 * 60 * 60 * 1000, // 2 hours
    refreshThreshold: 5 * 60 * 1000, // 5 minutes
    maxSessions: 10,
    persistSessions: false
  },

  /**
   * Default multi-actor configuration for testing
   */
  testMultiActor: {
    maxContextsPerRole: 3,
    contextTimeout: 30 * 60 * 1000, // 30 minutes
    autoRefreshTokens: true,
    preloadContexts: true,
    defaultCapabilities: {
      guest: ['read'],
      user: ['read', 'write'],
      admin: ['read', 'write', 'admin', 'manage-users'],
      vendor: ['read', 'vendor-specific', 'external-api']
    }
  },

  /**
   * Default test account templates
   */
  defaultTestTemplates: [
    {
      role: 'guest' as const,
      count: 3,
      metadata: { permissions: ['read'] }
    },
    {
      role: 'user' as const,
      count: 5,
      metadata: { permissions: ['read', 'write'] }
    },
    {
      role: 'admin' as const,
      count: 2,
      metadata: { permissions: ['read', 'write', 'admin'] }
    },
    {
      role: 'vendor' as const,
      count: 2,
      metadata: { permissions: ['read', 'vendor-specific'] }
    }
  ],

  /**
   * OAuth2 configuration for common providers
   */
  oauth2Providers: {
    /**
     * Google OAuth2 configuration template
     */
    google: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: ['openid', 'profile', 'email'],
      usePKCE: true,
      codeChallenge: 'S256' as const
    },

    /**
     * GitHub OAuth2 configuration template
     */
    github: {
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scope: ['user:email'],
      usePKCE: false
    },

    /**
     * Microsoft OAuth2 configuration template
     */
    microsoft: {
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scope: ['openid', 'profile', 'User.Read'],
      usePKCE: true,
      codeChallenge: 'S256' as const
    }
  }
};

/**
 * Quick setup helper for creating a basic auth orchestrator for testing
 */
export async function createTestAuthOrchestrator(overrides?: {
  environment?: 'test' | 'staging' | 'production';
  enableOAuth2?: boolean;
  oauth2Provider?: 'google' | 'github' | 'microsoft';
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}): Promise<AuthOrchestrator> {
  const environment = overrides?.environment || 'test';

  const config: AuthOrchestratorConfig = {
    vault: DefaultConfigurations.testVault,
    session: DefaultConfigurations.testSession,
    multiActor: DefaultConfigurations.testMultiActor,
    seeder: {
      environment,
      templates: DefaultConfigurations.defaultTestTemplates,
      seedOnInit: true
    }
  };

  // Add OAuth2 if requested
  if (overrides?.enableOAuth2 && overrides?.clientId) {
    const provider = overrides.oauth2Provider || 'google';
    const providerConfig = DefaultConfigurations.oauth2Providers[provider];

    config.oauth2 = {
      ...providerConfig,
      clientId: overrides.clientId,
      clientSecret: overrides.clientSecret,
      redirectUri: overrides.redirectUri || 'http://localhost:3000/callback'
    };
  }

  const orchestrator = new AuthOrchestrator(config);
  await orchestrator.initialize();

  return orchestrator;
}

/**
 * Helper to create a simple vault-only setup
 */
export async function createSimpleCredentialVault(
  environment: 'test' | 'staging' | 'production' = 'test'
): Promise<CredentialVault> {
  const vault = new CredentialVault(DefaultConfigurations.testVault);
  
  await vault.initialize();
  return vault;
}
