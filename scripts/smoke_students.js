const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const baseUrl = "http://localhost:3000";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];

  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", err => {
    consoleErrors.push(err.message);
  });
  page.on("dialog", async dialog => {
    await dialog.accept();
  });

  await page.addInitScript(() => {
    sessionStorage.setItem(
      "currentUser",
      JSON.stringify({ role: "admin", name: "Administrator" })
    );
  });

  await page.goto(`${baseUrl}/admin/students.html`, { waitUntil: "networkidle" });
  await page.waitForSelector("#csvClass");

  const csvPath = path.resolve("samples/sample_students_import.csv");

  await page.selectOption("#csvClass", "9A3");
  await page.setInputFiles("#csvInput", csvPath);
  await page.waitForSelector("#csvPreviewBody tr");

  const rowCount = await page.$$eval("#csvPreviewBody tr", rows => rows.length);
  if (rowCount !== 10) {
    throw new Error(`Expected 10 preview rows, got ${rowCount}`);
  }

  await page.fill('input[data-row="0"][data-field="full_name"]', "Nguyen Van Test");

  const firstCode = await page.inputValue('input[data-row="0"][data-field="student_code"]');
  await page.fill('input[data-row="1"][data-field="student_code"]', firstCode);
  await page.waitForFunction(() => document.getElementById("csvImportBtn").disabled === true);

  await page.fill('input[data-row="1"][data-field="student_code"]', "HS2026-311");
  await page.waitForFunction(() => document.getElementById("csvImportBtn").disabled === false);

  const before = JSON.parse(fs.readFileSync("data/students.json", "utf8"));
  const beforeOtherCount = before.filter(s => s.class_id !== "9A3").length;

  await page.click("#csvImportBtn");
  await sleep(800);

  await page.setInputFiles("#csvInput", csvPath);
  await page.waitForSelector("#csvPreviewBody tr");
  await page.fill('input[data-row="0"][data-field="full_name"]', "Nguyen Van Updated");
  await page.waitForFunction(() => document.getElementById("csvImportBtn").disabled === false);
  await page.click("#csvImportBtn");
  await sleep(800);

  const afterMerge = JSON.parse(fs.readFileSync("data/students.json", "utf8"));
  const updated = afterMerge.find(s => s.student_code === "HS2026-301");
  if (!updated || updated.full_name !== "Nguyen Van Updated") {
    throw new Error("Merge mode did not update existing student as expected");
  }

  await page.check('input[name="csvMode"][value="replace"]');
  await page.setInputFiles("#csvInput", csvPath);
  await page.waitForSelector("#csvPreviewBody tr");
  await page.click("#csvImportBtn");
  await sleep(800);

  const afterReplace = JSON.parse(fs.readFileSync("data/students.json", "utf8"));
  const classCount = afterReplace.filter(s => s.class_id === "9A3").length;
  const otherCount = afterReplace.filter(s => s.class_id !== "9A3").length;
  if (classCount !== 10) {
    throw new Error(`Replace mode expected 10 students in 9A3, got ${classCount}`);
  }
  if (otherCount !== beforeOtherCount) {
    throw new Error("Replace mode affected other classes");
  }

  if (consoleErrors.length) {
    throw new Error(`Console errors detected: ${consoleErrors.join(" | ")}`);
  }

  await browser.close();
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
