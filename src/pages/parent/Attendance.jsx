import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Calendar } from 'lucide-react';

export default function ParentAttendance() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lịch sử điểm danh</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Xem lịch sử đi học của con</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Calendar className="text-green-500" size={20} />
                    <h3 className="font-semibold text-slate-800 dark:text-white">Điểm danh theo ngày</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                    Chức năng xem điểm danh sẽ hiển thị khi có dữ liệu.
                </p>
            </div>
        </div>
    );
}
