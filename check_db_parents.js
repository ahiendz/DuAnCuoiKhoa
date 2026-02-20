const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'huhu18072011',
    database: 'school_manager_pro',
    host: 'localhost',
    port: 5432
});

async function check() {
    const client = await pool.connect();
    try {
        const students = await client.query('SELECT id, full_name, class_id FROM public.students ORDER BY id LIMIT 30');
        console.log('=== STUDENTS ===');
        console.log(JSON.stringify(students.rows, null, 2));

        const parents = await client.query('SELECT id, user_id, full_name, phone FROM public.parents ORDER BY id');
        console.log('=== PARENTS ===');
        console.log(JSON.stringify(parents.rows, null, 2));

        const users_parent = await client.query("SELECT id, name, email, role FROM public.users WHERE role = 'parent' ORDER BY id");
        console.log('=== USERS (parent role) ===');
        console.log(JSON.stringify(users_parent.rows, null, 2));

        const links = await client.query('SELECT * FROM public.student_parents ORDER BY parent_id');
        console.log('=== STUDENT_PARENTS LINKS ===');
        console.log(JSON.stringify(links.rows, null, 2));

        const orphans = await client.query(`
      SELECT s.id, s.full_name FROM public.students s
      LEFT JOIN public.student_parents sp ON s.id = sp.student_id
      WHERE sp.student_id IS NULL
      ORDER BY s.id
    `);
        console.log('=== STUDENTS WITHOUT PARENT ===');
        console.log(JSON.stringify(orphans.rows, null, 2));
        console.log('Total orphan students:', orphans.rows.length);
    } finally {
        client.release();
        await pool.end();
    }
}
check().catch(console.error);
