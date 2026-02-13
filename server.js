const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { spawn } = require("child_process");
const bcrypt = require("bcrypt");
const { sendToArduino } = require("./backend/iot/arduino.service");
const classService = require("./backend/services/classService");
const teacherService = require("./backend/services/teacherService");
const studentService = require("./backend/services/studentService");
const { readData, writeData, generateId } = require("./backend/services/dataStore");
const { SUBJECTS } = classService;

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

const BACKEND_DIR = path.join(__dirname, "backend");
const FACE_DIR = path.join(BACKEND_DIR, "face");
const FACE_ENGINE_PATH = path.join(FACE_DIR, "face_engine.py");
const TRAIN_SCRIPT_PATH = path.join(FACE_DIR, "train_faces.py");
const TEMP_IMAGE_PATH = path.join(FACE_DIR, "temp.jpg");
const TEMP_DETECT_PATH = path.join(FACE_DIR, "temp_detect.jpg");
const DATA_DIR = path.join(BACKEND_DIR, "data");
const ATTENDANCE_DEBUG_PATH = path.join(DATA_DIR, "attendance_debug.json");
const PYTHON_BIN = process.env.PYTHON_BIN || "python";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readJSONOrDefault(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function readManualAttendance() {
  const data = readData("attendance.json", { entries: [] });
  return data.entries || [];
}

function writeManualAttendance(entries) {
  writeData("attendance.json", { entries });
}

function readUsers() {
  const data = readData("users.json", { users: [] });
  return data.users || [];
}

function writeUsers(users) {
  writeData("users.json", { users });
}

function isBcryptHash(value) {
  return typeof value === "string" && value.startsWith("$2");
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

function warmupPython() {
  try {
    const child = spawn(PYTHON_BIN, [FACE_ENGINE_PATH], { cwd: __dirname, detached: true });
    child.unref();
    child.on("error", () => {});
  } catch (e) {
    console.error("Python warmup failed:", e.message);
  }
}

function appendAttendance(result, pickedDate) {
  ensureDir(DATA_DIR);
  const now = new Date();
  const date =
    typeof pickedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(pickedDate)
      ? pickedDate
      : now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);
  const items = readJSONOrDefault(ATTENDANCE_DEBUG_PATH, []);
  items.push({
    student_code: result.student_code,
    full_name: result.full_name,
    class_name: result.class_name,
    date,
    time,
    confidence: result.confidence
  });
  writeJSON(ATTENDANCE_DEBUG_PATH, items);
}

app.get("/api/subjects", (req, res) => {
  res.json({ subjects: SUBJECTS });
});

app.get("/api/teachers", (req, res) => {
  return res.json(teacherService.loadTeachers());
});

app.post("/api/teachers", (req, res) => {
  try {
    const result = teacherService.createTeacher(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put("/api/teachers/:id", (req, res) => {
  try {
    const teacher = teacherService.updateTeacher(req.params.id, req.body || {});
    return res.json(teacher);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/teachers/:id", (req, res) => {
  try {
    teacherService.deleteTeacher(req.params.id, {
      classes: classService.loadClasses()
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/teachers/export", (req, res) => {
  const teachers = teacherService.loadTeachers();
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

app.get("/api/classes", (req, res) => {
  return res.json(classService.loadClasses());
});

app.post("/api/classes", (req, res) => {
  try {
    const cls = classService.createClass(req.body || {});
    return res.status(201).json(cls);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put("/api/classes/:id", (req, res) => {
  try {
    const cls = classService.updateClass(req.params.id, req.body || {});
    return res.json(cls);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/classes/:id", (req, res) => {
  try {
    classService.deleteClass(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/classes/export", (req, res) => {
  const classes = classService.loadClasses();
  const teachers = teacherService.loadTeachers();
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

app.get("/api/students", (req, res) => {
  const { class_id } = req.query;
  try {
    const students = studentService.listStudents({ class_id });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json(students);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/students", (req, res) => {
  try {
    const student = studentService.createStudent(req.body || {});
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(201).json(student);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put("/api/students/:id", (req, res) => {
  try {
    const student = studentService.updateStudent(req.params.id, req.body || {});
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json(student);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/students/:id", (req, res) => {
  try {
    studentService.deleteStudent(req.params.id);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/students/import", (req, res) => {
  const rows = req.body && req.body.rows;
  const mode = req.body && req.body.mode;
  const class_id = req.body && req.body.class_id;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: "Dữ liệu CSV không hợp lệ" });
  }
  try {
    const result = studentService.importStudents(rows, mode || "merge", class_id);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/summary", (req, res) => {
  const classes = classService.loadClasses();
  const teachers = teacherService.loadTeachers();
  const students = studentService.listStudents();
  res.json({
    classes: classes.length,
    teachers: teachers.length,
    students: students.length
  });
});

app.get("/api/attendance", (req, res) => {
  const { date, class_id } = req.query;
  const entries = readManualAttendance().filter(
    e =>
      (!date || e.date === date) &&
      (!class_id || String(e.class_id) === String(class_id))
  );
  res.json(entries);
});

app.get("/api/attendance/face", (req, res) => {
  const { date, class_name } = req.query;
  const rows = readJSONOrDefault(ATTENDANCE_DEBUG_PATH, []);
  const filtered = rows.filter(
    r =>
      (!date || r.date === date) &&
      (!class_name || r.class_name === class_name)
  );
  const latestMap = new Map();
  filtered.forEach(item => {
    const key = `${item.student_code}-${item.date}`;
    const existing = latestMap.get(key);
    if (!existing || item.time > existing.time) {
      latestMap.set(key, item);
    }
  });
  res.json(Array.from(latestMap.values()));
});

app.post("/api/attendance", (req, res) => {
  const { date, class_id, records } = req.body || {};
  if (!date || !class_id || !Array.isArray(records)) {
    return res.status(400).json({ error: "Thiếu thông tin điểm danh" });
  }

  const classes = classService.loadClasses();
  const classExists = classes.find(c => String(c.id) === String(class_id));
  if (!classExists) {
    return res.status(400).json({ error: "Lớp không tồn tại" });
  }

  const allowedStatus = ["present", "absent", "late", "excused"];
  const entries = readManualAttendance();
  let saved = 0;
  const students = studentService.listStudents({ class_id });

  records.forEach(rec => {
    if (!rec.student_id) return;
    const studentFound = students.find(
      s => String(s.id) === String(rec.student_id)
    );
    if (!studentFound) return;
    const status = allowedStatus.includes(rec.status) ? rec.status : "present";
    entries.push({
      id: generateId(),
      student_id: rec.student_id,
      class_id,
      date,
      status,
      note: rec.note || ""
    });
    saved += 1;
  });

  writeManualAttendance(entries);
  res.json({ saved });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password || !role) {
    return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
  }

  const users = readUsers();
  const user = users.find(
    u => u.email === email && u.role === role
  );

  if (!user) {
    return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
  }

  if (isBcryptHash(user.password)) {
    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }
  } else {
    if (user.password !== password) {
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }
    user.password = bcrypt.hashSync(password, 10);
    writeUsers(users);
  }

  return res.json({
    id: user.id,
    name: user.name,
    role: user.role
  });
});

app.post("/api/face/train", async (req, res) => {
  try {
    ensureDir(FACE_DIR);
    ensureDir(DATA_DIR);
    const { stdout } = await runPython(TRAIN_SCRIPT_PATH);
    const payload = safeParseEngineJson(stdout);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
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
    ensureDir(DATA_DIR);

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
      sendToArduino({
        status: "Y",
        name: result.full_name,
        class: result.class_name
      });
      appendAttendance(result, req.body && req.body.date);
      console.log("Y", result.full_name, result.class_name);
    } else {
      sendToArduino({
        status: "N"
      });
      console.log("N");
    }

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
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  warmupPython();
});
