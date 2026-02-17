const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'school_manager_pro',
    password: 'huhu18072011',
    port: 5432,
});

async function reset() {
    try {
        const hash = await bcrypt.hash('Teacher@123', 10);
        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'anh@school.local'", [hash]);
        console.log('Password for anh@school.local reset to Teacher@123');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
reset();
