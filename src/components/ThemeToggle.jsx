import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const themeOptions = [
    { value: 'light', label: 'Sáng', icon: Sun },
    { value: 'dark', label: 'Tối', icon: Moon },
    { value: 'system', label: 'Hệ thống', icon: Monitor },
];

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const currentOption = themeOptions.find(o => o.value === theme) || themeOptions[2];
    const CurrentIcon = currentOption.icon;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-2 rounded-lg transition-colors"
                style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`Chế độ giao diện: ${currentOption.label}`}
                title={`Chế độ: ${currentOption.label}`}
            >
                <CurrentIcon size={20} />
                <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-11 w-44 rounded-xl overflow-hidden z-50"
                    style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-dropdown)',
                    }}
                    role="listbox"
                    aria-label="Chọn chế độ giao diện"
                >
                    {themeOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = theme === option.value;
                        return (
                            <button
                                key={option.value}
                                role="option"
                                aria-selected={isActive}
                                onClick={() => {
                                    setTheme(option.value);
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
                                style={{
                                    color: isActive ? 'var(--color-primary)' : 'var(--text-primary)',
                                    backgroundColor: isActive ? 'var(--hover-bg)' : 'transparent',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <Icon size={16} />
                                <span>{option.label}</span>
                                {isActive && (
                                    <span className="ml-auto text-xs" style={{ color: 'var(--color-primary)' }}>✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
