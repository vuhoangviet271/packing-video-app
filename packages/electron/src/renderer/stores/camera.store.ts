import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CameraState {
  cam1DeviceId: string;
  cam2DeviceId: string;
  cam3DeviceId: string;
  setCam1: (id: string) => void;
  setCam2: (id: string) => void;
  setCam3: (id: string) => void;
}

export const useCameraStore = create<CameraState>()(
  persist(
    (set) => ({
      cam1DeviceId: '',
      cam2DeviceId: '',
      cam3DeviceId: '',
      setCam1: (id) => set({ cam1DeviceId: id }),
      setCam2: (id) => set({ cam2DeviceId: id }),
      setCam3: (id) => set({ cam3DeviceId: id }),
    }),
    { name: 'camera-settings' }
  )
);
