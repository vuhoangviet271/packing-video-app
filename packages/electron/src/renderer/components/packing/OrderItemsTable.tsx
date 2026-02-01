import { Table, Tag } from 'antd';
import type { ExpandedOrderItem } from '@packing/shared';
import { useProductCacheStore } from '../../stores/product-cache.store';

interface OrderItemsTableProps {
  items: ExpandedOrderItem[];
  scanCounts: Record<string, number>;
}

function getScanStatus(item: ExpandedOrderItem, scanned: number) {
  if (scanned > item.requiredQty) return 'excess';
  if (scanned === item.requiredQty) return 'complete';
  if (scanned > 0) return 'partial';
  return 'not_scanned';
}

const statusColors: Record<string, string> = {
  excess: 'red',
  complete: 'green',
  partial: 'gold',
  not_scanned: 'default',
};

const statusLabels: Record<string, string> = {
  excess: 'Thừa',
  complete: 'Đủ',
  partial: 'Thiếu',
  not_scanned: 'Chưa quét',
};

export function OrderItemsTable({ items, scanCounts }: OrderItemsTableProps) {
  // Check for foreign scans — tra tên SP từ product cache
  const productCache = useProductCacheStore();
  const foreignEntries = Object.entries(scanCounts)
    .filter(([key]) => key.startsWith('FOREIGN:'))
    .map(([key, qty]) => {
      const realProductId = key.replace('FOREIGN:', '');
      const cachedProducts = productCache.products;
      const product = cachedProducts.find((p) => p.id === realProductId);
      return {
        productId: key,
        productName: product?.name || 'Sản phẩm lạ',
        sku: product?.sku || realProductId.slice(0, 8),
        barcode: product?.barcode || null,
        imageUrl: product?.imageUrl || null,
        requiredQty: 0,
        isComboComponent: false,
        _scanned: qty,
        _isForeign: true,
      };
    });

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.imageUrl ? (
            <img
              src={record.imageUrl}
              alt={name}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                background: '#f5f5f5',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 18,
                color: '#ccc',
              }}
            >
              📦
            </div>
          )}
          <div>
            <div>{name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {record.sku}
              {record.parentComboName && ` (combo: ${record.parentComboName})`}
            </div>
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
