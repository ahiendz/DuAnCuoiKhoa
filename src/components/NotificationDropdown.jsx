import React, { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

const TYPE_STYLES = {
    success: { bg: 'rgba(22, 163, 74, 0.08)', border: 'rgba(22, 163, 74, 0.2)', color: '#16A34A' },
    error: { bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.2)', color: '#DC2626' },
    warning: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' },
    info: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' },
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
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="absolute right-0 top-12 w-80 max-h-96 rounded-xl overflow-hidden z-50"
                    style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-dropdown)',
                    }}
                >
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Thông báo</h3>
                        {notifications.length > 0 && (
                            <button onClick={clearAll} className="text-xs hover:text-red-500 transition-colors" style={{ color: 'var(--text-placeholder)' }}>Xóa tất cả</button>
                        )}
                    </div>
                    <div className="overflow-y-auto max-h-72">
                        {notifications.length === 0 ? (
                            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-placeholder)' }}>Không có thông báo</p>
                        ) : (
                            notifications.map(n => {
                                const typeStyle = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                                return (
                                    <div
                                        key={n.id}
                                        className="px-4 py-3 text-sm"
                                        style={{
                                            borderBottom: '1px solid var(--border-subtle)',
                                            backgroundColor: !n.read ? 'var(--hover-bg)' : 'transparent',
                                        }}
                                    >
                                        <div
                                            className="p-2 rounded-lg text-xs"
                                            style={{
                                                backgroundColor: typeStyle.bg,
                                                border: `1px solid ${typeStyle.border}`,
                                                color: typeStyle.color,
                                            }}
                                        >
                                            {n.message}
                                        </div>
                                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-placeholder)' }}>{n.time}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
