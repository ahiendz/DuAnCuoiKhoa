import React from 'react';
import { Bell } from 'lucide-react';

export default function ParentNotifications() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Thông báo</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Các cập nhật mới nhất dành cho phụ huynh.</p>
            </div>

            <div className="card-panel p-6">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Bell size={20} className="text-indigo-500" />
                    </div>
                    <div>
                        <p className="font-semibold">Không có thông báo mới</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Bạn sẽ nhận được thông báo khi có cập nhật từ nhà trường.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
