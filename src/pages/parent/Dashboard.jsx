import React from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
    BookOpen, Calendar, AlertTriangle, TrendingUp,
    Users, ChevronDown, RefreshCw, MessageSquare, ShieldAlert,
} from 'lucide-react';
import { useParentDashboard } from '@/hooks/useParentDashboard';
import GradeTrendByTermChart from '@/components/charts/GradeTrendByTermChart';
import { useTheme } from '@/context/ThemeContext';

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`} />;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, value, label, sub, loading }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-center gap-4">
            {loading ? (
                <>
                    <Skeleton className="w-12 h-12 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </>
            ) : (
                <>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        <Icon size={22} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold text-slate-800 dark:text-white truncate">{value}</p>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
                        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Chart skeleton ────────────────────────────────────────────────────────────
function ChartSkeleton({ height = 220 }) {
    return (
        <div className="animate-pulse space-y-2" style={{ height }}>
            <Skeleton className="h-full w-full" />
        </div>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, desc }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
            <Icon size={40} className="mb-3 opacity-40" />
            <p className="font-medium text-slate-500 dark:text-slate-400">{title}</p>
            {desc && <p className="text-sm mt-1 text-center max-w-xs">{desc}</p>}
        </div>
    );
}

// ── Alert badge ───────────────────────────────────────────────────────────────
const severityStyles = {
    critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    high: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400',
    medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
};

// ── Pie colours ───────────────────────────────────────────────────────────────
const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ParentDashboard() {
    const {
        students, selectedStudent, selectedStudentId, setSelectedStudentId,
        summary, grades, attendance, alerts, notes,
        loadingStudents, loadingData, error, refetch,
    } = useParentDashboard();

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Theme constants for charts
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#f1f5f9';
    const tooltipBg = isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.95)';
    const tooltipColor = isDark ? '#f8fafc' : '#1e293b';

    // ──── Derived chart data ────
    // Bar chart: subject averages across all terms
    const subjectChartData = React.useMemo(() => {
        if (!grades?.by_term_and_subject) return [];
        const subMap = {};
        grades.by_term_and_subject.forEach((row) => {
            if (!subMap[row.subject_name]) {
                subMap[row.subject_name] = { name: row.subject_name, total: 0, count: 0 };
            }
            subMap[row.subject_name].total += parseFloat(row.weighted_average);
            subMap[row.subject_name].count += 1;
        });
        return Object.values(subMap).map((s) => ({
            name: s.name,
            avg: parseFloat((s.total / s.count).toFixed(2)),
        })).sort((a, b) => b.avg - a.avg);
    }, [grades]);

    // Pie chart: attendance
    const pieData = React.useMemo(() => {
        if (!attendance) return [];
        return [
            { name: 'Có mặt', value: attendance.present_days || 0 },
            { name: 'Vắng', value: attendance.absent_days || 0 },
            { name: 'Trễ', value: attendance.late_days || 0 },
        ].filter((d) => d.value > 0);
    }, [attendance]);

    // ──── Loading: students ────
    if (loadingStudents) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    // ──── Error ────
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <ShieldAlert size={48} className="text-red-400" />
                <p className="text-slate-600 dark:text-slate-400 text-center max-w-sm">{error}</p>
                <button onClick={refetch} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">
                    <RefreshCw size={14} /> Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Page header + student selector ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Phụ Huynh</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi quá trình học tập của con</p>
                </div>

                {/* Student selector */}
                {students.length > 0 && (
                    <div>
                        {students.length <= 3 ? (
                            // Pill tabs for ≤3 students
                            <div className="flex gap-1.5 flex-wrap">
                                {students.map((s) => (
                                    <button
                                        key={s.id}
                                        id={`student-tab-${s.id}`}
                                        onClick={() => setSelectedStudentId(s.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedStudentId === s.id
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                            }`}
                                    >
                                        {s.full_name}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            // Dropdown for >3 students
                            <div className="relative">
                                <select
                                    id="student-select"
                                    value={selectedStudentId || ''}
                                    onChange={(e) => setSelectedStudentId(parseInt(e.target.value))}
                                    className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {students.map((s) => (
                                        <option key={s.id} value={s.id}>{s.full_name} — Lớp {s.class_name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Student info banner ── */}
            {selectedStudent && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white flex flex-wrap gap-4 items-center justify-between">
                    <div>
                        <p className="font-bold text-lg">{selectedStudent.full_name}</p>
                        <p className="text-indigo-200 text-sm">Mã HS: {selectedStudent.student_code} · Lớp {selectedStudent.class_name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-indigo-200 text-xs">Quan hệ</p>
                        <p className="font-semibold capitalize">{selectedStudent.relationship || 'Phụ huynh'}</p>
                    </div>
                </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    loading={loadingData}
                    icon={BookOpen}
                    iconBg="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    value={summary ? (summary.current_term_average || 'N/A') : '—'}
                    label="Điểm trung bình"
                    sub={summary?.comparison_summary?.performance === 'above_average' ? '↑ Trên TB lớp' : summary ? '↓ Dưới TB lớp' : null}
                />
                <KpiCard
                    loading={loadingData}
                    icon={Calendar}
                    iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    value={summary ? `${summary.attendance_rate}%` : '—'}
                    label="Chuyên cần"
                    sub={attendance ? `${attendance.present_days}/${attendance.total_days} buổi có mặt` : null}
                />
                <KpiCard
                    loading={loadingData}
                    icon={AlertTriangle}
                    iconBg={alerts.length > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}
                    value={loadingData ? '—' : alerts.length}
                    label="Cảnh báo"
                    sub={alerts.length === 0 && !loadingData ? 'Không có vấn đề' : null}
                />
                <KpiCard
                    loading={loadingData}
                    icon={Users}
                    iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                    value={summary?.comparison_summary ? (
                        summary.comparison_summary.performance === 'above_average' ? 'Trên TB' : 'Dưới TB'
                    ) : '—'}
                    label="Xếp loại so lớp"
                    sub={summary?.comparison_summary ? `TB lớp: ${summary.comparison_summary.class_avg}` : null}
                />
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Line chart — grade trend */}
                {/* Line chart — grade trend */}
                <div className="lg:col-span-2">
                    <GradeTrendByTermChart grades={grades} loading={loadingData} />
                </div>

                {/* Pie chart — attendance */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar size={18} className="text-emerald-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Tỷ lệ chuyên cần</h3>
                    </div>
                    {loadingData ? (
                        <ChartSkeleton height={220} />
                    ) : pieData.length === 0 ? (
                        <EmptyState icon={Calendar} title="Chưa có dữ liệu" />
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v, n) => [v + ' buổi', n]}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: 'none',
                                            fontSize: 12,
                                            backgroundColor: tooltipBg,
                                            color: tooltipColor
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-2">
                                {pieData.map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PIE_COLORS[i] }} />
                                            <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                                        </div>
                                        <span className="font-semibold text-slate-800 dark:text-white">{d.value} buổi</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Bar chart — per subject ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={18} className="text-blue-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Điểm trung bình theo môn học</h3>
                </div>
                {loadingData ? (
                    <ChartSkeleton height={200} />
                ) : subjectChartData.length === 0 ? (
                    <EmptyState icon={BookOpen} title="Chưa có dữ liệu điểm" />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={subjectChartData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: axisColor }}
                                angle={-20}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: axisColor }} />
                            <Tooltip
                                formatter={(v) => [v, 'Điểm TB']}
                                contentStyle={{
                                    fontSize: 12,
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: tooltipBg,
                                    color: tooltipColor
                                }}
                            />
                            <Bar dataKey="avg" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                {subjectChartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.avg < 5 ? '#ef4444' : entry.avg < 6.5 ? '#f59e0b' : '#6366f1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )
                }
            </div >

            {/* ── Alerts + Timeline row ── */}
            < div className="grid grid-cols-1 lg:grid-cols-2 gap-4" >
                {/* Smart Alerts */}
                < div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm" >
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={18} className="text-amber-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Cảnh báo thông minh</h3>
                        {!loadingData && <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${alerts.length > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>{alerts.length}</span>}
                    </div>
                    {
                        loadingData ? (
                            <div className="space-y-3">
                                {[0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)}
                            </div>
                        ) : alerts.length === 0 ? (
                            <EmptyState icon={AlertTriangle} title="Không có cảnh báo" desc="Học sinh đang học tốt! Không có vấn đề cần chú ý." />
                        ) : (
                            <div className="space-y-2.5">
                                {alerts.map((a, i) => (
                                    <div key={i} className={`p-3 rounded-xl border text-sm ${severityStyles[a.severity] || severityStyles.medium}`}>
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                            <span>{a.message}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div >

                {/* Teacher Notes Timeline */}
                < div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm" >
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare size={18} className="text-blue-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Nhận xét từ giáo viên</h3>
                    </div>
                    {
                        loadingData ? (
                            <div className="space-y-4">
                                {[0, 1].map(i => <Skeleton key={i} className="h-16" />)}
                            </div>
                        ) : notes.length === 0 ? (
                            <EmptyState icon={MessageSquare} title="Chưa có nhận xét" desc="Giáo viên chưa thêm nhận xét nào cho học sinh này." />
                        ) : (
                            <div className="relative pl-5 space-y-4">
                                {/* timeline line */}
                                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700" />
                                {notes.map((n, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900" />
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                    {n.subject_name}
                                                </span>
                                                {n.quick_tag && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                        {n.quick_tag}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                {n.comment_text || 'Chưa có nội dung cụ thể'}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                                {n.teacher_name} · {n.semester} · {formatDate(n.updated_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div >
            </div >
        </div >
    );
}
