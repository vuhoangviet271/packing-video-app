import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Typography, Tag, Badge, Divider, Collapse } from 'antd';
import { RollbackOutlined } from '@ant-design/icons';
import { CameraPreview } from '../camera/CameraPreview';
import { CameraSelector } from '../camera/CameraSelector';
import { ReturnItemsTable } from './ReturnItemsTable';
import { SessionCache } from '../packing/SessionCache';
import { DuplicateModal } from '../packing/DuplicateModal';
import { useRecordingSession } from '../../hooks/useRecordingSession';
import { useCam1Stream } from '../../hooks/useCam1Stream';

const { Title, Text } = Typography;

export function ReturnRecorder() {
  const cam1Stream = useCam1Stream();
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);
  const [duplicateResolve, setDuplicateResolve] = useState<((v: boolean) => void) | null>(null);

  const handleDuplicateFound = useCallback(async (code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDuplicateCode(code);
      setDuplicateResolve(() => resolve);
    });
  }, []);

  const { isRecording, duration, stopManually, state, shippingCode, orderItems, scanCounts } =
    useRecordingSession({
      type: 'RETURN',
      cam1Stream,
      onDuplicateFound: handleDuplicateFound,
    });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && isRecording) {
        e.preventDefault();
        stopManually();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, stopManually]);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      <Title level={4}>Nhập hàng hoàn - Quay video</Title>

      <Row gutter={16}>
        <Col span={14}>
          <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
              <CameraPreview stream={cam1Stream} />
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

          <Card size="small" style={{ marginTop: 8 }}>
            <Row justify="space-between" align="middle">
              <Col>
                Trạng thái:{' '}
                <Tag color={state === 'RECORDING' ? 'red' : state === 'SAVING' ? 'orange' : 'default'}>
                  {state === 'IDLE'
                    ? 'Chờ QR'
                    : state === 'RECORDING'
                      ? 'Đang quay'
                      : state === 'SAVING'
                        ? 'Đang lưu...'
                        : 'Kiểm tra trùng'}
                </Tag>
              </Col>
              <Col>
                <Text type="secondary">Nhấn Enter/Space để dừng quay</Text>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={
              <span>
                <RollbackOutlined /> Thông tin hàng hoàn
              </span>
            }
            size="small"
          >
            {shippingCode ? (
              <>
                <Text strong>Mã vận đơn: </Text>
                <Text>{shippingCode}</Text>
                <ReturnItemsTable items={orderItems} scanCounts={scanCounts} />
              </>
            ) : (
              <Text type="secondary">Quét QR mã vận đơn để bắt đầu...</Text>
            )}
          </Card>

          <Collapse
            style={{ marginTop: 8 }}
            defaultActiveKey={['camera']}
            items={[
              {
                key: 'camera',
                label: 'Cài đặt Camera',
                children: <CameraSelector />,
              },
            ]}
          />

          <Divider style={{ margin: '12px 0' }} />

          <Card title="Phiên làm việc" size="small">
            <SessionCache type="RETURN" />
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
    </div>
  );
}
