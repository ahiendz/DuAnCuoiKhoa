const FACE_ATT_API = "/api/attendance/face";
const CLASS_API = "/api/classes";

async function loadClasses() {
  const response = await fetch(CLASS_API);
  const classes = await response.json();
  const select = document.getElementById("attClassFilter");
  select.innerHTML = '<option value="">Tất cả lớp</option>';
  classes.forEach(item => {
    select.innerHTML += `<option value="${item.name}">${item.name}</option>`;
  });
}

function setToday() {
  const input = document.getElementById("attDateFilter");
  if (input) {
    input.value = new Date().toISOString().slice(0, 10);
  }
}

async function loadAttendance() {
  const date = document.getElementById("attDateFilter").value;
  const className = document.getElementById("attClassFilter").value;

  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (className) params.append("class_name", className);

  const response = await fetch(`${FACE_ATT_API}?${params.toString()}`);
  const data = await response.json();

  const tbody = document.getElementById("attendanceTable");
  const notice = document.getElementById("attendanceNotice");
  tbody.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    notice.innerText = "Chưa có dữ liệu điểm danh.";
    return;
  }

  notice.innerText = `Tổng ${data.length} lượt điểm danh.`;

  data.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td>${item.student_code}</td>
        <td>${item.full_name}</td>
        <td>${item.class_name}</td>
        <td>${item.date}</td>
        <td>${item.time}</td>
        <td>${item.confidence}</td>
      </tr>
    `;
  });
}

async function init() {
  setToday();
  await loadClasses();
  await loadAttendance();
}

init();
