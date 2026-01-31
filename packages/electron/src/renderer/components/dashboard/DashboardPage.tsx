import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, message } from 'antd';
import {
  VideoCameraOutlined,
  RollbackOutlined,
  InboxOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { dashboardApi } from '../../services/api';

const { Title } = Typography;

interface DashboardData {
  ordersPackedToday: number;
  ordersReturnedToday: number;
  videosToday: number;
  avgDuration: number;
  productBreakdown: { productId: string; productName: string; sku: string; totalDeducted: number; totalReturned: number }[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .today()
      .then((res) => setData(res.data))
      .catch(() => message.error('Lỗi tải thống kê'))
      .finally(() => setLoading(false));
  }, []);

  const breakdownColumns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
    { title: 'Đã xuất', dataIndex: 'totalDeducted', key: 'totalDeducted', width: 80, align: 'center' as const },
    { title: 'Hoàn trả', dataIndex: 'totalReturned', key: 'totalReturned', width: 80, align: 'center' as const },
  ];

  return (
    <div>
      <Title level={4}>Tổng quan hôm nay</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Đơn đóng hàng"
              value={data?.ordersPackedToday || 0}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Đơn hàng hoàn"
              value={data?.ordersReturnedToday || 0}
              prefix={<RollbackOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Video hôm nay"
              value={data?.videosToday || 0}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="TB thời lượng"
              value={data?.avgDuration ? `${Math.floor(data.avgDuration / 60)}:${String(Math.round(data.avgDuration % 60)).padStart(2, '0')}` : '0:00'}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Chi tiết sản phẩm hôm nay" loading={loading}>
        <Table
          dataSource={data?.productBreakdown || []}
          columns={breakdownColumns}
          rowKey="productId"
          pagination={false}
          size="small"
          locale={{ emptyText: 'Chưa có dữ liệu hôm nay' }}
        />
      </Card>
    </div>
  );
}
