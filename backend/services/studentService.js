const fs = require("fs");
const path = require("path");
const { DATA_DIR, readData, generateId } = require("./dataStore");

const STUDENTS_FILE = "students.json";
const CLASSES_FILE = "classes.json";
const STUDENTS_PATH = path.join(DATA_DIR, STUDENTS_FILE);
// Business rules: student_code phải duy nhất, class_id phải tồn tại (nếu được gán).

function logDebug(message, data) {
  console.log(`[students] ${message}`, data ?? "");
}

function loadStudents() {
  const data = readData(STUDENTS_FILE, []);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.students)) return data.students;
  return [];
}

function writeStudentsAtomic(students) {
  const tmpPath = `${STUDENTS_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(students, null, 2), "utf-8");
  try {
    fs.renameSync(tmpPath, STUDENTS_PATH);
  } catch (err) {
    if (fs.existsSync(STUDENTS_PATH)) {
      fs.unlinkSync(STUDENTS_PATH);
    }
    fs.renameSync(tmpPath, STUDENTS_PATH);
  }
}

function loadClasses() {
  const data = readData(CLASSES_FILE, { classes: [] });
  return data.classes || [];
}

function normalizeClassId(classId) {
  if (!classId) return null;
  const classes = loadClasses();
  const byId = classes.find(c => String(c.id) === String(classId));
  if (byId) return byId.name;
  const byName = classes.find(c => String(c.name) === String(classId));
  if (byName) return byName.name;
  return null;
}

function normalizeStudentClassIds(students) {
  let changed = false;
  const normalized = students.map(student => {
    if (!student || !student.class_id) return student;
    const normalizedClass = normalizeClassId(student.class_id);
    if (normalizedClass && String(student.class_id) !== String(normalizedClass)) {
      changed = true;
      return { ...student, class_id: normalizedClass };
    }
    return student;
  });
  return { students: normalized, changed };
}

function ensureClassExists(classId) {
  const normalized = normalizeClassId(classId);
  if (!normalized) {
    throw new Error("Lớp học không tồn tại");
  }
  return normalized;
}

function ensureUniqueCode(students, student_code, currentId) {
  const duplicate = students.find(
    s =>
      s.student_code === student_code &&
      (!currentId || String(s.id) !== String(currentId))
  );
  if (duplicate) {
    throw new Error("Mã học sinh (student_code) đã tồn tại");
  }
}

function generateStudentCode(students) {
  const year = new Date().getFullYear();
  const prefix = `HS${year}-`;
  let max = 0;

  students.forEach(s => {
    if (!s.student_code || !s.student_code.startsWith(prefix)) return;
    const raw = s.student_code.slice(prefix.length);
    const num = Number(raw);
    if (Number.isFinite(num) && num > max) {
      max = num;
    }
  });

  let next = max + 1;
  let code = `${prefix}${String(next).padStart(3, "0")}`;
  while (students.some(s => s.student_code === code)) {
    next += 1;
    code = `${prefix}${String(next).padStart(3, "0")}`;
  }

  return code;
}

function listStudents(filter = {}) {
  const loaded = loadStudents();
  const { students, changed } = normalizeStudentClassIds(loaded);
  if (changed) writeStudentsAtomic(students);
  if (filter.class_id) {
    const className = normalizeClassId(filter.class_id);
    logDebug("Filter students", {
      filter: filter.class_id,
      normalized: className,
      sample: students.slice(0, 3).map(s => ({
        class_id: s.class_id,
        type: typeof s.class_id
      }))
    });
    if (!className) return [];
    return students.filter(
      s =>
        String(s.class_id) === String(className) ||
        String(s.class_id) === String(filter.class_id)
    );
  }
  logDebug("List students", {
    count: students.length,
    sample: students.slice(0, 3).map(s => ({
      class_id: s.class_id,
      type: typeof s.class_id
    }))
  });
  return students;
}

function createStudent(payload) {
  const { full_name, dob, gender, class_id } = payload;
  if (!full_name || !class_id) {
    throw new Error("Thiếu họ tên hoặc lớp học");
  }
  const className = ensureClassExists(class_id);

  const loaded = loadStudents();
  const { students, changed } = normalizeStudentClassIds(loaded);
  if (changed) writeStudentsAtomic(students);
  const student_code = generateStudentCode(students);

  const student = {
    id: generateId(),
    full_name,
    student_code,
    dob: dob || "",
    gender: gender || "",
    class_id: className
  };

  students.push(student);
  writeStudentsAtomic(students);
  return student;
}

function updateStudent(id, payload) {
  const loaded = loadStudents();
  const { students, changed } = normalizeStudentClassIds(loaded);
  if (changed) writeStudentsAtomic(students);
  const student = students.find(s => String(s.id) === String(id));
  if (!student) throw new Error("Không tìm thấy học sinh");

  if (payload.class_id) {
    const className = ensureClassExists(payload.class_id);
    student.class_id = className;
  }
  if (payload.student_code) {
    ensureUniqueCode(students, payload.student_code, id);
    student.student_code = payload.student_code;
  }

  student.full_name = payload.full_name || student.full_name;
  student.dob = payload.dob ?? student.dob;
  student.gender = payload.gender ?? student.gender;

  writeStudentsAtomic(students);
  return student;
}

function deleteStudent(id) {
  const loaded = loadStudents();
  const { students, changed } = normalizeStudentClassIds(loaded);
  if (changed) writeStudentsAtomic(students);
  const next = students.filter(s => String(s.id) !== String(id));
  if (next.length === students.length) {
    throw new Error("Không tìm thấy học sinh");
  }
  writeStudentsAtomic(next);
  return true;
}

function validateRow(row, selectedClass) {
  const errors = {};
  if (!row.student_code) errors.student_code = "Thiếu mã học sinh";
  if (!row.full_name) errors.full_name = "Thiếu họ tên";
  if (!row.dob || !/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) {
    errors.dob = "Ngày sinh không đúng định dạng YYYY-MM-DD";
  }
  if (!row.gender || !["male", "female"].includes(row.gender)) {
    errors.gender = "Giới tính phải là male/female";
  }
  if (!row.class_id) {
    errors.class_id = "Thiếu class_id";
  } else if (String(row.class_id) !== String(selectedClass)) {
    errors.class_id = "class_id không đúng lớp đã chọn";
  }
  return errors;
}

function importStudents(rows, mode, selectedClass) {
  const className = ensureClassExists(selectedClass);
  const loaded = loadStudents();
  const { students, changed } = normalizeStudentClassIds(loaded);
  if (changed) writeStudentsAtomic(students);
  logDebug("Import students", {
    mode,
    selectedClass,
    normalizedClass: className,
    rows: rows.length
  });
  const existingByCode = new Map(
    students.map(s => [s.student_code, s])
  );

  const codeCounts = {};
  rows.forEach(r => {
    codeCounts[r.student_code] = (codeCounts[r.student_code] || 0) + 1;
  });

  rows.forEach(row => {
    if (codeCounts[row.student_code] > 1) {
      throw new Error(`Trùng mã học sinh trong CSV: ${row.student_code}`);
    }
    const errors = validateRow(row, className);
    if (Object.keys(errors).length) {
      throw new Error(`Dữ liệu CSV không hợp lệ: ${row.student_code || "N/A"}`);
    }
    const existing = existingByCode.get(row.student_code);
    if (existing && String(existing.class_id) !== String(className)) {
      throw new Error(`Mã học sinh đã tồn tại ở lớp khác: ${row.student_code}`);
    }
  });

  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  if (mode === "replace") {
    const remaining = students.filter(s => String(s.class_id) !== String(className));
    deleted = students.length - remaining.length;
    rows.forEach(row => {
      remaining.push({
        id: generateId(),
        student_code: row.student_code,
        full_name: row.full_name,
        dob: row.dob,
        gender: row.gender,
        class_id: className
      });
      inserted += 1;
    });
    writeStudentsAtomic(remaining);
    return { inserted, updated, deleted };
  }

  rows.forEach(row => {
    const existing = existingByCode.get(row.student_code);
    if (existing) {
      existing.full_name = row.full_name;
      existing.dob = row.dob;
      existing.gender = row.gender;
      existing.class_id = className;
      updated += 1;
      return;
    }
    students.push({
      id: generateId(),
      student_code: row.student_code,
      full_name: row.full_name,
      dob: row.dob,
      gender: row.gender,
      class_id: className
    });
    inserted += 1;
  });

  writeStudentsAtomic(students);
  return { inserted, updated, deleted };
}

function unassignClass(classId) {
  const className = normalizeClassId(classId);
  if (!className) return;
  const loaded = loadStudents();
  const { students, changed } = normalizeStudentClassIds(loaded);
  if (changed) writeStudentsAtomic(students);
  let dirty = false;
  students.forEach(s => {
    if (String(s.class_id) === String(className)) {
      s.class_id = null;
      dirty = true;
    }
  });
  if (dirty) writeStudentsAtomic(students);
}

module.exports = {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudents,
  unassignClass
};
