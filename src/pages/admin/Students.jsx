import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Download, Upload, Pencil, Trash2, User } from 'lucide-react';
import { getStudents, createStudent, updateStudent, deleteStudent, importStudents, exportStudentsCsv } from '@/services/studentService';
import { getClasses } from '@/services/classService';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Students() {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [classFilter, setClassFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [importModal, setImportModal] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ full_name: '', dob: '', gender: '', class_id: '', avatar_url: '', parent_email: '', parent_name: '', parent_phone: '', relationship: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [importMode, setImportMode] = useState('merge');
    const [importClassId, setImportClassId] = useState('');
    const [csvText, setCsvText] = useState('');
    const fileRef = useRef();

    const load = async () => {
        setLoading(true);
        try {
            const [s, c] = await Promise.all([getStudents(classFilter || undefined), getClasses()]);
            setStudents(s);
            setClasses(c);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [classFilter]);

    const openAdd = () => {
        setEditing(null);
        setForm({ full_name: '', dob: '', gender: '', class_id: classFilter || '', avatar_url: '', parent_email: '', parent_name: '', parent_phone: '', relationship: '' });
        setError('');
        setModalOpen(true);
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({ full_name: s.full_name || '', dob: s.dob || '', gender: s.gender || '', class_id: s.class_id || '', avatar_url: s.avatar_url || '', parent_email: '', parent_name: '', parent_phone: '', relationship: '' });
        setError('');
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            if (editing) await updateStudent(editing.id, form);
            else await createStudent(form);
            setModalOpen(false);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Lỗi');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        try {
            await deleteStudent(deleteDialog.id);
            setDeleteDialog({ open: false, id: null });
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Xóa thất bại');
            setDeleteDialog({ open: false, id: null });
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setCsvText(ev.target.result);
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!csvText.trim()) return;
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ''; });
            return obj;
        });
        try {
            const result = await importStudents(rows, importMode, importClassId || undefined);
            alert(`Import thành công: ${result.imported || 0} học sinh`);
            setImportModal(false);
            setCsvText('');
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Import thất bại');
        }
    };

    const className = (id) => {
        const c = classes.find(x => String(x.id) === String(id));
        return c ? c.name : '—';
    };

    const filtered = students.filter(s => s.full_name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Học sinh</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{students.length} học sinh</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setImportModal(true)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center gap-2">
                        <Upload size={16} /> Import
                    </button>
                    <button onClick={() => exportStudentsCsv(classFilter)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center gap-2">
                        <Download size={16} /> CSV
                    </button>
                    <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={16} /> Thêm HS
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Tìm học sinh..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-auto min-w-[160px]" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                    <option value="">Tất cả lớp</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {loading ? <div className="text-center py-10 text-slate-500">Đang tải...</div> : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Avatar</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mã HS</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Họ tên</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ngày sinh</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lớp</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            {s.avatar_url ? (
                                                <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><User size={14} className="text-slate-400" /></div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{s.student_code}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{s.full_name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.dob || '—'}</td>
                                        <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">{className(s.class_id)}</span></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500"><Pencil size={16} /></button>
                                                <button onClick={() => setDeleteDialog({ open: true, id: s.id })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
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

            {/* Add/Edit Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa học sinh' : 'Thêm học sinh'}>
                {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ và tên</label>
                        <input className="input-field" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ngày sinh</label>
                            <input type="date" className="input-field" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Giới tính</label>
                            <select className="input-field" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                <option value="">Chọn</option>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lớp</label>
                        <select className="input-field" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}>
                            <option value="">Chọn lớp</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avatar URL</label>
                        <input className="input-field" value={form.avatar_url} onChange={e => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
                    </div>

                    {/* Parent Information Section */}
                    {!editing && (
                        <>
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Thông tin Phụ huynh (Tùy chọn)</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email PH</label>
                                    <input type="email" className="input-field" value={form.parent_email} onChange={e => setForm({ ...form, parent_email: e.target.value })} placeholder="parent@email.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ tên PH</label>
                                    <input className="input-field" value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} placeholder="Nguyễn Văn A" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SĐT PH</label>
                                    <input type="tel" className="input-field" value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} placeholder="0909123456" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quan hệ</label>
                                    <select className="input-field" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>
                                        <option value="">Chọn</option>
                                        <option value="father">Cha</option>
                                        <option value="mother">Mẹ</option>
                                        <option value="guardian">Người giám hộ</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    <strong>Lưu ý:</strong> Nếu nhập email PH, hệ thống sẽ tự tạo tài khoản parent. Mật khẩu mặc định = Mã học sinh.
                                </p>
                            </div>
                        </>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">Hủy</button>
                        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Đang lưu...' : 'Lưu'}</button>
                    </div>
                </div>
            </Modal>

            {/* Import CSV Modal */}
            <Modal open={importModal} onClose={() => setImportModal(false)} title="Import học sinh từ CSV" size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chế độ</label>
                            <select className="input-field" value={importMode} onChange={e => setImportMode(e.target.value)}>
                                <option value="merge">Merge (thêm mới)</option>
                                <option value="replace">Replace (thay thế)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lớp</label>
                            <select className="input-field" value={importClassId} onChange={e => setImportClassId(e.target.value)}>
                                <option value="">Theo file CSV</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File CSV</label>
                        <input type="file" accept=".csv" ref={fileRef} onChange={handleFileUpload}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100" />
                    </div>
                    {csvText && <p className="text-xs text-green-500">Đã đọc file ({csvText.split('\n').length - 1} dòng dữ liệu)</p>}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={() => setImportModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">Hủy</button>
                        <button onClick={handleImport} disabled={!csvText} className="btn-primary text-sm">Import</button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })} onConfirm={handleDelete}
                message="Bạn có chắc muốn xóa học sinh này?" />
        </div>
    );
}
