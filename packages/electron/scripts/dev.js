// Pre-launch script: remove the electron npm package symlink temporarily
// so Electron's built-in module takes priority over the npm package
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const electronSymlink = path.join(__dirname, '..', 'node_modules', 'electron');
const electronBackup = electronSymlink + '.bak';

// Temporarily rename the symlink
let renamed = false;
try {
  if (fs.existsSync(electronSymlink)) {
    fs.renameSync(electronSymlink, electronBackup);
    renamed = true;
  }
} catch (e) {
  console.error('Warning: could not rename electron symlink:', e.message);
}

// Find electron binary
const electronPath = path.join(__dirname, '..', '..', '..', 'node_modules', '.pnpm');
let electronBin;
try {
  const dirs = fs.readdirSync(electronPath).filter(d => d.startsWith('electron@'));
  if (dirs.length > 0) {
    electronBin = path.join(electronPath, dirs[dirs.length - 1], 'node_modules', 'electron');
    electronBin = require(electronBin);
  }
} catch (e) {
  // fallback
  if (renamed) fs.renameSync(electronBackup, electronSymlink);
  electronBin = require('electron');
}

// Restore symlink on exit
function restore() {
  if (renamed) {
    try { fs.renameSync(electronBackup, electronSymlink); } catch {}
  }
}
process.on('exit', restore);
process.on('SIGINT', () => { restore(); process.exit(); });
process.on('SIGTERM', () => { restore(); process.exit(); });

// Run electron
const mainFile = path.join(__dirname, '..', 'out', 'main', 'index.js');
const child = spawn(electronBin, [mainFile], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RENDERER_URL: process.argv[2] || '' },
});

child.on('exit', (code) => {
  restore();
  process.exit(code || 0);
});
