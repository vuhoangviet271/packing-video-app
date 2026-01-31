import { Layout, Button, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { staffName, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <Sidebar />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            height: 48,
            lineHeight: '48px',
          }}
        >
          <Text style={{ marginRight: 12 }}>{staffName}</Text>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
            Thoát
          </Button>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
