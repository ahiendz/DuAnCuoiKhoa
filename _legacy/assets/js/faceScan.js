// assets/js/faceScan.js
// ES module: browser-only FSM (no MediaPipe). Sends frames to backend /detect (light) and /verify (heavy).

const FACE_TRAIN_API = "/api/face/train";
const FACE_TRAIN_CANDIDATES_API = "/api/face/train/candidates";

const attendanceDate = document.getElementById("attendanceDate");
const startBtn = document.getElementById("startFaceBtn");
const trainBtn = document.getElementById("trainFaceBtn");
const scanStatus = document.getElementById("scanStatus");
const faceVideo = document.getElementById("faceVideo");
const captureCanvas = document.getElementById("captureCanvas");
const faceResult = document.getElementById("faceResult");
const liveRecognitionBody = document.getElementById("liveRecognitionBody");

const trainModal = document.getElementById("trainModal");
const closeTrainModalBtn = document.getElementById("closeTrainModalBtn");
const cancelTrainBtn = document.getElementById("cancelTrainBtn");
const confirmTrainBtn = document.getElementById("confirmTrainBtn");
const trainModalSummary = document.getElementById("trainModalSummary");
const trainPreviewState = document.getElementById("trainPreviewState");
const trainPreviewGrid = document.getElementById("trainPreviewGrid");

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

let trainCandidates = [];
let isTraining = false;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setTrainUiState({
  loading = false,
  confirmEnabled = false,
  summary = "",
  state = "",
  clearGrid = false
} = {}) {
  if (!trainModal) return;
  if (typeof summary === "string") trainModalSummary.textContent = summary;
  if (typeof state === "string") trainPreviewState.textContent = state;
  if (clearGrid) trainPreviewGrid.innerHTML = "";
  if (confirmTrainBtn) {
    confirmTrainBtn.disabled = !confirmEnabled || loading;
    confirmTrainBtn.textContent = loading ? "Đang huấn luyện..." : "Xác Nhận Và Huấn Luyện";
  }
  if (cancelTrainBtn) cancelTrainBtn.disabled = loading;
  if (closeTrainModalBtn) closeTrainModalBtn.disabled = loading;
}

function openTrainModal() {
  if (!trainModal) return;
  trainModal.classList.remove("hidden");
  trainModal.setAttribute("aria-hidden", "false");
}

function closeTrainModal(force = false) {
  if (!trainModal) return;
  if (isTraining && !force) return;
  trainModal.classList.add("hidden");
  trainModal.setAttribute("aria-hidden", "true");
}

function renderTrainCandidates(students) {
  if (!trainPreviewGrid) return;
  if (!Array.isArray(students) || students.length === 0) {
    trainPreviewGrid.innerHTML = "";
    return;
  }
  const html = students
    .map(student => {
      const avatar = escapeHtml(student.avatar_url || "https://placehold.co/52x52");
      const fullName = escapeHtml(student.full_name || "Không có tên");
      const studentCode = escapeHtml(student.student_code || "-");
      const className = escapeHtml(student.class_name || student.class_id || "-");
      return `
        <article class="train-student-card">
          <img class="train-student-avatar" src="${avatar}" alt="${fullName}" loading="lazy" referrerpolicy="no-referrer" />
          <div>
            <p class="train-student-name">${fullName}</p>
            <p class="train-student-meta">Mã: ${studentCode}</p>
            <p class="train-student-meta">Lớp: ${className}</p>
          </div>
        </article>
      `;
    })
    .join("");
  trainPreviewGrid.innerHTML = html;
}

async function loadTrainCandidates() {
  const response = await fetch(FACE_TRAIN_CANDIDATES_API);
  const payload = await response.json();
  if (!response.ok || payload.status === "error") {
    throw new Error(payload.message || "Không thể tải danh sách huấn luyện");
  }
  trainCandidates = Array.isArray(payload.students) ? payload.students : [];
  return payload;
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
      setScanStatus("Đã phát hiện, vui lòng giữ ổn định...", "text-primary");
      return;
    }

    const elapsed = now - confirmStartAt;
    const remaining = Math.max(0, CONFIRM_MS - elapsed);
    setScanStatus(`Ổn định khuôn mặt: ${Math.ceil(remaining / 1000)} giây`, "text-primary");

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
      setResult("success", `Xác thực thành công: ${res.full_name} (${res.class_name}) | Độ tin cậy: ${res.confidence}`);
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
    setScanStatus("Chờ 2 giây để quét lại...", "text-secondary");
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
    setResult("fail", `Không thể mở camera: ${e.message}`);
    setScanStatus("Không thể khởi động trình quét.", "text-danger");
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
  setScanStatus("Trình quét đã dừng.", "text-muted");
  setResult("info", "Đã dừng quét.");
}

async function toggleScanning() {
  if (isRunning) await stopScanning();
  else await startScanning();
}

async function runTrainRequest() {
  const response = await fetch(FACE_TRAIN_API, { method: "POST" });
  const result = await response.json();
  if (!response.ok || result.status !== "success") {
    throw new Error(result.message || "Huấn luyện thất bại.");
  }
  return result;
}

async function openTrainPreview() {
  if (isTraining) return;
  openTrainModal();
  setTrainUiState({
    loading: true,
    confirmEnabled: false,
    summary: "Đang tải toàn bộ học sinh có avatar URL...",
    state: "Đang tải dữ liệu...",
    clearGrid: true
  });
  try {
    const payload = await loadTrainCandidates();
    renderTrainCandidates(trainCandidates);
    if (!trainCandidates.length) {
      setTrainUiState({
        loading: false,
        confirmEnabled: false,
        summary: `Tổng ${payload.total_students || 0} học sinh, không có avatar URL hợp lệ.`,
        state: "Không có học sinh đủ điều kiện huấn luyện.",
        clearGrid: false
      });
      setResult("info", "Không có học sinh nào có avatar URL hợp lệ để huấn luyện.");
      return;
    }
    setTrainUiState({
      loading: false,
      confirmEnabled: true,
      summary: `Tổng ${payload.total_students || 0} học sinh, có ${payload.eligible_students || trainCandidates.length} học sinh đủ điều kiện huấn luyện.`,
      state: "Vui lòng xác nhận để bắt đầu huấn luyện.",
      clearGrid: false
    });
  } catch (error) {
    setTrainUiState({
      loading: false,
      confirmEnabled: false,
      summary: "Không tải được dữ liệu huấn luyện.",
      state: error.message || "Có lỗi xảy ra.",
      clearGrid: true
    });
    setResult("fail", `Không thể tải danh sách huấn luyện: ${error.message}`);
  }
}

async function confirmTrain() {
  if (isTraining || !trainCandidates.length) return;
  isTraining = true;
  setTrainUiState({
    loading: true,
    confirmEnabled: false,
    summary: trainModalSummary.textContent,
    state: "Đang huấn luyện dữ liệu khuôn mặt...",
    clearGrid: false
  });
  setResult("info", "Đang huấn luyện dữ liệu khuôn mặt...");
  try {
    const result = await runTrainRequest();
    const trained = Number.isFinite(result.trained) ? result.trained : 0;
    const skipped = Number.isFinite(result.skipped) ? result.skipped : 0;
    const fromUrl = Number.isFinite(result.trained_from_url) ? result.trained_from_url : 0;
    setResult(
      "success",
      `Huấn luyện thành công. Đã xử lý: ${trained}, bỏ qua: ${skipped}, từ URL: ${fromUrl}.`
    );
    setTrainUiState({
      loading: false,
      confirmEnabled: false,
      summary: trainModalSummary.textContent,
      state: `Đã huấn luyện xong. Đã xử lý ${trained} học sinh.`,
      clearGrid: false
    });
    closeTrainModal(true);
  } catch (error) {
    setResult("fail", `Không thể huấn luyện: ${error.message}`);
    setTrainUiState({
      loading: false,
      confirmEnabled: true,
      summary: trainModalSummary.textContent,
      state: `Huấn luyện thất bại: ${error.message}`,
      clearGrid: false
    });
  } finally {
    isTraining = false;
  }
}

function bindTrainModalEvents() {
  if (!trainModal) return;
  if (confirmTrainBtn) confirmTrainBtn.addEventListener("click", confirmTrain);
  if (cancelTrainBtn) cancelTrainBtn.addEventListener("click", () => closeTrainModal());
  if (closeTrainModalBtn) closeTrainModalBtn.addEventListener("click", () => closeTrainModal());
  trainModal.addEventListener("click", event => {
    if (event.target && event.target.dataset && event.target.dataset.trainClose === "1") {
      closeTrainModal();
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeTrainModal();
  });
}

/* ------------------------- Bindings ------------------------- */
startBtn.addEventListener("click", toggleScanning);
trainBtn.addEventListener("click", openTrainPreview);
bindTrainModalEvents();

// Export for potential external control
export { startScanning, stopScanning, toggleScanning };
