/**
 * HƯỚNG DẪN DI CƯ DỮ LIỆU LÊN RENDER
 * 
 * Lưu ý: Bạn cần cài đặt PostgreSQL (psql) trên máy local để chạy lệnh này.
 */

const { exec } = require('child_process');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'school_manager_pro';
const dbUser = process.env.DB_USER || 'postgres';
const outputFile = 'school_manager_backup.sql';

console.log("--- CÔNG CỤ HỖ TRỢ DI CƯ DỮ LIỆU ---");
console.log(`1. Export dữ liệu từ máy local:`);
console.log(`   Lệnh: pg_dump -U ${dbUser} -d ${dbName} --no-owner --no-privileges > ${outputFile}`);
console.log("");
console.log(`2. Sau khi đã có file ${outputFile}:`);
console.log(`   - Truy cập vào Render Dashboard -> Databases -> school-manager-db`);
console.log(`   - Copy "External Connection String"`);
console.log(`   - Chạy lệnh để đẩy dữ liệu lên Render (Thay <EXTERNAL_URL> bằng chuỗi vừa copy):`);
console.log(`   Lệnh: psql <EXTERNAL_URL> -f ${outputFile}`);
console.log("");
console.log(`--- LƯU Ý QUAN TRỌNG ---`);
console.log(`- Trên Vercel: Bạn cần vào Environmental Variables và thêm:`);
console.log(`  VITE_API_BASE_URL = https://your-render-app-url.onrender.com`);
console.log(`- Trên Render: Bạn cần vào Environment và thêm:`);
console.log(`  VERCEL_URL = https://tempduan.vercel.app`);
console.log(`  GEMINI_API_KEY = (Khóa của bạn)`);
