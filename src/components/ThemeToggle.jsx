import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    const icons = {
        light: <Sun size={20} className="text-slate-500 dark:text-slate-400" />,
        dark: <Moon size={20} className="text-slate-500 dark:text-slate-400" />,
        system: <Monitor size={20} className="text-slate-500 dark:text-slate-400" />
    };

    const labels = {
        light: 'Sáng',
        dark: 'Tối',
        system: 'Hệ thống'
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-300 flex items-center justify-center border border-transparent dark:border-slate-700/50"
            aria-label={`Chuyển sang chế độ tiếp theo. Hiện tại: ${labels[theme]}`}
            title={`Chế độ: ${labels[theme]}`}
        >
            <span className="block transition-transform duration-300">
                {icons[theme]}
            </span>
        </button>
    );
}
