const { readData, writeData, generateId } = require("./dataStore");
const teacherService = require("./teacherService");
const studentService = require("./studentService");

const CLASSES_FILE = "classes.json";
const { SUBJECTS, markAssignment, unassignFromClass } = teacherService;
// Business rules: mỗi lớp cần đủ 4 môn cố định, 1 GVCN; giáo viên tối đa 4 lớp và chỉ 1 lớp làm GVCN.

function loadClasses() {
  const data = readData(CLASSES_FILE, { classes: [] });
  return data.classes || [];
}

function saveClasses(classes) {
  writeData(CLASSES_FILE, { classes });
}

function assertSubjectTeachersMap(subject_teachers = {}) {
  const missing = SUBJECTS.filter(sub => !subject_teachers[sub]);
  if (missing.length) {
    throw new Error("Cần đủ 4 giáo viên cho các môn: " + missing.join(", "));
  }
}

function assertUniqueName(classes, name, currentId) {
  const dup = classes.find(
    c => c.name.toLowerCase() === name.toLowerCase() && String(c.id) !== String(currentId)
  );
  if (dup) throw new Error("Tên lớp đã tồn tại");
}

function cloneTeachers(teachers) {
  return teachers.map(t => JSON.parse(JSON.stringify(t)));
}

function syncTeacherArray(original, updated) {
  const updatedMap = new Map(updated.map(t => [String(t.id), t]));
  return original.map(t => updatedMap.get(String(t.id)) || t);
}

function createClass(payload) {
  const { name, grade_level, homeroom_teacher_id, subject_teachers = {} } = payload;
  if (!name || !grade_level) {
    throw new Error("Thiếu tên lớp hoặc khối");
  }
  assertSubjectTeachersMap(subject_teachers);

  const classes = loadClasses();
  assertUniqueName(classes, name);

  const teachers = teacherService.loadTeachers();
  const tempTeachers = cloneTeachers(teachers);
  const id = generateId();

  // prepare map for quick access
  const getTempTeacher = teacherId => {
    const found = tempTeachers.find(t => String(t.id) === String(teacherId));
    if (!found) throw new Error("Không tìm thấy giáo viên với ID " + teacherId);
    return found;
  };

  // assign homeroom
  if (homeroom_teacher_id) {
    const t = getTempTeacher(homeroom_teacher_id);
    markAssignment(t, id, { asHomeroom: true });
  }

  // assign subject teachers
  SUBJECTS.forEach(sub => {
    const tid = subject_teachers[sub];
    const t = getTempTeacher(tid);
    if (t.subject !== sub) {
      throw new Error(`Giáo viên ${t.full_name} không dạy môn ${sub}`);
    }
    markAssignment(t, id);
  });

  const cls = {
    id,
    name,
    grade_level: Number(grade_level),
    homeroom_teacher_id: homeroom_teacher_id || null,
    subject_teachers
  };

  classes.push(cls);
  saveClasses(classes);
  teacherService.saveTeachers(syncTeacherArray(teachers, tempTeachers));
  return cls;
}

function updateClass(id, payload) {
  const classes = loadClasses();
  const cls = classes.find(c => String(c.id) === String(id));
  if (!cls) throw new Error("Không tìm thấy lớp");

  const nextName = payload.name || cls.name;
  const nextGrade = payload.grade_level ?? cls.grade_level;
  const nextHomeroom = payload.homeroom_teacher_id ?? cls.homeroom_teacher_id;
  const nextSubjects = { ...cls.subject_teachers, ...(payload.subject_teachers || {}) };

  assertSubjectTeachersMap(nextSubjects);
  assertUniqueName(classes, nextName, id);

  const teachers = teacherService.loadTeachers();
  const tempTeachers = cloneTeachers(teachers);

  const getTempTeacher = teacherId => {
    const found = tempTeachers.find(t => String(t.id) === String(teacherId));
    if (!found) throw new Error("Không tìm thấy giáo viên với ID " + teacherId);
    return found;
  };

  // Remove previous assignments first
  const previouslyAssigned = new Set([
    cls.homeroom_teacher_id,
    ...Object.values(cls.subject_teachers || {})
  ].filter(Boolean));

  tempTeachers.forEach(t => {
    if (previouslyAssigned.has(t.id)) {
      unassignFromClass(t, cls.id);
    }
  });

  // Re-assign based on new data
  if (nextHomeroom) {
    const t = getTempTeacher(nextHomeroom);
    markAssignment(t, cls.id, { asHomeroom: true });
  }

  SUBJECTS.forEach(sub => {
    const tid = nextSubjects[sub];
    const t = getTempTeacher(tid);
    if (t.subject !== sub) {
      throw new Error(`Giáo viên ${t.full_name} không dạy môn ${sub}`);
    }
    markAssignment(t, cls.id);
  });

  cls.name = nextName;
  cls.grade_level = Number(nextGrade);
  cls.homeroom_teacher_id = nextHomeroom || null;
  cls.subject_teachers = nextSubjects;

  saveClasses(classes);
  teacherService.saveTeachers(syncTeacherArray(teachers, tempTeachers));
  return cls;
}

function deleteClass(id) {
  const classes = loadClasses();
  const cls = classes.find(c => String(c.id) === String(id));
  if (!cls) throw new Error("Không tìm thấy lớp");

  const teachers = teacherService.loadTeachers();
  teachers.forEach(t => {
    unassignFromClass(t, cls.id);
  });
  teacherService.saveTeachers(teachers);

  const nextClasses = classes.filter(c => String(c.id) !== String(id));
  saveClasses(nextClasses);

  studentService.unassignClass(id);
  return true;
}

module.exports = {
  SUBJECTS,
  loadClasses,
  createClass,
  updateClass,
  deleteClass
};
