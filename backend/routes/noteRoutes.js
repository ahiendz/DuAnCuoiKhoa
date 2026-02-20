const express = require("express");
const noteController = require("../controllers/noteController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/", noteController.listNotes);
router.post("/", noteController.createNote);
router.delete("/:id", noteController.deleteNote);

module.exports = router;
