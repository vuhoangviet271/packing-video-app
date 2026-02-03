import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Table, Typography, Tag, message, DatePicker, Input, Select, Row, Col, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { inventoryApi } from '../../services/api';
import dayjs, { Dayjs } from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface InventoryLog {
  id: string;
  action: string;
  quantity: number;
  reference: string | null;
  createdAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    barcode: string | null;
  };
}

interface Filters {
  dateRange: [Dayjs, Dayjs] | null;
  search: string;
  action: string | undefined;
}

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'PACKING_DEDUCT', label: 'Đóng hàng' },
  { value: 'RETURN_GOOD', label: 'Hoàn tốt' },
  { value: 'RETURN_BAD', label: 'Hoàn xấu' },
  { value: 'MANUAL_ADJUST', label: 'Điều chỉnh' },
];

export function InventoryLogPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [filters, setFilters] = useState<Filters>({
    dateRange: null,
    search: '',
    action: undefined,
  });
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchLogs = useCallback(async (page: number, limit: number, currentFilters: Filters) => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (currentFilters.dateRange) {
        params.from = currentFilters.dateRange[0].format('YYYY-MM-DD');
        params.to = currentFilters.dateRange[1].format('YYYY-MM-DD');
      }
      if (currentFilters.search.trim()) {
        params.search = currentFilters.search.trim();
      }
      if (currentFilters.action) {
        params.action = currentFilters.action;
      }

      const res = await inventoryApi.getLogs(params);
      setLogs(res.data.transactions);
      setPagination({
        current: res.data.page,
        pageSize: res.data.limit,
        total: res.data.total,
      });
    } catch (err) {
      message.error('Lỗi tải lịch sử kho');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1, 50, filters);
  }, []);

  const handleTableChange = (newPagination: any) => {
    fetchLogs(newPagination.current, newPagination.pageSize, filters);
  };

  const handleDateChange = (dates: [Dayjs, Dayjs] | null) => {
    const newFilters = { ...filters, dateRange: dates };
    setFilters(newFilters);
    fetchLogs(1, pagination.pageSize, newFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, search: value }));

    // Debounce search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchLogs(1, pagination.pageSize, { ...filters, search: value });
    }, 500);
  };

  const handleActionChange = (value: string) => {
    const newFilters = { ...filters, action: value || undefined };
    setFilters(newFilters);
    fetchLogs(1, pagination.pageSize, newFilters);
  };

  const handleReset = () => {
    const resetFilters: Filters = { dateRange: null, search: '', action: undefined };
    setFilters(resetFilters);
    fetchLogs(1, pagination.pageSize, resetFilters);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'PACKING_DEDUCT':
        return 'red';
      case 'RETURN_GOOD':
        return 'green';
      case 'RETURN_BAD':
        return 'orange';
      case 'MANUAL_ADJUST':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'PACKING_DEDUCT':
        return 'Đóng hàng';
      case 'RETURN_GOOD':
        return 'Hoàn tốt';
      case 'RETURN_BAD':
        return 'Hoàn xấu';
      case 'MANUAL_ADJUST':
        return 'Điều chỉnh';
      default:
        return action;
    }
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => (
        <Tag color={getActionColor(action)}>{getActionLabel(action)}</Tag>
      ),
    },
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_: any, record: InventoryLog) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.product.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>SKU: {record.product.sku}</div>
        </div>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right' as const,
      render: (qty: number) => (
        <span style={{ color: qty >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
          {qty >= 0 ? '+' : ''}{qty}
        </span>
      ),
    },
    {
      title: 'Tham chiếu',
      dataIndex: 'reference',
      key: 'reference',
      width: 150,
      render: (ref: string | null) => ref || '-',
    },
  ];

  return (
    <div>
      <Title level={4}>Lịch sử kho</Title>
      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleDateChange(dates as [Dayjs, Dayjs] | null)}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              allowClear
            />
          </Col>
          <Col>
            <Input
              placeholder="Tìm SKU hoặc mã vận đơn..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={handleSearchChange}
              style={{ width: 250 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              value={filters.action || ''}
              onChange={handleActionChange}
              style={{ width: 150 }}
              options={ACTION_OPTIONS}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Xóa lọc
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          size="small"
        />
      </Card>
    </div>
  );
}
