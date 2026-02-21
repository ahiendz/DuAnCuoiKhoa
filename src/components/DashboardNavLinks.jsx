import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const navLinks = [
    { name: 'Trang chủ', href: '/' },
    { name: 'Tính năng', href: '/#features' },
    { name: 'Phân tích', href: '/#analytics' },
    { name: 'Liên hệ', href: '/#contact' }
];

export default function DashboardNavLinks({ className = '', textColorClass = 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400' }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavClick = (e, href) => {
        if (href === '/') return;

        e.preventDefault();
        const targetId = href.replace('/#', '');

        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => {
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        } else {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <div className={`hidden lg:flex items-center gap-8 ${className}`}>
            {navLinks.map((link) => (
                <Link
                    key={link.name}
                    to={link.href}
                    onClick={link.href.includes('#') ? (e) => handleNavClick(e, link.href) : undefined}
                    className={`text-[15px] font-semibold transition-all duration-300 transform hover:-translate-y-0.5 relative group ${textColorClass}`}
                >
                    {link.name}
                    <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-300 group-hover:w-full rounded-full" />
                </Link>
            ))}
        </div>
    );
}
