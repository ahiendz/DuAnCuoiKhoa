const { pool } = require("../config/db");

function logDebug(message, data) {
  console.log(`[students] ${message}`, data ?? "");
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}

async function resolveClass(classIdOrName, client = pool) {
  if (!classIdOrName) return null;
  const raw = String(classIdOrName).trim();
  if (!raw) return null;
  const isNumeric = /^\d+$/.test(raw);
  if (isNumeric) {
    const { rows } = await client.query(
      "SELECT id, name FROM classes WHERE id = $1 OR name = $2 LIMIT 1",
      [Number(raw), raw]
    );
    return rows[0] || null;
  }
  const { rows } = await client.query(
    "SELECT id, name FROM classes WHERE name = $1 LIMIT 1",
    [raw]
  );
  return rows[0] || null;
}

function validateRow(row, selectedClassInfo) {
  const errors = {};
  if (!row.student_code) errors.student_code = "Thiếu mã học sinh";
  if (!row.full_name) errors.full_name = "Thiếu họ tên";
  if (!row.dob || !isValidIsoDate(row.dob)) {
    errors.dob = "Ngày sinh không đúng định dạng YYYY-MM-DD";
  }
  if (!row.gender || !["male", "female"].includes(row.gender)) {
    errors.gender = "Giới tính phải là male/female";
  }
  if (!row.class_id) {
    errors.class_id = "Thiếu class_id";
  } else {
    const rowClass = String(row.class_id).trim();
    const className = String(selectedClassInfo && selectedClassInfo.name ? selectedClassInfo.name : "").trim();
    const classId = String(selectedClassInfo && selectedClassInfo.id ? selectedClassInfo.id : "").trim();
    if (rowClass !== className && rowClass !== classId) {
      errors.class_id = `class_id không đúng lớp đã chọn (${className} hoặc ${classId})`;
    }
  }
  if (row.avatar_url && !isValidUrl(row.avatar_url)) {
    errors.avatar_url = "avatar_url không hợp lệ";
  }
  return errors;
}

async function generateStudentCode(client) {
  const year = new Date().getFullYear();
  const prefix = `HS${year}-`;
  const pattern = `^${prefix}(\\d+)$`;
  const likePattern = `${prefix}%`;

  const { rows } = await client.query(
    "SELECT MAX(CAST(SUBSTRING(student_code FROM $1) AS INT)) AS max_code FROM students WHERE student_code LIKE $2",
    [pattern, likePattern]
  );

  let max = rows[0] && rows[0].max_code ? Number(rows[0].max_code) : 0;
  let next = max + 1;

  for (let i = 0; i < 10; i += 1) {
    const code = `${prefix}${String(next).padStart(3, "0")}`;
    const exists = await client.query(
      "SELECT 1 FROM students WHERE student_code = $1 LIMIT 1",
      [code]
    );
    if (!exists.rows.length) return code;
    next += 1;
  }

  return `${prefix}${String(next).padStart(3, "0")}`;
}

async function listStudents(filter = {}) {
  const { class_id } = filter;
  let classInfo = null;
  if (class_id) {
    classInfo = await resolveClass(class_id);
    if (!classInfo) {
      logDebug("Filter students", { filter: class_id, normalized: null });
      return [];
    }
  }

  const params = [];
  let where = "";
  if (classInfo) {
    params.push(classInfo.id);
    where = "WHERE s.class_id = $1";
  }

  const query = `
    SELECT
      s.id,
      s.full_name,
      s.student_code,
      s.dob,
      s.gender,
      s.class_id,
      s.image_url AS avatar_url,
      c.name AS class_name
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    ${where}
    ORDER BY s.full_name;
  `;

  const { rows } = await pool.query(query, params);
  const students = rows.map(row => ({
    id: row.id,
    full_name: row.full_name,
    student_code: row.student_code,
    dob: row.dob ? String(row.dob).slice(0, 10) : "",
    gender: row.gender || "",
    class_id: row.class_name || "",
    class_name: row.class_name || "",
    avatar_url: row.avatar_url || null
  }));

  logDebug(classInfo ? "Filter students" : "List students", {
    count: students.length,
    filter: class_id,
    normalized: classInfo ? classInfo.name : null
  });

  return students;
}

async function createStudent(payload) {
  const { full_name, dob, gender, class_id, avatar_url, parent_email, parent_name, parent_phone, relationship } = payload;
  if (!full_name || !dob || !gender || !class_id) {
    throw new Error("Thiếu họ tên, ngày sinh, giới tính hoặc lớp học");
  }
  if (!isValidIsoDate(dob)) throw new Error("Ngày sinh không đúng định dạng YYYY-MM-DD");
  if (!["male", "female"].includes(gender)) throw new Error("Giới tính phải là male/female");
  if (avatar_url && !isValidUrl(avatar_url)) throw new Error("avatar_url không hợp lệ");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const classInfo = await resolveClass(class_id, client);
    if (!classInfo) throw new Error("Lớp học không tồn tại");

    const student_code = await generateStudentCode(client);

    const insertRes = await client.query(
      "INSERT INTO students (full_name, student_code, dob, gender, class_id, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        full_name,
        student_code,
        dob,
        gender,
        classInfo.id,
        avatar_url || null
      ]
    );

    const student_id = insertRes.rows[0].id;

    // Create parent account if parent details provided
    if (parent_email && parent_name) {
      const parentService = require("./parentService");
      const { parent_id } = await parentService.createOrGetParent({
        email: parent_email,
        full_name: parent_name,
        phone: parent_phone || null,
        default_password: student_code, // Use student_code as default password
        client // Pass transaction client
      });

      // Link parent to student
      await parentService.linkParentToStudent({
        parent_id,
        student_id,
        relationship: relationship || null,
        client // Pass transaction client
      });
    }

    await client.query("COMMIT");

    return {
      id: student_id,
      full_name,
      student_code,
      dob,
      gender,
      class_id: classInfo.name,
      avatar_url: avatar_url || null
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateStudent(id, payload) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingRes = await client.query(
      "SELECT id, student_code, full_name, dob, gender, class_id, image_url FROM students WHERE id = $1",
      [id]
    );
    if (!existingRes.rows.length) throw new Error("Không tìm thấy học sinh");
    const existing = existingRes.rows[0];

    let classInfo = null;
    if (payload.class_id) {
      classInfo = await resolveClass(payload.class_id, client);
      if (!classInfo) throw new Error("Lớp học không tồn tại");
    }

    if (payload.student_code) {
      const dupRes = await client.query(
        "SELECT id FROM students WHERE student_code = $1 AND id <> $2",
        [payload.student_code, id]
      );
      if (dupRes.rows.length) throw new Error("Mã học sinh (student_code) đã tồn tại");
    }

    if (payload.gender !== undefined) {
      if (!payload.gender || !["male", "female"].includes(payload.gender)) {
        throw new Error("Giới tính phải là male/female");
      }
    }

    if (payload.dob !== undefined) {
      if (!payload.dob || !isValidIsoDate(payload.dob)) {
        throw new Error("Ngày sinh không đúng định dạng YYYY-MM-DD");
      }
    }

    if (payload.avatar_url !== undefined && payload.avatar_url !== null && payload.avatar_url !== "") {
      if (!isValidUrl(payload.avatar_url)) throw new Error("avatar_url không hợp lệ");
    }

    const nextFullName = payload.full_name || existing.full_name;
    const nextDob = payload.dob ?? existing.dob;
    const nextGender = payload.gender ?? existing.gender;
    const nextStudentCode = payload.student_code || existing.student_code;
    const nextClassId = classInfo ? classInfo.id : existing.class_id;
    const nextAvatar = payload.avatar_url === undefined ? existing.image_url : (payload.avatar_url || null);

    await client.query(
      "UPDATE students SET full_name = $1, dob = $2, gender = $3, student_code = $4, class_id = $5, image_url = $6 WHERE id = $7",
      [
        nextFullName,
        nextDob,
        nextGender,
        nextStudentCode,
        nextClassId,
        nextAvatar,
        id
      ]
    );

    await client.query("COMMIT");

    const resolvedClass = classInfo || (await resolveClass(nextClassId, client));
    return {
      id: Number(id),
      full_name: nextFullName,
      student_code: nextStudentCode,
      dob: nextDob ? String(nextDob).slice(0, 10) : "",
      gender: nextGender || "",
      class_id: resolvedClass ? resolvedClass.name : "",
      avatar_url: nextAvatar || null
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteStudent(id) {
  const { rowCount } = await pool.query(
    "DELETE FROM students WHERE id = $1",
    [id]
  );
  if (!rowCount) throw new Error("Không tìm thấy học sinh");
  return true;
}

async function importStudents(rows, mode, selectedClass) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const classInfo = await resolveClass(selectedClass, client);
    if (!classInfo) throw new Error("Lớp học không tồn tại");

    const classId = classInfo.id;

    const codeCounts = {};
    rows.forEach(r => {
      if (r.student_code) {
        codeCounts[r.student_code] = (codeCounts[r.student_code] || 0) + 1;
      }
    });

    const codes = rows.map(r => r.student_code).filter(Boolean);
    const existingRows = codes.length
      ? await client.query(
        "SELECT id, student_code, class_id FROM students WHERE student_code = ANY($1::text[])",
        [codes]
      )
      : { rows: [] };

    const existingByCode = new Map(existingRows.rows.map(r => [r.student_code, r]));

    const validRows = [];
    rows.forEach(row => {
      const errors = validateRow(row, classInfo);
      if (codeCounts[row.student_code] > 1) errors.student_code = "Trùng mã học sinh trong CSV";
      const existing = existingByCode.get(row.student_code);
      if (existing && String(existing.class_id) !== String(classId)) {
        errors.student_code = "Mã học sinh đã tồn tại ở lớp khác";
      }
      if (Object.keys(errors).length) {
        console.warn(`[import] skip row ${row.student_code || "N/A"}:`, errors);
        return;
      }
      validRows.push(row);
    });

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    if (mode === "replace") {
      const deleteRes = await client.query(
        "DELETE FROM students WHERE class_id = $1",
        [classId]
      );
      deleted = deleteRes.rowCount || 0;
    }

    // Process each valid row individually to support per-row parent linking
    for (const row of validRows) {
      const upsertSql = `
        INSERT INTO students (full_name, student_code, dob, gender, class_id, image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (student_code) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          dob = EXCLUDED.dob,
          gender = EXCLUDED.gender,
          class_id = EXCLUDED.class_id,
          image_url = EXCLUDED.image_url
        RETURNING id
      `;
      const upsertRes = await client.query(upsertSql, [
        row.full_name,
        row.student_code,
        row.dob,
        row.gender,
        classId,
        row.avatar_url && isValidUrl(row.avatar_url) ? row.avatar_url : null
      ]);

      const student_id = upsertRes.rows[0].id;

      if (existingByCode.has(row.student_code)) {
        updated += 1;
      } else {
        inserted += 1;
      }

      // Per-row parent creation (optional columns: parent_email, parent_name, parent_phone, relationship)
      if (row.parent_email && row.parent_name) {
        try {
          const parentService = require("./parentService");
          const { parent_id } = await parentService.createOrGetParent({
            email: row.parent_email,
            full_name: row.parent_name,
            phone: row.parent_phone || null,
            default_password: row.student_code,
            client // reuse same transaction client
          });
          await parentService.linkParentToStudent({
            parent_id,
            student_id,
            relationship: row.relationship || null,
            client
          });
        } catch (parentErr) {
          // Non-fatal: log and continue so the student import is not blocked
          console.warn(`[import] parent link failed for ${row.student_code}:`, parentErr.message);
        }
      }
    }

    await client.query("COMMIT");
    return { inserted, updated, deleted, skipped: rows.length - validRows.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function unassignClass(classId) {
  const classInfo = await resolveClass(classId);
  if (!classInfo) return;
  await pool.query(
    "DELETE FROM students WHERE class_id = $1",
    [classInfo.id]
  );
}

async function exportStudents(classId) {
  const params = [];
  let where = "";
  if (classId) {
    const classInfo = await resolveClass(classId);
    if (!classInfo) {
      throw new Error("Lớp học không tồn tại");
    }
    params.push(classInfo.id);
    where = "WHERE s.class_id = $1";
  }
  const query = `
    SELECT s.student_code, s.full_name, s.dob, s.gender, s.class_id, s.image_url AS avatar_url
    FROM students s
    ${where}
    ORDER BY s.student_code;
  `;
  const { rows } = await pool.query(query, params);
  return rows.map(r => ({
    student_code: r.student_code,
    full_name: r.full_name,
    dob: r.dob ? String(r.dob).slice(0, 10) : "",
    gender: r.gender,
    class_id: r.class_id,
    avatar_url: r.avatar_url || ""
  }));
}

module.exports = {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudents,
  unassignClass,
  exportStudents
};
