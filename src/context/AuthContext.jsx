import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (stored && token) {
            try {
                setUser(JSON.parse(stored));
            } catch { /* ignore */ }
        }
        setLoading(false);
    }, []);

    const login = async (email, password, role) => {
        const res = await api.post('/auth/login', { email, password, role });
        const { token, force_change_password, ...userData } = res.data;

        const userWithFlags = { ...userData, force_change_password };
        setUser(userWithFlags);
        localStorage.setItem('user', JSON.stringify(userWithFlags));
        localStorage.setItem('token', token);

        if (force_change_password) {
            localStorage.setItem('default_password', password);
        }

        return userWithFlags;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('default_password');
    };

    /** Patch specific fields on the user without logging out */
    const updateUser = (patch) => {
        setUser((prev) => {
            const next = { ...prev, ...patch };
            localStorage.setItem('user', JSON.stringify(next));
            return next;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
