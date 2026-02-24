import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import { navLinks } from './DashboardNavLinks';

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
                collapsed ? "w-20" : "w-[280px]"
            )}>
                <div className="border-b border-[var(--border-color)]">
                    {!collapsed ? (
                        <div className="flex items-center justify-between w-full px-4 h-20 lg:h-24 animate-in fade-in duration-300">
                            {/* Logo & Text Container */}
                            <div className="flex items-center gap-3 min-w-0">
                                <img src="/logo/img.svg" alt="School Manager Pro" className="w-10 h-10 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-white font-bold text-base whitespace-nowrap">School Manager Pro</span>
                                    <span className="text-indigo-400 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">{roleTitle}</span>
                                </div>
                            </div>

                            {/* Ghost Toggle Button */}
                            <button onClick={() => setCollapsed(true)} className="shrink-0 text-slate-400 hover:text-white transition-colors p-1">
                                <ChevronLeft size={24} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full px-4 h-20 lg:h-24 animate-in fade-in duration-300">
                            <img
                                src="/logo/img.svg"
                                alt="School Manager Pro"
                                className="w-8 h-8 shrink-0 cursor-pointer transition-transform hover:scale-110"
                                onClick={() => setCollapsed(false)}
                            />
                            <button onClick={() => setCollapsed(false)} className="shrink-0 text-slate-400 hover:text-white transition-colors p-1">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
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
                "fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col transition-transform duration-300 lg:hidden pointer-events-auto",
                "bg-[var(--bg-sidebar)] border-[var(--border-color)]",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between p-4 border-b h-20 lg:h-24 border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <img src="/logo/img.svg" alt="School Manager Pro" className="h-10 lg:h-12 w-auto shrink-0" />
                        <span className="text-sm lg:text-base font-bold text-white font-heading">School Manager Pro</span>
                    </div>
                    <button onClick={closeMobile} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-placeholder)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {/* Role-specific Links */}
                    <div className="space-y-1">
                        {navItems.map(item => (
                            <NavLink key={item.to} to={item.to} end={item.to === '/admin' || item.to === '/teacher' || item.to === '/parent'}
                                onClick={closeMobile}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}>
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    {/* Divider for Public Links on Mobile */}
                    <div className="my-4 border-t border-[var(--border-color)] opacity-50 mx-3" />

                    {/* Public Links */}
                    <div className="space-y-1">
                        <p className="px-3 text-[10px] font-bold text-[var(--text-placeholder)] uppercase tracking-widest mb-2">Chung</p>
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.href}
                                onClick={closeMobile}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                                <span>{link.name}</span>
                            </Link>
                        ))}
                    </div>
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
