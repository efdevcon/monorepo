import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { para } from '../config/para';

export type AuthMethod = 'para' | 'supabase';

export interface AuthToken {
  token: string;
  method: AuthMethod;
  user?: User;
}

export interface AuthServiceConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

class AuthService {
  private supabase: SupabaseClient | null = null;
  private config: AuthServiceConfig | null = null;

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      this.config = { supabaseUrl, supabaseAnonKey };
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
  }

  /**
   * Generate auth token for Para authentication
   */
  async generateParaToken(): Promise<AuthToken> {
    try {
      const { token } = await para.issueJwt();
      return {
        token,
        method: 'para'
      };
    } catch (error) {
      console.error('Failed to generate Para token:', error);
      throw new Error(`Failed to generate Para token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate auth token for Supabase authentication
   */
  async generateSupabaseToken(): Promise<AuthToken> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error || !session?.access_token) {
        throw new Error('No active Supabase session');
      }

      const { data: { user } } = await this.supabase.auth.getUser();
      
      return {
        token: session.access_token,
        method: 'supabase',
        user: user || undefined
      };
    } catch (error) {
      throw new Error(`Failed to generate Supabase token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate auth token based on current authentication state
   * Prioritizes Supabase if user is available, otherwise falls back to Para
   */
  async generateToken(): Promise<AuthToken> {
    try {
      // Try Supabase first if configured
      if (this.supabase) {
        try {
          const { data: { user } } = await this.supabase.auth.getUser();
          if (user) {
            console.log('Supabase user found, using Supabase token');
            return await this.generateSupabaseToken();
          }
        } catch (supabaseError) {
          console.log('No Supabase user or session, trying Para:', supabaseError);
        }
      }

      // Fallback to Para if no Supabase user
      if (typeof para !== 'undefined' && typeof para.issueJwt === 'function') {
        try {
          console.log('No Supabase user, using Para token');
          return await this.generateParaToken();
        } catch (paraError) {
          console.log('Para token generation failed:', paraError);
        }
      }

      // If both fail, try Supabase one more time (in case of session issues)
      if (this.supabase) {
        return await this.generateSupabaseToken();
      }

      throw new Error('No authentication method available');
    } catch (error) {
      throw new Error(`Failed to generate any auth token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate auth token with user context
   * If user is provided, prioritizes Supabase, otherwise falls back to Para
   */
  async generateTokenWithUser(user: User | null): Promise<AuthToken> {
    try {
      // If user is provided, use Supabase
      if (user && this.supabase) {
        return await this.generateSupabaseToken();
      }

      // Try Para if no Supabase user
      // Note: This will only succeed if Para user has completed biometric/OTP verification
      // (checked by useWalletManager via isFullyAuthenticated before calling useEnsureUserData)
      if (typeof para !== 'undefined' && typeof para.issueJwt === 'function') {
        try {
          console.log('No Supabase user, attempting Para token generation');
          return await this.generateParaToken();
        } catch (paraError) {
          console.log('Para token generation failed:', paraError);
          // Fall through to error below
        }
      }

      // Fallback to Supabase if available (will likely fail, but consistent behavior)
      if (this.supabase) {
        return await this.generateSupabaseToken();
      }

      throw new Error('No authenticated session available. Please complete authentication first.');
    } catch (error) {
      throw new Error(`Failed to generate token with user context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the Supabase client instance
   */
  getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

}

// Export singleton instance
export const authService = new AuthService();
