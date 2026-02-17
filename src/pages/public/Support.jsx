import React from 'react';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

export default function Support() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <section className="pt-32 pb-16 px-6 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white mb-4">Hỗ trợ</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                    Liên hệ với chúng tôi nếu bạn cần trợ giúp
                </p>
            </section>

            <section className="container mx-auto px-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <Mail className="text-indigo-500 mb-3" size={28} />
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">Email</h3>
                        <p className="text-sm text-slate-500">support@schoolpro.edu.vn</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <Phone className="text-green-500 mb-3" size={28} />
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">Hotline</h3>
                        <p className="text-sm text-slate-500">1900 8888</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <MapPin className="text-red-500 mb-3" size={28} />
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">Địa chỉ</h3>
                        <p className="text-sm text-slate-500">123 Nguyễn Văn A, Q1, TP.HCM</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <MessageCircle className="text-blue-500 mb-3" size={28} />
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">Chat trực tuyến</h3>
                        <p className="text-sm text-slate-500">Thứ 2 - Thứ 6, 8:00 - 17:00</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
