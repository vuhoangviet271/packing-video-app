import { useState, useEffect } from 'react';
import { Select, Typography, Space, Input, message, Button, Tooltip } from 'antd';
import { FolderOpenOutlined, RotateRightOutlined } from '@ant-design/icons';
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

  // Hàm xoay camera cùng chiều kim đồng hồ (0 → 90 → 180 → 270 → 0)
  const rotateCam1 = () => {
    setCam1Rotation((cam1Rotation + 90) % 360);
  };

  const rotateCam2 = () => {
    setCam2Rotation((cam2Rotation + 90) % 360);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div>
        <Text strong>Cam 1 - Quay video:</Text>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Select
            style={{ flex: 1 }}
            placeholder="Chọn camera quay video"
            value={cam1DeviceId || undefined}
            onChange={setCam1}
            options={options}
            allowClear
            disabled={disabled}
          />
          <Tooltip title={`Xoay camera ${cam1Rotation > 0 ? `(${cam1Rotation}°)` : ''}`}>
            <Button
              type="default"
              shape="circle"
              icon={<RotateRightOutlined style={{ fontSize: 16 }} />}
              onClick={rotateCam1}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
        </div>
      </div>
      <div>
        <Text strong>Cam 2 - Đọc QR:</Text>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Select
            style={{ flex: 1 }}
            placeholder="Chọn camera QR"
            value={cam2DeviceId || undefined}
            onChange={setCam2}
            options={options}
            allowClear
            disabled={disabled}
          />
          <Tooltip title={`Xoay camera ${cam2Rotation > 0 ? `(${cam2Rotation}°)` : ''}`}>
            <Button
              type="default"
              shape="circle"
              icon={<RotateRightOutlined style={{ fontSize: 16 }} />}
              onClick={rotateCam2}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
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
