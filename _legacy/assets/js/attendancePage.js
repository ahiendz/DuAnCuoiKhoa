const FACE_ATT_API = "/api/attendance/face";
const CLASS_API = "/api/classes";
const STUDENT_API = "/api/students";

let classes = [];
let classChart = null;
let trendChart = null;

function setToday() {
  const dateInput = document.getElementById("recordDate");
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

async function loadClasses() {
  const res = await fetch(CLASS_API);
  classes = await res.json();
  const select = document.getElementById("recordClass");
  select.innerHTML = '<option value="">Tất cả lớp</option>';
  classes.forEach(c => {
    select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
  });
}

async function fetchRecords(params = {}) {
  const qs = new URLSearchParams();
  if (params.date) qs.append("date", params.date);
  if (params.class_name) qs.append("class_name", params.class_name);
  const res = await fetch(`${FACE_ATT_API}?${qs.toString()}`);
  return res.json();
}

function renderRecords(rows) {
  const tbody = document.getElementById("recordTable");
  const countEl = document.getElementById("recordCount");
  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    countEl.innerText = "Chưa có dữ liệu.";
    return;
  }

  rows.forEach(item => {
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

  countEl.innerText = `Tổng ${rows.length} lượt điểm danh.`;
}

function uniqueStudentCount(rows) {
  const seen = new Set();
  rows.forEach(r => {
    if (r.student_code) seen.add(r.student_code);
  });
  return seen.size;
}

function buildLast7Days(baseDate) {
  const result = [];
  const today = new Date(baseDate);
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

function renderClassChart(labels, data) {
  const ctx = document.getElementById("classChart");
  if (!ctx) return;
  if (!classChart) {
    classChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Lượt nhận diện",
            data,
            backgroundColor: "#16a34a"
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  } else {
    classChart.data.labels = labels;
    classChart.data.datasets[0].data = data;
    classChart.update();
  }
}

function renderTrendChart(labels, data) {
  const ctx = document.getElementById("trendChart");
  if (!ctx) return;
  if (!trendChart) {
    trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Lượt điểm danh",
            data,
            borderColor: "#16a34a",
            backgroundColor: "rgba(22,163,74,0.15)",
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  } else {
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = data;
    trendChart.update();
  }
}

async function updateAnalytics(date, className) {
  const presentEl = document.getElementById("presentCount");
  const absentEl = document.getElementById("absentCount");

  const allToday = await fetchRecords({ date });
  const filteredToday = className
    ? allToday.filter(r => r.class_name === className)
    : allToday;

  const presentCount = uniqueStudentCount(filteredToday);
  presentEl.innerText = presentCount;

  let studentUrl = STUDENT_API;
  if (className) {
    const classInfo = classes.find(c => c.name === className);
    if (classInfo) {
      studentUrl = `${STUDENT_API}?class_id=${classInfo.id}`;
    }
  }
  const resStudents = await fetch(studentUrl);
  const students = await resStudents.json();
  const absent = Math.max(0, students.length - presentCount);
  absentEl.innerText = absent;

  const classCounts = {};
  allToday.forEach(r => {
    classCounts[r.class_name] = (classCounts[r.class_name] || 0) + 1;
  });
  const classLabels = Object.keys(classCounts);
  const classData = classLabels.map(k => classCounts[k]);
  renderClassChart(classLabels, classData);

  const allRecords = await fetchRecords({});
  const last7 = buildLast7Days(date || new Date().toISOString().slice(0, 10));
  const countsByDate = {};
  allRecords.forEach(r => {
    countsByDate[r.date] = (countsByDate[r.date] || 0) + 1;
  });
  const trendData = last7.map(d => countsByDate[d] || 0);
  renderTrendChart(last7, trendData);
}

async function loadRecords() {
  const date = document.getElementById("recordDate").value;
  const className = document.getElementById("recordClass").value;
  const rows = await fetchRecords({ date, class_name: className || "" });
  renderRecords(rows);
  await updateAnalytics(date, className);
}

async function init() {
  setToday();
  await loadClasses();
  await loadRecords();
}

init();
