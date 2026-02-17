const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'school_manager_pro',
    password: 'huhu18072011',
    port: 5432,
});

async function createTable() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_notes (
        id SERIAL PRIMARY KEY,
        class_subject_teacher_id INTEGER NOT NULL REFERENCES class_subject_teachers(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log("Table 'teacher_notes' created or already exists.");

        // Check if table works
        const res = await pool.query("SELECT * FROM teacher_notes LIMIT 1");
        console.log("Verified: Table exists.");
    } catch (e) {
        console.error("Error creating table:", e);
    } finally {
        pool.end();
    }
}
createTable();
