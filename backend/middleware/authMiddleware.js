const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123";

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const queryToken = req.query.token;
    const token = (authHeader && authHeader.split(" ")[1]) || queryToken;

    console.log(`[AUTH-DEBUG] Path: ${req.path}, HeaderToken: ${!!authHeader}, QueryToken: ${!!queryToken}, ResultToken: ${!!token}`);

    if (!token) {
        console.log("[AUTH-DEBUG] No token provided for path:", req.path);
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log("[AUTH] Token verification failed:", err.message);
            return res.status(403).json({ error: "Invalid token." });
        }

        // Log decoded user for debugging
        console.log("[AUTH] User decoded:", user);

        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
