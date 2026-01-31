import { Table, Tag, Select } from 'antd';
import type { ExpandedOrderItem } from '@packing/shared';

interface ReturnItemsTableProps {
  items: ExpandedOrderItem[];
  scanCounts: Record<string, number>;
}

export function ReturnItemsTable({ items, scanCounts }: ReturnItemsTableProps) {
  const dataSource = items.map((item, idx) => ({
    key: item.productId + '-' + idx,
    ...item,
    _scanned: scanCounts[item.productId] || 0,
  }));

  // Also show foreign scans
  const foreignEntries = Object.entries(scanCounts)
    .filter(([key]) => key.startsWith('FOREIGN:'))
    .map(([key, qty], idx) => ({
      key: 'foreign-' + idx,
      productId: key,
      productName: 'Sản phẩm lạ',
      sku: key.replace('FOREIGN:', '').slice(0, 8),
      barcode: null,
      requiredQty: 0,
      isComboComponent: false,
      _scanned: qty,
      _isForeign: true,
    }));

  const allData = [
    ...dataSource.map((d) => ({ ...d, _isForeign: false })),
    ...foreignEntries,
  ];

  const columns = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string, record: any) => (
        <div>
          <div>{name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.sku}</div>
        </div>
      ),
    },
    {
      title: 'SL quét',
      dataIndex: '_scanned',
      key: '_scanned',
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'Chất lượng',
      key: 'quality',
      width: 130,
      render: (_: any, record: any) => {
        if (record._isForeign) return <Tag color="red">Lạ</Tag>;
        if (record._scanned === 0) return <Tag>Chưa quét</Tag>;
        return (
          <Select
            size="small"
            defaultValue="GOOD"
            style={{ width: 110 }}
            options={[
              { label: 'Hoàn tốt', value: 'GOOD' },
              { label: 'Hoàn xấu', value: 'BAD' },
            ]}
          />
        );
      },
    },
  ];

  return (
    <Table
      dataSource={allData}
      columns={columns}
      pagination={false}
      size="small"
      style={{ marginTop: 8 }}
    />
  );
}
