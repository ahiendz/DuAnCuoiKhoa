const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { pool } = require("../backend/config/db");

const SUBJECTS = ["Toán", "Văn", "Anh", "KHTN"];
const GENDERS = ["male", "female"];
const ROLES = ["admin", "teacher", "parent"];

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    return fallback;
  }
}

function normalizeList(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  return [];
}

function isBcryptHash(value) {
  return typeof value === "string" && value.startsWith("$2");
}

function normalizeStatus(value) {
  if (value === "excused") return "absent";
  if (["present", "absent", "late"].includes(value)) return value;
  return "present";
}

async function migrate() {
  const dataDir = path.resolve(__dirname, "..", "data");

  const users = normalizeList(readJson(path.join(dataDir, "users.json"), { users: [] }), "users");
  const teachers = normalizeList(readJson(path.join(dataDir, "teachers.json"), { teachers: [] }), "teachers");
  const classes = normalizeList(readJson(path.join(dataDir, "classes.json"), { classes: [] }), "classes");
  const students = normalizeList(readJson(path.join(dataDir, "students.json"), []), "students");
  const attendance = normalizeList(readJson(path.join(dataDir, "attendance.json"), { entries: [] }), "entries");

  const client = await pool.connect();
  const oldUserIdToNew = new Map();
  const oldTeacherIdToNew = new Map();
  const classNameToId = new Map();
  const oldStudentIdToNew = new Map();

  let userCount = 0;
  let teacherCount = 0;
  let classCount = 0;
  let studentCount = 0;
  let attendanceCount = 0;

  try {
    await client.query("BEGIN");

    for (const user of users) {
      if (!user || !user.email) continue;
      const role = ROLES.includes(user.role) ? user.role : "teacher";
      const passwordRaw = user.password || user.password_hash || "";
      const passwordHash = isBcryptHash(passwordRaw)
        ? passwordRaw
        : await bcrypt.hash(passwordRaw || "Teacher@123", 10);

      const res = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role RETURNING id",
        [user.name || user.full_name || "", user.email, passwordHash, role]
      );

      if (user.id !== undefined && user.id !== null) {
        oldUserIdToNew.set(String(user.id), res.rows[0].id);
      }
      userCount += 1;
    }

    for (const teacher of teachers) {
      if (!teacher) continue;
      if (!teacher.subject || !SUBJECTS.includes(teacher.subject)) {
        console.warn(`Skip teacher with invalid subject: ${teacher.subject}`);
        continue;
      }
      if (!teacher.gender || !GENDERS.includes(teacher.gender)) {
        console.warn(`Skip teacher with invalid gender: ${teacher.gender}`);
        continue;
      }

      let userId = null;
      const oldUserId = teacher.id !== undefined ? oldUserIdToNew.get(String(teacher.id)) : null;
      if (oldUserId) {
        userId = oldUserId;
      } else if (teacher.contact_email) {
        const res = await client.query("SELECT id FROM users WHERE email = $1", [teacher.contact_email]);
        if (res.rows.length) userId = res.rows[0].id;
      }

      if (!userId) {
        console.warn(`Skip teacher without user: ${teacher.full_name || teacher.id}`);
        continue;
      }

      if (teacher.full_name) {
        await client.query("UPDATE users SET name = $1 WHERE id = $2", [teacher.full_name, userId]);
      }

      const teacherRes = await client.query(
        "INSERT INTO teachers (user_id, gender, subject) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET gender = EXCLUDED.gender, subject = EXCLUDED.subject RETURNING id",
        [userId, teacher.gender, teacher.subject]
      );

      if (teacher.id !== undefined && teacher.id !== null) {
        oldTeacherIdToNew.set(String(teacher.id), teacherRes.rows[0].id);
      }
      teacherCount += 1;
    }

    for (const cls of classes) {
      if (!cls || !cls.name) continue;
      const grade = Number(cls.grade_level || cls.grade || 0);
      if (!grade) {
        console.warn(`Skip class without grade: ${cls.name}`);
        continue;
      }

      let homeroomTeacherId = null;
      if (cls.homeroom_teacher_id) {
        homeroomTeacherId = oldTeacherIdToNew.get(String(cls.homeroom_teacher_id)) || null;
      }

      if (!homeroomTeacherId) {
        console.warn(`Skip class without homeroom: ${cls.name}`);
        continue;
      }

      const classRes = await client.query(
        "INSERT INTO classes (name, grade_level, homeroom_teacher_id) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET grade_level = EXCLUDED.grade_level, homeroom_teacher_id = EXCLUDED.homeroom_teacher_id RETURNING id",
        [cls.name, grade, homeroomTeacherId]
      );

      const classId = classRes.rows[0].id;
      classNameToId.set(cls.name, classId);
      classCount += 1;

      const subjectMap = cls.subject_teachers || {};
      for (const subject of SUBJECTS) {
        const oldTeacherId = subjectMap[subject];
        const newTeacherId = oldTeacherIdToNew.get(String(oldTeacherId || ""));
        if (!newTeacherId) {
          console.warn(`Missing subject teacher ${subject} for class ${cls.name}`);
          continue;
        }
        await client.query(
          "INSERT INTO class_subject_teachers (class_id, subject, teacher_id) VALUES ($1, $2, $3) ON CONFLICT (class_id, subject) DO UPDATE SET teacher_id = EXCLUDED.teacher_id",
          [classId, subject, newTeacherId]
        );
      }
    }

    for (const student of students) {
      if (!student || !student.student_code || !student.full_name) continue;
      if (!student.dob || !/^\d{4}-\d{2}-\d{2}$/.test(student.dob)) {
        console.warn(`Skip student with invalid dob: ${student.student_code}`);
        continue;
      }
      if (!student.gender || !GENDERS.includes(student.gender)) {
        console.warn(`Skip student with invalid gender: ${student.student_code}`);
        continue;
      }

      const className = String(student.class_id || "");
      const classId = classNameToId.get(className);
      if (!classId) {
        console.warn(`Skip student with unknown class: ${student.student_code}`);
        continue;
      }

      const studentRes = await client.query(
        "INSERT INTO students (full_name, student_code, dob, gender, class_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (student_code) DO UPDATE SET full_name = EXCLUDED.full_name, dob = EXCLUDED.dob, gender = EXCLUDED.gender, class_id = EXCLUDED.class_id RETURNING id",
        [student.full_name, student.student_code, student.dob, student.gender, classId]
      );

      if (student.id !== undefined && student.id !== null) {
        oldStudentIdToNew.set(String(student.id), studentRes.rows[0].id);
      }
      studentCount += 1;
    }

    for (const entry of attendance) {
      if (!entry || !entry.student_id || !entry.date) continue;
      const newStudentId = oldStudentIdToNew.get(String(entry.student_id));
      if (!newStudentId) {
        console.warn(`Skip attendance without student mapping: ${entry.student_id}`);
        continue;
      }
      const status = normalizeStatus(entry.status);

      await client.query(
        "INSERT INTO attendance (student_id, date, status, confidence) VALUES ($1, $2, $3, $4) ON CONFLICT (student_id, date) DO UPDATE SET status = EXCLUDED.status",
        [newStudentId, entry.date, status, null]
      );
      attendanceCount += 1;
    }

    await client.query("COMMIT");
    console.log("Migration completed:");
    console.log(`- Users processed: ${userCount}`);
    console.log(`- Teachers processed: ${teacherCount}`);
    console.log(`- Classes processed: ${classCount}`);
    console.log(`- Students processed: ${studentCount}`);
    console.log(`- Attendance processed: ${attendanceCount}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
