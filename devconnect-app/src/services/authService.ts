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
   * Check if Para is ready to issue JWTs
   * Para must be connected AND have completed biometric/OTP verification
   */
  private canIssueParaJwt(): boolean {
    return (
      typeof para !== 'undefined' &&
      typeof (window as any).para?.issueJwt === 'function' &&
      (para as any).isConnected === true
    );
  }

  /**
   * Generate auth token for Para authentication
   */
  async generateParaToken(): Promise<AuthToken> {
    if (!this.canIssueParaJwt()) {
      throw new Error('Para is not ready to issue JWT. Please complete biometric verification first.');
    }

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

      // Check if Para is ready before attempting token generation
      if (this.canIssueParaJwt()) {
        try {
          console.log('No Supabase user, using Para token (verification complete)');
          return await this.generateParaToken();
        } catch (paraError) {
          console.log('Para token generation failed:', paraError);
        }
      } else if (typeof para !== 'undefined' && (para as any).isConnected) {
        // Para is connected but not ready to issue JWTs (biometric verification pending)
        console.log('⏳ Para is connected but waiting for biometric verification');
        throw new Error('Para biometric verification required. Please complete authentication in the Para wallet.');
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

      // Check if Para is ready before attempting token generation
      if (this.canIssueParaJwt()) {
        try {
          console.log('No Supabase user, using Para token (verification complete)');
          return await this.generateParaToken();
        } catch (paraError) {
          console.log('Para token generation failed:', paraError);
          // Fall through to error below
        }
      } else if (typeof para !== 'undefined' && (para as any).isConnected) {
        // Para is connected but not ready to issue JWTs (biometric verification pending)
        console.log('⏳ Para is connected but waiting for biometric verification');
        throw new Error('Para biometric verification required. Please complete authentication in the Para wallet.');
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
