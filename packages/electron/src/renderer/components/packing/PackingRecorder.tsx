import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Typography, Tag, Badge, Divider, Collapse, Input, Modal, Button, Table, Switch, Space } from 'antd';
import { VideoCameraOutlined, WarningOutlined, EyeOutlined, EyeInvisibleOutlined, ExperimentOutlined } from '@ant-design/icons';
import { CameraPreview } from '../camera/CameraPreview';
import { CameraSelector } from '../camera/CameraSelector';
import { OrderItemsTable } from './OrderItemsTable';
import { SessionCache } from './SessionCache';
import { DuplicateModal } from './DuplicateModal';
import { useRecordingSession } from '../../hooks/useRecordingSession';
import { useRecordingStore } from '../../stores/recording.store';
import { useCameraStore } from '../../stores/camera.store';
import { useSettingsStore } from '../../stores/settings.store';
import { useCam1Stream } from '../../hooks/useCam1Stream';
import { useScannerGun } from '../../hooks/useScannerGun';
import { useRotatedStream } from '../../hooks/useRotatedStream';

const { Title, Text } = Typography;

interface MissingItem {
  productName: string;
  sku: string;
  required: number;
  scanned: number;
  missing: number;
}

export function PackingRecorder() {
  const cam1StreamRaw = useCam1Stream();
  const { cam2DeviceId, cam1Rotation, cam2Rotation } = useCameraStore();
  const { demoMode, setDemoMode } = useSettingsStore();
  const cam1Stream = useRotatedStream({ stream: cam1StreamRaw, rotation: cam1Rotation });
  const [showCam2, setShowCam2] = useState(true);
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);
  const [duplicateResolve, setDuplicateResolve] = useState<((v: boolean) => void) | null>(null);
  const [incompleteModalOpen, setIncompleteModalOpen] = useState(false);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);

  const handleDuplicateFound = useCallback(async (code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDuplicateCode(code);
      setDuplicateResolve(() => resolve);
    });
  }, []);

  const handleIncompleteOrder = useCallback((items: MissingItem[]) => {
    setMissingItems(items);
    setIncompleteModalOpen(true);
  }, []);

  const { isRecording, duration, stopManually, handleScannerInput, qrVideoRef, state, shippingCode, orderItems, scanCounts, checkOrderComplete } =
    useRecordingSession({
      type: 'PACKING',
      cam1Stream,
      onDuplicateFound: handleDuplicateFound,
      onIncompleteOrder: handleIncompleteOrder,
    });

  // Scanner gun integration
  useScannerGun({
    onScan: handleScannerInput,
    enabled: true,
  });

  // Keyboard shortcut: Escape to stop recording
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      console.log('[PackingRecorder] Key pressed:', e.key, 'isRecording:', isRecording);
      if (e.key === 'Escape' && isRecording) {
        e.preventDefault();
        console.log('[PackingRecorder] Escape pressed while recording');

        // Validate before stopping
        const { complete, missingItems: items } = checkOrderComplete();
        console.log('[PackingRecorder] checkOrderComplete result:', { complete, missingItems: items });

        if (!complete) {
          setMissingItems(items);
          setIncompleteModalOpen(true);
          return; // Block ESC
        }

        console.log('[PackingRecorder] Calling stopManually...');
        await stopManually();
        console.log('[PackingRecorder] stopManually completed');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, stopManually, checkOrderComplete]);

  // Foreign/excess product alert
  const foreignAlert = useRecordingStore((s) => s.foreignAlert);
  const dismissForeignAlert = useCallback(() => {
    useRecordingStore.getState().setForeignAlert(null);
  }, []);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      <Title level={4}>Đóng hàng - Quay video</Title>

      <Row gutter={16} style={{ height: 'calc(100vh - 140px)' }}>
        {/* Left: Camera preview */}
        <Col span={14} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            bodyStyle={{ padding: 0, position: 'relative', height: '100%', display: 'flex' }}
            style={{ borderRadius: 8, overflow: 'hidden', flex: 1, minHeight: 0 }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CameraPreview stream={cam1Stream} rotation={0} />
              {/* Recording indicator */}
              {isRecording && (
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(0,0,0,0.6)',
                    padding: '4px 12px',
                    borderRadius: 20,
                  }}
                >
                  <Badge status="processing" color="red" />
                  <Text style={{ color: '#fff', fontFamily: 'monospace', fontSize: 16 }}>
                    REC {formatDuration(duration)}
                  </Text>
                </div>
              )}
              {/* Shipping code overlay */}
              {shippingCode && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    background: 'rgba(0,0,0,0.6)',
                    padding: '4px 12px',
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#fff' }}>MVD: {shippingCode}</Text>
                </div>
              )}
              {/* Cam 2 overlay - góc trên phải (chỉ hiện khi đã chọn cam 2) */}
              {cam2DeviceId && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: '20%',
                      aspectRatio: '1',
                      background: '#000',
                      borderRadius: 6,
                      overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.5)',
                      zIndex: 10,
                      display: showCam2 ? 'block' : 'none',
                    }}
                  >
                    <video
                      ref={qrVideoRef}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `rotate(${cam2Rotation}deg)` }}
                    />
                  </div>
                  <Button
                    size="small"
                    icon={showCam2 ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setShowCam2(!showCam2)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: showCam2 ? 'calc(20% + 16px)' : 8,
                      zIndex: 11,
                      opacity: 0.8,
                    }}
                  >
                    Cam 2
                  </Button>
                </>
              )}
              {/* Hidden video element for QR scanner when cam2 not shown */}
              {!cam2DeviceId && (
                <video ref={qrVideoRef} style={{ display: 'none' }} />
              )}
            </div>
          </Card>

          {/* Status bar */}
          <Card size="small" style={{ marginTop: 8, flex: '0 0 auto' }}>
            <Row justify="space-between" align="middle" gutter={12}>
              <Col>
                <Space>
                  <span>Trạng thái:</span>
                  <Tag color={state === 'RECORDING' ? 'red' : state === 'SAVING' ? 'orange' : 'default'}>
                    {state === 'IDLE'
                      ? 'Chờ quét'
                      : state === 'RECORDING'
                        ? 'Đang quay'
                        : state === 'SAVING'
                          ? 'Đang lưu...'
                          : 'Kiểm tra trùng'}
                  </Tag>
                  <Divider type="vertical" />
                  <Space size="small">
                    <ExperimentOutlined style={{ color: demoMode ? '#ff4d4f' : '#999' }} />
                    <Switch
                      size="small"
                      checked={demoMode}
                      onChange={setDemoMode}
                      disabled={state !== 'IDLE'}
                    />
                    <Text type={demoMode ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                      {demoMode ? 'Demo Mode' : 'Normal'}
                    </Text>
                  </Space>
                </Space>
              </Col>
              <Col flex="auto">
                {state === 'IDLE' && (
                  <Input.Search
                    placeholder="Nhập mã vận đơn..."
                    enterButton="Bắt đầu"
                    size="small"
                    onSearch={(value) => {
                      if (value.trim()) handleScannerInput(value.trim());
                    }}
                  />
                )}
                {state === 'RECORDING' && (
                  <Text type="secondary">Nhấn Escape để dừng quay</Text>
                )}
              </Col>
            </Row>
          </Card>

          {/* Order info - fixed height for 4 products */}
          <Card
            title={
              <span>
                <VideoCameraOutlined /> Thông tin đơn hàng
                {shippingCode && <span style={{ fontWeight: 'normal', marginLeft: 12 }}>MVD: {shippingCode}</span>}
              </span>
            }
            size="small"
            style={{
              marginTop: 12,
              flex: '0 0 auto',
              maxHeight: '480px',
            }}
            bodyStyle={{
              maxHeight: '440px',
              overflowY: 'auto'
            }}
          >
            {shippingCode ? (
              <>
                {orderItems.length === 0 && (
                  <div style={{ marginBottom: 8, padding: '8px 12px', background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
                    <Text type="secondary">
                      <strong>Vận đơn lạ</strong> - Không tìm thấy thông tin đơn hàng. Quét sản phẩm để thêm vào danh sách.
                    </Text>
                  </div>
                )}
                <OrderItemsTable items={orderItems} scanCounts={scanCounts} maxRows={4} />
              </>
            ) : (
              <Text type="secondary">Quét QR hoặc nhập mã vận đơn để bắt đầu...</Text>
            )}
          </Card>
        </Col>

        {/* Right: Camera settings + session */}
        <Col span={10}>
          <Collapse
            activeKey={state === 'IDLE' ? ['camera'] : []}
            items={[
              {
                key: 'camera',
                label: 'Cài đặt Camera',
                children: <CameraSelector disabled={state !== 'IDLE'} />,
                collapsible: state !== 'IDLE' ? 'disabled' : undefined,
              },
            ]}
          />

          <Card title="Phiên làm việc" size="small" style={{ marginTop: 8 }} bodyStyle={{ maxHeight: 480, overflowY: 'auto' }}>
            <SessionCache type="PACKING" />
          </Card>
        </Col>
      </Row>

      <DuplicateModal
        open={!!duplicateCode}
        shippingCode={duplicateCode || ''}
        onConfirm={() => {
          duplicateResolve?.(true);
          setDuplicateCode(null);
          setDuplicateResolve(null);
        }}
        onCancel={() => {
          duplicateResolve?.(false);
          setDuplicateCode(null);
          setDuplicateResolve(null);
        }}
      />

      <Modal
        open={!!foreignAlert}
        onOk={dismissForeignAlert}
        onCancel={dismissForeignAlert}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="OK"
        centered
        title={
          <span style={{ color: '#ff4d4f' }}>
            <WarningOutlined /> {foreignAlert?.reason === 'excess' ? 'Sản phẩm quét thừa!' : 'Sản phẩm lạ!'}
          </span>
        }
      >
        <div style={{ fontSize: 16, padding: '12px 0' }}>
          <p style={{ margin: '0 0 8px' }}>
            <strong>{foreignAlert?.productName}</strong>
            <span style={{ color: '#999', marginLeft: 8 }}>({foreignAlert?.sku})</span>
          </p>
          <p style={{ margin: 0, color: '#ff4d4f', fontWeight: 500 }}>
            {foreignAlert?.reason === 'excess'
              ? 'Sản phẩm này đã quét đủ số lượng. Hãy bỏ ra khỏi hộp!'
              : 'Sản phẩm này không thuộc đơn hàng. Hãy bỏ ra khỏi hộp!'}
          </p>
        </div>
      </Modal>

      <Modal
        title={
          <span style={{ color: '#ff4d4f' }}>
            ⚠️ Đơn hàng chưa quét đủ
          </span>
        }
        open={incompleteModalOpen}
        onCancel={() => setIncompleteModalOpen(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setIncompleteModalOpen(false)}>
            Đã hiểu
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
            Không thể kết thúc ghi hình. Các sản phẩm sau chưa được quét đủ:
          </p>
        </div>

        <Table
          dataSource={missingItems.map((item, idx) => ({ ...item, key: idx }))}
          columns={[
            {
              title: 'Sản phẩm',
              dataIndex: 'productName',
              key: 'productName',
              render: (name: string, record: MissingItem) => (
                <div>
                  <div style={{ fontWeight: 'bold' }}>{name}</div>
                  <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
                    SKU: {record.sku}
                  </div>
                </div>
              )
            },
            {
              title: 'Cần quét',
              dataIndex: 'required',
              key: 'required',
              align: 'center' as const,
              width: 100
            },
            {
              title: 'Đã quét',
              dataIndex: 'scanned',
              key: 'scanned',
              align: 'center' as const,
              width: 100
            },
            {
              title: 'Còn thiếu',
              dataIndex: 'missing',
              key: 'missing',
              align: 'center' as const,
              width: 100,
              render: (missing: number) => (
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  {missing}
                </span>
              )
            }
          ]}
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
}
