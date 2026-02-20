import React, { useMemo } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Transform raw API rows → chart-ready data.
 *
 * Input row shape (from /api/parent/grades/:studentId):
 *   { semester: 1|2, academic_year: string, subject_name: string, average_semester: number }
 *
 * Output shape:
 *   [{ subject: string, hk1: number|null, hk2: number|null, avg_trend: number, trend_delta: number }]
 */
function transformGradeData(rows) {
    if (!rows || rows.length === 0) return [];

    // Group by subject_name
    const bySubject = {};
    rows.forEach((row) => {
        const key = row.subject_name || 'Không rõ';
        if (!bySubject[key]) bySubject[key] = { hk1: null, hk2: null };
        const avg = row.average_semester !== null ? parseFloat(row.average_semester) : null;
        if (row.semester === 1 || row.semester === '1') {
            bySubject[key].hk1 = avg;
        } else if (row.semester === 2 || row.semester === '2') {
            bySubject[key].hk2 = avg;
        }
    });

    return Object.entries(bySubject).map(([subject, { hk1, hk2 }]) => {
        const avg_trend = hk2 !== null ? hk2 : hk1 !== null ? hk1 : 0;
        const trend_delta =
            hk1 !== null && hk2 !== null ? parseFloat((hk2 - hk1).toFixed(2)) : null;
        return { subject, hk1, hk2, avg_trend, trend_delta };
    });
}

/**
 * Shorten long subject names for the X-axis.
 * e.g. "Ngữ văn" → "Ngữ văn", "Giáo dục công dân" → "GDCD"
 */
const SUBJECT_ABBR = {
    'Giáo dục công dân': 'GDCD',
    'Giáo dục thể chất': 'GDTC',
    'Giáo dục quốc phòng': 'GDQP',
    'Tiếng Anh': 'Anh',
    'Tiếng Việt': 'Việt',
    'Công nghệ': 'CN',
    'Tin học': 'Tin',
};
const shortenSubject = (name) => SUBJECT_ABBR[name] || name;

// ─── Sub-components ──────────────────────────────────────────────────────────

const TrendBadge = ({ delta }) => {
    if (delta === null || delta === undefined) return null;
    if (delta > 0.05)
        return (
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '1rem' }} title={`+${delta}`}>
                ↑
            </span>
        );
    if (delta < -0.05)
        return (
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '1rem' }} title={`${delta}`}>
                ↓
            </span>
        );
    return (
        <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: '1rem' }} title="Không đổi">
            ↔
        </span>
    );
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const entry = payload[0]?.payload || {};
    return (
        <div
            style={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: '10px',
                padding: '10px 16px',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                minWidth: 160,
            }}
        >
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#a5b4fc' }}>{label}</p>
            {entry.hk1 !== null && entry.hk1 !== undefined && (
                <p style={{ margin: '2px 0' }}>
                    <span style={{ color: '#60a5fa' }}>■</span> HK1:{' '}
                    <strong>{entry.hk1?.toFixed(2)}</strong>
                </p>
            )}
            {entry.hk2 !== null && entry.hk2 !== undefined && (
                <p style={{ margin: '2px 0' }}>
                    <span style={{ color: '#a78bfa' }}>■</span> HK2:{' '}
                    <strong>{entry.hk2?.toFixed(2)}</strong>
                </p>
            )}
            {entry.trend_delta !== null && entry.trend_delta !== undefined && (
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Biến động: <TrendBadge delta={entry.trend_delta} />{' '}
                    {entry.trend_delta > 0 ? `+${entry.trend_delta}` : entry.trend_delta}
                </p>
            )}
        </div>
    );
};

// Loading skeleton
const ChartSkeleton = () => (
    <div style={{ padding: '0 8px' }}>
        <div
            style={{
                height: 24,
                width: '45%',
                borderRadius: 8,
                background: 'rgba(99,102,241,0.15)',
                marginBottom: 24,
                animation: 'pulse 1.5s ease-in-out infinite',
            }}
        />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 220 }}>
            {[80, 60, 90, 70, 55, 85].map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                    <div
                        style={{
                            flex: 1,
                            height: `${h}%`,
                            borderRadius: '6px 6px 0 0',
                            background: 'rgba(96,165,250,0.2)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                    />
                    <div
                        style={{
                            flex: 1,
                            height: `${h - 10}%`,
                            borderRadius: '6px 6px 0 0',
                            background: 'rgba(167,139,250,0.2)',
                            animation: 'pulse 1.8s ease-in-out infinite',
                        }}
                    />
                </div>
            ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
);

// Empty state
const EmptyState = () => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            color: '#64748b',
            gap: 12,
        }}
    >
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M8 17v-4M12 17V9M16 17v-7" />
        </svg>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#94a3b8' }}>
            Chưa có dữ liệu điểm...
        </p>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center', maxWidth: 240 }}>
            Dữ liệu điểm số sẽ xuất hiện sau khi giáo viên nhập điểm cho học kỳ.
        </p>
    </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * GradeTrendByTermChart
 *
 * Props:
 *   grades     - object from useParentDashboard: { by_term_and_subject: [], overall_average: number }
 *   loading    - boolean
 */
const GradeTrendByTermChart = ({ grades, loading }) => {
    const chartData = useMemo(() => {
        if (!grades?.by_term_and_subject) return [];
        return transformGradeData(grades.by_term_and_subject);
    }, [grades]);

    const hasData = chartData.length > 0;

    return (
        <div
            style={{
                background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.9) 100%)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    gap: 8,
                }}
            >
                <div>
                    <h6
                        style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: '#e2e8f0',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        📊 Xu hướng điểm theo học kỳ
                    </h6>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        So sánh HK1 vs HK2 — mũi tên chỉ xu hướng biến động
                    </p>
                </div>

                {/* Legend pills */}
                {!loading && hasData && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.75rem',
                                color: '#94a3b8',
                            }}
                        >
                            <span
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 3,
                                    background: '#60a5fa',
                                    display: 'inline-block',
                                }}
                            />
                            HK1
                        </span>
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.75rem',
                                color: '#94a3b8',
                            }}
                        >
                            <span
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 3,
                                    background: 'linear-gradient(to bottom, #7c3aed, #a78bfa)',
                                    display: 'inline-block',
                                }}
                            />
                            HK2
                        </span>
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.75rem',
                                color: '#94a3b8',
                            }}
                        >
                            <span
                                style={{
                                    width: 20,
                                    height: 2,
                                    background: '#f59e0b',
                                    display: 'inline-block',
                                    borderRadius: 2,
                                }}
                            />
                            Xu hướng
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <ChartSkeleton />
            ) : !hasData ? (
                <EmptyState />
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 8, right: 16, left: -12, bottom: 4 }}
                            barCategoryGap="25%"
                            barGap={4}
                        >
                            {/* Gradient definition for HK2 bars */}
                            <defs>
                                <linearGradient id="hk2Gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.85} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="4 4"
                                stroke="rgba(99,102,241,0.1)"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="subject"
                                tickFormatter={shortenSubject}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                axisLine={{ stroke: 'rgba(99,102,241,0.2)' }}
                                tickLine={false}
                            />

                            <YAxis
                                domain={[0, 10]}
                                ticks={[0, 2, 4, 6, 8, 10]}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />

                            {/* HK1 — soft blue bars */}
                            <Bar
                                dataKey="hk1"
                                name="HK1"
                                fill="#60a5fa"
                                radius={[5, 5, 0, 0]}
                                maxBarSize={36}
                            />

                            {/* HK2 — gradient purple bars */}
                            <Bar
                                dataKey="hk2"
                                name="HK2"
                                fill="url(#hk2Gradient)"
                                radius={[5, 5, 0, 0]}
                                maxBarSize={36}
                            />

                            {/* Trend line connecting HK1 → HK2 average path */}
                            <Line
                                dataKey="avg_trend"
                                name="Xu hướng"
                                type="monotone"
                                stroke="#f59e0b"
                                strokeWidth={2.5}
                                dot={{
                                    r: 4,
                                    fill: '#f59e0b',
                                    stroke: '#1e1b4b',
                                    strokeWidth: 2,
                                }}
                                activeDot={{ r: 6, fill: '#f59e0b' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>

                    {/* Trend indicator row */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 8,
                            marginTop: 16,
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        }}
                    >
                        {chartData.map((item) => (
                            <div
                                key={item.subject}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 2,
                                    background: 'rgba(99,102,241,0.08)',
                                    border: '1px solid rgba(99,102,241,0.15)',
                                    borderRadius: 10,
                                    padding: '6px 12px',
                                    minWidth: 60,
                                }}
                            >
                                <TrendBadge delta={item.trend_delta} />
                                <span
                                    style={{
                                        fontSize: '0.7rem',
                                        color: '#64748b',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 72,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    title={item.subject}
                                >
                                    {shortenSubject(item.subject)}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default GradeTrendByTermChart;
