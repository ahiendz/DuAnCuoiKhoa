const CLASS_API = "/api/classes";
const TEACHER_API = "/api/teachers";

let teachers = [];
let classes = [];
let editingId = null;

function optionLabel(teacher) {
  const classCount = teacher.teaching_classes ? teacher.teaching_classes.length : 0;
  return `${teacher.full_name} • ${teacher.subject} • ${classCount}/4 lớp${teacher.is_homeroom ? " • GVCN" : ""}`;
}

function isRestrictedTeacher(teacher) {
  const fullLoad = (teacher.teaching_classes || []).length >= 4;
  const homeroomElsewhere =
    teacher.is_homeroom && teacher.homeroom_class_id && String(teacher.homeroom_class_id) !== String(editingId);
  return fullLoad || homeroomElsewhere;
}

function sortTeachers(list) {
  return [...list].sort((a, b) => {
    const aRestricted = isRestrictedTeacher(a);
    const bRestricted = isRestrictedTeacher(b);
    if (aRestricted !== bRestricted) return aRestricted ? 1 : -1;
    return a.full_name.localeCompare(b.full_name, "vi");
  });
}

function renderSelect(selectId, list, placeholder) {
  const element = document.getElementById(selectId);
  if (!element) return;

  element.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = placeholder;
  element.appendChild(defaultOption);

  sortTeachers(list).forEach(teacher => {
    const option = document.createElement("option");
    option.value = teacher.id;
    option.textContent = optionLabel(teacher);
    if (isRestrictedTeacher(teacher)) {
      option.classList.add("option-restricted");
    }
    element.appendChild(option);
  });
}

function renderTeacherOptions() {
  renderSelect("homeroomSelect", teachers, "Chọn giáo viên chủ nhiệm");
  renderSelect("teacherToan", teachers.filter(t => t.subject === "Toán"), "Giáo viên Toán");
  renderSelect("teacherVan", teachers.filter(t => t.subject === "Văn"), "Giáo viên Văn");
  renderSelect("teacherAnh", teachers.filter(t => t.subject === "Anh"), "Giáo viên Anh");
  renderSelect("teacherKHTN", teachers.filter(t => t.subject === "KHTN"), "Giáo viên KHTN");
}

async function loadTeachers() {
  const response = await fetch(TEACHER_API);
  teachers = await response.json();
  renderTeacherOptions();
}

async function loadClasses() {
  const response = await fetch(CLASS_API);
  classes = await response.json();
  renderClasses();
}

function teacherName(id) {
  if (!id) return "—";
  const teacher = teachers.find(item => String(item.id) === String(id));
  return teacher ? teacher.full_name : "Không rõ";
}

function renderClasses() {
  const tbody = document.getElementById("classTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  classes.forEach(cls => {
    tbody.innerHTML += `
      <tr>
        <td>${cls.name}</td>
        <td>${cls.grade_level}</td>
        <td>${teacherName(cls.homeroom_teacher_id)}</td>
        <td>${teacherName(cls.subject_teachers?.["Toán"])}</td>
        <td>${teacherName(cls.subject_teachers?.["Văn"])}</td>
        <td>${teacherName(cls.subject_teachers?.["Anh"])}</td>
        <td>${teacherName(cls.subject_teachers?.["KHTN"])}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-action" onclick="editClass(${cls.id})">Sửa</button>
            <button class="btn btn-secondary btn-action" onclick="deleteClass(${cls.id})">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function getFormPayload() {
  const name = document.getElementById("className").value.trim();
  const gradeLevel = Number(document.getElementById("classGrade").value);
  const homeroomTeacherId = document.getElementById("homeroomSelect").value;
  const subjectTeachers = {
    Toán: document.getElementById("teacherToan").value,
    Văn: document.getElementById("teacherVan").value,
    Anh: document.getElementById("teacherAnh").value,
    KHTN: document.getElementById("teacherKHTN").value
  };

  return {
    name,
    grade_level: gradeLevel,
    homeroom_teacher_id: homeroomTeacherId ? Number(homeroomTeacherId) : null,
    subject_teachers: Object.fromEntries(
      Object.entries(subjectTeachers).map(([subject, teacherId]) => [subject, Number(teacherId)])
    )
  };
}

async function submitClass() {
  const errorEl = document.getElementById("classError");
  if (errorEl) errorEl.innerText = "";

  try {
    const payload = getFormPayload();
    if (!payload.name || !payload.grade_level) {
      throw new Error("Vui lòng nhập tên lớp và khối");
    }

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${CLASS_API}/${editingId}` : CLASS_API;

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Không thể lưu lớp");
    }

    await loadClasses();
    await loadTeachers();
    resetForm();
  } catch (error) {
    if (errorEl) errorEl.innerText = error.message;
  }
}

function resetForm() {
  editingId = null;
  document.getElementById("className").value = "";
  document.getElementById("classGrade").value = "";
  ["homeroomSelect", "teacherToan", "teacherVan", "teacherAnh", "teacherKHTN"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("classSubmitBtn").innerText = "Lưu lớp";
  document.getElementById("classError").innerText = "";
  renderTeacherOptions();
}

function editClass(id) {
  const cls = classes.find(item => String(item.id) === String(id));
  if (!cls) return;

  editingId = id;
  renderTeacherOptions();

  document.getElementById("className").value = cls.name;
  document.getElementById("classGrade").value = cls.grade_level;
  document.getElementById("homeroomSelect").value = cls.homeroom_teacher_id || "";
  document.getElementById("teacherToan").value = cls.subject_teachers["Toán"] || "";
  document.getElementById("teacherVan").value = cls.subject_teachers["Văn"] || "";
  document.getElementById("teacherAnh").value = cls.subject_teachers["Anh"] || "";
  document.getElementById("teacherKHTN").value = cls.subject_teachers["KHTN"] || "";
  document.getElementById("classSubmitBtn").innerText = "Cập nhật lớp";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteClass(id) {
  if (!window.confirm("Xóa lớp này? Các dữ liệu liên quan sẽ được xử lý theo cấu hình hệ thống.")) {
    return;
  }

  const response = await fetch(`${CLASS_API}/${id}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok || data.error) {
    alert(data.error || "Không thể xóa lớp");
    return;
  }

  await loadClasses();
  await loadTeachers();
}

async function init() {
  await loadTeachers();
  await loadClasses();
}

init();
