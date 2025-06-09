import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import { API_CONFIG, buildApiUrl, getRequestHeaders } from './config';

// User validation schemas
export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type User = {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  admin: boolean;
  createdAt: string;
  updatedAt: string;
};

// Storage keys
const USER_DATA_KEY = 'user_data';
const USER_SESSION_KEY = 'user_session';

export class WebApiAuthService {
  /**
   * Login using the web version's API
   */
  static async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const validatedData = loginSchema.parse({ email, password });
      
      // Create FormData as expected by the web API
      const formData = new FormData();
      formData.append('email', validatedData.email);
      formData.append('password', validatedData.password);

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store session and user data
      await SecureStore.setItemAsync(USER_SESSION_KEY, validatedData.email);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
      
      return { success: true, user: data.user };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid email or password format' };
      }
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Register using the web version's API
   */
  static async register(
    email: string, 
    password: string, 
    firstName?: string, 
    lastName?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const validatedData = userSchema.parse({ email, password, firstName, lastName });
      
      // Create FormData as expected by the web API
      const formData = new FormData();
      formData.append('email', validatedData.email);
      formData.append('password', validatedData.password);
      if (validatedData.firstName) {
        formData.append('firstName', validatedData.firstName);
      }
      if (validatedData.lastName) {
        formData.append('lastName', validatedData.lastName);
      }

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.REGISTER), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      // Store session and user data
      await SecureStore.setItemAsync(USER_SESSION_KEY, validatedData.email);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
      
      return { success: true, user: data.user };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid input data' };
      }
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Get current user from web API or local storage
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const sessionEmail = await SecureStore.getItemAsync(USER_SESSION_KEY);
      if (!sessionEmail) {
        return null;
      }

      // Try to get fresh user data from the web API
      try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.USER), {
          method: 'GET',
          headers: getRequestHeaders(sessionEmail),
        });

        if (response.ok) {
          const userData = await response.json();
          if (userData && userData.id) {
            // Update stored user data
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            return userData;
          }
        }
      } catch (networkError) {
        console.log('Network error getting fresh user data, using cached data');
      }

      // Fallback to stored user data
      const storedUserData = await AsyncStorage.getItem(USER_DATA_KEY);
      return storedUserData ? JSON.parse(storedUserData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Logout - clear session and user data
   */
  static async logout(): Promise<void> {
    try {
      const sessionEmail = await SecureStore.getItemAsync(USER_SESSION_KEY);
      
      if (sessionEmail) {
        // Try to logout from web API
        try {
          await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.LOGOUT), {
            method: 'POST',
            headers: getRequestHeaders(sessionEmail),
          });
        } catch (error) {
          console.log('Web API logout failed, continuing with local logout');
        }
      }

      // Clear local storage
      await SecureStore.deleteItemAsync(USER_SESSION_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Check if user is logged in
   */
  static async isLoggedIn(): Promise<boolean> {
    try {
      const sessionEmail = await SecureStore.getItemAsync(USER_SESSION_KEY);
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return !!(sessionEmail && userData);
    } catch {
      return false;
    }
  }

  /**
   * Get stored session email
   */
  static async getSessionEmail(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(USER_SESSION_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Helper function to make authenticated requests to the web API
   */
  static async authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const sessionEmail = await this.getSessionEmail();
    
    return fetch(buildApiUrl(endpoint), {
      ...options,
      headers: {
        ...getRequestHeaders(sessionEmail || undefined),
        ...options.headers,
      },
    });
  }
}

/**
 * Simple testing functions
 */
export class SimpleWebApiAuth {
  /**
   * Get all users from web API (for testing and admin purposes)
   */
  static async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.USERS));
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return await response.json() as User[];
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  }

  /**
   * Test connection to web API
   */
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.USERS));
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}