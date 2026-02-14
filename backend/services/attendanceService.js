const { pool } = require("../config/db");

const ALLOWED_STATUS = ["present", "absent", "late"];

function normalizeDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function normalizeStatus(value) {
  if (value === "excused") return "absent";
  if (ALLOWED_STATUS.includes(value)) return value;
  return "present";
}

async function listAttendance({ date, class_id }) {
  const params = [];
  const clauses = [];

  const normalizedDate = normalizeDate(date);
  if (normalizedDate) {
    params.push(normalizedDate);
    clauses.push(`a.date = $${params.length}`);
  }

  if (class_id) {
    const classId = Number(class_id);
    if (Number.isFinite(classId)) {
      params.push(classId);
      clauses.push(`a.class_id = $${params.length}`);
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const query = `
    SELECT a.id, a.student_id, a.class_id, a.date, a.status, a.confidence
    FROM attendance a
    ${where}
    ORDER BY a.date DESC, a.student_id;
  `;

  const { rows } = await pool.query(query, params);
  return rows.map(row => ({
    id: row.id,
    student_id: row.student_id,
    class_id: row.class_id,
    date: row.date ? String(row.date).slice(0, 10) : "",
    status: row.status,
    confidence: row.confidence
  }));
}

async function listFaceAttendance({ date, class_name }) {
  const params = [];
  const clauses = ["a.confidence IS NOT NULL"];

  const normalizedDate = normalizeDate(date);
  if (normalizedDate) {
    params.push(normalizedDate);
    clauses.push(`a.date = $${params.length}`);
  }

  if (class_name) {
    params.push(class_name);
    clauses.push(`c.name = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const query = `
    SELECT
      s.student_code,
      s.full_name,
      a.class_id,
      c.name AS class_name,
      a.date,
      TO_CHAR(a.created_at, 'HH24:MI:SS') AS time,
      a.confidence
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    LEFT JOIN classes c ON c.id = a.class_id
    ${where}
    ORDER BY a.date DESC, time DESC;
  `;

  const { rows } = await pool.query(query, params);
  return rows.map(row => ({
    student_code: row.student_code,
    full_name: row.full_name,
    class_id: row.class_id,
    class_name: row.class_name,
    date: row.date ? String(row.date).slice(0, 10) : "",
    time: row.time || "",
    confidence: row.confidence
  }));
}

async function saveManualAttendance({ date, class_id, records }) {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) throw new Error("Ngày điểm danh không hợp lệ");
  const classId = Number(class_id);
  if (!classId) throw new Error("Lớp không tồn tại");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const classRes = await client.query("SELECT id FROM classes WHERE id = $1", [classId]);
    if (!classRes.rows.length) throw new Error("Lớp không tồn tại");

    const studentRes = await client.query("SELECT id FROM students WHERE class_id = $1", [classId]);
    const studentSet = new Set(studentRes.rows.map(r => String(r.id)));

    let saved = 0;
    for (const rec of records) {
      if (!rec || !rec.student_id) continue;
      if (!studentSet.has(String(rec.student_id))) continue;
      const status = normalizeStatus(rec.status);

      await client.query(
        `
          INSERT INTO attendance (student_id, class_id, date, status, confidence)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (student_id, date) DO UPDATE SET
            status = EXCLUDED.status,
            class_id = EXCLUDED.class_id,
            confidence = COALESCE(attendance.confidence, EXCLUDED.confidence)
        `,
        [rec.student_id, classId, normalizedDate, status, null]
      );
      saved += 1;
    }

    await client.query("COMMIT");
    return { saved };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordFaceAttendance(result, pickedDate) {
  const normalizedDate = normalizeDate(pickedDate) || new Date().toISOString().slice(0, 10);
  if (!result || !result.student_code) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const studentRes = await client.query(
      "SELECT id, class_id, full_name, student_code, image_url AS avatar_url FROM students WHERE student_code = $1",
      [result.student_code]
    );
    if (!studentRes.rows.length) {
      await client.query("ROLLBACK");
      return null;
    }

    const student = studentRes.rows[0];
    if (!student.class_id) {
      await client.query("ROLLBACK");
      return null;
    }

    const attendanceRes = await client.query(
      `
        INSERT INTO attendance (student_id, class_id, date, status, confidence)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (student_id, date) DO UPDATE SET
          status = EXCLUDED.status,
          class_id = EXCLUDED.class_id,
          confidence = EXCLUDED.confidence
        RETURNING id, student_id, class_id, date, status, confidence, created_at
      `,
      [student.id, student.class_id, normalizedDate, "present", result.confidence]
    );

    await client.query("COMMIT");
    return {
      student,
      attendance: {
        ...attendanceRes.rows[0],
        date: attendanceRes.rows[0].date ? String(attendanceRes.rows[0].date).slice(0, 10) : normalizedDate
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listAttendance,
  listFaceAttendance,
  saveManualAttendance,
  recordFaceAttendance
};
