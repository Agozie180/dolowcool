const assert = require('node:assert/strict');
const { app, shell } = require('electron');

const recipient = process.env.DOLOWCOOL_TEST_RECIPIENT;
if (!recipient) throw new Error('Set DOLOWCOOL_TEST_RECIPIENT for the handoff test.');

let openedUrl = null;
shell.openExternal = async (url) => { openedUrl = url; };

const main = require('../main');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, message, timeoutMs = 30000) {
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
      `!document.getElementById('app').classList.contains('hidden')`
    ), 'Simulator session did not start.');

    await win.webContents.executeJavaScript(`
      const values = ${JSON.stringify({
        recipient,
        subject: 'Dolowcool handoff test',
        body: 'Dolowcool end-to-end email handoff test. This automated test does not send an email.',
      })};
      document.getElementById('recipient').value = values.recipient;
      document.getElementById('subject').value = values.subject;
      document.getElementById('msg').value = values.body;
      for (const id of ['recipient', 'subject', 'msg']) {
        document.getElementById(id).dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);

    await waitFor(async () => win.webContents.executeJavaScript(
      `document.getElementById('lockBanner').classList.contains('unlocked') &&
       !document.getElementById('send').disabled`
    ), 'Simulator did not complete baseline and enable the email handoff.', 30000);

    await win.webContents.executeJavaScript(`document.getElementById('send').click()`);
    await waitFor(() => openedUrl, 'The app did not request an email-client handoff.');

    const parsed = new URL(openedUrl);
    assert.equal(parsed.protocol, 'mailto:');
    assert.equal(decodeURIComponent(parsed.pathname), recipient);
    assert.equal(parsed.searchParams.get('subject'), 'Dolowcool handoff test');
    assert.match(parsed.searchParams.get('body'), /does not send an email/);

    await win.webContents.executeJavaScript(`document.getElementById('stop').click()`);
    await waitFor(async () => win.webContents.executeJavaScript(
      `!document.getElementById('consent').classList.contains('hidden')`
    ), 'Session did not stop cleanly.');

    console.log('RESULT=PASSED EMAIL_HANDOFF=true RECIPIENT_MATCH=true SUBJECT_MATCH=true BODY_MATCH=true SENT=false');
    app.quit();
  } catch (error) {
    console.error(`RESULT=FAILED REASON=${error.message || error}`);
    app.exitCode = 1;
    app.quit();
  }
});
