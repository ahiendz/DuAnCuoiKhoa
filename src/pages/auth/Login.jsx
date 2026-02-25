import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogIn, School, ArrowLeft, Mail, Lock, ShieldCheck } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';

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

            // Check if forced password change is required
            if (userData.force_change_password) {
                navigate('/parent/change-password');
                return;
            }

            const dest = { admin: '/admin', teacher: '/teacher', parent: '/parent' };
            navigate(dest[userData.role] || '/');
        } catch (err) {
            setError(err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'admin', label: 'Quản trị viên' },
        { id: 'teacher', label: 'Giáo viên' },
        { id: 'parent', label: 'Phụ huynh' }
    ];

    return (
        <div className="min-h-screen flex flex-col transition-colors duration-300"
            style={{ background: 'var(--public-hero-bg)' }}>

            {/* Navigation Bar */}
            <PublicNavbar />

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center relative px-4 sm:px-6 py-12 pt-[calc(var(--nav-height)+2rem)]">

                {/* Background Orbs */}
                <div className="absolute top-[10%] left-[10%] w-[30vw] h-[30vw] blur-[120px] rounded-full pointer-events-none"
                    style={{ background: 'var(--icon-bg-violet)', opacity: 'var(--orb-opacity)' }} />
                <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] blur-[120px] rounded-full pointer-events-none"
                    style={{ background: 'var(--icon-bg-indigo)', opacity: 'var(--orb-opacity)' }} />

                {/* Login Card */}
                <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500"
                    style={{
                        background: 'var(--glass-card-bg)',
                        border: '1px solid var(--glass-card-border)',
                        backdropFilter: 'blur(16px)'
                    }}>

                    <div className="p-8 sm:p-10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <img
                                src="/logo/img.svg"
                                alt="School Manager Pro"
                                className="h-24 sm:h-28 w-auto mx-auto mb-6 object-contain transform hover:scale-105 transition-transform drop-shadow-xl"
                            />
                            <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight"
                                style={{ color: 'var(--public-text-primary)' }}>
                                Đăng nhập
                            </h2>
                            <p className="text-sm font-medium"
                                style={{ color: 'var(--public-text-body)' }}>
                                Đăng nhập để truy cập hệ thống School Manager Pro
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-6 p-4 rounded-xl flex items-start gap-3 animate-in fade-in"
                                style={{ background: 'var(--icon-bg-rose)', border: '1px solid var(--icon-border-rose)' }}>
                                <div className="mt-0.5"><ShieldCheck className="w-4 h-4 text-rose-500" /></div>
                                <p className="text-sm font-medium text-rose-500 leading-tight">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Role Selector */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold ml-1"
                                    style={{ color: 'var(--glass-text-primary)' }}>
                                    Vai trò của bạn
                                </label>
                                <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl border"
                                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                                    {roles.map(r => (
                                        <button key={r.id} type="button" onClick={() => setRole(r.id)}
                                            className="text-xs sm:text-sm py-2 rounded-lg font-bold transition-all"
                                            style={role === r.id
                                                ? { background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#fff', boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.39)' }
                                                : { background: 'transparent', color: 'var(--glass-text-muted)' }}
                                            onMouseEnter={(e) => { if (role !== r.id) e.currentTarget.style.color = 'var(--text-primary)'; }}
                                            onMouseLeave={(e) => { if (role !== r.id) e.currentTarget.style.color = 'var(--glass-text-muted)'; }}>
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold ml-1"
                                    style={{ color: 'var(--glass-text-primary)' }}>
                                    Tài khoản / Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="w-5 h-5 text-violet-500/50" />
                                    </div>
                                    <input type="text" required
                                        placeholder="Nhập email"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-default)',
                                            color: 'var(--text-primary)'
                                        }} />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="block text-sm font-bold"
                                        style={{ color: 'var(--glass-text-primary)' }}>
                                        Mật khẩu
                                    </label>
                                    <button type="button" className="text-xs font-bold text-violet-500 hover:text-violet-600 transition-colors">
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-violet-500/50" />
                                    </div>
                                    <input type="password" required
                                        placeholder="••••••••"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-default)',
                                            color: 'var(--text-primary)'
                                        }} />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button type="submit" disabled={loading}
                                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold rounded-xl px-4 py-4 flex items-center justify-center gap-2 mt-8 transition-all shadow-lg shadow-violet-600/25">
                                {loading ? (
                                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang xử lý...</>
                                ) : (
                                    <><LogIn className="w-5 h-5" /> Đăng nhập hệ thống</>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-5 text-center"
                        style={{ background: 'var(--hover-bg)', borderTop: '1px solid var(--border-subtle)' }}>
                        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-violet-500 hover:text-violet-600 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Quay lại trang chủ
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
