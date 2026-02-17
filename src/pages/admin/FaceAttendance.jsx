import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Users, CheckCircle, XCircle } from 'lucide-react';
import { getStudents } from '@/services/studentService';
import { getClasses } from '@/services/classService';
import api from '@/services/api';

export default function FaceAttendance() {
    const [activeTab, setActiveTab] = useState('scan');
    const [classes, setClasses] = useState([]);

    // Scan tab state
    const [scanning, setScanning] = useState(false);
    const [matchResult, setMatchResult] = useState(null);
    const [recentAttendance, setRecentAttendance] = useState([]);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Train tab state
    const [trainClass, setTrainClass] = useState('');
    const [trainStudents, setTrainStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [trainingImage, setTrainingImage] = useState(null);
    const [trainingMsg, setTrainingMsg] = useState('');

    // Registered tab state
    const [registeredStudents, setRegisteredStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getClasses().then(setClasses).catch(() => { });
        loadRegisteredStudents();
    }, []);

    useEffect(() => {
        if (trainClass) {
            getStudents(trainClass).then(setTrainStudents).catch(() => { });
        } else {
            setTrainStudents([]);
        }
    }, [trainClass]);

    const loadRegisteredStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/face/registered');
            setRegisteredStudents(res.data || []);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setScanning(true);
                // Start recognition loop
                recognitionLoop();
            }
        } catch (err) {
            alert('Không thể truy cập camera: ' + err.message);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setScanning(false);
        setMatchResult(null);
    };

    const recognitionLoop = async () => {
        if (!scanning || !videoRef.current) return;

        try {
            // Capture frame from video
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);

            // Convert to blob and send to backend
            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('image', blob, 'frame.jpg');

                try {
                    const res = await api.post('/face/recognize', formData);
                    if (res.data.match) {
                        setMatchResult(res.data);
                    }
                } catch {
                    // Continue loop even on error
                }

                // Continue loop
                if (scanning) {
                    setTimeout(recognitionLoop, 1000); // Check every second
                }
            }, 'image/jpeg');
        } catch {
            if (scanning) {
                setTimeout(recognitionLoop, 1000);
            }
        }
    };

    const confirmAttendance = async () => {
        if (!matchResult) return;

        try {
            await api.post('/attendance/mark-face', {
                student_id: matchResult.student_id,
                confidence: matchResult.confidence
            });

            // Add to recent list
            setRecentAttendance(prev => [{
                ...matchResult,
                timestamp: new Date().toLocaleString('vi-VN')
            }, ...prev.slice(0, 9)]);

            setMatchResult(null);
        } catch (err) {
            alert('Lỗi khi lưu điểm danh: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleTrainImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTrainingImage(file);
    };

    const submitTraining = async () => {
        if (!selectedStudent || !trainingImage) {
            setTrainingMsg('Vui lòng chọn học sinh và ảnh');
            return;
        }

        const formData = new FormData();
        formData.append('student_id', selectedStudent);
        formData.append('image', trainingImage);

        try {
            await api.post('/face/train', formData);
            setTrainingMsg('Huấn luyện thành công!');
            setTrainingImage(null);
            setSelectedStudent('');
            loadRegisteredStudents();
        } catch (err) {
            setTrainingMsg('Lỗi: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Điểm danh khuôn mặt</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Quản lý nhận diện khuôn mặt và điểm danh</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1 w-fit">
                <button onClick={() => setActiveTab('scan')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'scan' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}>
                    <Camera size={16} /> Quét điểm danh
                </button>
                <button onClick={() => setActiveTab('train')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'train' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}>
                    <Upload size={16} /> Huấn luyện
                </button>
                <button onClick={() => setActiveTab('registered')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'registered' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}>
                    <Users size={16} /> Đã đăng ký
                </button>
            </div>

            {/* Scan Tab */}
            {activeTab === 'scan' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Camera</h3>
                        <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-4">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        </div>
                        <div className="flex gap-3">
                            {!scanning ? (
                                <button onClick={startCamera} className="btn-primary flex-1">Bắt đầu quét</button>
                            ) : (
                                <button onClick={stopCamera} className="px-4 py-2 rounded-lg bg-red-500 text-white flex-1">Dừng</button>
                            )}
                        </div>

                        {matchResult && (
                            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    {matchResult.avatar_url && (
                                        <img src={matchResult.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800 dark:text-white">{matchResult.full_name}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{matchResult.student_code}</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">Độ tin cậy: {(matchResult.confidence * 100).toFixed(1)}%</p>
                                    </div>
                                </div>
                                <button onClick={confirmAttendance} className="btn-primary w-full mt-3">Xác nhận điểm danh</button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Điểm danh gần đây</h3>
                        <div className="space-y-2">
                            {recentAttendance.map((r, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-800 dark:text-white">{r.full_name}</p>
                                        <p className="text-xs text-slate-500">{r.timestamp}</p>
                                    </div>
                                    <span className="text-xs text-slate-400">{(r.confidence * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                            {recentAttendance.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-8">Chưa có điểm danh</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Train Tab */}
            {activeTab === 'train' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm max-w-2xl">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Huấn luyện khuôn mặt</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lớp</label>
                            <select className="input-field" value={trainClass} onChange={e => setTrainClass(e.target.value)}>
                                <option value="">Chọn lớp</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Học sinh</label>
                            <select className="input-field" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!trainClass}>
                                <option value="">Chọn học sinh</option>
                                {trainStudents.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_code})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ảnh khuôn mặt</label>
                            <input type="file" accept="image/*" onChange={handleTrainImage} className="input-field" />
                            {trainingImage && <p className="text-xs text-green-600 mt-1">Đã chọn: {trainingImage.name}</p>}
                        </div>
                        {trainingMsg && (
                            <div className={`p-3 rounded-lg text-sm ${trainingMsg.includes('thành công') ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                                {trainingMsg}
                            </div>
                        )}
                        <button onClick={submitTraining} className="btn-primary w-full">Huấn luyện</button>
                    </div>
                </div>
            )}

            {/* Registered Tab */}
            {activeTab === 'registered' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mã HS</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Họ tên</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lớp</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-slate-400">Đang tải...</td></tr>
                                ) : registeredStudents.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-slate-400">Chưa có học sinh đăng ký</td></tr>
                                ) : registeredStudents.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.student_code}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{s.full_name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.class_name}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center gap-1 w-fit">
                                                <CheckCircle size={12} /> Đã đăng ký
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
