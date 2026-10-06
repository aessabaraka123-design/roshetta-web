const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.static('C:/Users/XPRISTO/Documents/antigravity/gallant-maxwell/roshetta_web_build'));

app.listen(3099, async () => {
    console.log('Server running on 3099');
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
        
        await page.goto('http://localhost:3099', { waitUntil: 'networkidle2' });
        
        setTimeout(async () => {
            await browser.close();
            process.exit(0);
        }, 3000);
    } catch(e) {
        console.log(e);
        process.exit(1);
    }
});