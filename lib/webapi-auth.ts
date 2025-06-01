import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

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

// Web API base URL - Different port from mobile app
const WEB_API_BASE_URL = 'http://localhost:3000'; // Web version runs on port 3000

export class WebApiAuthService {
  /**
   * Login using the web version's login action
   * Based on the web version's loginAction in src/lib/auth/user.ts
   */
  static async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const validatedData = loginSchema.parse({ email, password });
      
      // Create FormData as expected by the web API
      const formData = new FormData();
      formData.append('email', validatedData.email);
      formData.append('password', validatedData.password);

      const response = await fetch(`${WEB_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: 'Login failed' };
      }

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // For session-based auth, we need to store the session cookie or user identifier
      // Since the web version uses sessions, we'll store the user email as session identifier
      await SecureStore.setItemAsync(USER_SESSION_KEY, validatedData.email);
      
      // Get user data after successful login
      const userData = await this.getCurrentUser();
      if (userData) {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        return { success: true, user: userData };
      }

      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid email or password format' };
      }
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Register using the web version's register action
   * Based on the web version's registerAction in src/lib/auth/user.ts
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

      const response = await fetch(`${WEB_API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: 'Registration failed' };
      }

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      // Store session and user data
      await SecureStore.setItemAsync(USER_SESSION_KEY, validatedData.email);
      
      // Get user data after successful registration
      const userData = await this.getCurrentUser();
      if (userData) {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        return { success: true, user: userData };
      }

      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid input data' };
      }
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Get current user from web API
   * Based on the web version's getUser query
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const sessionEmail = await SecureStore.getItemAsync(USER_SESSION_KEY);
      if (!sessionEmail) {
        return null;
      }

      // Try to get fresh user data from the web API
      const response = await fetch(`${WEB_API_BASE_URL}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Include session identifier if the web API supports it
          'X-User-Email': sessionEmail,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.id) {
          // Update stored user data
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
          return userData;
        }
      }

      // Fallback to stored user data
      const storedUserData = await AsyncStorage.getItem(USER_DATA_KEY);
      return storedUserData ? JSON.parse(storedUserData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      
      // Fallback to stored user data
      try {
        const storedUserData = await AsyncStorage.getItem(USER_DATA_KEY);
        return storedUserData ? JSON.parse(storedUserData) : null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Logout - clear session and user data
   */
  static async logout(): Promise<void> {
    try {
      const sessionEmail = await SecureStore.getItemAsync(USER_SESSION_KEY);
      
      if (sessionEmail) {
        // Try to logout from web API if it has a logout endpoint
        try {
          await fetch(`${WEB_API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Email': sessionEmail,
            },
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
   * Similar to the pattern used in lib/task.ts
   */
  static async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const sessionEmail = await this.getSessionEmail();
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(sessionEmail && { 'X-User-Email': sessionEmail }),
      },
    });
  }
}

/**
 * Alternative simpler approach if the web API doesn't support direct authentication
 * This mimics the task.ts pattern more closely
 */
export class SimpleWebApiAuth {
  /**
   * Get all users from web API (for testing and admin purposes)
   */
  static async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${WEB_API_BASE_URL}/api/users`);
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
   * Find user by email and password (client-side verification)
   * Note: This is less secure but works if the web API doesn't have auth endpoints
   */
  static async loginWithUserList(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // This would require the web API to expose a users endpoint
      const users = await this.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Note: This doesn't verify password since we can't access hashed passwords
      // You'd need to implement a proper auth endpoint in the web version
      
      // Store user data
      await SecureStore.setItemAsync(USER_SESSION_KEY, email);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }
}