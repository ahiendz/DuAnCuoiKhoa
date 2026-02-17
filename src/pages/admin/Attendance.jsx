import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getFaceAttendance } from '@/services/attendanceService';
import { getClasses } from '@/services/classService';

export default function Attendance() {
    const [classes, setClasses] = useState([]);
    const [classFilter, setClassFilter] = useState('');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [faceData, setFaceData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getClasses().then(setClasses).catch(() => { });
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (dateFilter) params.date = dateFilter;
            if (classFilter) {
                const cls = classes.find(c => String(c.id) === String(classFilter));
                if (cls) params.class_name = cls.name;
            }
            const data = await getFaceAttendance(params);
            setFaceData(Array.isArray(data) ? data : []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [dateFilter, classFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lịch sử điểm danh</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Danh sách học sinh đã điểm danh</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <input type="date" className="input-field w-auto" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                <select className="input-field w-auto min-w-[160px]" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                    <option value="">Tất cả lớp</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={loadData} className="btn-primary w-auto px-6">Lọc dữ liệu</button>
            </div>

            {/* Data table */}
            {loading ? <div className="text-center py-10 text-slate-500">Đang tải...</div> : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mã HS</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Học sinh</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lớp</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ngày</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Giờ</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Độ tin cậy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {faceData.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{r.student_code}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{r.full_name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.class_name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{r.date || new Date(r.timestamp).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString('vi-VN') : '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full" style={{ width: `${(r.confidence || 0) * 100}%` }} />
                                                </div>
                                                <span className="text-xs text-slate-500">{((r.confidence || 0) * 100).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {faceData.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">Không có dữ liệu</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    {faceData.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/30 px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Tổng: <span className="font-semibold text-slate-800 dark:text-white">{faceData.length}</span> lượt điểm danh
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
