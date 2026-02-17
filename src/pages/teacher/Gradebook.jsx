import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { getAssignments, getGrades, saveGrade, exportGradesCsv, importGradesCsv } from '@/services/gradeService';
import { Save, Download, Upload, Tag } from 'lucide-react';
import Modal from '@/components/Modal';

const SCORE_COLS = [
    { key: 'mieng_1', label: 'Miệng 1' },
    { key: 'mieng_2', label: 'Miệng 2' },
    { key: 'phut15_1', label: '15p C1' },
    { key: 'phut15_2', label: '15p C2' },
    { key: 'tiet1_1', label: '1 tiết C1' },
    { key: 'tiet1_2', label: '1 tiết C2' },
    { key: 'giuaki', label: 'Giữa kỳ' },
    { key: 'cuoiki', label: 'Cuối kỳ' },
];

const calcAverage = (row) => {
    const scores = SCORE_COLS.map(c => parseFloat(row[c.key])).filter(v => !isNaN(v));
    if (scores.length === 0) return null;
    const hs = scores.slice(0, -2);
    const mid = parseFloat(row.giuaki);
    const final_ = parseFloat(row.cuoiki);
    if (isNaN(mid) || isNaN(final_)) return null;
    const sum = hs.reduce((a, b) => a + b, 0) + mid * 2 + final_ * 2;
    const count = hs.length + 4;
    return (sum / count).toFixed(2);
};

export default function Gradebook() {
    const { user } = useAuth();
    const { addNotification } = useNotifications();
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [semester, setSemester] = useState('HK1');
    const [academicYear, setAcademicYear] = useState('2025-2026');
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [importModal, setImportModal] = useState(false);
    const [quickTag, setQuickTag] = useState('');
    const fileRef = useRef();

    useEffect(() => {
        if (!user) { console.log('[GRADEBOOK-DEBUG] No user in context'); return; }
        console.log('[GRADEBOOK-DEBUG] User:', user);
        getAssignments(user.id).then(res => {
            const list = res.assignments || [];
            console.log('[GRADEBOOK-DEBUG] Assignments:', list);
            setAssignments(list);
            if (list.length > 0) setSelectedAssignment(list[0].class_subject_teacher_id);
        }).catch(err => console.error('[GRADEBOOK-DEBUG] Assignments error:', err)).finally(() => setLoading(false));
    }, [user]);

    const loadGrades = async () => {
        if (!selectedAssignment) return;
        setLoading(true);
        console.log('[GRADEBOOK-DEBUG] Fetching grades for:', { selectedAssignment, semester, academicYear });
        try {
            const res = await getGrades({
                class_subject_teacher_id: selectedAssignment,
                semester,
                academic_year: academicYear
            });
            console.log('[GRADEBOOK-DEBUG] Grades API Response:', res);
            setGrades(res.grades || res.students || []);
        } catch (err) { console.error('[GRADEBOOK-DEBUG] Grades error:', err); } finally { setLoading(false); }
    };

    useEffect(() => { loadGrades(); }, [selectedAssignment, semester, academicYear]);
    const handleScoreChange = (idx, key, value) => {
        const v = value.replace(',', '.');
        const updated = [...grades];
        updated[idx] = { ...updated[idx], [key]: v };
        setGrades(updated);
    };

    const handleCommentChange = (idx, value) => {
        const updated = [...grades];
        updated[idx] = { ...updated[idx], comment_text: value };
        setGrades(updated);
    };

    const handleSaveAll = async () => {
        if (!semester) { addNotification('Vui lòng chọn học kỳ trước khi lưu', 'warning'); return; }
        // Check for invalid scores
        const hasInvalid = grades.some(g => SCORE_COLS.some(c => {
            const v = g[c.key];
            return v !== '' && v != null && (isNaN(v) || parseFloat(v) < 0 || parseFloat(v) > 10);
        }));
        if (hasInvalid) { addNotification('Có điểm không hợp lệ (phải từ 0-10). Vui lòng kiểm tra lại.', 'warning'); }
        setSaving(true);
        try {
            for (const g of grades) {
                await saveGrade({
                    class_subject_teacher_id: selectedAssignment,
                    student_id: g.student_id,
                    semester,
                    academic_year: academicYear,
                    ...SCORE_COLS.reduce((acc, c) => ({ ...acc, [c.key]: g[c.key] || null }), {}),
                    quick_tag: g.quick_tag || '',
                    comment_text: g.comment_text || ''
                });
            }
            addNotification('Lưu điểm thành công!', 'success');
            loadGrades();
        } catch (err) {
            addNotification(err.response?.data?.message || 'Lưu điểm thất bại', 'error');
        } finally { setSaving(false); }
    };

    const handleExport = async () => {
        try {
            await exportGradesCsv({ class_subject_teacher_id: selectedAssignment, semester, academic_year: academicYear });
            addNotification('Xuất file thành công!', 'success');
        } catch (err) {
            console.error('Export error:', err);
            addNotification(err.response?.data?.message || 'Xuất file thất bại. Vui lòng thử lại.', 'error');
        }
    };

    const handleImport = async () => {
        if (!fileRef.current?.files?.[0]) return;
        const formData = new FormData();
        formData.append('file', fileRef.current.files[0]);
        formData.append('class_subject_teacher_id', selectedAssignment);
        formData.append('semester', semester);
        formData.append('academic_year', academicYear);
        try {
            await importGradesCsv(formData);
            addNotification('Import CSV thành công!', 'success');
            setImportModal(false);
            loadGrades();
        } catch (err) {
            addNotification(err.response?.data?.message || 'Import CSV thất bại', 'error');
        }
    };

    const applyQuickTag = () => {
        if (!quickTag) return;
        setGrades(prev => prev.map(g => ({ ...g, quick_tag: quickTag })));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Nhập điểm</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Quản lý điểm số học sinh</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setImportModal(true)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center gap-2">
                        <Upload size={16} /> Import
                    </button>
                    <button onClick={handleExport} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center gap-2">
                        <Download size={16} /> Export
                    </button>
                    <button onClick={handleSaveAll} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                        <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu tất cả'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <select className="input-field w-auto" value={selectedAssignment} onChange={e => setSelectedAssignment(e.target.value)}>
                    {assignments.map(a => <option key={a.class_subject_teacher_id} value={a.class_subject_teacher_id}>{a.class_name} - {a.subject}</option>)}
                </select>
                <select className="input-field w-auto" value={semester} onChange={e => setSemester(e.target.value)}>
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                </select>
                <input className="input-field w-auto" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2024-2025" />
                <div className="flex items-center gap-2">
                    <select className="input-field w-auto text-sm" value={quickTag} onChange={e => setQuickTag(e.target.value)}>
                        <option value="">Quick Tag...</option>
                        <option value="Giỏi">Giỏi</option>
                        <option value="Khá">Khá</option>
                        <option value="TB">Trung bình</option>
                        <option value="Yếu">Yếu</option>
                    </select>
                    <button onClick={applyQuickTag} className="px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/30 flex items-center gap-1">
                        <Tag size={14} /> Áp dụng
                    </button>
                </div>
            </div>

            {
                loading ? <div className="text-center py-10 text-slate-500">Đang tải...</div> : (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase sticky left-0 bg-slate-50 dark:bg-slate-800/50">STT</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase sticky left-10 bg-slate-50 dark:bg-slate-800/50">Mã HS</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase sticky left-28 bg-slate-50 dark:bg-slate-800/50 min-w-[140px]">Họ tên</th>
                                        {SCORE_COLS.map(c => (
                                            <th key={c.key} className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[70px]">{c.label}</th>
                                        ))}
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase bg-indigo-50 dark:bg-indigo-900/20">TBHK</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Tag</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[120px]">Nhận xét</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {grades.map((g, idx) => {
                                        const avg = calcAverage(g);
                                        return (
                                            <tr key={g.student_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-3 py-2 text-slate-500 sticky left-0 bg-white dark:bg-slate-900 text-xs">{idx + 1}</td>
                                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono text-xs sticky left-10 bg-white dark:bg-slate-900">{g.student_code}</td>
                                                <td className="px-3 py-2 font-medium text-slate-800 dark:text-white text-xs sticky left-28 bg-white dark:bg-slate-900">{g.full_name}</td>
                                                {SCORE_COLS.map(c => (
                                                    <td key={c.key} className="px-1 py-1 text-center">
                                                        <input
                                                            type="text"
                                                            value={g[c.key] ?? ''}
                                                            onChange={e => handleScoreChange(idx, c.key, e.target.value)}
                                                            className={`w-14 text-center px-1 py-1 rounded border bg-transparent text-sm text-slate-800 dark:text-white focus:ring-1 outline-none transition-colors ${g[c.key] !== '' && g[c.key] != null && (isNaN(g[c.key]) || parseFloat(g[c.key]) < 0 || parseFloat(g[c.key]) > 10)
                                                                ? 'border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-900/10'
                                                                : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                                                                }`}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-3 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10">
                                                    {avg || '—'}
                                                </td>
                                                <td className="px-1 py-1 text-center relative">
                                                    <select
                                                        value={g.quick_tag || ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            const updated = [...grades];
                                                            updated[idx] = { ...updated[idx], quick_tag: val };
                                                            setGrades(updated);
                                                        }}
                                                        className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 focus:border-indigo-500 outline-none relative z-10"
                                                        style={{ minWidth: '80px' }}
                                                    >
                                                        <option value="">--</option>
                                                        <option value="Giỏi">Giỏi</option>
                                                        <option value="Khá">Khá</option>
                                                        <option value="TB">TB</option>
                                                        <option value="Yếu">Yếu</option>
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={g.comment_text ?? ''}
                                                        onChange={e => handleCommentChange(idx, e.target.value)}
                                                        className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-xs text-slate-600 dark:text-slate-300 focus:border-indigo-500 outline-none"
                                                        placeholder="Nhận xét..."
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {grades.length === 0 && <tr><td colSpan={12} className="text-center py-8 text-slate-400">Chọn lớp và học kỳ</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            <Modal open={importModal} onClose={() => setImportModal(false)} title="Import điểm từ CSV">
                <div className="space-y-4">
                    <input type="file" accept=".csv" ref={fileRef}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-600 dark:file:text-indigo-400" />
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={() => setImportModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">Hủy</button>
                        <button onClick={handleImport} className="btn-primary text-sm">Import</button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}
