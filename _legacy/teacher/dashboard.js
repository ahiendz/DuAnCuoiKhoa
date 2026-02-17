const API_ASSIGNMENTS = "/api/teacher/class-subjects";
const API_DASHBOARD = "/api/teacher/dashboard";

let distributionChart = null;
let compareChart = null;
let assignments = [];

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  } catch (error) {
    return {};
  }
}

function setLoading(active) {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;
  overlay.classList.toggle("active", Boolean(active));
}

function setStatus(message, type = "") {
  const status = document.getElementById("dashboardStatus");
  if (!status) return;
  status.className = `status ${type}`.trim();
  status.textContent = message || "";
}

function setTeacherWelcome(text) {
  const el = document.getElementById("teacherWelcome");
  if (el) el.textContent = text;
}

function setNoteLines(lines = []) {
  const ids = ["line1", "line2", "line3", "line4"];
  ids.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = lines[index] || "";
  });
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function renderAssignmentOptions(items) {
  const select = document.getElementById("assignmentSelect");
  if (!select) return;
  select.innerHTML = "";

  if (!items.length) {
    select.innerHTML = '<option value="">Không có lớp phụ trách</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = String(item.class_subject_teacher_id);
    option.textContent = `${item.class_name} - ${item.subject}`;
    select.appendChild(option);
  });
}

function buildBarGradient(canvas, colorStart, colorEnd) {
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

function chartCommonOptions(yMax = undefined) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.15,
    animation: {
      duration: 900,
      easing: "easeOutQuart"
    },
    plugins: {
      legend: {
        labels: {
          color: "#dbe8ff",
          boxWidth: 14,
          boxHeight: 14
        }
      },
      tooltip: {
        backgroundColor: "rgba(8, 16, 33, 0.95)",
        borderColor: "rgba(105, 148, 232, 0.55)",
        borderWidth: 1,
        titleColor: "#eaf1ff",
        bodyColor: "#d2dffc"
      }
    },
    scales: {
      x: {
        ticks: { color: "#aac0eb" },
        grid: { color: "rgba(120, 150, 210, 0.12)" }
      },
      y: {
        min: 0,
        ...(Number.isFinite(yMax) ? { max: yMax } : {}),
        ticks: { color: "#aac0eb" },
        grid: { color: "rgba(120, 150, 210, 0.2)" }
      }
    }
  };
}

function renderDistributionChart(distribution) {
  const canvas = document.getElementById("distributionChart");
  if (!canvas) return;

  const labels = ["0-4", "5-6", "7-8", "9-10"];
  const data = labels.map(label => Number(distribution?.[label] || 0));
  const gradientA = buildBarGradient(canvas, "rgba(255, 125, 157, 0.95)", "rgba(255, 125, 157, 0.35)");
  const gradientB = buildBarGradient(canvas, "rgba(255, 208, 111, 0.95)", "rgba(255, 208, 111, 0.35)");
  const gradientC = buildBarGradient(canvas, "rgba(92, 181, 255, 0.95)", "rgba(92, 181, 255, 0.35)");
  const gradientD = buildBarGradient(canvas, "rgba(38, 211, 163, 0.95)", "rgba(38, 211, 163, 0.35)");

  if (!distributionChart) {
    distributionChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Số lượng học sinh",
            data,
            backgroundColor: [gradientA, gradientB, gradientC, gradientD],
            borderColor: ["#ff7d9d", "#ffd06f", "#5cb5ff", "#26d3a3"],
            borderWidth: 1,
            borderRadius: 12,
            maxBarThickness: 58
          }
        ]
      },
      options: chartCommonOptions()
    });
    return;
  }

  distributionChart.data.datasets[0].data = data;
  distributionChart.update();
}

function renderCompareChart(comparison) {
  const canvas = document.getElementById("compareChart");
  if (!canvas) return;

  const labels = ["HK1", "HK2"];
  const data = [Number(comparison?.HK1 || 0), Number(comparison?.HK2 || 0)];
  const gradient = buildBarGradient(canvas, "rgba(92, 181, 255, 0.95)", "rgba(92, 181, 255, 0.25)");

  if (!compareChart) {
    compareChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Trung bình học kỳ",
            data,
            backgroundColor: gradient,
            borderColor: "#8ac8ff",
            borderWidth: 1,
            borderRadius: 12,
            maxBarThickness: 82
          }
        ]
      },
      options: chartCommonOptions(10)
    });
    return;
  }

  compareChart.data.datasets[0].data = data;
  compareChart.update();
}

async function fetchAssignments(userId) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  const response = await fetch(`${API_ASSIGNMENTS}${query}`);
  const payload = await response.json();
  if (!response.ok || payload.status === "error") {
    throw new Error(payload.message || "Không thể tải lớp phụ trách");
  }
  return payload.assignments || [];
}

async function fetchDashboard() {
  const classSubjectTeacherId = document.getElementById("assignmentSelect").value;
  const semester = document.getElementById("semesterSelect").value;
  const academicYear = document.getElementById("academicYearInput").value.trim();

  if (!classSubjectTeacherId) {
    throw new Error("Vui lòng chọn lớp - môn phụ trách");
  }

  const params = new URLSearchParams({
    class_subject_teacher_id: classSubjectTeacherId,
    semester,
    academic_year: academicYear
  });

  const response = await fetch(`${API_DASHBOARD}?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok || payload.status === "error") {
    throw new Error(payload.message || "Không thể tải dữ liệu dashboard");
  }

  return payload;
}

function renderDashboard(payload) {
  document.getElementById("avgClass").textContent = Number(payload.class_average || 0).toFixed(2);
  document.getElementById("totalStudents").textContent = String(payload.total_students || 0);
  document.getElementById("gradedCount").textContent = String(payload.graded_count || 0);
  document.getElementById("subjectName").textContent = payload.subject || "--";

  renderDistributionChart(payload.distribution || {});
  renderCompareChart(payload.comparison || {});

  const strongestBand = Object.entries(payload.distribution || {}).sort((a, b) => b[1] - a[1])[0];
  setNoteLines([
    `Lớp ${payload.class_name} có trung bình ${Number(payload.class_average || 0).toFixed(2)} ở ${payload.semester}.`,
    `Phổ điểm chiếm ưu thế: ${strongestBand ? strongestBand[0] : "chưa có dữ liệu"}.`,
    `So sánh HK1/HK2: ${Number(payload.comparison?.HK1 || 0).toFixed(2)} / ${Number(payload.comparison?.HK2 || 0).toFixed(2)}.`,
    `Đã có ${payload.graded_count}/${payload.total_students} bản ghi điểm cho năm học ${payload.academic_year}.`
  ]);
}

async function loadDashboard() {
  try {
    setStatus("Đang tải dashboard...", "loading");
    setLoading(true);
    const payload = await fetchDashboard();
    renderDashboard(payload);
    setStatus("Đã tải dashboard thành công.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function initPage() {
  const currentUser = getCurrentUser();
  setTeacherWelcome(`Giáo viên: ${currentUser.name || "Chưa xác định"}`);

  const yearInput = document.getElementById("academicYearInput");
  if (yearInput && !yearInput.value.trim()) {
    yearInput.value = defaultAcademicYear();
  }

  try {
    setStatus("Đang tải lớp phụ trách...", "loading");
    assignments = await fetchAssignments(currentUser.id);
    renderAssignmentOptions(assignments);

    if (!assignments.length) {
      setStatus("Bạn chưa được phân công lớp/môn.", "error");
      setNoteLines([
        "Chưa có lớp phụ trách được phân công.",
        "Vui lòng liên hệ quản trị viên để gán lớp - môn.",
        "Dashboard sẽ hiển thị sau khi có phân công.",
        "Chưa có dữ liệu để phân tích."
      ]);
      return;
    }

    await loadDashboard();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

document.getElementById("reloadBtn").addEventListener("click", loadDashboard);
document.addEventListener("DOMContentLoaded", initPage);
