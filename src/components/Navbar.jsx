import React from 'react';
import { Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationDropdown from './NotificationDropdown';
import DashboardNavLinks from './DashboardNavLinks';
import UserMenu from './UserMenu';

export default function Navbar({ user, toggleSidebar }) {
    return (
        <header className="h-20 lg:h-24 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center justify-between px-4 lg:px-6 shrink-0 transition-colors duration-300">
            <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Menu size={22} />
            </button>

            <div className="hidden lg:flex flex-1 mr-4">
                <DashboardNavLinks />
            </div>

            <div className="flex items-center gap-4 pl-4">
                <NotificationDropdown />
                <ThemeToggle />
                <div className="pl-3 border-l border-[var(--border-color)]">
                    <UserMenu user={user} />
                </div>
            </div>
        </header>
    );
}
