import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell,
} from 'recharts';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-slate-200  rounded-lg ${className}`} />;
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center py-14 text-[var(--text-placeholder)]">
            <BookOpen size={44} className="opacity-30 mb-3" />
            <p className="font-medium text-[var(--text-secondary)]">Chưa có dữ liệu điểm số</p>
            <p className="text-sm text-center mt-1 max-w-xs">Điểm sẽ xuất hiện khi giáo viên nhập điểm cho học sinh.</p>
        </div>
    );
}

function scoreColor(score) {
    if (score >= 8) return 'text-emerald-500';
    if (score >= 6.5) return 'text-blue-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
}

export default function ParentGrades() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [grades, setGrades] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [activeTerm, setActiveTerm] = useState('all');

    useEffect(() => {
        api.get('/parent/students').then((res) => {
            if (res.data.ok && res.data.data && res.data.data.length > 0) {
                setStudents(res.data.data);
                setSelectedId(res.data.data[0].id);
            }
        }).finally(() => setLoadingStudents(false));
    }, []);

    const fetchGrades = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        setGrades(null);
        try {
            const res = await api.get(`/parent/grades/${id}`);
            if (res.data.ok) setGrades(res.data.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (selectedId) fetchGrades(selectedId); }, [selectedId, fetchGrades]);

    const terms = grades?.by_term_and_subject
        ? [...new Set(grades.by_term_and_subject.map((r) => r.semester))].sort()
        : [];

    const filteredRows = grades?.by_term_and_subject?.filter(
        (r) => activeTerm === 'all' || String(r.semester) === String(activeTerm)
    ) || [];

    const barData = grades?.by_term_and_subject
        ? (() => {
            const map = {};
            grades.by_term_and_subject.forEach((r) => {
                if (!map[r.subject_name]) map[r.subject_name] = { name: r.subject_name, total: 0, count: 0 };
                map[r.subject_name].total += parseFloat(r.weighted_average);
                map[r.subject_name].count += 1;
            });
            return Object.values(map).map((s) => ({ name: s.name, avg: +(s.total / s.count).toFixed(2) })).sort((a, b) => b.avg - a.avg);
        })()
        : [];

    const selectedStudent = students.find((s) => s.id === selectedId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Bảng điểm</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">Chi tiết điểm số của con theo môn học</p>
                </div>
                {students.length > 1 && !loadingStudents && (
                    <div className="relative">
                        <select
                            id="grades-student-select"
                            value={selectedId || ''}
                            onChange={(e) => { setSelectedId(parseInt(e.target.value)); setActiveTerm('all'); }}
                            className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Student info badge */}
            {selectedStudent && (
                <div className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <BookOpen size={18} className="text-indigo-500 flex-shrink-0" />
                    <div className="text-sm">
                        <span className="font-semibold text-[var(--text-primary)]">{selectedStudent.full_name}</span>
                        <span className="text-[var(--text-secondary)] ml-2">— Lớp {selectedStudent.class_name}</span>
                    </div>
                    {grades?.overall_average != null && (
                        <div className="ml-auto text-right">
                            <p className="text-xs text-slate-500">Điểm TB tổng</p>
                            <p className={`text-lg font-bold ${scoreColor(grades.overall_average)}`}>{grades.overall_average}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Bar chart */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-5 shadow-sm">
                <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-4">Điểm trung bình theo môn</h3>
                {loading ? (
                    <div className="animate-pulse bg-slate-200  rounded-lg h-48" />
                ) : barData.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(v) => [v, 'Điểm TB']} contentStyle={{ fontSize: 12 }} />
                            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                                {barData.map((entry, i) => (
                                    <Cell key={i} fill={entry.avg < 5 ? '#ef4444' : entry.avg < 6.5 ? '#f59e0b' : '#6366f1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Term filter + table */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">Chi tiết điểm theo kỳ</h3>
                    {terms.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => setActiveTerm('all')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${activeTerm === 'all' ? 'bg-indigo-600 text-white' : 'bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}>Tất cả</button>
                            {terms.map((t) => (
                                <button key={t} onClick={() => setActiveTerm(String(t))} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${activeTerm === String(t) ? 'bg-indigo-600 text-white' : 'bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}>Kỳ {t}</button>
                            ))}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-2">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : filteredRows.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-subtle)]">
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">Học kỳ</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Môn học</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Thường xuyên</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">1 Tiết</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Giữa kỳ</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Cuối kỳ</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Điểm TB</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row, i) => (
                                    <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--hover-bg)]/50 transition-colors">
                                        <td className="py-2.5 px-3 text-[var(--text-secondary)] whitespace-nowrap">Kỳ {row.semester}</td>
                                        <td className="py-2.5 px-3 font-medium text-[var(--text-primary)] whitespace-nowrap">{row.subject_name}</td>
                                        <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">
                                            {[row.mieng_1, row.mieng_2, row.phut15_1, row.phut15_2].filter(v => v != null).join(', ') || '-'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">
                                            {[row.tiet1_1, row.tiet1_2].filter(v => v != null).join(', ') || '-'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                                            {row.giuaki != null ? row.giuaki : '-'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                                            {row.cuoiki != null ? row.cuoiki : '-'}
                                        </td>
                                        <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${scoreColor(row.weighted_average)}`}>
                                            {row.weighted_average != null ? row.weighted_average : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
