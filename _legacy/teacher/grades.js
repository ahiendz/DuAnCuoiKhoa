const API_ASSIGNMENTS = "/api/teacher/class-subjects";
const API_GRADES = "/api/teacher/grades";
const API_IMPORT = "/api/teacher/import";
const API_EXPORT = "/api/teacher/export";

const SCORE_FIELDS_HS1 = [
  "mieng_1",
  "mieng_2",
  "phut15_1",
  "phut15_2",
  "tiet1_1",
  "tiet1_2"
];
const SCORE_FIELDS_ALL = [...SCORE_FIELDS_HS1, "giuaki", "cuoiki"];
const QUICK_TAGS = ["Tốt", "Tiến bộ", "Cần cố gắng", "Chưa tập trung", "Nổi bật"];

let gradeRows = [];
let assignments = [];

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  } catch (error) {
    return {};
  }
}

function setTeacherWelcome(text) {
  const el = document.getElementById("teacherWelcome");
  if (el) el.textContent = text;
}

function setLoading(active) {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;
  overlay.classList.toggle("active", Boolean(active));
}

function setStatus(message, type = "") {
  const status = document.getElementById("gradeStatus");
  if (!status) return;
  status.className = `status ${type}`.trim();
  status.textContent = message || "";
}

function normalizeAcademicYear(value) {
  return String(value || "").trim().replace("/", "-");
}

function parseScore(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function calculateAverage(row) {
  const hs1Values = SCORE_FIELDS_HS1
    .map(field => parseScore(row[field]))
    .filter(score => score !== null);

  const midScore = parseScore(row.giuaki) ?? 0;
  const finalScore = parseScore(row.cuoiki) ?? 0;
  const denominator = hs1Values.length + 4;

  if (denominator <= 0) return 0;

  const numerator = hs1Values.reduce((sum, score) => sum + score, 0) + (2 * midScore) + (2 * finalScore);
  return Math.round((numerator / denominator) * 100) / 100;
}

function isValidScore(value) {
  if (value === null || value === undefined) return true;
  return Number.isFinite(value) && value >= 0 && value <= 10;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
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

function buildQuickTagOptions(selectedValue) {
  const selected = selectedValue || "";
  const options = ['<option value="">-- Chọn --</option>'];
  QUICK_TAGS.forEach(tag => {
    const isSelected = selected === tag ? "selected" : "";
    options.push(`<option value="${escapeHtml(tag)}" ${isSelected}>${escapeHtml(tag)}</option>`);
  });
  return options.join("");
}

function renderRows() {
  const body = document.getElementById("gradeTableBody");
  if (!body) return;

  if (!gradeRows.length) {
    body.innerHTML = '<tr><td colspan="14" class="empty-cell">Chưa có dữ liệu.</td></tr>';
    return;
  }

  body.innerHTML = gradeRows
    .map((row, index) => {
      const avg = calculateAverage(row);
      row.average_semester = avg;

      return `
        <tr class="${index % 2 ? "table-row-alt" : ""}">
          <td>${index + 1}</td>
          <td>${escapeHtml(row.student_code)}</td>
          <td>${escapeHtml(row.full_name)}</td>
          ${SCORE_FIELDS_HS1.map(field => `
            <td>
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                data-row="${index}"
                data-field="${field}"
                value="${row[field] ?? ""}"
              />
            </td>
          `).join("")}
          <td>
            <input
              type="number"
              min="0"
              max="10"
              step="0.01"
              data-row="${index}"
              data-field="giuaki"
              value="${row.giuaki ?? ""}"
            />
          </td>
          <td>
            <input
              type="number"
              min="0"
              max="10"
              step="0.01"
              data-row="${index}"
              data-field="cuoiki"
              value="${row.cuoiki ?? ""}"
            />
          </td>
          <td class="avg-cell" id="avg-${index}">${avg.toFixed(2)}</td>
          <td>
            <select class="tag-select" data-row="${index}" data-field="quick_tag">
              ${buildQuickTagOptions(row.quick_tag)}
            </select>
          </td>
          <td>
            <textarea data-row="${index}" data-field="comment_text">${escapeHtml(row.comment_text || "")}</textarea>
          </td>
        </tr>
      `;
    })
    .join("");

  bindRowInputs();
}

function bindRowInputs() {
  document
    .querySelectorAll("#gradeTableBody input[data-row], #gradeTableBody select[data-row], #gradeTableBody textarea[data-row]")
    .forEach(element => {
      element.addEventListener("input", onRowFieldChange);
      element.addEventListener("change", onRowFieldChange);
    });
}

function onRowFieldChange(event) {
  const rowIndex = Number(event.target.dataset.row);
  const field = event.target.dataset.field;
  if (!Number.isFinite(rowIndex) || !field || !gradeRows[rowIndex]) return;

  if (SCORE_FIELDS_ALL.includes(field)) {
    gradeRows[rowIndex][field] = event.target.value === "" ? null : parseScore(event.target.value);
  } else {
    gradeRows[rowIndex][field] = event.target.value;
  }

  const avg = calculateAverage(gradeRows[rowIndex]);
  gradeRows[rowIndex].average_semester = avg;
  const avgCell = document.getElementById(`avg-${rowIndex}`);
  if (avgCell) {
    avgCell.textContent = avg.toFixed(2);
  }
}

async function fetchGrades() {
  const assignment = document.getElementById("assignmentSelect").value;
  const semester = document.getElementById("semesterSelect").value;
  const academicYear = normalizeAcademicYear(document.getElementById("academicYearInput").value);

  if (!assignment) throw new Error("Vui lòng chọn lớp - môn phụ trách");
  if (!academicYear) throw new Error("Vui lòng nhập năm học");

  const params = new URLSearchParams({
    class_subject_teacher_id: assignment,
    semester,
    academic_year: academicYear
  });

  const response = await fetch(`${API_GRADES}?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok || payload.status === "error") {
    throw new Error(payload.message || "Không thể tải bảng điểm");
  }

  return payload;
}

async function loadGrades() {
  try {
    setStatus("Đang tải bảng điểm...", "loading");
    setLoading(true);

    const payload = await fetchGrades();
    gradeRows = (payload.students || []).map(item => ({
      student_id: item.student_id,
      student_code: item.student_code,
      full_name: item.full_name,
      mieng_1: item.mieng_1,
      mieng_2: item.mieng_2,
      phut15_1: item.phut15_1,
      phut15_2: item.phut15_2,
      tiet1_1: item.tiet1_1,
      tiet1_2: item.tiet1_2,
      giuaki: item.giuaki,
      cuoiki: item.cuoiki,
      average_semester: item.average_semester,
      quick_tag: item.quick_tag || "",
      comment_text: item.comment_text || ""
    }));

    renderRows();
    setStatus(`Đã tải ${gradeRows.length} học sinh.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function buildGradePayload(row) {
  const assignment = document.getElementById("assignmentSelect").value;
  const semester = document.getElementById("semesterSelect").value;
  const academicYear = normalizeAcademicYear(document.getElementById("academicYearInput").value);

  const payload = {
    student_id: row.student_id,
    class_subject_teacher_id: assignment,
    semester,
    academic_year: academicYear,
    quick_tag: row.quick_tag || null,
    comment_text: row.comment_text || null
  };

  SCORE_FIELDS_ALL.forEach(field => {
    payload[field] = row[field] === null || row[field] === undefined || row[field] === ""
      ? null
      : parseScore(row[field]);
  });

  return payload;
}

async function saveAllGrades() {
  if (!gradeRows.length) {
    setStatus("Không có dữ liệu để lưu.", "error");
    return;
  }

  const invalidScores = [];
  gradeRows.forEach((row, index) => {
    SCORE_FIELDS_ALL.forEach(field => {
      const score = parseScore(row[field]);
      if (!isValidScore(score)) {
        invalidScores.push(`${index + 1}:${field}`);
      }
    });
  });

  if (invalidScores.length) {
    setStatus(`Có điểm ngoài phạm vi 0-10 (${invalidScores.slice(0, 5).join(", ")}).`, "error");
    return;
  }

  try {
    setStatus("Đang lưu dữ liệu...", "loading");
    setLoading(true);

    let successCount = 0;
    for (let index = 0; index < gradeRows.length; index += 1) {
      const response = await fetch(API_GRADES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildGradePayload(gradeRows[index]))
      });
      const payload = await response.json();
      if (!response.ok || payload.status === "error") {
        throw new Error(`Dòng ${index + 1}: ${payload.message || "Lưu thất bại"}`);
      }
      successCount += 1;
    }

    setStatus(`Đã lưu thành công ${successCount}/${gradeRows.length} học sinh.`, "success");
    await loadGrades();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function importCsv(file) {
  const assignment = document.getElementById("assignmentSelect").value;
  const semester = document.getElementById("semesterSelect").value;
  const academicYear = normalizeAcademicYear(document.getElementById("academicYearInput").value);

  if (!assignment) {
    throw new Error("Vui lòng chọn lớp - môn phụ trách trước khi nhập CSV");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("class_subject_teacher_id", assignment);
  formData.append("semester", semester);
  formData.append("academic_year", academicYear);

  const response = await fetch(API_IMPORT, {
    method: "POST",
    body: formData
  });
  const payload = await response.json();
  if (!response.ok || payload.status === "error") {
    throw new Error(payload.message || "Nhập CSV thất bại");
  }

  return payload;
}

async function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    setStatus("Đang nhập CSV...", "loading");
    setLoading(true);

    const result = await importCsv(file);
    const errorPreview = Array.isArray(result.errors) && result.errors.length
      ? ` Lỗi mẫu: ${result.errors.slice(0, 2).map(item => `dòng ${item.row} (${item.reason})`).join("; ")}.`
      : "";
    const summary = `Nhập xong: thêm ${result.inserted || 0}, cập nhật ${result.updated || 0}, bỏ qua ${result.skipped || 0}.${errorPreview}`;
    setStatus(summary, result.skipped ? "error" : "success");

    await loadGrades();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setLoading(false);
    event.target.value = "";
  }
}

function handleExport() {
  const assignment = document.getElementById("assignmentSelect").value;
  const semester = document.getElementById("semesterSelect").value;
  const academicYear = normalizeAcademicYear(document.getElementById("academicYearInput").value);

  if (!assignment) {
    setStatus("Vui lòng chọn lớp - môn phụ trách trước khi xuất CSV.", "error");
    return;
  }

  const params = new URLSearchParams({
    class_subject_teacher_id: assignment,
    semester,
    academic_year: academicYear
  });
  window.location.href = `${API_EXPORT}?${params.toString()}`;
}

function applyDefaultTagToAll() {
  const tag = document.getElementById("defaultTagSelect").value;
  gradeRows = gradeRows.map(row => ({ ...row, quick_tag: tag }));
  renderRows();
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
      setStatus("Bạn chưa được phân công lớp/môn để nhập điểm.", "error");
      return;
    }

    await loadGrades();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

document.getElementById("loadBtn").addEventListener("click", loadGrades);
document.getElementById("saveBtn").addEventListener("click", saveAllGrades);
document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFileInput").click();
});
document.getElementById("importFileInput").addEventListener("change", handleImportFile);
document.getElementById("exportBtn").addEventListener("click", handleExport);
document.getElementById("applyTagBtn").addEventListener("click", applyDefaultTagToAll);

document.addEventListener("DOMContentLoaded", initPage);
