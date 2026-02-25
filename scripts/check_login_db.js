const { pool } = require('../backend/config/db');

async function test() {
    const { rows: users } = await pool.query("SELECT id, name, email, role, password_hash FROM users WHERE role = 'parent'");
    console.log("Users:", users);

    const { rows: students } = await pool.query("SELECT id, student_code, full_name FROM students");
    console.log("Students:", students.slice(0, 5));

    pool.end();
}

test();
