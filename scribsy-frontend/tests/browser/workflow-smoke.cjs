// Start the production frontend, then run with Playwright installed. All account,
// note and AI responses are fictional fixtures; these checks never call an AI API.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const root = process.env.WORKFLOW_BASE_URL || 'http://127.0.0.1:3100';
const waitFor = async (page, predicate) => { for (let n = 0; n < 100; n++) { if (predicate()) return; await page.waitForTimeout(100); } throw Error('Timed out waiting for QA request'); };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'], headless: true, ...(process.env.BROWSER_PROXY ? { proxy: { server: process.env.BROWSER_PROXY } } : {}) });
  const errors = [];
  let note = { id: 71, patient_id: 21, provider_id: 101, content: 'Original fictional visit.', note_type: 'follow-up', status: 'pending_review', created_at: '2026-10-14T12:00:00Z', soap_subjective: 'Fictional symptom.', soap_objective: 'Fictional exam.', soap_assessment: 'Fictional assessment.', soap_plan: 'Fictional plan.' };
  const saves = [];
  let holdSave = false, failSave = false, releaseSave;
  let holdGeneration = false, failGeneration = false, releaseGeneration;
  const summary = { subjective: 'Generated fictional symptom.', objective: 'Generated fictional exam.', assessment: 'Generated fictional assessment.', plan: 'Generated fictional plan.' };
  async function session(authUnavailable = false) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, ignoreHTTPSErrors: true });
    await context.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      let body = {}, status = 200;
      if (path.endsWith('/auth/me')) { body = { id: 101, username: 'workflow_qa', email: 'qa@example.com', is_demo: false, is_active: true, role: 'provider' }; if (authUnavailable) { status = 503; body = { detail: 'Fictional outage' }; } }
      else if (path.endsWith('/auth/logout')) body = { success: true };
      else if (path.includes('/dashboard')) body = { patients: [], notes: [note], appointments: [] };
      else if (path.includes('/patients')) body = [];
      else if (path.endsWith('/notes/71') && request.method() === 'PUT') {
        const payload = request.postDataJSON(); saves.push(payload);
        if (holdSave) { holdSave = false; await new Promise(resolve => { releaseSave = resolve; }); }
        if (failSave) { failSave = false; status = 500; body = { detail: 'Fictional save failure.' }; }
        else { note = { ...note, ...payload }; body = note; }
      } else if (path.endsWith('/notes/71')) body = note;
      else if (path.endsWith('/notes/summarize-text')) {
        if (holdGeneration) { holdGeneration = false; await new Promise(resolve => { releaseGeneration = resolve; }); }
        if (failGeneration) { failGeneration = false; status = 500; body = { detail: 'Fictional generation failure.' }; } else body = summary;
      } else if (path.endsWith('/transcribe')) { status = 503; body = { detail: 'Fictional gateway failure.' }; }
      else body = [];
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', error => errors.push(error.message));
    return { context, page };
  }
  try {
    const { context, page } = await session();
    let cancelDialogs = false, dialogs = 0;
    page.on('dialog', async dialog => { dialogs++; if (cancelDialogs) await dialog.dismiss(); else await dialog.accept(); });
    await page.goto(root + '/notes/71/edit');
    const visit = page.getByRole('textbox', { name: 'Visit notes', exact: true });
    await visit.waitFor();
    holdSave = true;
    await visit.fill('First fictional edit.'); await waitFor(page, () => saves.length === 1 && releaseSave);
    await visit.fill('Newer typing while the first save is pending.'); releaseSave();
    await waitFor(page, () => saves.length === 2);
    await page.getByText('All changes saved', { exact: true }).waitFor();
    assert.equal(await visit.inputValue(), 'Newer typing while the first save is pending.');
    assert.equal(note.content, 'Newer typing while the first save is pending.');
    failSave = true; await visit.fill('Recover this fictional edit after refresh.');
    await page.getByRole('button', { name: 'Retry save', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Restore draft', exact: true }).click();
    assert.equal(await visit.inputValue(), 'Recover this fictional edit after refresh.');
    await page.getByText('All changes saved', { exact: true }).waitFor();
    assert.equal(note.content, 'Recover this fictional edit after refresh.');
    failSave = true; await visit.fill('Retry this fictional edit.');
    await page.getByRole('button', { name: 'Retry save', exact: true }).click();
    await page.getByText('All changes saved', { exact: true }).waitFor();
    assert.equal(note.content, 'Retry this fictional edit.');
    await page.getByRole('button', { name: 'Save & return to note', exact: true }).click();
    await page.waitForURL('**/notes/71');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('textbox', { name: 'Visit notes', exact: true }).waitFor();
    assert.equal(await page.getByText('All changes saved', { exact: true }).count(), 1, 'inline editor uses autosave');
    await page.getByRole('button', { name: 'Done editing', exact: true }).click();
    note.status = 'finalized'; await page.goto(root + '/notes/71/edit');
    await page.getByText('This note is read-only', { exact: true }).waitFor();
    assert.equal(await page.getByRole('textbox').count(), 0);
    note.status = 'pending_review';
    await page.goto(root + '/notes/new?mode=type');
    await page.getByRole('textbox', { name: 'Manual notes', exact: true }).fill('Recover my new fictional note.');
    await page.getByPlaceholder('Enter first name', { exact: true }).fill('Fictional');
    await page.waitForTimeout(200);
    await page.reload();
    await page.getByRole('button', { name: 'Restore draft', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Manual notes', exact: true }).inputValue(), 'Recover my new fictional note.');
    assert.equal(await page.getByPlaceholder('Enter first name', { exact: true }).inputValue(), 'Fictional');
    cancelDialogs = true;
    await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click();
    assert.ok(page.url().includes('/notes/new'), 'cancelled navigation keeps the draft');
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    assert.ok(page.url().includes('/notes/new'), 'cancelled sign-out keeps the draft');
    cancelDialogs = false;
    await page.getByRole('button', { name: 'Log out', exact: true }).click(); await page.waitForURL(root + '/');
    assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('scribsy:draft:')).length), 0);
    assert.ok(dialogs >= 3);
    await context.close();

    const generation = await session(); const p = generation.page;
    p.on('dialog', dialog => dialog.accept());
    await p.goto(root + '/notes/new?mode=type');
    const generate = p.getByRole('button', { name: 'Generate SOAP', exact: true });
    assert.equal(await generate.isDisabled(), true);
    await p.getByRole('textbox', { name: 'Manual notes', exact: true }).fill('Fictional source for generating a note.');
    await generate.focus(); assert.equal(await generate.getAttribute('aria-busy'), 'false', 'focus alone does not show generating');
    holdGeneration = true; await generate.press('Space');
    const generating = p.getByRole('button', { name: 'Generating SOAP…', exact: true });
    await generating.waitFor(); assert.equal(await generating.getAttribute('aria-busy'), 'true'); assert.equal(await generating.isDisabled(), true);
    await waitFor(p, () => !!releaseGeneration); releaseGeneration();
    await p.getByText('Generated fictional symptom.', { exact: true }).first().waitFor(); await generate.waitFor();
    failGeneration = true; await generate.click();
    await p.getByText('Fictional generation failure.', { exact: true }).waitFor(); assert.equal(await generate.isEnabled(), true);
    await p.getByLabel('Upload audio file', { exact: true }).setInputFiles({ name: 'fictional.wav', mimeType: 'audio/wav', buffer: Buffer.from('fictional audio fixture') });
    const transcribe = p.getByRole('button', { name: 'Transcribe & generate SOAP note', exact: true });
    await transcribe.waitFor();
    for (const width of [320, 375, 768, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      const bounds = await transcribe.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `button fits ${width}px`);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await transcribe.click();
    await p.getByText(/Your audio is still attached; please retry/).waitFor(); assert.equal(await transcribe.isEnabled(), true);
    await p.getByRole('link', { name: 'Download audio recording' }).waitFor();
    await p.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await generate.locator('svg').evaluate(svg => getComputedStyle(svg).animationName), 'none');
    await p.getByRole('button', { name: 'Dark mode', exact: true }).click();
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('dark')), true);
    await p.getByRole('button', { name: 'Light mode', exact: true }).click();
    if (process.env.WORKFLOW_SCREENSHOT_DIR) { await p.setViewportSize({ width: 375, height: 1000 }); await p.screenshot({ path: process.env.WORKFLOW_SCREENSHOT_DIR + '/generate-button-mobile.png' }); }
    assert.deepEqual(errors, []);
    await generation.context.close();
    const outage = await session(true);
    await outage.context.addInitScript(() => sessionStorage.setItem('scribsy:draft:v1:101:new', JSON.stringify({ version: 1, expiresAt: Date.now() + 3600000, value: { content: 'Fictional recovery copy' } })));
    await outage.page.goto(root + '/notes/new?mode=type');
    await outage.page.waitForURL('**/login');
    assert.ok(await outage.page.evaluate(() => sessionStorage.getItem('scribsy:draft:v1:101:new')), 'an authentication network outage does not erase recovery copies');
    await outage.context.close();
    console.log('PASS: serialized autosave, newer typing, failed-save recovery/retry, refresh restore, inline editor, finalized lock, new-note recovery, navigation/sign-out warnings and cleanup, real loading lifecycle, keyboard operation, error retry, retained upload, four responsive widths, themes, reduced motion.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
