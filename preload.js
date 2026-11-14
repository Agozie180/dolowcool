require('@smartspectra/node-sdk/preload');

const { contextBridge, ipcRenderer, clipboard } = require('electron');
contextBridge.exposeInMainWorld('dolowcool', {
  config: () => ipcRenderer.invoke('config'),
  presageConfig: () => ipcRenderer.invoke('presage:config'),
  start: () => ipcRenderer.invoke('capture:start'),
  stop: () => ipcRenderer.invoke('capture:stop'),
  onSample: (cb) => ipcRenderer.on('sample', (_e, s) => cb(s)),
  onStatus: (cb) => ipcRenderer.on('source-status', (_e, s) => cb(s)),
  onError: (cb) => ipcRenderer.on('source-error', (_e, m) => cb(m)),
  simSet: (v) => ipcRenderer.send('sim:set', v),
  copyText: (value) => clipboard.writeText(String(value || '')),
  openEmail: (message) => ipcRenderer.invoke('message:open-email', message),
});
