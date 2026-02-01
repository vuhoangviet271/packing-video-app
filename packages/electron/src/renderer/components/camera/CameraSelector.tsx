import { useState, useEffect } from 'react';
import { Select, Typography, Space, Button, Input } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { useCameraDevices } from '../../hooks/useCameraDevices';
import { useCameraStore } from '../../stores/camera.store';

const { Text } = Typography;

export function CameraSelector() {
  const devices = useCameraDevices();
  const { cam1DeviceId, cam2DeviceId, setCam1, setCam2 } = useCameraStore();
  const [videoDir, setVideoDir] = useState<string>('');

  useEffect(() => {
    window.electronAPI.getVideoDir().then(setVideoDir);
  }, []);

  const handleSelectDir = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) {
      await window.electronAPI.setVideoDir(dir);
      setVideoDir(dir);
    }
  };

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
        <Text strong>Thư mục lưu video:</Text>
        <Input.Search
          value={videoDir}
          readOnly
          enterButton={<><FolderOpenOutlined /> Chọn</>}
          onSearch={handleSelectDir}
          size="small"
          style={{ marginTop: 4 }}
        />
      </div>
    </Space>
  );
}
