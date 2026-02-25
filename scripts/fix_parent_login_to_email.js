const { pool } = require('../backend/config/db');
const bcrypt = require('bcrypt');

function toSlug(name) {
    const map = {
        à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a',
        ă: 'a', ắ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a',
        â: 'a', ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
        è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
        ê: 'e', ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e',
        ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
        ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o',
        ô: 'o', ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
        ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
        ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
        ư: 'u', ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u',
        ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
        đ: 'd',
        À: 'a', Á: 'a', Ả: 'a', Ã: 'a', Ạ: 'a',
        Ă: 'a', Ắ: 'a', Ằ: 'a', Ẳ: 'a', Ẵ: 'a', Ặ: 'a',
        Â: 'a', Ấ: 'a', Ầ: 'a', Ẩ: 'a', Ẫ: 'a', Ậ: 'a',
        È: 'e', É: 'e', Ẻ: 'e', Ẽ: 'e', Ẹ: 'e',
        Ê: 'e', Ế: 'e', Ề: 'e', Ể: 'e', Ễ: 'e', Ệ: 'e',
        Ì: 'i', Í: 'i', Ỉ: 'i', Ĩ: 'i', Ị: 'i',
        Ò: 'o', Ó: 'o', Ỏ: 'o', Õ: 'o', Ọ: 'o',
        Ô: 'o', Ố: 'o', Ồ: 'o', Ổ: 'o', Ổ: 'o', Ộ: 'o',
        Ơ: 'o', Ớ: 'o', Ờ: 'o', Ở: 'o', Ỡ: 'o', Ợ: 'o',
        Ù: 'u', Ú: 'u', Ủ: 'u', Ũ: 'u', Ụ: 'u',
        Ư: 'u', Ứ: 'u', Ừ: 'u', Ử: 'u', Ữ: 'u', Ự: 'u',
        Ỳ: 'y', Ý: 'y', Ỷ: 'y', Ỹ: 'y', Ỵ: 'y',
        Đ: 'd'
    };
    return name
        .split('')
        .map(c => map[c] || c)
        .join('')
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
}

async function fixParentLoginsToEmail() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lấy tất cả học sinh
        const { rows: students } = await client.query('SELECT id, student_code, full_name FROM students');
        let fixedCount = 0;

        for (const student of students) {
            // Tìm user của tài khoản phụ huynh tương ứng với học sinh
            const { rows: links } = await client.query(
                `SELECT p.id as parent_id, p.user_id 
                 FROM student_parents sp 
                 JOIN parents p ON p.id = sp.parent_id 
                 WHERE sp.student_id = $1 LIMIT 1`,
                [student.id]
            );

            const defaultPassword = student.student_code; // Mật khẩu là mã học sinh
            const passwordHash = await bcrypt.hash(defaultPassword, 10);

            // Xây dựng email theo định dạng ph.<ten_hoc_sinh>@school.local
            const slug = toSlug(student.full_name);
            const parentEmail = `ph.${slug}@school.local`;

            if (links.length > 0) {
                const userId = links[0].user_id;

                // Tránh lỗi duplicate key nếu email bị trùng
                const existing = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [parentEmail, userId]);
                if (existing.rows.length === 0) {
                    await client.query(
                        `UPDATE users 
                         SET email = $1, password_hash = $2, must_change_password = true, is_active = true 
                         WHERE id = $3`,
                        [parentEmail, passwordHash, userId]
                    );
                    fixedCount++;
                } else {
                    console.log(`Bỏ qua cập nhật email bị trùng cho học sinh ${student.full_name}: ${parentEmail}`);
                }
            }
        }

        await client.query('COMMIT');
        console.log(`\nĐã cập nhật thành công ${fixedCount} tài khoản phụ huynh!`);
        console.log(`Định dạng chuẩn: Email = ph.[tên_tiếng_việt_không_dấu]@school.local, Mật khẩu = [mã_học_sinh]`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Lỗi fix logic:', err);
    } finally {
        client.release();
    }
}

fixParentLoginsToEmail().then(() => pool.end());
