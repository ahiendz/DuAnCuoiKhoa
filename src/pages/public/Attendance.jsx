import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, X, Activity, Cpu, Calendar, Wifi, WifiOff, Database, Loader2 } from 'lucide-react';
import api from '@/services/api';

// CONSTANTS - STRICT TIMING
const STABILITY_THRESHOLD_MS = 3000;
const COOLDOWN_MS = 2000;
const LOOP_INTERVAL_MS = 500;

export default function PublicAttendance() {
    // UI State
    const [scanning, setScanning] = useState(false);
    const [matchResult, setMatchResult] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showTrainModal, setShowTrainModal] = useState(false);

    // Logic State
    const [stabilityProgress, setStabilityProgress] = useState(0);
    const [cooldownCountdown, setCooldownCountdown] = useState(0);
    const [totalStudents, setTotalStudents] = useState([]); // Array of student objects
    const [presentCount, setPresentCount] = useState(0);
    const [presentStudentIds, setPresentStudentIds] = useState(new Set()); // Track unique attendance
    const [recentAttendance, setRecentAttendance] = useState([]); // [ { name, class, time, avatar } ]

    // Training State
    const [trainCandidates, setTrainCandidates] = useState([]);
    const [isTraining, setIsTraining] = useState(false);

    // Debug Logic State
    const [debugLogs, setDebugLogs] = useState([]);

    // REFS
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const loopTimeoutRef = useRef(null);
    const faceFirstSeenRef = useRef(null);
    const missedFramesRef = useRef(0); // Grace period counter
    const isRecognizingRef = useRef(false);
    const isCooldownRef = useRef(false);
    const cooldownTimerRef = useRef(null);

    // --- LOGGING HELPER ---
    const addLog = (message) => {
        const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
        setDebugLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 49)]); // Keep 50 lines
    };

    // --- INITIALIZATION ---
    useEffect(() => {
        loadStats();
        return () => stopCamera();
    }, [selectedDate]); // Reload stats when date changes

    const loadStats = async () => {
        try {
            // 1. Get all students to calculate Total and map Avatars
            const studRes = await api.get('/students');
            const validStudents = studRes.data.filter(s => s.avatar_url);
            setTotalStudents(validStudents);

            // 2. Get today's attendance to calculate Present
            const attRes = await api.get(`/attendance/face?date=${selectedDate}`);
            const attendedIds = new Set(attRes.data.map(r => r.student_code));

            setPresentStudentIds(attendedIds);
            setPresentCount(attendedIds.size);

            addLog(`Đã tải dữ liệu ngày ${selectedDate}: ${attendedIds.size}/${validStudents.length} có mặt.`);
        } catch (err) {
            console.error(err);
            addLog('Lỗi tải dữ liệu: ' + err.message);
        }
    };

    // --- CAMERA CONTROL ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setScanning(true);
                addLog('Camera đã bật');

                faceFirstSeenRef.current = null;
                setStabilityProgress(0);
                missedFramesRef.current = 0;
                isRecognizingRef.current = false;
                isCooldownRef.current = false;

                loop();
            }
        } catch (err) {
            alert('Không thể truy cập camera: ' + err.message);
            addLog('Lỗi Camera: ' + err.message);
        }
    };

    const stopCamera = () => {
        if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;

        setScanning(false);
        setStabilityProgress(0);
        setCooldownCountdown(0);
        addLog('Đã tắt Camera');
    };

    // --- HELPER: Blob to Base64 ---
    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // --- MAIN LOGIC LOOP (CAMERA) ---
    const loop = async () => {
        if (!streamRef.current || !videoRef.current) return;
        if (isRecognizingRef.current || isCooldownRef.current) {
            loopTimeoutRef.current = setTimeout(loop, LOOP_INTERVAL_MS);
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

            const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg'));
            const base64Image = await blobToBase64(blob);

            const res = await api.post('/face/detect', { image: base64Image });

            if (res.data.hasFace) {
                // Face Found
                missedFramesRef.current = 0;

                const now = Date.now();
                if (!faceFirstSeenRef.current) {
                    faceFirstSeenRef.current = now;
                    addLog('Phát hiện khuôn mặt...');
                }

                const elapsed = now - faceFirstSeenRef.current;
                const progress = Math.min((elapsed / STABILITY_THRESHOLD_MS) * 100, 100);
                setStabilityProgress(progress);

                if (elapsed >= STABILITY_THRESHOLD_MS) {
                    addLog('Ổn định 3s -> Bắt đầu nhận diện');
                    await executeRecognition(blob);
                }
            } else {
                // Face NOT Found - Grace Period
                if (faceFirstSeenRef.current) {
                    missedFramesRef.current += 1;
                    if (missedFramesRef.current > 2) {
                        addLog('Mất dấu -> Reset bộ đếm');
                        faceFirstSeenRef.current = null;
                        setStabilityProgress(0);
                        missedFramesRef.current = 0;
                    } else {
                        addLog(`Mất dấu tạm thời (${missedFramesRef.current}/2)...`);
                    }
                }
            }
        } catch (err) {
            // silent
        }

        if (streamRef.current) {
            loopTimeoutRef.current = setTimeout(loop, LOOP_INTERVAL_MS);
        }
    };

    // --- RECOGNITION ---
    const executeRecognition = async (imageBlob) => {
        isRecognizingRef.current = true;
        setStabilityProgress(100);

        try {
            const base64Image = await blobToBase64(imageBlob);

            const res = await api.post('/face/verify', {
                image: base64Image,
                date: selectedDate
            });

            if (res.data.status === 'success') {
                const student = res.data;
                const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const isNew = !presentStudentIds.has(student.student_code);

                addLog(`✅ THÀNH CÔNG: ${student.full_name} (${(student.confidence * 100).toFixed(0)}%)`);
                addLog('-> Đã gửi tín hiệu xuống Arduino');

                // Get correct avatar from DB if available, else from response
                const dbStudent = totalStudents.find(s => s.student_code === student.student_code);
                const avatarUrl = dbStudent ? dbStudent.avatar_url : 'https://via.placeholder.com/150';

                const fullStudentData = {
                    ...student,
                    avatar_url: avatarUrl,
                    time: timeStr,
                    id: Date.now()
                };

                setMatchResult(fullStudentData);

                // Update Stats ONLY if unique
                if (isNew) {
                    setPresentCount(prev => prev + 1);
                    setPresentStudentIds(prev => new Set(prev).add(student.student_code));
                } else {
                    addLog('(Học sinh này đã điểm danh trước đó)');
                }

                // Add to Recent List (Visualization)
                setRecentAttendance(prev => [
                    fullStudentData,
                    ...prev.slice(0, 9)
                ]);

                startCooldown();
            } else {
                addLog('❌ KHÔNG NHẬN DIỆN ĐƯỢC');
                faceFirstSeenRef.current = null;
                setStabilityProgress(0);
            }
        } catch (err) {
            addLog('Lỗi API: ' + (err.response?.data?.message || err.message));
        } finally {
            isRecognizingRef.current = false;
        }
    };

    const startCooldown = () => {
        isCooldownRef.current = true;
        isRecognizingRef.current = false;
        faceFirstSeenRef.current = null;
        setStabilityProgress(0);

        let remaining = COOLDOWN_MS / 1000;
        setCooldownCountdown(remaining);
        addLog(`Chờ ${remaining}s...`);

        cooldownTimerRef.current = setInterval(() => {
            remaining -= 1;
            setCooldownCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(cooldownTimerRef.current);
                isCooldownRef.current = false;
                addLog('Sẵn sàng nhận diện tiếp');
                setMatchResult(null);
            }
        }, 1000);
    };

    const testConnection = async () => {
        addLog('Đang kiểm tra kết nối Server...');
        try {
            const res = await api.get('/summary');
            addLog(`Kết nối TỐT: Lớp=${res.data.classes}, HS=${res.data.students}`);
        } catch (err) {
            addLog('MẤT KẾT NỐI: ' + (err.response?.data?.message || err.message));
        }
    };

    // --- TRAINING LOGIC ---
    const handleOpenTrain = () => {
        setTrainCandidates(totalStudents);
        setShowTrainModal(true);
    };

    const handleConfirmTrain = async () => {
        setIsTraining(true);
        addLog('Đang bắt đầu huấn luyện dữ liệu khuôn mặt...');
        try {
            const res = await api.post('/face/train');
            addLog(`✅ HUẤN LUYỆN XONG! (${res.data.eligible_students} khuôn mặt)`);
            alert(`Huấn luyện thành công!\nĐã xử lý: ${res.data.eligible_students} khuôn mặt.`);
            setShowTrainModal(false);
        } catch (err) {
            addLog('❌ Lỗi huấn luyện: ' + (err.response?.data?.message || err.message));
            alert('Lỗi huấn luyện: ' + err.message);
        } finally {
            setIsTraining(false);
        }
    };

    const absentCount = totalStudents.length - presentCount;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative">

            {/* TRAIN MODAL */}
            {showTrainModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <Database className="text-indigo-400" />
                                <div>
                                    <h2 className="text-xl font-bold text-white">Xác nhận huấn luyện dữ liệu</h2>
                                    <p className="text-xs text-slate-400">Danh sách các học sinh hợp lệ (đã có Avatar)</p>
                                </div>
                            </div>
                            <button onClick={() => !isTraining && setShowTrainModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 custom-scrollbar">
                            {trainCandidates.length === 0 ? (
                                <div className="text-center text-slate-500 py-12">Chưa có học sinh nào có dữ liệu khuôn mặt (Avatar URL).</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {trainCandidates.map(student => (
                                        <div key={student.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center gap-2 relative group hover:border-indigo-500 transition-colors">
                                            <div className="relative">
                                                <img
                                                    src={student.avatar_url}
                                                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 bg-slate-900"
                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/150'}
                                                />
                                                <div className="absolute bottom-0 right-0 bg-green-500 text-white p-0.5 rounded-full border-2 border-slate-800">
                                                    <CheckCircle size={10} />
                                                </div>
                                            </div>
                                            <div className="text-center w-full">
                                                <div className="text-xs font-bold text-white truncate w-full">{student.full_name}</div>
                                                <div className="text-[10px] text-slate-400">{student.student_code} • {student.class_name}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-950 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setShowTrainModal(false)}
                                disabled={isTraining}
                                className="px-6 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmTrain}
                                disabled={isTraining || trainCandidates.length === 0}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                            >
                                {isTraining ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Database size={18} />
                                        Xác nhận huấn luyện ({trainCandidates.length})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-20 shadow-xl">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Cpu className="text-indigo-400" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                            HỆ THỐNG ĐIỂM DANH <span className="text-xs font-mono text-slate-500 border border-slate-700 px-1 rounded mx-2">PRO DEBUG</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleOpenTrain}
                            className="bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                        >
                            <Database size={14} />
                            Huấn luyện AI
                        </button>

                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-slate-700">
                            <Calendar size={14} className="text-slate-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-sm text-slate-200 focus:ring-0 p-0"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">

                {/* LEFT: MAIN CONTENT (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-4">

                    {/* CAMERA DISPLAY */}
                    <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl border border-slate-800 group">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={`w-full h-full object-cover transition-opacity ${scanning ? 'opacity-100' : 'opacity-20'}`}
                        />
                        {!scanning && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <button
                                    onClick={startCamera}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:scale-105 transition-transform"
                                >
                                    <Camera size={20} /> BẬT CAMERA
                                </button>
                            </div>
                        )}
                        {scanning && (
                            <>
                                <button onClick={stopCamera} className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <X size={20} />
                                </button>

                                {/* Stability Bar */}
                                {!matchResult && !cooldownCountdown && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 bg-slate-900/80 backdrop-blur rounded-full px-4 py-3 border border-slate-700">
                                        <div className="flex justify-between text-[10px] mb-2">
                                            <span className="text-indigo-300 font-bold uppercase tracking-wider">Độ ổn định khuôn mặt</span>
                                            <span className="text-slate-400 font-mono">{Math.round(stabilityProgress)}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-200 ${stabilityProgress >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${stabilityProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Cooldown Overlay */}
                                {cooldownCountdown > 0 && (
                                    <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                                        <div className="text-6xl font-black text-white mb-2">{Math.ceil(cooldownCountdown)}</div>
                                        <div className="text-slate-300 text-sm uppercase tracking-widest">Đang xử lý tiếp theo...</div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* RESULT OVERLAY */}
                        {matchResult && (
                            <div className="absolute top-4 left-4 right-4 bg-green-900/40 border border-green-500/50 backdrop-blur-md rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-top-4 z-20">
                                <img
                                    src={matchResult.avatar_url}
                                    className="w-16 h-16 rounded-full border-2 border-white object-cover shadow-lg"
                                    onError={(e) => e.target.src = 'https://via.placeholder.com/150'}
                                />
                                <div>
                                    <div className="text-green-300 text-xs font-bold uppercase flex items-center gap-2">
                                        <CheckCircle size={12} />
                                        Điểm danh thành công
                                    </div>
                                    <div className="text-white text-xl font-bold">{matchResult.full_name}</div>
                                    <div className="text-green-100/80 text-sm font-mono mt-1">
                                        {matchResult.student_code} • Lớp {matchResult.class_name} • {(matchResult.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: SIDEBAR (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4 h-full">

                    {/* STATS */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 relative overflow-hidden">
                            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Hiện diện</div>
                            <div className="text-3xl font-bold text-green-400">{presentCount}</div>
                            <div className="absolute right-2 top-2 opacity-10"><CheckCircle size={40} /></div>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 relative overflow-hidden">
                            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Vắng mặt</div>
                            <div className="text-3xl font-bold text-red-400">{Math.max(0, absentCount)}</div>
                            <div className="absolute right-2 top-2 opacity-10"><X size={40} /></div>
                        </div>
                    </div>

                    <div className="bg-slate-800 rounded-xl p-2 border border-slate-700 text-center">
                        <span className="text-xs text-slate-400">Tổng sĩ số: </span>
                        <span className="text-white font-bold">{totalStudents.length}</span>
                    </div>

                    {/* RECENT ATTENDANCE */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[300px]">
                        <div className="bg-slate-950 p-3 border-b border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={12} className="text-green-500" />
                                Hoạt động gần đây
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {recentAttendance.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                                    <WifiOff size={24} className="opacity-50" />
                                    <span className="text-xs italic">Chưa có dữ liệu</span>
                                </div>
                            )}
                            {recentAttendance.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 animate-in slide-in-from-right fade-in duration-300 group hover:bg-slate-800 transition-colors">
                                    <img
                                        src={item.avatar_url}
                                        className="w-10 h-10 rounded-full object-cover border border-slate-600 group-hover:border-indigo-500 transition-colors"
                                        onError={(e) => e.target.src = 'https://via.placeholder.com/150'}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-white truncate">{item.full_name}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <span className="bg-slate-700 px-1 rounded text-slate-300">{item.class_name}</span>
                                            <span>•</span>
                                            <span className="text-green-400 font-mono">{(item.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-slate-500">{item.time}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COMPACT DEBUG LOG */}
                    <div className="bg-black/40 border border-slate-800/50 rounded-xl flex flex-col overflow-hidden h-40 shrink-0">
                        <div className="bg-slate-950/50 p-2 border-b border-slate-800/50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Wifi size={10} className="text-indigo-500" />
                                Gỡ lỗi trực tiếp
                            </span>
                            <button onClick={testConnection} className="text-[9px] hover:text-white text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/50 bg-indigo-900/20 hover:bg-indigo-600 transition-colors">
                                Test API
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px] custom-scrollbar bg-black/20">
                            {debugLogs.map((log, i) => (
                                <div key={i} className={`flex gap-2 ${log.includes('THÀNH CÔNG') || log.includes('HUẤN LUYỆN XONG') ? 'text-green-400' :
                                    log.includes('Lỗi') || log.includes('MẤT') ? 'text-red-400' :
                                        'text-slate-500'
                                    }`}>
                                    <span className="opacity-50 shrink-0">{log.split(']')[0].replace('[', '')}</span>
                                    <span className="break-all">{log.split(']')[1]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
