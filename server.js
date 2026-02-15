const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { spawn } = require("child_process");
const { sendToArduino } = require("./backend/iot/arduino.service");
const classService = require("./backend/services/classService");
const teacherService = require("./backend/services/teacherService");
const studentService = require("./backend/services/studentService");
const attendanceService = require("./backend/services/attendanceService");
const authService = require("./backend/services/authService");
const teacherRoutes = require("./backend/routes/teacherRoutes");
const { SUBJECTS } = classService;

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));
app.use("/api/teacher", teacherRoutes);

const BACKEND_DIR = path.join(__dirname, "backend");
const FACE_DIR = path.join(BACKEND_DIR, "face");
const FACE_ENGINE_PATH = path.join(FACE_DIR, "face_engine.py");
const TRAIN_SCRIPT_PATH = path.join(FACE_DIR, "train_faces.py");
const TEMP_IMAGE_PATH = path.join(FACE_DIR, "temp.jpg");
const TEMP_DETECT_PATH = path.join(FACE_DIR, "temp_detect.jpg");
const PYTHON_BIN = process.env.PYTHON_BIN || "python";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}


function buildCsvRow(values) {
  return values
    .map(value => {
      const safe = value === null || value === undefined ? "" : String(value);
      if (safe.includes(",") || safe.includes("\"") || safe.includes("\n")) {
        return `"${safe.replace(/"/g, "\"\"")}"`;
      }
      return safe;
    })
    .join(",");
}

function parseDataUrlImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return null;
  }
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) {
    return null;
  }
  return Buffer.from(match[1], "base64");
}

function safeParseEngineJson(stdout) {
  try {
    return JSON.parse(stdout.trim());
  } catch (firstError) {
    const lines = stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        return JSON.parse(lines[i]);
      } catch (lineError) {
        continue;
      }
    }
    throw firstError;
  }
}

function runPython(commandPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [commandPath, ...args], {
      cwd: __dirname
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", code => {
      if (code !== 0) {
        return reject(
          new Error(
            `Python process failed (${code}): ${stderr || stdout || "Unknown error"}`
          )
        );
      }
      return resolve({ stdout, stderr });
    });
  });
}

function runPythonInline(code) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, ["-c", code], { cwd: __dirname });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", codeExit => {
      if (codeExit !== 0) {
        return reject(new Error(stderr || stdout || `Python exit ${codeExit}`));
      }
      resolve({ stdout, stderr });
    });
  });
}

function saveBase64Image(dataUrl, filePath) {
  const match = typeof dataUrl === "string" ? dataUrl.match(/^data:image\/\w+;base64,(.+)$/) : null;
  if (!match) return null;
  const buffer = Buffer.from(match[1], "base64");
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function isValidHttpUrl(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function normalizeTrainCandidates(students = []) {
  return students
    .filter(item => item && item.student_code && isValidHttpUrl(item.avatar_url))
    .map(item => ({
      id: item.id ?? null,
      student_code: item.student_code,
      full_name: item.full_name || "",
      class_name: item.class_name || item.class_id || "",
      class_id: item.class_id || "",
      avatar_url: item.avatar_url
    }));
}

function normalizeClassDeleteError(error) {
  const message = (error && error.message) ? String(error.message) : "Không thể xóa lớp.";
  if (message.includes("attendance_class_id_fkey")) {
    return "Không thể xóa lớp vì còn bản ghi điểm danh liên quan.";
  }
  if (message.includes("violates foreign key constraint")) {
    return "Không thể xóa lớp vì còn dữ liệu liên quan trong hệ thống.";
  }
  return message;
}

function warmupPython() {
  try {
    const child = spawn(PYTHON_BIN, [FACE_ENGINE_PATH], { cwd: __dirname });
    child.on("error", () => {});
  } catch (e) {
    console.error("Python warmup failed:", e.message);
  }
}

process.on("uncaughtException", err => console.error(err));
process.on("unhandledRejection", err => console.error(err));

async function appendAttendance(result, pickedDate) {
  return attendanceService.recordFaceAttendance(result, pickedDate);
}

app.get("/api/subjects", (req, res) => {
  res.json({ subjects: SUBJECTS });
});

app.get("/api/teachers", async (req, res) => {
  const teachers = await teacherService.loadTeachers();
  return res.json(teachers);
});

app.post("/api/teachers", async (req, res) => {
  try {
    const result = await teacherService.createTeacher(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put("/api/teachers/:id", async (req, res) => {
  try {
    const teacher = await teacherService.updateTeacher(req.params.id, req.body || {});
    return res.json(teacher);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/teachers/:id", async (req, res) => {
  try {
    await teacherService.deleteTeacher(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/teachers/export", async (req, res) => {
  const teachers = await teacherService.loadTeachers();
  const header = [
    "name",
    "email",
    "gender",
    "subject",
    "class_count",
    "is_homeroom"
  ];
  const rows = teachers.map(t =>
    buildCsvRow([
      t.full_name,
      t.contact_email || "",
      t.gender || "",
      t.subject || "",
      (t.teaching_classes || []).length,
      t.is_homeroom ? "yes" : "no"
    ])
  );
  const csv = [buildCsvRow(header), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=teachers.csv");
  res.send(csv);
});

app.get("/api/classes", async (req, res) => {
  const classes = await classService.loadClasses();
  return res.json(classes);
});

app.post("/api/classes", async (req, res) => {
  try {
    const cls = await classService.createClass(req.body || {});
    return res.status(201).json(cls);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put("/api/classes/:id", async (req, res) => {
  try {
    const cls = await classService.updateClass(req.params.id, req.body || {});
    return res.json(cls);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/classes/:id", async (req, res) => {
  try {
    await classService.deleteClass(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: normalizeClassDeleteError(error) });
  }
});

app.get("/api/classes/export", async (req, res) => {
  const classes = await classService.loadClasses();
  const teachers = await teacherService.loadTeachers();
  const teacherName = id => {
    const t = teachers.find(x => String(x.id) === String(id));
    return t ? t.full_name : "";
  };
  const header = [
    "class_name",
    "grade_level",
    "homeroom_teacher",
    "math",
    "lit",
    "eng",
    "science"
  ];
  const rows = classes.map(cls =>
    buildCsvRow([
      cls.name,
      cls.grade_level,
      teacherName(cls.homeroom_teacher_id),
      teacherName(cls.subject_teachers?.["Toán"]),
      teacherName(cls.subject_teachers?.["Văn"]),
      teacherName(cls.subject_teachers?.["Anh"]),
      teacherName(cls.subject_teachers?.["KHTN"])
    ])
  );
  const csv = [buildCsvRow(header), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=classes.csv");
  res.send(csv);
});

app.get("/api/students", async (req, res) => {
  const { class_id } = req.query;
  try {
    const students = await studentService.listStudents({ class_id });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json(students);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const student = await studentService.createStudent(req.body || {});
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(201).json(student);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body || {});
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json(student);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    await studentService.deleteStudent(req.params.id);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/students/import", async (req, res) => {
  const rows = req.body && req.body.rows;
  const mode = req.body && req.body.mode;
  const class_id = req.body && req.body.class_id;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: "Dữ liệu CSV không hợp lệ" });
  }
  try {
    const result = await studentService.importStudents(rows, mode || "merge", class_id);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/students/export", async (req, res) => {
  try {
    const students = await studentService.exportStudents(req.query.class_id);
    const header = ["student_code", "full_name", "dob", "gender", "class_id", "avatar_url"];
    const rows = students.map(s =>
      buildCsvRow([
        s.student_code,
        s.full_name,
        s.dob,
        s.gender || "",
        s.class_id,
        s.avatar_url || ""
      ])
    );
    const csv = [buildCsvRow(header), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=students.csv");
    return res.send(csv);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/summary", async (req, res) => {
  const classes = await classService.loadClasses();
  const teachers = await teacherService.loadTeachers();
  const students = await studentService.listStudents();
  res.json({
    classes: classes.length,
    teachers: teachers.length,
    students: students.length
  });
});

app.get("/api/attendance", async (req, res) => {
  const { date, class_id } = req.query;
  try {
    const entries = await attendanceService.listAttendance({ date, class_id });
    res.json(entries);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/attendance/face", async (req, res) => {
  const { date, class_name } = req.query;
  try {
    const rows = await attendanceService.listFaceAttendance({ date, class_name });
    res.json(rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/attendance", async (req, res) => {
  const { date, class_id, records } = req.body || {};
  if (!date || !class_id || !Array.isArray(records)) {
    return res.status(400).json({ error: "Thiếu thông tin điểm danh" });
  }

  try {
    const result = await attendanceService.saveManualAttendance({ date, class_id, records });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password, role } = req.body || {};
  try {
    const user = await authService.login({ email, password, role });
    return res.json(user);
  } catch (error) {
    const status = error.message === "Thiếu thông tin đăng nhập" ? 400 : 401;
    return res.status(status).json({ error: error.message });
  }
});

app.get("/api/face/train/candidates", async (req, res) => {
  try {
    const students = await studentService.listStudents();
    const candidates = normalizeTrainCandidates(students);
    return res.json({
      status: "success",
      total_students: students.length,
      eligible_students: candidates.length,
      students: candidates
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.post("/api/face/train", async (req, res) => {
  let trainInputPath = null;
  try {
    ensureDir(FACE_DIR);
    const students = await studentService.listStudents();
    const candidates = normalizeTrainCandidates(students);

    if (!candidates.length) {
      return res.status(400).json({
        status: "fail",
        message: "Không có học sinh nào có avatar URL hợp lệ để huấn luyện.",
        total_students: students.length,
        eligible_students: 0
      });
    }

    trainInputPath = path.join(FACE_DIR, `train_input_${Date.now()}.json`);
    fs.writeFileSync(
      trainInputPath,
      JSON.stringify({ students: candidates }, null, 2),
      { encoding: "utf-8" }
    );

    const { stdout } = await runPython(TRAIN_SCRIPT_PATH, [trainInputPath]);
    const payload = safeParseEngineJson(stdout);
    return res.json({
      ...payload,
      total_students: students.length,
      eligible_students: candidates.length
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  } finally {
    if (trainInputPath && fs.existsSync(trainInputPath)) {
      try {
        fs.unlinkSync(trainInputPath);
      } catch (cleanupError) {
        console.error("Failed to remove train input:", cleanupError.message);
      }
    }
  }
});

app.post("/api/face/detect", async (req, res) => {
  try {
    ensureDir(FACE_DIR);
    const imageData = req.body && req.body.image;
    if (!imageData) {
      return res.json({ hasFace: false });
    }
    const saved = saveBase64Image(imageData, TEMP_DETECT_PATH);
    if (!saved) {
      return res.json({ hasFace: false });
    }
    const script = `
import json
import face_recognition
image = face_recognition.load_image_file(r"${TEMP_DETECT_PATH}")
locs = face_recognition.face_locations(image)
print(json.dumps({"hasFace": bool(locs)}))
`;
    const { stdout } = await runPythonInline(script);
    const payload = safeParseEngineJson(stdout);
    return res.json(payload);
  } catch (error) {
    return res.json({ hasFace: false });
  }
});

app.post("/api/face/debug", (req, res) => {
  try {
    const payload = req.body || {};
    const mode = payload.mode || "UNKNOWN";
    const hasFace = payload.hasFace === true ? "Y" : "N";
    const detectionCount = Number.isFinite(payload.detectionCount) ? payload.detectionCount : -1;
    const waitReset = payload.waitForFaceReset === true ? "Y" : "N";
    const remainingMs = Number.isFinite(payload.remainingMs) ? payload.remainingMs : -1;
    const note = typeof payload.message === "string" ? payload.message : "";
    console.log(
      `[FACE-DEBUG] mode=${mode} hasFace=${hasFace} detections=${detectionCount} waitReset=${waitReset} remainingMs=${remainingMs} msg=${note}`
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error("[FACE-DEBUG] parse error:", error.message);
    return res.status(400).json({ ok: false, message: error.message });
  }
});

app.post("/api/face/verify", async (req, res) => {
  try {
    ensureDir(FACE_DIR);

    const imageBuffer = parseDataUrlImage(req.body && req.body.image);
    if (!imageBuffer) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid or missing base64 image"
      });
    }

    fs.writeFileSync(TEMP_IMAGE_PATH, imageBuffer);
    const { stdout } = await runPython(FACE_ENGINE_PATH, [TEMP_IMAGE_PATH]);
    const result = safeParseEngineJson(stdout);

    if (result.status === "success") {
      const saved = await appendAttendance(result, req.body && req.body.date);
      sendToArduino({
        status: "Y",
        name: result.full_name,
        class: result.class_name
      });
      console.log("Y", result.full_name, result.class_name);
      return res.json({
        status: "success",
        student_code: result.student_code,
        full_name: result.full_name,
        class_name: result.class_name,
        confidence: result.confidence,
        student: saved ? saved.student : null,
        attendance: saved ? saved.attendance : null
      });
    }

    sendToArduino({ status: "N" });
    console.log("N");
    return res.json(result);
  } catch (error) {
    sendToArduino({
      status: "N"
    });
    console.log("N");
    return res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
});

const PORT = 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  warmupPython();
});

// Giữ server reference
server.on("error", err => {
  console.error("Server error:", err);
});

setInterval(() => {}, 1000);
