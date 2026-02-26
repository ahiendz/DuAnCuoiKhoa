import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Filter } from 'lucide-react';

/**
 * Reusable FilterBar component for admin tables.
 * Props:
 *   filters: object - current filter state { gender, grade, class_id, subject, status }
 *   onChange: fn(newFilters) - called when filters change
 *   classes: array - list of class objects [{ id, name, grade_level }]
 *   showGender: bool
 *   showGrade: bool
 *   showClass: bool
 *   showSubject: bool
 *   showStatus: bool
 */
const GRADES = [6, 7, 8, 9, 10, 11, 12];
const SUBJECTS = ['Toán', 'Văn', 'Anh', 'KHTN'];

export default function FilterBar({
    filters = {},
    onChange,
    classes = [],
    showGender = false,
    showGrade = false,
    showClass = false,
    showSubject = false,
    showStatus = false,
}) {
    const [local, setLocal] = useState({ gender: '', grade: '', class_id: '', subject: '', status: '', ...filters });

    // sync from parent
    useEffect(() => {
        setLocal(prev => ({ ...prev, ...filters }));
    }, [filters]);

    const handleChange = (key, val) => {
        const next = { ...local, [key]: val };
        setLocal(next);
        onChange && onChange(next);
    };

    const clearAll = () => {
        const cleared = { gender: '', grade: '', class_id: '', subject: '', status: '' };
        setLocal(cleared);
        onChange && onChange(cleared);
    };

    const hasActiveFilter = Object.values(local).some(v => v !== '');

    const selectCls = `
    appearance-none bg-[var(--bg-surface)] border border-[var(--border-default)] 
    text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 pr-8 
    hover:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500
    cursor-pointer transition-colors min-w-[130px]
  `;

    return (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">
                <Filter size={13} />
                Bộ lọc
            </div>

            {showGender && (
                <div className="relative">
                    <select
                        className={selectCls}
                        value={local.gender}
                        onChange={e => handleChange('gender', e.target.value)}
                    >
                        <option value="">Giới tính</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            )}

            {showGrade && (
                <div className="relative">
                    <select
                        className={selectCls}
                        value={local.grade}
                        onChange={e => handleChange('grade', e.target.value)}
                    >
                        <option value="">Tất cả khối</option>
                        {GRADES.map(g => (
                            <option key={g} value={g}>Khối {g}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            )}

            {showClass && classes.length > 0 && (
                <div className="relative">
                    <select
                        className={selectCls}
                        value={local.class_id}
                        onChange={e => handleChange('class_id', e.target.value)}
                    >
                        <option value="">Tất cả lớp</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            )}

            {showSubject && (
                <div className="relative">
                    <select
                        className={selectCls}
                        value={local.subject}
                        onChange={e => handleChange('subject', e.target.value)}
                    >
                        <option value="">Tất cả môn</option>
                        {SUBJECTS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            )}

            {showStatus && (
                <div className="relative">
                    <select
                        className={selectCls}
                        value={local.status}
                        onChange={e => handleChange('status', e.target.value)}
                    >
                        <option value="">Trạng thái</option>
                        <option value="active">Đang học</option>
                        <option value="inactive">Nghỉ học</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            )}

            {hasActiveFilter && (
                <button
                    onClick={clearAll}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                >
                    <X size={12} />
                    Xóa bộ lọc
                </button>
            )}
        </div>
    );
}
