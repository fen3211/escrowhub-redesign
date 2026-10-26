const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const shots = [
  { name: 'home-1440', url: 'index.html', width: 1440, height: 1000 },
  { name: 'home-390', url: 'index.html', width: 390, height: 844 },
  { name: 'catalog-1440', url: 'catalog.html', width: 1440, height: 1000 },
  { name: 'catalog-390', url: 'catalog.html', width: 390, height: 844 },
  { name: 'product-1440', url: 'product.html?id=spotify', width: 1440, height: 1000 },
  { name: 'product-390', url: 'product.html?id=spotify', width: 390, height: 844 },
  { name: 'orders-1440', url: 'orders.html', width: 1440, height: 1000 },
  { name: 'orders-390', url: 'orders.html', width: 390, height: 844 },
  { name: 'seller-1440', url: 'seller.html', width: 1440, height: 1000 },
  { name: 'seller-390', url: 'seller.html', width: 390, height: 844 },
  { name: 'create-1440', url: 'create.html?edit=spotify', width: 1440, height: 1000 },
  { name: 'create-390', url: 'create.html?edit=spotify', width: 390, height: 844 },
];

(async () => {
  const out = path.join(__dirname, '..', 'shots');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromium.executablePath(), headless: true });
  for (const shot of shots) {
    const context = await browser.newContext({ viewport: { width: shot.width, height: shot.height }, deviceScaleFactor: 1, locale: 'ru-RU' });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('http://127.0.0.1:8123/' + shot.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, shot.name + '.png'), fullPage: true });
    const dims = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
      title: document.title,
    }));
    console.log(shot.name, JSON.stringify(dims), errors.length ? 'ERRORS: ' + errors.join(' | ') : 'ok');
    await context.close();
  }
  await browser.close();
})();
