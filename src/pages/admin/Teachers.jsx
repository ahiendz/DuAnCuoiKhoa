import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Download, Pencil, Trash2, Award, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, exportTeachersCsv } from '@/services/teacherService';
import { getClasses } from '@/services/classService';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FilterBar from '@/components/FilterBar';

const fixedSubjects = ['Toán', 'Văn', 'Anh', 'KHTN'];

export default function Teachers() {
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ subject: '', gender: '' });
    const [sortKey, setSortKey] = useState('full_name');
    const [sortDir, setSortDir] = useState('asc');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ full_name: '', email: '', gender: '', subject: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [errorModal, setErrorModal] = useState('');
    const [passwordModal, setPasswordModal] = useState({ open: false, value: '' });

    const load = async () => {
        setLoading(true);
        try {
            const [t, c] = await Promise.all([getTeachers(), getClasses()]);
            setTeachers(t);
            setClasses(c);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    // Resolve homeroom class name for teacher
    const homeroomClassName = (teacher) => {
        if (!teacher.is_homeroom) return null;
        const cls = classes.find(c => String(c.homeroom_teacher_id) === String(teacher.id));
        return cls ? cls.name : '—';
    };

    const teacherMeta = useMemo(() => teachers.map(t => {
        const classCount = (t.teaching_classes || []).length;
        const isOverloaded = classCount > 4;
        const isFull = classCount === 4;
        return { ...t, classCount, isOverloaded, isFull };
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

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortIcon = ({ col }) => (
        <ArrowUpDown size={12} className={`inline ml-1 ${sortKey === col ? 'text-indigo-400' : 'text-slate-600'}`} />
    );

    const filtered = useMemo(() => {
        let list = teacherMeta.filter(t => {
            const matchSearch = t.full_name?.toLowerCase().includes(search.toLowerCase());
            const matchSubject = !filters.subject || t.subject === filters.subject;
            const matchGender = !filters.gender || t.gender === filters.gender;
            return matchSearch && matchSubject && matchGender;
        });
        return [...list].sort((a, b) => {
            let va = (sortKey === 'classCount' ? a.classCount : a[sortKey]) ?? '';
            let vb = (sortKey === 'classCount' ? b.classCount : b[sortKey]) ?? '';
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [teacherMeta, search, filters, sortKey, sortDir]);

    const LoadingSkeleton = () => (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden shadow-sm">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 px-4 py-4 border-b border-[var(--border-subtle)] animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-32" />
                    <div className="h-4 bg-slate-700 rounded w-40" />
                    <div className="h-4 bg-slate-700 rounded w-12" />
                    <div className="h-4 bg-slate-700 rounded w-16" />
                    <div className="h-4 bg-slate-700 rounded w-12" />
                    <div className="h-4 bg-slate-700 rounded w-20" />
                </div>
            ))}
        </div>
    );

    const GenderBadge = ({ gender }) => {
        if (gender === 'male') return (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">Nam</span>
        );
        if (gender === 'female') return (
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 font-medium">Nữ</span>
        );
        return <span className="text-slate-500 text-xs">—</span>;
    };

    const thCls = "text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors";
    const thClsFixed = "text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Quản lý Giáo viên</h2>
                    <p className="text-[var(--text-secondary)] text-sm">{teachers.length} giáo viên trong hệ thống</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportTeachersCsv} className="px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] text-sm flex items-center gap-2">
                        <Download size={16} /> CSV
                    </button>
                    <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={16} /> Thêm GV
                    </button>
                </div>
            </div>

            <FilterBar
                filters={filters}
                onChange={setFilters}
                showSubject
                showGender
            />

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Tìm giáo viên..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? <LoadingSkeleton /> : (
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[var(--hover-bg)] border-b border-[var(--border-default)]">
                                    {/* Column order: Họ tên | Email | Giới tính | Môn | Số lớp | GVCN | Thao tác */}
                                    <th className={thCls} onClick={() => handleSort('full_name')}>
                                        Họ tên <SortIcon col="full_name" />
                                    </th>
                                    <th className={`${thClsFixed} hidden md:table-cell`}>Email</th>
                                    <th className={thClsFixed}>Giới tính</th>
                                    <th className={thCls} onClick={() => handleSort('subject')}>
                                        Môn <SortIcon col="subject" />
                                    </th>
                                    <th className={thCls} onClick={() => handleSort('classCount')}>
                                        Số lớp <SortIcon col="classCount" />
                                    </th>
                                    <th className={thClsFixed}>GVCN lớp</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {filtered.map(t => (
                                    <tr key={t.id} className="hover:bg-blue-900/10 transition-all duration-150">
                                        <td className="px-4 py-3.5">
                                            <span className="font-semibold text-[var(--text-primary)]">{t.full_name}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-[var(--text-secondary)] text-xs hidden md:table-cell">{t.contact_email || '—'}</td>
                                        <td className="px-4 py-3.5">
                                            <GenderBadge gender={t.gender} />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-medium">
                                                {t.subject || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-sm font-semibold tabular-nums ${t.isOverloaded ? 'text-red-500' : t.isFull ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}>
                                                    {t.classCount} / 4
                                                </span>
                                                {t.isOverloaded && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-semibold flex items-center gap-0.5">
                                                        <AlertTriangle size={10} /> Quá tải
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {t.is_homeroom ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Award size={13} className="text-yellow-500 shrink-0" />
                                                    <span className="text-xs text-[var(--text-secondary)]">{homeroomClassName(t)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-slate-500 hover:text-indigo-500 transition-colors">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => setDeleteDialog({ open: true, id: t.id })} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-slate-500 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Search size={28} className="opacity-40" />
                                                <span className="text-sm">Không tìm thấy giáo viên phù hợp</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa giáo viên' : 'Thêm giáo viên'}>
                {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">{error}</div>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Họ và tên</label>
                        <input className="input-field" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email</label>
                        <input className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Giới tính</label>
                            <select className="input-field" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                <option value="">Chọn</option>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Môn giảng dạy</label>
                            <select className="input-field" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                                <option value="">Chọn môn</option>
                                {fixedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
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
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] text-sm">Hủy</button>
                        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })} onConfirm={handleDelete} message="Bạn có chắc muốn xóa giáo viên này?" />

            <Modal open={!!errorModal} onClose={() => setErrorModal('')} title="Không thể xóa">
                <div className="flex items-start gap-3 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertTriangle size={20} className="mt-0.5" />
                    <p className="text-sm">{errorModal}</p>
                </div>
            </Modal>

            <Modal open={passwordModal.open} onClose={() => setPasswordModal({ open: false, value: '' })} title="Mật khẩu mới">
                <p className="text-sm text-slate-300">Hệ thống đã tạo mật khẩu:</p>
                <p className="mt-2 text-lg font-semibold text-white font-mono">{passwordModal.value}</p>
                <div className="flex justify-end mt-4">
                    <button onClick={() => setPasswordModal({ open: false, value: '' })} className="btn-primary px-4 py-2 text-sm">Đã hiểu</button>
                </div>
            </Modal>
        </div>
    );
}
