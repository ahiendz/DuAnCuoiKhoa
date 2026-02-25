import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-slate-200  rounded-lg ${className}`} />;
}

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b'];
const PIE_LABELS = ['Có mặt', 'Vắng', 'Trễ'];

function RateBadge({ rate }) {
    if (rate == null) return null;
    const color = rate >= 90 ? 'bg-emerald-500/15 text-emerald-500'
        : rate >= 80 ? 'bg-amber-500/10 text-amber-500'
            : 'bg-red-500/10 text-red-500';
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
            {rate}%
        </span>
    );
}

export default function ParentAttendance() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(true);

    useEffect(() => {
        api.get('/parent/students').then((res) => {
            if (res.data.ok && res.data.data && res.data.data.length > 0) {
                setStudents(res.data.data);
                setSelectedId(res.data.data[0].id);
            }
        }).finally(() => setLoadingStudents(false));
    }, []);

    const fetchAttendance = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        setData(null);
        try {
            const res = await api.get(`/parent/attendance/${id}`);
            if (res.data.ok) setData(res.data.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (selectedId) fetchAttendance(selectedId); }, [selectedId, fetchAttendance]);

    const pieData = data
        ? [
            { name: 'Có mặt', value: data.present_days || 0 },
            { name: 'Vắng', value: data.absent_days || 0 },
            { name: 'Trễ', value: data.late_days || 0 },
        ].filter((d) => d.value > 0)
        : [];

    const selectedStudent = students.find((s) => s.id === selectedId);

    const stats = [
        { label: 'Tổng số buổi', value: data?.total_days ?? '—', color: 'text-[var(--text-primary)]' },
        { label: 'Có mặt', value: data?.present_days ?? '—', color: 'text-emerald-500' },
        { label: 'Vắng mặt', value: data?.absent_days ?? '—', color: 'text-red-500' },
        { label: 'Đi trễ', value: data?.late_days ?? '—', color: 'text-amber-500' },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'present': return <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-500">Có mặt</span>;
            case 'absent': return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/10 text-red-500">Vắng</span>;
            case 'late': return <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-500">Trễ</span>;
            default: return <span className="px-2 py-1 rounded text-xs font-semibold bg-[var(--hover-bg)] text-[var(--text-secondary)]">?</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Lịch sử điểm danh</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">Thống kê chuyên cần của con theo trạng thái</p>
                </div>
                {students.length > 1 && !loadingStudents && (
                    <div className="relative">
                        <select
                            id="attendance-student-select"
                            value={selectedId || ''}
                            onChange={(e) => setSelectedId(parseInt(e.target.value))}
                            className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Student banner */}
            {selectedStudent && (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Calendar size={18} className="text-emerald-500 flex-shrink-0" />
                    <div className="text-sm flex-1">
                        <span className="font-semibold text-[var(--text-primary)]">{selectedStudent.full_name}</span>
                        <span className="text-[var(--text-secondary)] ml-2">— Lớp {selectedStudent.class_name}</span>
                    </div>
                    {data && <RateBadge rate={data.attendance_rate} />}
                </div>
            )}

            {/* Summary + Pie */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stats */}
                <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-5 shadow-sm">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-5">Thống kê chuyên cần</h3>
                    {loading ? (
                        <div className="space-y-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
                    ) : !data ? (
                        <div className="flex flex-col items-center py-10 text-[var(--text-placeholder)]">
                            <Calendar size={36} className="opacity-30 mb-2" />
                            <p className="text-sm">Chưa có dữ liệu điểm danh</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.map((s) => (
                                <div key={s.label} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                                    <span className="text-sm text-[var(--text-secondary)]">{s.label}</span>
                                    <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-sm font-semibold text-[var(--text-primary)]">Tỷ lệ có mặt</span>
                                <RateBadge rate={data.attendance_rate} />
                            </div>
                            {data.has_alert && (
                                <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500">
                                    ⚠ Tỷ lệ điểm danh dưới 90%. Cần cải thiện để tránh ảnh hưởng học tập.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Pie chart */}
                <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-5 shadow-sm">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Biểu đồ tỷ lệ</h3>
                    {loading ? (
                        <Skeleton className="h-52" />
                    ) : pieData.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-[var(--text-placeholder)]">
                            <Calendar size={36} className="opacity-30 mb-2" />
                            <p className="text-sm">Chưa có dữ liệu</p>
                        </div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [v + ' buổi', n]} contentStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {pieData.map((d, i) => (
                                    <div key={d.name} className="text-center">
                                        <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ background: PIE_COLORS[i] }} />
                                        <p className="text-xs text-[var(--text-secondary)]">{d.name}</p>
                                        <p className="font-bold text-[var(--text-primary)] text-sm">{d.value}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Detailed Attendance Table */}
            {data?.details && data.details.length > 0 && (
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-[var(--border-default)]">
                        <h3 className="font-semibold text-[var(--text-primary)]">Chi tiết điểm danh</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--hover-bg)] text-[var(--text-secondary)] font-medium">
                                <tr>
                                    <th className="px-4 py-3">Ngày</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {data.details.map((row, i) => (
                                    <tr key={i} className="hover:bg-[var(--hover-bg)]/50 transition-colors">
                                        <td className="px-4 py-3 text-[var(--text-primary)]">
                                            {new Date(row.date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(row.status)}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)] italic">
                                            {row.notes || '—'}
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
