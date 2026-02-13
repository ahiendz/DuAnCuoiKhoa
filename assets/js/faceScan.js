// assets/js/faceScan.js
// ES module: browser-only FSM (no MediaPipe). Sends frames to backend /detect (light) and /verify (heavy).

const attendanceDate = document.getElementById("attendanceDate");
const startBtn = document.getElementById("startFaceBtn");
const trainBtn = document.getElementById("trainFaceBtn");
const scanStatus = document.getElementById("scanStatus");
const faceVideo = document.getElementById("faceVideo");
const captureCanvas = document.getElementById("captureCanvas");
const faceResult = document.getElementById("faceResult");
const liveRecognitionBody = document.getElementById("liveRecognitionBody");

attendanceDate.value = new Date().toISOString().slice(0, 10);

const Modes = {
  IDLE: "IDLE",
  SCANNING: "SCANNING",
  CONFIRMING: "CONFIRMING",
  VERIFYING: "VERIFYING",
  COOLDOWN: "COOLDOWN"
};

const CONFIRM_MS = 3000;
const COOLDOWN_MS = 2000;
const DETECT_INTERVAL_MS = 200;
const DEBUG = true;

let mode = Modes.IDLE;
let isRunning = false;
let stream = null;
let detectTimer = null;
let confirmStartAt = null;
let cooldownUntil = 0;
let detectInFlight = false;
let verifyInFlight = false;

/* ------------------------- UI helpers ------------------------- */
function setResult(type, message) {
  faceResult.className = "alert mt-3 mb-0";
  if (type === "success") faceResult.classList.add("alert-success");
  else if (type === "fail") faceResult.classList.add("alert-danger");
  else faceResult.classList.add("alert-secondary");
  faceResult.textContent = message;
}

function setScanStatus(message, css = "text-primary") {
  scanStatus.className = `scan-status ${css}`;
  scanStatus.textContent = message;
}

function renderLiveRecognition(result) {
  if (!liveRecognitionBody) return;
  const time = new Date().toTimeString().slice(0, 8);
  liveRecognitionBody.innerHTML = `
    <tr>
      <td>${result.student_code || ""}</td>
      <td>${result.full_name || ""}</td>
      <td>${time}</td>
      <td>${result.confidence ?? ""}</td>
    </tr>
  `;
}

function updateButton() {
  if (isRunning) {
    startBtn.textContent = "Dừng quét";
    startBtn.classList.remove("btn-primary");
    startBtn.classList.add("btn-danger");
  } else {
    startBtn.textContent = "Bắt đầu quét";
    startBtn.classList.add("btn-primary");
    startBtn.classList.remove("btn-danger");
  }
}

function debugLog(msg) {
  if (!DEBUG) return;
  console.log(`[Scan] ${msg}`);
}

/* ------------------------- Camera helpers ------------------------- */
async function ensureCamera() {
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: "user" },
      audio: false
    });
    faceVideo.srcObject = stream;
    faceVideo.style.display = "inline-block";
    await faceVideo.play();
  }
}

function captureBase64() {
  const w = faceVideo.videoWidth;
  const h = faceVideo.videoHeight;
  if (!w || !h) return null;
  captureCanvas.width = w;
  captureCanvas.height = h;
  const ctx = captureCanvas.getContext("2d");
  ctx.drawImage(faceVideo, 0, 0, w, h);
  return captureCanvas.toDataURL("image/jpeg", 0.85);
}

/* ------------------------- Backend calls ------------------------- */
async function callDetect(base64) {
  detectInFlight = true;
  try {
    const res = await fetch("/api/face/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 })
    });
    return res.ok ? res.json() : { hasFace: false };
  } catch (e) {
    debugLog(`detect error ${e.message}`);
    return { hasFace: false };
  } finally {
    detectInFlight = false;
  }
}

async function callVerify(base64) {
  verifyInFlight = true;
  try {
    const res = await fetch("/api/face/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, date: attendanceDate.value })
    });
    return res.json();
  } finally {
    verifyInFlight = false;
  }
}

/* ------------------------- FSM Loop ------------------------- */
function startDetectLoop() {
  if (detectTimer) clearInterval(detectTimer);
  detectTimer = setInterval(async () => {
    if (!isRunning) return;
    const now = Date.now();

    if (mode === Modes.COOLDOWN) {
      if (now < cooldownUntil) return;
      mode = Modes.SCANNING;
    }

    if (verifyInFlight) return;
    if (detectInFlight) return;

    const base64 = captureBase64();
    if (!base64) return;

    const detectRes = await callDetect(base64);
    const hasFace = !!detectRes.hasFace;

    if (!hasFace) {
      confirmStartAt = null;
      setScanStatus("Chưa thấy khuôn mặt, vui lòng đứng vào khung...", "text-muted");
      return;
    }

    if (!confirmStartAt) {
      confirmStartAt = now;
      mode = Modes.CONFIRMING;
      setScanStatus("Đã phát hiện, giữ ổn định...", "text-primary");
      return;
    }

    const elapsed = now - confirmStartAt;
    const remaining = Math.max(0, CONFIRM_MS - elapsed);
    setScanStatus(`Ổn định khuôn mặt: ${Math.ceil(remaining / 1000)}s`, "text-primary");

    if (elapsed >= CONFIRM_MS) {
      mode = Modes.VERIFYING;
      confirmStartAt = null;
      await doVerify(base64);
    }
  }, DETECT_INTERVAL_MS);
}

async function doVerify(base64) {
  try {
    setScanStatus("Đang xác thực...", "text-warning");
    const res = await callVerify(base64);
    if (res.status === "success") {
      setResult("success", `Y - ${res.full_name} (${res.class_name}) | Độ tin cậy: ${res.confidence}`);
      renderLiveRecognition(res);
      console.log("Y", res.full_name, res.class_name);
    } else {
      setResult("fail", res.message || "Không khớp dữ liệu");
      console.log("N");
    }
  } catch (e) {
    setResult("fail", `Lỗi xác thực: ${e.message}`);
    console.log("N");
  } finally {
    mode = Modes.COOLDOWN;
    cooldownUntil = Date.now() + COOLDOWN_MS;
    setScanStatus("Chờ 2s để quét lại...", "text-secondary");
  }
}

/* ------------------------- Controls ------------------------- */
async function startScanning() {
  if (isRunning) return;
  try {
    await ensureCamera();
    isRunning = true;
    mode = Modes.SCANNING;
    updateButton();
    setResult("info", "Đang quét khuôn mặt liên tục...");
    setScanStatus("Đang mở camera, chờ khuôn mặt...", "text-primary");
    startDetectLoop();
  } catch (e) {
    isRunning = false;
    updateButton();
    setResult("fail", `Khong the mo camera: ${e.message}`);
    setScanStatus("Scanner failed to start.", "text-danger");
  }
}

async function stopScanning() {
  if (!isRunning) return;
  isRunning = false;
  mode = Modes.IDLE;
  confirmStartAt = null;
  verifyInFlight = false;
  detectInFlight = false;
  if (detectTimer) clearInterval(detectTimer);
  detectTimer = null;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  faceVideo.srcObject = null;
  faceVideo.style.display = "none";
  updateButton();
  setScanStatus("Scanner is stopped.", "text-muted");
  setResult("info", "Da dung quet.");
}

async function toggleScanning() {
  if (isRunning) await stopScanning();
  else await startScanning();
}

async function trainFaces() {
  try {
    setResult("info", "Dang train du lieu khuon mat...");
    const response = await fetch("/api/face/train", { method: "POST" });
    const result = await response.json();
    if (result.status === "success") {
      setResult("success", `Train thanh cong. Da xu ly: ${result.trained}, bo qua: ${result.skipped}.`);
    } else {
      setResult("fail", result.message || "Train that bai.");
    }
  } catch (error) {
    setResult("fail", `Khong the train: ${error.message}`);
  }
}

/* ------------------------- Bindings ------------------------- */
startBtn.addEventListener("click", toggleScanning);
trainBtn.addEventListener("click", trainFaces);

// Export for potential external control
export { startScanning, stopScanning, toggleScanning };
