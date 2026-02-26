import React, { useEffect, useState, useCallback } from 'react';
import { Users, BookOpen, UserCircle, Calendar, TrendingUp } from 'lucide-react';
import { Plus, Trash2, StickyNote } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import api from '@/services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, LabelList,
    PieChart, Pie, Legend
} from 'recharts';

const GRADE_COLORS = {
    6: '#6366f1', 7: '#22d3ee', 8: '#f59e0b', 9: '#10b981',
    10: '#8b5cf6', 11: '#ec4899', 12: '#14b8a6',
};
const DONUT_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
const GRADES = [6, 7, 8, 9, 10, 11, 12];

// Custom legend for donut chart
const DonutLegend = ({ payload }) => (
    <ul className="space-y-1.5 mt-2">
        {payload.map((entry) => (
            <li key={entry.value} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                <span className="text-[var(--text-secondary)]">{entry.value}</span>
                <span className="text-[var(--text-primary)] font-semibold ml-auto">{entry.payload.count} GV</span>
            </li>
        ))}
    </ul>
);

// Donut center label
const DonutCenter = ({ cx, cy, total }) => (
    <>
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)" fontSize={22} fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize={11}>Giáo viên</text>
    </>
);

export default function AdminDashboard() {
    const [stats, setStats] = useState({ classes: 0, teachers: 0, students: 0, attendanceToday: 0 });
    const [gradeFilter, setGradeFilter] = useState('');
    const [studentDistData, setStudentDistData] = useState([]);
    const [classSizeData, setClassSizeData] = useState([]);
    const [teacherDistData, setTeacherDistData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartsLoading, setChartsLoading] = useState(false);
    const [insight, setInsight] = useState('');
    const [teacherInsight, setTeacherInsight] = useState('');

    // Notes
    const [notes, setNotes] = useState(() => {
        try { return JSON.parse(localStorage.getItem('admin_notes') || '[]'); } catch { return []; }
    });
    const [newNote, setNewNote] = useState('');

    const saveNotes = (updated) => {
        setNotes(updated);
        localStorage.setItem('admin_notes', JSON.stringify(updated));
    };
    const addNote = () => {
        if (!newNote.trim()) return;
        saveNotes([{ id: Date.now(), text: newNote, date: new Date().toLocaleDateString('vi-VN') }, ...notes]);
        setNewNote('');
    };
    const deleteNote = (id) => saveNotes(notes.filter(n => n.id !== id));

    // Initial stats + teacher dist
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [summaryRes, teacherStatsRes] = await Promise.all([
                    api.get('/summary'),
                    api.get('/stats/teachers-by-subject'),
                ]);
                setStats({
                    classes: summaryRes.data.classes || 0,
                    teachers: summaryRes.data.teachers || 0,
                    students: summaryRes.data.students || 0,
                    attendanceToday: summaryRes.data.attendanceToday || 0,
                });

                const tData = Array.isArray(teacherStatsRes.data) ? teacherStatsRes.data : [];
                setTeacherDistData(tData);

                // Build teacher insight
                const total = tData.reduce((s, r) => s + r.count, 0);
                if (total > 0) {
                    const max = tData.reduce((m, r) => r.count > m.count ? r : m, tData[0]);
                    const pct = Math.round((max.count / total) * 100);
                    if (pct > 40) {
                        setTeacherInsight(`⚠ Môn ${max.subject} chiếm tỷ lệ giáo viên cao (${pct}%).`);
                    } else {
                        setTeacherInsight('Phân bổ giáo viên theo môn đang cân bằng.');
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Chart data on grade filter change
    const fetchChartData = useCallback(async () => {
        setChartsLoading(true);
        try {
            const gradeRes = await api.get('/stats/students-by-grade');
            const gradeData = Array.isArray(gradeRes.data) ? gradeRes.data : [];
            setStudentDistData(gradeData);

            if (gradeData.length) {
                const max = gradeData.reduce((m, r) => r.count > m.count ? r : m, gradeData[0]);
                setInsight(`${max.name} có nhiều học sinh nhất: ${max.count} HS (${max.percent}%)`);
            }

            const params = gradeFilter ? { grade: gradeFilter } : {};
            const topRes = await api.get('/stats/top-classes', { params });
            setClassSizeData(Array.isArray(topRes.data) ? topRes.data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setChartsLoading(false);
        }
    }, [gradeFilter]);

    useEffect(() => {
        if (!loading) fetchChartData();
    }, [gradeFilter, loading, fetchChartData]);

    const maxGradeItem = studentDistData.length
        ? studentDistData.reduce((m, r) => r.count > m.count ? r : m, studentDistData[0])
        : null;

    const totalTeachers = teacherDistData.reduce((s, r) => s + r.count, 0);
    const donutData = teacherDistData.map((d, i) => ({
        name: d.subject,
        count: d.count,
        value: d.count, // recharts uses 'value' for pie slices
        fill: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-slate-700 rounded w-48" />
                <div className="grid grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-700 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="h-72 bg-slate-700 rounded-xl" />
                    <div className="h-72 bg-slate-700 rounded-xl" />
                </div>
            </div>
        );
    }

    const TooltipContent = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        const pct = totalTeachers > 0 ? Math.round((d.count / totalTeachers) * 100) : 0;
        return (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-sm">
                <p className="font-semibold text-[var(--text-primary)]">{d.name}</p>
                <p className="text-[var(--text-secondary)]">{d.count} giáo viên ({pct}%)</p>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h2>
                    <p className="text-[var(--text-secondary)] text-sm">Tổng quan hệ thống trường học</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Lọc theo khối:</span>
                    <select
                        className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        value={gradeFilter}
                        onChange={e => setGradeFilter(e.target.value)}
                    >
                        <option value="">Tất cả khối</option>
                        {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                    </select>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Tổng lớp học" value={stats.classes} icon={BookOpen} color="indigo" />
                <StatsCard title="Tổng giáo viên" value={stats.teachers} icon={UserCircle} color="green" />
                <StatsCard title="Tổng học sinh" value={stats.students} icon={Users} color="blue" />
                <StatsCard title="Điểm danh hôm nay" value={stats.attendanceToday} icon={Calendar} color="orange" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar: Student by grade */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">Phân bố học sinh theo khối</h3>
                        <TrendingUp size={16} className="text-indigo-400" />
                    </div>
                    {insight && <p className="text-xs text-indigo-400 mb-4 font-medium">💡 {insight}</p>}
                    {chartsLoading ? (
                        <div className="h-[250px] flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : studentDistData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={studentDistData} margin={{ top: 22, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8 }}
                                    formatter={(val, name, props) => [`${val} HS (${props.payload.percent}%)`, 'Số HS']}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {studentDistData.map((entry) => (
                                        <Cell
                                            key={entry.grade}
                                            fill={entry.grade === maxGradeItem?.grade
                                                ? (GRADE_COLORS[entry.grade] || '#6366f1')
                                                : `${GRADE_COLORS[entry.grade] || '#6366f1'}70`
                                            }
                                        />
                                    ))}
                                    <LabelList
                                        content={({ x, y, width, value, index }) => {
                                            const item = studentDistData[index];
                                            if (!value) return null;
                                            return (
                                                <text x={x + width / 2} y={y - 5} fill="#94a3b8" textAnchor="middle" fontSize={10}>
                                                    {value} ({item?.percent ?? 0}%)
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-slate-400 text-sm text-center py-10">Chưa có dữ liệu</p>}
                </div>

                {/* Donut: Teacher by subject */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">Phân bố giáo viên theo môn</h3>
                    </div>
                    {teacherInsight && (
                        <p className={`text-xs mb-3 font-medium ${teacherInsight.startsWith('⚠') ? 'text-amber-400' : 'text-green-400'}`}>
                            {teacherInsight}
                        </p>
                    )}
                    {donutData.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                        animationBegin={0}
                                        animationDuration={600}
                                    >
                                        {donutData.map((entry, i) => (
                                            <Cell key={entry.name} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<TooltipContent />} />
                                    <Legend
                                        content={<DonutLegend />}
                                        layout="vertical"
                                        align="right"
                                        verticalAlign="middle"
                                    />
                                    {/* Center label via foreignObject workaround using text elements in custom label */}
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="text-slate-400 text-sm text-center py-10">Chưa có dữ liệu</p>}
                </div>
            </div>

            {/* Top classes */}
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--text-primary)]">
                        Top lớp có sĩ số cao nhất
                        {gradeFilter && <span className="ml-2 text-xs text-indigo-400 font-normal">— Khối {gradeFilter}</span>}
                    </h3>
                </div>
                {chartsLoading ? (
                    <div className="h-[200px] flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : classSizeData.length > 0 ? (
                    <div className="space-y-3">
                        {classSizeData.map((cls, idx) => {
                            const maxCount = classSizeData[0].student_count || 1;
                            const pct = Math.round((cls.student_count / Math.max(maxCount, 40)) * 100);
                            const isOverCapacity = cls.student_count > 40;
                            return (
                                <div key={cls.id} className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-500 w-5 text-right">{idx + 1}</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)] w-14">{cls.name}</span>
                                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${isOverCapacity ? 'bg-red-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 w-28 justify-end">
                                        <span className={`text-sm font-semibold ${isOverCapacity ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                                            {cls.student_count} HS
                                        </span>
                                        {isOverCapacity && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-semibold whitespace-nowrap">⚠ Quá đông</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : <p className="text-slate-400 text-sm text-center py-8">Chưa có dữ liệu</p>}
            </div>

            {/* Notes */}
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <StickyNote size={18} className="text-yellow-500" /> Ghi chú hệ thống
                </h3>
                <div className="flex gap-2 mb-4">
                    <input
                        className="input-field flex-1 text-sm"
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Thêm ghi chú..."
                        onKeyDown={e => e.key === 'Enter' && addNote()}
                    />
                    <button onClick={addNote} className="btn-primary text-sm px-3 py-2 flex items-center gap-1">
                        <Plus size={14} /> Thêm
                    </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notes.map(n => (
                        <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--hover-bg)] border border-[var(--border-subtle)]">
                            <div className="flex-1">
                                <p className="text-sm text-[var(--text-primary)]">{n.text}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{n.date}</p>
                            </div>
                            <button onClick={() => deleteNote(n.id)} className="p-1 rounded hover:bg-[var(--hover-bg)] text-slate-400 hover:text-red-500 shrink-0">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {notes.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Chưa có ghi chú</p>}
                </div>
            </div>
        </div>
    );
}
