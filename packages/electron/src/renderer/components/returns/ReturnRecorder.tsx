import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Typography, Tag, Badge, Collapse, Input, Button } from 'antd';
import { RollbackOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { CameraPreview } from '../camera/CameraPreview';
import { CameraSelector } from '../camera/CameraSelector';
import { ReturnItemsTable } from './ReturnItemsTable';
import { SessionCache } from '../packing/SessionCache';
import { DuplicateModal } from '../packing/DuplicateModal';
import { useRecordingSession } from '../../hooks/useRecordingSession';
import { useRecordingStore } from '../../stores/recording.store';
import { useCameraStore } from '../../stores/camera.store';
import { useCam1Stream } from '../../hooks/useCam1Stream';
import { useScannerGun } from '../../hooks/useScannerGun';
import { useRotatedStream } from '../../hooks/useRotatedStream';

const { Title, Text } = Typography;

export function ReturnRecorder() {
  const cam1StreamRaw = useCam1Stream();
  const { cam2DeviceId, cam1Rotation, cam2Rotation } = useCameraStore();
  const cam1Stream = useRotatedStream({ stream: cam1StreamRaw, rotation: cam1Rotation });
  const [showCam2, setShowCam2] = useState(true);
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);
  const [duplicateResolve, setDuplicateResolve] = useState<((v: boolean) => void) | null>(null);

  const handleDuplicateFound = useCallback(async (code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDuplicateCode(code);
      setDuplicateResolve(() => resolve);
    });
  }, []);

  const { isRecording, duration, stopManually, handleScannerInput, qrVideoRef, state, shippingCode, returnScanEntries } =
    useRecordingSession({
      type: 'RETURN',
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

  const handleQualityChange = useCallback((entryId: string, quality: 'GOOD' | 'BAD') => {
    useRecordingStore.getState().updateReturnEntryQuality(entryId, quality);
  }, []);

  const handleRemoveEntry = useCallback((entryId: string) => {
    useRecordingStore.getState().removeReturnScanEntry(entryId);
  }, []);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      <Title level={4}>Nhập hàng hoàn - Quay video</Title>

      <Row gutter={16}>
        <Col span={14}>
          <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
              <CameraPreview stream={cam1Stream} rotation={0} />
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
              {!cam2DeviceId && (
                <video ref={qrVideoRef} style={{ display: 'none' }} />
              )}
            </div>
          </Card>

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

          {/* Return items - same width as video */}
          <Card
            title={
              <span>
                <RollbackOutlined /> Sản phẩm hoàn
                {shippingCode && <span style={{ fontWeight: 'normal', marginLeft: 12 }}>MVD: {shippingCode}</span>}
                {returnScanEntries.length > 0 && (
                  <Tag style={{ marginLeft: 8 }}>{returnScanEntries.length} sản phẩm</Tag>
                )}
              </span>
            }
            size="small"
            style={{ marginTop: 12 }}
          >
            {shippingCode ? (
              <ReturnItemsTable
                entries={returnScanEntries}
                onQualityChange={handleQualityChange}
                onRemove={handleRemoveEntry}
              />
            ) : (
              <Text type="secondary">Quét QR hoặc nhập mã vận đơn để bắt đầu...</Text>
            )}
          </Card>
        </Col>

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
