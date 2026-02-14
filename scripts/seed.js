const bcrypt = require("bcrypt");
const { pool } = require("../backend/config/db");

const SUBJECTS = ["Toán", "Văn", "Anh", "KHTN"];

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "TRUNCATE parent_students, parents, attendance, students, class_subject_teachers, classes, teachers, users RESTART IDENTITY CASCADE"
    );

    const adminPassword = await bcrypt.hash("Admin@123", 10);
    await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
      ["Admin", "admin@school.local", adminPassword, "admin"]
    );

    const teacherSeed = [
      { name: "Nguyễn Văn Toán", gender: "male", subject: "Toán", email: "toan@school.local" },
      { name: "Trần Thị Văn", gender: "female", subject: "Văn", email: "van@school.local" },
      { name: "Lê Minh Anh", gender: "male", subject: "Anh", email: "anh@school.local" },
      { name: "Phạm KHTN", gender: "female", subject: "KHTN", email: "khtn@school.local" }
    ];

    const teacherIds = {};
    const teacherPassword = await bcrypt.hash("Teacher@123", 10);

    for (const teacher of teacherSeed) {
      const userRes = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
        [teacher.name, teacher.email, teacherPassword, "teacher"]
      );
      const userId = userRes.rows[0].id;

      const teacherRes = await client.query(
        "INSERT INTO teachers (user_id, gender, subject) VALUES ($1, $2, $3) RETURNING id",
        [userId, teacher.gender, teacher.subject]
      );

      teacherIds[teacher.subject] = teacherRes.rows[0].id;
    }

    const classSeed = [
      { name: "10A1", grade_level: 10, homeroomSubject: "Toán" },
      { name: "10A2", grade_level: 10, homeroomSubject: "Văn" }
    ];

    const classIds = [];

    for (const cls of classSeed) {
      const homeroomTeacherId = teacherIds[cls.homeroomSubject];
      const classRes = await client.query(
        "INSERT INTO classes (name, grade_level, homeroom_teacher_id) VALUES ($1, $2, $3) RETURNING id",
        [cls.name, cls.grade_level, homeroomTeacherId]
      );
      const classId = classRes.rows[0].id;
      classIds.push(classId);

      const values = [];
      const params = [];
      let idx = 1;
      SUBJECTS.forEach(sub => {
        values.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
        params.push(classId, sub, teacherIds[sub]);
        idx += 3;
      });
      await client.query(
        `INSERT INTO class_subject_teachers (class_id, subject, teacher_id) VALUES ${values.join(", ")}`,
        params
      );
    }

    const year = new Date().getFullYear();
    let studentCounter = 1;
    const studentIds = [];

    for (const classId of classIds) {
      for (let i = 0; i < 10; i += 1) {
        const code = `HS${year}-${String(studentCounter).padStart(3, "0")}`;
        const dob = new Date(year - 15, (studentCounter % 12), (studentCounter % 28) + 1);
        const gender = studentCounter % 2 === 0 ? "female" : "male";
        const fullName = `Học sinh ${studentCounter}`;

        const studentRes = await client.query(
          "INSERT INTO students (full_name, student_code, dob, gender, class_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [fullName, code, formatDate(dob), gender, classId]
        );
        studentIds.push(studentRes.rows[0].id);
        studentCounter += 1;
      }
    }

    const parentPassword = await bcrypt.hash("Parent@123", 10);
    const parentUserRes = await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
      ["Phụ huynh 1", "parent1@school.local", parentPassword, "parent"]
    );
    const parentRes = await client.query(
      "INSERT INTO parents (user_id, phone) VALUES ($1, $2) RETURNING id",
      [parentUserRes.rows[0].id, "0900000001"]
    );

    await client.query(
      "INSERT INTO parent_students (parent_id, student_id) VALUES ($1, $2)",
      [parentRes.rows[0].id, studentIds[0]]
    );

    const today = formatDate(new Date());
    if (studentIds.length >= 2) {
      await client.query(
        "INSERT INTO attendance (student_id, date, status, confidence) VALUES ($1, $2, $3, $4)",
        [studentIds[0], today, "present", 0.95]
      );
      await client.query(
        "INSERT INTO attendance (student_id, date, status, confidence) VALUES ($1, $2, $3, $4)",
        [studentIds[1], today, "late", 0.82]
      );
    }

    await client.query("COMMIT");
    console.log("Seed completed:");
    console.log("- Admin: admin@school.local / Admin@123");
    console.log("- Teachers: toan/van/anh/khtn@school.local / Teacher@123");
    console.log("- Parent: parent1@school.local / Parent@123");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
