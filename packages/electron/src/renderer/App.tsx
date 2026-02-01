import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { MainLayout } from './components/layout/MainLayout';
import { PackingRecorder } from './components/packing/PackingRecorder';
import { ReturnRecorder } from './components/returns/ReturnRecorder';
import { VideoListPage } from './components/videos/VideoListPage';
import { InventoryPage } from './components/inventory/InventoryPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth } from './hooks/useAuth';

function ProtectedRoutes() {
  const role = useAuth((s) => s.role);
  const isAdmin = role === 'admin';

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/packing/new" element={<PackingRecorder />} />
        <Route path="/packing/list" element={<VideoListPage type="PACKING" />} />
        <Route path="/returns/new" element={<ReturnRecorder />} />
        <Route path="/returns/list" element={<VideoListPage type="RETURN" />} />
        <Route path="/inventory" element={isAdmin ? <InventoryPage /> : <Navigate to="/dashboard" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const checkAuth = useAuth((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ConfigProvider locale={viVN} theme={{ algorithm: antTheme.defaultAlgorithm }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={isAuthenticated ? <ProtectedRoutes /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
