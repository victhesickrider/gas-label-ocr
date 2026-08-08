import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
const PORT = 18927, ROOT = process.cwd();
const server = http.createServer((req,res)=>{
  let fp = path.join(ROOT, req.url==='/'?'docs/tesseract-debug.html':req.url);
  if (fp.endsWith('/')) fp += 'index.html';
  fs.readFile(fp,(e,d)=>{ if(e){res.writeHead(404);res.end('nf');return;}
    const ext=path.extname(fp).toLowerCase();
    const ct=ext==='.html'?'text/html':ext==='.js'?'application/javascript':'application/octet-stream';
    res.writeHead(200,{'Content-Type':ct});res.end(d);});
});
server.listen(PORT, async ()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  page.on('console',m=>console.log('CON',m.type(),m.text().slice(0,300)));
  page.on('pageerror',e=>console.log('PAGEERR',e.message));
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
  await page.setInputFiles('input[type="file"]','/home/deck/Pictures/Photos-1-001/PXL_20260804_104037876.jpg');
  await page.waitForTimeout(60000); // wait OCR to finish
  const out=await page.$eval('pre',el=>el.textContent).catch(()=>'NO PRE');
  console.log('=== DEBUG OUTPUT ===');
  console.log(out);
  await browser.close();server.close();
});
