import { create } from 'zustand';
import { authApi } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  staffName: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('token'),
  staffName: localStorage.getItem('staffName') || '',

  login: async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('staffId', res.data.staff.id);
    localStorage.setItem('staffName', res.data.staff.fullName);
    set({ isAuthenticated: true, staffName: res.data.staff.fullName });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('staffId');
    localStorage.removeItem('staffName');
    set({ isAuthenticated: false, staffName: '' });
  },

  checkAuth: () => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi
        .me()
        .then((res) => {
          localStorage.setItem('staffId', res.data.id);
          localStorage.setItem('staffName', res.data.fullName);
          set({ staffName: res.data.fullName });
        })
        .catch(() => {
          localStorage.removeItem('token');
          set({ isAuthenticated: false });
        });
    }
  },
}));
