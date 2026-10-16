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

const isTokenExpired = (jwtToken: string): boolean => {
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return true; // Tokens without expiry are considered invalid
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

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
    } catch (err: any) {
      console.error('Failed to refresh user profile from /api/auth/me', err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('assetbridge_token');
        localStorage.removeItem('assetbridge_user');
        setToken(null);
        setUser(null);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const storedToken = localStorage.getItem('assetbridge_token');

        if (!storedToken) {
          if (isMounted) {
            setToken(null);
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        if (isTokenExpired(storedToken)) {
          console.warn('Persisted session token has expired. Clearing session.');
          localStorage.removeItem('assetbridge_token');
          localStorage.removeItem('assetbridge_user');
          if (isMounted) {
            setToken(null);
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        // Token exists and client expiry is valid -> verify with backend before granting access
        try {
          const res = await authApi.getCurrentUser();
          if (res.data && isMounted) {
            setToken(storedToken);
            setUser(res.data);
            localStorage.setItem('assetbridge_user', JSON.stringify(res.data));
          } else {
            throw new Error('User profile data missing from auth verification response');
          }
        } catch (apiErr: any) {
          console.error('Session verification with backend failed:', apiErr);
          localStorage.removeItem('assetbridge_token');
          localStorage.removeItem('assetbridge_user');
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error('Failed to parse or verify stored auth session:', e);
        localStorage.removeItem('assetbridge_token');
        localStorage.removeItem('assetbridge_user');
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
    };
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
