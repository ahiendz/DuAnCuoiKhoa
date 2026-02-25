import React from 'react';
import { Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationDropdown from './NotificationDropdown';
import DashboardNavLinks from './DashboardNavLinks';
import UserMenu from './UserMenu';

export default function Navbar({ user, toggleSidebar }) {
    return (
        <header
            className="h-20 lg:h-24 flex items-center justify-between px-4 lg:px-6 shrink-0"
            style={{
                backgroundColor: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-default)',
            }}
        >
            <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <Menu size={22} />
            </button>

            <div className="hidden lg:flex flex-1 mr-4">
                <DashboardNavLinks />
            </div>

            <div className="flex items-center gap-4 pl-4">
                <NotificationDropdown />
                <ThemeToggle />
                <div className="pl-3" style={{ borderLeft: '1px solid var(--border-default)' }}>
                    <UserMenu user={user} />
                </div>
            </div>
        </header>
    );
}
