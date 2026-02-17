import React, { useEffect, useState } from 'react';
import { Plus, Search, Download, Pencil, Trash2 } from 'lucide-react';
import { getClasses, createClass, updateClass, deleteClass, exportClassesCsv, getSubjects } from '@/services/classService';
import { getTeachers } from '@/services/teacherService';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Classes() {
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', grade_level: '', homeroom_teacher_id: '', subject_teachers: {} });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [c, t, s] = await Promise.all([getClasses(), getTeachers(), getSubjects()]);
            setClasses(c);
            setTeachers(t);
            setSubjects(s.subjects || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', grade_level: '', homeroom_teacher_id: '', subject_teachers: {} });
        setError('');
        setModalOpen(true);
    };

    const openEdit = (cls) => {
        setEditing(cls);
        setForm({
            name: cls.name || '',
            grade_level: cls.grade_level || '',
            homeroom_teacher_id: cls.homeroom_teacher_id || '',
            subject_teachers: cls.subject_teachers || {}
        });
        setError('');
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            // Validate grade range
            if (form.grade_level && (form.grade_level < 6 || form.grade_level > 12)) {
                setError('Khối phải từ 6 đến 12');
                setSaving(false);
                return;
            }
            if (editing) await updateClass(editing.id, form);
            else await createClass(form);
            setModalOpen(false);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Lỗi');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        try {
            await deleteClass(deleteDialog.id);
            setDeleteDialog({ open: false, id: null });
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Xóa thất bại');
            setDeleteDialog({ open: false, id: null });
        }
    };

    const teacherName = (id) => {
        const t = teachers.find(x => String(x.id) === String(id));
        return t ? t.full_name : '—';
    };

    const filtered = classes.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Lớp học</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{classes.length} lớp trong hệ thống</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportClassesCsv} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center gap-2">
                        <Download size={16} /> CSV
                    </button>
                    <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={16} /> Thêm lớp
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Tìm kiếm..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? <div className="text-center py-10 text-slate-500">Đang tải...</div> : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tên lớp</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Khối</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">GVCN</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">GV Bộ môn</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map(cls => (
                                    <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{cls.name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{cls.grade_level}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{teacherName(cls.homeroom_teacher_id)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(cls.subject_teachers || {}).map(([subj, tid]) => (
                                                    <span key={subj} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                                                        {subj}: {teacherName(tid)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(cls)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500"><Pencil size={16} /></button>
                                                <button onClick={() => setDeleteDialog({ open: true, id: cls.id })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Không có dữ liệu</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa lớp học' : 'Thêm lớp học'} size="lg">
                {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên lớp</label>
                            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: 12A1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Khối</label>
                            <input
                                type="number"
                                className="input-field"
                                value={form.grade_level}
                                onChange={e => setForm({ ...form, grade_level: e.target.value })}
                                min="6"
                                max="12"
                                placeholder="6-12"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GVCN</label>
                        <select className="input-field" value={form.homeroom_teacher_id} onChange={e => setForm({ ...form, homeroom_teacher_id: e.target.value })}>
                            <option value="">Chọn GVCN</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.subject})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Giáo viên bộ môn</label>
                        <div className="grid grid-cols-2 gap-3">
                            {subjects.map(subj => (
                                <div key={subj}>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{subj}</label>
                                    <select className="input-field text-sm" value={form.subject_teachers[subj] || ''}
                                        onChange={e => setForm({ ...form, subject_teachers: { ...form.subject_teachers, [subj]: e.target.value || undefined } })}>
                                        <option value="">Chưa chọn</option>
                                        {teachers.filter(t => t.subject === subj).map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">Hủy</button>
                        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Đang lưu...' : 'Lưu'}</button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })} onConfirm={handleDelete}
                message="Bạn có chắc muốn xóa lớp học này?" />
        </div>
    );
}
