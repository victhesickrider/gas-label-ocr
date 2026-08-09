import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 19607;
const ROOT = '.';

const server = http.createServer((req, res) => {
  const fp = path.join(ROOT, req.url === '/' ? 'docs/index.html' : req.url);
  fs.readFile(fp, (err, data) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[ERR]', e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof ZXing !== 'undefined', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.setInputFiles('input[type="file"]', '/home/deck/Pictures/Photos-1-001/PXL_20260804_104057719.jpg');
  await page.waitForTimeout(2000);
  await page.click('#decodeFullBtn').catch(() => {});
  await page.waitForTimeout(8000);
  await page.click('#autoFillBtn').catch(() => {});
  await page.waitForTimeout(6000);
  const fields = await page.evaluate(() => {
    const rows = document.querySelectorAll('#fields .field');
    return Array.from(rows).map(r => ({
      k: r.querySelector('label').textContent.trim(),
      v: r.querySelector('input').value
    })).filter(f => f.v);
  });
  console.log('=== Result ===');
  for (const f of fields) console.log(f.k + ': ' + f.v);
  console.log('Count:', fields.length);
  await browser.close();
  server.close();
});