import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Input, Select, DatePicker, Button, Row, Col, Typography, Space, Tag, message } from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { videoApi } from '../../services/api';
import type { VideoRecord, VideoType } from '@packing/shared';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface VideoListPageProps {
  type: VideoType;
}

export function VideoListPage({ type }: VideoListPageProps) {
  const [data, setData] = useState<VideoRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { type, page, limit };
      if (statusFilter) params.status = statusFilter;
      if (dateRange?.[0]) params.from = dateRange[0].format('YYYY-MM-DD');
      if (dateRange?.[1]) params.to = dateRange[1].format('YYYY-MM-DD');
      if (searchText) params.shippingCode = searchText;

      const res = await videoApi.list(params);
      setData(res.data.data);
      setTotal(res.data.total);
    } catch {
      message.error('Lỗi tải danh sách video');
    } finally {
      setLoading(false);
    }
  }, [type, page, limit, statusFilter, dateRange, searchText]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      const params: any = { type };
      if (statusFilter) params.status = statusFilter;
      if (dateRange?.[0]) params.from = dateRange[0].format('YYYY-MM-DD');
      if (dateRange?.[1]) params.to = dateRange[1].format('YYYY-MM-DD');

      const res = await videoApi.exportCsv(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `videos_${type.toLowerCase()}_${dayjs().format('YYYYMMDD')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Lỗi xuất CSV');
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 50,
      render: (_: any, __: any, idx: number) => (page - 1) * limit + idx + 1,
    },
    { title: 'Mã vận đơn', dataIndex: 'shippingCode', key: 'shippingCode' },
    {
      title: 'Nhân viên',
      key: 'staff',
      render: (_: any, r: VideoRecord) => r.staff?.fullName || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'COMPLETED' ? 'green' : 'red'}>
          {s === 'COMPLETED' ? 'Hoàn thành' : 'Lỗi'}
        </Tag>
      ),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (d: number) => `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`,
    },
    { title: 'Máy', dataIndex: 'machineName', key: 'machineName', width: 100 },
    {
      title: 'Ngày',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
    },
  ];

  return (
    <div>
      <Title level={4}>
        {type === 'PACKING' ? 'Danh sách video đóng hàng' : 'Danh sách video hàng hoàn'}
      </Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="Tìm mã vận đơn..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={() => { setPage(1); fetchData(); }}
                style={{ width: 220 }}
                allowClear
              />
              <Select
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                allowClear
                style={{ width: 140 }}
                options={[
                  { label: 'Hoàn thành', value: 'COMPLETED' },
                  { label: 'Lỗi', value: 'FAILED' },
                ]}
              />
              <RangePicker
                value={dateRange}
                onChange={(v) => { setDateRange(v); setPage(1); }}
              />
            </Space>
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Xuất CSV
            </Button>
          </Col>
        </Row>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: setPage,
            showTotal: (t) => `Tổng: ${t} video`,
          }}
        />
      </Card>
    </div>
  );
}
