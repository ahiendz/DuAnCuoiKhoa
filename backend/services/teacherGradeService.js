const { pool } = require("../config/db");
const {
  toNullableScore,
  isValidScore,
  calculateSemesterAverage
} = require("../utils/gradeCalculator");

const SCORE_FIELDS = [
  "mieng_1",
  "mieng_2",
  "phut15_1",
  "phut15_2",
  "tiet1_1",
  "tiet1_2",
  "giuaki",
  "cuoiki"
];

const DEFAULT_IMPORT_HEADERS = [
  "student_code",
  "semester",
  "academic_year",
  ...SCORE_FIELDS,
  "quick_tag",
  "comment_text"
];

function normalizeSemester(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  if (["HK1", "1", "HKI", "HOC_KY_1", "HOCKY1"].includes(raw)) return "HK1";
  if (["HK2", "2", "HKII", "HOC_KY_2", "HOCKY2"].includes(raw)) return "HK2";
  return raw;
}

function normalizeAcademicYear(value) {
  const raw = String(value || "").trim().replace("/", "-");
  if (!raw) return "";
  return raw;
}

function assertSemester(semester) {
  if (!["HK1", "HK2"].includes(semester)) {
    throw new Error("Học kỳ không hợp lệ. Chỉ hỗ trợ HK1 hoặc HK2.");
  }
}

function assertAcademicYear(academicYear) {
  if (!/^\d{4}-\d{4}$/.test(academicYear)) {
    throw new Error("Năm học không hợp lệ. Định dạng: YYYY-YYYY");
  }
}

function normalizeHeaderKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pickValue(obj, aliases = []) {
  for (const alias of aliases) {
    if (obj[alias] !== undefined) return obj[alias];
  }
  return undefined;
}

function parseScoreFields(source = {}) {
  const parsed = {};
  for (const field of SCORE_FIELDS) {
    parsed[field] = toNullableScore(source[field]);
    if (!isValidScore(parsed[field])) {
      throw new Error(`Điểm ${field} phải nằm trong khoảng 0-10`);
    }
  }
  return parsed;
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes("\"") ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildCsvLine(values = []) {
  return values.map(escapeCsvValue).join(",");
}

function parseCsvText(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];

    if (ch === "\"") {
      if (inQuotes && content[i + 1] === "\"") {
        cell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && content[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter(line => line.some(col => String(col || "").trim() !== ""));
}

function toCsvObjects(content) {
  const matrix = parseCsvText(content);
  if (!matrix.length) return [];

  const firstRow = matrix[0].map(col => normalizeHeaderKey(col));
  const hasHeader = firstRow.some(col =>
    ["student_code", "ma_hoc_sinh", "ma_hs", "student_id"].includes(col)
  );

  const headers = hasHeader ? firstRow : DEFAULT_IMPORT_HEADERS;
  const fromIndex = hasHeader ? 1 : 0;

  return matrix.slice(fromIndex).map(cells => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = String(cells[index] ?? "").trim();
    });
    return row;
  });
}

async function getClassSubjectTeacher(client, classSubjectTeacherId) {
  const { rows } = await client.query(
    `
      SELECT
        cst.id,
        cst.class_id,
        cst.subject,
        c.name AS class_name,
        cst.teacher_id
      FROM class_subject_teachers cst
      JOIN classes c ON c.id = cst.class_id
      WHERE cst.id = $1
      LIMIT 1;
    `,
    [classSubjectTeacherId]
  );
  return rows[0] || null;
}

async function listTeacherAssignments(userId) {
  const normalizedUserId = userId ? Number(userId) : null;
  if (userId && !Number.isFinite(normalizedUserId)) {
    throw new Error("user_id không hợp lệ");
  }

  const { rows } = await pool.query(
    `
      SELECT
        cst.id AS class_subject_teacher_id,
        cst.class_id,
        c.name AS class_name,
        cst.subject,
        t.id AS teacher_id,
        u.id AS user_id,
        u.name AS teacher_name
      FROM class_subject_teachers cst
      JOIN classes c ON c.id = cst.class_id
      JOIN teachers t ON t.id = cst.teacher_id
      JOIN users u ON u.id = t.user_id
      WHERE ($1::bigint IS NULL OR u.id = $1)
      ORDER BY c.name, cst.subject;
    `,
    [normalizedUserId]
  );

  return rows.map(row => ({
    class_subject_teacher_id: Number(row.class_subject_teacher_id),
    class_id: Number(row.class_id),
    class_name: row.class_name,
    subject: row.subject,
    teacher_id: Number(row.teacher_id),
    user_id: Number(row.user_id),
    teacher_name: row.teacher_name
  }));
}

async function listGrades({ classSubjectTeacherId, semester, academicYear }) {
  const cstId = Number(classSubjectTeacherId);
  const sem = normalizeSemester(semester);
  const year = normalizeAcademicYear(academicYear);

  if (!Number.isFinite(cstId)) {
    throw new Error("class_subject_teacher_id không hợp lệ");
  }
  assertSemester(sem);
  assertAcademicYear(year);

  const { rows } = await pool.query(
    `
      SELECT
        s.id AS student_id,
        s.student_code,
        s.full_name,
        c.name AS class_name,
        cst.subject,
        g.id AS grade_id,
        g.mieng_1,
        g.mieng_2,
        g.phut15_1,
        g.phut15_2,
        g.tiet1_1,
        g.tiet1_2,
        g.giuaki,
        g.cuoiki,
        g.average_semester,
        g.quick_tag,
        g.comment_text,
        g.updated_at
      FROM class_subject_teachers cst
      JOIN classes c ON c.id = cst.class_id
      JOIN students s ON s.class_id = cst.class_id
      LEFT JOIN grades g
        ON g.student_id = s.id
       AND g.class_subject_teacher_id = cst.id
       AND g.semester = $2
       AND g.academic_year = $3
      WHERE cst.id = $1
      ORDER BY s.full_name, s.student_code;
    `,
    [cstId, sem, year]
  );

  return {
    class_subject_teacher_id: cstId,
    semester: sem,
    academic_year: year,
    class_name: rows[0] ? rows[0].class_name : "",
    subject: rows[0] ? rows[0].subject : "",
    students: rows.map(row => ({
      student_id: Number(row.student_id),
      student_code: row.student_code,
      full_name: row.full_name,
      grade_id: row.grade_id ? Number(row.grade_id) : null,
      mieng_1: row.mieng_1 === null ? null : Number(row.mieng_1),
      mieng_2: row.mieng_2 === null ? null : Number(row.mieng_2),
      phut15_1: row.phut15_1 === null ? null : Number(row.phut15_1),
      phut15_2: row.phut15_2 === null ? null : Number(row.phut15_2),
      tiet1_1: row.tiet1_1 === null ? null : Number(row.tiet1_1),
      tiet1_2: row.tiet1_2 === null ? null : Number(row.tiet1_2),
      giuaki: row.giuaki === null ? null : Number(row.giuaki),
      cuoiki: row.cuoiki === null ? null : Number(row.cuoiki),
      average_semester: row.average_semester === null ? null : Number(row.average_semester),
      quick_tag: row.quick_tag || "",
      comment_text: row.comment_text || "",
      updated_at: row.updated_at || null
    }))
  };
}

async function saveGrade(payload) {
  const studentId = Number(payload.student_id);
  const classSubjectTeacherId = Number(payload.class_subject_teacher_id);
  const semester = normalizeSemester(payload.semester);
  const academicYear = normalizeAcademicYear(payload.academic_year);

  if (!Number.isFinite(studentId)) throw new Error("student_id không hợp lệ");
  if (!Number.isFinite(classSubjectTeacherId)) throw new Error("class_subject_teacher_id không hợp lệ");
  assertSemester(semester);
  assertAcademicYear(academicYear);

  const scoreValues = parseScoreFields(payload);
  const averageSemester = calculateSemesterAverage(scoreValues);
  const quickTag = payload.quick_tag ? String(payload.quick_tag).trim().slice(0, 50) : null;
  const commentText = payload.comment_text ? String(payload.comment_text).trim() : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const relation = await client.query(
      `
        SELECT s.id
        FROM students s
        JOIN class_subject_teachers cst ON cst.class_id = s.class_id
        WHERE s.id = $1 AND cst.id = $2
        LIMIT 1;
      `,
      [studentId, classSubjectTeacherId]
    );
    if (!relation.rows.length) {
      throw new Error("Học sinh không thuộc lớp của giáo viên bộ môn này");
    }

    const { rows } = await client.query(
      `
        INSERT INTO grades (
          student_id,
          class_subject_teacher_id,
          semester,
          academic_year,
          mieng_1,
          mieng_2,
          phut15_1,
          phut15_2,
          tiet1_1,
          tiet1_2,
          giuaki,
          cuoiki,
          average_semester,
          quick_tag,
          comment_text,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, NOW()
        )
        ON CONFLICT (student_id, class_subject_teacher_id, semester, academic_year)
        DO UPDATE SET
          mieng_1 = EXCLUDED.mieng_1,
          mieng_2 = EXCLUDED.mieng_2,
          phut15_1 = EXCLUDED.phut15_1,
          phut15_2 = EXCLUDED.phut15_2,
          tiet1_1 = EXCLUDED.tiet1_1,
          tiet1_2 = EXCLUDED.tiet1_2,
          giuaki = EXCLUDED.giuaki,
          cuoiki = EXCLUDED.cuoiki,
          average_semester = EXCLUDED.average_semester,
          quick_tag = EXCLUDED.quick_tag,
          comment_text = EXCLUDED.comment_text,
          updated_at = NOW()
        RETURNING *;
      `,
      [
        studentId,
        classSubjectTeacherId,
        semester,
        academicYear,
        scoreValues.mieng_1,
        scoreValues.mieng_2,
        scoreValues.phut15_1,
        scoreValues.phut15_2,
        scoreValues.tiet1_1,
        scoreValues.tiet1_2,
        scoreValues.giuaki,
        scoreValues.cuoiki,
        averageSemester,
        quickTag,
        commentText
      ]
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getDashboard({ classSubjectTeacherId, academicYear, semester }) {
  const cstId = Number(classSubjectTeacherId);
  const year = normalizeAcademicYear(academicYear);
  const sem = semester ? normalizeSemester(semester) : null;

  if (!Number.isFinite(cstId)) throw new Error("class_subject_teacher_id không hợp lệ");
  assertAcademicYear(year);
  if (sem) assertSemester(sem);

  const [classInfoRes, averageRes, distributionRes, comparisonRes] = await Promise.all([
    pool.query(
      `
        SELECT cst.id, cst.subject, c.id AS class_id, c.name AS class_name,
               COUNT(s.id) AS total_students
        FROM class_subject_teachers cst
        JOIN classes c ON c.id = cst.class_id
        LEFT JOIN students s ON s.class_id = cst.class_id
        WHERE cst.id = $1
        GROUP BY cst.id, cst.subject, c.id, c.name
        LIMIT 1;
      `,
      [cstId]
    ),
    pool.query(
      `
        SELECT
          AVG(g.average_semester)::numeric(5,2) AS class_average,
          COUNT(*) AS graded_count
        FROM grades g
        WHERE g.class_subject_teacher_id = $1
          AND g.academic_year = $2
          AND ($3::text IS NULL OR g.semester = $3);
      `,
      [cstId, year, sem]
    ),
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE g.cuoiki >= 0 AND g.cuoiki < 5) AS g_0_4,
          COUNT(*) FILTER (WHERE g.cuoiki >= 5 AND g.cuoiki < 7) AS g_5_6,
          COUNT(*) FILTER (WHERE g.cuoiki >= 7 AND g.cuoiki < 9) AS g_7_8,
          COUNT(*) FILTER (WHERE g.cuoiki >= 9 AND g.cuoiki <= 10) AS g_9_10
        FROM grades g
        WHERE g.class_subject_teacher_id = $1
          AND g.academic_year = $2
          AND ($3::text IS NULL OR g.semester = $3);
      `,
      [cstId, year, sem]
    ),
    pool.query(
      `
        SELECT g.semester, AVG(g.average_semester)::numeric(5,2) AS avg_value
        FROM grades g
        WHERE g.class_subject_teacher_id = $1
          AND g.academic_year = $2
          AND g.semester IN ('HK1', 'HK2')
        GROUP BY g.semester;
      `,
      [cstId, year]
    )
  ]);

  if (!classInfoRes.rows.length) {
    throw new Error("Không tìm thấy lớp - môn đã chọn");
  }

  const compareMap = new Map(comparisonRes.rows.map(row => [row.semester, Number(row.avg_value || 0)]));
  const avgRow = averageRes.rows[0] || {};
  const distRow = distributionRes.rows[0] || {};
  const classInfo = classInfoRes.rows[0];

  return {
    class_subject_teacher_id: cstId,
    class_id: Number(classInfo.class_id),
    class_name: classInfo.class_name,
    subject: classInfo.subject,
    academic_year: year,
    semester: sem || "ALL",
    total_students: Number(classInfo.total_students || 0),
    graded_count: Number(avgRow.graded_count || 0),
    class_average: Number(avgRow.class_average || 0),
    distribution: {
      "0-4": Number(distRow.g_0_4 || 0),
      "5-6": Number(distRow.g_5_6 || 0),
      "7-8": Number(distRow.g_7_8 || 0),
      "9-10": Number(distRow.g_9_10 || 0)
    },
    comparison: {
      HK1: Number(compareMap.get("HK1") || 0),
      HK2: Number(compareMap.get("HK2") || 0)
    }
  };
}

async function importGradesFromCsv({
  fileBuffer,
  classSubjectTeacherId,
  semester,
  academicYear
}) {
  const cstId = Number(classSubjectTeacherId);
  if (!Number.isFinite(cstId)) {
    throw new Error("class_subject_teacher_id không hợp lệ");
  }

  const defaultSemester = normalizeSemester(semester);
  const defaultAcademicYear = normalizeAcademicYear(academicYear);
  if (defaultSemester) assertSemester(defaultSemester);
  if (defaultAcademicYear) assertAcademicYear(defaultAcademicYear);

  const csvText = Buffer.from(fileBuffer).toString("utf8").replace(/^\uFEFF/, "").trim();
  if (!csvText) {
    return { inserted: 0, updated: 0, skipped: 0, errors: [] };
  }

  const rawRows = toCsvObjects(csvText);
  if (!rawRows.length) {
    return { inserted: 0, updated: 0, skipped: 0, errors: [] };
  }

  const normalizedRows = rawRows.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      normalized[normalizeHeaderKey(key)] = row[key];
    });

    const rowSemester = normalizeSemester(
      pickValue(normalized, ["semester", "hoc_ky", "hocky"]) || defaultSemester
    );
    const rowAcademicYear = normalizeAcademicYear(
      pickValue(normalized, ["academic_year", "nam_hoc", "nien_khoa"]) || defaultAcademicYear
    );

    return {
      student_code: String(
        pickValue(normalized, ["student_code", "ma_hoc_sinh", "ma_hs", "student_id"]) || ""
      ).trim(),
      semester: rowSemester,
      academic_year: rowAcademicYear,
      mieng_1: pickValue(normalized, ["mieng_1", "mieng1", "mieng_c1"]),
      mieng_2: pickValue(normalized, ["mieng_2", "mieng2", "mieng_c2"]),
      phut15_1: pickValue(normalized, ["phut15_1", "phut15_1_", "phut15_c1"]),
      phut15_2: pickValue(normalized, ["phut15_2", "phut15_2_", "phut15_c2"]),
      tiet1_1: pickValue(normalized, ["tiet1_1", "tiet1_c1", "1_tiet_1"]),
      tiet1_2: pickValue(normalized, ["tiet1_2", "tiet1_c2", "1_tiet_2"]),
      giuaki: pickValue(normalized, ["giuaki", "giua_ky", "gk"]),
      cuoiki: pickValue(normalized, ["cuoiki", "cuoi_ky", "ck"]),
      quick_tag: pickValue(normalized, ["quick_tag", "tag", "nhan_xet_nhanh"]),
      comment_text: pickValue(normalized, ["comment_text", "comment", "nhan_xet"])
    };
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cst = await getClassSubjectTeacher(client, cstId);
    if (!cst) throw new Error("Không tìm thấy lớp - môn phụ trách");

    const codes = Array.from(
      new Set(
        normalizedRows
          .map(row => row.student_code)
          .filter(Boolean)
      )
    );

    const studentMap = new Map();
    if (codes.length) {
      const studentRes = await client.query(
        `
          SELECT id, student_code
          FROM students
          WHERE class_id = $1
            AND student_code = ANY($2::text[]);
        `,
        [cst.class_id, codes]
      );
      studentRes.rows.forEach(row => {
        studentMap.set(row.student_code, Number(row.id));
      });
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (let index = 0; index < normalizedRows.length; index += 1) {
      const row = normalizedRows[index];
      const rowNo = index + 2;

      if (!row.student_code) {
        skipped += 1;
        errors.push({ row: rowNo, reason: "Thiếu student_code" });
        continue;
      }

      const studentId = studentMap.get(row.student_code);
      if (!studentId) {
        skipped += 1;
        errors.push({ row: rowNo, reason: "student_code không thuộc lớp được phân công" });
        continue;
      }

      if (!row.semester) {
        skipped += 1;
        errors.push({ row: rowNo, reason: "Thiếu học kỳ" });
        continue;
      }

      if (!row.academic_year) {
        skipped += 1;
        errors.push({ row: rowNo, reason: "Thiếu năm học" });
        continue;
      }

      try {
        assertSemester(row.semester);
        assertAcademicYear(row.academic_year);
        const scoreValues = parseScoreFields(row);
        const averageSemester = calculateSemesterAverage(scoreValues);

        const existing = await client.query(
          `
            SELECT 1
            FROM grades
            WHERE student_id = $1
              AND class_subject_teacher_id = $2
              AND semester = $3
              AND academic_year = $4
            LIMIT 1;
          `,
          [studentId, cstId, row.semester, row.academic_year]
        );

        await client.query(
          `
            INSERT INTO grades (
              student_id,
              class_subject_teacher_id,
              semester,
              academic_year,
              mieng_1,
              mieng_2,
              phut15_1,
              phut15_2,
              tiet1_1,
              tiet1_2,
              giuaki,
              cuoiki,
              average_semester,
              quick_tag,
              comment_text,
              updated_at
            )
            VALUES (
              $1, $2, $3, $4,
              $5, $6, $7, $8, $9, $10, $11, $12,
              $13, $14, $15, NOW()
            )
            ON CONFLICT (student_id, class_subject_teacher_id, semester, academic_year)
            DO UPDATE SET
              mieng_1 = EXCLUDED.mieng_1,
              mieng_2 = EXCLUDED.mieng_2,
              phut15_1 = EXCLUDED.phut15_1,
              phut15_2 = EXCLUDED.phut15_2,
              tiet1_1 = EXCLUDED.tiet1_1,
              tiet1_2 = EXCLUDED.tiet1_2,
              giuaki = EXCLUDED.giuaki,
              cuoiki = EXCLUDED.cuoiki,
              average_semester = EXCLUDED.average_semester,
              quick_tag = EXCLUDED.quick_tag,
              comment_text = EXCLUDED.comment_text,
              updated_at = NOW();
          `,
          [
            studentId,
            cstId,
            row.semester,
            row.academic_year,
            scoreValues.mieng_1,
            scoreValues.mieng_2,
            scoreValues.phut15_1,
            scoreValues.phut15_2,
            scoreValues.tiet1_1,
            scoreValues.tiet1_2,
            scoreValues.giuaki,
            scoreValues.cuoiki,
            averageSemester,
            row.quick_tag ? String(row.quick_tag).trim().slice(0, 50) : null,
            row.comment_text ? String(row.comment_text).trim() : null
          ]
        );

        if (existing.rows.length) {
          updated += 1;
        } else {
          inserted += 1;
        }
      } catch (error) {
        skipped += 1;
        errors.push({ row: rowNo, reason: error.message });
      }
    }

    await client.query("COMMIT");
    return { inserted, updated, skipped, errors };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function exportGradesToCsv({ classSubjectTeacherId, semester, academicYear }) {
  const data = await listGrades({
    classSubjectTeacherId,
    semester,
    academicYear
  });

  const header = [
    "student_code",
    "full_name",
    "semester",
    "academic_year",
    "mieng_1",
    "mieng_2",
    "phut15_1",
    "phut15_2",
    "tiet1_1",
    "tiet1_2",
    "giuaki",
    "cuoiki",
    "average_semester",
    "quick_tag",
    "comment_text"
  ];

  const lines = [buildCsvLine(header)];
  data.students.forEach(item => {
    lines.push(
      buildCsvLine([
        item.student_code,
        item.full_name,
        data.semester,
        data.academic_year,
        item.mieng_1,
        item.mieng_2,
        item.phut15_1,
        item.phut15_2,
        item.tiet1_1,
        item.tiet1_2,
        item.giuaki,
        item.cuoiki,
        item.average_semester,
        item.quick_tag,
        item.comment_text
      ])
    );
  });

  const safeClass = (data.class_name || "Class").replace(/[^a-zA-Z0-9_-]+/g, "_");
  const safeSubject = (data.subject || "Subject").replace(/[^a-zA-Z0-9_-]+/g, "_");
  const safeYear = data.academic_year.replace(/[^0-9-]+/g, "");
  const fileName = `grades_${safeClass}_${safeSubject}_${data.semester}_${safeYear}.csv`;

  return {
    fileName,
    content: lines.join("\n")
  };
}

module.exports = {
  listTeacherAssignments,
  listGrades,
  saveGrade,
  getDashboard,
  importGradesFromCsv,
  exportGradesToCsv
};
