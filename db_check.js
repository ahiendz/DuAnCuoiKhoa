const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'school_manager_pro',
    password: 'huhu18072011',
    port: 5432,
});

const JWT_SECRET = 'super_secret_key_for_school_manager_pro_2025';

async function debugAndTest() {
    try {
        console.log('--- DB DIAGNOSTIC ---');
        // 1. Get User
        const res = await pool.query("SELECT * FROM users WHERE email = 'anh@school.local'");
        if (res.rows.length === 0) {
            console.log('CRITICAL: User anh@school.local NOT FOUND in DB');
            return;
        }
        const user = res.rows[0];
        console.log(`User: ID=${user.id}, Name=${user.name}, Role=${user.role}`);

        // Check Teacher Record
        const teacherRes = await pool.query("SELECT id, subject FROM teachers WHERE user_id = $1", [user.id]);
        if (teacherRes.rows.length === 0) {
            console.log('CRITICAL: Teacher record NOT FOUND for user');
        } else {
            const teacher = teacherRes.rows[0];
            console.log(`Teacher: ID=${teacher.id}, Subject=${teacher.subject}`);

            // Check Assignments
            const assignRes = await pool.query(`
            SELECT cst.id, c.name, cst.subject 
            FROM class_subject_teachers cst 
            JOIN classes c ON c.id = cst.class_id
            WHERE cst.teacher_id = $1
        `, [teacher.id]);
            console.log(`DB Assignments Found: ${assignRes.rows.length}`);
            assignRes.rows.forEach(r => console.log(` - ${r.name} (${r.subject})`));
        }

        console.log('\n--- API TEST via JWT ---');
        // 2. Generate Token
        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('generated_token:', token.substring(0, 15) + '...');

        // 3. Test API with Token
        try {
            const apiRes = await axios.get('http://localhost:3000/api/teacher/class-subjects', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('API Status:', apiRes.status);
            console.log('API Data:', JSON.stringify(apiRes.data, null, 2));
        } catch (apiErr) {
            console.error('API Failed:', apiErr.response ? apiErr.response.data : apiErr.message);
        }

    } catch (e) {
        console.error('Script Error:', e);
    } finally {
        await pool.end();
    }
}
debugAndTest();
