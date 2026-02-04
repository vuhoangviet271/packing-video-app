import { useState, useEffect } from 'react';
import { Select, Typography, Space, Input, message } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { useCameraDevices } from '../../hooks/useCameraDevices';
import { useCameraStore } from '../../stores/camera.store';

const { Text } = Typography;

interface CameraSelectorProps {
  disabled?: boolean;
}

export function CameraSelector({ disabled = false }: CameraSelectorProps) {
  const devices = useCameraDevices();
  const { cam1DeviceId, cam2DeviceId, cam1Rotation, cam2Rotation, setCam1, setCam2, setCam1Rotation, setCam2Rotation } = useCameraStore();
  const [videoDir, setVideoDir] = useState<string>('');

  useEffect(() => {
    window.electronAPI.getVideoDir().then(setVideoDir);
  }, []);

  const handleSelectDir = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) {
      try {
        await window.electronAPI.setVideoDir(dir);
        setVideoDir(dir);
      } catch {
        message.error('Không có quyền ghi vào thư mục này. Vui lòng chọn thư mục khác.');
      }
    }
  };

  const options = devices.map((d) => ({ label: d.label || d.deviceId.slice(0, 12), value: d.deviceId }));
  const rotationOptions = [
    { label: '0°', value: 0 },
    { label: '90°', value: 90 },
    { label: '180°', value: 180 },
    { label: '270°', value: 270 },
  ];

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
          disabled={disabled}
        />
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Xoay camera: </Text>
          <Select
            size="small"
            style={{ width: 100 }}
            value={cam1Rotation}
            onChange={setCam1Rotation}
            options={rotationOptions}
            disabled={disabled}
          />
        </div>
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
          disabled={disabled}
        />
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Xoay camera: </Text>
          <Select
            size="small"
            style={{ width: 100 }}
            value={cam2Rotation}
            onChange={setCam2Rotation}
            options={rotationOptions}
            disabled={disabled}
          />
        </div>
      </div>
      <div>
        <Text strong>Thư mục lưu video:</Text>
        <Input.Search
          value={videoDir}
          readOnly
          enterButton={<><FolderOpenOutlined /> Chọn</>}
          onSearch={handleSelectDir}
          size="small"
          style={{ marginTop: 4 }}
          disabled={disabled}
        />
      </div>
    </Space>
  );
}
