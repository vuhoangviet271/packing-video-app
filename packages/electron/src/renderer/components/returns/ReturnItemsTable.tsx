import { Table, Tag, Button, Segmented } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ReturnScanEntry } from '../../stores/recording.store';

interface ReturnItemsTableProps {
  entries: ReturnScanEntry[];
  onQualityChange: (entryId: string, quality: 'GOOD' | 'BAD') => void;
  onRemove: (entryId: string) => void;
}

export function ReturnItemsTable({ entries, onQualityChange, onRemove }: ReturnItemsTableProps) {
  const dataSource = entries.map((entry, idx) => ({
    key: entry.id,
    idx: idx + 1,
    ...entry,
  }));

  const columns = [
    {
      title: '#',
      dataIndex: 'idx',
      key: 'idx',
      width: 40,
      align: 'center' as const,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.imageUrl ? (
            <img
              src={record.imageUrl}
              alt={name}
              style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                background: '#f5f5f5',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
                color: '#ccc',
              }}
            >
              📦
            </div>
          )}
          <div>
            <div>{name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.sku}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Chất lượng',
      key: 'quality',
      width: 180,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Segmented
          size="small"
          value={record.quality}
          onChange={(val) => onQualityChange(record.id, val as 'GOOD' | 'BAD')}
          options={[
            { label: 'Hoàn tốt', value: 'GOOD' },
            { label: 'Hoàn xấu', value: 'BAD' },
          ]}
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 40,
      render: (_: any, record: any) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(record.id)}
        />
      ),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      style={{ marginTop: 8, maxHeight: 400, overflow: 'auto' }}
      locale={{ emptyText: 'Quét barcode sản phẩm hoàn...' }}
    />
  );
}
