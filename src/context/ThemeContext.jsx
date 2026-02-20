import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'theme-preference';

/**
 * Reads initial theme preference:
 * 1. localStorage persisted value ('light', 'dark', 'system')
 * 2. Default: 'system'
 */
function getInitialTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (['light', 'dark', 'system'].includes(stored)) return stored;
    return 'system';
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme);
    const [resolvedTheme, setResolvedTheme] = useState('light'); // actual applied theme (light or dark)

    // Apply class to <html> whenever theme changes
    useEffect(() => {
        const root = document.documentElement;

        const applyTheme = (mode) => {
            if (mode === 'dark') {
                root.classList.add('dark');
                setResolvedTheme('dark');
            } else {
                root.classList.remove('dark');
                setResolvedTheme('light');
            }
        };

        if (theme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(systemPrefersDark ? 'dark' : 'light');
        } else {
            applyTheme(theme);
        }

        localStorage.setItem(THEME_STORAGE_KEY, theme);

        // DEBUG: Log theme and check if class is set
        setTimeout(() => {
            console.log('[ThemeProvider] mode:', theme, '| resolved:', resolvedTheme, '| html.classList:', root.className);
        }, 50);
    }, [theme]);

    // Listen for OS theme changes (when user is in system mode)
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            if (theme === 'system') {
                const root = document.documentElement;
                if (e.matches) {
                    root.classList.add('dark');
                    setResolvedTheme('dark');
                } else {
                    root.classList.remove('dark');
                    setResolvedTheme('light');
                }
            }
        };

        // Modern browsers use addEventListener
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'system';
            return 'light';
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}
