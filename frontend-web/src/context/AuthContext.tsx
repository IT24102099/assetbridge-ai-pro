import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/auth';
import { authApi } from '../lib/api/authApi';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFreshUser = async () => {
    try {
      const res = await authApi.getCurrentUser();
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('assetbridge_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to refresh user profile from /api/auth/me', err);
    }
  };

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('assetbridge_token');
      const storedUser = localStorage.getItem('assetbridge_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Refresh authenticated profile in background to ensure dynamic real full name
        fetchFreshUser();
      }
    } catch (e) {
      console.error('Failed to parse stored auth session:', e);
      localStorage.removeItem('assetbridge_token');
      localStorage.removeItem('assetbridge_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem('assetbridge_token', newToken);
    localStorage.setItem('assetbridge_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('assetbridge_token');
    localStorage.removeItem('assetbridge_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasRole,
        refreshUser: fetchFreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthProvider;
