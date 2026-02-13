const SUMMARY_API = "/api/summary";

async function loadSummary() {
  try {
    const res = await fetch(SUMMARY_API);
    const data = await res.json();
    document.getElementById("countClasses").innerText = `${data.classes} lớp`;
    document.getElementById("countTeachers").innerText = `${data.teachers} giáo viên`;
    document.getElementById("countStudents").innerText = `${data.students} học sinh`;
  } catch (e) {
    console.error("Không tải được thống kê", e);
  }
}

loadSummary();
