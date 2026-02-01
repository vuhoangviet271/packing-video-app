import { useState } from 'react';
import { Menu, Button, message } from 'antd';
import {
  DashboardOutlined,
  VideoCameraOutlined,
  RollbackOutlined,
  InboxOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { kiotvietApi } from '../../services/api';

const menuItems = [
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
  {
    key: '/inventory',
    icon: <InboxOutlined />,
    label: 'Kho',
  },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);

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
    </div>
  );
}
