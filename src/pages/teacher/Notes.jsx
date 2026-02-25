import { getAllNotes, createNote, deleteNote as apiDeleteNote } from '@/services/noteService';

export default function Notes() {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [selectedClass, setSelectedClass] = useState('all');
    const [newNote, setNewNote] = useState('');
    const [allNotes, setAllNotes] = useState({});

    // Load assignments
    useEffect(() => {
        if (!user) return;
        getAssignments(user.id).then(res => {
            setAssignments(res.assignments || []);
        }).catch(() => { });
    }, [user]);

    // Load notes from API
    useEffect(() => {
        if (!user) return;
        loadNotes();
    }, [user]);

    const loadNotes = () => {
        getAllNotes().then(notes => {
            const grouped = {};
            notes.forEach(n => {
                const key = n.class_subject_teacher_id;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(n);
            });
            setAllNotes(grouped);
        }).catch(console.error);
    };

    const addNote = () => {
        if (!newNote.trim() || !selectedClass) return;
        createNote({ class_subject_teacher_id: selectedClass, content: newNote })
            .then(() => {
                setNewNote('');
                loadNotes();
            })
            .catch(err => alert('Lỗi khi thêm ghi chú: ' + err.message));
    };

    const deleteNote = (classKey, noteId) => {
        if (!confirm('Bạn có chắc muốn xóa ghi chú này?')) return;
        apiDeleteNote(noteId)
            .then(() => loadNotes())
            .catch(err => alert('Lỗi khi xóa: ' + err.message));
    };

    // Get display notes based on filter
    const getDisplayNotes = () => {
        if (selectedClass === 'all') {
            const all = [];
            Object.entries(allNotes).forEach(([classKey, notes]) => {
                const assignment = assignments.find(a => String(a.id) === String(classKey));
                notes.forEach(n => all.push({ ...n, className: assignment ? `${assignment.class_name} - ${assignment.subject}` : classKey }));
            });
            return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return (allNotes[selectedClass] || []).map(n => {
            const assignment = assignments.find(a => String(a.id) === String(selectedClass));
            return { ...n, className: assignment ? `${assignment.class_name} - ${assignment.subject}` : selectedClass };
        });
    };

    const displayNotes = getDisplayNotes();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Ghi chú</h2>
                <p className="text-[var(--text-secondary)] text-sm">Ghi chú theo lớp</p>
            </div>

            {/* Class filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <select className="input-field w-auto min-w-[200px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    <option value="all">Tất cả lớp</option>
                    {assignments.map(a => (
                        <option key={a.id} value={a.id}>{a.class_name} - {a.subject}</option>
                    ))}
                </select>
            </div>

            {/* Add note */}
            {selectedClass !== 'all' && (
                <div className="flex gap-3">
                    <input className="input-field flex-1" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Thêm ghi chú cho lớp này..." onKeyDown={e => e.key === 'Enter' && addNote()} />
                    <button onClick={addNote} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Thêm</button>
                </div>
            )}
            {selectedClass === 'all' && (
                <p className="text-sm text-slate-400">Chọn một lớp cụ thể để thêm ghi chú mới.</p>
            )}

            {/* Notes list */}
            <div className="space-y-3">
                {displayNotes.map(n => (
                    <div key={n.id} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-4 flex items-start gap-3 shadow-sm">
                        <StickyNote size={18} className="text-yellow-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm text-[var(--text-primary)]">{n.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-medium">{n.className}</span>
                                <span className="text-xs text-slate-400">{n.date}</span>
                            </div>
                        </div>
                        <button onClick={() => deleteNote(selectedClass === 'all' ? Object.keys(allNotes).find(k => (allNotes[k] || []).some(note => note.id === n.id)) : selectedClass, n.id)}
                            className="p-1 rounded hover:bg-[var(--hover-bg)] text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                ))}
                {displayNotes.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Chưa có ghi chú nào</p>}
            </div>
        </div>
    );
}
