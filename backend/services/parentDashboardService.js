const { pool } = require("../config/db");
const parentService = require("./parentService");

/**
 * Parent Dashboard Service
 * Provides analytics and data for parent dashboard.
 *
 * DB Schema notes:
 *   grades: id, student_id, class_subject_teacher_id, semester, academic_year,
 *           mieng_1, mieng_2, phut15_1, phut15_2, tiet1_1, tiet1_2, giuaki, cuoiki, average_semester
 *   class_subject_teachers: id, class_id, subject (enum), teacher_id
 *   attendance: id, student_id, date, status (enum: present|absent|late), class_id
 */

/**
 * Gets grade analytics for a student (with ownership validation)
 *
 * Weighted average formula per the spec:
 *   mieng × 1, phut15 × 1, tiet1 × 2, giuaki × 3, cuoiki × 4
 *   (matching the Vietnamese gradebook weighting standard)
 *
 * @param {number} student_id
 * @param {number} parent_user_id
 */
async function getGradeAnalytics(student_id, parent_user_id) {
  const hasAccess = await parentService.validateParentOwnership(parent_user_id, student_id);
  if (!hasAccess) {
    throw new Error("Không có quyền truy cập dữ liệu học sinh này");
  }

  try {
    // Grades by semester + subject using actual schema
    const bySubjectQuery = `
            SELECT
                g.semester,
                g.academic_year,
                cst.subject AS subject_name,
                g.mieng_1, g.mieng_2,
                g.phut15_1, g.phut15_2,
                g.tiet1_1, g.tiet1_2,
                g.giuaki, g.cuoiki,
                g.average_semester,
                s.full_name AS student_name,
                -- Reconstruct weighted average from raw columns
                ROUND(
                    (
                        COALESCE(g.mieng_1, 0) * 1 +
                        COALESCE(g.mieng_2, 0) * 1 +
                        COALESCE(g.phut15_1, 0) * 1 +
                        COALESCE(g.phut15_2, 0) * 1 +
                        COALESCE(g.tiet1_1, 0) * 2 +
                        COALESCE(g.tiet1_2, 0) * 2 +
                        COALESCE(g.giuaki, 0) * 3 +
                        COALESCE(g.cuoiki, 0) * 4
                    ) / NULLIF(
                        (CASE WHEN g.mieng_1 IS NOT NULL THEN 1 ELSE 0 END) +
                        (CASE WHEN g.mieng_2 IS NOT NULL THEN 1 ELSE 0 END) +
                        (CASE WHEN g.phut15_1 IS NOT NULL THEN 1 ELSE 0 END) +
                        (CASE WHEN g.phut15_2 IS NOT NULL THEN 1 ELSE 0 END) +
                        (CASE WHEN g.tiet1_1 IS NOT NULL THEN 2 ELSE 0 END) +
                        (CASE WHEN g.tiet1_2 IS NOT NULL THEN 2 ELSE 0 END) +
                        (CASE WHEN g.giuaki IS NOT NULL THEN 3 ELSE 0 END) +
                        (CASE WHEN g.cuoiki IS NOT NULL THEN 4 ELSE 0 END),
                    0)
                , 2) AS weighted_average
            FROM grades g
            JOIN class_subject_teachers cst ON cst.id = g.class_subject_teacher_id
            JOIN students s ON s.id = g.student_id
            WHERE g.student_id = $1
            ORDER BY g.academic_year, g.semester, cst.subject
        `;
    const bySubjectResult = await pool.query(bySubjectQuery, [student_id]);

    // Overall average (mean of semester averages where data exists)
    const overallQuery = `
            SELECT ROUND(AVG(average_semester), 2) AS overall_average
            FROM grades
            WHERE student_id = $1 AND average_semester IS NOT NULL
        `;
    const overallResult = await pool.query(overallQuery, [student_id]);

    return {
      by_term_and_subject: bySubjectResult.rows,
      overall_average: parseFloat(overallResult.rows[0]?.overall_average) || 0
    };
  } catch (error) {
    console.error("Error in getGradeAnalytics:", error);
    throw new Error("Không thể lấy dữ liệu điểm");
  }
}

/**
 * Gets attendance analytics for a student
 *
 * @param {number} student_id
 * @param {number} parent_user_id
 */
async function getAttendanceAnalytics(student_id, parent_user_id) {
  const hasAccess = await parentService.validateParentOwnership(parent_user_id, student_id);
  if (!hasAccess) {
    throw new Error("Không có quyền truy cập dữ liệu học sinh này");
  }

  try {
    const query = `
            SELECT
                COUNT(*) AS total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_days,
                SUM(CASE WHEN status = 'absent'  THEN 1 ELSE 0 END) AS absent_days,
                SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) AS late_days,
                ROUND(
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0 /
                    NULLIF(COUNT(*), 0)
                , 2) AS attendance_rate
            FROM attendance
            WHERE student_id = $1
        `;
    const result = await pool.query(query, [student_id]);
    const stats = result.rows[0];

    return {
      total_days: parseInt(stats.total_days) || 0,
      present_days: parseInt(stats.present_days) || 0,
      absent_days: parseInt(stats.absent_days) || 0,
      late_days: parseInt(stats.late_days) || 0,
      attendance_rate: parseFloat(stats.attendance_rate) || 0,
    };

    // Get detailed attendance history
    const detailsQuery = `
      SELECT date, status, notes
      FROM attendance
      WHERE student_id = $1
      ORDER BY date DESC
      LIMIT 50
    `;
    const detailsResult = await pool.query(detailsQuery, [student_id]);

    return {
      ...analytics,
      has_alert: analytics.attendance_rate < 90,
      details: detailsResult.rows
    };
  } catch (error) {
    console.error("Error in getAttendanceAnalytics:", error);
    throw new Error("Không thể lấy dữ liệu điểm danh");
  }
}

/**
 * Gets smart alerts for a student — dynamically computed, no DB table used.
 * Alerts triggered by:
 *   - Semester average drop >= 1.0 vs previous semester
 *   - Any subject average_semester < 5
 *   - Overall attendance rate < 90%
 *
 * @param {number} student_id
 * @param {number} parent_user_id
 */
async function getSmartAlerts(student_id, parent_user_id) {
  const hasAccess = await parentService.validateParentOwnership(parent_user_id, student_id);
  if (!hasAccess) {
    throw new Error("Không có quyền truy cập dữ liệu học sinh này");
  }

  const alerts = [];

  try {
    // 1. Check semester average drop >= 1.0
    const semDropQuery = `
            WITH sem_avgs AS (
                SELECT
                    semester,
                    academic_year,
                    ROUND(AVG(average_semester), 2) AS avg,
                    ROW_NUMBER() OVER (ORDER BY academic_year, semester) AS rn
                FROM grades
                WHERE student_id = $1 AND average_semester IS NOT NULL
                GROUP BY semester, academic_year
            ),
            diffs AS (
                SELECT
                    s.semester,
                    s.academic_year,
                    s.avg,
                    p.avg AS prev_avg,
                    s.avg - p.avg AS diff
                FROM sem_avgs s
                LEFT JOIN sem_avgs p ON p.rn = s.rn - 1
            )
            SELECT * FROM diffs
            WHERE diff IS NOT NULL AND diff <= -1.0
            ORDER BY academic_year DESC, semester DESC
            LIMIT 1
        `;
    const semDropResult = await pool.query(semDropQuery, [student_id]);
    if (semDropResult.rows.length > 0) {
      const drop = semDropResult.rows[0];
      alerts.push({
        type: "warning",
        category: "academic",
        message: `Điểm TB học kỳ ${drop.semester} năm ${drop.academic_year} giảm ${Math.abs(drop.diff).toFixed(2)} điểm so với kỳ trước`,
        severity: "high"
      });
    }

    // 2. Check any subject semester average < 5
    const lowSubjectQuery = `
            SELECT
                cst.subject AS subject_name,
                g.semester,
                g.academic_year,
                g.average_semester
            FROM grades g
            JOIN class_subject_teachers cst ON cst.id = g.class_subject_teacher_id
            WHERE g.student_id = $1
              AND g.average_semester IS NOT NULL
              AND g.average_semester < 5
            ORDER BY g.average_semester
        `;
    const lowSubjectResult = await pool.query(lowSubjectQuery, [student_id]);
    lowSubjectResult.rows.forEach(row => {
      alerts.push({
        type: "danger",
        category: "academic",
        message: `Điểm TB môn ${row.subject_name} (HK ${row.semester}/${row.academic_year}) ở mức yếu (${row.average_semester})`,
        severity: "critical"
      });
    });

    // 3. Check attendance < 90%
    const attendance = await getAttendanceAnalytics(student_id, parent_user_id);
    if (attendance.attendance_rate < 90 && attendance.total_days > 0) {
      alerts.push({
        type: "warning",
        category: "attendance",
        message: `Tỷ lệ chuyên cần thấp (${attendance.attendance_rate}%). Cần cải thiện`,
        severity: "medium"
      });
    }

    return alerts;
  } catch (error) {
    console.error("Error in getSmartAlerts:", error);
    throw new Error("Không thể tạo cảnh báo");
  }
}

/**
 * Gets anonymous class comparison
 *
 * @param {number} student_id
 * @param {number} parent_user_id
 */
async function getClassComparison(student_id, parent_user_id) {
  const hasAccess = await parentService.validateParentOwnership(parent_user_id, student_id);
  if (!hasAccess) {
    throw new Error("Không có quyền truy cập dữ liệu học sinh này");
  }

  try {
    // Get student's class and name
    const studentQuery = `
            SELECT class_id, full_name FROM students WHERE id = $1
        `;
    const studentResult = await pool.query(studentQuery, [student_id]);
    if (studentResult.rows.length === 0) throw new Error("Không tìm thấy học sinh");

    const { class_id, full_name: student_name } = studentResult.rows[0];

    // Student's average (mean of semester averages)
    const studentAvgQuery = `
            SELECT ROUND(AVG(average_semester), 2) AS student_avg
            FROM grades
            WHERE student_id = $1 AND average_semester IS NOT NULL
        `;
    const studentAvgResult = await pool.query(studentAvgQuery, [student_id]);
    const student_avg = parseFloat(studentAvgResult.rows[0]?.student_avg) || 0;

    // Class average — join through class_subject_teachers for same class, exclude this student
    const classAvgQuery = `
            SELECT ROUND(AVG(g.average_semester), 2) AS class_avg
            FROM grades g
            JOIN class_subject_teachers cst ON cst.id = g.class_subject_teacher_id
            WHERE cst.class_id = $1
              AND g.student_id != $2
              AND g.average_semester IS NOT NULL
        `;
    const classAvgResult = await pool.query(classAvgQuery, [class_id, student_id]);
    const class_avg = parseFloat(classAvgResult.rows[0]?.class_avg) || 0;

    return {
      student_name,
      student_avg,
      class_avg,
      difference: parseFloat((student_avg - class_avg).toFixed(2)),
      performance: student_avg >= class_avg ? "above_average" : "below_average"
    };
  } catch (error) {
    console.error("Error in getClassComparison:", error);
    throw new Error("Không thể so sánh với lớp");
  }
}

/**
 * Gets full dashboard summary for a student — single endpoint for the dashboard page.
 * Includes: KPI averages, attendance breakdown, full alerts[], full class comparison, grade breakdown.
 *
 * @param {number} student_id
 * @param {number} parent_user_id
 */
async function getDashboardSummary(student_id, parent_user_id) {
  const hasAccess = await parentService.validateParentOwnership(parent_user_id, student_id);
  if (!hasAccess) {
    throw new Error("Không có quyền truy cập dữ liệu học sinh này");
  }

  try {
    const [grades, attendance, alerts, comparison] = await Promise.all([
      getGradeAnalytics(student_id, parent_user_id),
      getAttendanceAnalytics(student_id, parent_user_id),
      getSmartAlerts(student_id, parent_user_id),
      getClassComparison(student_id, parent_user_id)
    ]);

    let risk_level = "low";
    const criticalAlerts = alerts.filter(a => a.severity === "critical");
    const highAlerts = alerts.filter(a => a.severity === "high");

    if (criticalAlerts.length > 0 || attendance.attendance_rate < 80) {
      risk_level = "high";
    } else if (highAlerts.length > 0 || attendance.attendance_rate < 90) {
      risk_level = "medium";
    }

    return {
      // KPI summary
      current_term_average: grades.overall_average,
      attendance_rate: attendance.attendance_rate,
      risk_level,

      // Attendance breakdown
      attendance_detail: {
        total_days: attendance.total_days,
        present_days: attendance.present_days,
        absent_days: attendance.absent_days,
        late_days: attendance.late_days,
        has_alert: attendance.has_alert
      },

      // Full alerts array — used by alerts panel
      alerts,
      alert_count: alerts.length,

      // Full class comparison — used by comparison chart
      class_comparison: {
        student_name: comparison.student_name,
        student_avg: comparison.student_avg,
        class_avg: comparison.class_avg,
        difference: comparison.difference,
        performance: comparison.performance
      },

      // Grade breakdown by semester + subject
      grade_summary: {
        overall_average: grades.overall_average,
        by_term_and_subject: grades.by_term_and_subject
      }
    };
  } catch (error) {
    console.error("Error in getDashboardSummary:", error);
    throw new Error("Không thể lấy dữ liệu tổng quan");
  }
}

/**
 * Gets teacher notes/comments for a student (if the column exists)
 *
 * @param {number} student_id
 * @param {number} parent_user_id
 */
async function getTeacherNotes(student_id, parent_user_id) {
  const hasAccess = await parentService.validateParentOwnership(parent_user_id, student_id);
  if (!hasAccess) {
    throw new Error("Không có quyền truy cập dữ liệu học sinh này");
  }

  try {
    const query = `
            SELECT
                g.semester,
                g.academic_year,
                g.quick_tag,
                g.comment_text,
                cst.subject AS subject_name,
                g.updated_at,
                u.name AS teacher_name
            FROM grades g
            JOIN class_subject_teachers cst ON cst.id = g.class_subject_teacher_id
            JOIN users u ON u.id = cst.teacher_id
            WHERE g.student_id = $1
              AND (g.comment_text IS NOT NULL OR g.quick_tag IS NOT NULL)
            ORDER BY g.updated_at DESC
        `;
    const result = await pool.query(query, [student_id]);
    return result.rows;
  } catch (error) {
    console.error("Error in getTeacherNotes:", error);
    throw new Error("Không thể lấy nhận xét giáo viên");
  }
}

module.exports = {
  getGradeAnalytics,
  getAttendanceAnalytics,
  getSmartAlerts,
  getClassComparison,
  getDashboardSummary,
  getTeacherNotes
};
