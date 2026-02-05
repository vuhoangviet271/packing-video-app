import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Space, Typography, message, Popconfirm, Tag, Select, Upload,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { productApi } from '../../services/api';

const { Title } = Typography;

const API_BASE_URL = localStorage.getItem('apiUrl') || 'https://pack.spotless.vn';

interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  imageUrl: string | null;
  isCombo: boolean;
  quantity: number;
  unsellableQty: number;
  components?: { component: { id: string; name: string; sku: string }; quantity: number }[];
  additionalBarcodes?: { id: string; barcode: string }[];
}

function ImageUploadField({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await productApi.uploadImage(file);
      const imageUrl = res.data.imageUrl;
      onChange?.(imageUrl);
      message.success('Upload thành công');
    } catch {
      message.error('Upload thất bại');
    } finally {
      setUploading(false);
    }
    return false; // prevent default upload
  };

  const fullUrl = value && value.startsWith('/') ? API_BASE_URL + value : value;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {fullUrl && (
        <img
          src={fullUrl}
          alt="product"
          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
        />
      )}
      <Upload
        showUploadList={false}
        accept="image/*"
        beforeUpload={(file) => { handleUpload(file as File); return false; }}
      >
        <Button icon={<UploadOutlined />} loading={uploading} size="small">
          {value ? 'Đổi ảnh' : 'Upload ảnh'}
        </Button>
      </Upload>
    </div>
  );
}

export function InventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [newBarcode, setNewBarcode] = useState('');
  const [addingBarcode, setAddingBarcode] = useState(false);
  const [form] = Form.useForm();
  const [comboForm] = Form.useForm();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.list();
      const items = res.data.data || res.data;
      setProducts(items.map((p: any) => ({ ...p, components: p.comboComponents })));
    } catch {
      message.error('Lỗi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddProduct = async (values: any) => {
    try {
      await productApi.create(values);
      message.success('Thêm sản phẩm thành công');
      setAddModalOpen(false);
      form.resetFields();
      fetchProducts();
    } catch {
      message.error('Lỗi thêm sản phẩm');
    }
  };

  const handleAddCombo = async (values: any) => {
    try {
      await productApi.createCombo(values);
      message.success('Thêm combo thành công');
      setComboModalOpen(false);
      comboForm.resetFields();
      fetchProducts();
    } catch {
      message.error('Lỗi thêm combo');
    }
  };

  const handleUpdate = async (values: any) => {
    if (!editingProduct) return;
    try {
      await productApi.update(editingProduct.id, values);
      message.success('Cập nhật thành công');
      setEditingProduct(null);
      form.resetFields();
      fetchProducts();
    } catch {
      message.error('Lỗi cập nhật');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await productApi.delete(id);
      message.success('Xóa thành công');
      fetchProducts();
    } catch {
      message.error('Lỗi xóa sản phẩm');
    }
  };

  const handleAddBarcode = async () => {
    if (!editingProduct || !newBarcode.trim()) return;
    setAddingBarcode(true);
    try {
      await productApi.addBarcode(editingProduct.id, newBarcode.trim());
      message.success('Thêm barcode thành công');
      setNewBarcode('');
      fetchProducts();
    } catch (err: any) {
      if (err.response?.status === 409) {
        message.error('Barcode đã tồn tại');
      } else {
        message.error('Lỗi thêm barcode');
      }
    } finally {
      setAddingBarcode(false);
    }
  };

  const handleDeleteBarcode = async (barcodeId: string) => {
    try {
      await productApi.deleteBarcode(barcodeId);
      message.success('Xóa barcode thành công');
      fetchProducts();
    } catch {
      message.error('Lỗi xóa barcode');
    }
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 60,
      render: (url: string | null) => {
        const fullUrl = url && url.startsWith('/') ? API_BASE_URL + url : url;
        return fullUrl ? (
          <img src={fullUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>-</div>
        );
      },
    },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, r: ProductRow) => (
        <div>
          <div>{name}</div>
          {r.isCombo && <Tag color="blue">Combo</Tag>}
        </div>
      ),
    },
    { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', width: 130, render: (v: string | null) => v || '-' },
    { title: 'Tồn kho', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'center' as const },
    { title: 'Lỗi', dataIndex: 'unsellableQty', key: 'unsellableQty', width: 60, align: 'center' as const },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, r: ProductRow) => (
        <Space>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingProduct(r);
              form.setFieldsValue(r);
            }}
          />
          <Popconfirm title="Xóa sản phẩm này?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Quản lý kho</Title>

      <Card
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
              Thêm sản phẩm
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => setComboModalOpen(true)}>
              Thêm combo
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 50, showTotal: (t) => `Tổng: ${t} sản phẩm` }}
          expandable={{
            expandedRowRender: (record) => {
              const hasCombo = record.isCombo && record.components;
              const hasBarcodes = record.additionalBarcodes && record.additionalBarcodes.length > 0;

              if (!hasCombo && !hasBarcodes) return null;

              return (
                <div style={{ paddingLeft: 24 }}>
                  {hasCombo && (
                    <>
                      <strong>Thành phần combo:</strong>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {record.components!.map((c) => (
                          <li key={c.component.id}>
                            {c.component.name} ({c.component.sku}) x {c.quantity}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {hasBarcodes && (
                    <>
                      <strong>Barcode phụ:</strong>
                      <div style={{ marginTop: 4 }}>
                        {record.additionalBarcodes!.map((bc) => (
                          <Tag key={bc.id} style={{ marginBottom: 4, fontFamily: 'monospace' }}>
                            {bc.barcode}
                          </Tag>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            },
            rowExpandable: (record) =>
              (record.isCombo && record.components && record.components.length > 0) ||
              (record.additionalBarcodes && record.additionalBarcodes.length > 0),
          }}
        />
      </Card>

      {/* Add single product modal */}
      <Modal
        title="Thêm sản phẩm"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Thêm"
      >
        <Form form={form} layout="vertical" onFinish={handleAddProduct}>
          <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="barcode" label="Barcode">
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="imageUrl" label="Ảnh sản phẩm">
            <ImageUploadField />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng tồn" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add combo modal */}
      <Modal
        title="Thêm combo"
        open={comboModalOpen}
        onCancel={() => { setComboModalOpen(false); comboForm.resetFields(); }}
        onOk={() => comboForm.submit()}
        okText="Thêm"
        width={600}
      >
        <Form form={comboForm} layout="vertical" onFinish={handleAddCombo}>
          <Form.Item name="sku" label="SKU combo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="barcode" label="Barcode combo">
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên combo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="imageUrl" label="Ảnh combo">
            <ImageUploadField />
          </Form.Item>
          <Form.List name="components">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'componentId']}
                      rules={[{ required: true, message: 'Chọn sản phẩm' }]}
                    >
                      <Select
                        placeholder="Chọn sản phẩm thành phần"
                        style={{ width: 300 }}
                        showSearch
                        optionFilterProp="label"
                        options={products
                          .filter((p) => !p.isCombo)
                          .map((p) => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'quantity']}
                      rules={[{ required: true }]}
                      initialValue={1}
                    >
                      <InputNumber min={1} placeholder="SL" />
                    </Form.Item>
                    <Button type="text" danger onClick={() => remove(field.name)}>
                      Xóa
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Thêm thành phần
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Edit product modal */}
      <Modal
        title="Sửa sản phẩm"
        open={!!editingProduct}
        onCancel={() => { setEditingProduct(null); form.resetFields(); setNewBarcode(''); }}
        onOk={() => form.submit()}
        okText="Lưu"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="sku" label="SKU">
            <Input />
          </Form.Item>
          <Form.Item name="barcode" label="Barcode chính">
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên sản phẩm">
            <Input />
          </Form.Item>
          <Form.Item name="imageUrl" label="Ảnh sản phẩm">
            <ImageUploadField />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng tồn">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unsellableQty" label="Số lượng lỗi">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {/* Additional Barcodes Section */}
          <Form.Item label="Barcode phụ">
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12 }}>
              {editingProduct?.additionalBarcodes && editingProduct.additionalBarcodes.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  {editingProduct.additionalBarcodes.map((bc) => (
                    <div
                      key={bc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        background: '#f5f5f5',
                        borderRadius: 4,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontFamily: 'monospace' }}>{bc.barcode}</span>
                      <Popconfirm title="Xóa barcode này?" onConfirm={() => handleDeleteBarcode(bc.id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#999', marginBottom: 12, fontSize: 13 }}>Chưa có barcode phụ</div>
              )}
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Nhập barcode mới"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  onPressEnter={handleAddBarcode}
                />
                <Button type="primary" onClick={handleAddBarcode} loading={addingBarcode}>
                  Thêm
                </Button>
              </Space.Compact>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
