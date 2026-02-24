import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useParentDashboard } from '@/hooks/useParentDashboard';
import GradeTrendByTermChart from './GradeTrendByTermChart';

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, accent }) => (
  <div
    style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.92) 100%)',
      border: `1px solid ${accent}33`,
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0,
    }}
  >
    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </span>
    <strong style={{ fontSize: '1.6rem', color: accent, lineHeight: 1.1 }}>{value}</strong>
    {sub && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sub}</span>}
  </div>
);

// ─── Alert badge ─────────────────────────────────────────────────────────────
const alertColor = { warning: '#f59e0b', danger: '#ef4444', info: '#60a5fa' };
const AlertRow = ({ alert }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 10,
      background: `${alertColor[alert.type] || '#64748b'}11`,
      border: `1px solid ${alertColor[alert.type] || '#64748b'}33`,
    }}
  >
    <span style={{ fontSize: '1rem', flexShrink: 0 }}>
      {alert.type === 'danger' ? '🔴' : alert.type === 'warning' ? '🟡' : 'ℹ️'}
    </span>
    <span style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>{alert.message}</span>
  </div>
);

// ─── Student selector ────────────────────────────────────────────────────────
const StudentSelector = ({ students, selectedStudentId, setSelectedStudentId }) => {
  if (students.length <= 1) return null;
  return (
    <div className="mb-4">
      <label style={{ display: 'block', color: '#94a3b8', marginBottom: 6, fontSize: '0.85rem' }}>
        Chọn học sinh:
      </label>
      <select
        className="form-select"
        style={{ background: 'rgba(15,23,42,0.9)', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10 }}
        value={selectedStudentId || ''}
        onChange={(e) => setSelectedStudentId(parseInt(e.target.value))}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name} ({s.student_code}) — Lớp {s.class_name}
          </option>
        ))}
      </select>
    </div>
  );
};

// ─── Student info card ────────────────────────────────────────────────────────
const StudentInfoCard = ({ student }) => {
  if (!student) return null;
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,27,75,0.9))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          flexShrink: 0,
          fontWeight: 700,
          color: '#fff',
        }}
      >
        {(student.full_name || '?')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>{student.full_name}</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
          Mã HS: <strong style={{ color: '#94a3b8' }}>{student.student_code}</strong>
          &nbsp;·&nbsp; Lớp: <strong style={{ color: '#94a3b8' }}>{student.class_name}</strong>
          {student.relationship && (
            <>&nbsp;·&nbsp; Quan hệ: <strong style={{ color: '#94a3b8' }}>{student.relationship}</strong></>
          )}
        </p>
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, children, style }) => (
  <div style={{ marginBottom: 24, ...style }}>
    <h6
      style={{
        margin: '0 0 12px',
        color: '#a5b4fc',
        fontWeight: 700,
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {title}
    </h6>
    {children}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const ParentDashboard = () => {
  const {
    students,
    selectedStudent,
    selectedStudentId,
    setSelectedStudentId,
    summary,
    grades,
    attendance,
    alerts,
    notes,
    loadingStudents,
    loadingData,
    error,
  } = useParentDashboard();

  // ── Global loading (first fetch) ──
  if (loadingStudents) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border" style={{ color: '#6366f1' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p style={{ color: '#64748b', marginTop: 12, fontSize: '0.85rem' }}>Đang tải danh sách học sinh...</p>
      </div>
    );
  }

  // ── Auth / link error ──
  if (error && students.length === 0) {
    return (
      <div className="container mt-4">
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            padding: '20px 24px',
            color: '#fca5a5',
          }}
        >
          ⚠️ {error}
        </div>
      </div>
    );
  }

  const perf = summary?.class_comparison;
  const attendDetail = summary?.attendance_detail;
  const riskColor =
    summary?.risk_level === 'high'
      ? '#ef4444'
      : summary?.risk_level === 'medium'
        ? '#f59e0b'
        : '#22c55e';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="container mt-4 pb-5">
        {/* Page title */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h4 style={{ margin: 0, fontWeight: 800, color: '#e2e8f0' }}>Dashboard Phụ Huynh</h4>
        </div>

        {/* Student selector */}
        <StudentSelector
          students={students}
          selectedStudentId={selectedStudentId}
          setSelectedStudentId={setSelectedStudentId}
        />

        {/* Student info */}
        <StudentInfoCard student={selectedStudent} />

        {/* ── KPI row ── */}
        <Section title="Tổng quan">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 16,
            }}
          >
            <KpiCard
              label="Điểm TB"
              value={
                loadingData
                  ? '...'
                  : summary?.current_term_average != null
                    ? summary.current_term_average
                    : '—'
              }
              sub="Trung bình các kỳ"
              accent={
                summary?.current_term_average >= 8
                  ? '#22c55e'
                  : summary?.current_term_average >= 6.5
                    ? '#f59e0b'
                    : '#ef4444'
              }
            />
            <KpiCard
              label="Chuyên cần"
              value={loadingData ? '...' : summary?.attendance_rate != null ? `${summary.attendance_rate}%` : '—'}
              sub={
                attendDetail
                  ? `${attendDetail.present_days} / ${attendDetail.total_days} ngày`
                  : 'Tỷ lệ có mặt'
              }
              accent={
                summary?.attendance_rate >= 90
                  ? '#22c55e'
                  : summary?.attendance_rate >= 80
                    ? '#f59e0b'
                    : '#ef4444'
              }
            />
            <KpiCard
              label="Mức rủi ro"
              value={
                loadingData
                  ? '...'
                  : summary?.risk_level === 'high'
                    ? 'Cao'
                    : summary?.risk_level === 'medium'
                      ? 'Trung bình'
                      : summary?.risk_level
                        ? 'Thấp'
                        : '—'
              }
              accent={riskColor}
            />
            <KpiCard
              label="Cảnh báo"
              value={loadingData ? '...' : summary?.alert_count ?? '—'}
              sub="Cảnh báo học tập"
              accent={summary?.alert_count > 0 ? '#f59e0b' : '#22c55e'}
            />
          </div>
        </Section>

        {/* ── So sánh với lớp ── */}
        {(loadingData || perf) && (
          <Section title="So sánh với lớp">
            <div
              style={{
                background: 'rgba(15,23,42,0.9)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 14,
                padding: '16px 20px',
                display: 'flex',
                gap: 24,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {loadingData ? (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Đang tải...</span>
              ) : perf ? (
                <>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 2 }}>Điểm TB học sinh</div>
                    <strong style={{ fontSize: '1.4rem', color: '#60a5fa' }}>{perf.student_avg}</strong>
                  </div>
                  <div style={{ fontSize: '1.4rem', color: '#334155' }}>vs</div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 2 }}>Điểm TB lớp</div>
                    <strong style={{ fontSize: '1.4rem', color: '#94a3b8' }}>{perf.class_avg}</strong>
                  </div>
                  <span
                    style={{
                      background: perf.performance === 'above_average' ? '#16a34a22' : '#dc262622',
                      border: `1px solid ${perf.performance === 'above_average' ? '#22c55e55' : '#ef444455'}`,
                      color: perf.performance === 'above_average' ? '#4ade80' : '#f87171',
                      borderRadius: 20,
                      padding: '5px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    {perf.performance === 'above_average' ? '↑ Trên trung bình' : '↓ Dưới trung bình'}
                  </span>
                </>
              ) : null}
            </div>
          </Section>
        )}

        {/* ── Grade Trend Chart ── */}
        <Section title="Xu hướng điểm theo học kỳ">
          <GradeTrendByTermChart grades={grades} loading={loadingData} />
        </Section>

        {/* ── Cảnh báo ── */}
        {(loadingData || (alerts && alerts.length > 0)) && (
          <Section title="Cảnh báo học tập">
            {loadingData ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '12px 0' }}>Đang tải...</div>
            ) : alerts.length === 0 ? (
              <div
                style={{
                  color: '#4ade80',
                  fontSize: '0.85rem',
                  padding: '12px 16px',
                  background: '#16a34a11',
                  borderRadius: 10,
                  border: '1px solid #22c55e22',
                }}
              >
                ✅ Không có cảnh báo nào. Học sinh đang tiến bộ tốt!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <AlertRow key={i} alert={a} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Nhận xét giáo viên ── */}
        {notes && notes.length > 0 && (
          <Section title="Nhận xét của giáo viên">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notes.map((note, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '0.82rem' }}>
                      {note.subject_name}
                    </span>
                    <span style={{ color: '#334155', fontSize: '0.75rem' }}>·</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      HK{note.semester} / {note.academic_year}
                    </span>
                    {note.quick_tag && (
                      <span
                        style={{
                          background: 'rgba(99,102,241,0.1)',
                          border: '1px solid rgba(99,102,241,0.25)',
                          color: '#a5b4fc',
                          borderRadius: 6,
                          padding: '1px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      >
                        {note.quick_tag}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', color: '#475569', fontSize: '0.7rem' }}>
                      GV: {note.teacher_name}
                    </span>
                  </div>
                  {note.comment_text && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {note.comment_text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </motion.div>
  );
};

export default ParentDashboard;
