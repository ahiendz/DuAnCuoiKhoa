// Script: find_student_user.js
// Mục đích: Tìm thông tin tài khoản user/email cho học sinh "Lý Anh Hiển" lớp 9A3 (student_code: HS2026-309)

const { pool } = require('../backend/config/db');

async function main() {
  try {
    // 1. Tìm student_id từ student_code
    const studentRes = await pool.query(
      'SELECT id, full_name, class_id FROM students WHERE student_code = $1',
      ['HS2026-309']
    );
    if (studentRes.rows.length === 0) {
      console.log('Không tìm thấy học sinh với student_code HS2026-309');
      process.exit(1);
    }
    const student = studentRes.rows[0];
    console.log('Student:', student);

    // 2. Tìm parent_id từ parent_students
    const parentLinkRes = await pool.query(
      'SELECT parent_id FROM parent_students WHERE student_id = $1',
      [student.id]
    );
    if (parentLinkRes.rows.length === 0) {
      console.log('Không tìm thấy parent liên kết với học sinh này');
      process.exit(1);
    }
    const parent_id = parentLinkRes.rows[0].parent_id;
    console.log('Parent ID:', parent_id);

    // 3. Tìm user_id từ parents
    const parentRes = await pool.query(
      'SELECT user_id FROM parents WHERE id = $1',
      [parent_id]
    );
    if (parentRes.rows.length === 0) {
      console.log('Không tìm thấy user_id cho parent');
      process.exit(1);
    }
    const user_id = parentRes.rows[0].user_id;
    console.log('User ID:', user_id);

    // 4. Lấy thông tin user (email, password_hash, name, role)
    const userRes = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE id = $1',
      [user_id]
    );
    if (userRes.rows.length === 0) {
      console.log('Không tìm thấy user trong bảng users');
      process.exit(1);
    }
    const user = userRes.rows[0];
    console.log('User info:', user);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi:', err);
    process.exit(1);
  }
}

main();
