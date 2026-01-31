import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [staffName, setStaffName] = useState(() => localStorage.getItem('staffName') || '');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi
        .me()
        .then((res) => {
          setStaffName(res.data.fullName);
          localStorage.setItem('staffId', res.data.id);
          localStorage.setItem('staffName', res.data.fullName);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        });
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('staffId', res.data.staff.id);
    localStorage.setItem('staffName', res.data.staff.fullName);
    setStaffName(res.data.staff.fullName);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('staffId');
    localStorage.removeItem('staffName');
    setIsAuthenticated(false);
    setStaffName('');
  }, []);

  return { isAuthenticated, staffName, login, logout };
}
