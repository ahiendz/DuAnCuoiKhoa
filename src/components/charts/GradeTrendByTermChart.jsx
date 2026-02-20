import React, { useMemo } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';

/**
 * Transform raw API rows -> chart-ready data.
 * Limit to 4 main subjects.
 * Use weighted_average from backend.
 */
function transformGradeData(rows) {
    if (!rows || rows.length === 0) return [];

    const targetSubjects = ['Toán', 'Ngữ văn', 'Tiếng Việt', 'Văn', 'Tiếng Anh', 'Anh', 'Khoa học tự nhiên', 'KHTN'];

    const bySubject = {};
    rows.forEach((row) => {
        const key = row.subject_name || 'Không rõ';
        if (!targetSubjects.includes(key)) return;

        let normalizedKey = key;
        if (key === 'Ngữ văn' || key === 'Tiếng Việt') normalizedKey = 'Văn';
        if (key === 'Tiếng Anh') normalizedKey = 'Anh';
        if (key === 'Khoa học tự nhiên') normalizedKey = 'KHTN';

        if (!bySubject[normalizedKey]) bySubject[normalizedKey] = { hk1: null, hk2: null };

        // Dùng weighted_average theo đúng yêu cầu từ backend
        const avg = row.weighted_average !== null ? parseFloat(row.weighted_average) : null;
        const sem = String(row.semester).replace(/\D/g, '');
        if (sem === '1') {
            bySubject[normalizedKey].hk1 = avg;
        } else if (sem === '2') {
            bySubject[normalizedKey].hk2 = avg;
        }
    });

    const orderedKeys = ['Toán', 'Văn', 'Anh', 'KHTN'];

    return orderedKeys.reduce((acc, subject) => {
        if (bySubject[subject]) {
            const { hk1, hk2 } = bySubject[subject];
            // avg_trend used for the Line component if needed, but we use TrendLines for connecting bars
            const avg_trend = hk2 !== null ? hk2 : (hk1 !== null ? hk1 : 0);
            const trend_delta = (hk1 !== null && hk2 !== null) ? parseFloat((hk2 - hk1).toFixed(2)) : null;
            acc.push({ subject, hk1, hk2, avg_trend, trend_delta, trend_overlay: 1 });
        } else {
            acc.push({ subject, hk1: null, hk2: null, avg_trend: 0, trend_delta: null, trend_overlay: 1 });
        }
        return acc;
    }, []);
}

/**
 * Shorten long subject names for the X-axis.
 */
const shortenSubject = (name) => {
    const abbr = {
        'Tiếng Anh': 'Anh',
        'Tiếng Việt': 'Việt',
        'Khoa học tự nhiên': 'KHTN',
        'Lịch sử và Địa lí': 'LS&ĐL',
    };
    return abbr[name] || name;
};

// --- Sub-components ---

const TrendBadge = ({ delta }) => {
    if (delta === null || delta === undefined) return null;
    if (delta > 0.05)
        return (
            <span className="text-emerald-500 font-bold text-sm" title={`+${delta}`}>
                ↑
            </span>
        );
    if (delta < -0.05)
        return (
            <span className="text-red-500 font-bold text-sm" title={`${delta}`}>
                ↓
            </span>
        );
    return (
        <span className="text-slate-400 font-bold text-sm" title="Không đổi">
            ↔
        </span>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const entry = payload[0]?.payload || {};
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-2xl backdrop-blur-md min-w-[190px] transition-all">
            <p className="text-sm font-black mb-3 pb-2 border-b border-[var(--border-color)] text-[var(--text-primary)]">
                {label}
            </p>
            {entry.hk1 !== null && (
                <div className="flex justify-between items-center gap-6 my-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        HK1
                    </span>
                    <strong className="text-[var(--text-primary)] font-mono text-sm">{entry.hk1?.toFixed(2)}</strong>
                </div>
            )}
            {entry.hk2 !== null && (
                <div className="flex justify-between items-center gap-6 my-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        HK2
                    </span>
                    <strong className="text-[var(--text-primary)] font-mono text-sm">{entry.hk2?.toFixed(2)}</strong>
                </div>
            )}
            {entry.trend_delta !== null && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex flex-col gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${entry.trend_delta > 0 ? 'text-emerald-500' : entry.trend_delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {entry.trend_delta > 0 ? 'Chênh lệch: Tăng' : entry.trend_delta < 0 ? 'Chênh lệch: Giảm' : 'Chênh lệch: Ổn định'}
                    </span>
                    <div className="flex items-center gap-2">
                        <TrendBadge delta={entry.trend_delta} />
                        <span className={`text-sm font-bold ${entry.trend_delta > 0 ? 'text-emerald-500' : entry.trend_delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {entry.trend_delta > 0 ? `+${entry.trend_delta.toFixed(2)}` : entry.trend_delta.toFixed(2)} điểm
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};


/**
 * Custom shape to draw connecting lines between HK1 and HK2 bars
 */
const TrendLines = (props) => {
    const { formattedGraphicalItems } = props;
    if (!formattedGraphicalItems || formattedGraphicalItems.length < 2) return null;

    // Get coordinates for HK1 and HK2 bars
    const hk1Data = formattedGraphicalItems.find(item => item.props.dataKey === 'hk1');
    const hk2Data = formattedGraphicalItems.find(item => item.props.dataKey === 'hk2');

    const hk1Bars = hk1Data?.props?.data;
    const hk2Bars = hk2Data?.props?.data;

    if (!hk1Bars || !hk2Bars) return null;

    return (
        <svg overflow="visible">
            {hk1Bars.map((hk1Point, index) => {
                const hk2Point = hk2Bars[index];
                if (!hk1Point || !hk2Point) return null;

                const payload = hk1Point.payload || {};
                // Only draw if both semi-terms have data
                if (payload.hk1 === null || payload.hk2 === null) return null;

                const x1 = hk1Point.x + hk1Point.width / 2;
                const y1 = hk1Point.y;
                const x2 = hk2Point.x + hk2Point.width / 2;
                const y2 = hk2Point.y;

                return (
                    <g key={`trend-line-${index}`}>
                        <line
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="#f59e0b"
                            strokeWidth="2.5"
                            strokeDasharray="4 4"
                            style={{ filter: 'drop-shadow(0px 0px 2px rgba(245,158,11,0.4))' }}
                        />
                        <circle cx={x1} cy={y1} r={4} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
                        <circle cx={x2} cy={y2} r={4} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
                    </g>
                );
            })}
        </svg>
    );
};

// --- Main Component ---

const GradeTrendByTermChart = ({ grades, loading }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Theme-based colors
    const colors = {
        grid: isDark ? '#334155' : '#f1f5f9',
        axis: isDark ? '#94a3b8' : '#64748b',
        hk1: '#60a5fa',
        hk2: 'url(#hk2Gradient)',
        trend: '#f59e0b'
    };

    const chartData = useMemo(() => {
        if (!grades?.by_term_and_subject) return [];
        return transformGradeData(grades.by_term_and_subject);
    }, [grades]);

    const hasData = chartData.length > 0;

    return (
        <div className="card-panel p-5 h-full flex flex-col transition-all duration-300 hover:shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                    </svg>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                        Xu hướng điểm theo kỳ
                    </h3>
                </div>

                {hasData && (
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <span className="w-2.5 h-2.5 rounded bg-blue-400" /> HK1
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <span className="w-2.5 h-2.5 rounded bg-gradient-to-b from-purple-500 to-purple-400" /> HK2
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <span className="w-4 h-0.5 rounded bg-amber-500" /> Xu hướng
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-[300px] w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                        <div className="animate-pulse w-full h-full bg-slate-200 dark:bg-slate-700/50 rounded-xl" />
                    </div>
                ) : !hasData ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M8 17v-4M12 17V9M16 17v-7" />
                        </svg>
                        <p className="font-medium">Chưa có dữ liệu điểm</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
                            barCategoryGap="25%"
                            barGap={6}
                        >
                            <defs>
                                <linearGradient id="hk2Gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.9} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={colors.grid}
                                strokeOpacity={0.6}
                                vertical={false}
                            />

                            <XAxis
                                dataKey="subject"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: colors.axis, fontSize: 12, fontWeight: 500 }}
                                dy={10}
                            />

                            <YAxis
                                domain={[0, 10]}
                                ticks={[0, 2, 4, 6, 8, 10]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: colors.axis, fontSize: 11 }}
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.04)' }}
                            />

                            {/* HK1 Bar */}
                            <Bar
                                dataKey="hk1"
                                name="HK1"
                                fill={colors.hk1}
                                radius={[6, 6, 0, 0]}
                                maxBarSize={45}
                            />

                            {/* HK2 Bar */}
                            <Bar
                                dataKey="hk2"
                                name="HK2"
                                fill={colors.hk2}
                                radius={[6, 6, 0, 0]}
                                maxBarSize={45}
                            />

                            {/* Custom Overlay for connecting trend line */}
                            <Bar dataKey="trend_overlay" shape={(props) => <TrendLines {...props} />} isAnimationActive={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default GradeTrendByTermChart;
