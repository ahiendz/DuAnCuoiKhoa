const TEACHER_API = "http://localhost:3000/api/teachers";

/* LOAD */
async function loadTeachers() {
  const res = await fetch(TEACHER_API);
  const teachers = await res.json();
  renderTeachers(teachers);
}

/* ADD */
async function addTeacher() {
  const name = document.getElementById("tName").value.trim();
  const email = document.getElementById("tEmail").value.trim();
  const password = document.getElementById("tPassword").value.trim();

  if (!name || !email || !password) {
    alert("Nhập đủ thông tin giáo viên");
    return;
  }

  const res = await fetch(TEACHER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  if (!res.ok) {
    alert("Lỗi khi thêm giáo viên");
    return;
  }

  document.getElementById("tName").value = "";
  document.getElementById("tEmail").value = "";
  document.getElementById("tPassword").value = "";

  loadTeachers();
}

/* DELETE */
async function deleteTeacher(id) {
  await fetch(`${TEACHER_API}/${id}`, { method: "DELETE" });
  loadTeachers();
}

/* RENDER */
function renderTeachers(list) {
  const table = document.getElementById("teacherTable");
  table.innerHTML = "";

  list.forEach(t => {
    table.innerHTML += `
      <tr>
        <td>${t.name}</td>
        <td>${t.email}</td>
        <td>
          <button class="btn btn-outline"
            onclick="deleteTeacher(${t.id})">❌</button>
        </td>
      </tr>
    `;
  });
}

/* AUTO LOAD */
loadTeachers();
