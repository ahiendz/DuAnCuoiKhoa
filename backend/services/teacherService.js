const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { readData, writeData, generateId } = require("./dataStore");

const SUBJECTS = ["Toán", "Văn", "Anh", "KHTN"];
const TEACHERS_FILE = "teachers.json";
const USERS_FILE = "users.json";
const SALT_ROUNDS = 10;
// Business rules: giáo viên tối đa 4 lớp (teaching_classes), GVCN duy nhất (homeroom_class_id), môn dạy cố định.

function loadTeachers() {
  const data = readData(TEACHERS_FILE, { teachers: [] });
  return data.teachers || [];
}

function saveTeachers(teachers) {
  writeData(TEACHERS_FILE, { teachers });
}

function loadUsers() {
  const data = readData(USERS_FILE, { users: [] });
  return data.users || [];
}

function saveUsers(users) {
  writeData(USERS_FILE, { users });
}

function findTeacher(teachers, id) {
  return teachers.find(t => String(t.id) === String(id));
}

function assertSubjectValid(subject) {
  if (!SUBJECTS.includes(subject)) {
    throw new Error("Môn học không hợp lệ (Toán, Văn, Anh, KHTN)");
  }
}

function assertTeacherCapacity(teacher, classId) {
  const already = teacher.teaching_classes.includes(classId);
  if (!already && teacher.teaching_classes.length >= 4) {
    throw new Error(`Giáo viên ${teacher.full_name} đã đủ 4 lớp được phân công`);
  }
}

function assertHomeroomAvailability(teacher, classId) {
  if (
    teacher.homeroom_class_id &&
    String(teacher.homeroom_class_id) !== String(classId)
  ) {
    throw new Error(`Giáo viên ${teacher.full_name} đã là GVCN của lớp khác`);
  }
}

function assertUniqueEmail(users, email, currentId) {
  if (!email) {
    throw new Error("Email là bắt buộc");
  }
  const dup = users.find(
    u => u.email === email && (!currentId || String(u.id) !== String(currentId))
  );
  if (dup) {
    throw new Error("Email đã tồn tại trong hệ thống đăng nhập");
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

function syncUserAccount(teacher, payload) {
  const users = loadUsers();
  const idx = users.findIndex(u => String(u.id) === String(teacher.id));
  if (idx === -1) return;

  if (payload.email) {
    assertUniqueEmail(users, payload.email, teacher.id);
    users[idx].email = payload.email;
  }

  users[idx].name = teacher.full_name;
  saveUsers(users);
}

function updateUserPassword(teacherId, newPassword) {
  if (!newPassword) return;
  const users = loadUsers();
  const idx = users.findIndex(u => String(u.id) === String(teacherId));
  if (idx === -1) {
    throw new Error("Không tìm thấy tài khoản giáo viên để đổi mật khẩu");
  }
  users[idx].password = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  saveUsers(users);
}

function removeUserAccount(teacherId) {
  const users = loadUsers();
  const next = users.filter(u => String(u.id) !== String(teacherId));
  saveUsers(next);
}

function createTeacher(payload) {
  const { full_name, gender, subject, email, password } = payload;
  if (!full_name || !gender || !subject) {
    throw new Error("Thiếu thông tin giáo viên");
  }

  assertSubjectValid(subject);
  const users = loadUsers();
  assertUniqueEmail(users, email, null);

  const teachers = loadTeachers();
  const newId = generateId();
  const teacher = {
    id: newId,
    full_name,
    gender,
    subject,
    contact_email: email || "",
    is_homeroom: false,
    homeroom_class_id: null,
    teaching_classes: []
  };

  const generatedPassword = password ? null : generatePassword();
  const finalPassword = password || generatedPassword;
  const hashedPassword = bcrypt.hashSync(finalPassword, SALT_ROUNDS);

  teachers.push(teacher);
  saveTeachers(teachers);
  users.push({
    id: newId,
    name: full_name,
    email,
    password: hashedPassword,
    role: "teacher"
  });
  saveUsers(users);

  return {
    teacher,
    generatedPassword
  };
}

function updateTeacher(id, payload) {
  const teachers = loadTeachers();
  const teacher = findTeacher(teachers, id);
  if (!teacher) throw new Error("Không tìm thấy giáo viên");

  if (payload.subject) assertSubjectValid(payload.subject);

  teacher.full_name = payload.full_name || teacher.full_name;
  teacher.gender = payload.gender || teacher.gender;
  teacher.subject = payload.subject || teacher.subject;
  teacher.contact_email = payload.email ?? teacher.contact_email;

  saveTeachers(teachers);
  syncUserAccount(teacher, payload);
  if (payload.password) {
    updateUserPassword(teacher.id, payload.password);
  }
  return teacher;
}

function deleteTeacher(id, { classes = [] } = {}) {
  const teachers = loadTeachers();
  const teacher = findTeacher(teachers, id);
  if (!teacher) throw new Error("Không tìm thấy giáo viên");

  const isTeaching = classes.some(
    cls =>
      cls.homeroom_teacher_id === teacher.id ||
      Object.values(cls.subject_teachers || {}).includes(teacher.id)
  );
  if (isTeaching) {
    throw new Error(
      "Giáo viên đang được phân lớp. Hãy gỡ phân công trước khi xoá."
    );
  }

  const next = teachers.filter(t => String(t.id) !== String(id));
  saveTeachers(next);
  removeUserAccount(id);
  return true;
}

function markAssignment(teacher, classId, { asHomeroom = false } = {}) {
  assertTeacherCapacity(teacher, classId);
  if (!teacher.teaching_classes.includes(classId)) {
    teacher.teaching_classes.push(classId);
  }
  if (asHomeroom) {
    assertHomeroomAvailability(teacher, classId);
    teacher.is_homeroom = true;
    teacher.homeroom_class_id = classId;
  }
}

function unassignFromClass(teacher, classId) {
  teacher.teaching_classes = teacher.teaching_classes.filter(
    cid => String(cid) !== String(classId)
  );
  if (String(teacher.homeroom_class_id) === String(classId)) {
    teacher.is_homeroom = false;
    teacher.homeroom_class_id = null;
  }
}

module.exports = {
  SUBJECTS,
  loadTeachers,
  saveTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  markAssignment,
  unassignFromClass
};
