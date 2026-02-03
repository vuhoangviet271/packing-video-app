import { Layout } from 'antd';
import { Sidebar } from './Sidebar';

const { Sider, Content } = Layout;

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <Sidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
