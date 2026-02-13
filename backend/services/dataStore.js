const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFile(filePath, defaultValue) {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf-8");
  }
}

function readData(fileName, defaultValue) {
  const filePath = path.join(DATA_DIR, fileName);
  ensureFile(filePath, defaultValue);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw || "{}");
}

function writeData(fileName, value) {
  const filePath = path.join(DATA_DIR, fileName);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function generateId() {
  return Date.now();
}

module.exports = {
  DATA_DIR,
  readData,
  writeData,
  generateId
};
