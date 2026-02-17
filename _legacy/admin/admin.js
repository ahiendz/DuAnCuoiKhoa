const API = "http://localhost:3000/api/classes";

/* LOAD */
async function loadClasses() {
  const res = await fetch(API);
  const classes = await res.json();
  renderClasses(classes);
}

/* ADD */
async function addClass() {
  const name = className.value.trim();
  const grade = Number(classGrade.value);

  if (!name || !grade) {
    alert("Nhập đủ thông tin");
    return;
  }

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, grade })
  });

  if (!res.ok) {
    alert("Lỗi khi tạo lớp");
    return;
  }

  className.value = "";
  classGrade.value = "";
  loadClasses();
}

/* DELETE */
async function deleteClass(id) {
  await fetch(`${API}/${id}`, { method: "DELETE" });
  loadClasses();
}

/* RENDER */
function renderClasses(classes) {
  classTable.innerHTML = "";

  classes.forEach(c => {
    classTable.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>${c.grade}</td>
        <td>
          <button class="btn btn-outline"
            onclick="deleteClass(${c.id})">❌</button>
        </td>
      </tr>
    `;
  });
}

loadClasses();
