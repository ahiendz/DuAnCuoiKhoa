const STUDENT_API = "/api/students";
const CLASS_API = "/api/classes";

let classes = [];
let existingStudents = [];
let previewRows = [];
let csvValid = false;

function setStudentNotice(message, isError = false) {
  const el = document.getElementById("studentNotice");
  if (!el) return;
  el.style.color = isError ? "#ff879f" : "#9fb4dc";
  el.innerText = message || "";
}

function setCsvSummary(message, isError = false) {
  const el = document.getElementById("csvImportSummary");
  if (!el) return;
  el.style.color = isError ? "#ff879f" : "#78e0b2";
  el.innerText = message || "";
  if (!message) {
    el.style.color = "#9fb4dc";
  }
}

function isValidUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

async function loadClasses() {
  const response = await fetch(CLASS_API);
  const data = await response.json();
  classes = Array.isArray(data) ? data : (data.classes || []);

  const classSelect = document.getElementById("sClass");
  const csvSelect = document.getElementById("csvClass");
  const filterSelect = document.getElementById("filterClass");

  classSelect.innerHTML = '<option value="">Chọn lớp</option>';
  csvSelect.innerHTML = '<option value="">Chọn lớp</option>';
  filterSelect.innerHTML = '<option value="">Tất cả lớp</option>';

  classes.forEach(item => {
    const option = `<option value="${item.name}">${item.name}</option>`;
    classSelect.innerHTML += option;
    csvSelect.innerHTML += option;
    filterSelect.innerHTML += option;
  });
}

async function loadExistingStudents() {
  try {
    const response = await fetch(STUDENT_API);
    const data = await response.json();
    existingStudents = Array.isArray(data) ? data : (data.students || []);
  } catch (error) {
    existingStudents = [];
  }
}

function resetStudentForm() {
  document.getElementById("sFullName").value = "";
  document.getElementById("sDob").value = "";
  document.getElementById("sGender").value = "";
  document.getElementById("sClass").value = "";
  document.getElementById("sAvatar").value = "";
  document.getElementById("studentError").innerText = "";
  setStudentNotice("");
}

async function submitStudent() {
  const errorEl = document.getElementById("studentError");
  errorEl.innerText = "";
  setStudentNotice("");

  const payload = {
    full_name: document.getElementById("sFullName").value.trim(),
    dob: document.getElementById("sDob").value,
    gender: document.getElementById("sGender").value,
    class_id: document.getElementById("sClass").value,
    avatar_url: document.getElementById("sAvatar").value.trim()
  };

  if (!payload.full_name || !payload.class_id) {
    errorEl.innerText = "Cần họ tên và lớp học.";
    return;
  }

  if (payload.avatar_url && !isValidUrl(payload.avatar_url)) {
    errorEl.innerText = "Avatar URL không hợp lệ.";
    return;
  }

  try {
    const response = await fetch(STUDENT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Không lưu được học sinh");
    }

    resetStudentForm();
    setStudentNotice(`Đã tạo học sinh với mã: ${data.student_code}`);
    await loadExistingStudents();
    await loadStudentList();
  } catch (error) {
    errorEl.innerText = error.message;
  }
}

function getCsvMode() {
  const selected = document.querySelector('input[name="csvMode"]:checked');
  return selected ? selected.value : "merge";
}

function toggleReplaceWarning() {
  const warning = document.getElementById("replaceWarning");
  if (!warning) return;
  warning.style.display = getCsvMode() === "replace" ? "block" : "none";
}

function parseCsvMatrix(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && content[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows
    .map(cols => cols.map(item => String(item || "").trim()))
    .filter(cols => cols.some(item => item !== ""));
}

function parseCsv(text) {
  const matrix = parseCsvMatrix(String(text || "").replace(/^\uFEFF/, ""));
  if (!matrix.length) {
    return { rows: [] };
  }

  const firstRow = matrix[0].map(h => h.toLowerCase());
  const hasHeader = firstRow.join(",") === "student_code,full_name,dob,gender,class_id,avatar_url";

  const rows = matrix.slice(hasHeader ? 1 : 0).map(cells => ({
    student_code: (cells[0] || "").trim(),
    full_name: (cells[1] || "").trim(),
    dob: (cells[2] || "").trim(),
    gender: (cells[3] || "").trim(),
    class_id: (cells[4] || "").trim(),
    avatar_url: (cells[5] || "").trim()
  }));

  return { rows };
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function resolveSelectedClassMeta(selectedClass) {
  const raw = String(selectedClass || "").trim();
  if (!raw) return null;
  return classes.find(item => String(item.name) === raw || String(item.id) === raw) || null;
}

function validateRows(rows, selectedClass, mode) {
  const errors = [];
  const codeCounts = {};
  const selectedClassMeta = resolveSelectedClassMeta(selectedClass);
  const selectedClassName = selectedClassMeta ? String(selectedClassMeta.name) : String(selectedClass || "");
  const selectedClassId = selectedClassMeta ? String(selectedClassMeta.id) : String(selectedClass || "");
  const existingByCode = new Map(existingStudents.map(student => [student.student_code, student]));

  rows.forEach(row => {
    if (row.student_code) {
      codeCounts[row.student_code] = (codeCounts[row.student_code] || 0) + 1;
    }
  });

  rows.forEach((row, index) => {
    const rowErrors = {};

    if (!row.student_code) {
      rowErrors.student_code = "Thiếu mã học sinh";
    } else if (codeCounts[row.student_code] > 1) {
      rowErrors.student_code = "Trùng mã trong CSV";
    }

    if (!row.full_name) {
      rowErrors.full_name = "Thiếu họ tên";
    }

    if (!row.dob || !isValidIsoDate(row.dob)) {
      rowErrors.dob = "Ngày sinh không hợp lệ";
    }

    if (!row.gender || !["male", "female"].includes(row.gender)) {
      rowErrors.gender = "Giới tính phải là male/female";
    }

    if (!row.class_id) {
      rowErrors.class_id = "Thiếu class_id";
    } else {
      const rowClass = String(row.class_id).trim();
      const classMatched = rowClass === selectedClassName || rowClass === selectedClassId;
      if (!classMatched) {
        rowErrors.class_id = `class_id không đúng lớp đã chọn (${selectedClassName} hoặc ${selectedClassId})`;
      }
    }

    if (row.avatar_url && !isValidUrl(row.avatar_url)) {
      rowErrors.avatar_url = "avatar_url không hợp lệ";
    }

    const existing = existingByCode.get(row.student_code);
    if (existing) {
      if (String(existing.class_id) !== String(selectedClassName)) {
        rowErrors.student_code = "Mã học sinh đã tồn tại ở lớp khác";
      } else if (mode === "replace") {
        // replace mode cho phép ghi đè dữ liệu trong cùng lớp
      }
    }

    errors[index] = rowErrors;
  });

  return errors;
}

function renderPreview(rows, rowErrors) {
  const wrap = document.getElementById("csvPreviewWrap");
  const head = document.getElementById("csvPreviewHead");
  const body = document.getElementById("csvPreviewBody");
  const note = document.getElementById("csvPreviewNote");
  const importBtn = document.getElementById("csvImportBtn");

  if (!rows.length) {
    wrap.classList.add("hidden");
    importBtn.disabled = true;
    csvValid = false;
    return;
  }

  wrap.classList.remove("hidden");
  head.innerHTML = `
    <tr>
      <th>student_code</th>
      <th>full_name</th>
      <th>dob</th>
      <th>gender</th>
      <th>class_id</th>
      <th>avatar_url</th>
    </tr>
  `;

  let invalidRows = 0;
  body.innerHTML = rows
    .map((row, idx) => {
      const errs = rowErrors[idx] || {};
      const hasError = Object.keys(errs).length > 0;
      if (hasError) invalidRows += 1;

      return `
        <tr class="${hasError ? "row-error" : ""}">
          ${["student_code", "full_name", "dob", "gender", "class_id", "avatar_url"].map(field => {
            const cellError = errs[field];
            const className = cellError ? "cell-error" : "";
            const title = cellError ? `title="${cellError}"` : "";
            return `
              <td class="${className}" ${title}>
                <input class="csv-cell-input" data-row="${idx}" data-field="${field}" value="${row[field] || ""}" />
              </td>
            `;
          }).join("")}
        </tr>
      `;
    })
    .join("");

  csvValid = invalidRows === 0;
  importBtn.disabled = !csvValid;
  note.innerText = csvValid
    ? "Dữ liệu hợp lệ. Có thể nhập CSV."
    : `Có ${invalidRows} dòng lỗi. Vui lòng sửa trước khi nhập.`;

  bindCellInputs();
}

function bindCellInputs() {
  document.querySelectorAll(".csv-cell-input").forEach(input => {
    input.addEventListener("input", event => {
      const rowIndex = Number(event.target.dataset.row);
      const field = event.target.dataset.field;
      previewRows[rowIndex][field] = event.target.value.trim();
      runValidationAndRender();
    });
  });
}

function runValidationAndRender() {
  const selectedClass = document.getElementById("csvClass").value;
  const mode = getCsvMode();
  const rowErrors = validateRows(previewRows, selectedClass, mode);
  renderPreview(previewRows, rowErrors);
}

async function handleCsvFile() {
  const fileInput = document.getElementById("csvInput");
  if (!fileInput.files.length) return;

  setCsvSummary("");
  const file = fileInput.files[0];
  const text = await file.text();
  const parsed = parseCsv(text);

  previewRows = parsed.rows;
  await loadExistingStudents();
  runValidationAndRender();
}

async function importCsv() {
  if (!csvValid) {
    setCsvSummary("CSV chưa hợp lệ. Vui lòng kiểm tra lại dữ liệu.", true);
    return;
  }

  const classId = document.getElementById("csvClass").value;
  if (!classId) {
    setCsvSummary("Chọn lớp trước khi nhập CSV.", true);
    return;
  }

  try {
    const response = await fetch(`${STUDENT_API}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: previewRows,
        mode: getCsvMode(),
        class_id: classId
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Không nhập được CSV");
    }

    const summary = [
      `Đã nhập ${data.inserted || 0} học sinh.`,
      data.updated ? `Cập nhật ${data.updated} học sinh.` : "",
      data.deleted ? `Đã xóa ${data.deleted} học sinh cũ.` : "",
      data.skipped ? `Bỏ qua ${data.skipped} dòng lỗi.` : ""
    ].filter(Boolean).join(" ");
    setCsvSummary(summary);

    document.getElementById("csvInput").value = "";
    document.getElementById("csvImportBtn").disabled = true;
    document.getElementById("csvPreviewWrap").classList.add("hidden");
    previewRows = [];
    csvValid = false;

    await loadExistingStudents();
    await loadStudentList();
  } catch (error) {
    setCsvSummary(error.message, true);
  }
}

async function loadStudentList() {
  const selectedClass = document.getElementById("filterClass").value;
  const url = selectedClass
    ? `${STUDENT_API}?class_id=${encodeURIComponent(selectedClass)}`
    : STUDENT_API;

  let students = [];
  try {
    const response = await fetch(url);
    const data = await response.json();
    students = Array.isArray(data) ? data : (data.students || []);
  } catch (error) {
    students = [];
  }

  const tbody = document.getElementById("studentTable");
  const note = document.getElementById("studentListNote");
  tbody.innerHTML = "";

  if (!students.length) {
    note.innerText = "Chưa có dữ liệu.";
    return;
  }

  note.innerText = `Tổng ${students.length} học sinh.`;
  students.forEach(student => {
    const avatar = student.avatar_url || "https://placehold.co/40x40";
    tbody.innerHTML += `
      <tr>
        <td><img src="${avatar}" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"></td>
        <td>${student.student_code}</td>
        <td>${student.full_name}</td>
        <td>${student.dob || ""}</td>
        <td>${student.gender || ""}</td>
        <td>${student.class_id || ""}</td>
      </tr>
    `;
  });
}

function exportStudents() {
  const selectedClass = document.getElementById("filterClass").value;
  const params = selectedClass ? `?class_id=${encodeURIComponent(selectedClass)}` : "";
  window.location.href = `${STUDENT_API}/export${params}`;
}

function initStudentPage() {
  const csvInput = document.getElementById("csvInput");
  const csvClass = document.getElementById("csvClass");
  const importBtn = document.getElementById("csvImportBtn");
  const filterBtn = document.getElementById("filterBtn");
  const exportBtn = document.getElementById("exportBtn");

  if (csvInput) csvInput.addEventListener("change", handleCsvFile);
  if (csvClass) {
    csvClass.addEventListener("change", () => {
      setCsvSummary("");
      runValidationAndRender();
    });
  }

  document.querySelectorAll('input[name="csvMode"]').forEach(input => {
    input.addEventListener("change", () => {
      toggleReplaceWarning();
      setCsvSummary("");
      runValidationAndRender();
    });
  });

  if (importBtn) importBtn.addEventListener("click", importCsv);
  if (filterBtn) filterBtn.addEventListener("click", loadStudentList);
  if (exportBtn) exportBtn.addEventListener("click", exportStudents);

  loadClasses();
  loadExistingStudents();
  loadStudentList();
  toggleReplaceWarning();
  setCsvSummary("");
}

window.addEventListener("DOMContentLoaded", initStudentPage);
