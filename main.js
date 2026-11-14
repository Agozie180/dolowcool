// Main process owns the signal source (the SDK loop stays out of the UI process).
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const requestedSource = process.env.DOLOWCOOL_SOURCE || 'sim';
const sourceName = ['sim', 'presage'].includes(requestedSource) ? requestedSource : 'sim';
let win = null;
let source = null;

function createWindow() {
  win = new BrowserWindow({
    width: 560, height: 820, minWidth: 460, minHeight: 640,
    title: 'Dolowcool',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('config', () => ({ source: sourceName }));

ipcMain.handle('capture:start', async () => {
  if (source) return;
  const s = require(path.join(__dirname, 'sources', sourceName))();
  s.on('sample', (x) => win && win.webContents.send('sample', x));
  s.on('status', (x) => win && win.webContents.send('source-status', x));
  s.on('error', (e) => win && win.webContents.send('source-error', String((e && e.message) || e)));
  source = s;
  try { await s.start(); }
  catch (e) {
    source = null;
    try { await s.stop(); } catch {}
    throw new Error(String((e && e.message) || e));
  }
});

ipcMain.handle('capture:stop', async () => {
  if (source) { const s = source; source = null; await s.stop(); }
});

ipcMain.on('sim:set', (_e, v) => { if (source && source.setArousal) source.setArousal(v); });

app.whenReady().then(createWindow);
app.on('window-all-closed', async () => { if (source) await source.stop(); app.quit(); });

module.exports = { getWindow: () => win };
