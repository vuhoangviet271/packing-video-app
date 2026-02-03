import { useState, useMemo } from 'react';
import { Menu, Button, message, Typography, Divider } from 'antd';
import {
  DashboardOutlined,
  VideoCameraOutlined,
  RollbackOutlined,
  InboxOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  SyncOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { kiotvietApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const { Text } = Typography;

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);
  const { role, staffName, logout } = useAuth();
  const isAdmin = role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = useMemo(() => {
    const items: any[] = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Tổng quan',
      },
      {
        key: 'packing',
        icon: <VideoCameraOutlined />,
        label: 'Đóng hàng',
        children: [
          { key: '/packing/new', icon: <PlusOutlined />, label: 'Đăng mới' },
          { key: '/packing/list', icon: <UnorderedListOutlined />, label: 'Danh sách' },
        ],
      },
      {
        key: 'returns',
        icon: <RollbackOutlined />,
        label: 'Nhập hàng hoàn',
        children: [
          { key: '/returns/new', icon: <PlusOutlined />, label: 'Đăng mới' },
          { key: '/returns/list', icon: <UnorderedListOutlined />, label: 'Danh sách' },
        ],
      },
    ];

    if (isAdmin) {
      items.push({
        key: '/inventory',
        icon: <InboxOutlined />,
        label: 'Kho',
      });
      items.push({
        key: '/inventory-log',
        icon: <UnorderedListOutlined />,
        label: 'Lịch sử kho',
      });
    }

    return items;
  }, [isAdmin]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await kiotvietApi.sync();
      const { imported, skipped, total } = res.data;
      message.success(`Đã đồng bộ ${imported} đơn mới (${skipped} đã có / ${total} tổng)`);
    } catch (err: any) {
      message.error('Đồng bộ thất bại: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', fontSize: 18, fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>
        Packing Video
      </div>
      <div style={{ padding: '8px 16px' }}>
        <Button
          icon={<SyncOutlined spin={syncing} />}
          onClick={handleSync}
          loading={syncing}
          block
          type="primary"
          ghost
        >
          Đồng bộ đơn
        </Button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['packing', 'returns']}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, borderRight: 0 }}
      />

      {/* User info and logout at bottom */}
      <div style={{ borderTop: '1px solid #f0f0f0' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong>{staffName}</Text>
          <Button
            type="text"
            size="small"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            danger
          >
            Thoát
          </Button>
        </div>
      </div>
    </div>
  );
}
