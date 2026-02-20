const parentService = require("../services/parentService");
const parentDashboardService = require("../services/parentDashboardService");

/**
 * Parent Controller
 * Handles request/response and input validation.
 * All business logic stays in parentService / parentDashboardService.
 */

/**
 * GET /api/parent/students
 * Returns the list of students linked to the authenticated parent.
 */
async function getStudents(req, res) {
    try {
        const students = await parentService.getParentStudents(req.user.id);
        return res.json({ ok: true, data: students });
    } catch (error) {
        console.error("[parentController] getStudents:", error);
        return res.status(400).json({ ok: false, error: { code: "FETCH_ERROR", message: error.message } });
    }
}

/**
 * GET /api/parent/dashboard/:studentId
 * Returns a full dashboard summary (grades + attendance + alerts + comparison).
 * Ownership already validated by requireParentOwnership middleware — no re-check needed.
 */
async function getDashboard(req, res) {
    try {
        // req.studentId injected by requireParentOwnership middleware
        const summary = await parentDashboardService.getDashboardSummary(req.studentId, req.user.id);
        return res.json({ ok: true, data: summary });
    } catch (error) {
        console.error("[parentController] getDashboard:", error);
        const status = _isForbidden(error) ? 403 : 500;
        return res.status(status).json({ ok: false, error: { code: "DASHBOARD_ERROR", message: error.message } });
    }
}

/**
 * GET /api/parent/grades/:studentId
 * Returns weighted grade analytics by term and subject.
 */
async function getGrades(req, res) {
    try {
        const grades = await parentDashboardService.getGradeAnalytics(req.studentId, req.user.id);
        return res.json({ ok: true, data: grades });
    } catch (error) {
        console.error("[parentController] getGrades:", error);
        const status = _isForbidden(error) ? 403 : 500;
        return res.status(status).json({ ok: false, error: { code: "GRADES_ERROR", message: error.message } });
    }
}

/**
 * GET /api/parent/attendance/:studentId
 * Returns attendance statistics (present/absent/late + rate).
 */
async function getAttendance(req, res) {
    try {
        const attendance = await parentDashboardService.getAttendanceAnalytics(req.studentId, req.user.id);
        return res.json({ ok: true, data: attendance });
    } catch (error) {
        console.error("[parentController] getAttendance:", error);
        const status = _isForbidden(error) ? 403 : 500;
        return res.status(status).json({ ok: false, error: { code: "ATTENDANCE_ERROR", message: error.message } });
    }
}

/**
 * GET /api/parent/alerts/:studentId
 * Returns computed smart alerts (no DB table — dynamically generated).
 */
async function getAlerts(req, res) {
    try {
        const alerts = await parentDashboardService.getSmartAlerts(req.studentId, req.user.id);
        return res.json({ ok: true, data: alerts });
    } catch (error) {
        console.error("[parentController] getAlerts:", error);
        const status = _isForbidden(error) ? 403 : 500;
        return res.status(status).json({ ok: false, error: { code: "ALERTS_ERROR", message: error.message } });
    }
}

/**
 * GET /api/parent/comparison/:studentId
 * Returns anonymous class comparison (student avg vs class avg).
 */
async function getComparison(req, res) {
    try {
        const comparison = await parentDashboardService.getClassComparison(req.studentId, req.user.id);
        return res.json({ ok: true, data: comparison });
    } catch (error) {
        console.error("[parentController] getComparison:", error);
        const status = _isForbidden(error) ? 403 : 500;
        return res.status(status).json({ ok: false, error: { code: "COMPARISON_ERROR", message: error.message } });
    }
}

/**
 * GET /api/parent/notes/:studentId
 * Returns teacher notes and quick tags from gradebook.
 */
async function getNotes(req, res) {
    try {
        const notes = await parentDashboardService.getTeacherNotes(req.studentId, req.user.id);
        return res.json({ ok: true, data: notes });
    } catch (error) {
        console.error("[parentController] getNotes:", error);
        const status = _isForbidden(error) ? 403 : 500;
        return res.status(status).json({ ok: false, error: { code: "NOTES_ERROR", message: error.message } });
    }
}

// ──────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────

function _isForbidden(error) {
    const msg = error && error.message ? error.message.toLowerCase() : "";
    return msg.includes("quyền") || msg.includes("không có quyền");
}

module.exports = {
    getStudents,
    getDashboard,
    getGrades,
    getAttendance,
    getAlerts,
    getComparison,
    getNotes
};
