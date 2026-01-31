interface ElectronAPI {
  saveVideo: (buffer: ArrayBuffer, fileName: string) => Promise<string>;
  getVideoDir: () => Promise<string>;
  getMachineName: () => Promise<string>;
  selectDirectory: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
