import React, { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

const TYPE_COLORS = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
};

export default function NotificationDropdown() {
    const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        setOpen(!open);
        if (!open) markAllRead();
    };

    return (
        <div className="relative" ref={ref}>
            <button onClick={handleOpen} className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Bell size={20} className="text-slate-500 dark:text-slate-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-12 w-80 max-h-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Thông báo</h3>
                        {notifications.length > 0 && (
                            <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500">Xóa tất cả</button>
                        )}
                    </div>
                    <div className="overflow-y-auto max-h-72">
                        {notifications.length === 0 ? (
                            <p className="text-center py-8 text-slate-400 text-sm">Không có thông báo</p>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-sm ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/5' : ''}`}>
                                    <div className={`p-2 rounded-lg border text-xs ${TYPE_COLORS[n.type] || TYPE_COLORS.info}`}>
                                        {n.message}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
