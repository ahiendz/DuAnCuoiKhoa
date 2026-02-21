import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, School, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

export default function Sidebar({ navItems = [], roleTitle, collapsed, setCollapsed, mobileOpen, closeMobile }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Desktop sidebar */}
            <aside className={cn(
                "hidden lg:flex flex-col shrink-0 border-r h-full transition-all duration-300",
                "bg-[var(--bg-sidebar)] border-[var(--border-color)]",
                collapsed ? "w-20" : "w-64"
            )}>
                <div className="flex items-center justify-between p-4 border-b h-16 border-[var(--border-color)]">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-sky-400 rounded-lg flex items-center justify-center text-white">
                                <School size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">School Pro</p>
                                <p className="text-[10px] text-[var(--text-placeholder)]">{roleTitle}</p>
                            </div>
                        </div>
                    )}
                    <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-placeholder)]">
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.to === '/admin' || item.to === '/teacher' || item.to === '/parent'}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                isActive
                                    ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
                                collapsed && "justify-center px-2"
                            )}>
                            <item.icon size={20} className="shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t border-[var(--border-color)]">
                    <button onClick={handleLogout}
                        className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors", collapsed && "justify-center px-2")}>
                        <LogOut size={20} />
                        {!collapsed && <span>Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col transition-transform duration-300 lg:hidden",
                "bg-[var(--bg-sidebar)] border-[var(--border-color)]",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between p-4 border-b h-16 border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-sky-400 rounded-lg flex items-center justify-center text-white">
                            <School size={18} />
                        </div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">School Pro</p>
                    </div>
                    <button onClick={closeMobile} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-placeholder)]">
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.to === '/admin' || item.to === '/teacher' || item.to === '/parent'}
                            onClick={closeMobile}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                isActive
                                    ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}>
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t border-[var(--border-color)]">
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                        <LogOut size={20} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
