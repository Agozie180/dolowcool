const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

async function capture(win, name) {
  const directory = process.env.DOLOWCOOL_SCREENSHOT_DIR;
  if (!directory) return;
  await wait(400);
  fs.mkdirSync(directory, { recursive: true });
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(directory, `${name}.png`), image.toPNG());
}

app.whenReady().then(async () => {
  try {
    await waitFor(() => main.getWindow(), 'Electron window was not created.');
    const win = main.getWindow();
    win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`renderer[${level}] ${message} (${sourceId}:${line})`);
    });
    await waitFor(() => !win.webContents.isLoading(), 'Renderer did not finish loading.');

    const initial = await win.webContents.executeJavaScript(`({
      title: document.title,
      consentVisible: !document.getElementById('consent').classList.contains('hidden'),
      startDisabled: document.getElementById('start').disabled
    })`);
    assert.deepEqual(initial, { title: 'Dolowcool', consentVisible: true, startDisabled: true });
    await capture(win, 'consent');

    await win.webContents.executeJavaScript(`
      document.getElementById('agree').click();
      document.getElementById('start').click();
    `);
    try {
      await waitFor(async () => win.webContents.executeJavaScript(
        `!document.getElementById('app').classList.contains('hidden') &&
         !document.getElementById('simBox').classList.contains('hidden')`
      ), 'Simulator UI did not start.');
    } catch (error) {
      const diagnostic = await win.webContents.executeJavaScript(`({
        appClass: document.getElementById('app').className,
        simClass: document.getElementById('simBox').className,
        error: document.getElementById('startErr').textContent,
        status: document.getElementById('status').textContent
      })`);
      throw new Error(`${error.message} ${JSON.stringify(diagnostic)}`);
    }

    await waitFor(async () => win.webContents.executeJavaScript(
      `document.getElementById('status').textContent.includes('Learning your calm baseline') &&
       document.getElementById('pulseNow').textContent !== '—'`
    ), 'Simulator readings did not reach the renderer.');
    await capture(win, 'workspace');

    if (process.env.DOLOWCOOL_SCREENSHOT_DIR) {
      await win.webContents.executeJavaScript(`
        document.getElementById('recipient').value = 'alex@example.com';
        document.getElementById('subject').value = 'Before I hit send';
        document.getElementById('msg').value = 'I wrote this quickly. I want to make sure it still says what I mean after I have had a moment.';
        document.getElementById('msg').dispatchEvent(new Event('input', { bubbles: true }));
      `);
      await waitFor(async () => win.webContents.executeJavaScript(
        `document.getElementById('lockBanner').classList.contains('unlocked')`
      ), 'Simulator baseline did not complete.', 26000);
      await win.webContents.executeJavaScript(`
        const slider = document.getElementById('sim');
        slider.value = '1';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      `);
      await waitFor(async () => win.webContents.executeJavaScript(
        `document.getElementById('lockBanner').classList.contains('locked')`
      ), 'Simulator did not activate the pause.');
      await capture(win, 'locked');
    }

    const draftResult = await win.webContents.executeJavaScript(`
      document.getElementById('msg').value = 'A draft to revisit';
      document.getElementById('draft').click();
      ({ value: document.getElementById('msg').value, toast: document.getElementById('toast').textContent })
    `);
    assert.equal(draftResult.value, 'A draft to revisit');
    assert.match(draftResult.toast, /Draft saved/);

    const discardResult = await win.webContents.executeJavaScript(`
      document.getElementById('discard').click();
      ({
        value: document.getElementById('msg').value,
        stored: localStorage.getItem('dolowcool-draft'),
        toast: document.getElementById('toast').textContent
      })
    `);
    assert.equal(discardResult.value, '');
    assert.equal(discardResult.stored, null);
    assert.match(discardResult.toast, /deleted/);

    await win.webContents.executeJavaScript(`document.getElementById('stop').click()`);
    await waitFor(async () => win.webContents.executeJavaScript(
      `!document.getElementById('recap').classList.contains('hidden') &&
       document.getElementById('recapWait').textContent.includes('You waited')`
    ), 'Stop did not show the memory-only recap.');
    const recapState = await win.webContents.executeJavaScript(`({
      consentHidden: document.getElementById('consent').classList.contains('hidden'),
      recapVisible: !document.getElementById('recap').classList.contains('hidden'),
      chartWidth: document.getElementById('recapChart').width
    })`);
    assert.equal(recapState.consentHidden, true);
    assert.equal(recapState.recapVisible, true);
    assert.ok(recapState.chartWidth > 0);

    await win.webContents.executeJavaScript(`document.getElementById('recapDone').click()`);
    await waitFor(async () => win.webContents.executeJavaScript(
      `!document.getElementById('consent').classList.contains('hidden') &&
       document.getElementById('recap').classList.contains('hidden')`
    ), 'Closing the recap did not return to consent.');

    console.log('electron smoke test passed');
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
