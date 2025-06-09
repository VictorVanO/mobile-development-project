import Constants from 'expo-constants';

/**
 * API Configuration
 * This file centralizes all API-related configuration
 */

// Get the API base URL from environment variables
const getApiBaseUrl = (): string => {
  // Try to get from environment variable first
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  
  if (envUrl) {
    return envUrl;
  }

  // Fallback URLs based on platform (for development)
  if (__DEV__) {
    // Development fallbacks
    if (Constants.platform?.ios) {
      return 'http://localhost:3000'; // iOS Simulator
    } else if (Constants.platform?.android) {
      return 'http://10.0.2.2:3000'; // Android Emulator
    } else {
      return 'http://localhost:3000'; // Web or other platforms
    }
  }

  // Production fallback (you should set EXPO_PUBLIC_API_BASE_URL in production)
  return 'https://your-production-api.com';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    USER: '/api/auth/user',
    
    // Review endpoints
    REVIEWS: '/api/reviews',
    USER_REVIEWS: '/api/reviews/user',
    RECENT_REVIEWS: '/api/reviews/recent',
    DELETE_REVIEW: '/api/reviews/delete',
    
    // Other endpoints
    USERS: '/api/users',
  },
  
  // Request configuration
  TIMEOUT: 10000, // 10 seconds
  
  // Image configuration
  MAX_IMAGES_PER_REVIEW: 5,
  IMAGE_QUALITY: 0.8,
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function for authenticated requests
export const getRequestHeaders = (userEmail?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (userEmail) {
    headers['X-User-Email'] = userEmail;
  }

  return headers;
};

// Development helper to log current configuration
if (__DEV__) {
  console.log('🔧 API Configuration:', {
    baseUrl: API_CONFIG.BASE_URL,
    platform: Constants.platform,
    isDevice: Constants.isDevice,
  });
}