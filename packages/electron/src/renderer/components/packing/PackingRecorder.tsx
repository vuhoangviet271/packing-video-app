import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Typography, Tag, Badge, Divider, Collapse, Input, Modal } from 'antd';
import { VideoCameraOutlined, WarningOutlined } from '@ant-design/icons';
import { CameraPreview } from '../camera/CameraPreview';
import { CameraSelector } from '../camera/CameraSelector';
import { OrderItemsTable } from './OrderItemsTable';
import { SessionCache } from './SessionCache';
import { DuplicateModal } from './DuplicateModal';
import { useRecordingSession } from '../../hooks/useRecordingSession';
import { useRecordingStore } from '../../stores/recording.store';
import { useCam1Stream } from '../../hooks/useCam1Stream';
import { useScannerGun } from '../../hooks/useScannerGun';

const { Title, Text } = Typography;

export function PackingRecorder() {
  const cam1Stream = useCam1Stream();
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);
  const [duplicateResolve, setDuplicateResolve] = useState<((v: boolean) => void) | null>(null);

  const handleDuplicateFound = useCallback(async (code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDuplicateCode(code);
      setDuplicateResolve(() => resolve);
    });
  }, []);

  const { isRecording, duration, stopManually, handleScannerInput, state, shippingCode, orderItems, scanCounts } =
    useRecordingSession({
      type: 'PACKING',
      cam1Stream,
      onDuplicateFound: handleDuplicateFound,
    });

  // Scanner gun integration
  useScannerGun({
    onScan: handleScannerInput,
    enabled: true,
  });

  // Keyboard shortcut: Escape to stop recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRecording) {
        e.preventDefault();
        stopManually();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, stopManually]);

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

      <Row gutter={16}>
        {/* Left: Camera preview */}
        <Col span={14}>
          <Card
            bodyStyle={{ padding: 0, position: 'relative' }}
            style={{ borderRadius: 8, overflow: 'hidden' }}
          >
            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
              <CameraPreview stream={cam1Stream} />
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
            </div>
          </Card>

          {/* Status bar */}
          <Card size="small" style={{ marginTop: 8 }}>
            <Row justify="space-between" align="middle" gutter={12}>
              <Col>
                Trạng thái:{' '}
                <Tag color={state === 'RECORDING' ? 'red' : state === 'SAVING' ? 'orange' : 'default'}>
                  {state === 'IDLE'
                    ? 'Chờ quét'
                    : state === 'RECORDING'
                      ? 'Đang quay'
                      : state === 'SAVING'
                        ? 'Đang lưu...'
                        : 'Kiểm tra trùng'}
                </Tag>
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
        </Col>

        {/* Right: Camera settings + session */}
        <Col span={10}>
          <Collapse
            defaultActiveKey={['camera']}
            items={[
              {
                key: 'camera',
                label: 'Cài đặt Camera',
                children: <CameraSelector />,
              },
            ]}
          />

          <Card title="Phiên làm việc" size="small" style={{ marginTop: 8 }}>
            <SessionCache type="PACKING" />
          </Card>
        </Col>
      </Row>

      {/* Order info - full width below */}
      <Card
        title={
          <span>
            <VideoCameraOutlined /> Thông tin đơn hàng
            {shippingCode && <span style={{ fontWeight: 'normal', marginLeft: 12 }}>MVD: {shippingCode}</span>}
          </span>
        }
        size="small"
        style={{ marginTop: 12 }}
      >
        {shippingCode ? (
          <OrderItemsTable items={orderItems} scanCounts={scanCounts} />
        ) : (
          <Text type="secondary">Quét QR hoặc nhập mã vận đơn để bắt đầu...</Text>
        )}
      </Card>

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
    </div>
  );
}
