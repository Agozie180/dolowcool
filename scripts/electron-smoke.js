const assert = require('node:assert/strict');
const { app } = require('electron');
const main = require('../main');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, message, timeoutMs = 8000) {
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

    const initial = await win.webContents.executeJavaScript(`({
      title: document.title,
      consentVisible: !document.getElementById('consent').classList.contains('hidden'),
      startDisabled: document.getElementById('start').disabled
    })`);
    assert.deepEqual(initial, { title: 'Dolowcool', consentVisible: true, startDisabled: true });

    await win.webContents.executeJavaScript(`
      document.getElementById('agree').click();
      document.getElementById('start').click();
    `);
    await waitFor(async () => win.webContents.executeJavaScript(
      `!document.getElementById('app').classList.contains('hidden') &&
       !document.getElementById('simBox').classList.contains('hidden')`
    ), 'Simulator UI did not start.');

    await waitFor(async () => win.webContents.executeJavaScript(
      `document.getElementById('status').textContent.includes('Learning your calm baseline')`
    ), 'Simulator readings did not reach the renderer.');

    const draftResult = await win.webContents.executeJavaScript(`
      document.getElementById('msg').value = 'A draft to revisit';
      document.getElementById('draft').click();
      ({ value: document.getElementById('msg').value, toast: document.getElementById('toast').textContent })
    `);
    assert.equal(draftResult.value, '');
    assert.match(draftResult.toast, /Draft saved/);

    await win.webContents.executeJavaScript(`document.getElementById('stop').click()`);
    await waitFor(async () => win.webContents.executeJavaScript(
      `!document.getElementById('consent').classList.contains('hidden')`
    ), 'Stop did not return to the consent screen.');

    console.log('electron smoke test passed');
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
