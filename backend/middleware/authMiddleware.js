const jwt = require("jsonwebtoken");
const { validateParentOwnership } = require("../services/parentService");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123";

/**
 * Base middleware: verifies JWT and attaches req.user
 * Supports token via Authorization header or ?token= query param
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const queryToken = req.query.token;
    const token = (authHeader && authHeader.split(" ")[1]) || queryToken;

    if (!token) {
        return res.status(401).json({ ok: false, error: { code: "NO_TOKEN", message: "Access denied. No token provided." } });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ ok: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token." } });
        }
        req.user = user;
        next();
    });
}

/**
 * Middleware factory: restricts access to specific roles.
 * Must be used AFTER authenticateToken.
 *
 * @param {...string} roles - Allowed roles (e.g. 'parent', 'teacher', 'admin')
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get('/data', authenticateToken, requireRole('parent'), handler);
 */
function requireRole(...roles) {
    return function roleGuard(req, res, next) {
        if (!req.user) {
            return res.status(401).json({ ok: false, error: { code: "NO_USER", message: "Not authenticated." } });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                ok: false,
                error: {
                    code: "FORBIDDEN",
                    message: `Chỉ ${roles.join(", ")} mới có quyền truy cập.`
                }
            });
        }
        next();
    };
}

/**
 * Middleware factory: validates that the authenticated parent owns the student.
 * Reads student ID from req.params[paramName] (default: 'studentId').
 * Must be used AFTER authenticateToken + requireRole('parent').
 *
 * @param {string} [paramName='studentId'] - The route param name for student ID
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get('/grades/:studentId', authenticateToken, requireRole('parent'), requireParentOwnership(), handler);
 */
function requireParentOwnership(paramName = "studentId") {
    return async function ownershipGuard(req, res, next) {
        const studentId = parseInt(req.params[paramName]);
        if (!studentId || isNaN(studentId)) {
            return res.status(400).json({ ok: false, error: { code: "INVALID_ID", message: "Student ID không hợp lệ." } });
        }

        try {
            const hasAccess = await validateParentOwnership(req.user.id, studentId);
            if (!hasAccess) {
                return res.status(403).json({
                    ok: false,
                    error: { code: "FORBIDDEN", message: "Phụ huynh không có quyền xem dữ liệu học sinh này." }
                });
            }
            // Attach validated studentId for downstream use
            req.studentId = studentId;
            next();
        } catch (err) {
            console.error("[AUTH] requireParentOwnership error:", err);
            return res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Lỗi kiểm tra quyền truy cập." } });
        }
    };
}

module.exports = {
    authenticateToken,
    requireRole,
    requireParentOwnership
};
