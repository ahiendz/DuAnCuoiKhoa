import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Eye, EyeOff, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';

function StrengthBar({ password }) {
  const checks = [
    password.length >= 8,
    /[a-zA-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
  const labels = ['Yếu', 'Trung bình', 'Khá', 'Mạnh'];

  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-slate-200 dark:bg-slate-700'
              }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-400' : score === 3 ? 'text-yellow-500' : 'text-emerald-500'}`}>
        Độ mạnh: {labels[score - 1] || ''}
      </p>
    </div>
  );
}

export default function ParentChangePassword() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const studentCode = localStorage.getItem('default_password') || '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if no user or no flag
  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }
  if (user && !user.force_change_password) {
    navigate('/parent', { replace: true });
    return null;
  }

  const validate = () => {
    if (form.newPassword.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    if (!/[a-zA-Z]/.test(form.newPassword)) return 'Mật khẩu phải chứa chữ cái';
    if (!/[0-9]/.test(form.newPassword)) return 'Mật khẩu phải chứa chữ số';
    if (form.newPassword === studentCode) return 'Không được dùng mật khẩu mặc định';
    if (form.newPassword !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password-first-time', {
        user_id: user.id,
        new_password: form.newPassword,
        default_password: studentCode,
      });
      if (res.data.ok) {
        setSuccess(true);
        // Update user state: flag cleared → no more redirects
        updateUser({ force_change_password: false });
        localStorage.removeItem('default_password');
        setTimeout(() => navigate('/parent', { replace: true }), 1800);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Đổi Mật Khẩu Lần Đầu</h1>
            <p className="text-blue-100 text-sm mt-1">Vui lòng tạo mật khẩu mới để bảo mật tài khoản</p>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Notice */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-5 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái và số. Không được sử dụng mật khẩu mặc định.</span>
            </div>

            {/* Success state */}
            {success ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={28} className="text-emerald-500" />
                </div>
                <p className="font-semibold text-slate-800 dark:text-white">Đổi mật khẩu thành công!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Đang chuyển đến Dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      value={form.newPassword}
                      onChange={(e) => { setForm({ ...form, newPassword: e.target.value }); setError(''); }}
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập mật khẩu mới"
                      required
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <StrengthBar password={form.newPassword} />
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); setError(''); }}
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập lại mật khẩu mới"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Mật khẩu chưa khớp</p>
                  )}
                </div>

                <button
                  id="submit-change-password"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
