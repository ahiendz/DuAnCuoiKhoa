import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Search, Download, Upload, Pencil, Trash2, User, Eye, EyeOff
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getStudents, createStudent, updateStudent, deleteStudent,
  importStudents, exportStudentsTemplate
} from '@/services/studentService';
import { getClasses } from '@/services/classService';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

const SUBJECTS_PARENT_COLS = ['parent_name', 'parent_email', 'parent_phone', 'parent_relation'];

export default function Students() {
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    full_name: '', dob: '', gender: '', class_id: '',
    avatar_url: '', parent_email: '', parent_name: '',
    parent_phone: '', relationship: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importClassId, setImportClassId] = useState('');
  const [importMode, setImportMode] = useState('merge');
  const [rows, setRows] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [importError, setImportError] = useState('');
  const [savingImport, setSavingImport] = useState(false);
  const [replaceWarn, setReplaceWarn] = useState(false);
  const [showParentCols, setShowParentCols] = useState(false);
  const fileRef = useRef();
  const [viewing, setViewing] = useState(null);
  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === String(importClassId)),
    [classes, importClassId]
  );

  useEffect(() => {
    load();
  }, [classFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const [filtered, all, c] = await Promise.all([
        getStudents(classFilter || undefined),
        getStudents(),
        getClasses()
      ]);
      setStudents(filtered);
      setAllStudents(all);
      setClasses(c);
    } finally {
      setLoading(false);
    }
  };

  const formatDob = (dob) => {
    if (!dob) return '—';
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return dob;
    return parsed.toLocaleDateString('vi-VN');
  };

  const isValidUrl = (val) => {
    if (!val) return true;
    try {
      const u = new URL(val);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isValidEmail = (val) => /\S+@\S+\.\S+/.test(val);

  const validateStudentForm = (payload) => {
    if (!payload.full_name || !payload.dob || !payload.gender || !payload.class_id) {
      return 'Vui lòng cung cấp họ tên, ngày sinh, giới tính và lớp';
    }
    if (!payload.parent_name || !payload.parent_email || !payload.parent_phone || !payload.relationship) {
      return 'Phụ huynh cần đầy đủ tên, email, điện thoại và quan hệ';
    }
    if (!isValidEmail(payload.parent_email)) {
      return 'Email phụ huynh không hợp lệ';
    }
    if (payload.avatar_url && !isValidUrl(payload.avatar_url)) {
      return 'Avatar URL không hợp lệ';
    }
    return '';
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      full_name: '',
      dob: '',
      gender: '',
      class_id: classFilter || '',
      avatar_url: '',
      parent_email: '',
      parent_name: '',
      parent_phone: '',
      relationship: ''
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      full_name: student.full_name || '',
      dob: student.dob || '',
      gender: student.gender || '',
      class_id: student.class_id || '',
      avatar_url: student.avatar_url || '',
      parent_email: student.parent_email || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      relationship: student.relationship || ''
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const validation = validateStudentForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) await updateStudent(editing.id, form);
      else await createStudent(form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi');
    } finally {
      setSaving(false);
    }
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

  const toIsoDate = (value) => {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const mm = String(parsed.m).padStart(2, '0');
        const dd = String(parsed.d).padStart(2, '0');
        return `${parsed.y}-${mm}-${dd}`;
      }
    }
    const str = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const match = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    const date = new Date(str);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    return '';
  };

  const validateImportRow = (row, duplicates) => {
    const errs = {};
    const code = String(row.student_code || '').trim();
    if (!code) errs.student_code = 'Thiếu mã học sinh';
    if (!row.full_name?.trim()) errs.full_name = 'Thiếu họ tên';
    if (!row.dob) errs.dob = 'Thiếu ngày sinh';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) errs.dob = 'Ngày sinh phải YYYY-MM-DD';
    if (!row.gender || !['male', 'female'].includes(row.gender)) errs.gender = 'Giới tính male/female';
    if (row.avatar_url && !isValidUrl(row.avatar_url)) errs.avatar_url = 'URL không hợp lệ';

    if (!selectedClass) {
      errs.class_id = 'Chọn lớp trước';
    } else {
      const rowClass = String(row.class_id || '').trim();
      const allowed = [String(selectedClass.id), String(selectedClass.name || '').toLowerCase()];
      if (rowClass && !allowed.includes(rowClass.toLowerCase())) {
        errs.class_id = `Phải là ${selectedClass.name} (${selectedClass.id})`;
      }
    }

    if (code) {
      if (duplicates[code] > 1) errs.student_code = 'Trùng mã trong file';
      const pool = allStudents.length ? allStudents : students;
      const conflict = pool.find(
        (s) => String(s.student_code || '').trim() === code
          && String(s.class_id) !== String(selectedClass?.id)
      );
      if (conflict) errs.student_code = 'Mã đã tồn tại ở lớp khác';
    }

    return errs;
  };

  const recomputeErrors = (nextRows) => {
    const duplicates = {};
    nextRows.forEach((r) => {
      const key = String(r.student_code || '').trim();
      if (!key) return;
      duplicates[key] = (duplicates[key] || 0) + 1;
    });

    const nextErrors = {};
    nextRows.forEach((row, idx) => {
      const errs = validateImportRow(row, duplicates);
      if (Object.keys(errs).length) nextErrors[idx] = errs;
    });
    setRowErrors(nextErrors);
    return nextErrors;
  };

  const errorCount = useMemo(
    () => Object.values(rowErrors).reduce((acc, err) => acc + Object.keys(err).length, 0),
    [rowErrors]
  );

  useEffect(() => {
    if (!rows.length) return;
    const classValue = selectedClass ? String(selectedClass.id) : importClassId;
    const synced = rows.map((r) => ({ ...r, class_id: classValue }));
    setRows(synced);
    recomputeErrors(synced);
  }, [importClassId, selectedClass]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const workbook = XLSX.read(ev.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rowsRaw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rowsRaw.length) throw new Error('File trống');
        const headers = rowsRaw[0].map((h) => String(h).trim().toLowerCase());
        const required = ['student_code', 'full_name', 'dob', 'gender'];
        const missing = required.filter((h) => !headers.includes(h));
        if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(', ')}`);
        const getIdx = (name) => headers.indexOf(name);
        const parsed = rowsRaw.slice(1)
          .filter((r) => r.some((v) => String(v).trim() !== ''))
          .map((r) => ({
            student_code: String(r[getIdx('student_code')] || '').trim(),
            full_name: String(r[getIdx('full_name')] || '').trim(),
            dob: toIsoDate(r[getIdx('dob')]),
            gender: String(r[getIdx('gender')] || '').trim().toLowerCase(),
            class_id: selectedClass
              ? String(selectedClass.id)
              : (getIdx('class_id') >= 0 ? String(r[getIdx('class_id')] || '').trim() : importClassId || ''),
            avatar_url: getIdx('avatar_url') >= 0 ? String(r[getIdx('avatar_url')] || '').trim() : '',
            parent_name: getIdx('parent_name') >= 0 ? String(r[getIdx('parent_name')] || '').trim() : '',
            parent_email: getIdx('parent_email') >= 0 ? String(r[getIdx('parent_email')] || '').trim() : '',
            parent_phone: getIdx('parent_phone') >= 0 ? String(r[getIdx('parent_phone')] || '').trim() : '',
            parent_relation: getIdx('parent_relation') >= 0 ? String(r[getIdx('parent_relation')] || '').trim() : ''
          }));
        setRows(parsed);
        setImportError('');
        recomputeErrors(parsed);
      } catch (err) {
        setImportError(err.message || 'Không đọc được file');
        setRows([]);
        setRowErrors({});
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const extractConflictCode = (msg = '') => {
    const match = msg.match(/student_code[^A-Za-z0-9]*([A-Za-z0-9_-]+)/i);
    return match ? match[1] : '';
  };

  const handleCellChange = (idx, field, value) => {
    const normalized = field === 'dob'
      ? toIsoDate(value)
      : field === 'gender'
        ? String(value).toLowerCase()
        : field === 'class_id'
          ? String(value).trim()
        : value;
    const updated = rows.map((row, i) => (i === idx ? { ...row, [field]: normalized } : row));
    setRows(updated);
    recomputeErrors(updated);
  };

  const handleSaveImport = async () => {
    if (!importClassId) {
      setImportError('Chọn lớp trước khi lưu');
      return;
    }
    if (!rows.length) {
      setImportError('Chưa có dữ liệu để lưu');
      return;
    }
    const errors = recomputeErrors(rows);
    if (Object.keys(errors).length) {
      setImportError('Sửa các ô đỏ trước khi lưu');
      return;
    }
    setSavingImport(true);
    setImportError('');
    try {
      const payload = rows.map((row) => ({
        ...row,
        avatar_url: row.avatar_url || null,
        class_id: selectedClass ? selectedClass.id : row.class_id
      }));
      const result = await importStudents(payload, importMode, importClassId);
      if (result.skipped) {
        setImportError(`Backend đã bỏ qua ${result.skipped} dòng do lỗi. Kiểm tra lại mã HS, ngày sinh hoặc lớp.`);
        recomputeErrors(rows);
        return;
      }
      alert(`Import thành công: ${result.inserted || 0} mới, ${result.updated || 0} cập nhật${importMode === 'replace' ? `, ${result.deleted || 0} đã xoá trước đó` : ''}`);
      setImportModal(false);
      setRows([]);
      setRowErrors({});
      setReplaceWarn(false);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Import thất bại';
      setImportError(msg);
      const code = extractConflictCode(msg);
      if (code) {
        setRowErrors((prev) => {
          const idx = rows.findIndex((r) => String(r.student_code).trim() === code.trim());
          if (idx < 0) return prev;
          return { ...prev, [idx]: { ...(prev[idx] || {}), student_code: 'Mã đã tồn tại lớp khác' } };
        });
      }
    } finally {
      setSavingImport(false);
    }
  };

  const className = (student) => {
    if (student.class_name) return student.class_name;
    const c = classes.find((cls) => String(cls.id) === String(student.class_id));
    return c ? c.name : '—';
  };

  const filteredStudents = students.filter((s) => s.full_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Học sinh</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{students.length} học sinh</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportModal(true)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm flex items-center gap-2">
            <Upload size={16} /> Import
          </button>
          <button onClick={() => exportStudentsTemplate()} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm flex items-center gap-2">
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
          <input
            type="text"
            placeholder="Tìm học sinh..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-auto min-w-[160px]" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">Tất cả lớp</option>
          {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Đang tải...</div>
      ) : (
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
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <User size={14} className="text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{student.student_code}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{student.full_name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDob(student.dob)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                        {className(student)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewing(student)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500"><Eye size={16} /></button>
                        <button onClick={() => openEdit(student)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteDialog({ open: true, id: student.id })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa học sinh' : 'Thêm học sinh'}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ và tên</label>
            <input className="input-field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ngày sinh</label>
              <input type="date" className="input-field" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Giới tính</label>
              <select className="input-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Chọn</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lớp</label>
            <select className="input-field" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">Chọn lớp</option>
              {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avatar URL (tùy chọn)</label>
            <input className="input-field" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Thông tin phụ huynh (bắt buộc)</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email PH</label>
              <input type="email" className="input-field" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} placeholder="parent@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ tên PH</label>
              <input className="input-field" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} placeholder="Nguyễn Văn A" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SĐT PH</label>
              <input type="tel" className="input-field" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="0909123456" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quan hệ</label>
              <select className="input-field" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
                <option value="">Chọn</option>
                <option value="father">Cha</option>
                <option value="mother">Mẹ</option>
                <option value="guardian">Người giám hộ</option>
              </select>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
            Hệ thống tạo tài khoản phụ huynh nếu có email; mật khẩu mặc định là mã học sinh.
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">Hủy</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={importModal}
        onClose={() => {
          setImportModal(false);
          setRows([]);
          setRowErrors({});
          setImportError('');
          setReplaceWarn(false);
          if (fileRef.current) fileRef.current.value = '';
        }}
        title="Import học sinh từ Excel"
        size="xl"
      >
        <div className="space-y-4">
          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {importError}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chọn lớp</label>
              <select className="input-field" value={importClassId} onChange={(e) => setImportClassId(e.target.value)}>
                <option value="">-- Chọn lớp --</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chế độ</label>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Merge</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={importMode === 'replace'}
                    onChange={(e) => setImportMode(e.target.checked ? 'replace' : 'merge')}
                  />
                  <div className="relative w-12 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:bg-red-500 transition-colors">
                    <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-6" />
                  </div>
                </label>
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Replace</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {importMode === 'merge'
                  ? 'Giữ dữ liệu cũ, thêm mới/ghi đè theo mã HS.'
                  : 'Thay thế toàn bộ lớp này trước khi import.'}
              </p>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File Excel (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  ref={fileRef}
                  onChange={handleFileUpload}
                  disabled={!importClassId}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100 disabled:opacity-50"
                />
                {!importClassId && <p className="text-xs text-slate-500 pt-1">Chọn lớp trước khi tải file.</p>}
              </div>
              <button
                type="button"
                className="h-10 px-3 rounded-lg border border-slate-600 text-slate-200 text-xs flex items-center gap-2"
                onClick={() => setShowParentCols((v) => !v)}
              >
                {showParentCols ? <EyeOff size={14} /> : <Eye size={14} />} {showParentCols ? 'Ẩn phụ huynh' : 'Hiện phụ huynh'}
              </button>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {rows.length} dòng | Lỗi: <span className={errorCount > 0 ? 'text-red-500' : 'text-green-500'}>{errorCount}</span>
                </p>
                <button
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => {
                    setRows([]);
                    setRowErrors({});
                    setImportError('');
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Xóa dữ liệu
                </button>
              </div>
              <div className="overflow-x-auto max-h-[320px] border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      {['student_code', 'full_name', 'dob', 'gender', 'class_id', 'avatar_url', ...(showParentCols ? SUBJECTS_PARENT_COLS : [])].map((col) => (
                        <th key={col} className="text-left px-3 py-2 font-semibold text-slate-500 uppercase text-xs">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        {['student_code', 'full_name', 'dob', 'gender', 'class_id', 'avatar_url', ...(showParentCols ? SUBJECTS_PARENT_COLS : [])].map((field) => {
                          const hasError = rowErrors[idx]?.[field];
                          return (
                            <td key={field} className="px-3 py-2">
                              <input
                                className={`input-field text-xs ${hasError ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
                                value={row[field] || ''}
                                onChange={(e) => handleCellChange(idx, field, e.target.value)}
                              />
                              {hasError && <p className="text-xs text-red-500 mt-1">{rowErrors[idx][field]}</p>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button onClick={() => setImportModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">Hủy</button>
            <button
              onClick={() => {
                if (importMode === 'replace' && !replaceWarn) {
                  setReplaceWarn(true);
                } else {
                  handleSaveImport();
                  setReplaceWarn(false);
                }
              }}
              disabled={!rows.length || errorCount > 0 || savingImport || !importClassId}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {savingImport ? 'Đang lưu...' : 'Lưu vào DB'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={replaceWarn}
        onClose={() => setReplaceWarn(false)}
        onConfirm={() => {
          setReplaceWarn(false);
          handleSaveImport();
        }}
        title="Cảnh báo Replace"
        message="Replace sẽ xóa toàn bộ học sinh, điểm danh và dữ liệu AI của lớp này trước khi import."
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        message="Bạn có chắc muốn xóa học sinh này?"
      />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Chi tiết học sinh">
        {viewing && (
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="text-xs uppercase text-slate-400 mb-2">Thông tin Học sinh</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Mã HS:</span> <span className="font-semibold text-slate-100">{viewing.student_code}</span></div>
                <div><span className="text-slate-500">Lớp:</span> <span className="font-semibold text-slate-100">{className(viewing)}</span></div>
                <div><span className="text-slate-500">Họ tên:</span> <span className="font-semibold text-slate-100">{viewing.full_name}</span></div>
                <div><span className="text-slate-500">Giới tính:</span> <span className="font-semibold text-slate-100">{viewing.gender}</span></div>
                <div><span className="text-slate-500">Ngày sinh:</span> <span className="font-semibold text-slate-100">{formatDob(viewing.dob)}</span></div>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase text-slate-400 mb-2">Thông tin Phụ huynh</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Họ tên:</span> <span className="font-semibold text-slate-100">{viewing.parent_name || '—'}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="font-semibold text-slate-100">{viewing.parent_email || '—'}</span></div>
                <div><span className="text-slate-500">SĐT:</span> <span className="font-semibold text-slate-100">{viewing.parent_phone || '—'}</span></div>
                <div><span className="text-slate-500">Quan hệ:</span> <span className="font-semibold text-slate-100">{viewing.parent_relation || '—'}</span></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
