import { ipcMain, dialog, app } from 'electron';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { hostname } from 'os';

const settingsPath = join(app.getPath('userData'), 'app-settings.json');

async function loadSettings(): Promise<Record<string, any>> {
  try {
    const data = await readFile(settingsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveSettings(settings: Record<string, any>) {
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

function getDefaultVideoDir() {
  return join(app.getPath('userData'), 'packing-videos');
}

async function getVideoDir() {
  const settings = await loadSettings();
  return settings.videoDir || getDefaultVideoDir();
}

export function registerFileIpc() {
  ipcMain.handle('save-video', async (_event, buffer: ArrayBuffer, fileName: string) => {
    const videoDir = await getVideoDir();
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

  ipcMain.handle('set-video-dir', async (_event, dir: string) => {
    const settings = await loadSettings();
    settings.videoDir = dir;
    await saveSettings(settings);
    return dir;
  });
}
