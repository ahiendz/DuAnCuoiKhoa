const { pool } = require('./backend/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const migrationPath = path.join(__dirname, 'database', 'migrations', '001_parent_enhancements.sql');

    try {
        console.log('Reading migration file...');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...');
        await pool.query(sql);

        console.log('✅ Migration completed successfully!');

        // Verify migration
        console.log('\n=== Verification ===');

        const usersCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('must_change_password', 'is_active', 'updated_at')
      ORDER BY column_name;
    `);
        console.log('\nUsers table new columns:');
        console.log(usersCheck.rows);

        const parentsCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'parents' AND column_name = 'full_name';
    `);
        console.log('\nParents table full_name column:');
        console.log(parentsCheck.rows);

        const studentParentsCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'student_parents' AND column_name IN ('relationship', 'created_at')
      ORDER BY column_name;
    `);
        console.log('\nStudent_parents table new columns:');
        console.log(studentParentsCheck.rows);

        const constraintCheck = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'student_parents' AND constraint_type = 'UNIQUE';
    `);
        console.log('\nStudent_parents unique constraints:');
        console.log(constraintCheck.rows);

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
