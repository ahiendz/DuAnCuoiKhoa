const { pool } = require("../config/db");
const { SUBJECTS } = require("./teacherService");

function assertSubjectTeachersMap(subject_teachers = {}) {
  const missing = SUBJECTS.filter(sub => !subject_teachers[sub]);
  if (missing.length) {
    throw new Error("Cần đủ 4 giáo viên cho các môn: " + missing.join(", "));
  }
}

async function assertUniqueName(name, currentId) {
  const { rows } = await pool.query(
    "SELECT id FROM classes WHERE LOWER(name) = LOWER($1)",
    [name]
  );
  if (rows.length && String(rows[0].id) !== String(currentId || "")) {
    throw new Error("Tên lớp đã tồn tại");
  }
}

async function loadClasses() {
  const query = `
    SELECT
      c.id,
      c.name,
      c.grade_level,
      c.homeroom_teacher_id,
      cst.subject,
      cst.teacher_id
    FROM classes c
    LEFT JOIN class_subject_teachers cst ON cst.class_id = c.id
    ORDER BY c.id;
  `;

  const { rows } = await pool.query(query);
  const classMap = new Map();

  rows.forEach(row => {
    if (!classMap.has(String(row.id))) {
      classMap.set(String(row.id), {
        id: row.id,
        name: row.name,
        grade_level: row.grade_level,
        homeroom_teacher_id: row.homeroom_teacher_id,
        subject_teachers: {}
      });
    }
    if (row.subject) {
      classMap.get(String(row.id)).subject_teachers[row.subject] = Number(row.teacher_id);
    }
  });

  return Array.from(classMap.values());
}

async function fetchTeachersByIds(client, teacherIds) {
  const uniqueIds = Array.from(new Set(teacherIds.map(id => Number(id))));
  if (!uniqueIds.length) return [];
  const { rows } = await client.query(
    "SELECT t.id, u.name AS full_name, t.subject FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.id = ANY($1::bigint[])",
    [uniqueIds]
  );
  return rows;
}

async function fetchTeacherClassCounts(client, teacherIds) {
  const uniqueIds = Array.from(new Set(teacherIds.map(id => Number(id))));
  if (!uniqueIds.length) return new Map();
  const { rows } = await client.query(
    `
      SELECT teacher_id, COUNT(DISTINCT class_id) AS count
      FROM (
        SELECT teacher_id, class_id
        FROM class_subject_teachers
        WHERE teacher_id = ANY($1::bigint[])
        UNION ALL
        SELECT homeroom_teacher_id AS teacher_id, id AS class_id
        FROM classes
        WHERE homeroom_teacher_id = ANY($1::bigint[])
      ) AS assignments
      GROUP BY teacher_id;
    `,
    [uniqueIds]
  );
  const map = new Map();
  rows.forEach(row => {
    map.set(String(row.teacher_id), Number(row.count));
  });
  return map;
}

async function ensureHomeroomAvailable(client, teacherId, currentClassId) {
  if (!teacherId) {
    throw new Error("Cần có giáo viên chủ nhiệm");
  }
  const { rows } = await client.query(
    "SELECT id FROM classes WHERE homeroom_teacher_id = $1 AND id <> $2 LIMIT 1",
    [teacherId, currentClassId || 0]
  );
  if (rows.length) {
    throw new Error("Giáo viên đã là GVCN của lớp khác");
  }
}

async function createClass(payload) {
  const { name, grade_level, homeroom_teacher_id, subject_teachers = {} } = payload;
  if (!name || !grade_level) {
    throw new Error("Thiếu tên lớp hoặc khối");
  }

  if (!homeroom_teacher_id) {
    throw new Error("Cần có giáo viên chủ nhiệm");
  }

  assertSubjectTeachersMap(subject_teachers);
  await assertUniqueName(name);

  const teacherIds = [homeroom_teacher_id, ...Object.values(subject_teachers)];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teachers = await fetchTeachersByIds(client, teacherIds);
    if (teachers.length !== Array.from(new Set(teacherIds.map(String))).length) {
      throw new Error("Không tìm thấy giáo viên với ID đã chọn");
    }

    const teacherMap = new Map(teachers.map(t => [String(t.id), t]));

    SUBJECTS.forEach(sub => {
      const tid = subject_teachers[sub];
      const teacher = teacherMap.get(String(tid));
      if (!teacher) {
        throw new Error("Không tìm thấy giáo viên với ID " + tid);
      }
      if (teacher.subject !== sub) {
        throw new Error(`Giáo viên ${teacher.full_name} không dạy môn ${sub}`);
      }
    });

    await ensureHomeroomAvailable(client, homeroom_teacher_id, null);

    const counts = await fetchTeacherClassCounts(client, teacherIds);
    const uniqueIds = Array.from(new Set(teacherIds.map(String)));
    uniqueIds.forEach(tid => {
      const count = counts.get(String(tid)) || 0;
      if (count >= 4) {
        const teacher = teacherMap.get(String(tid));
        throw new Error(`Giáo viên ${teacher ? teacher.full_name : tid} đã đủ 4 lớp được phân công`);
      }
    });

    const classRes = await client.query(
      "INSERT INTO classes (name, grade_level, homeroom_teacher_id) VALUES ($1, $2, $3) RETURNING id",
      [name, Number(grade_level), homeroom_teacher_id]
    );
    const classId = classRes.rows[0].id;

    const values = [];
    const params = [];
    let idx = 1;
    SUBJECTS.forEach(sub => {
      values.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
      params.push(classId, sub, subject_teachers[sub]);
      idx += 3;
    });
    await client.query(
      `INSERT INTO class_subject_teachers (class_id, subject, teacher_id) VALUES ${values.join(", ")}`,
      params
    );

    await client.query("COMMIT");

    return {
      id: classId,
      name,
      grade_level: Number(grade_level),
      homeroom_teacher_id,
      subject_teachers
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateClass(id, payload) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const classRes = await client.query(
      "SELECT id, name, grade_level, homeroom_teacher_id FROM classes WHERE id = $1",
      [id]
    );
    if (!classRes.rows.length) {
      throw new Error("Không tìm thấy lớp");
    }
    const currentClass = classRes.rows[0];

    const subjectRes = await client.query(
      "SELECT subject, teacher_id FROM class_subject_teachers WHERE class_id = $1",
      [id]
    );
    const currentSubjects = {};
    subjectRes.rows.forEach(row => {
      currentSubjects[row.subject] = Number(row.teacher_id);
    });

    const nextName = payload.name || currentClass.name;
    const nextGrade = payload.grade_level ?? currentClass.grade_level;
    const nextHomeroom = payload.homeroom_teacher_id ?? currentClass.homeroom_teacher_id;
    const nextSubjects = { ...currentSubjects, ...(payload.subject_teachers || {}) };

    if (!nextHomeroom) {
      throw new Error("Cần có giáo viên chủ nhiệm");
    }

    assertSubjectTeachersMap(nextSubjects);
    await assertUniqueName(nextName, id);

    const teacherIds = [nextHomeroom, ...Object.values(nextSubjects)];
    const teachers = await fetchTeachersByIds(client, teacherIds);
    if (teachers.length !== Array.from(new Set(teacherIds.map(String))).length) {
      throw new Error("Không tìm thấy giáo viên với ID đã chọn");
    }
    const teacherMap = new Map(teachers.map(t => [String(t.id), t]));

    SUBJECTS.forEach(sub => {
      const tid = nextSubjects[sub];
      const teacher = teacherMap.get(String(tid));
      if (!teacher) {
        throw new Error("Không tìm thấy giáo viên với ID " + tid);
      }
      if (teacher.subject !== sub) {
        throw new Error(`Giáo viên ${teacher.full_name} không dạy môn ${sub}`);
      }
    });

    await ensureHomeroomAvailable(client, nextHomeroom, id);

    const counts = await fetchTeacherClassCounts(client, teacherIds);
    const existingAssignments = new Set([
      currentClass.homeroom_teacher_id,
      ...Object.values(currentSubjects)
    ].filter(Boolean).map(String));

    Array.from(new Set(teacherIds.map(String))).forEach(tid => {
      const count = counts.get(String(tid)) || 0;
      if (!existingAssignments.has(String(tid)) && count >= 4) {
        const teacher = teacherMap.get(String(tid));
        throw new Error(`Giáo viên ${teacher ? teacher.full_name : tid} đã đủ 4 lớp được phân công`);
      }
    });

    await client.query(
      "UPDATE classes SET name = $1, grade_level = $2, homeroom_teacher_id = $3 WHERE id = $4",
      [nextName, Number(nextGrade), nextHomeroom, id]
    );

    await client.query("DELETE FROM class_subject_teachers WHERE class_id = $1", [id]);

    const values = [];
    const params = [];
    let idx = 1;
    SUBJECTS.forEach(sub => {
      values.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
      params.push(id, sub, nextSubjects[sub]);
      idx += 3;
    });
    await client.query(
      `INSERT INTO class_subject_teachers (class_id, subject, teacher_id) VALUES ${values.join(", ")}`,
      params
    );

    await client.query("COMMIT");

    return {
      id: currentClass.id,
      name: nextName,
      grade_level: Number(nextGrade),
      homeroom_teacher_id: nextHomeroom,
      subject_teachers: nextSubjects
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteClass(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const classRes = await client.query(
      "SELECT id FROM classes WHERE id = $1",
      [id]
    );
    if (!classRes.rows.length) {
      throw new Error("Không tìm thấy lớp");
    }

    await client.query("DELETE FROM class_subject_teachers WHERE class_id = $1", [id]);
    await client.query("DELETE FROM classes WHERE id = $1", [id]);

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
  loadClasses,
  createClass,
  updateClass,
  deleteClass
};
