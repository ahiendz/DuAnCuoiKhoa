const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME
});

async function convertGenderValues() {
    const client = await pool.connect();

    try {
        console.log('\n=== GENDER STANDARDIZATION MIGRATION ===\n');

        // Check current gender values
        console.log('Current gender values in students:');
        const studentsCheck = await client.query(
            `SELECT gender, COUNT(*) as count FROM students 
             WHERE gender IS NOT NULL 
             GROUP BY gender`
        );
        console.table(studentsCheck.rows);

        // Note: users table doesn't have gender column in this schema
        console.log('\nNote: Users table does not have gender column in current schema.');

        // Ask for confirmation
        const hasVietnamese = studentsCheck.rows.some(r => r.gender === 'Nam' || r.gender === 'Nữ');

        if (!hasVietnamese) {
            console.log('\n✅ No Vietnamese gender values found. Migration not needed.');
            return;
        }

        console.log('\n⚠️  Vietnamese gender values detected. Converting to English...\n');

        await client.query('BEGIN');

        // Update students
        const studentsResult = await client.query(`
            UPDATE students 
            SET gender = CASE 
                WHEN gender = 'Nam' THEN 'male'
                WHEN gender = 'Nữ' THEN 'female'
                ELSE gender
            END
            WHERE gender IN ('Nam', 'Nữ')
        `);
        console.log(`✅ Updated ${studentsResult.rowCount} students`);

        // Update users
        const usersResult = await client.query(`
            UPDATE users 
            SET gender = CASE 
                WHEN gender = 'Nam' THEN 'male'
                WHEN gender = 'Nữ' THEN 'female'
                ELSE gender
            END
            WHERE gender IN ('Nam', 'Nữ')
        `);
        console.log(`✅ Updated ${usersResult.rowCount} users`);

        await client.query('COMMIT');

        // Verify
        console.log('\n=== VERIFICATION ===\n');
        const verifyStudents = await client.query(
            `SELECT gender, COUNT(*) as count FROM students 
             WHERE gender IS NOT NULL 
             GROUP BY gender`
        );
        console.log('Students after migration:');
        console.table(verifyStudents.rows);

        const verifyUsers = await client.query(
            `SELECT gender, COUNT(*) as count FROM users 
             WHERE gender IS NOT NULL 
             GROUP BY gender`
        );
        console.log('Users after migration:');
        console.table(verifyUsers.rows);

        console.log('\n✅ Gender standardization complete!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

convertGenderValues().catch(console.error);
