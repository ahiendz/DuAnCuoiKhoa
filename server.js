// ===== IMPORT =====
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

// ===== INIT APP =====
const app = express();
app.use(cors());
app.use(express.json());

// ===== PATHS =====
const USERS_PATH = path.join(__dirname, "data", "users.json");
const CLASSES_PATH = path.join(__dirname, "data", "classes.json");

// ===== UTILS =====
function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// =======================
// ===== TEACHER API =====
// =======================

// GET all teachers
app.get("/api/teachers", (req, res) => {
  const db = readJSON(USERS_PATH);
  const teachers = db.users.filter(u => u.role === "teacher");
  res.json(teachers);
});

// CREATE teacher
app.post("/api/teachers", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Thiếu dữ liệu" });
  }

  const db = readJSON(USERS_PATH);

  if (db.users.find(u => u.email === email)) {
    return res.status(409).json({ error: "Email đã tồn tại" });
  }

  db.users.push({
    id: Date.now(),
    name,
    email,
    password,
    role: "teacher"
  });

  writeJSON(USERS_PATH, db);
  res.json({ success: true });
});

// DELETE teacher
app.delete("/api/teachers/:id", (req, res) => {
  const id = Number(req.params.id);
  const db = readJSON(USERS_PATH);

  db.users = db.users.filter(u => u.id !== id);
  writeJSON(USERS_PATH, db);

  res.json({ success: true });
});

// ======================
// ===== CLASS API ======
// ======================

// GET classes
app.get("/api/classes", (req, res) => {
  const db = readJSON(CLASSES_PATH);
  res.json(db.classes);
});

// CREATE class
app.post("/api/classes", (req, res) => {
  const { name, grade } = req.body;

  if (!name || !grade) {
    return res.status(400).json({ error: "Thiếu dữ liệu" });
  }

  const db = readJSON(CLASSES_PATH);

  db.classes.push({
    id: Date.now(),
    name,
    grade,
    teacherId: null
  });

  writeJSON(CLASSES_PATH, db);
  res.json({ success: true });
});

// DELETE class
app.delete("/api/classes/:id", (req, res) => {
  const id = Number(req.params.id);
  const db = readJSON(CLASSES_PATH);

  db.classes = db.classes.filter(c => c.id !== id);
  writeJSON(CLASSES_PATH, db);

  res.json({ success: true });
});

// ===== START SERVER =====
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
