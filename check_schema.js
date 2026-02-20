const { pool } = require('./backend/config/db');

async function checkSchema() {
    try {
        // Check users table
        const usersQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
        const usersResult = await pool.query(usersQuery);
        console.log('\n=== USERS TABLE ===');
        console.log(usersResult.rows);

        // Check parents table
        const parentsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'parents'
      ORDER BY ordinal_position;
    `;
        const parentsResult = await pool.query(parentsQuery);
        console.log('\n=== PARENTS TABLE ===');
        console.log(parentsResult.rows);

        // Check student_parents table
        const studentParentsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'student_parents'
      ORDER BY ordinal_position;
    `;
        const studentParentsResult = await pool.query(studentParentsQuery);
        console.log('\n=== STUDENT_PARENTS TABLE ===');
        console.log(studentParentsResult.rows);

        // Check if tables exist
        const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'parents', 'student_parents')
      ORDER BY table_name;
    `;
        const tablesResult = await pool.query(tablesQuery);
        console.log('\n=== EXISTING TABLES ===');
        console.log(tablesResult.rows);

        await pool.end();
    } catch (error) {
        console.error('Error checking schema:', error.message);
        process.exit(1);
    }
}

checkSchema();
