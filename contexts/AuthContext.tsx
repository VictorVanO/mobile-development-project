import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WebApiAuthService, User } from '@/lib/webapi-auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Add a method to trigger updates when reviews change
  triggerUpdate: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const refreshUser = async () => {
    try {
      const currentUser = await WebApiAuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [updateTrigger]); // Re-run when updateTrigger changes

  const login = async (email: string, password: string) => {
    try {
      const result = await WebApiAuthService.login(email, password);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const result = await WebApiAuthService.register(email, password, firstName, lastName);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await WebApiAuthService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const triggerUpdate = () => {
    setUpdateTrigger(prev => prev + 1);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    triggerUpdate,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};