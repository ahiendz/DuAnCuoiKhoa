const CLASS_API = "/api/classes";
const TEACHER_API = "/api/teachers";

let teachers = [];
let classes = [];
let editingId = null;

function optionLabel(t) {
  const count = t.teaching_classes ? t.teaching_classes.length : 0;
  return `${t.full_name} • ${t.subject} • ${count}/4 lớp${t.is_homeroom ? " • GVCN" : ""}`;
}

function isRestrictedTeacher(t) {
  const fullLoad = (t.teaching_classes || []).length >= 4;
  const homeroomElsewhere =
    t.is_homeroom && t.homeroom_class_id && String(t.homeroom_class_id) !== String(editingId);
  return fullLoad || homeroomElsewhere;
}

function sortTeachers(list) {
  return [...list].sort((a, b) => {
    const aRestricted = isRestrictedTeacher(a);
    const bRestricted = isRestrictedTeacher(b);
    if (aRestricted !== bRestricted) return aRestricted ? 1 : -1;
    return a.full_name.localeCompare(b.full_name);
  });
}

function renderSelect(selectId, list, placeholder) {
  const el = document.getElementById(selectId);
  el.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  el.appendChild(first);

  sortTeachers(list).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = optionLabel(t);
    if (isRestrictedTeacher(t)) {
      opt.classList.add("option-restricted");
    }
    el.appendChild(opt);
  });
}

function renderTeacherOptions() {
  renderSelect("homeroomSelect", teachers, "Chọn GVCN");
  renderSelect("teacherToan", teachers.filter(t => t.subject === "Toán"), "Giáo viên Toán");
  renderSelect("teacherVan", teachers.filter(t => t.subject === "Văn"), "Giáo viên Văn");
  renderSelect("teacherAnh", teachers.filter(t => t.subject === "Anh"), "Giáo viên Anh");
  renderSelect("teacherKHTN", teachers.filter(t => t.subject === "KHTN"), "Giáo viên KHTN");
}

async function loadTeachers() {
  const res = await fetch(TEACHER_API);
  teachers = await res.json();
  renderTeacherOptions();
}

async function loadClasses() {
  const res = await fetch(CLASS_API);
  classes = await res.json();
  renderClasses();
}

function teacherName(id) {
  if (!id) return "—";
  const t = teachers.find(x => String(x.id) === String(id));
  return t ? t.full_name : "Không rõ";
}

function renderClasses() {
  const tbody = document.getElementById("classTable");
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
            <button class="btn btn-outline btn-action" onclick="deleteClass(${cls.id})">Xoá</button>
          </div>
        </td>
      </tr>
    `;
  });
}

function getFormPayload() {
  const name = document.getElementById("className").value.trim();
  const grade_level = Number(document.getElementById("classGrade").value);
  const homeroom_teacher_id = document.getElementById("homeroomSelect").value;
  const subject_teachers = {
    "Toán": document.getElementById("teacherToan").value,
    "Văn": document.getElementById("teacherVan").value,
    "Anh": document.getElementById("teacherAnh").value,
    "KHTN": document.getElementById("teacherKHTN").value
  };

  return {
    name,
    grade_level,
    homeroom_teacher_id: homeroom_teacher_id ? Number(homeroom_teacher_id) : null,
    subject_teachers: Object.fromEntries(
      Object.entries(subject_teachers).map(([k, v]) => [k, Number(v)])
    )
  };
}

async function submitClass() {
  const errorEl = document.getElementById("classError");
  errorEl.innerText = "";
  try {
    const payload = getFormPayload();
    if (!payload.name || !payload.grade_level) {
      throw new Error("Vui lòng nhập tên lớp và khối");
    }

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${CLASS_API}/${editingId}` : CLASS_API;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Không thể lưu lớp");
    }

    await loadClasses();
    await loadTeachers();
    resetForm();
  } catch (err) {
    errorEl.innerText = err.message;
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
  const cls = classes.find(c => String(c.id) === String(id));
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
  if (!confirm("Xoá lớp này? Học sinh sẽ được bỏ phân lớp.")) return;
  const res = await fetch(`${CLASS_API}/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok || data.error) {
    alert(data.error || "Không thể xoá lớp");
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
