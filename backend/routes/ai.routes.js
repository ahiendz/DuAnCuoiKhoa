const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { authenticateToken } = require("../middleware/authMiddleware");

// Post chat message to AI (requires authentication)
router.post("/chat", authenticateToken, aiController.handleChat.bind(aiController));

module.exports = router;
