import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getFaceAttendance, exportAttendanceDbCsv, getAttendanceAnalytics } from '@/services/attendanceService';
import { getClasses } from '@/services/classService';

export default function Attendance() {
    const [classes, setClasses] = useState([]);
    const [classFilter, setClassFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [faceData, setFaceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [analytics, setAnalytics] = useState({
        daily_trend: [],
        total_tracked_days: 0,
        lowest_class: null,
        highest_class: null,
        lowest_day: null,
        highest_day: null,
        overall_rate: 0
    });
    const [analyticsError, setAnalyticsError] = useState('');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        getClasses().then(setClasses).catch(() => { });
    }, []);

    const formatDate = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const loadData = async () => {
        setLoading(true);
        setAnalyticsError('');
        try {
            const params = {};
            if (dateFilter) params.date = dateFilter;
            if (classFilter) params.class_name = classFilter;
            const data = await getFaceAttendance(params);
            setFaceData(Array.isArray(data) ? data : []);
        } catch (err) {
            setAnalyticsError(err.response?.data?.error || 'Không tải được dữ liệu điểm danh');
            setFaceData([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [dateFilter, classFilter]);

    useEffect(() => {
        const loadAnalytics = async () => {
            setAnalyticsError('');
            try {
                const data = await getAttendanceAnalytics();
                console.log("Analytics Payload:", data);
                setAnalytics({
                    daily_trend: Array.isArray(data?.daily_trend) ? data.daily_trend : [],
                    total_tracked_days: Number(data?.total_tracked_days) || 0,
                    lowest_class: data?.lowest_class ?? null,
                    highest_class: data?.highest_class ?? null,
                    lowest_day: data?.lowest_day ?? null,
                    highest_day: data?.highest_day ?? null,
                    overall_rate: Number(data?.overall_rate) || 0
                });
            } catch (err) {
                setAnalyticsError(err.response?.data?.error || 'Không tải được phân tích điểm danh');
                setAnalytics({
                    daily_trend: [],
                    total_tracked_days: 0,
                    lowest_class: null,
                    highest_class: null,
                    lowest_day: null,
                    highest_day: null,
                    overall_rate: 0
                });
            }
        };

        loadAnalytics();
    }, []);

    const barData = [
        { label: 'Lớp thấp nhất', value: analytics.lowest_class?.rate ?? 0 },
        { label: 'Lớp cao nhất', value: analytics.highest_class?.rate ?? 0 },
        { label: 'Ngày thấp nhất', value: analytics.lowest_day?.rate ?? 0 },
        { label: 'Ngày cao nhất', value: analytics.highest_day?.rate ?? 0 }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Lịch sử điểm danh</h2>
                    <p className="text-[var(--text-secondary)] text-sm">Danh sách học sinh đã điểm danh</p>
                </div>
            </div>

            <div className="glass-card p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                    <p className="text-sm text-slate-400">Tổng quan chuyên cần</p>
                    <h3 className="text-xl font-semibold text-slate-50">{analytics.overall_rate != null ? `${analytics.overall_rate}%` : '0%'}</h3>
                    <p className="text-xs text-slate-400 mt-1">Dữ liệu ngày: {analytics.total_tracked_days || 0} ngày</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            try {
                                    setExporting(true);
                                    await exportAttendanceDbCsv();
                                } finally {
                                    setExporting(false);
                                }
                            }}
                            disabled={exporting}
                            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                        >
                            <Download size={16} /> {exporting ? 'Đang xuất...' : 'Export toàn bộ DB'}
                        </button>
                    </div>
                </div>

                {analyticsError && <div className="text-red-400 text-sm">{analyticsError}</div>}

                <div className="grid md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-slate-400 uppercase mb-1">Lớp thấp nhất</p>
                        <div className="text-lg font-semibold text-slate-50">
                            {analytics.lowest_class ? `${analytics.lowest_class.class_name} - ${analytics.lowest_class.rate ?? 0}%` : '—'}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-slate-400 uppercase mb-1">Lớp cao nhất</p>
                        <div className="text-lg font-semibold text-slate-50">
                            {analytics.highest_class ? `${analytics.highest_class.class_name} - ${analytics.highest_class.rate ?? 0}%` : '—'}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-slate-400 uppercase mb-1">Ngày thấp nhất</p>
                        <div className="text-lg font-semibold text-slate-50">
                            {analytics.lowest_day ? `${formatDate(analytics.lowest_day.date)} - ${analytics.lowest_day.rate ?? 0}%` : '—'}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-slate-400 uppercase mb-1">Ngày cao nhất</p>
                        <div className="text-lg font-semibold text-slate-50">
                            {analytics.highest_day ? `${formatDate(analytics.highest_day.date)} - ${analytics.highest_day.rate ?? 0}%` : '—'}
                        </div>
                    </div>
                </div>

                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="label" stroke="#94a3b8" />
                            <YAxis domain={[0, 100]} stroke="#94a3b8" tickFormatter={v => `${v}%`} />
                            <Tooltip formatter={(v) => [`${v}%`, 'Tỷ lệ']} />
                            <Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.daily_trend || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={(v) => formatDate(v).slice(0, 5)} />
                            <YAxis domain={[0, 100]} stroke="#94a3b8" tickFormatter={v => `${v}%`} />
                            <Tooltip formatter={(v, _name, props) => [`${v}%`, formatDate(props?.payload?.date)]} />
                            <Line type="monotone" dataKey="rate" stroke="#a78bfa" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className="input-field w-auto"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setDateFilter('')}
                        className="btn-secondary w-auto px-4"
                    >
                        Tất cả ngày
                    </button>
                </div>
                <select className="input-field w-auto min-w-[160px]" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                    <option value="">Tất cả lớp</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
            </div>

            {/* Data table */}
            {loading ? <div className="text-center py-10 text-slate-500">Đang tải...</div> : (
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[var(--hover-bg)] border-b border-[var(--border-default)]">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mã HS</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Học sinh</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lớp</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ngày</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Giờ</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Độ tin cậy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {faceData.map((r, i) => (
                                    <tr key={i} className="hover:bg-[var(--hover-bg)]/30">
                                        <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">{r.student_code}</td>
                                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{r.full_name}</td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">{r.class_name}</td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">{formatDate(r.date)}</td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">{r.time || '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-slate-200  rounded-full overflow-hidden">
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
                        <div className="bg-[var(--hover-bg)]/30 px-4 py-3 border-t border-[var(--border-default)]">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Tổng: <span className="font-semibold text-[var(--text-primary)]">{faceData.length}</span> lượt điểm danh
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
