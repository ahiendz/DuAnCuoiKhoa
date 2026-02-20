const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'huhu18072011',
    database: 'school_manager_pro',
    host: 'localhost',
    port: 5432
});

async function checkStudentData(studentId) {
    const client = await pool.connect();
    try {
        console.log(`\n=== KIỂM TRA DỮ LIỆU CHO STUDENT ID: ${studentId} ===\n`);

        // Student info
        const student = await client.query(`
      SELECT s.*, c.name as class_name FROM public.students s
      LEFT JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = $1
    `, [studentId]);
        console.log('Student info:', JSON.stringify(student.rows[0], null, 2));

        // Grades
        const grades = await client.query(`
      SELECT g.*, sub.name as subject_name FROM public.grades g
      LEFT JOIN public.subjects sub ON g.subject_id = sub.id
      WHERE g.student_id = $1
      ORDER BY g.created_at DESC LIMIT 20
    `, [studentId]);
        console.log(`\nGrades (${grades.rows.length} records):`, JSON.stringify(grades.rows, null, 2));

        // Attendance
        const attendance = await client.query(`
      SELECT * FROM public.attendance WHERE student_id = $1
      ORDER BY date DESC LIMIT 20
    `, [studentId]);
        console.log(`\nAttendance (${attendance.rows.length} records):`, JSON.stringify(attendance.rows, null, 2));

        // Parent link
        const parentLink = await client.query(`
      SELECT sp.*, p.full_name as parent_name, u.email
      FROM public.student_parents sp
      JOIN public.parents p ON sp.parent_id = p.id
      JOIN public.users u ON p.user_id = u.id
      WHERE sp.student_id = $1
    `, [studentId]);
        console.log(`\nParent links:`, JSON.stringify(parentLink.rows, null, 2));

        // Check subjects table
        const subjects = await client.query(`SELECT * FROM public.subjects ORDER BY id`);
        console.log(`\nSubjects:`, JSON.stringify(subjects.rows, null, 2));

        // Check grades schema
        const gradeSchema = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'grades'
      ORDER BY ordinal_position
    `);
        console.log('\nGrades table schema:', JSON.stringify(gradeSchema.rows, null, 2));

    } finally {
        client.release();
        await pool.end();
    }
}

// Student ID 61 = Lý Anh Hiển
checkStudentData(61).catch(console.error);
