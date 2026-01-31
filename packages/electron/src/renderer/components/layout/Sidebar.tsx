import { Menu } from 'antd';
import {
  DashboardOutlined,
  VideoCameraOutlined,
  RollbackOutlined,
  InboxOutlined,
  UnorderedListOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', fontSize: 18, fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>
        Packing Video
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
