import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'theme-preference';
const VALID_THEMES = ['light', 'dark', 'system'];

function getInitialTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (VALID_THEMES.includes(stored)) return stored;
    return 'system';
}

function resolveSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getInitialTheme);
    const [resolvedTheme, setResolvedTheme] = useState(() => {
        const initial = getInitialTheme();
        return initial === 'system' ? resolveSystemTheme() : initial;
    });

    const applyTheme = useCallback((resolved) => {
        document.documentElement.setAttribute('data-theme', resolved);
        setResolvedTheme(resolved);
    }, []);

    useEffect(() => {
        const resolved = theme === 'system' ? resolveSystemTheme() : theme;
        applyTheme(resolved);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme, applyTheme]);

    // Lắng nghe OS thay đổi khi đang mode System
    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => applyTheme(e.matches ? 'dark' : 'light');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme, applyTheme]);

    // Lắng nghe StorageEvent (từ AuthContext khi login lần đầu)
    useEffect(() => {
        const handler = (e) => {
            if (e.key === THEME_STORAGE_KEY && VALID_THEMES.includes(e.newValue)) {
                setThemeState(e.newValue);
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const setTheme = useCallback((mode) => {
        if (VALID_THEMES.includes(mode)) setThemeState(mode);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) =>
            prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
        );
    }, []);

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
