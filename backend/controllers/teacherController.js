const teacherGradeService = require("../services/teacherGradeService");

async function getAssignments(req, res) {
  try {
    const userId = req.query.user_id || null;
    const assignments = await teacherGradeService.listTeacherAssignments(userId);
    return res.json({
      status: "success",
      assignments
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: error.message
    });
  }
}

async function getGrades(req, res) {
  try {
    const payload = await teacherGradeService.listGrades({
      classSubjectTeacherId: req.query.class_subject_teacher_id,
      semester: req.query.semester,
      academicYear: req.query.academic_year
    });
    return res.json({
      status: "success",
      ...payload
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: error.message
    });
  }
}

async function saveGrade(req, res) {
  try {
    const saved = await teacherGradeService.saveGrade(req.body || {});
    return res.json({
      status: "success",
      grade: saved
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: error.message
    });
  }
}

async function getDashboard(req, res) {
  try {
    const payload = await teacherGradeService.getDashboard({
      classSubjectTeacherId: req.query.class_subject_teacher_id,
      semester: req.query.semester,
      academicYear: req.query.academic_year
    });
    return res.json({
      status: "success",
      ...payload
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: error.message
    });
  }
}

async function importGrades(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu file CSV"
      });
    }

    const payload = await teacherGradeService.importGradesFromCsv({
      fileBuffer: req.file.buffer,
      classSubjectTeacherId: req.body.class_subject_teacher_id,
      semester: req.body.semester,
      academicYear: req.body.academic_year
    });

    return res.json({
      status: "success",
      ...payload
    });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: error.message
    });
  }
}

async function exportGrades(req, res) {
  try {
    const result = await teacherGradeService.exportGradesToCsv({
      classSubjectTeacherId: req.query.class_subject_teacher_id,
      semester: req.query.semester,
      academicYear: req.query.academic_year
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${result.fileName}`
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(`\uFEFF${result.content}`);
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: error.message
    });
  }
}

module.exports = {
  getAssignments,
  getGrades,
  saveGrade,
  getDashboard,
  importGrades,
  exportGrades
};
