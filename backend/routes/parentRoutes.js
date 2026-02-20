const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole, requireParentOwnership } = require("../middleware/authMiddleware");
const parentController = require("../controllers/parentController");

// ──────────────────────────────────────────────────────────────────────────────
// Middleware stack shared by all student-scoped routes:
//   1. authenticateToken  — verify JWT
//   2. requireRole('parent')  — ensure caller is a parent
//   3. requireParentOwnership()  — ensure student belongs to this parent
// ──────────────────────────────────────────────────────────────────────────────
const parentOnly = [authenticateToken, requireRole("parent")];
const parentWithOwnership = [...parentOnly, requireParentOwnership("studentId")];

/**
 * GET /api/parent/students
 * List all students linked to the authenticated parent.
 */
router.get("/students", parentOnly, parentController.getStudents);

/**
 * GET /api/parent/dashboard/:studentId
 * Full dashboard summary: grades + attendance + alerts + class comparison.
 */
router.get("/dashboard/:studentId", parentWithOwnership, parentController.getDashboard);

/**
 * GET /api/parent/grades/:studentId
 * Weighted grade analytics by term and subject.
 */
router.get("/grades/:studentId", parentWithOwnership, parentController.getGrades);

/**
 * GET /api/parent/attendance/:studentId
 * Attendance statistics (present / absent / late / rate).
 */
router.get("/attendance/:studentId", parentWithOwnership, parentController.getAttendance);

/**
 * GET /api/parent/alerts/:studentId
 * Smart alerts computed from live data (no DB table).
 */
router.get("/alerts/:studentId", parentWithOwnership, parentController.getAlerts);

/**
 * GET /api/parent/comparison/:studentId
 * Anonymous class comparison: student avg vs class avg.
 */
router.get("/comparison/:studentId", parentWithOwnership, parentController.getComparison);

/**
 * GET /api/parent/notes/:studentId
 * Teacher notes and quick tags from gradebook.
 */
router.get("/notes/:studentId", parentWithOwnership, parentController.getNotes);

module.exports = router;
