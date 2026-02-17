const noteService = require("../services/noteService");

async function listNotes(req, res) {
    try {
        const notes = await noteService.getNotesByTeacherUser(req.user.id);
        res.json({ status: "success", notes });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
}

async function createNote(req, res) {
    try {
        const { class_subject_teacher_id, content } = req.body;
        if (!class_subject_teacher_id || !content) {
            return res.status(400).json({ status: "error", message: "Missing fields" });
        }
        const note = await noteService.createNote(req.user.id, { class_subject_teacher_id, content });
        res.json({ status: "success", note });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
}

async function deleteNote(req, res) {
    try {
        await noteService.deleteNote(req.user.id, req.params.id);
        res.json({ status: "success" });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
}

module.exports = {
    listNotes,
    createNote,
    deleteNote
};
