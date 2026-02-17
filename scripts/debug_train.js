const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const LOG_FILE = path.join(__dirname, 'debug_train_output.txt');

function log(msg) {
    console.log(msg);
    try {
        fs.appendFileSync(LOG_FILE, msg + '\r\n');
    } catch (e) { }
}

async function triggerTrain() {
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
    log('--- START MANUAL TRAINING ---');

    try {
        log('Calling /api/face/train...');
        const res = await axios.post(BASE_URL + '/api/face/train');
        log('Response: ' + JSON.stringify(res.data, null, 2));
    } catch (e) {
        log('Error: ' + e.message);
        if (e.response) {
            log('Data: ' + JSON.stringify(e.response.data));
        }
    }
}

triggerTrain();
