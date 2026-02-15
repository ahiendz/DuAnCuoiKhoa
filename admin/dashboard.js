const SUMMARY_API = "/api/summary";
const CLASSES_API = "/api/classes";
const TEACHERS_API = "/api/teachers";
const STUDENTS_API = "/api/students";
const FACE_ATTENDANCE_API = "/api/attendance/face";

let studentsByGradeChart = null;
let teacherSubjectChart = null;
let classCapacityChart = null;

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu từ ${url}`);
  }
  return response.json();
}

function buildGradient(canvas, start, end) {
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, end);
  return gradient;
}

function commonChartOptions({ maxY } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 900,
      easing: "easeOutQuart"
    },
    plugins: {
      legend: {
        labels: {
          color: "#dce8ff"
        }
      },
      tooltip: {
        backgroundColor: "rgba(6, 16, 32, 0.96)",
        borderColor: "rgba(108, 152, 241, 0.6)",
        borderWidth: 1,
        titleColor: "#f1f6ff",
        bodyColor: "#d5e1f7"
      }
    },
    scales: {
      x: {
        ticks: { color: "#a9c0ec" },
        grid: { color: "rgba(126, 154, 214, 0.15)" }
      },
      y: {
        min: 0,
        ...(Number.isFinite(maxY) ? { max: maxY } : {}),
        ticks: { color: "#a9c0ec" },
        grid: { color: "rgba(126, 154, 214, 0.22)" }
      }
    }
  };
}

function renderStudentsByGradeChart(gradeMap) {
  const canvas = document.getElementById("studentsByGradeChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = Object.keys(gradeMap);
  const data = labels.map(label => gradeMap[label]);
  const gradient = buildGradient(canvas, "rgba(99, 177, 255, 0.96)", "rgba(99, 177, 255, 0.26)");

  if (!studentsByGradeChart) {
    studentsByGradeChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Số học sinh",
            data,
            backgroundColor: gradient,
            borderColor: "#92d0ff",
            borderWidth: 1,
            borderRadius: 12,
            maxBarThickness: 56
          }
        ]
      },
      options: commonChartOptions()
    });
    return;
  }

  studentsByGradeChart.data.labels = labels;
  studentsByGradeChart.data.datasets[0].data = data;
  studentsByGradeChart.update();
}

function renderTeacherSubjectChart(subjectMap) {
  const canvas = document.getElementById("teacherSubjectChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = Object.keys(subjectMap);
  const data = labels.map(label => subjectMap[label]);
  const gradient = buildGradient(canvas, "rgba(40, 212, 169, 0.94)", "rgba(40, 212, 169, 0.25)");

  if (!teacherSubjectChart) {
    teacherSubjectChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Số giáo viên",
            data,
            backgroundColor: gradient,
            borderColor: "#7ff0cb",
            borderWidth: 1,
            borderRadius: 12,
            maxBarThickness: 56
          }
        ]
      },
      options: commonChartOptions()
    });
    return;
  }

  teacherSubjectChart.data.labels = labels;
  teacherSubjectChart.data.datasets[0].data = data;
  teacherSubjectChart.update();
}

function renderClassCapacityChart(capacityMap) {
  const canvas = document.getElementById("classCapacityChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = Object.keys(capacityMap);
  const data = labels.map(label => capacityMap[label]);
  const gradient = buildGradient(canvas, "rgba(255, 209, 119, 0.95)", "rgba(255, 209, 119, 0.27)");

  if (!classCapacityChart) {
    classCapacityChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Sĩ số",
            data,
            backgroundColor: gradient,
            borderColor: "#ffdca0",
            borderWidth: 1,
            borderRadius: 12,
            maxBarThickness: 58
          }
        ]
      },
      options: commonChartOptions()
    });
    return;
  }

  classCapacityChart.data.labels = labels;
  classCapacityChart.data.datasets[0].data = data;
  classCapacityChart.update();
}

function updateNotes(lines = []) {
  setText("noteLine1", lines[0] || "");
  setText("noteLine2", lines[1] || "");
  setText("noteLine3", lines[2] || "");
  setText("noteLine4", lines[3] || "");
}

async function loadDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [summary, classes, teachers, students, attendanceRows] = await Promise.all([
      fetchJson(SUMMARY_API),
      fetchJson(CLASSES_API),
      fetchJson(TEACHERS_API),
      fetchJson(STUDENTS_API),
      fetchJson(`${FACE_ATTENDANCE_API}?date=${encodeURIComponent(today)}`)
    ]);

    const classCount = Number(summary.classes || classes.length || 0);
    const teacherCount = Number(summary.teachers || teachers.length || 0);
    const studentCount = Number(summary.students || students.length || 0);
    const attendanceCount = Array.isArray(attendanceRows) ? attendanceRows.length : 0;

    setText("countClasses", `${classCount}`);
    setText("countTeachers", `${teacherCount}`);
    setText("countStudents", `${studentCount}`);
    setText("todayAttendance", `${attendanceCount}`);

    const classByName = new Map();
    classes.forEach(item => {
      classByName.set(String(item.name), item);
    });

    const gradeBuckets = {};
    students.forEach(student => {
      const className = String(student.class_name || student.class_id || "");
      const classInfo = classByName.get(className);
      const grade = classInfo ? `Khối ${classInfo.grade_level}` : "Chưa rõ khối";
      gradeBuckets[grade] = (gradeBuckets[grade] || 0) + 1;
    });

    const teacherBySubject = {};
    teachers.forEach(teacher => {
      const subject = String(teacher.subject || "Khác");
      teacherBySubject[subject] = (teacherBySubject[subject] || 0) + 1;
    });

    const classCapacity = {};
    students.forEach(student => {
      const className = String(student.class_name || student.class_id || "Chưa xếp lớp");
      classCapacity[className] = (classCapacity[className] || 0) + 1;
    });
    const sortedCapacity = Object.fromEntries(
      Object.entries(classCapacity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    );

    renderStudentsByGradeChart(gradeBuckets);
    renderTeacherSubjectChart(teacherBySubject);
    renderClassCapacityChart(sortedCapacity);

    const avgStudentsPerClass = classCount ? (studentCount / classCount).toFixed(1) : "0.0";
    const peakGrade = Object.entries(gradeBuckets).sort((a, b) => b[1] - a[1])[0];
    const peakSubject = Object.entries(teacherBySubject).sort((a, b) => b[1] - a[1])[0];

    updateNotes([
      `Quy mô trung bình hiện tại: ${avgStudentsPerClass} học sinh/lớp.`,
      `Khối đông học sinh nhất: ${peakGrade ? `${peakGrade[0]} (${peakGrade[1]} học sinh)` : "chưa có dữ liệu"}.`,
      `Môn có nhiều giáo viên nhất: ${peakSubject ? `${peakSubject[0]} (${peakSubject[1]} giáo viên)` : "chưa có dữ liệu"}.`,
      `Điểm danh ngày ${today}: ${attendanceCount} lượt ghi nhận thành công.`
    ]);
  } catch (error) {
    console.error("Không tải được dashboard admin", error);
    updateNotes([
      "Không tải được dữ liệu tổng quan.",
      "Vui lòng kiểm tra kết nối API /api/summary, /api/classes, /api/students.",
      "Kiểm tra lại quyền tài khoản admin và dữ liệu DB.",
      "Làm mới trang sau khi backend ổn định."
    ]);
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);
