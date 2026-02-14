const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

const SUBJECTS = ["Toán", "Văn", "Anh", "KHTN"];
const SALT_ROUNDS = 10;

function assertSubjectValid(subject) {
  if (!SUBJECTS.includes(subject)) {
    throw new Error("Môn học không hợp lệ (Toán, Văn, Anh, KHTN)");
  }
}

function generatePassword() {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "@#$%&*?!";
  const all = lower + upper + digits + special;
  const length = crypto.randomInt(8, 13);

  const chars = [
    lower[crypto.randomInt(lower.length)],
    upper[crypto.randomInt(upper.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)]
  ];

  while (chars.length < length) {
    chars.push(all[crypto.randomInt(all.length)]);
  }

  return chars
    .sort(() => crypto.randomInt(0, 2) - 1)
    .join("");
}

async function loadTeachers() {
  const query = `
    SELECT
      t.id,
      u.name AS full_name,
      u.email AS contact_email,
      t.gender,
      t.subject,
      c_home.id AS homeroom_class_id,
      (c_home.id IS NOT NULL) AS is_homeroom,
      COALESCE(
        ARRAY(
          SELECT DISTINCT class_id FROM (
            SELECT cst.class_id
            FROM class_subject_teachers cst
            WHERE cst.teacher_id = t.id
            UNION
            SELECT c.id
            FROM classes c
            WHERE c.homeroom_teacher_id = t.id
          ) AS class_ids
        ),
        '{}'
      ) AS teaching_classes
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN classes c_home ON c_home.homeroom_teacher_id = t.id
    ORDER BY u.name;
  `;

  const { rows } = await pool.query(query);
  return rows.map(row => ({
    id: row.id,
    full_name: row.full_name,
    gender: row.gender,
    subject: row.subject,
    contact_email: row.contact_email || "",
    is_homeroom: row.is_homeroom === true,
    homeroom_class_id: row.homeroom_class_id,
    teaching_classes: (row.teaching_classes || []).map(Number)
  }));
}

async function getTeacherById(id) {
  const query = `
    SELECT
      t.id,
      u.name AS full_name,
      u.email AS contact_email,
      t.gender,
      t.subject,
      t.user_id,
      c_home.id AS homeroom_class_id,
      (c_home.id IS NOT NULL) AS is_homeroom,
      COALESCE(
        ARRAY(
          SELECT DISTINCT class_id FROM (
            SELECT cst.class_id
            FROM class_subject_teachers cst
            WHERE cst.teacher_id = t.id
            UNION
            SELECT c.id
            FROM classes c
            WHERE c.homeroom_teacher_id = t.id
          ) AS class_ids
        ),
        '{}'
      ) AS teaching_classes
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN classes c_home ON c_home.homeroom_teacher_id = t.id
    WHERE t.id = $1;
  `;

  const { rows } = await pool.query(query, [id]);
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    gender: row.gender,
    subject: row.subject,
    contact_email: row.contact_email || "",
    is_homeroom: row.is_homeroom === true,
    homeroom_class_id: row.homeroom_class_id,
    teaching_classes: (row.teaching_classes || []).map(Number)
  };
}

async function assertUniqueEmail(email, currentUserId) {
  if (!email) {
    throw new Error("Email là bắt buộc");
  }
  const { rows } = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  if (rows.length && String(rows[0].id) !== String(currentUserId || "")) {
    throw new Error("Email đã tồn tại trong hệ thống đăng nhập");
  }
}

async function createTeacher(payload) {
  const { full_name, gender, subject, email, password } = payload;
  if (!full_name || !gender || !subject || !email) {
    throw new Error("Thiếu thông tin giáo viên");
  }

  assertSubjectValid(subject);
  await assertUniqueEmail(email, null);

  const generatedPassword = password ? null : generatePassword();
  const finalPassword = password || generatedPassword;
  const hashedPassword = bcrypt.hashSync(finalPassword, SALT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userRes = await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [full_name, email, hashedPassword, "teacher"]
    );
    const userId = userRes.rows[0].id;

    const teacherRes = await client.query(
      "INSERT INTO teachers (user_id, gender, subject) VALUES ($1, $2, $3) RETURNING id",
      [userId, gender, subject]
    );

    await client.query("COMMIT");

    return {
      teacher: {
        id: teacherRes.rows[0].id,
        full_name,
        gender,
        subject,
        contact_email: email,
        is_homeroom: false,
        homeroom_class_id: null,
        teaching_classes: []
      },
      generatedPassword
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateTeacher(id, payload) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingRes = await client.query(
      "SELECT t.id, t.user_id, t.gender, t.subject, u.name, u.email FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.id = $1",
      [id]
    );
    if (!existingRes.rows.length) {
      throw new Error("Không tìm thấy giáo viên");
    }
    const existing = existingRes.rows[0];

    if (payload.subject) {
      assertSubjectValid(payload.subject);
    }

    if (payload.email) {
      await assertUniqueEmail(payload.email, existing.user_id);
    }

    const nextFullName = payload.full_name || existing.name;
    const nextGender = payload.gender || existing.gender;
    const nextSubject = payload.subject || existing.subject;

    await client.query(
      "UPDATE teachers SET gender = $1, subject = $2 WHERE id = $3",
      [nextGender, nextSubject, id]
    );

    if (payload.email || payload.full_name) {
      await client.query(
        "UPDATE users SET name = $1, email = COALESCE($2, email) WHERE id = $3",
        [nextFullName, payload.email || null, existing.user_id]
      );
    }

    if (payload.password) {
      const hashedPassword = bcrypt.hashSync(payload.password, SALT_ROUNDS);
      await client.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        [hashedPassword, existing.user_id]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const teacher = await getTeacherById(id);
  if (!teacher) throw new Error("Không tìm thấy giáo viên");
  const { user_id: _userId, ...safeTeacher } = teacher;
  return safeTeacher;
}

async function deleteTeacher(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existsRes = await client.query(
      "SELECT id, user_id FROM teachers WHERE id = $1",
      [id]
    );
    if (!existsRes.rows.length) {
      throw new Error("Không tìm thấy giáo viên");
    }
    const teacher = existsRes.rows[0];

    const homeroomRes = await client.query(
      "SELECT id FROM classes WHERE homeroom_teacher_id = $1 LIMIT 1",
      [id]
    );
    const subjectRes = await client.query(
      "SELECT id FROM class_subject_teachers WHERE teacher_id = $1 LIMIT 1",
      [id]
    );

    if (homeroomRes.rows.length || subjectRes.rows.length) {
      throw new Error(
        "Giáo viên đang được phân lớp. Hãy gỡ phân công trước khi xoá."
      );
    }

    await client.query("DELETE FROM teachers WHERE id = $1", [id]);
    await client.query("DELETE FROM users WHERE id = $1", [teacher.user_id]);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  SUBJECTS,
  loadTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher
};
