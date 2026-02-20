
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('Launching browser...');
    // Launch a visible browser using system Chrome
    const browser = await puppeteer.launch({
        headless: false, // Show the browser
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        defaultViewport: null, // Use window size
        args: ['--start-maximized'] // Maximize window
    });

    const page = await browser.newPage();

    try {
        console.log('Navigating to login page...');
        await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

        // Select "Phụ huynh" role
        console.log('Selecting Parent role...');
        const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const parentBtn = buttons.find(b => b.textContent.includes('Phụ huynh'));
            if (parentBtn) {
                parentBtn.click();
                return true;
            }
            return false;
        });

        if (clicked) {
            await new Promise(r => setTimeout(r, 500)); // wait for state update
        } else {
            console.error('Could not find Parent role button');
        }

        // Fill in credentials
        console.log('Filling in login form...');
        // Email input is type="text" in Login.jsx
        await page.type('input[placeholder="email@school.com"]', 'ph.ly.anh.hien@school.local', { delay: 50 });
        await page.type('input[type="password"]', 'huhu18072011', { delay: 50 });

        // Submit form
        console.log('Clicking login...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);

        console.log('Login successful! Waiting for dashboard...');

        // Log current URL
        console.log('Current URL:', page.url());

        // Take a screenshot of current state
        await page.screenshot({ path: path.resolve('debug_login_state.png') });
        console.log('Saved debug screenshot to debug_login_state.png');

        // Wait for dashboard content to load
        // Look for body first
        await page.waitForSelector('body', { timeout: 5000 });

        // Take a screenshot of the dashboard
        const dashboardScreenshotPath = path.resolve('dashboard_screenshot.png');
        await page.screenshot({ path: dashboardScreenshotPath });
        console.log(`Saved screenshot to: ${dashboardScreenshotPath}`);

        // Small delay to let user see
        await new Promise(r => setTimeout(r, 5000));

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
})();
