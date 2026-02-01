import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, message, Radio, DatePicker, Space } from 'antd';
import {
  VideoCameraOutlined,
  RollbackOutlined,
  InboxOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { dashboardApi } from '../../services/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type PresetKey = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'thisYear';

const presetOptions: { label: string; value: PresetKey }[] = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Hôm qua', value: 'yesterday' },
  { label: '7 ngày qua', value: 'last7' },
  { label: 'Tháng này', value: 'thisMonth' },
  { label: 'Năm nay', value: 'thisYear' },
];

function getPresetRange(key: PresetKey): [dayjs.Dayjs, dayjs.Dayjs] {
  const today = dayjs();
  switch (key) {
    case 'today':
      return [today.startOf('day'), today.endOf('day')];
    case 'yesterday':
      return [today.subtract(1, 'day').startOf('day'), today.subtract(1, 'day').endOf('day')];
    case 'last7':
      return [today.subtract(6, 'day').startOf('day'), today.endOf('day')];
    case 'thisMonth':
      return [today.startOf('month'), today.endOf('day')];
    case 'thisYear':
      return [today.startOf('year'), today.endOf('day')];
  }
}

function getPresetLabel(key: PresetKey): string {
  return presetOptions.find((o) => o.value === key)?.label || '';
}

interface DashboardData {
  ordersPackedToday: number;
  ordersReturnedToday: number;
  videosToday: number;
  avgDuration: number;
  productBreakdown: {
    productId: string;
    productName: string;
    sku: string;
    totalDeducted: number;
    totalReturnedGood: number;
    totalReturnedBad: number;
  }[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<PresetKey | 'custom'>('today');
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const fetchData = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const res = await dashboardApi.today({ from, to });
      setData(res.data);
    } catch {
      message.error('Lỗi tải thống kê');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (preset !== 'custom') {
      const [start, end] = getPresetRange(preset);
      fetchData(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
    } else if (customRange?.[0] && customRange?.[1]) {
      fetchData(customRange[0].format('YYYY-MM-DD'), customRange[1].format('YYYY-MM-DD'));
    }
  }, [preset, customRange, fetchData]);

  const handlePresetChange = (value: PresetKey) => {
    setPreset(value);
    setCustomRange(null);
  };

  const handleCustomRange = (values: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setCustomRange(values);
    if (values?.[0] && values?.[1]) {
      setPreset('custom');
    }
  };

  const periodLabel = preset !== 'custom'
    ? getPresetLabel(preset)
    : customRange?.[0] && customRange?.[1]
      ? `${customRange[0].format('DD/MM/YYYY')} - ${customRange[1].format('DD/MM/YYYY')}`
      : '';

  const breakdownColumns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
    {
      title: 'Đã xuất',
      dataIndex: 'totalDeducted',
      key: 'totalDeducted',
      width: 90,
      align: 'center' as const,
      render: (v: number) => <span style={{ color: v > 0 ? '#1890ff' : undefined }}>{v}</span>,
    },
    {
      title: 'Hoàn tốt',
      dataIndex: 'totalReturnedGood',
      key: 'totalReturnedGood',
      width: 90,
      align: 'center' as const,
      render: (v: number) => <span style={{ color: v > 0 ? '#52c41a' : undefined }}>{v}</span>,
    },
    {
      title: 'Hoàn xấu',
      dataIndex: 'totalReturnedBad',
      key: 'totalReturnedBad',
      width: 90,
      align: 'center' as const,
      render: (v: number) => <span style={{ color: v > 0 ? '#ff4d4f' : undefined }}>{v}</span>,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Tổng quan</Title>
        </Col>
        <Col>
          <Space direction="vertical" size={8} align="end">
            <Radio.Group
              value={preset !== 'custom' ? preset : undefined}
              onChange={(e) => handlePresetChange(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
              options={presetOptions}
            />
            <RangePicker
              value={customRange}
              onChange={handleCustomRange}
              size="small"
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              style={{ width: 260 }}
            />
          </Space>
        </Col>
      </Row>

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
              title="Tổng video"
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

      <Card title={`Chi tiết sản phẩm — ${periodLabel}`} loading={loading}>
        <Table
          dataSource={data?.productBreakdown || []}
          columns={breakdownColumns}
          rowKey="productId"
          pagination={false}
          size="small"
          locale={{ emptyText: 'Chưa có dữ liệu' }}
        />
      </Card>
    </div>
  );
}
