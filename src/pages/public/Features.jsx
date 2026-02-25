import React from 'react';
import { Sparkles, Brain, BarChart3, Shield, Users, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

const FEATURES = [
    { icon: Camera, title: 'Điểm danh khuôn mặt', desc: 'Nhận diện AI tự động, chính xác 99.2%, dưới 200ms.', color: 'indigo' },
    { icon: Brain, title: 'Quản lý điểm số', desc: 'Nhập điểm inline, tính TBHK tự động, import/export CSV.', color: 'purple' },
    { icon: Users, title: 'Quản lý học sinh', desc: 'Hồ sơ đầy đủ, import CSV hàng loạt, auto mã HS.', color: 'blue' },
    { icon: BarChart3, title: 'Dashboard thống kê', desc: 'Biểu đồ phân bố, thống kê real-time, xuất báo cáo.', color: 'green' },
    { icon: Shield, title: 'Phân quyền', desc: 'Ba vai trò: Admin, Giáo viên, Phụ huynh. Bảo mật jwt.', color: 'orange' },
    { icon: Sparkles, title: 'Giao diện hiện đại', desc: 'Dark/Light mode, responsive, gradient UI, glassmorphism.', color: 'pink' },
];

const COLORS = {
    indigo: 'bg-indigo-500/10 text-indigo-500',
    purple: 'bg-purple-500/10 text-purple-500',
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    orange: 'bg-orange-500/10 text-orange-500',
    pink: 'bg-pink-500/10 text-pink-500',
};

export default function Features() {
    return (
        <div className="min-h-screen bg-[var(--bg-base)] pb-20">
            <section className="pt-32 pb-16 px-6 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">Tính năng nổi bật</h1>
                <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
                    Hệ thống quản lý giáo dục toàn diện với công nghệ hiện đại nhất
                </p>
            </section>

            <section className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
                {FEATURES.map(f => (
                    <div key={f.title} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${COLORS[f.color]}`}>
                            <f.icon size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
                    </div>
                ))}
            </section>

            <section className="container mx-auto px-4 mt-16 text-center">
                <Link to="/login" className="btn-primary text-lg px-8 py-3 rounded-full">
                    Bắt đầu sử dụng
                </Link>
            </section>
        </div>
    );
}
