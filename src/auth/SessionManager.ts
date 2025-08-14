import { randomBytes } from 'crypto';
import { Logger } from '../utils/Logger';
import { CredentialVault, Credential } from './CredentialVault';
import { OAuth2Manager, TokenInfo } from './OAuth2Manager';

export interface SessionConfig {
  sessionTimeout: number; // in milliseconds
  refreshThreshold: number; // refresh when token expires within this time (ms)
  maxSessions: number;
  persistSessions?: boolean;
  sessionPrefix?: string;
  cookieSecure?: boolean;
  cookieSameSite?: 'strict' | 'lax' | 'none';
}

export interface Session {
  id: string;
  credentialId: string;
  userId: string;
  role: Credential['role'];
  environment: Credential['environment'];
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
  csrfToken?: string;
}

export interface AuthenticationResult {
  session: Session;
  credential: Credential;
  needsRefresh: boolean;
  isNewSession: boolean;
}

/**
 * Session manager for handling authentication sessions
 */
export class SessionManager {
  private logger: Logger;
  private config: SessionConfig;
  private vault: CredentialVault;
  private oauth2Manager?: OAuth2Manager;
  private sessions: Map<string, Session> = new Map();
  private sessionsByUser: Map<string, Set<string>> = new Map();

  constructor(config: SessionConfig, vault: CredentialVault, oauth2Manager?: OAuth2Manager) {
    this.logger = Logger.getInstance();
    this.config = {
      sessionPrefix: 'ps_session_',
      cookieSecure: true,
      cookieSameSite: 'lax',
      persistSessions: true,
      ...config
    };
    this.vault = vault;
    this.oauth2Manager = oauth2Manager;

    this.logger.info('Session manager initialized', {
      sessionTimeout: config.sessionTimeout,
      refreshThreshold: config.refreshThreshold,
      maxSessions: config.maxSessions
    });

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create a new session for a credential
   */
  public async createSession(credentialId: string, metadata?: Record<string, any>): Promise<Session> {
    const credential = await this.vault.getCredential(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Check session limits for user
    const existingSessions = this.sessionsByUser.get(credential.username) || new Set();
    if (existingSessions.size >= this.config.maxSessions) {
      // Remove oldest session
      const oldestSessionId = Array.from(existingSessions)[0];
      await this.destroySession(oldestSessionId);
    }

    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionTimeout);

    const session: Session = {
      id: sessionId,
      credentialId,
      userId: credential.username,
      role: credential.role,
      environment: credential.environment,
      accessToken: credential.accessToken,
      refreshToken: credential.refreshToken,
      tokenExpiresAt: credential.tokenExpiresAt,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      metadata,
      csrfToken: this.generateCSRFToken()
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track session by user
    if (!this.sessionsByUser.has(credential.username)) {
      this.sessionsByUser.set(credential.username, new Set());
    }
    this.sessionsByUser.get(credential.username)!.add(sessionId);

    // Update credential last used
    await this.vault.markCredentialUsed(credentialId);

    this.logger.info('Created new session', {
      sessionId,
      userId: credential.username,
      role: credential.role,
      environment: credential.environment
    });

    return session;
  }

  /**
   * Authenticate user and create/update session
   */
  public async authenticateUser(
    username: string,
    password?: string,
    environment: Credential['environment'] = 'test',
    role?: Credential['role']
  ): Promise<AuthenticationResult> {
    let credential: Credential | null = null;

    if (role) {
      // Get credential by role
      const credentials = await this.vault.getCredentialsByRole(role, environment);
      credential = credentials.find(c => c.username === username) || credentials[0];
    } else if (password) {
      // Traditional username/password authentication
      credential = await this.vault.validateCredential(username, password, environment);
    } else {
      // Get any credential for username
      const allCredentials = await this.vault.getAllCredentials();
      credential = allCredentials.find(c => 
        c.username === username && c.environment === environment
      );
    }

    if (!credential) {
      throw new Error('Authentication failed: Invalid credentials');
    }

    // Check for existing active session
    const existingSession = this.findActiveSessionByUser(credential.username);
    if (existingSession) {
      // Update last activity and extend session
      existingSession.lastActivity = new Date();
      existingSession.expiresAt = new Date(Date.now() + this.config.sessionTimeout);

      const needsRefresh = this.doesSessionNeedRefresh(existingSession);
      if (needsRefresh && this.oauth2Manager && existingSession.refreshToken) {
        await this.refreshSessionToken(existingSession);
      }

      this.logger.info('Reused existing session', {
        sessionId: existingSession.id,
        userId: credential.username
      });

      return {
        session: existingSession,
        credential,
        needsRefresh,
        isNewSession: false
      };
    }

    // Create new session
    const session = await this.createSession(credential.id);
    const needsRefresh = this.doesSessionNeedRefresh(session);

    return {
      session,
      credential,
      needsRefresh,
      isNewSession: true
    };
  }

  /**
   * Get session by ID
   */
  public async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.destroySession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();

    return session;
  }

  /**
   * Refresh session token if needed
   */
  public async refreshSessionToken(session: Session): Promise<boolean> {
    if (!this.oauth2Manager || !session.refreshToken) {
      return false;
    }

    try {
      const tokenInfo = await this.oauth2Manager.refreshToken(session.refreshToken);
      
      // Update session with new token info
      session.accessToken = tokenInfo.accessToken;
      session.refreshToken = tokenInfo.refreshToken || session.refreshToken;
      session.tokenExpiresAt = tokenInfo.expiresAt;

      // Update credential in vault
      await this.vault.updateToken(
        session.credentialId,
        tokenInfo.accessToken,
        tokenInfo.refreshToken,
        tokenInfo.expiresAt
      );

      this.logger.info('Refreshed session token', {
        sessionId: session.id,
        newExpiresAt: tokenInfo.expiresAt?.toISOString()
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to refresh session token', {
        sessionId: session.id,
        error
      });
      return false;
    }
  }

  /**
   * Destroy a session
   */
  public async destroySession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Remove from sessions map
    this.sessions.delete(sessionId);

    // Remove from user sessions tracking
    const userSessions = this.sessionsByUser.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.sessionsByUser.delete(session.userId);
      }
    }

    this.logger.info('Destroyed session', {
      sessionId,
      userId: session.userId
    });

    return true;
  }

  /**
   * Destroy all sessions for a user
   */
  public async destroyUserSessions(userId: string): Promise<number> {
    const userSessions = this.sessionsByUser.get(userId);
    if (!userSessions) {
      return 0;
    }

    const sessionIds = Array.from(userSessions);
    let destroyedCount = 0;

    for (const sessionId of sessionIds) {
      const destroyed = await this.destroySession(sessionId);
      if (destroyed) {
        destroyedCount++;
      }
    }

    this.logger.info('Destroyed user sessions', {
      userId,
      destroyedCount
    });

    return destroyedCount;
  }

  /**
   * Extend session expiry
   */
  public async extendSession(sessionId: string, additionalTime?: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const extensionTime = additionalTime || this.config.sessionTimeout;
    session.expiresAt = new Date(Date.now() + extensionTime);
    session.lastActivity = new Date();

    this.logger.debug('Extended session', {
      sessionId,
      newExpiresAt: session.expiresAt.toISOString()
    });

    return true;
  }

  /**
   * Get active sessions for a user
   */
  public getActiveSessionsForUser(userId: string): Session[] {
    const sessionIds = this.sessionsByUser.get(userId);
    if (!sessionIds) {
      return [];
    }

    const sessions: Session[] = [];
    const now = new Date();

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.expiresAt > now) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Get all active sessions
   */
  public getAllActiveSessions(): Session[] {
    const sessions: Session[] = [];
    const now = new Date();

    for (const session of this.sessions.values()) {
      if (session.expiresAt > now) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): {
    total: number;
    active: number;
    expired: number;
    byRole: Record<string, number>;
    byEnvironment: Record<string, number>;
  } {
    const stats = {
      total: this.sessions.size,
      active: 0,
      expired: 0,
      byRole: {} as Record<string, number>,
      byEnvironment: {} as Record<string, number>
    };

    const now = new Date();

    for (const session of this.sessions.values()) {
      if (session.expiresAt > now) {
        stats.active++;
      } else {
        stats.expired++;
      }

      stats.byRole[session.role] = (stats.byRole[session.role] || 0) + 1;
      stats.byEnvironment[session.environment] = (stats.byEnvironment[session.environment] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clean up expired sessions
   */
  public async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        await this.destroySession(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('Cleaned up expired sessions', { cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Validate CSRF token
   */
  public validateCSRFToken(sessionId: string, csrfToken: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    return session.csrfToken === csrfToken;
  }

  /**
   * Generate new CSRF token for session
   */
  public async regenerateCSRFToken(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const newToken = this.generateCSRFToken();
    session.csrfToken = newToken;

    this.logger.debug('Regenerated CSRF token', { sessionId });

    return newToken;
  }

  /**
   * Find active session by user ID
   */
  private findActiveSessionByUser(userId: string): Session | null {
    const userSessions = this.sessionsByUser.get(userId);
    if (!userSessions) {
      return null;
    }

    const now = new Date();
    for (const sessionId of userSessions) {
      const session = this.sessions.get(sessionId);
      if (session && session.expiresAt > now) {
        return session;
      }
    }

    return null;
  }

  /**
   * Check if session needs token refresh
   */
  private doesSessionNeedRefresh(session: Session): boolean {
    if (!session.tokenExpiresAt) {
      return false;
    }

    const now = new Date();
    const timeUntilExpiry = session.tokenExpiresAt.getTime() - now.getTime();
    return timeUntilExpiry <= this.config.refreshThreshold;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    const prefix = this.config.sessionPrefix || 'ps_session_';
    const randomPart = randomBytes(32).toString('base64url');
    return `${prefix}${randomPart}`;
  }

  /**
   * Generate CSRF token
   */
  private generateCSRFToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions().catch(error => {
        this.logger.error('Session cleanup failed', { error });
      });
    }, 5 * 60 * 1000);
  }
}
