import { ipcMain } from 'electron';

export function registerCameraIpc() {
  ipcMain.handle('get-camera-permissions', async () => true);
}
