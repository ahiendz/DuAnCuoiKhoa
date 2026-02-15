const TEACHER_API = "/api/teachers";

let teachers = [];
let editingId = null;

function setNotice(message, isError = false) {
  const element = document.getElementById("teacherNotice");
  if (!element) return;
  element.style.color = isError ? "#ff879f" : "#9fb4dc";
  element.innerText = message || "";
}

function clearError() {
  const errorEl = document.getElementById("teacherError");
  if (errorEl) {
    errorEl.innerText = "";
  }
}

function resetTeacherForm(keepNotice = false) {
  editingId = null;
  document.getElementById("tName").value = "";
  document.getElementById("tGender").value = "";
  document.getElementById("tSubject").value = "";
  document.getElementById("tEmail").value = "";
  document.getElementById("tPassword").value = "";

  const submitButton = document.getElementById("teacherSubmitBtn");
  if (submitButton) submitButton.innerText = "Lưu giáo viên";

  if (!keepNotice) {
    setNotice("");
  }
  clearError();
}

function togglePassword(event) {
  const input = document.getElementById("tPassword");
  const button = event.currentTarget;
  if (!input || !button) return;

  if (input.type === "password") {
    input.type = "text";
    button.innerText = "Ẩn";
  } else {
    input.type = "password";
    button.innerText = "Hiện";
  }
}

async function loadTeachers() {
  const response = await fetch(TEACHER_API);
  teachers = await response.json();
  renderTeachers();
}

function renderTeachers() {
  const table = document.getElementById("teacherTable");
  if (!table) return;

  table.innerHTML = "";
  teachers.forEach(teacher => {
    const classCount = teacher.teaching_classes ? teacher.teaching_classes.length : 0;
    const homeroomBadge = teacher.is_homeroom ? '<span class="status-badge">GVCN</span>' : "";

    table.innerHTML += `
      <tr>
        <td>${teacher.full_name}</td>
        <td>${teacher.subject}</td>
        <td>${homeroomBadge}</td>
        <td>${classCount} lớp</td>
        <td>${teacher.contact_email || "—"}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-action" onclick="editTeacher(${teacher.id})">Sửa</button>
            <button class="btn btn-secondary btn-action" onclick="deleteTeacher(${teacher.id})">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  });
}

async function addTeacher() {
  clearError();
  setNotice("");

  const passwordValue = document.getElementById("tPassword").value.trim();
  const payload = {
    full_name: document.getElementById("tName").value.trim(),
    gender: document.getElementById("tGender").value,
    subject: document.getElementById("tSubject").value,
    email: document.getElementById("tEmail").value.trim()
  };

  if (passwordValue) {
    payload.password = passwordValue;
  }

  if (!payload.full_name || !payload.gender || !payload.subject || !payload.email) {
    document.getElementById("teacherError").innerText = "Nhập đầy đủ họ tên, giới tính, môn học và email.";
    return;
  }

  const method = editingId ? "PUT" : "POST";
  const url = editingId ? `${TEACHER_API}/${editingId}` : TEACHER_API;

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Không lưu được giáo viên");
    }

    await loadTeachers();
    resetTeacherForm(true);

    if (data.generatedPassword) {
      setNotice(`Mật khẩu tự tạo: ${data.generatedPassword} (chỉ hiển thị một lần).`);
    }
  } catch (error) {
    document.getElementById("teacherError").innerText = error.message;
  }
}

function editTeacher(id) {
  const teacher = teachers.find(item => String(item.id) === String(id));
  if (!teacher) return;

  editingId = id;
  document.getElementById("tName").value = teacher.full_name;
  document.getElementById("tGender").value = teacher.gender;
  document.getElementById("tSubject").value = teacher.subject;
  document.getElementById("tEmail").value = teacher.contact_email || "";
  document.getElementById("tPassword").value = "";

  const submitButton = document.getElementById("teacherSubmitBtn");
  if (submitButton) submitButton.innerText = "Cập nhật giáo viên";

  setNotice("Nhập mật khẩu mới nếu cần thay đổi thông tin đăng nhập.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteTeacher(id) {
  if (!window.confirm("Xóa giáo viên? Cần gỡ phân công lớp trước khi xóa.")) {
    return;
  }

  try {
    const response = await fetch(`${TEACHER_API}/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Không xóa được giáo viên");
    }
    await loadTeachers();
  } catch (error) {
    alert(error.message);
  }
}

loadTeachers();
