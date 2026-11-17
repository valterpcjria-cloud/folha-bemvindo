const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 2000));
  
  // Set fake login state
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'fake_token');
    localStorage.setItem('user_info', JSON.stringify({id: 1, nome: "Admin", perfil: "SUPERADMIN", email: "admin@admin"}));
  });
  
  await page.goto('http://localhost:3000/dashboard');
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
