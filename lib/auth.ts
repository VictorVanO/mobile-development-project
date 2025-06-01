import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

// User validation schema
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
  firstName?: string;
  lastName?: string;
  admin: boolean;
  createdAt: string;
  updatedAt: string;
};

// Storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

const API_BASE_URL = 'http://localhost:3000'; // Update for production

// Auth functions
export class AuthService {
  static async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const validatedData = loginSchema.parse({ email, password });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store auth token and user data
      if (data.token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
      }
      
      if (data.user) {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
      }

      return { success: true, user: data.user };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid email or password format' };
      }
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async register(
    email: string, 
    password: string, 
    firstName?: string, 
    lastName?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const validatedData = userSchema.parse({ email, password, firstName, lastName });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      // Store auth token and user data
      if (data.token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
      }
      
      if (data.user) {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
      }

      return { success: true, user: data.user };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid input data' };
      }
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  static async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Get auth token error:', error);
      return null;
    }
  }

  static async isLoggedIn(): Promise<boolean> {
    const token = await this.getAuthToken();
    const user = await this.getCurrentUser();
    return !!(token && user);
  }

  // Helper function to make authenticated API requests
  static async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  }
}