import { Table, Tag } from 'antd';
import type { ExpandedOrderItem } from '@packing/shared';
import { useProductCacheStore } from '../../stores/product-cache.store';

interface OrderItemsTableProps {
  items: ExpandedOrderItem[];
  scanCounts: Record<string, number>;
  maxRows?: number; // Default 4 - số hàng hiển thị tối đa
}

function getScanStatus(item: ExpandedOrderItem, scanned: number) {
  if (scanned > item.requiredQty) return 'excess';
  if (scanned === item.requiredQty) return 'complete';
  if (scanned > 0) return 'partial';
  return 'not_scanned';
}

// Sort items: completed items go to bottom
function sortItems(items: any[]): any[] {
  return [...items].sort((a, b) => {
    const aScanned = a._scanned;
    const aRequired = a.requiredQty;
    const bScanned = b._scanned;
    const bRequired = b.requiredQty;

    const aComplete = aScanned === aRequired && aScanned > 0;
    const bComplete = bScanned === bRequired && bScanned > 0;

    // Completed items go to bottom
    if (aComplete && !bComplete) return 1;
    if (!aComplete && bComplete) return -1;

    // Within non-completed or within completed: maintain original order
    return 0;
  });
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

export function OrderItemsTable({ items, scanCounts, maxRows = 4 }: OrderItemsTableProps) {
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

  // Row className based on scan status
  const getRowClassName = (record: any) => {
    if (record._isForeign) {
      return 'row-foreign'; // Red background
    }

    const scanned = record._scanned;
    const required = record.requiredQty;

    if (scanned > required) {
      return 'row-excess'; // Red background
    } else if (scanned === required && scanned > 0) {
      return 'row-complete'; // Green background
    } else if (scanned > 0 && scanned < required) {
      return 'row-partial'; // Yellow background
    }

    return ''; // White/default background
  };

  // Build and sort data source
  const baseDataSource = [
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

  // Sort: completed items go to bottom
  const dataSource = sortItems(baseDataSource);

  // Calculate scroll height based on maxRows
  const ROW_HEIGHT = 100; // Approximate height per row (with image)
  const HEADER_HEIGHT = 40;
  const scrollY = maxRows > 0 ? ROW_HEIGHT * maxRows : undefined;

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
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
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
    <>
      <style>{`
        .row-complete {
          background-color: #f6ffed !important;
        }

        .row-complete:hover {
          background-color: #d9f7be !important;
        }

        .row-partial {
          background-color: #fffbe6 !important;
        }

        .row-partial:hover {
          background-color: #fff1b8 !important;
        }

        .row-excess,
        .row-foreign {
          background-color: #fff2f0 !important;
        }

        .row-excess:hover,
        .row-foreign:hover {
          background-color: #ffccc7 !important;
        }
      `}</style>

      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        style={{ marginTop: 8 }}
        rowClassName={getRowClassName}
        scroll={scrollY ? { y: scrollY } : undefined}
      />
    </>
  );
}
