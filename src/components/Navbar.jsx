import React from 'react';
import { Menu, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationDropdown from './NotificationDropdown';
import DashboardNavLinks from './DashboardNavLinks';

export default function Navbar({ user, toggleSidebar }) {
    return (
        <header className="h-16 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center justify-between px-4 lg:px-6 shrink-0 transition-colors duration-300">
            <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Menu size={22} />
            </button>

            <div className="hidden lg:flex flex-1 mr-4">
                <DashboardNavLinks />
            </div>

            <div className="flex items-center gap-4 pl-4">
                <NotificationDropdown />
                <ThemeToggle />
                <div className="flex items-center gap-2 pl-3 border-l border-[var(--border-color)]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center text-white text-sm font-bold">
                        {user?.name?.charAt(0) || <User size={16} />}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-slate-800 dark:text-white leading-tight">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
