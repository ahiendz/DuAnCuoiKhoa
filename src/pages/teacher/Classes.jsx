import React from 'react';
import { BookOpen } from 'lucide-react';

export default function TeacherClasses() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Lớp phụ trách</h2>
                <p className="text-[var(--text-secondary)] text-sm">Danh sách lớp bạn đang phụ trách.</p>
            </div>

            <div className="card-panel p-6">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <BookOpen size={20} className="text-indigo-500" />
                    </div>
                    <div>
                        <p className="font-semibold">Chưa có dữ liệu lớp</p>
                        <p className="text-sm text-[var(--text-secondary)]">Dữ liệu sẽ hiển thị khi bạn được phân công lớp.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
