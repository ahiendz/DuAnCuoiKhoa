const { pool } = require("../config/db");

async function getNotesByTeacherUser(userId) {
    // Find teacher_id from user_id
    const teacherRes = await pool.query("SELECT id FROM teachers WHERE user_id = $1", [userId]);
    if (!teacherRes.rows.length) return [];
    const teacherId = teacherRes.rows[0].id;

    // Get notes for all classes assigned to this teacher
    // We join with class_subject_teachers to verify ownership and get class info if needed?
    // Frontend currently organizes by class_subject_teacher_id (key)
    const query = `
    SELECT tn.id, tn.class_subject_teacher_id, tn.content as text, 
           to_char(tn.created_at, 'DD/MM/YYYY') as date,
           tn.created_at
    FROM teacher_notes tn
    JOIN class_subject_teachers cst ON tn.class_subject_teacher_id = cst.id
    WHERE cst.teacher_id = $1
    ORDER BY tn.created_at DESC
  `;
    const { rows } = await pool.query(query, [teacherId]);
    return rows;
}

async function createNote(userId, { class_subject_teacher_id, content }) {
    const teacherRes = await pool.query("SELECT id FROM teachers WHERE user_id = $1", [userId]);
    if (!teacherRes.rows.length) throw new Error("Teacher not found");
    const teacherId = teacherRes.rows[0].id;

    // Verify ownership
    const check = await pool.query(
        "SELECT id FROM class_subject_teachers WHERE id = $1 AND teacher_id = $2",
        [class_subject_teacher_id, teacherId]
    );
    if (!check.rows.length) throw new Error("Unauthorized assignment access");

    const query = `
    INSERT INTO teacher_notes (class_subject_teacher_id, content) 
    VALUES ($1, $2) 
    RETURNING id, class_subject_teacher_id, content as text, to_char(created_at, 'DD/MM/YYYY') as date
  `;
    const { rows } = await pool.query(query, [class_subject_teacher_id, content]);
    return rows[0];
}

async function deleteNote(userId, noteId) {
    const teacherRes = await pool.query("SELECT id FROM teachers WHERE user_id = $1", [userId]);
    if (!teacherRes.rows.length) throw new Error("Teacher not found");
    const teacherId = teacherRes.rows[0].id;

    // Verify ownership via join
    const check = await pool.query(`
    SELECT tn.id 
    FROM teacher_notes tn
    JOIN class_subject_teachers cst ON tn.class_subject_teacher_id = cst.id
    WHERE tn.id = $1 AND cst.teacher_id = $2
  `, [noteId, teacherId]);

    if (!check.rows.length) throw new Error("Note not found or unauthorized");

    await pool.query("DELETE FROM teacher_notes WHERE id = $1", [noteId]);
    return { success: true };
}

module.exports = {
    getNotesByTeacherUser,
    createNote,
    deleteNote
};
