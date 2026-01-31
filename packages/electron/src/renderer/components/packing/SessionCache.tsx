import { useMemo } from 'react';
import { Table, Tag } from 'antd';
import { useSessionStore } from '../../stores/session.store';

interface SessionCacheProps {
  type: 'PACKING' | 'RETURN';
}

export function SessionCache({ type }: SessionCacheProps) {
  const allEntries = useSessionStore((s) => s.entries);
  const entries = useMemo(() => allEntries.filter((e) => e.type === type), [allEntries, type]);

  const columns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 50 },
    { title: 'Mã vận đơn', dataIndex: 'shippingCode', key: 'shippingCode' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : 'red'}>
          {status === 'completed' ? 'Thành công' : 'Lỗi'}
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
    { title: 'Giờ', dataIndex: 'time', key: 'time', width: 80 },
  ];

  return (
    <Table
      dataSource={entries}
      columns={columns}
      rowKey="stt"
      pagination={false}
      size="small"
      locale={{ emptyText: 'Chưa có video nào trong phiên này' }}
    />
  );
}
