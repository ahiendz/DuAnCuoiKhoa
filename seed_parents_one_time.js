/**
 * ONE-TIME SEED SCRIPT: Tạo parent account cho mọi student chưa có parent
 * Chạy: node seed_parents_one_time.js
 * 
 * Sau khi chạy xong, việc thêm parent sẽ dùng qua UI Admin.
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: 'postgres',
    password: 'huhu18072011',
    database: 'school_manager_pro',
    host: 'localhost',
    port: 5432
});

// Chuyển tên Việt sang slug email
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
        Ô: 'o', Ố: 'o', Ồ: 'o', Ổ: 'o', Ỗ: 'o', Ộ: 'o',
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

// Random số điện thoại VN
function randomPhone() {
    const prefixes = ['090', '091', '092', '093', '094', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039', '070', '076', '077', '078', '079'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let suffix = '';
    for (let i = 0; i < 7; i++) suffix += Math.floor(Math.random() * 10);
    return prefix + suffix;
}

async function seedParents() {
    const client = await pool.connect();
    const DEFAULT_PASSWORD = 'Parent@123';
    const SALT_ROUNDS = 10;
    const relationships = ['father', 'mother'];

    try {
        await client.query('BEGIN');

        // Lấy tất cả students chưa có parent
        const { rows: orphans } = await client.query(`
      SELECT s.id, s.full_name 
      FROM public.students s
      LEFT JOIN public.student_parents sp ON s.id = sp.student_id
      WHERE sp.student_id IS NULL
      ORDER BY s.id
    `);

        if (orphans.length === 0) {
            console.log('✅ Tất cả students đã có parent rồi, không cần seed!');
            await client.query('ROLLBACK');
            return;
        }

        console.log(`📋 Tìm thấy ${orphans.length} students chưa có parent:\n`);
        orphans.forEach(s => console.log(`  - [${s.id}] ${s.full_name}`));
        console.log('');

        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
        let created = 0;

        for (const student of orphans) {
            const slug = toSlug(student.full_name);
            const email = `ph.${slug}@school.local`;
            const parentName = `PH. ${student.full_name}`;
            const phone = randomPhone();
            const relationship = relationships[Math.floor(Math.random() * relationships.length)];

            // Kiểm tra email đã tồn tại chưa (idempotent)
            const existingUser = await client.query(
                'SELECT id FROM public.users WHERE email = $1',
                [email]
            );

            let userId;
            if (existingUser.rows.length > 0) {
                userId = existingUser.rows[0].id;
                console.log(`  ⚠️  Email ${email} đã tồn tại (user_id=${userId}), bỏ qua tạo user`);
            } else {
                // Tạo user account
                const userResult = await client.query(
                    `INSERT INTO public.users (name, email, password_hash, role, must_change_password, is_active)
           VALUES ($1, $2, $3, 'parent', true, true)
           RETURNING id`,
                    [parentName, email, passwordHash]
                );
                userId = userResult.rows[0].id;
            }

            // Kiểm tra parent record
            const existingParent = await client.query(
                'SELECT id FROM public.parents WHERE user_id = $1',
                [userId]
            );

            let parentId;
            if (existingParent.rows.length > 0) {
                parentId = existingParent.rows[0].id;
                console.log(`  ⚠️  Parent record đã tồn tại (parent_id=${parentId}), bỏ qua tạo parent`);
            } else {
                // Tạo parent record
                const parentResult = await client.query(
                    `INSERT INTO public.parents (user_id, full_name, phone)
           VALUES ($1, $2, $3)
           RETURNING id`,
                    [userId, parentName, phone]
                );
                parentId = parentResult.rows[0].id;
            }

            // Kiểm tra link đã tồn tại chưa
            const existingLink = await client.query(
                'SELECT 1 FROM public.student_parents WHERE parent_id = $1 AND student_id = $2',
                [parentId, student.id]
            );

            if (existingLink.rows.length > 0) {
                console.log(`  ⚠️  Link parent ${parentId} → student ${student.id} đã tồn tại`);
            } else {
                // Tạo link student_parents
                await client.query(
                    `INSERT INTO public.student_parents (parent_id, student_id, relationship)
           VALUES ($1, $2, $3)`,
                    [parentId, student.id, relationship]
                );

                console.log(`  ✅ [Student ${student.id}] ${student.full_name}`);
                console.log(`     → Parent: ${parentName}`);
                console.log(`     → Email: ${email} | Pass: ${DEFAULT_PASSWORD}`);
                console.log(`     → Phone: ${phone} | Rel: ${relationship}`);
                console.log('');
                created++;
            }
        }

        await client.query('COMMIT');
        console.log(`\n🎉 Hoàn thành! Đã tạo ${created}/${orphans.length} parent accounts mới.`);
        console.log(`📌 Mật khẩu mặc định: ${DEFAULT_PASSWORD} (phải đổi lúc đăng nhập lần đầu)`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Lỗi:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seedParents().catch(err => {
    console.error(err);
    process.exit(1);
});
