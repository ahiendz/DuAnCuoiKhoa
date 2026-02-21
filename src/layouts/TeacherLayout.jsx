import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, BookOpen, StickyNote, FileText, LogOut, GraduationCap } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import DashboardNavLinks from '@/components/DashboardNavLinks';

export default function TeacherLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/teacher', label: 'Trang chủ', icon: LayoutDashboard },
        { to: '/teacher/features', label: 'Tính năng', icon: GraduationCap },
        { to: '/teacher/notes', label: 'Ghi chú', icon: StickyNote },
        { to: '/teacher/gradebook', label: 'Nhập điểm', icon: BookOpen },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors">
            {/* HEADER */}
            <header className="bg-slate-900 text-slate-100 shadow-xl border-b border-slate-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">

                    {/* LEFT: Branding */}
                    <div className="flex flex-col">
                        <div className="text-sm font-bold tracking-widest text-indigo-400 uppercase">SCHOOL MANAGER PRO</div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-white">Bảng Điều Khiển Giáo Viên</h1>
                            <span className="text-xs text-slate-400 border-l border-slate-700 pl-2 ml-2">
                                Giáo viên: <span className="text-indigo-300 font-bold">{user?.name || 'Unknown'}</span>
                            </span>
                        </div>
                    </div>

                    {/* RIGHT: Navigation */}
                    <nav className="flex items-center gap-1">
                        <DashboardNavLinks className="mr-2" textColorClass="text-slate-400 hover:text-white" />
                        <div className="hidden lg:block h-6 w-px bg-slate-700 mx-2 mr-3"></div>

                        {navItems.map(item => {
                            const isActive = location.pathname === item.to || (item.to !== '/teacher' && location.pathname.startsWith(item.to));
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    <item.icon size={16} />
                                    {item.label}
                                </Link>
                            );
                        })}

                        <div className="h-6 w-px bg-slate-700 mx-2"></div>

                        <ThemeToggle />

                        <div className="h-6 w-px bg-slate-700 mx-2"></div>

                        <button
                            onClick={handleLogout}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 flex items-center gap-2 transition-colors"
                        >
                            <LogOut size={16} />
                            Đăng xuất
                        </button>
                    </nav>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 container mx-auto p-6 animate-in fade-in duration-500">
                <Outlet />
            </main>

            {/* FOOTER (Optional but good for layout structure) */}
            <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
                &copy; {new Date().getFullYear()} School Manager Pro. All rights reserved.
            </footer>
        </div>
    );
}
