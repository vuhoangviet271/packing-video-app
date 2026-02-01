import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveVideo: (buffer: ArrayBuffer, fileName: string): Promise<string> =>
    ipcRenderer.invoke('save-video', buffer, fileName),
  getVideoDir: (): Promise<string> => ipcRenderer.invoke('get-video-dir'),
  getMachineName: (): Promise<string> => ipcRenderer.invoke('get-machine-name'),
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('select-directory'),
  setVideoDir: (dir: string): Promise<string> => ipcRenderer.invoke('set-video-dir', dir),
});
