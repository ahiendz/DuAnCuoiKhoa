import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAssignments, getDashboard } from '@/services/gradeService';
import { getAllNotes } from '@/services/noteService';
import { Users, BookOpen, ClipboardList, TrendingUp, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981'];

export default function TeacherDashboard() {
    const { user } = useAuth();

    // FILTERS
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [semester, setSemester] = useState('HK1');
    const [academicYear, setAcademicYear] = useState('2025-2026');

    // DATA
    const [dashboard, setDashboard] = useState(null);
    const [classNotes, setClassNotes] = useState([]); // Existing manual notes
    const [loading, setLoading] = useState(false); // Start false, set true when fetching
    const [error, setError] = useState(null);

    // 1. Initial Load: Assignments
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        setError(null);
        getAssignments(user.id)
            .then(res => {
                const list = res.assignments || [];
                setAssignments(list);
                if (list.length > 0) {
                    setSelectedAssignment(list[0].class_subject_teacher_id);
                }
            })
            .catch(err => {
                console.error('Assignments error:', err);
                setError('Không thể tải danh sách lớp. ' + (err.message || ''));
            })
            .finally(() => setLoading(false));
    }, [user]);

    // 2. Load Dashboard Data
    const loadDashboard = () => {
        if (!selectedAssignment) return;
        setLoading(true);
        setError(null);
        console.log('Fetching dashboard:', { selectedAssignment, semester, academicYear });

        // Parallel fetch: Dashboard + Notes
        Promise.all([
            getDashboard({
                class_subject_teacher_id: selectedAssignment,
                semester,
                academic_year: academicYear
            }),
            getAllNotes()
        ]).then(([dashRes, notesRes]) => {
            setDashboard(dashRes);

            // Filter manual notes for this class
            const filteredNotes = notesRes.filter(n => String(n.class_subject_teacher_id) === String(selectedAssignment));
            setClassNotes(filteredNotes);
        })
            .catch(err => {
                console.error('Dashboard Load Error:', err);
                setError('Lỗi tải dữ liệu Dashboard. ' + (err.message || ''));
            })
            .finally(() => setLoading(false));
    };

    // Auto-load when assignment changes (UX improvement)
    useEffect(() => {
        if (selectedAssignment) {
            loadDashboard();
        }
    }, [selectedAssignment]);

    // --- MEMOIZED DATA FOR CHARTS ---
    const scoreDistribution = useMemo(() => {
        if (!dashboard?.distribution) return [];
        return [
            { range: '0-4', count: dashboard.distribution['0-4'] || 0 },
            { range: '5-6', count: dashboard.distribution['5-6'] || 0 },
            { range: '7-8', count: dashboard.distribution['7-8'] || 0 },
            { range: '9-10', count: dashboard.distribution['9-10'] || 0 },
        ];
    }, [dashboard]);

    const semesterComparison = useMemo(() => {
        if (!dashboard?.comparison) return [];
        const hk1 = dashboard.comparison.HK1 || 0;
        const hk2 = dashboard.comparison.HK2 || 0;
        return [
            { name: 'Điểm TB', HK1: hk1, HK2: hk2 }
        ];
    }, [dashboard]);

    // --- DYNAMIC INSIGHTS ---
    const dynamicInsights = useMemo(() => {
        if (!dashboard) return [];
        const insights = [];

        // Avg Insight
        if (dashboard.class_average) {
            insights.push({
                type: 'info',
                text: `Lớp có trung bình môn: ${dashboard.class_average.toFixed(2)}`
            });
        }

        // Distribution Insight
        if (dashboard.distribution) {
            const dist = dashboard.distribution;
            const maxRange = Object.keys(dist).reduce((a, b) => dist[a] > dist[b] ? a : b);
            insights.push({
                type: 'trend',
                text: `Phổ điểm chiếm ưu thế: ${maxRange} (${dist[maxRange]} học sinh)`
            });
        }

        // Count Insight
        if (dashboard.graded_count) {
            insights.push({
                type: 'record',
                text: `Số bản ghi điểm đã nhập: ${dashboard.graded_count}`
            });
        }

        return insights;
    }, [dashboard]);


    if (!user) return <div className="p-10 text-center">Vui lòng đăng nhập.</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Lỗi tải dữ liệu: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {/* 1. FILTERS SECTION */}
            <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-default)] shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    {/* Class Selector */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Lớp - Môn phụ trách</label>
                        <select
                            className="input-field w-full md:w-64"
                            value={selectedAssignment}
                            onChange={e => setSelectedAssignment(e.target.value)}
                        >
                            {assignments.map(a => (
                                <option key={a.class_subject_teacher_id} value={a.class_subject_teacher_id}>{a.class_name} - {a.subject}</option>
                            ))}
                        </select>
                    </div>

                    {/* Semester */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Học kỳ phân tích</label>
                        <select
                            className="input-field w-full md:w-32"
                            value={semester}
                            onChange={e => setSemester(e.target.value)}
                        >
                            <option value="HK1">Học kỳ 1</option>
                            <option value="HK2">Học kỳ 2</option>
                        </select>
                    </div>

                    {/* Year */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Năm học</label>
                        <input
                            type="text"
                            className="input-field w-full md:w-32"
                            value={academicYear}
                            onChange={e => setAcademicYear(e.target.value)}
                            placeholder="YYYY-YYYY"
                        />
                    </div>
                </div>

                {/* Reload Button */}
                <button
                    onClick={loadDashboard}
                    disabled={loading || !selectedAssignment}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all h-[42px]"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Đang tải...' : 'Tải Dashboard'}
                </button>
            </div>

            {/* 2. SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={TrendingUp} color="text-indigo-500" bg="bg-indigo-500/10"
                    value={dashboard?.class_average?.toFixed(2) || '—'}
                    label="Trung bình lớp"
                />
                <SummaryCard
                    icon={Users} color="text-green-500" bg="bg-green-500/10"
                    value={dashboard?.total_students || 0}
                    label="Sĩ số lớp"
                />
                <SummaryCard
                    icon={ClipboardList} color="text-blue-500" bg="bg-blue-500/10"
                    value={dashboard?.graded_count || 0}
                    label="Bản ghi điểm"
                />
                <SummaryCard
                    icon={BookOpen} color="text-yellow-500" bg="bg-yellow-500/10"
                    value={dashboard?.subject || '—'}
                    label="Môn dạy"
                />
            </div>

            {/* 3. CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Distribution */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm min-h-[350px]">
                    <h3 className="font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-500" />
                        Phân bố điểm cuối kỳ
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={scoreDistribution}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Số lượng" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Right: Comparison */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm min-h-[350px]">
                    <h3 className="font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <Calendar size={18} className="text-cyan-500" />
                        So sánh TBHK1 và TBHK2
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={semesterComparison}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 10]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                            />
                            <Legend />
                            <Bar dataKey="HK1" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="HK2" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. NOTES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generated Insights */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm">
                    <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <AlertCircle size={18} className="text-orange-500" />
                        Ghi chú vận hành (Tự động)
                    </h3>
                    <div className="space-y-3">
                        {dynamicInsights.length === 0 ? (
                            <p className="text-slate-500 italic text-sm">Chưa có dữ liệu phân tích.</p>
                        ) : (
                            dynamicInsights.map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-[var(--hover-bg)] rounded-lg border border-[var(--border-subtle)]">
                                    <div className={`mt-1 w-2 h-2 rounded-full ${insight.type === 'trend' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                    <p className="text-sm text-[var(--text-primary)] font-medium">{insight.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Manual Notes */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm">
                    <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <ClipboardList size={18} className="text-slate-500" />
                        Ghi chú đã lưu
                    </h3>
                    {classNotes.length === 0 ? (
                        <p className="text-sm text-[var(--text-secondary)]">Chưa có ghi chú nào. Thêm tại trang "Ghi chú".</p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {classNotes.slice(0, 5).map((n, i) => (
                                <div key={i} className="p-3 rounded-lg bg-[var(--hover-bg)] text-sm border border-[var(--border-subtle)]">
                                    <p className="text-[var(--text-primary)] mb-1">{n.text}</p>
                                    <p className="text-[10px] text-slate-400">{n.date}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* DEBUG INFO */}
            <div className="mt-8 p-4 bg-slate-100  rounded border border-[var(--border-default)] text-xs font-mono text-slate-500">
                <p><strong>DEBUG INFO:</strong></p>
                <p>User ID: {user?.id} ({typeof user?.id})</p>
                <p>User Name: {user?.name}</p>
                <p>Assignments Loaded: {assignments.length}</p>
                <p>Selected Assignment: {selectedAssignment || 'None'}</p>
                <p>Dashboard Data: {dashboard ? 'Loaded' : 'Null'}</p>
                {loading && <p className="text-blue-500">Loading...</p>}
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, color, bg, value, label }) {
    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={color} size={24} />
                </div>
                <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                </div>
            </div>
        </div>
    );
}
