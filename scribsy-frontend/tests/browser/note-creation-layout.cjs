// Fictional API fixtures exercise the redesigned entry point and creation flow.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const root = process.env.WORKFLOW_BASE_URL || 'http://127.0.0.1:3100';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], ...(process.env.BROWSER_PROXY ? { proxy: { server: process.env.BROWSER_PROXY } } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, permissions: ['microphone'], ignoreHTTPSErrors: true });
    const errors = [], requests = [];
    const patient = { id: 21, first_name: 'Jamie', last_name: 'Example', date_of_birth: '1990-01-01' };
    let created = { id: 81, patient_id: 21, provider_id: 101, status: 'pending_review', content: 'Fictional note.', created_at: '2026-10-15T00:00:00Z' };
    await context.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      let body = {};
      if (path.endsWith('/auth/me')) body = { id: 101, username: 'creation_qa', email: 'qa@example.com', is_demo: false, is_active: true, role: 'provider' };
      else if (path.endsWith('/notes/create-json')) { requests.push(request.postDataJSON()); created = { ...created, ...request.postDataJSON() }; body = created; }
      else if (path.endsWith('/notes/81')) body = created;
      else if (path.endsWith('/notes/summarize-text')) body = { subjective: 'Fictional symptom.', objective: '', assessment: '', plan: 'Documented follow-up.' };
      else if (path.includes('/patients')) body = [patient];
      else if (path.includes('/dashboard')) body = { patients: [patient], notes: [], appointments: [] };
      else body = [];
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(root + '/notes/new?mode=type');
    const animated = page.getByRole('link', { name: 'New note', exact: true });
    await animated.waitFor();
    assert.ok((await animated.getAttribute('href')).includes('/notes/new?mode=record'));
    const header = page.locator('header').filter({ has: page.getByRole('heading', { name: 'Create a note', exact: true }) });
    assert.equal(await header.getByRole('button').count(), 0, 'page header has no generation/save buttons');
    assert.equal(await page.getByPlaceholder('Enter first name').isVisible(), false, 'new patient fields are opt-in');
    await page.getByRole('button', { name: 'New patient', exact: true }).click();
    await page.getByPlaceholder('Enter first name').fill('Fictional');
    await page.getByRole('button', { name: 'Existing patient', exact: true }).click();
    await page.getByLabel('Patient', { exact: true }).selectOption('21');
    await page.getByLabel('Note type', { exact: true }).selectOption('follow-up');
    await page.getByRole('textbox', { name: 'Manual notes', exact: true }).fill('Fictional follow-up visit.');
    const generate = page.getByRole('button', { name: 'Generate SOAP', exact: true });
    assert.equal(await generate.locator('svg').evaluate(svg => getComputedStyle(svg).animationName), 'none');
    await generate.click();
    await page.getByText('Fictional symptom.', { exact: true }).first().waitFor();
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1050 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `no overflow at ${width}px`);
      const capture = await page.locator('section[aria-labelledby="audio-capture-title"]').boundingBox();
      const manual = await page.locator('section[aria-labelledby="visit-notes-title"]').boundingBox();
      assert.ok(manual.y - (capture.y + capture.height) >= 23, `cards separated at ${width}px`);
      if (width > 1180) {
        const details = await page.locator('aside[aria-labelledby="visit-details-title"]').boundingBox();
        assert.ok(details.x - (capture.x + capture.width) >= 31, 'desktop columns have breathing room');
      }
      if (process.env.WORKFLOW_SCREENSHOT_DIR) {
        await page.locator('.workspace-main').evaluate(el => { el.scrollTop = 0; });
        await page.screenshot({ path: `${process.env.WORKFLOW_SCREENSHOT_DIR}/note-creation-${width}.png` });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.getByRole('button', { name: 'Save Note', exact: true }).click();
    await page.waitForURL('**/notes/81');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].patient_id, 21); assert.equal(requests[0].note_type, 'follow-up');
    assert.equal(requests[0].soap_subjective, 'Fictional symptom.');
    assert.ok(requests[0].content.includes('Fictional follow-up visit.'));
    await animated.click();
    await page.waitForURL('**/notes/new?mode=record');
    await page.getByText('Recording in progress', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await page.getByText('Audio ready to review', { exact: true }).waitFor();
    await page.setViewportSize({ width: 375, height: 1050 });
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await animated.waitFor({ state: 'visible' });
    assert.ok((await animated.boundingBox()).width < 250);
    if (process.env.WORKFLOW_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.WORKFLOW_SCREENSHOT_DIR}/new-note-mobile-navigation.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await animated.locator('svg').evaluate(svg => getComputedStyle(svg).animationName), 'none');
    assert.deepEqual(errors, []);
    console.log('PASS: sidebar animated entry, no header actions, patient modes, SOAP generation, note save payload and navigation, native recording, card gaps, four widths, mobile menu and reduced motion.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
