import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, UserCheck, Zap, ShieldCheck, ClipboardList, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { getClasses } from '@/services/classService';
import { getStudents } from '@/services/studentService';
import { saveManualAttendance } from '@/services/attendanceService';

export default function PublicHome() {
    // Face mode
    const [mode, setMode] = useState('face'); // 'face' | 'manual'
    const [cameraOn, setCameraOn] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);

    // Manual mode
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [manualClass, setManualClass] = useState('');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState({});
    const [manualSaving, setManualSaving] = useState(false);
    const [manualMsg, setManualMsg] = useState('');

    // Load classes for manual mode
    useEffect(() => {
        getClasses().then(setClasses).catch(() => { });
    }, []);

    useEffect(() => {
        if (manualClass) {
            getStudents(manualClass).then(list => {
                setStudents(list);
                const init = {};
                list.forEach(s => { init[s.id] = 'present'; });
                setAttendance(init);
            }).catch(() => { });
        } else {
            setStudents([]);
            setAttendance({});
        }
    }, [manualClass]);

    // Camera functions
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setCameraOn(true);
            setResult(null);
            setError('');
            startDetection();
        } catch {
            setError('Không thể truy cập camera. Vui lòng cấp quyền.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setCameraOn(false);
        setDetecting(false);
    };

    const captureFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return null;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
    }, []);

    const startDetection = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(async () => {
            const image = captureFrame();
            if (!image) return;
            setDetecting(true);
            try {
                const detectRes = await api.post('/face/detect', { image });
                if (detectRes.data.hasFace) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    // Verify
                    const verifyRes = await api.post('/face/verify', { image, date: new Date().toISOString().split('T')[0] });
                    if (verifyRes.data.status === 'success') {
                        setResult({
                            status: 'success',
                            name: verifyRes.data.full_name,
                            code: verifyRes.data.student_code,
                            class: verifyRes.data.class_name,
                            confidence: verifyRes.data.confidence
                        });
                    } else {
                        setResult({ status: 'fail', message: verifyRes.data.message || 'Không nhận diện được' });
                    }
                    setDetecting(false);
                    // Resume after 5s
                    setTimeout(() => {
                        setResult(null);
                        if (cameraOn) startDetection();
                    }, 5000);
                }
            } catch {
                // silent retry
            }
            setDetecting(false);
        }, 2000);
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    // Manual attendance save
    const handleManualSave = async () => {
        if (!manualClass || !manualDate) return;
        setManualSaving(true);
        setManualMsg('');
        try {
            const records = Object.entries(attendance).map(([studentId, status]) => ({
                student_id: studentId,
                status
            }));
            await saveManualAttendance({ date: manualDate, class_id: manualClass, records });
            setManualMsg('Lưu điểm danh thành công!');
        } catch (err) {
            setManualMsg(err.response?.data?.error || 'Lỗi khi lưu điểm danh');
        } finally {
            setManualSaving(false);
        }
    };

    return (
        <div className="min-h-screen pb-20 bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300">
            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl -z-10 animate-pulse" />
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 bg-clip-text text-transparent leading-tight">
                    Điểm danh thông minh
                </h1>
                <p className="text-xl text-[var(--text-placeholder)] max-w-2xl mx-auto mb-10">
                    Hệ thống quản lý giáo dục toàn diện tích hợp công nghệ nhận diện khuôn mặt AI.
                </p>
            </section>

            {/* Mode toggle */}
            <section className="container mx-auto px-4 mb-6">
                <div className="flex justify-center">
                    <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--border-color)' }}>
                        <button onClick={() => { setMode('face'); stopCamera(); }}
                            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${mode === 'face' ? 'text-indigo-600 shadow-sm' : 'text-[var(--text-placeholder)] hover:text-[var(--text-primary)]'}`} style={mode === 'face' ? { backgroundColor: 'var(--bg-card)' } : {}}>
                            <Camera size={18} /> Nhận diện khuôn mặt
                        </button>
                        <button onClick={() => { setMode('manual'); stopCamera(); }}
                            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${mode === 'manual' ? 'text-indigo-600 shadow-sm' : 'text-[var(--text-placeholder)] hover:text-[var(--text-primary)]'}`} style={mode === 'manual' ? { backgroundColor: 'var(--bg-card)' } : {}}>
                            <ClipboardList size={18} /> Điểm danh thủ công
                        </button>
                    </div>
                </div>
            </section>

            {/* FACE RECOGNITION MODE */}
            {mode === 'face' && (
                <section className="container mx-auto px-4 mb-20">
                    <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden card-panel">
                        <div className="p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400" />
                        <div className="p-8 md:p-12">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Camera className="text-indigo-500" /> Điểm danh khuôn mặt
                                </h2>
                                <div className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${cameraOn ? 'bg-green-100 text-green-600' : 'text-[var(--text-placeholder)]'}`} style={!cameraOn ? { backgroundColor: 'var(--border-color)' } : {}}>
                                    {cameraOn ? 'Camera Active' : 'Camera Off'}
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                            {/* Camera area */}
                            <div className="aspect-video rounded-2xl overflow-hidden border-2 border-dashed relative" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-color)' }}>
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline style={{ display: cameraOn ? 'block' : 'none' }} />
                                <canvas ref={canvasRef} className="hidden" />
                                {!cameraOn && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer" onClick={startCamera}>
                                        <UserCheck size={64} className="mb-4" style={{ color: 'var(--border-color)' }} />
                                        <p className="font-medium text-[var(--text-placeholder)]">Nhấn để bật camera</p>
                                    </div>
                                )}
                                {detecting && (
                                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-yellow-500/90 text-white text-xs font-bold rounded-lg animate-pulse">
                                        Đang quét...
                                    </div>
                                )}
                            </div>

                            {/* Camera controls */}
                            <div className="flex justify-center gap-3 mt-4">
                                {!cameraOn ? (
                                    <button onClick={startCamera} className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2">
                                        <Camera size={18} /> Bật Camera
                                    </button>
                                ) : (
                                    <button onClick={stopCamera} className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium flex items-center gap-2">
                                        Tắt Camera
                                    </button>
                                )}
                            </div>

                            {/* Result display */}
                            {result && (
                                <div className={`mt-6 p-5 rounded-xl border ${result.status === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                                    {result.status === 'success' ? (
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                                                <UserCheck size={28} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-lg font-bold text-green-700 dark:text-green-400">{result.name}</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Mã HS: {result.code} • Lớp: {result.class}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-500">Confidence:</span>
                                                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: `${(result.confidence || 0) * 100}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-green-600">{((result.confidence || 0) * 100).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="text-red-500" size={24} />
                                            <p className="text-red-600 dark:text-red-400 font-medium">{result.message}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Feature cards */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-color)' }}>
                                    <Zap className="text-yellow-500 mb-2" />
                                    <h3 className="font-bold text-sm">Tốc độ cao</h3>
                                    <p className="text-xs text-[var(--text-placeholder)] mt-1">Nhận diện dưới 200ms</p>
                                </div>
                                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-color)' }}>
                                    <ShieldCheck className="text-green-500 mb-2" />
                                    <h3 className="font-bold text-sm">Chính xác 99%</h3>
                                    <p className="text-xs text-[var(--text-placeholder)] mt-1">Công nghệ AI mới nhất</p>
                                </div>
                                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-color)' }}>
                                    <UserCheck className="text-blue-500 mb-2" />
                                    <h3 className="font-bold text-sm">Tự động</h3>
                                    <p className="text-xs text-[var(--text-placeholder)] mt-1">Không cần thao tác</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* MANUAL ATTENDANCE MODE */}
            {mode === 'manual' && (
                <section className="container mx-auto px-4 mb-20">
                    <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden card-panel">
                        <div className="p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400" />
                        <div className="p-8 md:p-12">
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                                <ClipboardList className="text-indigo-500" /> Điểm danh thủ công
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Lớp</label>
                                    <select className="input-field" value={manualClass} onChange={e => setManualClass(e.target.value)}>
                                        <option value="">Chọn lớp</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Ngày</label>
                                    <input type="date" className="input-field" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                                </div>
                            </div>

                            {students.length > 0 && (
                                <>
                                    <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                                        <table className="w-full text-sm">
                                            <thead style={{ backgroundColor: 'var(--bg-page)' }} className="border-b border-[var(--border-color)]">
                                                <tr>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-[var(--text-placeholder)]">STT</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-[var(--text-placeholder)]">Mã HS</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-[var(--text-placeholder)]">Họ tên</th>
                                                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-[var(--text-placeholder)]">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y" style={{ divideColor: 'var(--border-color)' }}>
                                                {students.map((s, i) => (
                                                    <tr key={s.id} className="hover:bg-[var(--bg-page)] transition-colors">
                                                        <td className="px-4 py-3 text-[var(--text-placeholder)]">{i + 1}</td>
                                                        <td className="px-4 py-3 text-[var(--text-primary)] font-mono text-xs">{s.student_code}</td>
                                                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{s.full_name}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex justify-center gap-2">
                                                                <button onClick={() => setAttendance(prev => ({ ...prev, [s.id]: 'present' }))}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${attendance[s.id] === 'present' ? 'bg-green-500 text-white' : 'text-[var(--text-placeholder)] hover:opacity-80'}`} style={attendance[s.id] !== 'present' ? { backgroundColor: 'var(--border-color)' } : {}}>
                                                                    Có mặt
                                                                </button>
                                                                <button onClick={() => setAttendance(prev => ({ ...prev, [s.id]: 'absent' }))}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${attendance[s.id] === 'absent' ? 'bg-red-500 text-white' : 'text-[var(--text-placeholder)] hover:opacity-80'}`} style={attendance[s.id] !== 'absent' ? { backgroundColor: 'var(--border-color)' } : {}}>
                                                                    Vắng
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {manualMsg && (
                                        <div className={`mt-4 p-3 rounded-lg text-sm ${manualMsg.includes('thành công') ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                                            {manualMsg}
                                        </div>
                                    )}

                                    <div className="flex justify-end mt-4">
                                        <button onClick={handleManualSave} disabled={manualSaving} className="btn-primary flex items-center gap-2">
                                            {manualSaving ? 'Đang lưu...' : 'Lưu điểm danh'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {manualClass && students.length === 0 && (
                                <p className="text-center py-8 text-slate-400 text-sm">Không có học sinh trong lớp này</p>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
