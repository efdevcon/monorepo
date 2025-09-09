import { authService, type AuthToken } from './authService';
import { type User } from '@supabase/supabase-js';

// Helper function to get current user from Supabase
async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = authService.getSupabaseClient();
    if (!supabase) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export interface ApiRequestOptions extends RequestInit {
  user?: User | null;
}

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an authenticated API request
   * Automatically handles token generation and auth headers
   */
  async fetchAuth<T = any>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { user, ...fetchOptions } = options;
      
      // Generate auth token - use user context if provided, otherwise get current user
      const currentUser = user !== undefined ? user : await getCurrentUser();
      const authToken = await authService.generateTokenWithUser(currentUser);

      // Prepare headers
      const headers = new Headers(fetchOptions.headers);
      headers.set('Authorization', `Bearer ${authToken.token}`);
      headers.set('X-Auth-Method', authToken.method);
      headers.set('Content-Type', 'application/json');

      // Make the request
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        data,
        success: true,
      };
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

}

// Create default instance
const apiClient = new ApiClient();

// Export the main function
export const fetchAuth = <T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> => {
  return apiClient.fetchAuth<T>(endpoint, options);
};
