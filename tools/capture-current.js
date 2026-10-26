const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'research', 'current');
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  { name: 'home-desktop', url: 'https://escrowhub.online/', width: 1440, height: 1000 },
  { name: 'catalog-desktop', url: 'https://escrowhub.online/catalog', width: 1440, height: 1000 },
  { name: 'product-desktop', url: 'https://escrowhub.online/about/3a9f693a-1467-4774-b359-bcc8bef1e691', width: 1440, height: 1000 },
  { name: 'seller-desktop', url: 'https://escrowhub.online/users/iewc', width: 1440, height: 1000 },
  { name: 'create-desktop', url: 'https://escrowhub.online/create', width: 1440, height: 1000 },
  { name: 'login-desktop', url: 'https://escrowhub.online/login', width: 1440, height: 1000 },
  { name: '404-desktop', url: 'https://escrowhub.online/search?q=test', width: 1440, height: 1000 },
  { name: 'home-mobile', url: 'https://escrowhub.online/', width: 390, height: 844 },
  { name: 'catalog-mobile', url: 'https://escrowhub.online/catalog', width: 390, height: 844 },
  { name: 'product-mobile', url: 'https://escrowhub.online/about/3a9f693a-1467-4774-b359-bcc8bef1e691', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch({
    executablePath: chromium.executablePath(),
    headless: true,
  });
  for (const p of pages) {
    const context = await browser.newContext({
      viewport: { width: p.width, height: p.height },
      deviceScaleFactor: 1,
      locale: 'ru-RU',
    });
    const page = await context.newPage();
    try {
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${p.name}.png`), fullPage: true });
      console.log('saved', p.name);
    } catch (e) {
      console.error('failed', p.name, e.message);
      try {
        await page.screenshot({ path: path.join(OUT, `${p.name}-error.png`), fullPage: false });
      } catch {}
    } finally {
      await context.close();
    }
  }
  await browser.close();
})();
