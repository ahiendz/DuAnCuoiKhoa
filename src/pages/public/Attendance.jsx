
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ScanFace,
  Camera,
  CheckCircle2,
  XCircle,
  Users,
  Activity,
  RefreshCw,
  Sparkles,
  Database,
  Calendar,
} from "lucide-react";
import gsap from "gsap";

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */
const CONFIRM_MS = 3000;   // 3s face-stable window
const COOLDOWN_MS = 2000;  // 2s post-success cooldown
const TICK_MS = 250;       // detect loop interval

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */
function getInitials(name) {
  if (!name) return "ST";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ST";
  const last = parts[parts.length - 1];
  const first = parts.length > 1 ? parts[0] : "";
  return `${last[0] || ""}${first[0] || ""}`.toUpperCase() || "ST";
}

/* ──────────────────────────────────────────────
   Resilient Fetch Helper
   Uses response.text() then JSON.parse() so
   that ECONNREFUSED / HTML error pages don't
   crash with "Unexpected end of JSON input".
   ────────────────────────────────────────────── */
async function resilientFetch(url, options = {}, debugLog) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    const msg = `[FETCH] Network error for ${url}: ${networkError.message}`;
    debugLog?.(msg, "error");
    return { ok: false, status: 0, data: null, error: networkError };
  }

  let rawText = "";
  try {
    rawText = await response.text();
  } catch (readError) {
    const msg = `[FETCH] Read error for ${url}: ${readError.message}`;
    debugLog?.(msg, "error");
    return { ok: false, status: response.status, data: null, error: readError };
  }

  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      const snippet = rawText.length > 200 ? rawText.slice(0, 200) + "…" : rawText;
      debugLog?.(`[FETCH] Non-JSON response from ${url} (${response.status}): ${snippet}`, "error");
      return { ok: false, status: response.status, data: null, error: parseError };
    }
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || response.statusText || "Request failed";
    debugLog?.(`[FETCH] ${url} failed (${response.status}): ${errorMsg}`, "error");
    return { ok: false, status: response.status, data, error: new Error(errorMsg) };
  }

  return { ok: true, status: response.status, data, error: null };
}

/* ──────────────────────────────────────────────
   Debug Console Component
   ────────────────────────────────────────────── */
const DebugConsole = forwardRef(function DebugConsole(_props, ref) {
  const [logs, setLogs] = useState([]);
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    addLog: (msg, type = "info") => {
      setLogs((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString("vi-VN", { hour12: false }), msg, type },
      ]);
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    },
    clear: () => setLogs([]),
  }));

  return (
    <div
      className="glass-card p-4 mt-6 h-48 overflow-y-auto font-mono text-xs custom-scrollbar bg-black/50"
      ref={containerRef}
    >
      <h4 className="text-slate-400 mb-2 border-b border-white/10 pb-2">Debug Console Logs</h4>
      {logs.map((log, i) => (
        <div
          key={i}
          className={`mb-1 ${log.type === "error"
            ? "text-rose-400"
            : log.type === "success"
              ? "text-emerald-400"
              : log.type === "warn"
                ? "text-amber-400"
                : "text-slate-300"
            }`}
        >
          <span className="opacity-50">[{log.time}]</span> {log.msg}
        </div>
      ))}
      {logs.length === 0 && <p className="text-slate-500 italic">No logs yet...</p>}
    </div>
  );
});

/* ──────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────── */
export default function Attendance() {
  const navigate = useNavigate();

  /* ── Render state ── */
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState("Camera sẵn sàng. Nhấn 'Bắt đầu quét' để điểm danh.");
  const [students, setStudents] = useState([]);
  const [lastScanned, setLastScanned] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scanProgress, setScanProgress] = useState(0);
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [trainCandidates, setTrainCandidates] = useState([]);
  const [rosterReady, setRosterReady] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /* ── DOM refs ── */
  const containerRef = useRef(null);
  const cameraRef = useRef(null);
  const statsRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const debugRef = useRef(null);

  /* ── Lifecycle refs (vercel best-practice: useRef for transient values) ── */
  const mountedRef = useRef(false);
  const selectedDateRef = useRef(selectedDate);
  const isScanningRef = useRef(false);

  /* ── State-machine refs ── */
  const detectTimerRef = useRef(null);
  const confirmStartRef = useRef(null);     // timestamp when face first detected
  const cooldownUntilRef = useRef(0);       // timestamp until cooldown ends
  const inFlightRef = useRef({ detect: false, verify: false });
  const lastFaceRef = useRef(false);
  const successTimerRef = useRef(null);

  /* ── Roster refs ── */
  const baseRosterRef = useRef([]);
  const presentSetRef = useRef(new Set());

  /* ── Keep refs in sync with state ── */
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  /* ── Debug logger shortcut ── */
  const log = useCallback((msg, type = "info") => {
    debugRef.current?.addLog(msg, type);
  }, []);

  /* ──────────────────────────────────────────────
     Camera capture → base64
     ────────────────────────────────────────────── */
  const captureBase64 = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  /* ──────────────────────────────────────────────
     Reset transient scan state
     ────────────────────────────────────────────── */
  const resetTransient = useCallback(() => {
    confirmStartRef.current = null;
    lastFaceRef.current = false;
    cooldownUntilRef.current = 0;
    inFlightRef.current.detect = false;
    inFlightRef.current.verify = false;
  }, []);

  /* ──────────────────────────────────────────────
     Stop scanning — cleanup camera & timers
     ────────────────────────────────────────────── */
  const stopScan = useCallback((opts = {}) => {
    const silent = opts.silent === true;

    if (detectTimerRef.current) {
      clearInterval(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    resetTransient();
    isScanningRef.current = false;

    if (!silent && mountedRef.current) {
      setIsScanning(false);
      setScanProgress(0);
      setScanStatusMsg("Đã dừng quét.");
      setShowSuccess(false);
      log("Camera stopped.");
    }
  }, [resetTransient, log]);

  /* ──────────────────────────────────────────────
     Handle successful recognition
     ────────────────────────────────────────────── */
  const handleRecognitionSuccess = useCallback((payload) => {
    const studentCode = String(payload.student_code || "");
    const fullName = payload.full_name || "Unknown";
    const className = payload.class_name || "";
    const confidence = payload.confidence ?? null;
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    const alreadyPresent = presentSetRef.current.has(studentCode);
    if (alreadyPresent) {
      log(`[DEBUG] Student ${studentCode} already scanned today. Skipping count update.`, "warn");
    } else {
      presentSetRef.current.add(studentCode);
      log(`[DEBUG] Attendance +1 for ${fullName} (${studentCode}).`, "success");
    }

    setStudents((prev) => {
      let found = false;
      const updated = prev.map((s) => {
        if (String(s.student_code) === studentCode) {
          found = true;
          return { ...s, status: "present", time, confidence };
        }
        return s;
      });
      if (!found) {
        updated.push({
          id: studentCode || fullName,
          student_code: studentCode,
          name: fullName,
          class_name: className,
          avatar_url: payload.avatar_url || "",
          status: "present",
          time,
          confidence,
          initials: getInitials(fullName),
        });
      }
      return updated;
    });

    setLastScanned({ name: fullName, confidence });
    setShowSuccess(true);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setShowSuccess(false);
    }, COOLDOWN_MS);
  }, [log]);

  /* ──────────────────────────────────────────────
     Phase 2+3: Verify with backend then cooldown
     ────────────────────────────────────────────── */
  const doVerify = useCallback(async (base64) => {
    inFlightRef.current.verify = true;
    setScanProgress(80);
    setScanStatusMsg("Đang xác thực với AI Engine...");
    log("[DEBUG] 3s stability reached. Calling Python AI Engine...", "info");

    const result = await resilientFetch(
      "/api/face/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, date: selectedDateRef.current }),
      },
      log
    );

    if (!mountedRef.current) {
      inFlightRef.current.verify = false;
      return;
    }

    if (!result.ok) {
      log(`[DEBUG] Verify API failed: ${result.error?.message || "unknown"}`, "error");
      setScanStatusMsg("Lỗi kết nối máy chủ. Vui lòng thử lại.");
      setScanProgress(0);
      inFlightRef.current.verify = false;
      return;
    }

    const payload = result.data || {};
    log(`[DEBUG] Verify raw response: ${JSON.stringify(payload)}`, "info");

    if (payload.status === "success") {
      setScanProgress(100);
      const conf = typeof payload.confidence === "number" ? (payload.confidence * 100).toFixed(1) : "N/A";
      log(`[DEBUG] Recognition Success: ${payload.full_name}. Confidence: ${conf}%. Cooldown ${COOLDOWN_MS / 1000}s...`, "success");
      setScanStatusMsg(`✅ Xác thực thành công: ${payload.full_name}`);
      handleRecognitionSuccess(payload);

      // Enter cooldown
      cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
      log(`[DEBUG] Cooldown started (${COOLDOWN_MS}ms). Ignoring all faces.`, "info");
    } else {
      const failMsg = payload.message || "Unknown face";
      log(`[DEBUG] Verify result: fail — ${failMsg}`, "error");
      setScanStatusMsg(`❌ Không nhận diện được: ${failMsg}`);
      setScanProgress(0);
    }

    inFlightRef.current.verify = false;
  }, [log, handleRecognitionSuccess]);

  /* ──────────────────────────────────────────────
     Detection tick — the core state machine loop
     ────────────────────────────────────────────── */
  const onDetectTick = useCallback(async () => {
    if (!mountedRef.current || !isScanningRef.current || !streamRef.current) return;
    if (inFlightRef.current.detect || inFlightRef.current.verify) return;

    const now = Date.now();

    // ── Cooldown guard ──
    if (cooldownUntilRef.current > 0) {
      if (now < cooldownUntilRef.current) return;
      // Cooldown expired
      cooldownUntilRef.current = 0;
      confirmStartRef.current = null;
      lastFaceRef.current = false;
      setScanProgress(0);
      setScanStatusMsg("Sẵn sàng quét tiếp...");
      log("[DEBUG] Cooldown ended. Ready for next scan.", "info");
      return;
    }

    // ── Capture frame ──
    const base64 = captureBase64();
    if (!base64) return;

    // ── Call /api/face/detect ──
    inFlightRef.current.detect = true;
    const detectResult = await resilientFetch(
      "/api/face/detect",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      },
      log
    );

    if (!mountedRef.current) { inFlightRef.current.detect = false; return; }
    if (!detectResult.ok) { inFlightRef.current.detect = false; return; }

    const hasFace = Boolean(detectResult.data?.hasFace);

    // ── Face lost → reset ──
    if (!hasFace) {
      if (lastFaceRef.current) {
        log("[DEBUG] Face lost. Resetting timer.", "warn");
      }
      lastFaceRef.current = false;
      confirmStartRef.current = null;
      setScanProgress(0);
      setScanStatusMsg("Chưa phát hiện khuôn mặt, vui lòng đứng vào khung...");
      inFlightRef.current.detect = false;
      return;
    }

    // ── Face found ──
    if (!lastFaceRef.current) {
      log("[DEBUG] Face detected. Stabilizing for 3s...", "info");
    }
    lastFaceRef.current = true;

    if (!confirmStartRef.current) {
      confirmStartRef.current = now;
      setScanStatusMsg("Đã phát hiện khuôn mặt — giữ ổn định...");
    }

    const elapsed = now - confirmStartRef.current;
    // Animate progress 0→60 over 3 seconds
    const detectProgress = Math.min(60, Math.round((elapsed / CONFIRM_MS) * 60));
    setScanProgress(detectProgress);

    if (elapsed >= CONFIRM_MS) {
      // 3 seconds stable → verify
      confirmStartRef.current = null;
      inFlightRef.current.detect = false;
      await doVerify(base64);
      return;
    }

    const remaining = Math.ceil((CONFIRM_MS - elapsed) / 1000);
    setScanStatusMsg(`Ổn định khuôn mặt: ${remaining}s`);
    inFlightRef.current.detect = false;
  }, [captureBase64, log, doVerify]);

  /* ──────────────────────────────────────────────
     Start scanning
     ────────────────────────────────────────────── */
  const startScan = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanStatusMsg("Trình duyệt không hỗ trợ camera.");
      log("[DEBUG] Camera API not supported.", "error");
      return;
    }

    if (selectedDateRef.current !== todayIso) {
      log(`[DEBUG] Warning: scanning for ${selectedDateRef.current} (not today).`, "warn");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      resetTransient();
      isScanningRef.current = true;
      setIsScanning(true);
      setScanProgress(0);
      setScanStatusMsg("Đang quét camera...");
      log("[DEBUG] Camera started. Detection loop initiated.", "success");

      // Start detect loop
      if (detectTimerRef.current) clearInterval(detectTimerRef.current);
      detectTimerRef.current = setInterval(onDetectTick, TICK_MS);
    } catch (error) {
      setScanStatusMsg(`Lỗi camera: ${error.message}`);
      log(`[DEBUG] Cannot access camera: ${error.message}`, "error");
    }
  }, [todayIso, resetTransient, log, onDetectTick]);

  /* ──────────────────────────────────────────────
     Attendance records helpers
     ────────────────────────────────────────────── */
  const applyAttendanceRecords = useCallback((records, dateIso) => {
    const byCode = new Map();
    records.forEach((r) => {
      if (r?.student_code) byCode.set(String(r.student_code), r);
    });

    const nextPresentSet = new Set();
    const nextRoster = baseRosterRef.current.map((s) => {
      const key = String(s.student_code);
      const record = byCode.get(key);
      if (record) {
        nextPresentSet.add(key);
        return { ...s, status: "present", time: record.time || null, confidence: record.confidence ?? null, class_name: record.class_name || s.class_name };
      }
      return { ...s, status: "absent", time: null, confidence: null };
    });

    presentSetRef.current = nextPresentSet;
    setStudents(nextRoster);
    log(`[DEBUG] Applied ${records.length} attendance records for ${dateIso}.`, "info");
  }, [log]);

  const loadAttendanceForDate = useCallback(async (dateIso) => {
    if (!rosterReady) return;
    log(`[DEBUG] Loading attendance for ${dateIso}...`, "info");
    const result = await resilientFetch(
      `/api/attendance/face?date=${encodeURIComponent(dateIso)}`,
      {},
      log
    );
    if (!mountedRef.current) return;
    if (!result.ok) {
      log("[DEBUG] Failed to load attendance records.", "error");
      return;
    }
    const payload = Array.isArray(result.data) ? result.data : [];
    applyAttendanceRecords(payload, dateIso);
  }, [rosterReady, log, applyAttendanceRecords]);

  /* ──────────────────────────────────────────────
     Train AI modal
     ────────────────────────────────────────────── */
  const openTrainModal = useCallback(async () => {
    log("[DEBUG] Fetching candidates for AI training...", "info");
    const result = await resilientFetch("/api/face/train/candidates", {}, log);
    if (!mountedRef.current) return;
    if (!result.ok) {
      log("[DEBUG] Failed to load training candidates.", "error");
      return;
    }
    if (result.data?.status === "success") {
      setTrainCandidates(result.data.students || []);
      setShowTrainModal(true);
      log(`[DEBUG] Loaded ${result.data.eligible_students} training candidates.`, "info");
    } else {
      log(`[DEBUG] Train candidates error: ${result.data?.message || "Unknown"}`, "error");
    }
  }, [log]);

  const handleConfirmTrain = useCallback(async () => {
    setShowTrainModal(false);
    setIsTraining(true);
    log("[DEBUG] Bắt đầu huấn luyện AI...", "info");
    const result = await resilientFetch("/api/face/train", { method: "POST" }, log);
    if (!mountedRef.current) return;
    if (result.ok && (result.data?.status === "success" || result.data?.trained >= 0)) {
      log(`[DEBUG] Huấn luyện thành công. Trained: ${result.data?.trained ?? 0}, Skipped: ${result.data?.skipped ?? 0}`, "success");
    } else {
      log(`[DEBUG] Lỗi huấn luyện: ${result.data?.message || "Failed"}`, "error");
    }
    setIsTraining(false);
  }, [log]);

  /* ──────────────────────────────────────────────
     Mount / Unmount
     ────────────────────────────────────────────── */
  useEffect(() => {
    mountedRef.current = true;

    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
      gsap.fromTo(cameraRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.2 });
      gsap.fromTo(statsRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.6, delay: 0.3 });
    });

    const loadRoster = async () => {
      log("[DEBUG] Loading avatar-ready roster...", "info");
      const result = await resilientFetch("/api/face/train/candidates", {}, log);
      if (!mountedRef.current) return;
      if (!result.ok || result.data?.status !== "success") {
        log(`[DEBUG] Failed to load roster: ${result.data?.message || "Unknown"}`, "error");
        return;
      }
      const candidates = Array.isArray(result.data.students) ? result.data.students : [];
      const roster = candidates
        .filter((item) => item?.student_code)
        .map((item) => ({
          id: item.id ?? item.student_code,
          student_code: String(item.student_code),
          name: item.full_name || "",
          class_name: item.class_name || item.class_id || "",
          avatar_url: item.avatar_url || "",
          status: "absent",
          time: null,
          confidence: null,
          initials: getInitials(item.full_name),
        }));

      baseRosterRef.current = roster;
      presentSetRef.current = new Set();
      setStudents(roster);
      setRosterReady(true);
      log(`[DEBUG] Loaded ${roster.length} avatar-ready students. All initially Absent.`, "success");
    };

    loadRoster();

    return () => {
      stopScan({ silent: true });
      ctx.revert();
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load attendance when date changes ── */
  useEffect(() => {
    if (!rosterReady) return;
    loadAttendanceForDate(selectedDate);
    if (selectedDate !== todayIso) {
      log(`[DEBUG] Debug date selected: ${selectedDate} (not today).`, "warn");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, rosterReady]);

  /* ──────────────────────────────────────────────
     Derived counts — NO "Chờ" category
     ────────────────────────────────────────────── */
  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.length - presentCount;

  /* ──────────────────────────────────────────────
     Status helpers
     ────────────────────────────────────────────── */
  const getStatusColor = (status) => {
    if (status === "present") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    return "bg-rose-500/20 text-rose-400 border-rose-500/30";
  };

  const getStatusIcon = (status) => {
    if (status === "present") return <CheckCircle2 className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const getStatusLabel = (status) => {
    if (status === "present") return "Có mặt";
    return "Vắng";
  };

  /* ──────────────────────────────────────────────
     RENDER
     ────────────────────────────────────────────── */
  return (
    <div ref={containerRef} className="min-h-screen bg-navy pt-20 pb-8">
      {/* ── Header ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 mb-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại trang chủ</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="eyebrow mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Hệ thống điểm danh AI</span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Điểm danh <span className="gradient-text">thông minh</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openTrainModal}
                disabled={isTraining}
                className="glass-card px-4 py-2 flex items-center gap-2 hover:bg-white/5 transition disabled:opacity-50"
              >
                <Database className={`w-4 h-4 ${isTraining ? "text-amber-400 animate-pulse" : "text-violet-400"}`} />
                <span className="text-sm font-medium text-white">
                  {isTraining ? "Đang huấn luyện..." : "Huấn luyện AI"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Top Row: Camera & Stats */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left: Camera Section */}
            <div ref={cameraRef} className="lg:col-span-8 space-y-5">
              <div className="glass-card p-1 overflow-hidden relative shadow-2xl">
                <div className="relative aspect-video bg-navy-light rounded-2xl overflow-hidden">
                  {/* Progress Bar */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-white/10 z-30">
                    <div
                      className="h-full transition-all duration-300 ease-in-out rounded-r-full"
                      style={{
                        width: `${scanProgress}%`,
                        background: "linear-gradient(90deg, #6366f1, #a855f7, #d946ef)",
                        boxShadow: scanProgress > 0 ? "0 0 12px rgba(139,92,246,0.6), 0 0 24px rgba(168,85,247,0.3)" : "none",
                      }}
                    />
                  </div>

                  {/* Video & Canvas */}
                  <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover ${!isScanning && "hidden"}`}
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* UI Overlays */}
                  {!isScanning ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-navy/40 backdrop-blur-sm">
                      <div className="text-center p-8 rounded-3xl bg-white/5 border border-white/10 scale-in">
                        <div className="w-20 h-20 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-6">
                          <Camera className="w-10 h-10 text-violet-400" />
                        </div>
                        <p className="text-white text-lg font-semibold">Camera sẵn sàng</p>
                        <p className="text-sm text-slate-400 mt-2">Nhấn nút bên dưới để bắt đầu quét</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-scan z-10" style={{ top: "50%", boxShadow: "0 0 20px rgba(139, 92, 246, 0.8)" }} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="w-56 h-72 border-2 border-violet-400/40 rounded-3xl relative shadow-[0_0_50px_rgba(139,92,246,0.2)_inset]">
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-violet-400" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-violet-400" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-violet-400" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-violet-400" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Status Overlay */}
                  <div className="absolute bottom-6 left-0 right-0 text-center z-20">
                    <span className="inline-block px-6 py-2.5 rounded-full text-sm font-semibold backdrop-blur-xl border border-white/20 bg-black/60 text-white shadow-lg tracking-wide">
                      {isScanning ? (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {scanStatusMsg}
                        </span>
                      ) : "Hệ thống đang chờ"}
                    </span>
                  </div>

                  {/* Success Popup */}
                  {showSuccess && lastScanned && (
                    <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-md flex items-center justify-center z-40 animate-in fade-in zoom-in duration-300">
                      <div className="bg-slate-900/90 border border-emerald-500/30 p-8 rounded-3xl text-center shadow-2xl transform scale-105 border-b-4 border-b-emerald-500">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-glow-emerald">
                          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Đã nhận diện!</h3>
                        <p className="text-xl text-emerald-300 font-bold uppercase tracking-wider mb-2">{lastScanned.name}</p>
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                          <Activity className="w-4 h-4" />
                          <span>Độ tin cậy: {(lastScanned.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={isScanning ? () => stopScan() : startScan}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all transform active:scale-95 ${isScanning
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40"
                    }`}
                >
                  {isScanning ? (
                    <><XCircle className="w-6 h-6" /><span>Dừng quét ngay</span></>
                  ) : (
                    <><ScanFace className="w-6 h-6" /><span>Bắt đầu điểm danh</span></>
                  )}
                </button>

              </div>

              {/* Debug Console */}
              <DebugConsole ref={debugRef} />
            </div>

            {/* Right: Stats & Bento Controls */}
            <div className="lg:col-span-4 space-y-6">
              {/* Stats Block */}
              <div className="backdrop-blur-md bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-xl">
                <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-violet-400" />
                  Thống kê nhanh
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Có mặt</span>
                    </div>
                    <span className="text-3xl font-black text-emerald-400">{presentCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-rose-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Vắng mặt</span>
                    </div>
                    <span className="text-3xl font-black text-rose-400">{absentCount}</span>
                  </div>
                </div>
              </div>

              {/* Date Picker Block */}
              <div className="backdrop-blur-md bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-400" />
                  Lịch điểm danh
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-violet-500/50 transition-all cursor-pointer"
                />
              </div>

              {/* Recent Scroll Feed */}
              <div className="backdrop-blur-md bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  Hoạt động gần đây
                </h3>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {students.filter(s => s.status === 'present').length > 0 ? (
                    students.filter(s => s.status === 'present').slice(-5).reverse().map(student => (
                      <div key={`feed-${student.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                          {student.avatar_url ? (
                            <img src={student.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">
                              {getInitials(student.name)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-bold truncate">{student.name}</p>
                          <p className="text-[10px] text-emerald-400/80 font-mono italic">{student.time || '--:--'}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-sm italic">Chưa có hoạt động</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Main Student List Bento */}
          <div className="mt-8">
            <div className="backdrop-blur-md bg-slate-900/40 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Users className="w-32 h-32 text-white" />
              </div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Danh sách học sinh</h3>
                  <p className="text-slate-400 text-sm mt-1">Tổng cộng: {students.length} học sinh • Đã nhận diện {presentCount}</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold">
                    {selectedDate}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[800px] overflow-y-auto pr-4 custom-scrollbar">
                {students.map((student) => (
                  <div
                    key={student.id || student.student_code}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${student.status === 'present'
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-white/5 border-white/5 hover:border-white/20'
                      }`}
                  >
                    <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg relative ring-2 ring-white/5 group-hover:ring-violet-500/30 transition-all">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} className="w-full h-full object-cover" alt={student.name} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center text-white font-black">
                          {getInitials(student.name)}
                        </div>
                      )}
                      {student.status === 'present' && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 drop-shadow-md" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold leading-tight truncate text-base">{student.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{student.student_code}</span>
                        <span className="text-[11px] font-medium text-violet-400 px-2 py-0.5 rounded-md bg-violet-400/10 border border-violet-400/20">{student.class_name || "LỚP TỰ DO"}</span>
                      </div>
                    </div>
                    {student.status === 'present' && (
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-400 tracking-tighter">{student.time}</div>
                        <div className="text-[9px] text-slate-500 font-bold">SUCCESS</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Training Modal Redesign ── */}
      {showTrainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-navy/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 max-w-4xl w-full p-5 sm:p-8 rounded-3xl shadow-[0_0_100px_rgba(139,92,246,0.15)] flex flex-col relative overflow-hidden">
            {/* Modal Decor Accents */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-emerald-500 opacity-50" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-violet-600/10 blur-[100px] pointer-events-none" />

            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-inner shrink-0">
                  <Database className="w-6 h-6 sm:w-7 sm:h-7 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Cập nhật dữ liệu AI</h2>
                  <p className="text-slate-400 mt-1 text-xs sm:text-sm font-medium italic">Xác nhận danh sách học sinh nạp vào mô hình</p>
                </div>
              </div>
              <button
                onClick={() => setShowTrainModal(false)}
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-all border border-white/5 shrink-0"
              >
                <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>

            {/* Candidates Grid - Fixed Uniform Layout */}
            <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 relative z-10">
              {trainCandidates.length > 0 ? (
                trainCandidates.map((c) => (
                  <div
                    key={c.student_code}
                    className="flex items-center gap-3 sm:gap-4 bg-white/5 border border-white/5 rounded-2xl p-3 sm:p-4 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300 group h-full"
                  >
                    {/* Professional Avatar */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden ring-2 ring-white/5 shadow-md flex-shrink-0 group-hover:ring-violet-500/30 transition-all">
                      <img
                        src={c.avatar_url}
                        alt={c.full_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=NONE"; }}
                      />
                    </div>

                    {/* Accurate Info Detail */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-white text-sm sm:text-base font-bold leading-tight break-words">
                        {c.full_name}
                      </p>
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{c.student_code}</span>
                        {c.class_name && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/20 uppercase">
                            {c.class_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
                  <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-lg font-bold text-slate-400">Không có dữ liệu huấn luyện mới</p>
                </div>
              )}
            </div>

            {/* Footer Summary & Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-5 pt-5 border-t border-white/10 relative z-10">
              {/* Stack 1: Info (left on md, center on mobile) */}
              <div className="flex items-center gap-3 w-full md:w-auto md:justify-start justify-between">
                <div className="flex -space-x-2 overflow-hidden">
                  {trainCandidates.slice(0, 5).map((c, i) => (
                    <img key={`av-${i}`} className="inline-block h-8 w-8 sm:h-10 sm:w-10 rounded-full ring-2 ring-slate-900 object-cover" src={c.avatar_url} alt="" />
                  ))}
                  {trainCandidates.length > 5 && (
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-800 ring-2 ring-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
                      +{trainCandidates.length - 5}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white leading-tight">
                    {trainCandidates.length} ứng viên sẵn sàng
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-tight">Xử lý AI ~ 2 phút</p>
                </div>
              </div>

              {/* Stack 2: Buttons (right on md, full width col on mobile) */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowTrainModal(false)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleConfirmTrain}
                  disabled={trainCandidates.length === 0}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 text-sm"
                >
                  Bắt đầu Huấn luyện
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Aesthetics */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes scan {
              0% { top: 0%; opacity: 0; }
              5% { opacity: 1; }
              95% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
            .animate-scan {
              animation: scan 4s linear infinite;
            }
            .shadow-glow-emerald {
              box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);
            }
            .scale-in {
              animation: scaleIn 0.3s ease-out;
            }
            @keyframes scaleIn {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 5px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.02);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(139, 92, 246, 0.2);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(139, 92, 246, 0.4);
            }
          `,
        }}
      />
    </div>
  );
}
