const assert = require('node:assert/strict');
const { app } = require('electron');
const main = require('../main');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, message, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await wait(100);
  }
  throw new Error(message);
}

app.whenReady().then(async () => {
  try {
    await waitFor(() => main.getWindow(), 'Electron window was not created.');
    const win = main.getWindow();
    await waitFor(() => !win.webContents.isLoading(), 'Renderer did not finish loading.');

    await win.webContents.executeJavaScript(`
      document.getElementById('agree').click();
      document.getElementById('start').click();
    `);
    await waitFor(async () => win.webContents.executeJavaScript(
      `document.getElementById('startErr').textContent.includes('SMARTSPECTRA_API_KEY')`
    ), 'Missing-key error was not surfaced.');

    const state = await win.webContents.executeJavaScript(`({
      consentVisible: !document.getElementById('consent').classList.contains('hidden'),
      appHidden: document.getElementById('app').classList.contains('hidden'),
      error: document.getElementById('startErr').textContent
    })`);
    assert.equal(state.consentVisible, true);
    assert.equal(state.appHidden, true);
    assert.match(state.error, /SMARTSPECTRA_API_KEY/);
    console.log('presage configuration smoke test passed');
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
