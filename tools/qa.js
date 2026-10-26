const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8123/';
const OUT = path.join(__dirname, '..', 'deliverables', 'qa');
fs.mkdirSync(OUT, { recursive: true });

const browserErrors = [];
const failed = [];

function check(name, condition, detail = '') {
  if (condition) console.log('PASS', name);
  else {
    console.log('FAIL', name, detail);
    failed.push(name + (detail ? ' — ' + detail : ''));
  }
}

async function setup(browser, url, width = 1440, height = 1000) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'ru-RU', deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => browserErrors.push(url + ': ' + error.message));
  page.on('console', (msg) => { if (msg.type() === 'error') browserErrors.push(url + ': ' + msg.text()); });
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  return { context, page };
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromium.executablePath(), headless: true });

  /* HOME desktop */
  {
    const { context, page } = await setup(browser, 'index.html');
    check('home: category pills rendered', (await page.locator('.cat-pill').count()) >= 8);
    await page.fill('#global-search', 'Steam');
    await page.waitForTimeout(150);
    check('home: search suggestions show', await page.locator('#search-pop').isVisible());
    await page.click('.services-card [data-topup-open="steam"]');
    check('home: top-up modal opens', await page.locator('#topup-overlay').evaluate((el) => el.classList.contains('is-open')));
    await page.keyboard.press('Escape');
    check('home: top-up modal closes', !(await page.locator('#topup-overlay').evaluate((el) => el.classList.contains('is-open'))));
    await page.click('[data-open-login]');
    check('home: login modal opens', await page.locator('#login-overlay').evaluate((el) => el.classList.contains('is-open')));
    await page.fill('#login-email', 'demo@example.com');
    await page.click('[data-login-form] button[type="submit"]');
    check('home: login step 2 visible', await page.locator('[data-login-step="2"]').isVisible());
    await page.fill('#login-code', '1234');
    await page.click('[data-login-form] [data-login-step="2"] button[type="submit"]');
    check('home: login modal closes', !(await page.locator('#login-overlay').evaluate((el) => el.classList.contains('is-open'))));
    await page.screenshot({ path: path.join(OUT, 'home-1440.png'), fullPage: true });
    await context.close();
  }

  /* HOME mobile overlays */
  {
    const { context, page } = await setup(browser, 'index.html', 390, 844);
    await page.click('.mobile-tabbar [data-open-search]');
    check('home mobile: search sheet opens', await page.locator('#search-sheet').isVisible());
    await page.keyboard.press('Escape');
    check('home mobile: search sheet closes', await page.locator('#search-sheet').isHidden());
    await page.click('.burger');
    check('home mobile: drawer opens', await page.locator('#mobile-drawer').evaluate((el) => el.classList.contains('is-open')));
    await page.screenshot({ path: path.join(OUT, 'home-mobile-menu.png') });
    await page.keyboard.press('Escape');
    check('home mobile: drawer closes', !(await page.locator('#mobile-drawer').evaluate((el) => el.classList.contains('is-open'))));
    await page.screenshot({ path: path.join(OUT, 'home-390.png'), fullPage: true });
    await context.close();
  }

  /* CATALOG */
  {
    const { context, page } = await setup(browser, 'catalog.html');
    check('catalog: 8 initial items', (await page.locator('[data-catalog-grid] .lot').count()) === 8);
    await page.locator('[data-category-filter][value="accounts"]').check();
    check('catalog: accounts filter returns 4', (await page.locator('[data-catalog-grid] .lot').count()) === 4);
    check('catalog: URL contains category', page.url().includes('category=accounts'));
    await page.click('[data-sort="price_asc"]');
    check('catalog: first sorted price is 50', (await page.locator('[data-catalog-grid] .lot .lot__price b').first().innerText()).includes('50'));
    await page.click('[data-reset-filters]');
    check('catalog: reset returns 8', (await page.locator('[data-catalog-grid] .lot').count()) === 8);
    await page.fill('[data-filter-query]', 'zzzz');
    await page.waitForTimeout(320);
    check('catalog: empty state visible', await page.locator('[data-empty]').isVisible());
    check('catalog: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await page.screenshot({ path: path.join(OUT, 'catalog-empty-1440.png'), fullPage: true });
    await page.screenshot({ path: path.join(OUT, 'catalog-1440.png'), fullPage: false });
    await context.close();
  }

  /* CATALOG mobile filters */
  {
    const { context, page } = await setup(browser, 'catalog.html', 390, 844);
    await page.click('[data-open-filters]');
    check('catalog mobile: filter sheet opens', await page.locator('#filter-panel').evaluate((el) => el.classList.contains('is-open')));
    await page.locator('[data-category-filter][value="accounts"]').check();
    await page.screenshot({ path: path.join(OUT, 'catalog-mobile-filters.png') });
    await page.click('[data-apply-filters]');
    await page.waitForTimeout(350);
    check('catalog mobile: filter sheet closes', !(await page.locator('#filter-panel').evaluate((el) => el.classList.contains('is-open'))));
    check('catalog mobile: results filtered', (await page.locator('[data-catalog-grid] .lot').count()) === 4);
    await page.screenshot({ path: path.join(OUT, 'catalog-390.png'), fullPage: true });
    await context.close();
  }

  /* PRODUCT desktop */
  {
    const { context, page } = await setup(browser, 'product.html?id=spotify');
    check('product: title rendered', (await page.locator('[data-product-title]').innerText()).includes('Spotify Premium'));
    await page.click('[data-qty-plus]');
    check('product: quantity total updates to 100 ₽', (await page.locator('[data-product-total]').first().innerText()).includes('100'));
    await page.click('[data-open-checkout]');
    check('product: checkout opens', await page.locator('#checkout-overlay').evaluate((el) => el.classList.contains('is-open')));
    await page.screenshot({ path: path.join(OUT, 'product-checkout-1440.png') });
    await page.click('[data-confirm-order]');
    check('product: success step visible', await page.locator('[data-checkout-step="2"]').isVisible());
    await page.screenshot({ path: path.join(OUT, 'product-checkout-success-1440.png') });
    await page.locator('[data-checkout-step="2"]').getByRole('button', { name: 'Вернуться к товару' }).click();
    check('product: checkout closes', !(await page.locator('#checkout-overlay').evaluate((el) => el.classList.contains('is-open'))));
    await page.click('[data-open-chat]');
    check('product: chat opens', await page.locator('#chat-overlay').evaluate((el) => el.classList.contains('is-open')));
    await page.fill('#chat-message', 'Здравствуйте, аккаунт в наличии?');
    await page.locator('[data-chat-form] button[type="submit"]').click();
    check('product: chat message appears', (await page.locator('.chat-bubble--me').count()) === 1);
    await page.screenshot({ path: path.join(OUT, 'product-chat-1440.png') });
    await page.keyboard.press('Escape');
    await page.locator('[data-fav]').first().click();
    check('product: favourite toggles', (await page.locator('[data-fav]').first().getAttribute('aria-pressed')) === 'true');
    await page.screenshot({ path: path.join(OUT, 'product-1440.png'), fullPage: true });
    await context.close();
  }

  /* PRODUCT mobile */
  {
    const { context, page } = await setup(browser, 'product.html?id=spotify', 390, 844);
    check('product mobile: buybar visible', await page.locator('[data-mobile-buybar]').isVisible());
    await page.locator('[data-mobile-buybar] [data-open-checkout]').click();
    check('product mobile: checkout opens', await page.locator('#checkout-overlay').evaluate((el) => el.classList.contains('is-open')));
    await page.screenshot({ path: path.join(OUT, 'product-mobile-checkout.png') });
    await page.keyboard.press('Escape');
    await page.screenshot({ path: path.join(OUT, 'product-390.png'), fullPage: true });
    await context.close();
  }

  /* ORDERS */
  {
    const { context, page } = await setup(browser, 'orders.html');
    check('orders: two demo orders', (await page.locator('[data-order-card]').count()) === 2);
    await page.locator('[data-confirm]').click();
    check('orders: confirm modal opens', await page.locator('#confirm-overlay').evaluate((el) => el.classList.contains('is-open')));
    await page.screenshot({ path: path.join(OUT, 'orders-confirm-1440.png') });
    await page.click('[data-confirm-submit]');
    check('orders: completed tab selected', (await page.locator('[data-orders-tab="completed"]').getAttribute('class')).includes('is-active'));
    check('orders: completed count is 2', (await page.locator('[data-stat="completed"]').innerText()) === '2');
    await page.screenshot({ path: path.join(OUT, 'orders-completed-1440.png'), fullPage: true });
    await context.close();
  }

  /* ORDERS dispute on fresh state */
  {
    const { context, page } = await setup(browser, 'orders.html', 390, 844);
    await page.locator('[data-dispute]').click();
    check('orders mobile: dispute modal opens', await page.locator('#dispute-overlay').evaluate((el) => el.classList.contains('is-open')));
    await page.selectOption('#dispute-reason', { label: 'Не соответствует описанию' });
    await page.screenshot({ path: path.join(OUT, 'orders-mobile-dispute.png') });
    await page.locator('[data-dispute-form] button[type="submit"]').click();
    check('orders mobile: dispute tab selected', (await page.locator('[data-orders-tab="disputes"]').getAttribute('class')).includes('is-active'));
    await page.screenshot({ path: path.join(OUT, 'orders-390.png'), fullPage: true });
    await context.close();
  }

  /* SELLER */
  {
    const { context, page } = await setup(browser, 'seller.html');
    check('seller: overview panel visible', await page.locator('[data-seller-panel="overview"]').isVisible());
    await page.locator('[data-seller-tab="listings"]').first().click();
    check('seller: listings tab shows 9 rows', (await page.locator('[data-listings-body] tr').count()) === 9);
    await page.screenshot({ path: path.join(OUT, 'seller-listings-1440.png'), fullPage: true });
    const pauseBtn = page.locator('[data-listing-action="pause"]').first();
    await pauseBtn.click();
    check('seller: pause updates active count', (await page.locator('[data-seller-stat="active"]').innerText()) === '7');
    await page.locator('[data-seller-tab="wallet"]').first().click();
    check('seller: wallet deep link hash', page.url().includes('#wallet'));
    await page.screenshot({ path: path.join(OUT, 'seller-wallet-1440.png') });
    await page.goto(BASE + 'seller.html#wallet', { waitUntil: 'networkidle' });
    check('seller: wallet opens from hash', await page.locator('[data-seller-panel="wallet"]').isVisible());
    await page.screenshot({ path: path.join(OUT, 'seller-1440.png'), fullPage: true });
    await context.close();
  }

  /* SELLER mobile */
  {
    const { context, page } = await setup(browser, 'seller.html', 390, 844);
    check('seller mobile: mobile tabs visible', await page.locator('.seller-mobile-tabs').isVisible());
    await page.locator('.seller-mobile-tabs [data-seller-tab="wallet"]').click();
    check('seller mobile: wallet panel visible', await page.locator('[data-seller-panel="wallet"]').isVisible());
    await page.screenshot({ path: path.join(OUT, 'seller-390.png'), fullPage: true });
    await context.close();
  }

  /* CREATE */
  {
    const { context, page } = await setup(browser, 'create.html');
    await page.click('[data-publish]');
    check('create: validation shows errors', (await page.locator('.field.has-error').count()) >= 4);
    await page.fill('[data-create-name]', 'Telegram Premium — подписка');
    await page.selectOption('[data-create-category]', 'subscriptions');
    await page.fill('[data-create-price]', '990');
    await page.fill('[data-create-stock]', '10');
    await page.fill('[data-create-region]', 'Россия');
    await page.fill('[data-create-description]', 'Подписка Telegram Premium на 3 месяца. Передача данных после оплаты в чате сделки. Проверьте условия до подтверждения.');
    await page.check('[data-create-terms]');
    await page.screenshot({ path: path.join(OUT, 'create-filled-1440.png'), fullPage: true });
    await page.click('[data-publish]');
    check('create: publish modal opens', await page.locator('#publish-overlay').evaluate((el) => el.classList.contains('is-open')));
    await page.screenshot({ path: path.join(OUT, 'create-success.png') });
    await context.close();
  }

  /* CREATE edit mobile */
  {
    const { context, page } = await setup(browser, 'create.html?edit=spotify', 390, 844);
    check('create edit: name prefilled', (await page.inputValue('[data-create-name]')).includes('Spotify'));
    await page.screenshot({ path: path.join(OUT, 'create-390.png'), fullPage: true });
    await context.close();
  }

  /* current screenshots for case */
  {
    const { context, page } = await setup(browser, 'index.html', 1440, 1000);
    await page.screenshot({ path: path.join(OUT, 'home-final-1440.png'), fullPage: true });
    await context.close();
  }

  await browser.close();

  console.log('\nConsole/page errors:', browserErrors.length ? browserErrors : 'none');
  console.log('Failed checks:', failed.length ? failed : 'none');
  process.exit(failed.length || browserErrors.length ? 1 : 0);
})();
