import { randomBytes, createHash } from 'crypto';
import { URL } from 'url';
import { Logger } from '../utils/Logger';
import { CredentialVault, Credential } from './CredentialVault';

export interface OAuth2Config {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  usePKCE?: boolean;
  codeChallenge?: 'S256' | 'plain';
  timeout?: number;
}

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

export interface AuthorizationFlow {
  state: string;
  codeVerifier?: string;
  codeChallenge?: string;
  pkceMethod?: string;
  redirectUri: string;
  scope: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface TokenInfo {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  scope?: string;
  idToken?: string;
  issuedAt: Date;
  expiresAt?: Date;
}

/**
 * OAuth2 authentication manager with PKCE support
 */
export class OAuth2Manager {
  private logger: Logger;
  private config: OAuth2Config;
  private vault: CredentialVault;
  private activeFlows: Map<string, AuthorizationFlow> = new Map();
  private tokens: Map<string, TokenInfo> = new Map();

  constructor(config: OAuth2Config, vault: CredentialVault) {
    this.logger = Logger.getInstance();
    this.config = {
      usePKCE: true,
      codeChallenge: 'S256',
      timeout: 600000, // 10 minutes
      ...config
    };
    this.vault = vault;

    this.logger.info('OAuth2 manager initialized', {
      clientId: config.clientId,
      usePKCE: this.config.usePKCE
    });
  }

  /**
   * Generate authorization URL for OAuth2 flow
   */
  public generateAuthUrl(
    scope?: string[],
    customRedirectUri?: string
  ): { url: string; state: string; flow: AuthorizationFlow } {
    const state = this.generateState();
    const redirectUri = customRedirectUri || this.config.redirectUri;
    const requestScope = scope || this.config.scope;

    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    let pkceMethod: string | undefined;

    // Generate PKCE parameters if enabled
    if (this.config.usePKCE) {
      codeVerifier = this.generateCodeVerifier();
      codeChallenge = this.generateCodeChallenge(codeVerifier);
      pkceMethod = this.config.codeChallenge || 'S256';
    }

    const flow: AuthorizationFlow = {
      state,
      codeVerifier,
      codeChallenge,
      pkceMethod,
      redirectUri,
      scope: requestScope,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (this.config.timeout || 600000))
    };

    // Store the flow
    this.activeFlows.set(state, flow);

    // Build authorization URL
    const authUrl = new URL(this.config.authUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', requestScope.join(' '));
    authUrl.searchParams.set('state', state);

    if (this.config.usePKCE && codeChallenge) {
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', pkceMethod!);
    }

    this.logger.info('Generated OAuth2 authorization URL', {
      state,
      scope: requestScope,
      usePKCE: this.config.usePKCE
    });

    return {
      url: authUrl.toString(),
      state,
      flow
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  public async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<TokenInfo> {
    const flow = this.activeFlows.get(state);
    if (!flow) {
      throw new Error('Invalid or expired authorization state');
    }

    if (flow.expiresAt < new Date()) {
      this.activeFlows.delete(state);
      throw new Error('Authorization flow has expired');
    }

    const tokenRequest = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: flow.redirectUri
    });

    // Add client secret if available (for confidential clients)
    if (this.config.clientSecret) {
      tokenRequest.set('client_secret', this.config.clientSecret);
    }

    // Add PKCE code verifier if used
    if (flow.codeVerifier) {
      tokenRequest.set('code_verifier', flow.codeVerifier);
    }

    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenRequest.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${error}`);
      }

      const tokenResponse: OAuth2TokenResponse = await response.json();
      const tokenInfo = this.processTokenResponse(tokenResponse);

      // Store token info
      this.tokens.set(state, tokenInfo);

      // Clean up the flow
      this.activeFlows.delete(state);

      this.logger.info('Successfully exchanged code for tokens', {
        state,
        hasRefreshToken: !!tokenInfo.refreshToken
      });

      return tokenInfo;
    } catch (error) {
      this.activeFlows.delete(state);
      this.logger.error('Token exchange failed', { error, state });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<TokenInfo> {
    const tokenRequest = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: refreshToken
    });

    if (this.config.clientSecret) {
      tokenRequest.set('client_secret', this.config.clientSecret);
    }

    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenRequest.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${error}`);
      }

      const tokenResponse: OAuth2TokenResponse = await response.json();
      const tokenInfo = this.processTokenResponse(tokenResponse);

      this.logger.info('Successfully refreshed access token');

      return tokenInfo;
    } catch (error) {
      this.logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Start device code flow
   */
  public async startDeviceFlow(scope?: string[]): Promise<DeviceCodeResponse> {
    const requestScope = scope || this.config.scope;
    
    const deviceRequest = new URLSearchParams({
      client_id: this.config.clientId,
      scope: requestScope.join(' ')
    });

    try {
      const response = await fetch(`${this.config.authUrl}/device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: deviceRequest.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Device flow start failed: ${response.status} ${error}`);
      }

      const deviceResponse: DeviceCodeResponse = await response.json();

      this.logger.info('Started device code flow', {
        userCode: deviceResponse.user_code,
        verificationUri: deviceResponse.verification_uri
      });

      return deviceResponse;
    } catch (error) {
      this.logger.error('Device flow start failed', { error });
      throw error;
    }
  }

  /**
   * Poll for device code token
   */
  public async pollDeviceToken(
    deviceCode: string,
    interval: number = 5,
    maxAttempts: number = 60
  ): Promise<TokenInfo> {
    let attempts = 0;

    const poll = async (): Promise<TokenInfo> => {
      if (attempts >= maxAttempts) {
        throw new Error('Device code flow timed out');
      }

      attempts++;

      const tokenRequest = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: this.config.clientId,
        device_code: deviceCode
      });

      try {
        const response = await fetch(this.config.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: tokenRequest.toString()
        });

        const responseData = await response.json();

        if (response.ok) {
          const tokenInfo = this.processTokenResponse(responseData);
          this.logger.info('Device code flow completed successfully');
          return tokenInfo;
        }

        // Handle specific error codes
        if (responseData.error === 'authorization_pending') {
          // Wait and try again
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
          return poll();
        } else if (responseData.error === 'slow_down') {
          // Increase interval and try again
          await new Promise(resolve => setTimeout(resolve, (interval + 5) * 1000));
          return poll();
        } else {
          throw new Error(`Device token poll failed: ${responseData.error}`);
        }
      } catch (error) {
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
          return poll();
        }
        throw error;
      }
    };

    return poll();
  }

  /**
   * Get user info using access token
   */
  public async getUserInfo(accessToken: string): Promise<any> {
    if (!this.config.userInfoUrl) {
      throw new Error('User info URL not configured');
    }

    try {
      const response = await fetch(this.config.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`User info request failed: ${response.status} ${error}`);
      }

      const userInfo = await response.json();

      this.logger.debug('Retrieved user info', {
        hasEmail: !!userInfo.email,
        hasName: !!userInfo.name
      });

      return userInfo;
    } catch (error) {
      this.logger.error('User info request failed', { error });
      throw error;
    }
  }

  /**
   * Store OAuth2 credential in vault
   */
  public async storeOAuth2Credential(
    tokenInfo: TokenInfo,
    userInfo: any,
    role: Credential['role'],
    environment: Credential['environment']
  ): Promise<string> {
    const credential: Omit<Credential, 'id' | 'createdAt'> = {
      role,
      environment,
      username: userInfo.preferred_username || userInfo.email || userInfo.sub,
      email: userInfo.email,
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      tokenExpiresAt: tokenInfo.expiresAt,
      metadata: {
        oauth2: true,
        tokenType: tokenInfo.tokenType,
        scope: tokenInfo.scope,
        idToken: tokenInfo.idToken,
        userInfo: {
          sub: userInfo.sub,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture
        }
      }
    };

    const id = await this.vault.storeCredential(credential);

    this.logger.info('Stored OAuth2 credential', {
      id,
      role,
      username: credential.username
    });

    return id;
  }

  /**
   * Cleanup expired flows and tokens
   */
  public cleanupExpired(): number {
    const now = new Date();
    let cleaned = 0;

    // Clean up expired flows
    for (const [state, flow] of this.activeFlows.entries()) {
      if (flow.expiresAt < now) {
        this.activeFlows.delete(state);
        cleaned++;
      }
    }

    // Clean up expired tokens
    for (const [state, token] of this.tokens.entries()) {
      if (token.expiresAt && token.expiresAt < now) {
        this.tokens.delete(state);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.info('Cleaned up expired OAuth2 flows and tokens', { cleaned });
    }

    return cleaned;
  }

  /**
   * Process token response into TokenInfo
   */
  private processTokenResponse(response: OAuth2TokenResponse): TokenInfo {
    const issuedAt = new Date();
    const expiresAt = response.expires_in
      ? new Date(issuedAt.getTime() + (response.expires_in * 1000))
      : undefined;

    return {
      accessToken: response.access_token,
      tokenType: response.token_type,
      expiresIn: response.expires_in,
      refreshToken: response.refresh_token,
      scope: response.scope,
      idToken: response.id_token,
      issuedAt,
      expiresAt
    };
  }

  /**
   * Generate secure random state
   */
  private generateState(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge
   */
  private generateCodeChallenge(codeVerifier: string): string {
    if (this.config.codeChallenge === 'plain') {
      return codeVerifier;
    }
    
    // S256 method
    return createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
  }

  /**
   * Get active flows count
   */
  public getActiveFlowsCount(): number {
    return this.activeFlows.size;
  }

  /**
   * Get stored tokens count
   */
  public getStoredTokensCount(): number {
    return this.tokens.size;
  }
}
