import React, { useEffect, useRef, useState } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserMenu({ user }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center text-white text-sm font-bold">
                    {user?.name?.charAt(0) || <User size={16} />}
                </div>
                <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{user?.role}</p>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-placeholder)' }} />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-12 w-56 rounded-xl overflow-hidden z-50"
                    style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-dropdown)',
                    }}
                >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{user?.role}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 transition-colors"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg-danger)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <LogOut size={16} />
                        Đăng xuất
                    </button>
                </div>
            )}
        </div>
    );
}
