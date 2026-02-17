import React, { useEffect, useState } from 'react';
import { Users, BookOpen, UserCircle, Calendar, ArrowUpRight, StickyNote, Plus, Trash2 } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import api from '@/services/api';
import { getClasses } from '@/services/classService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AdminDashboard() {
    const [stats, setStats] = useState({ classes: 0, teachers: 0, students: 0, attendanceToday: 0 });
    const [studentDistData, setStudentDistData] = useState([]);
    const [teacherDistData, setTeacherDistData] = useState([]);
    const [classSizeData, setClassSizeData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Notes state (admin-level notes)
    const [notes, setNotes] = useState(() => {
        try { return JSON.parse(localStorage.getItem('admin_notes') || '[]'); } catch { return []; }
    });
    const [newNote, setNewNote] = useState('');

    const saveNotes = (updated) => {
        setNotes(updated);
        localStorage.setItem('admin_notes', JSON.stringify(updated));
    };

    const addNote = () => {
        if (!newNote.trim()) return;
        saveNotes([{ id: Date.now(), text: newNote, date: new Date().toLocaleDateString('vi-VN') }, ...notes]);
        setNewNote('');
    };

    const deleteNote = (id) => saveNotes(notes.filter(n => n.id !== id));

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Summary stats
                const summaryRes = await api.get('/summary');
                setStats({
                    classes: summaryRes.data.classes || 0,
                    teachers: summaryRes.data.teachers || 0,
                    students: summaryRes.data.students || 0,
                    attendanceToday: summaryRes.data.attendanceToday || 0,
                });

                // Classes for charts
                const classesData = await getClasses();
                const classList = Array.isArray(classesData) ? classesData : [];

                // Student distribution by grade (extract grade from class name like "10A1" → "Khối 10")
                const gradeMap = {};
                classList.forEach(c => {
                    if (c.grade_level && c.student_count > 0) {
                        const grade = `Khối ${c.grade_level}`;
                        gradeMap[grade] = (gradeMap[grade] || 0) + c.student_count;
                    }
                });
                setStudentDistData(Object.entries(gradeMap).map(([name, students]) => ({ name, students })));

                // Class size top chart (top 10 by students)
                const sortedClasses = [...classList].sort((a, b) => (b.student_count || 0) - (a.student_count || 0)).slice(0, 10);
                setClassSizeData(sortedClasses.map(c => ({ name: c.name, count: c.student_count || 0 })));

                // Teacher distribution by subject
                const teachersRes = await api.get('/teachers');
                const teachers = Array.isArray(teachersRes.data) ? teachersRes.data : [];
                const subjectMap = {};
                teachers.forEach(t => {
                    const subj = t.subject || 'Không rõ';
                    subjectMap[subj] = (subjectMap[subj] || 0) + 1;
                });
                setTeacherDistData(Object.entries(subjectMap).map(([name, value]) => ({ name, value })));

            } catch (err) {
                // Fallback to empty
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Dashboard</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Tổng quan hệ thống</p>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Tổng lớp học" value={stats.classes} icon={BookOpen} color="indigo" />
                <StatsCard title="Tổng giáo viên" value={stats.teachers} icon={UserCircle} color="green" />
                <StatsCard title="Tổng học sinh" value={stats.students} icon={Users} color="blue" />
                <StatsCard title="Điểm danh hôm nay" value={stats.attendanceToday} icon={Calendar} color="orange" />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student distribution */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Phân bố học sinh theo khối</h3>
                    {studentDistData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={studentDistData}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-slate-400 text-sm text-center py-10">Chưa có dữ liệu</p>}
                </div>

                {/* Teacher distribution */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Phân bố giáo viên theo môn</h3>
                    {teacherDistData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={teacherDistData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                                    {teacherDistData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-slate-400 text-sm text-center py-10">Chưa có dữ liệu</p>}
                </div>
            </div>

            {/* Charts row 2 - Class size */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Top lớp có sĩ số cao nhất</h3>
                {classSizeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={classSizeData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#22d3ee" radius={[0, 4, 4, 0]} name="Sĩ số" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <p className="text-slate-400 text-sm text-center py-10">Chưa có dữ liệu</p>}
            </div>

            {/* Notes panel */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <StickyNote size={18} className="text-yellow-500" /> Ghi chú hệ thống
                </h3>
                <div className="flex gap-2 mb-4">
                    <input className="input-field flex-1 text-sm" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Thêm ghi chú..." onKeyDown={e => e.key === 'Enter' && addNote()} />
                    <button onClick={addNote} className="btn-primary text-sm px-3 py-2 flex items-center gap-1"><Plus size={14} /> Thêm</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notes.map(n => (
                        <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <div className="flex-1">
                                <p className="text-sm text-slate-800 dark:text-white">{n.text}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{n.date}</p>
                            </div>
                            <button onClick={() => deleteNote(n.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={12} /></button>
                        </div>
                    ))}
                    {notes.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Chưa có ghi chú</p>}
                </div>
            </div>
        </div>
    );
}
