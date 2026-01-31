import { Select, Typography, Space } from 'antd';
import { useCameraDevices } from '../../hooks/useCameraDevices';
import { useCameraStore } from '../../stores/camera.store';

const { Text } = Typography;

export function CameraSelector() {
  const devices = useCameraDevices();
  const { cam1DeviceId, cam2DeviceId, cam3DeviceId, setCam1, setCam2, setCam3 } = useCameraStore();

  const options = devices.map((d) => ({ label: d.label || d.deviceId.slice(0, 12), value: d.deviceId }));

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div>
        <Text strong>Cam 1 - Quay video:</Text>
        <Select
          style={{ width: '100%' }}
          placeholder="Chọn camera quay video"
          value={cam1DeviceId || undefined}
          onChange={setCam1}
          options={options}
          allowClear
        />
      </div>
      <div>
        <Text strong>Cam 2 - Đọc QR:</Text>
        <Select
          style={{ width: '100%' }}
          placeholder="Chọn camera QR"
          value={cam2DeviceId || undefined}
          onChange={setCam2}
          options={options}
          allowClear
        />
      </div>
      <div>
        <Text strong>Cam 3 - Đọc barcode:</Text>
        <Select
          style={{ width: '100%' }}
          placeholder="Chọn camera barcode"
          value={cam3DeviceId || undefined}
          onChange={setCam3}
          options={options}
          allowClear
        />
      </div>
    </Space>
  );
}
