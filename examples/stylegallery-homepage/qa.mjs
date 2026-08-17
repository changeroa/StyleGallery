import fs from 'node:fs/promises';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const cdpUrl = process.env.QA_CDP_URL ?? 'http://127.0.0.1:9223';
const outputDirectory = path.resolve(process.env.QA_OUTPUT_DIR ?? 'artifacts');

await fs.mkdir(outputDirectory, { recursive: true });

const browser = await chromium.connectOverCDP(cdpUrl);
const context = browser.contexts()[0];
const results = [];

async function verifyViewport(name, width, height) {
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}`));

  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1,
    height,
    mobile: width < 700,
    screenHeight: height,
    screenWidth: width,
    width,
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    domainColumns: getComputedStyle(document.querySelector('.domain-grid')).gridTemplateColumns,
    heading: document.querySelector('h1')?.innerText,
    innerHeight,
    innerWidth,
    navToggleDisplay: getComputedStyle(document.querySelector('.nav-toggle')).display,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  if (layout.innerWidth !== width) throw new Error(`${name}: expected ${width}px viewport, got ${layout.innerWidth}px`);
  if (layout.scrollWidth > layout.clientWidth + 1) throw new Error(`${name}: horizontal overflow ${layout.scrollWidth}px > ${layout.clientWidth}px`);
  if (width < 700 && layout.navToggleDisplay === 'none') throw new Error(`${name}: mobile navigation toggle is hidden`);
  if (width >= 700 && layout.navToggleDisplay !== 'none') throw new Error(`${name}: desktop navigation toggle is visible`);

  if (width < 700) {
    const toggle = page.locator('.nav-toggle');
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error(`${name}: mobile menu did not open`);
    if (await page.locator('.site-navigation').getAttribute('data-open') !== 'true') throw new Error(`${name}: mobile navigation state did not update`);
    await toggle.click();
  }

  const searchTab = page.getByRole('tab', { name: 'search' });
  await searchTab.click();
  if (await searchTab.getAttribute('aria-selected') !== 'true') throw new Error(`${name}: search tab was not selected`);
  if (!(await page.locator('#panel-search').isVisible())) throw new Error(`${name}: search panel stayed hidden`);
  await searchTab.press('ArrowRight');
  if (await page.getByRole('tab', { name: 'mcp' }).getAttribute('aria-selected') !== 'true') throw new Error(`${name}: keyboard tab navigation failed`);

  const accessibility = await new AxeBuilder({ page }).analyze();
  const seriousViolations = accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
  if (seriousViolations.length) {
    throw new Error(`${name}: serious accessibility violations: ${seriousViolations.map(({ id, nodes }) => `${id} (${nodes.map(({ target }) => target.join(' ')).join(', ')})`).join(', ')}`);
  }

  const screenshot = path.join(outputDirectory, `${name}.png`);
  await page.evaluate(() => window.scrollTo(0, 0));
  const capture = await cdp.send('Page.captureScreenshot', {
    captureBeyondViewport: false,
    format: 'png',
    fromSurface: true,
  });
  await fs.writeFile(screenshot, Buffer.from(capture.data, 'base64'));

  results.push({
    accessibilityViolations: accessibility.violations.length,
    consoleErrors,
    failedRequests,
    layout,
    name,
    screenshot,
  });

  if (consoleErrors.length) throw new Error(`${name}: console errors: ${consoleErrors.join(' | ')}`);
  if (failedRequests.length) throw new Error(`${name}: failed requests: ${failedRequests.join(' | ')}`);

  await page.close();
}

await verifyViewport('desktop-1440', 1440, 900);
await verifyViewport('tablet-768', 768, 900);
await verifyViewport('mobile-375', 375, 812);
await verifyViewport('mobile-320', 320, 700);

console.log(JSON.stringify({ ok: true, results }, null, 2));
await browser.close();
