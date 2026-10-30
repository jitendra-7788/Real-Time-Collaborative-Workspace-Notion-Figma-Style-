import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../services/api.ts';
import { realtime } from '../services/socket.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  demoUsers: User[];
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, roleTitle?: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const demoRes = await api.getDemoUsers();
        setDemoUsers(demoRes.users);

        const token = getStoredToken();
        if (token) {
          const meRes = await api.getMe();
          setUser(meRes.user);
          realtime.connect(meRes.user);
        } else if (demoRes.users.length > 0) {
          // Default to Elena Rostova for frictionless exploration
          const defaultUser = demoRes.users[0];
          setStoredToken(defaultUser.id);
          setUser(defaultUser);
          realtime.connect(defaultUser);
        }
      } catch (err) {
        console.warn('Auth initialization warning:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setStoredToken(res.token);
    setUser(res.user);
    realtime.connect(res.user);
  };

  const register = async (name: string, email: string, password: string, roleTitle?: string) => {
    const res = await api.register(name, email, password, roleTitle);
    setStoredToken(res.token);
    setUser(res.user);
    realtime.connect(res.user);
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    realtime.disconnect();
  };

  const switchDemoUser = async (userId: string) => {
    const res = await api.switchDemoUser(userId);
    setStoredToken(res.token);
    setUser(res.user);
    realtime.disconnect();
    realtime.connect(res.user);
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        demoUsers,
        login,
        register,
        logout,
        switchDemoUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
