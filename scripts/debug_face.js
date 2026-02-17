const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const LOG_FILE = path.join(__dirname, 'debug_output.txt');

function log(msg) {
    console.log(msg);
    try {
        fs.appendFileSync(LOG_FILE, msg + '\r\n');
    } catch (e) { }
}

async function testBackend() {
    // Clear log
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

    log('--- START DEBUG FACE BACKEND ---');

    // 1. Check Config
    log('1. Checking Server...');
    try {
        const res = await axios.get(BASE_URL + '/api/summary');
        log('   [OK] Server is running. Summary: ' + JSON.stringify(res.data));
    } catch (e) {
        log('   [FAIL] Server unreachable: ' + e.message);
        return; // Stop if server down
    }

    // 2. Check Train Candidates
    try {
        log('\n2. Checking Train Candidates...');
        const res = await axios.get(BASE_URL + '/api/face/train/candidates');
        log(`   [OK] Found ${res.data.eligible_students} eligible students.`);
        if (res.data.eligible_students === 0) {
            log('   [WARN] No students with avatar_url found! Training will fail.');
        } else {
            // Log first sample
            if (res.data.students && res.data.students.length > 0) {
                log('   Sample: ' + JSON.stringify(res.data.students[0]));
            }
        }
    } catch (e) {
        log('   [FAIL] Candidates API: ' + e.message);
    }

    // 3. Test Detect (Mock)
    log('\n3. Testing Detect API (Mock)...');
    try {
        // Create 1x1 dummy jpg
        const dummyPath = path.join(__dirname, 'dummy.jpg');
        // Simple 1x1 white pixel base64 -> jpg
        const buffer = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwACAgICAgIDAgIDBQMDAwUGBQUFBQYIBgYGBgYICggICAgICAoKCgoKCgoKDAwMDAwMDg4ODg4PDw8PDw8PDw8P/9sAQwECAgIEBAQHBAQHEAoIChAQEBAQEA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8P/90ABAAFAAP/2gAIAEAAPwA/8A//2Q==', 'base64');
        fs.writeFileSync(dummyPath, buffer);

        const form = new FormData();
        form.append('image', fs.createReadStream(dummyPath));

        const res = await axios.post(BASE_URL + '/api/face/detect', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        log('   [OK] Detect Response: ' + JSON.stringify(res.data));
    } catch (e) {
        log('   [FAIL] Detect API: ' + e.message);
        if (e.response) {
            log('   Data: ' + JSON.stringify(e.response.data));
        }
    }
}

testBackend();
