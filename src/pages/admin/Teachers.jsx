import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Download, Pencil, Trash2, Award, AlertTriangle } from 'lucide-react';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, exportTeachersCsv } from '@/services/teacherService';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Teachers() {
    const [teachers, setTeachers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ full_name: '', email: '', gender: '', subject: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [errorModal, setErrorModal] = useState('');
    const [passwordModal, setPasswordModal] = useState({ open: false, value: '' });

    const fixedSubjects = ['Toán', 'Văn', 'Anh', 'KHTN'];

    const load = async () => {
        setLoading(true);
        try {
            const t = await getTeachers();
            setTeachers(t);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const teacherMeta = useMemo(() => teachers.map(t => {
        const load = (t.teaching_classes || []).length + (t.is_homeroom ? 1 : 0);
        const isFull = load >= 4;
        const isUnassigned = (t.teaching_classes || []).length === 0 && !t.is_homeroom;
        return { ...t, load, isFull, isUnassigned };
    }), [teachers]);

    const openAdd = () => {
        setEditing(null);
        setForm({ full_name: '', email: '', gender: '', subject: '', password: '' });
        setError('');
        setModalOpen(true);
    };

    const openEdit = (t) => {
        setEditing(t);
        setForm({
            full_name: t.full_name || '',
            email: t.contact_email || '',
            gender: t.gender || '',
            subject: t.subject || '',
            password: '',
        });
        setError('');
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            console.log("Teacher Payload:", form);
            const response = editing
                ? await updateTeacher(editing.id, form)
                : await createTeacher(form);

            if (response.generatedPassword) {
                setPasswordModal({ open: true, value: response.generatedPassword });
            }

            setModalOpen(false);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Lỗi');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        try {
            await deleteTeacher(deleteDialog.id);
            setDeleteDialog({ open: false, id: null });
            load();
        } catch (err) {
            setErrorModal(err.response?.data?.error || 'Không thể xóa giáo viên');
            setDeleteDialog({ open: false, id: null });
        }
    };

    const filtered = teacherMeta.filter(t => t.full_name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Giáo viên</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{teachers.length} giáo viên</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportTeachersCsv} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center gap-2">
                        <Download size={16} /> CSV
                    </button>
                    <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={16} /> Thêm GV
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Tìm giáo viên..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? <div className="text-center py-10 text-slate-500">Đang tải...</div> : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Họ tên</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Môn</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Số lớp</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">GVCN</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{t.full_name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.contact_email || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${t.isFull
                                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold'
                                                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                    }`}
                                            >
                                                {t.subject} {t.isFull && '[FULL]'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{(t.teaching_classes || []).length}/4</td>
                                        <td className="px-4 py-3">
                                            {t.is_homeroom ? <Award size={16} className="text-yellow-500" /> : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500"><Pencil size={16} /></button>
                                                <button onClick={() => setDeleteDialog({ open: true, id: t.id })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">Không có dữ liệu</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa giáo viên' : 'Thêm giáo viên'}>
                {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ và tên</label>
                        <input className="input-field" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                        <input className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Giới tính</label>
                            <select className="input-field" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                <option value="">Chọn</option>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Môn giảng dạy</label>
                            <select className="input-field" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                                <option value="">Chọn môn</option>
                                {fixedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {editing ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu (để trống để tự động tạo)'}
                        </label>
                        <input
                            type="password"
                            className="input-field"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder={editing ? 'Nhập mật khẩu mới' : 'Tự động tạo nếu để trống'}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">Hủy</button>
                        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Đang lưu...' : 'Lưu'}</button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })} onConfirm={handleDelete}
                message="Bạn có chắc muốn xóa giáo viên này?" />

            <Modal open={!!errorModal} onClose={() => setErrorModal('')} title="Không thể xóa">
                <div className="flex items-start gap-3 text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                    <AlertTriangle size={20} className="mt-0.5" />
                    <p className="text-sm">{errorModal}</p>
                </div>
            </Modal>

            <Modal open={passwordModal.open} onClose={() => setPasswordModal({ open: false, value: '' })} title="Mật khẩu mới">
                <p className="text-sm text-slate-300">Hệ thống đã tạo mật khẩu:</p>
                <p className="mt-2 text-lg font-semibold text-white font-mono">{passwordModal.value}</p>
                <div className="flex justify-end mt-4">
                    <button
                        onClick={() => setPasswordModal({ open: false, value: '' })}
                        className="btn-primary px-4 py-2 text-sm"
                    >
                        Đã hiểu
                    </button>
                </div>
            </Modal>
        </div >
    );
}
