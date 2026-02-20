const express = require("express");
const multer = require("multer");
const teacherController = require("../controllers/teacherController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get("/class-subjects", teacherController.getAssignments);
router.get("/grades", teacherController.getGrades);
router.post("/grades", teacherController.saveGrade);
router.get("/dashboard", teacherController.getDashboard);
router.post("/import", upload.single("file"), teacherController.importGrades);
router.get("/export", teacherController.exportGrades);

module.exports = router;
