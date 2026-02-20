
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Chạy ẩn cũng được vì tôi chỉ cần lấy file ảnh
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log('--- Đang truy cập Login ---');
        await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

        // Chọn vai trò Phụ huynh
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const parentBtn = buttons.find(b => b.textContent.includes('Phụ huynh'));
            if (parentBtn) parentBtn.click();
        });
        await new Promise(r => setTimeout(r, 500));

        await page.type('input[placeholder="email@school.com"]', 'ph.ly.anh.hien@school.local');
        await page.type('input[type="password"]', 'huhu18072011');

        console.log('--- Đăng nhập ---');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);

        console.log('--- Đang ở Dashboard, chụp ảnh để tôi xem ---');
        // Chờ dữ liệu load xong (ví dụ chờ cái card hiển thị)
        await page.waitForSelector('.grid', { timeout: 10000 });

        await page.screenshot({ path: path.resolve('look_at_dashboard.png'), fullPage: true });
        console.log('Đã chụp ảnh: look_at_dashboard.png');

    } catch (e) {
        console.error('Lỗi khi chụp ảnh:', e);
        // Chụp ảnh lỗi nếu có
        await page.screenshot({ path: path.resolve('error_state.png') });
    } finally {
        await browser.close();
    }
})();
