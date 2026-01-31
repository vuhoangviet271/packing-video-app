import { ipcMain, dialog, app } from 'electron';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { hostname } from 'os';

function getVideoDir() {
  return join(app.getPath('userData'), 'packing-videos');
}

export function registerFileIpc() {
  ipcMain.handle('save-video', async (_event, buffer: ArrayBuffer, fileName: string) => {
    const videoDir = getVideoDir();
    if (!existsSync(videoDir)) await mkdir(videoDir, { recursive: true });
    const filePath = join(videoDir, fileName);
    await writeFile(filePath, Buffer.from(buffer));
    return filePath;
  });

  ipcMain.handle('get-video-dir', async () => getVideoDir());
  ipcMain.handle('get-machine-name', async () => hostname());

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
}
