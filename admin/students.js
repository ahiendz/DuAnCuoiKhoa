const STUDENT_API = "/api/students";
const CLASS_API = "/api/classes";

let classes = [];
let existingStudents = [];
let previewRows = [];
let csvValid = false;

function logDebug(message, data) {
  console.log(`[students] ${message}`, data ?? "");
}

function setStudentNotice(message, isError = false) {
  const el = document.getElementById("studentNotice");
  el.style.color = isError ? "red" : "#6b7280";
  el.innerText = message || "";
}

function setCsvSummary(message, isError = false) {
  const el = document.getElementById("csvImportSummary");
  el.style.color = isError ? "red" : "#16a34a";
  el.innerText = message || "";
  if (!message) {
    el.style.color = "#6b7280";
  }
}

async function loadClasses() {
  const res = await fetch(CLASS_API);
  const data = await res.json();
  classes = Array.isArray(data) ? data : (data.classes || []);
  const classSelect = document.getElementById("sClass");
  const csvSelect = document.getElementById("csvClass");
  const filterSelect = document.getElementById("filterClass");

  classSelect.innerHTML = '<option value="">Chọn lớp</option>';
  csvSelect.innerHTML = '<option value="">Chọn lớp</option>';
  filterSelect.innerHTML = '<option value="">Tất cả lớp</option>';

  classes.forEach(c => {
    const option = `<option value="${c.name}">${c.name}</option>`;
    classSelect.innerHTML += option;
    csvSelect.innerHTML += option;
    filterSelect.innerHTML += option;
  });
}

async function loadExistingStudents() {
  try {
    const res = await fetch(STUDENT_API);
    const data = await res.json();
    existingStudents = Array.isArray(data) ? data : (data.students || []);
    logDebug("Loaded existing students", {
      count: existingStudents.length,
      sample: existingStudents.slice(0, 3).map(s => ({
        class_id: s.class_id,
        type: typeof s.class_id
      }))
    });
  } catch (err) {
    existingStudents = [];
    logDebug("Failed to load students", err.message);
  }
}

function resetStudentForm() {
  document.getElementById("sFullName").value = "";
  document.getElementById("sDob").value = "";
  document.getElementById("sGender").value = "";
  document.getElementById("sClass").value = "";
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
    class_id: document.getElementById("sClass").value
  };

  if (!payload.full_name || !payload.class_id) {
    errorEl.innerText = "Cần họ tên và lớp học.";
    return;
  }

  try {
    const res = await fetch(STUDENT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Không lưu được học sinh");
    resetStudentForm();
    setStudentNotice(`Đã tạo học sinh với mã: ${data.student_code}`);
    await loadExistingStudents();
    await loadStudentList();
  } catch (err) {
    errorEl.innerText = err.message;
  }
}

function getCsvMode() {
  const selected = document.querySelector('input[name="csvMode"]:checked');
  return selected ? selected.value : "merge";
}

function toggleReplaceWarning() {
  const warning = document.getElementById("replaceWarning");
  warning.style.display = getCsvMode() === "replace" ? "block" : "none";
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (!lines.length) return { header: [], rows: [] };

  const first = lines[0].split(",");
  if (first.length) {
    first[0] = first[0].replace(/^\uFEFF/, "");
  }
  const headerMatch =
    first.length >= 5 &&
    first.map(h => h.trim().toLowerCase()).join(",") ===
      "student_code,full_name,dob,gender,class_id";

  const header = headerMatch
    ? first.map(h => h.trim())
    : ["student_code", "full_name", "dob", "gender", "class_id"];
  const start = headerMatch ? 1 : 0;

  const rows = lines.slice(start).map(line => {
    const cells = line.split(",");
    return {
      student_code: (cells[0] || "").trim(),
      full_name: (cells[1] || "").trim(),
      dob: (cells[2] || "").trim(),
      gender: (cells[3] || "").trim(),
      class_id: (cells[4] || "").trim()
    };
  });

  return { header, rows };
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateRows(rows, selectedClass, mode) {
  const errors = [];
  const codeCounts = {};
  const existingByCode = new Map(
    existingStudents.map(s => [s.student_code, s])
  );

  rows.forEach(r => {
    if (r.student_code) {
      codeCounts[r.student_code] = (codeCounts[r.student_code] || 0) + 1;
    }
  });

  rows.forEach((row, idx) => {
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
    } else if (String(row.class_id) !== String(selectedClass)) {
      rowErrors.class_id = "class_id không đúng lớp đã chọn";
    }

    const existing = existingByCode.get(row.student_code);
    if (existing) {
      if (String(existing.class_id) !== String(selectedClass)) {
        rowErrors.student_code = "Mã học sinh đã tồn tại ở lớp khác";
      } else if (mode === "replace") {
        // replace mode allows overwrite, no error
      }
    }

    errors[idx] = rowErrors;
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
    wrap.style.display = "none";
    importBtn.disabled = true;
    csvValid = false;
    return;
  }

  wrap.style.display = "block";
  head.innerHTML = `
    <tr>
      <th>student_code</th>
      <th>full_name</th>
      <th>dob</th>
      <th>gender</th>
      <th>class_id</th>
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
          ${["student_code", "full_name", "dob", "gender", "class_id"].map(field => {
            const cellError = errs[field];
            const className = cellError ? "cell-error" : "";
            const title = cellError ? `title="${cellError}"` : "";
            return `
              <td class="${className}" ${title}>
                <input
                  class="csv-cell-input"
                  data-row="${idx}"
                  data-field="${field}"
                  value="${row[field] || ""}"
                />
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
    input.addEventListener("input", e => {
      const rowIndex = Number(e.target.dataset.row);
      const field = e.target.dataset.field;
      previewRows[rowIndex][field] = e.target.value.trim();
      runValidationAndRender();
    });
  });
}

function runValidationAndRender() {
  const selectedClass = document.getElementById("csvClass").value;
  const mode = getCsvMode();
  logDebug("Validate CSV", { selectedClass, mode, rows: previewRows.length });
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
  logDebug("Import CSV clicked", {
    csvValid,
    selectedClass: document.getElementById("csvClass").value,
    rows: previewRows.length
  });
  if (!csvValid) {
    setCsvSummary("CSV chưa hợp lệ. Vui lòng kiểm tra lỗi.", true);
    alert("CSV chưa hợp lệ. Vui lòng kiểm tra lỗi.");
    return;
  }
  const classId = document.getElementById("csvClass").value;
  if (!classId) {
    setCsvSummary("Chọn lớp trước khi nhập CSV.", true);
    alert("Chọn lớp trước khi nhập CSV.");
    return;
  }

  try {
    const res = await fetch(`${STUDENT_API}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: previewRows,
        mode: getCsvMode(),
        class_id: classId
      })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Không nhập được CSV");
    const summary = [
      `Đã nhập ${data.inserted || 0} học sinh.`,
      data.updated ? `Cập nhật ${data.updated} học sinh.` : "",
      data.deleted ? `Đã xoá ${data.deleted} học sinh cũ.` : ""
    ].filter(Boolean).join(" ");
    setCsvSummary(summary);

    document.getElementById("csvInput").value = "";
    document.getElementById("csvImportBtn").disabled = true;
    document.getElementById("csvPreviewWrap").style.display = "none";
    previewRows = [];
    csvValid = false;
    await loadExistingStudents();
    await loadStudentList();
  } catch (err) {
    setCsvSummary(err.message, true);
    alert(err.message);
  }
}

async function loadStudentList() {
  const selectedClass = document.getElementById("filterClass").value;
  const url = selectedClass
    ? `${STUDENT_API}?class_id=${encodeURIComponent(selectedClass)}`
    : STUDENT_API;
  logDebug("Load student list", { selectedClass, url });
  let students = [];
  try {
    const res = await fetch(url);
    const data = await res.json();
    students = Array.isArray(data) ? data : (data.students || []);
  } catch (err) {
    logDebug("Failed to load list", err.message);
  }

  const tbody = document.getElementById("studentTable");
  const note = document.getElementById("studentListNote");
  tbody.innerHTML = "";

  if (!students.length) {
    note.innerText = "Chưa có dữ liệu.";
    return;
  }

  note.innerText = `Tổng ${students.length} học sinh.`;
  students.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${s.student_code}</td>
        <td>${s.full_name}</td>
        <td>${s.dob || ""}</td>
        <td>${s.gender || ""}</td>
        <td>${s.class_id || ""}</td>
      </tr>
    `;
  });
}

function initStudentPage() {
  const csvInput = document.getElementById("csvInput");
  const csvClass = document.getElementById("csvClass");
  const importBtn = document.getElementById("csvImportBtn");
  const filterBtn = document.getElementById("filterBtn");

  if (csvInput) csvInput.addEventListener("change", handleCsvFile);
  if (csvClass) {
    csvClass.addEventListener("change", () => {
      setCsvSummary("");
      runValidationAndRender();
    });
  }
  document.querySelectorAll('input[name="csvMode"]').forEach(el => {
    el.addEventListener("change", () => {
      toggleReplaceWarning();
      setCsvSummary("");
      runValidationAndRender();
    });
  });
  if (importBtn) importBtn.addEventListener("click", importCsv);
  if (filterBtn) filterBtn.addEventListener("click", loadStudentList);

  loadClasses();
  loadExistingStudents();
  loadStudentList();
  toggleReplaceWarning();
  setCsvSummary("");
}

window.addEventListener("DOMContentLoaded", initStudentPage);
