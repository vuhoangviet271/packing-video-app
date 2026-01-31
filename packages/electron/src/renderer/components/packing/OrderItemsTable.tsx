import { Table, Tag } from 'antd';
import type { ExpandedOrderItem } from '@packing/shared';

interface OrderItemsTableProps {
  items: ExpandedOrderItem[];
  scanCounts: Record<string, number>;
}

function getScanStatus(item: ExpandedOrderItem, scanned: number) {
  if (scanned >= item.requiredQty) return 'complete';
  if (scanned > 0) return 'partial';
  return 'not_scanned';
}

const statusColors: Record<string, string> = {
  complete: 'green',
  partial: 'gold',
  not_scanned: 'default',
};

const statusLabels: Record<string, string> = {
  complete: 'Đủ',
  partial: 'Thiếu',
  not_scanned: 'Chưa quét',
};

export function OrderItemsTable({ items, scanCounts }: OrderItemsTableProps) {
  // Check for foreign scans
  const foreignEntries = Object.entries(scanCounts)
    .filter(([key]) => key.startsWith('FOREIGN:'))
    .map(([key, qty]) => ({
      productId: key,
      productName: 'Sản phẩm lạ',
      sku: key.replace('FOREIGN:', '').slice(0, 8),
      barcode: null,
      requiredQty: 0,
      isComboComponent: false,
      _scanned: qty,
      _isForeign: true,
    }));

  const dataSource = [
    ...items.map((item, idx) => ({
      key: item.productId + '-' + idx,
      ...item,
      _scanned: scanCounts[item.productId] || 0,
      _isForeign: false,
    })),
    ...foreignEntries.map((f, idx) => ({
      key: 'foreign-' + idx,
      ...f,
    })),
  ];

  const columns = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string, record: any) => (
        <div>
          <div>{name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.sku}
            {record.parentComboName && ` (combo: ${record.parentComboName})`}
          </div>
        </div>
      ),
    },
    {
      title: 'Cần',
      dataIndex: 'requiredQty',
      key: 'requiredQty',
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'Quét',
      dataIndex: '_scanned',
      key: '_scanned',
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        if (record._isForeign) {
          return <Tag color="red">Sản phẩm lạ</Tag>;
        }
        const status = getScanStatus(record, record._scanned);
        return <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>;
      },
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      style={{ marginTop: 8 }}
    />
  );
}
