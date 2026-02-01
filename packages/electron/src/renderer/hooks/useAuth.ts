import { create } from 'zustand';
import { authApi } from '../services/api';
import { useProductCacheStore } from '../stores/product-cache.store';

interface AuthState {
  isAuthenticated: boolean;
  staffName: string;
  role: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('token'),
  staffName: localStorage.getItem('staffName') || '',
  role: localStorage.getItem('staffRole') || 'admin',

  login: async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('staffId', res.data.staff.id);
    localStorage.setItem('staffName', res.data.staff.fullName);
    localStorage.setItem('staffRole', res.data.staff.role || 'admin');
    set({ isAuthenticated: true, staffName: res.data.staff.fullName, role: res.data.staff.role || 'admin' });
    // Load product cache after login
    useProductCacheStore.getState().loadProducts();
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('staffId');
    localStorage.removeItem('staffName');
    localStorage.removeItem('staffRole');
    set({ isAuthenticated: false, staffName: '', role: 'admin' });
  },

  checkAuth: () => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi
        .me()
        .then((res) => {
          localStorage.setItem('staffId', res.data.id);
          localStorage.setItem('staffName', res.data.fullName);
          localStorage.setItem('staffRole', res.data.role || 'admin');
          set({ staffName: res.data.fullName, role: res.data.role || 'admin' });
          // Load product cache on auth check
          useProductCacheStore.getState().loadProducts();
        })
        .catch(() => {
          localStorage.removeItem('token');
          set({ isAuthenticated: false });
        });
    }
  },
}));
