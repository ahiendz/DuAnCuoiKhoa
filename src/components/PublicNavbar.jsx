import React, { useState } from 'react';
import { LogIn, Menu, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
    { to: '/', label: 'Trang chủ' },
    { to: '/features', label: 'Tính năng' },
    { to: '/attendance', label: 'Điểm danh' },
    { to: '/support', label: 'Hỗ trợ' },
];

export default function PublicNavbar() {
    const [mobileMenu, setMobileMenu] = useState(false);

    return (
        <header className="h-20 fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-colors">
            <div className="container mx-auto px-4 h-full flex items-center justify-between">
                <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-sky-400 bg-clip-text text-transparent">
                    School Manager Pro
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {NAV_ITEMS.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.to === '/'}
                            className={({ isActive }) =>
                                `text-sm font-medium transition-colors ${isActive ? 'text-indigo-500 dark:text-sky-400' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-sky-400'}`
                            }>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Link to="/login"
                        className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-sm hover:opacity-90 transition-opacity">
                        <LogIn size={18} />
                        Đăng nhập
                    </Link>
                    <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        {mobileMenu ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenu && (
                <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg">
                    <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
                        {NAV_ITEMS.map(item => (
                            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMobileMenu(false)}
                                className={({ isActive }) =>
                                    `px-4 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`
                                }>
                                {item.label}
                            </NavLink>
                        ))}
                        <Link to="/login" onClick={() => setMobileMenu(false)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-sm mt-2">
                            <LogIn size={18} /> Đăng nhập
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
}
