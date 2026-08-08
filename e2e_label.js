import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 18926;
const ROOT = process.cwd();

const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, req.url === '/' ? 'docs/index.html' : req.url);
  if (filePath.endsWith('/')) filePath += 'index.html';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    const ct = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
});

server.listen(PORT, async () => {
  console.log(` Serving on http://localhost:${PORT}`);
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('CON', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERR', err.message));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Upload a real label photo
  const photo = '/home/deck/Pictures/Photos-1-001/PXL_20260804_104037876.jpg';
  const input = await page.$('input[type="file"]');
  await input.setInputFiles(photo);
  await page.waitForTimeout(2000);

  // Click decode full image
  await page.click('#decodeFullBtn');
  await page.waitForTimeout(45000);

  // Screenshots
  await page.screenshot({ path: '/tmp/label_e2e_idle.png', fullPage: true });
  await page.screenshot({ path: '/tmp/label_e2e_done.png', fullPage: true });

  // Diagnostics + fields
  const diag = await page.$eval('#diag', el => el.textContent).catch(() => 'NO DIAG');
  const fields = await page.$$eval('#fields .field', rows =>
    rows.map(r => ({
      label: r.querySelector('label')?.textContent?.trim(),
      value: r.querySelector('input')?.value || '',
      src: r.querySelector('.src')?.textContent?.trim()
    }))
  );
  const libStatus = await page.$eval('#libStatus', el => el.textContent).catch(() => 'NO STATUS');
  const busyHidden = await page.$eval('#busy', el => el.classList.contains('hidden')).catch(() => 'NO BUSY');

  console.log('--- DIAGNOSTICS ---');
  console.log(diag);
  console.log('--- LIB STATUS ---');
  console.log(libStatus);
  console.log('--- BUSY HIDDEN ---');
  console.log(String(busyHidden));
  console.log('--- FIELDS ---');
  for (const f of fields) console.log(JSON.stringify(f));

  // Pass/fail: at least one field should be auto-filled, or barcode/ocr layers must have found something
  const anyAuto = fields.some(f => f.value && f.src === 'auto');
  const hasBarcode = /Barcode:/.test(diag);
  const hasOcrWords = /OCR: \d+ words/.test(diag);
  console.log('--- E2E RESULT ---');
  console.log(anyAuto ? 'PASS: auto-filled fields detected' : 'INFO: no auto fields (check barcode/OCR layers below)');
  console.log(hasBarcode ? 'PASS: barcode layer ran' : 'WARN: barcode layer did not report results');
  console.log(hasOcrWords ? 'PASS: OCR layer ran' : 'WARN: OCR layer did not run or found 0 words');

  await browser.close();
  server.close();
});
