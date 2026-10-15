// Browser regression check using a real MediaRecorder and Chromium's synthetic
// microphone. No microphone hardware, real account, or AI requests are needed.
// Run against a started frontend with PLAYWRIGHT_MODULE and CHROMIUM_PATH set
// when Playwright/browser binaries are supplied by the development environment.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const root = process.env.RECORDING_BASE_URL || 'http://127.0.0.1:3100';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
    headless: true,
    ...(process.env.BROWSER_PROXY ? { proxy: { server: process.env.BROWSER_PROXY } } : {}),
  });
  const errors = [];
  let uploads = 0;
  async function session(mode = 'normal') {
    const context = await browser.newContext({ permissions: ['microphone'], ignoreHTTPSErrors: true, viewport: { width: 1365, height: 1050 } });
    await context.addInitScript(({ mode }) => {
      window.qaStreams = [];
      window.qaMicCalls = 0;
      if (mode === 'unsupported') { window.MediaRecorder = undefined; return; }
      const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (...args) => {
        window.qaMicCalls++;
        if (mode === 'denied') throw new DOMException('QA permission denied', 'NotAllowedError');
        if (mode === 'missing') throw new DOMException('QA no device', 'NotFoundError');
        if (mode === 'pending') await new Promise(resolve => { window.qaResolveMicrophone = resolve; });
        const stream = await getUserMedia(...args);
        window.qaStreams.push(stream);
        return stream;
      };
    }, { mode });
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path.endsWith('/auth/me')) body = { id: 101, username: 'recording_qa', email: 'qa@example.com', is_demo: false, is_active: true, role: 'provider' };
      else if (path.includes('/patients')) body = [];
      else if (path.includes('/dashboard')) body = { patients: [], notes: [], appointments: [] };
      else if (path.endsWith('/transcribe')) {
        const payload = route.request().postDataBuffer();
        assert.ok(payload.length > 500, 'nonempty recorded audio submitted');
        assert.ok(payload.includes(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])), 'native WebM audio container submitted');
        uploads++;
        body = { transcript: 'Fictional recording verification transcript.', summary: { subjective: 'Fictional symptoms.', objective: 'Fictional exam.', assessment: 'Fictional assessment.', plan: 'Fictional follow-up.' } };
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.accept()); // Confirm intentional navigation away from an unsaved recording.
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    return { context, page };
  }
  try {
    const { context, page } = await session();
    await page.goto(root + '/notes/new?mode=type');
    await page.getByRole('button', { name: 'Start recording', exact: true }).waitFor();
    assert.equal(await page.getByRole('timer').textContent(), '00:00');
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByText('Recording in progress', { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('[role=timer]')?.textContent >= '00:02');
    assert.equal(await page.getByRole('button', { name: 'Upload audio', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => window.qaMicCalls), 1);
    await page.getByRole('meter', { name: 'Microphone input level' }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.workspace-main').evaluate(element => element.scrollTo(0, 0));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('complementary', { name: 'Active recording controls' }).waitFor();
    if (process.env.RECORDING_SCREENSHOT_DIR) await page.screenshot({ path: process.env.RECORDING_SCREENSHOT_DIR + '/recording-mobile.png' });
    await page.setViewportSize({ width: 1365, height: 1050 });
    await page.locator('.workspace-main').evaluate(element => element.scrollTo(0, 0));
    if (process.env.RECORDING_SCREENSHOT_DIR) await page.screenshot({ path: process.env.RECORDING_SCREENSHOT_DIR + '/recording-desktop.png' });
    await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await page.getByText('Audio ready to review', { exact: true }).waitFor();
    const duration = await page.getByRole('timer').textContent();
    await page.waitForTimeout(1200);
    assert.equal(await page.getByRole('timer').textContent(), duration, 'timer freezes after stop');
    assert.equal(await page.evaluate(() => window.qaStreams.every(stream => stream.getTracks().every(track => track.readyState === 'ended'))), true, 'microphone released');
    assert.equal(await page.evaluate(async () => {
      const audio = document.querySelector('audio');
      await audio.play();
      return !audio.paused && !audio.error;
    }), true, 'recorded Blob plays under production CSP');
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download audio recording' }).click();
    assert.equal((await download).suggestedFilename(), 'recording.webm');
    await page.getByRole('button', { name: 'Transcribe & generate SOAP note', exact: true }).click();
    await page.getByText('Fictional symptoms.', { exact: true }).first().waitFor();
    assert.equal(uploads, 1);
    await page.getByRole('button', { name: 'Record again', exact: true }).click();
    await page.getByText('Recording in progress', { exact: true }).waitFor();
    assert.equal(await page.getByRole('timer').textContent(), '00:00', 'new recording resets timer');
    await page.waitForTimeout(1100);
    await page.evaluate(() => window.qaStreams.at(-1).getAudioTracks()[0].dispatchEvent(new Event('ended')));
    await page.getByText('Audio ready to review', { exact: true }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'microphone disconnected' }).waitFor();
    await page.getByRole('button', { name: 'Record again', exact: true }).click();
    await page.getByText('Recording in progress', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click();
    await page.waitForURL('**/dashboard');
    assert.equal(await page.evaluate(() => window.qaStreams.every(stream => stream.getTracks().every(track => track.readyState === 'ended'))), true, 'navigation releases microphone');
    await context.close();

    for (const [mode, message] of [['denied', 'Microphone access is blocked'], ['missing', 'No microphone was found'], ['unsupported', 'does not support audio recording']]) {
      const { context, page } = await session(mode);
      await page.goto(root + '/notes/new?mode=type');
      await page.getByRole('button', { name: 'Start recording', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: message }).waitFor();
      assert.equal(await page.getByRole('timer').textContent(), '00:00');
      assert.equal(await page.getByRole('button', { name: 'Start recording', exact: true }).isEnabled(), true);
      await context.close();
    }
    const pending = await session('pending');
    await pending.page.goto(root + '/notes/new?mode=type');
    await pending.page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await pending.page.getByText('Waiting for microphone access', { exact: true }).waitFor();
    await pending.page.getByRole('button', { name: 'Cancel microphone request' }).click();
    await pending.page.evaluate(() => window.qaResolveMicrophone());
    await pending.page.waitForFunction(() => window.qaStreams.length === 1 && window.qaStreams[0].getTracks().every(track => track.readyState === 'ended'));
    assert.equal(await pending.page.getByText('Recording in progress', { exact: true }).count(), 0);
    await pending.context.close();
    const automatic = await session();
    await automatic.page.goto(root + '/notes/new?mode=record');
    await automatic.page.getByText('Recording in progress', { exact: true }).waitFor();
    await automatic.page.waitForFunction(() => document.querySelector('[role=timer]')?.textContent >= '00:01');
    assert.equal(await automatic.page.evaluate(() => window.qaStreams.filter(stream => stream.active).length), 1);
    await automatic.context.close();
    assert.deepEqual(errors, []);
    console.log('PASS: native recording, live timer, mobile layout, stop/frozen duration, released microphone, playable audio, download, recorded upload to transcription, re-record, interruption, navigation cleanup, denied/missing/unsupported microphones, cancelled pending permission, dashboard autostart.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
