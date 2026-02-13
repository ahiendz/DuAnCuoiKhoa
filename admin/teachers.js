const TEACHER_API = "/api/teachers";

let teachers = [];
let editingId = null;

function setNotice(message, isError = false) {
  const el = document.getElementById("teacherNotice");
  el.style.color = isError ? "red" : "#6b7280";
  el.innerText = message || "";
}

function clearError() {
  document.getElementById("teacherError").innerText = "";
}

function resetTeacherForm(keepNotice = false) {
  editingId = null;
  document.getElementById("tName").value = "";
  document.getElementById("tGender").value = "";
  document.getElementById("tSubject").value = "";
  document.getElementById("tEmail").value = "";
  document.getElementById("tPassword").value = "";
  document.querySelector(".card button.btn-primary").innerText = "Lưu giáo viên";
  if (!keepNotice) {
    setNotice("");
  }
  clearError();
}

function togglePassword(evt) {
  const input = document.getElementById("tPassword");
  const btn = evt.currentTarget;
  if (input.type === "password") {
    input.type = "text";
    btn.innerText = "Ẩn";
  } else {
    input.type = "password";
    btn.innerText = "Hiện";
  }
}

async function loadTeachers() {
  const res = await fetch(TEACHER_API);
  teachers = await res.json();
  renderTeachers();
}

function renderTeachers() {
  const table = document.getElementById("teacherTable");
  table.innerHTML = "";
  teachers.forEach(t => {
    const classCount = t.teaching_classes ? t.teaching_classes.length : 0;
    const homeroomBadge = t.is_homeroom
      ? '<span class="status-badge">GVCN</span>'
      : "";
    table.innerHTML += `
      <tr>
        <td>${t.full_name}</td>
        <td>${t.subject}</td>
        <td>${homeroomBadge}</td>
        <td>${classCount} lớp</td>
        <td>${t.contact_email || "—"}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-action" onclick="editTeacher(${t.id})">Sửa</button>
            <button class="btn btn-outline btn-action" onclick="deleteTeacher(${t.id})">Xoá</button>
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
    document.getElementById("teacherError").innerText =
      "Nhập đầy đủ họ tên, giới tính, môn và email.";
    return;
  }

  const method = editingId ? "PUT" : "POST";
  const url = editingId ? `${TEACHER_API}/${editingId}` : TEACHER_API;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Không lưu được giáo viên");

    await loadTeachers();
    resetTeacherForm(true);
    if (data.generatedPassword) {
      setNotice(`Mật khẩu tự tạo: ${data.generatedPassword} (chỉ hiển thị một lần)`);
    }
  } catch (err) {
    document.getElementById("teacherError").innerText = err.message;
  }
}

function editTeacher(id) {
  const t = teachers.find(x => String(x.id) === String(id));
  if (!t) return;
  editingId = id;
  document.getElementById("tName").value = t.full_name;
  document.getElementById("tGender").value = t.gender;
  document.getElementById("tSubject").value = t.subject;
  document.getElementById("tEmail").value = t.contact_email || "";
  document.getElementById("tPassword").value = "";
  document.querySelector(".card button.btn-primary").innerText = "Cập nhật giáo viên";
  setNotice("Nhập mật khẩu mới nếu muốn đổi.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteTeacher(id) {
  if (!confirm("Xoá giáo viên? Cần gỡ phân công lớp trước.")) return;
  try {
    const res = await fetch(`${TEACHER_API}/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Không xoá được giáo viên");
    await loadTeachers();
  } catch (err) {
    alert(err.message);
  }
}

loadTeachers();
