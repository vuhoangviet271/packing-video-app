import { Modal } from 'antd';

interface DuplicateModalProps {
  open: boolean;
  shippingCode: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateModal({ open, shippingCode, onConfirm, onCancel }: DuplicateModalProps) {
  return (
    <Modal
      title="Mã vận đơn trùng"
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Tiếp tục quay"
      cancelText="Hủy"
    >
      <p>
        Mã vận đơn <strong>{shippingCode}</strong> đã có video trước đó. Bạn có muốn quay lại không?
      </p>
    </Modal>
  );
}
