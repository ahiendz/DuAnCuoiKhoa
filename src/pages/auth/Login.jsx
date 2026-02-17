import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogIn, School } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('admin');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userData = await login(email, password, role);
            const dest = { admin: '/admin', teacher: '/teacher', parent: '/parent' };
            navigate(dest[userData.role] || '/');
        } catch (err) {
            setError(err.response?.data?.error || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'admin', label: 'Admin' },
        { id: 'teacher', label: 'Giáo viên' },
        { id: 'parent', label: 'Phụ huynh' }
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-sky-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <School size={32} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-1">Đăng nhập</h2>
                    <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-sm">School Manager Pro</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vai trò</label>
                            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                {roles.map(r => (
                                    <button key={r.id} type="button" onClick={() => setRole(r.id)}
                                        className={`text-sm py-1.5 rounded-md transition-all ${role === r.id
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-medium'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                            <input type="text" required className="input-field" placeholder="email@school.com"
                                value={email} onChange={e => setEmail(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu</label>
                            <input type="password" required className="input-field" placeholder="••••••"
                                value={password} onChange={e => setPassword(e.target.value)} />
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
                            <LogIn size={20} />
                            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                        </button>
                    </form>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <Link to="/" className="text-sm text-indigo-500 hover:text-indigo-600 dark:text-sky-400 dark:hover:text-sky-300 font-medium">← Về trang chủ</Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quên mật khẩu? Liên hệ quản trị viên.</p>
                </div>
            </div>
        </div>
    );
}
