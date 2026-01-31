import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Space, Typography, message, Tabs, Popconfirm, Tag,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { productApi } from '../../services/api';

const { Title } = Typography;

interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  isCombo: boolean;
  quantity: number;
  unsellableQty: number;
  components?: { component: { id: string; name: string; sku: string }; quantity: number }[];
}

export function InventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [form] = Form.useForm();
  const [comboForm] = Form.useForm();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.list();
      setProducts(res.data);
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

  const columns = [
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
            expandedRowRender: (record) =>
              record.isCombo && record.components ? (
                <div style={{ paddingLeft: 24 }}>
                  <strong>Thành phần combo:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                    {record.components.map((c) => (
                      <li key={c.component.id}>
                        {c.component.name} ({c.component.sku}) x {c.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            rowExpandable: (record) => record.isCombo,
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
          <Form.List name="components">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'componentId']}
                      rules={[{ required: true, message: 'Nhập ID sản phẩm' }]}
                    >
                      <Input placeholder="ID sản phẩm thành phần" style={{ width: 300 }} />
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
        onCancel={() => { setEditingProduct(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Lưu"
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="sku" label="SKU">
            <Input />
          </Form.Item>
          <Form.Item name="barcode" label="Barcode">
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên sản phẩm">
            <Input />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng tồn">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unsellableQty" label="Số lượng lỗi">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
