const { pool } = require('../backend/config/db');
const bcrypt = require('bcrypt');

async function fixParentLogins() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lấy tất cả học sinh
        const { rows: students } = await client.query('SELECT id, student_code, full_name FROM students');
        let fixedCount = 0;

        for (const student of students) {
            // Tìm parent của học sinh này
            const { rows: links } = await client.query(
                `SELECT p.id as parent_id, p.user_id 
                 FROM student_parents sp 
                 JOIN parents p ON p.id = sp.parent_id 
                 WHERE sp.student_id = $1 LIMIT 1`,
                [student.id]
            );

            const defaultPassword = student.student_code;
            const passwordHash = await bcrypt.hash(defaultPassword, 10);
            const parentEmail = student.student_code; // Username là mã HS

            if (links.length > 0) {
                // Đã có parent -> cập nhật email = student_code, reset pass = student_code
                const userId = links[0].user_id;
                await client.query(
                    `UPDATE users 
                     SET email = $1, password_hash = $2, must_change_password = true, is_active = true 
                     WHERE id = $3`,
                    [parentEmail, passwordHash, userId]
                );
            } else {
                // Chưa có parent -> tạo mới
                const parentName = `PH. ${student.full_name}`;

                // Tránh duplicate email (vì 1 parent_email là duy nhất trong users)
                const { rows: existUser } = await client.query('SELECT id FROM users WHERE email = $1', [parentEmail]);

                let userId;
                if (existUser.length > 0) {
                    userId = existUser[0].id;
                    await client.query(
                        `UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2`,
                        [passwordHash, userId]
                    );
                } else {
                    const userRes = await client.query(
                        `INSERT INTO users (name, email, password_hash, role, must_change_password, is_active) 
                         VALUES ($1, $2, $3, 'parent', true, true) RETURNING id`,
                        [parentName, parentEmail, passwordHash]
                    );
                    userId = userRes.rows[0].id;
                }

                const parentRes = await client.query(
                    `INSERT INTO parents (user_id, full_name) VALUES ($1, $2) RETURNING id`,
                    [userId, parentName]
                );
                const parentId = parentRes.rows[0].id;

                await client.query(
                    `INSERT INTO student_parents (parent_id, student_id, relationship) VALUES ($1, $2, 'father')
                     ON CONFLICT DO NOTHING`,
                    [parentId, student.id]
                );
            }
            fixedCount++;
        }

        await client.query('COMMIT');
        console.log(`Đã fix thành công ${fixedCount} tài khoản phụ huynh! Username và Password đều là mã học sinh (VD: HS2026-309)`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Lỗi fix logic:', err);
    } finally {
        client.release();
    }
}

fixParentLogins().then(() => pool.end());
