// Main process owns the signal source (the SDK loop stays out of the UI process).
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Live SmartSpectra is the product. The simulator remains an explicit developer tool.
const requestedSource = process.env.DOLOWCOOL_SOURCE || 'presage';
const sourceName = ['sim', 'presage'].includes(requestedSource) ? requestedSource : 'presage';
let win = null;
let source = null;

function sendToRenderer(channel, payload) {
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return;
  win.webContents.send(channel, payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 900, minHeight: 680,
    title: 'Dolowcool',
    backgroundColor: '#07100f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'dist', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('config', () => ({
  source: sourceName,
  telemetry: process.env.DOLOWCOOL_TELEMETRY === '1',
  hasApiKey: Boolean(process.env.SMARTSPECTRA_API_KEY),
}));

ipcMain.handle('capture:start', async () => {
  if (source) return;
  const s = require(path.join(__dirname, 'sources', sourceName))({
    apiKey: process.env.SMARTSPECTRA_API_KEY,
    enableTelemetry: process.env.DOLOWCOOL_TELEMETRY === '1',
  });
  s.on('sample', (x) => sendToRenderer('sample', x));
  s.on('status', (x) => sendToRenderer('source-status', x));
  s.on('frame', (x) => sendToRenderer('camera-frame', x));
  s.on('error', (e) => sendToRenderer('source-error', {
    message: String((e && e.message) || e),
    code: e?.code ?? 'unknown',
    retryable: Boolean(e?.retryable),
  }));
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

ipcMain.handle('message:open-email', async (_event, raw) => {
  const clean = (value, max) => String(value || '').replace(/[\r\n]+/g, ' ').slice(0, max);
  const to = clean(raw?.to, 320);
  const subject = clean(raw?.subject, 500);
  const body = String(raw?.body || '').slice(0, 12000);
  if (!body.trim()) throw new Error('Write a message first.');
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  await shell.openExternal(url);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', async () => { if (source) await source.stop(); app.quit(); });

module.exports = { getWindow: () => win };
