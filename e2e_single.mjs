import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
const PORT = 18960;
const ROOT = process.cwd();
const server = http.createServer((req, res) => {
  let fp = path.join(ROOT, req.url === '/' ? 'docs/index.html' : req.url);
  if (fp.endsWith('/')) fp += 'index.html';
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { 'Content-Type': ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : 'text/css' });
    res.end(d);
  });
});
server.listen(PORT, async () => {
  console.log(`listening on ${PORT}`);
  const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', m => console.log('CON', m.type(), m.text()));
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.setInputFiles('input[type="file"]', '/home/deck/Pictures/Photos-1-001/PXL_20260804_104037876.jpg');
  await page.waitForTimeout(2000);
  await page.waitForFunction(() => !document.getElementById('preview').classList.contains('hidden'));
  const res = await page.evaluate(() => {
    const img = document.getElementById('preview');
    const r = img.getBoundingClientRect();
    return { imgW: img.naturalWidth, imgH: img.naturalHeight, elW: r.width, elH: r.height, elLeft: r.left, elTop: r.top };
  });
  console.log('preview rect:', res);
  // check crop mode toggle
  const cropBtnDisabled = await page.$eval('#cropBtn', el => el.disabled);
  console.log('cropBtn disabled:', cropBtnDisabled);
  await b.close();
  server.close();
});
