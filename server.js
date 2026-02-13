const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { spawn } = require("child_process");
const { sendToArduino } = require("./backend/iot/arduino.service");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

const USERS_PATH = path.join(__dirname, "data", "users.json");
const CLASSES_PATH = path.join(__dirname, "data", "classes.json");
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

app.get("/api/teachers", (req, res) => {
  const db = readJSON(USERS_PATH);
  const teachers = db.users.filter(u => u.role === "teacher");
  res.json(teachers);
});

app.post("/api/teachers", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = readJSON(USERS_PATH);
  if (db.users.find(u => u.email === email)) {
    return res.status(409).json({ error: "Email already exists" });
  }

  db.users.push({
    id: Date.now(),
    name,
    email,
    password,
    role: "teacher"
  });

  writeJSON(USERS_PATH, db);
  return res.json({ success: true });
});

app.delete("/api/teachers/:id", (req, res) => {
  const id = Number(req.params.id);
  const db = readJSON(USERS_PATH);
  db.users = db.users.filter(u => u.id !== id);
  writeJSON(USERS_PATH, db);
  return res.json({ success: true });
});

app.get("/api/classes", (req, res) => {
  const db = readJSON(CLASSES_PATH);
  res.json(db.classes);
});

app.post("/api/classes", (req, res) => {
  const { name, grade } = req.body;
  if (!name || !grade) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = readJSON(CLASSES_PATH);
  db.classes.push({
    id: Date.now(),
    name,
    grade,
    teacherId: null
  });
  writeJSON(CLASSES_PATH, db);
  return res.json({ success: true });
});

app.delete("/api/classes/:id", (req, res) => {
  const id = Number(req.params.id);
  const db = readJSON(CLASSES_PATH);
  db.classes = db.classes.filter(c => c.id !== id);
  writeJSON(CLASSES_PATH, db);
  return res.json({ success: true });
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
