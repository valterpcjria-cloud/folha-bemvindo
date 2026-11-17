import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    console.log("Typing credentials and clicking login...");
    await page.type('input[type="email"]', 'admin@empresa.com.br');
    await page.type('input[type="password"]', 'admin123');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
    ]);

    console.log("Current URL after login:", page.url());
    
    // Check if the body contains anything
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    if(bodyHTML.length < 500) {
        console.log("Body HTML is very small: ", bodyHTML);
    } else {
        console.log("Body HTML length:", bodyHTML.length);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Done.");
    await browser.close();
})();
