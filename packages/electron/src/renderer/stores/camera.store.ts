import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CameraState {
  cam1DeviceId: string;
  cam2DeviceId: string;
  cam1Rotation: number; // 0, 90, 180, 270
  cam2Rotation: number; // 0, 90, 180, 270
  setCam1: (id: string) => void;
  setCam2: (id: string) => void;
  setCam1Rotation: (rotation: number) => void;
  setCam2Rotation: (rotation: number) => void;
}

export const useCameraStore = create<CameraState>()(
  persist(
    (set) => ({
      cam1DeviceId: '',
      cam2DeviceId: '',
      cam1Rotation: 0,
      cam2Rotation: 0,
      setCam1: (id) => set({ cam1DeviceId: id }),
      setCam2: (id) => set({ cam2DeviceId: id }),
      setCam1Rotation: (rotation) => set({ cam1Rotation: rotation }),
      setCam2Rotation: (rotation) => set({ cam2Rotation: rotation }),
    }),
    { name: 'camera-settings' }
  )
);
