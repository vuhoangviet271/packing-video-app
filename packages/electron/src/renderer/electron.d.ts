interface ElectronAPI {
  saveVideo: (buffer: ArrayBuffer, fileName: string) => Promise<string>;
  getVideoDir: () => Promise<string>;
  getMachineName: () => Promise<string>;
  selectDirectory: () => Promise<string | null>;
  setVideoDir: (dir: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
