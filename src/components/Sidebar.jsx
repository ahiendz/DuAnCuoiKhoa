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
            <aside
                className={cn(
                    "hidden lg:flex flex-col shrink-0 h-full transition-all duration-300",
                    collapsed ? "w-20" : "w-[280px]"
                )}
                style={{
                    backgroundColor: 'var(--bg-sidebar)',
                    borderRight: '1px solid var(--border-default)',
                }}
            >
                <div style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {!collapsed ? (
                        <div className="flex items-center justify-between w-full px-4 h-20 lg:h-24 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3 min-w-0">
                                <img src="/logo/img.svg" alt="School Manager Pro" className="w-10 h-10 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-base whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>School Manager Pro</span>
                                    <span className="text-indigo-400 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">{roleTitle}</span>
                                </div>
                            </div>
                            <button onClick={() => setCollapsed(true)} className="shrink-0 transition-colors p-1" style={{ color: 'var(--text-placeholder)' }}>
                                <ChevronLeft size={24} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full px-4 h-20 lg:h-24 animate-in fade-in duration-300">
                            <img
                                src="/logo/img.svg"
                                alt="School Manager Pro"
                                className="w-8 h-8 shrink-0"
                            />
                            <button onClick={() => setCollapsed(false)} className="shrink-0 transition-colors p-1" style={{ color: 'var(--text-placeholder)' }}>
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
                                    : "",
                                collapsed && "justify-center px-2"
                            )}
                            style={({ isActive }) => isActive ? {} : { color: 'var(--text-secondary)' }}
                            onMouseEnter={e => {
                                if (!e.currentTarget.classList.contains('from-indigo-500')) {
                                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!e.currentTarget.classList.contains('from-indigo-500')) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <item.icon size={20} className="shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <button onClick={handleLogout}
                        className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 transition-colors", collapsed && "justify-center px-2")}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg-danger)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <LogOut size={20} />
                        {!collapsed && <span>Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:hidden pointer-events-auto",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
                style={{
                    backgroundColor: 'var(--bg-sidebar)',
                    borderRight: '1px solid var(--border-default)',
                }}
            >
                <div className="flex items-center justify-between p-4 h-20 lg:h-24" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <div className="flex items-center gap-3">
                        <img src="/logo/img.svg" alt="School Manager Pro" className="h-10 lg:h-12 w-auto shrink-0" />
                        <span className="text-sm lg:text-base font-bold font-heading" style={{ color: 'var(--text-primary)' }}>School Manager Pro</span>
                    </div>
                    <button
                        onClick={closeMobile}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-placeholder)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
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
                                        : ""
                                )}
                                style={({ isActive }) => isActive ? {} : { color: 'var(--text-secondary)' }}
                                onMouseEnter={e => {
                                    if (!e.currentTarget.classList.contains('from-indigo-500')) {
                                        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!e.currentTarget.classList.contains('from-indigo-500')) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    {/* Divider for Public Links on Mobile */}
                    <div className="my-4 opacity-50 mx-3" style={{ borderTop: '1px solid var(--border-default)' }} />

                    {/* Public Links */}
                    <div className="space-y-1">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-placeholder)' }}>Chung</p>
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.href}
                                onClick={closeMobile}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-placeholder)' }} />
                                <span>{link.name}</span>
                            </Link>
                        ))}
                    </div>
                </nav>

                <div className="p-3" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 transition-colors"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg-danger)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <LogOut size={20} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
