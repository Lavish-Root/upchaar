import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: { email: string; password: string; expectedRole?: Role }) => Promise<User>;
  registerAdmin: (data: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    adminSecretKey?: string;
  }) => Promise<User>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('praansewa_access_token');
      const savedUser = localStorage.getItem('praansewa_user');

      if (savedToken && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify with /auth/me in background
          const res: any = await api.get('/auth/me');
          if (res.data) {
            const freshUser: User = {
              id: res.data.id,
              email: res.data.email,
              fullName: res.data.fullName,
              role: res.data.role,
              phone: res.data.phone,
              avatarUrl: res.data.avatarUrl,
              isActive: res.data.isActive,
              doctorId: res.data.doctor?.id,
              doctorVerificationStatus: res.data.doctor?.verificationStatus,
              patientId: res.data.patient?.id,
              specialties: res.data.doctor?.specialties?.map((s: any) => s.specialty?.name),
            };
            setUser(freshUser);
            localStorage.setItem('praansewa_user', JSON.stringify(freshUser));
          }
        } catch (err) {
          console.warn('Session expired or invalid, clearing local storage.');
          localStorage.removeItem('praansewa_access_token');
          localStorage.removeItem('praansewa_refresh_token');
          localStorage.removeItem('praansewa_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async ({ email, password, expectedRole }: { email: string; password: string; expectedRole?: Role }): Promise<User> => {
    const response: any = await api.post('/auth/login', { email, password, expectedRole });
    const { user: userData, accessToken, refreshToken } = response.data;

    localStorage.setItem('praansewa_access_token', accessToken);
    localStorage.setItem('praansewa_refresh_token', refreshToken);
    localStorage.setItem('praansewa_user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  };

  const registerAdmin = async (data: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    adminSecretKey?: string;
  }): Promise<User> => {
    const response: any = await api.post('/auth/register/admin', data);
    const { user: userData, accessToken, refreshToken } = response.data;

    localStorage.setItem('praansewa_access_token', accessToken);
    localStorage.setItem('praansewa_refresh_token', refreshToken);
    localStorage.setItem('praansewa_user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('praansewa_access_token');
    localStorage.removeItem('praansewa_refresh_token');
    localStorage.removeItem('praansewa_user');
    setUser(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updatedFields };
    setUser(updated);
    localStorage.setItem('praansewa_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerAdmin,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
