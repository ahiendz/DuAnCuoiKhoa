const CLASS_API = "/api/classes";
const STUDENT_API = "/api/students";
const ATT_API = "/api/attendance";

let roster = [];

function setToday() {
  const el = document.getElementById("attDate");
  if (el) el.value = new Date().toISOString().slice(0, 10);
}

async function loadClasses() {
  const res = await fetch(CLASS_API);
  const classes = await res.json();
  const select = document.getElementById("attClass");
  select.innerHTML = '<option value="">Chọn lớp</option>';
  classes.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function renderRoster(existingStatuses = {}, existingNotes = {}) {
  const tbody = document.getElementById("attTable");
  tbody.innerHTML = "";
  roster.forEach(s => {
    const status = existingStatuses[s.id] || "present";
    const note = existingNotes[s.id] || "";
    tbody.innerHTML += `
      <tr>
        <td>${s.student_code}</td>
        <td>${s.full_name}</td>
        <td>
          <select data-id="${s.id}" class="status-select">
            <option value="present" ${status === "present" ? "selected" : ""}>Có mặt</option>
            <option value="late" ${status === "late" ? "selected" : ""}>Đi muộn</option>
            <option value="excused" ${status === "excused" ? "selected" : ""}>Có phép</option>
            <option value="absent" ${status === "absent" ? "selected" : ""}>Vắng</option>
          </select>
        </td>
        <td><input data-note="${s.id}" value="${note}" placeholder="Ghi chú" style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:6px;"></td>
      </tr>
    `;
  });
}

async function loadRoster() {
  const classId = document.getElementById("attClass").value;
  const date = document.getElementById("attDate").value;
  const messageEl = document.getElementById("attMessage");
  messageEl.innerText = "";

  if (!classId || !date) {
    messageEl.innerText = "Chọn lớp và ngày trước khi tải danh sách.";
    return;
  }

  const res = await fetch(`${STUDENT_API}?class_id=${classId}`);
  roster = await res.json();

  const existingRes = await fetch(`${ATT_API}?date=${date}&class_id=${classId}`);
  const existing = await existingRes.json();
  const statusMap = {};
  const noteMap = {};
  existing.forEach(e => {
    statusMap[e.student_id] = e.status;
    noteMap[e.student_id] = e.note || "";
  });

  renderRoster(statusMap, noteMap);
}

async function saveAttendance() {
  const classId = document.getElementById("attClass").value;
  const date = document.getElementById("attDate").value;
  const messageEl = document.getElementById("attMessage");
  messageEl.innerText = "";

  if (!classId || !date) {
    messageEl.innerText = "Chọn lớp và ngày trước khi lưu.";
    return;
  }

  const records = roster.map(s => {
    const statusEl = document.querySelector(`select[data-id="${s.id}"]`);
    const noteEl = document.querySelector(`input[data-note="${s.id}"]`);
    return {
      student_id: s.id,
      status: statusEl ? statusEl.value : "present",
      note: noteEl ? noteEl.value.trim() : ""
    };
  });

  try {
    const res = await fetch(ATT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_id: Number(classId),
        date,
        records
      })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Không lưu được điểm danh");
    messageEl.style.color = "#16a34a";
    messageEl.innerText = `Đã lưu ${data.saved} lượt điểm danh`;
  } catch (err) {
    messageEl.style.color = "red";
    messageEl.innerText = err.message;
  }
}

setToday();
loadClasses();
