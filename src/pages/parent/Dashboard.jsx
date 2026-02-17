import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { User, BookOpen, Calendar, FileText } from 'lucide-react';

export default function ParentDashboard() {
    const { user } = useAuth();
    const [studentInfo, setStudentInfo] = useState(null);
    const [grades, setGrades] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Parent view: Load child data
        // This would normally use a parent-specific endpoint
        // For now, display a read-only view
        setLoading(false);
    }, [user]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Trang chủ Phụ huynh</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Xin chào, {user?.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><User className="text-blue-500" size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">Thông tin con</p>
                            <p className="text-xs text-slate-500">Xem hồ sơ học sinh</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center"><BookOpen className="text-green-500" size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">Điểm số</p>
                            <p className="text-xs text-slate-500">Xem bảng điểm</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center"><Calendar className="text-yellow-500" size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">Điểm danh</p>
                            <p className="text-xs text-slate-500">Lịch sử đi học</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><FileText size={18} /> Nhận xét từ giáo viên</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có nhận xét mới.</p>
            </div>
        </div>
    );
}
