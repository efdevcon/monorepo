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
    if (typeof para === 'undefined') {
      throw new Error('Para SDK not loaded');
    }

    try {
      // Check if we have Para JWT from useInitParaJwt
      const cachedToken = (window as any).__paraJwt;
      const issueAsync = (window as any).__paraJwtIssueAsync;

      if (cachedToken) {
        return {
          token: cachedToken,
          method: 'para'
        };
      }

      // If no cached token but issueAsync is available, try to get a fresh token
      if (typeof issueAsync === 'function') {
        const { token } = await issueAsync();
        (window as any).__paraJwt = token; // Cache it
        return {
          token,
          method: 'para'
        };
      }

      throw new Error('Para not initialized - please connect wallet first');
    } catch (error) {
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
   * ✨ NEW (default): Prioritizes Para JWT when available (direct backend verification)
   * 🔄 LEGACY: Set NEXT_PUBLIC_USE_LEGACY_AUTH_PRIORITY=true to use old Supabase-first flow
   */
  async generateToken(): Promise<AuthToken> {
    const useLegacyPriority = process.env.NEXT_PUBLIC_USE_LEGACY_AUTH_PRIORITY === 'true';

    if (useLegacyPriority) {
      return this.generateTokenLegacy();
    }

    try {
      // ✨ NEW: Try Para FIRST (no pre-check, just attempt)
      if (typeof para !== 'undefined') {
        try {
          console.log('✅ [NEW FLOW] Attempting Para JWT (direct backend verification)');
          return await this.generateParaToken();
        } catch (paraError) {
          console.log('⚠️ Para token generation failed, falling back to Supabase:', paraError);
          // Fall through to Supabase
        }
      }

      // Fallback to Supabase (for EOA users or if Para failed)
      if (this.supabase) {
        try {
          const { data: { user } } = await this.supabase.auth.getUser();
          if (user) {
            console.log('✅ Supabase user found - using Supabase token');
            return await this.generateSupabaseToken();
          }
        } catch (supabaseError) {
          console.log('⚠️ No Supabase session:', supabaseError);
        }
      }

      throw new Error('No authentication method available');
    } catch (error) {
      throw new Error(`Failed to generate any auth token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🔄 LEGACY: Original Supabase-first authentication priority
   * Use NEXT_PUBLIC_USE_LEGACY_AUTH_PRIORITY=true to enable
   */
  private async generateTokenLegacy(): Promise<AuthToken> {
    try {
      console.log('🔄 [LEGACY FLOW] Using Supabase-first authentication priority');

      // Try Supabase first if configured
      if (this.supabase) {
        try {
          const { data: { user } } = await this.supabase.auth.getUser();
          if (user) {
            console.log('✅ [LEGACY] Supabase user found, using Supabase token');
            return await this.generateSupabaseToken();
          }
        } catch (supabaseError) {
          console.log('⚠️ [LEGACY] No Supabase user or session, trying Para:', supabaseError);
        }
      }

      // Try Para (no pre-check needed)
      if (typeof para !== 'undefined') {
        try {
          console.log('✅ [LEGACY] No Supabase user, attempting Para token');
          return await this.generateParaToken();
        } catch (paraError) {
          console.log('⚠️ [LEGACY] Para token generation failed:', paraError);
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
      // ✨ NEW: For Para users (user === null), try Para first
      if (!user) {
        // Try Para (no pre-check, just attempt and catch error)
        if (typeof para !== 'undefined') {
          try {
            return await this.generateParaToken();
          } catch (paraError) {
            // Fall through to Supabase
          }
        }
      }

      // If user is provided, use Supabase
      if (user && this.supabase) {
        return await this.generateSupabaseToken();
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
